import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertSameOrigin } from '@/server/csrf';
import { toHttpError } from '@/server/errors';
import { assertProductionReadiness, env } from '@/server/env';
import { logger } from '@/server/logger';
import { createStripeCheckoutIntent } from '@/server/payments/stripe';
import { getPrebookSession } from '@/server/booking-store';
import { updateBookingStatusByTransactionId } from '@/server/booking/repository';
import { assertRateLimit, createRateLimitKey } from '@/server/ratelimit';
import { getRequestContext, parseRequestBody } from '@/server/request';

const requestSchema = z.object({
  prebookId: z.string().trim().min(1),
  transactionId: z.string().trim().min(1),
  quoteSignature: z.string().trim().min(32),
  successPath: z.string().trim().regex(/^\//).optional(),
  cancelPath: z.string().trim().regex(/^\//).optional()
});

function buildAbsoluteUrl(path: string): string {
  const appUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return new URL(path, appUrl).toString();
}

function appendTransaction(url: string, transactionId: string): string {
  const parsed = new URL(url);
  if (!parsed.searchParams.has('transactionId')) {
    parsed.searchParams.set('transactionId', transactionId);
  }
  return parsed.toString();
}

export async function POST(request: NextRequest) {
  try {
    assertProductionReadiness();
    assertSameOrigin(request);

    const { clientIp, correlationId } = getRequestContext(request);
    await assertRateLimit(createRateLimitKey('booking', clientIp, 'checkout-session'), 'booking');

    const payload = await parseRequestBody(request, requestSchema);
    const session = await getPrebookSession(payload.transactionId);
    if (!session) {
      return NextResponse.json({ error: 'Prebook session expired' }, { status: 400 });
    }

    if (session.prebookId !== payload.prebookId) {
      return NextResponse.json({ error: 'Prebook mismatch' }, { status: 400 });
    }

    if (session.quote.signature !== payload.quoteSignature) {
      return NextResponse.json({ error: 'Quote mismatch' }, { status: 400 });
    }

    const successUrl = appendTransaction(
      buildAbsoluteUrl(payload.successPath ?? '/booking/return?status=success'),
      payload.transactionId
    );
    const cancelUrl = appendTransaction(
      buildAbsoluteUrl(payload.cancelPath ?? '/booking/return?status=cancelled'),
      payload.transactionId
    );

    const stripeSession = await createStripeCheckoutIntent({
      transactionId: payload.transactionId,
      prebookId: payload.prebookId,
      quoteId: session.quoteId,
      clientReference: session.clientReference,
      totalAmount: session.quote.totalAmount,
      currency: session.quote.currency,
      successUrl,
      cancelUrl,
      bookingLabel: `Stay booking ${session.quote.hotelId}`
    });

    const linkagePersisted = await updateBookingStatusByTransactionId(payload.transactionId, 'pending', {
      stripeCheckoutSessionId: stripeSession.sessionId,
      stripePaymentIntentId: stripeSession.paymentIntentId,
      stripeCustomerId: stripeSession.customerId,
      stripeIdempotencyKey: stripeSession.idempotencyKey,
      paymentStatus: 'pending'
    });

    logger.info(
      {
        correlationId,
        transactionId: payload.transactionId,
        prebookId: payload.prebookId,
        stripeSessionId: stripeSession.sessionId,
        linkagePersisted
      },
      'Stripe checkout session created'
    );

    return NextResponse.json({
      checkoutSessionId: stripeSession.sessionId,
      checkoutUrl: stripeSession.sessionUrl,
      paymentIntentId: stripeSession.paymentIntentId,
      customerId: stripeSession.customerId,
      idempotencyKey: stripeSession.idempotencyKey,
      transactionId: payload.transactionId,
      prebookId: payload.prebookId,
      quoteId: session.quoteId,
      clientReference: session.clientReference,
      linkagePersisted
    });
  } catch (error) {
    logger.warn({ error, route: 'checkout-session' }, 'Checkout session request failed');
    const httpError = toHttpError(error);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
