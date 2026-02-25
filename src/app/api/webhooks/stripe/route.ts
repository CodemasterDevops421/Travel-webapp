import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { assertProductionReadiness } from '@/server/env';
import { toHttpError } from '@/server/errors';
import { logger } from '@/server/logger';
import { constructStripeEvent } from '@/server/payments/stripe';
import { assertRateLimit } from '@/server/ratelimit';
import {
  persistBooking,
  updateBookingStatusByTransactionId
} from '@/server/booking/repository';
import { getClientIp, getCorrelationId } from '@/server/request';
import { markWebhookEventProcessed } from '@/server/webhook-idempotency';

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

export async function POST(request: NextRequest) {
  try {
    assertProductionReadiness();
    await assertRateLimit(`webhook-stripe:${getClientIp(request)}`);

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

    const firstSeen = await markWebhookEventProcessed(event.id, 7 * 24 * 60 * 60, 'stripe');
    if (!firstSeen) {
      logger.info({ eventId: event.id, eventType: event.type }, 'Duplicate Stripe webhook ignored');
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
    }

    const update = buildReconciliationUpdate(event);
    if (!update) {
      return NextResponse.json({ received: true, ignored: true }, { status: 200 });
    }

    let persisted = false;
    if (update.transactionId) {
      persisted = await updateBookingStatusByTransactionId(update.transactionId, update.status, update.metadata);
    }

    if (!persisted) {
      const localId = await persistBooking({
        quoteId: null,
        liteApiBookingId: null,
        status: update.status,
        metadata: {
          ...(update.transactionId ? { transactionId: update.transactionId } : {}),
          ...update.metadata
        }
      });
      persisted = Boolean(localId);
    }

    logger.info(
      {
        correlationId: getCorrelationId(request),
        eventId: event.id,
        eventType: event.type,
        transactionId: update.transactionId,
        persisted,
        status: update.status
      },
      'Stripe webhook received'
    );

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    const httpError = toHttpError(error);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
