import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertSameOrigin } from '@/server/csrf';
import { toHttpError } from '@/server/errors';
import { logger } from '@/server/logger';
import { verifyCheckoutSessionSignature } from '@/server/booking-session';
import {
  getCheckoutProgressSessionByPrebookId,
  getCheckoutProgressSessionByTransactionId,
  saveCheckoutProgressSession,
  type CheckoutProgressSession
} from '@/server/booking-store';
import { getBookingById, getBookingByTransactionId } from '@/server/booking/repository';
import { signBookingViewToken } from '@/server/booking-view-token';
import { parseRequestBody } from '@/server/request';

const requestSchema = z
  .object({
    bookingId: z.string().trim().min(1).optional(),
    transactionId: z.string().trim().min(1).optional(),
    prebookId: z.string().trim().min(1).optional(),
    clientReference: z.string().trim().min(1).optional(),
    quoteId: z.string().trim().min(1).nullable().optional(),
    quoteSignature: z.string().trim().min(32).optional(),
    sessionSignature: z.string().trim().min(32).optional(),
    holderEmail: z.string().trim().email().optional()
  })
  .refine(
    (payload) => Boolean(payload.bookingId || payload.transactionId || payload.prebookId),
    { message: 'bookingId, transactionId, or prebookId is required' }
  );

type BookingStatusOutcome = 'processing' | 'confirmed' | 'failed';

function toOutcome(status: string | null | undefined): BookingStatusOutcome {
  if (status === 'confirmed') {
    return 'confirmed';
  }
  if (status === 'failed' || status === 'refunded') {
    return 'failed';
  }
  return 'processing';
}

function buildProcessingResponse(context: CheckoutProgressSession | null) {
  return {
    outcome: 'processing' as const,
    lifecycleStatus: 'pending',
    paymentStatus: 'pending',
    localBookingId: null,
    bookingViewToken: null,
    confirmationCode: null,
    transactionId: context?.transactionId ?? null,
    prebookId: context?.prebookId ?? null,
    message: 'Booking is still processing. Please wait for lifecycle confirmation.'
  };
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const payload = await parseRequestBody(request, requestSchema);

    let checkoutContext: CheckoutProgressSession | null = null;

    if (payload.transactionId) {
      checkoutContext = await getCheckoutProgressSessionByTransactionId(payload.transactionId);
    }
    if (!checkoutContext && payload.prebookId) {
      checkoutContext = await getCheckoutProgressSessionByPrebookId(payload.prebookId);
    }

    if (payload.sessionSignature && payload.clientReference && payload.quoteSignature) {
      const transactionId = payload.transactionId ?? checkoutContext?.transactionId;
      const prebookId = payload.prebookId ?? checkoutContext?.prebookId;

      if (!transactionId || !prebookId) {
        return NextResponse.json({ error: 'Missing checkout identifiers.' }, { status: 400 });
      }

      const verified = verifyCheckoutSessionSignature(
        {
          prebookId,
          transactionId,
          clientReference: payload.clientReference,
          quoteId: payload.quoteId ?? null,
          quoteSignature: payload.quoteSignature
        },
        payload.sessionSignature
      );

      if (!verified) {
        return NextResponse.json({ error: 'Invalid checkout session signature.' }, { status: 401 });
      }

      checkoutContext = {
        transactionId,
        prebookId,
        clientReference: payload.clientReference,
        quoteId: payload.quoteId ?? null,
        sessionSignature: payload.sessionSignature,
        quoteSignature: payload.quoteSignature,
        holderEmail: payload.holderEmail ?? checkoutContext?.holderEmail ?? '',
        state: 'awaiting_confirmation',
        updatedAt: new Date().toISOString()
      };

      await saveCheckoutProgressSession(checkoutContext);
    }

    let booking = payload.bookingId ? await getBookingById(payload.bookingId) : null;
    if (!booking && payload.transactionId) {
      booking = await getBookingByTransactionId(payload.transactionId);
    }
    if (!booking && checkoutContext?.transactionId) {
      booking = await getBookingByTransactionId(checkoutContext.transactionId);
    }

    if (!booking) {
      return NextResponse.json(buildProcessingResponse(checkoutContext));
    }

    const outcome = toOutcome(booking.status);
    const bookingViewToken = outcome === 'confirmed' ? signBookingViewToken({ bookingId: booking.id }) : null;
    const message =
      outcome === 'confirmed'
        ? 'Booking confirmed.'
        : outcome === 'failed'
          ? 'Booking did not complete successfully.'
          : 'Booking is still processing. Please wait for lifecycle confirmation.';

    return NextResponse.json({
      outcome,
      lifecycleStatus: booking.status,
      paymentStatus: booking.payment_status,
      localBookingId: booking.id,
      bookingViewToken,
      confirmationCode: booking.confirmation_code,
      transactionId: checkoutContext?.transactionId ?? payload.transactionId ?? null,
      prebookId: checkoutContext?.prebookId ?? payload.prebookId ?? null,
      message
    });
  } catch (error) {
    logger.warn({ error, route: 'booking-status' }, 'Booking status lookup failed');
    const httpError = toHttpError(error);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
