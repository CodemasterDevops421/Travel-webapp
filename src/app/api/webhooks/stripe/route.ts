import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { assertProductionReadiness } from '@/server/env';
import { toHttpError } from '@/server/errors';
import { logger, logStructuredEvent } from '@/server/logger';
import { constructStripeEvent } from '@/server/payments/stripe';
import { assertRateLimit } from '@/server/ratelimit';
import {
  persistBooking,
  updateBookingStatusByTransactionId
} from '@/server/booking/repository';
import { insertPaymentLog } from '@/server/payment-logs-repository';
import { getClientIp, getCorrelationId } from '@/server/request';
import { claimWebhookEvent, finalizeWebhookEvent } from '@/server/webhook-idempotency';

function emitStructuredEvent(
  level: 'error' | 'warn' | 'info' | 'debug',
  event: string,
  context: Record<string, unknown>
): void {
  if (typeof logStructuredEvent === 'function') {
    logStructuredEvent(level, event, context);
  }
}

type ReconciliationUpdate = {
  transactionId: string | null;
  status: 'payment_authorized' | 'confirmed' | 'failed' | 'refunded';
  metadata: Record<string, unknown>;
};

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function extractMetadataTransactionId(metadata: Stripe.Metadata | null | undefined): string | null {
  if (!metadata) {
    return null;
  }
  return readString(metadata.transactionId);
}

function buildReconciliationUpdate(event: Stripe.Event): ReconciliationUpdate | null {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const transactionId = extractMetadataTransactionId(session.metadata) ?? readString(session.client_reference_id);
    return {
      transactionId,
      status: 'payment_authorized',
      metadata: {
        stripeEventId: event.id,
        stripeEventType: event.type,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: readString(session.payment_intent),
        stripeCustomerId: readString(session.customer),
        paymentStatus: 'authorized'
      }
    };
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    return {
      transactionId: extractMetadataTransactionId(paymentIntent.metadata),
      status: 'confirmed',
      metadata: {
        stripeEventId: event.id,
        stripeEventType: event.type,
        stripePaymentIntentId: paymentIntent.id,
        stripeCustomerId: readString(paymentIntent.customer),
        paymentStatus: 'captured'
      }
    };
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    return {
      transactionId: extractMetadataTransactionId(paymentIntent.metadata),
      status: 'failed',
      metadata: {
        stripeEventId: event.id,
        stripeEventType: event.type,
        stripePaymentIntentId: paymentIntent.id,
        stripeCustomerId: readString(paymentIntent.customer),
        paymentStatus: 'failed',
        paymentFailureMessage: paymentIntent.last_payment_error?.message ?? null
      }
    };
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge;
    return {
      transactionId: extractMetadataTransactionId(charge.metadata),
      status: 'refunded',
      metadata: {
        stripeEventId: event.id,
        stripeEventType: event.type,
        stripePaymentIntentId: readString(charge.payment_intent),
        paymentStatus: 'refunded',
        refundedAmount: charge.amount_refunded
      }
    };
  }

  return null;
}

function readStripeAmountAndCurrency(event: Stripe.Event): { amount: number | null; currency: string | null } {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const amount = typeof session.amount_total === 'number' ? session.amount_total / 100 : null;
    const currency = readString(session.currency)?.toUpperCase() ?? null;
    return { amount, currency };
  }

  if (event.type === 'payment_intent.succeeded' || event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const amount = typeof paymentIntent.amount === 'number' ? paymentIntent.amount / 100 : null;
    const currency = readString(paymentIntent.currency)?.toUpperCase() ?? null;
    return { amount, currency };
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge;
    const amount = typeof charge.amount_refunded === 'number' ? charge.amount_refunded / 100 : null;
    const currency = readString(charge.currency)?.toUpperCase() ?? null;
    return { amount, currency };
  }

  return { amount: null, currency: null };
}

export async function POST(request: NextRequest) {
  try {
    assertProductionReadiness();
    await assertRateLimit(`webhook-stripe:${getClientIp(request)}`);
    const correlationId = getCorrelationId(request);
    emitStructuredEvent('info', 'webhook.stripe.received', {
      correlation_id: correlationId,
      route: 'webhook-stripe',
      module: 'webhook.stripe'
    });

    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = constructStripeEvent(rawBody, signature);
    } catch {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    // Phase 1: Acquire a short-lived processing lock (60s).
    // If this handler crashes before finalizing, the lock expires and
    // the next Stripe retry can re-attempt reconciliation.
    const claimed = await claimWebhookEvent(event.id, 'stripe', 60);
    if (!claimed) {
      logger.info({ eventId: event.id, eventType: event.type }, 'Duplicate Stripe webhook ignored');
      emitStructuredEvent('info', 'webhook.stripe.duplicate', {
        correlation_id: correlationId,
        route: 'webhook-stripe',
        module: 'webhook.stripe',
        event_id: event.id,
        event_type: event.type
      });
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
    }

    const update = buildReconciliationUpdate(event);
    if (!update) {
      // Non-actionable event type — finalize immediately so retries skip it
      await finalizeWebhookEvent(event.id, 'stripe');
      return NextResponse.json({ received: true, ignored: true }, { status: 200 });
    }

    const amountAndCurrency = readStripeAmountAndCurrency(event);
    const paymentLogId = await insertPaymentLog({
      provider: 'stripe',
      externalPaymentId: event.id,
      eventType: event.type,
      status: update.status,
      amount: amountAndCurrency.amount,
      currency: amountAndCurrency.currency,
      correlationId,
      metadata: {
        transactionId: update.transactionId,
        ...update.metadata
      }
    });

    if (!paymentLogId) {
      emitStructuredEvent('warn', 'persistence.payment_log.failed', {
        correlation_id: correlationId,
        route: 'webhook-stripe',
        module: 'webhook.stripe',
        event_id: event.id,
        event_type: event.type,
        transaction_id: update.transactionId
      });
      logger.warn(
        { eventId: event.id, eventType: event.type, transactionId: update.transactionId },
        'Stripe webhook payment log persistence failed'
      );
      return NextResponse.json({ error: 'Reconciliation failed' }, { status: 500 });
    }

    let persisted = false;
    if (update.transactionId) {
      persisted = await updateBookingStatusByTransactionId(update.transactionId, update.status, {
        ...update.metadata,
        latestPaymentLogId: paymentLogId,
        paymentLogId
      });
    }

    if (!persisted) {
      const localId = await persistBooking({
        quoteId: null,
        liteApiBookingId: null,
        status: update.status,
        metadata: {
          ...(update.transactionId ? { transactionId: update.transactionId } : {}),
          ...update.metadata,
          latestPaymentLogId: paymentLogId,
          paymentLogId
        }
      });
      persisted = Boolean(localId);
    }

    if (!persisted) {
      // Persistence failed — return 500 so Stripe retries.
      // The short lock will expire, allowing the retry to succeed.
      logger.warn(
        { eventId: event.id, eventType: event.type, transactionId: update.transactionId },
        'Stripe webhook reconciliation failed — will allow retry after lock expires'
      );
      return NextResponse.json({ error: 'Reconciliation failed' }, { status: 500 });
    }

    // Phase 2: Persistence succeeded — extend the dedup key to 7 days
    await finalizeWebhookEvent(event.id, 'stripe');

    logger.info(
      {
        correlationId,
        eventId: event.id,
        eventType: event.type,
        transactionId: update.transactionId,
        persisted,
        status: update.status
      },
      'Stripe webhook received'
    );
    emitStructuredEvent('info', 'webhook.stripe.reconciled', {
      correlation_id: correlationId,
      route: 'webhook-stripe',
      module: 'webhook.stripe',
      event_id: event.id,
      event_type: event.type,
      transaction_id: update.transactionId,
      booking_status: update.status
    });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    const correlationId = request.headers.get('x-request-id') ?? request.headers.get('x-correlation-id') ?? undefined;
    emitStructuredEvent('error', 'webhook.stripe.failed', {
      correlation_id: correlationId,
      route: 'webhook-stripe',
      module: 'webhook.stripe'
    });
    const httpError = toHttpError(error, {
      route: 'webhook-stripe',
      module: 'webhook.stripe',
      event: 'webhook.stripe.failed',
      correlationId
    });
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
