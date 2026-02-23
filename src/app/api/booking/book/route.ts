import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertRateLimit, createRateLimitKey } from '@/server/ratelimit';
import { assertSameOrigin } from '@/server/csrf';
import { bookRate } from '@/server/liteapi';
import { getPrebookSession } from '@/server/booking-store';
import { HttpError, toHttpError } from '@/server/errors';
import { persistBooking } from '@/server/booking/repository';
import { verifyCheckoutSessionSignature } from '@/server/booking-session';
import { signBookingViewToken } from '@/server/booking-view-token';
import { verifyPriceQuoteSignature, type PriceQuote } from '@/server/pricing';
import {
  acquireFinalizeBookingLock,
  getFinalizedBookingResult,
  releaseFinalizeBookingLock,
  saveFinalizedBookingResult
} from '@/server/booking-idempotency';
import { assertProductionReadiness, env } from '@/server/env';
import { logger } from '@/server/logger';
import { getRequestContext, parseRequestBody, sanitizeRecord, sanitizeUnknown, stripSupplierSecrets } from '@/server/request';

const requestSchema = z.object({
  prebookId: z.string().trim().min(1),
  transactionId: z.string().trim().min(1),
  clientReference: z.string().trim().min(1).optional(),
  quoteId: z.string().trim().min(1).nullable().optional(),
  sessionSignature: z.string().trim().min(32).optional(),
  quoteSignature: z.string().trim().min(32),
  quote: z.object({
    hotelId: z.string().trim().min(1),
    roomId: z.string().trim().min(1),
    baseAmount: z.number().nonnegative(),
    totalAmount: z.number().nonnegative(),
    currency: z.string().trim().length(3),
    signature: z.string().trim().min(32)
  }).optional(),
  holder: z.object({
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    email: z.string().trim().email()
  }),
  guests: z.array(
    z.object({
      occupancyNumber: z.number().int().positive(),
      firstName: z.string().trim().min(1),
      lastName: z.string().trim().min(1)
    })
  ).min(1)
});

const supplierBookingSchema = z.object({
  data: z.object({
    bookingId: z.string().trim().min(1).optional(),
    status: z.string().trim().min(1).optional()
  }).passthrough().optional(),
  bookingId: z.string().trim().min(1).optional(),
  status: z.string().trim().min(1).optional()
}).passthrough();

export async function POST(request: NextRequest) {
  let lockAcquired = false;
  let transactionIdForLock: string | null = null;

  try {
    assertProductionReadiness();
    assertSameOrigin(request);
    if (!env.LITEAPI_API_KEY || env.LITEAPI_API_KEY.toLowerCase().includes('placeholder')) {
      throw new HttpError(503, 'Booking is temporarily unavailable. Please retry shortly.');
    }

    const { clientIp, correlationId } = getRequestContext(request);
    await assertRateLimit(createRateLimitKey('booking', clientIp, 'finalize'), 'booking');

    const payload = await parseRequestBody(request, requestSchema);
    transactionIdForLock = payload.transactionId;

    const cachedResult = await getFinalizedBookingResult(payload.transactionId);
    if (cachedResult) {
      logger.info({ correlationId, transactionId: payload.transactionId }, 'Returning cached finalized booking response');
      return NextResponse.json(cachedResult);
    }

    lockAcquired = await acquireFinalizeBookingLock(payload.transactionId);
    if (!lockAcquired) {
      const inFlightResult = await getFinalizedBookingResult(payload.transactionId);
      if (inFlightResult) {
        return NextResponse.json(inFlightResult);
      }
      throw new HttpError(409, 'Booking finalization already in progress');
    }

    const storedSession = await getPrebookSession(payload.transactionId);
    const recoveredSession = (
      payload.clientReference && payload.sessionSignature && payload.quoteSignature
        ? {
            prebookId: payload.prebookId,
            transactionId: payload.transactionId,
            clientReference: payload.clientReference,
            quoteId: payload.quoteId ?? null,
            quoteSignature: payload.quoteSignature,
            createdAt: new Date().toISOString()
          }
        : null
    );
    const session = storedSession ?? recoveredSession;
    if (!session) {
      throw new HttpError(400, 'Prebook session expired');
    }

    if (!storedSession) {
      if (!recoveredSession) {
        throw new HttpError(400, 'Prebook session expired');
      }
      const validSessionSignature = verifyCheckoutSessionSignature(
        {
          prebookId: payload.prebookId,
          transactionId: payload.transactionId,
          clientReference: recoveredSession.clientReference,
          quoteId: recoveredSession.quoteId,
          quoteSignature: recoveredSession.quoteSignature
        },
        payload.sessionSignature ?? ''
      );
      if (!validSessionSignature) {
        throw new HttpError(400, 'Invalid session signature');
      }
    }

    if (session.prebookId !== payload.prebookId) {
      throw new HttpError(400, 'Prebook mismatch');
    }

    const quoteToVerify: PriceQuote | null = storedSession?.quote ?? payload.quote ?? null;
    if (!quoteToVerify) {
      throw new HttpError(400, 'Quote payload missing');
    }
    if (quoteToVerify.signature !== payload.quoteSignature) {
      throw new HttpError(400, 'Quote mismatch');
    }
    if (!verifyPriceQuoteSignature(quoteToVerify)) {
      throw new HttpError(400, 'Invalid quote signature');
    }

    const safeHolder = sanitizeRecord(payload.holder);
    const safeGuests = payload.guests.map((guest) => sanitizeRecord(guest));

    const supplierBooking = sanitizeUnknown(await bookRate({
      prebookId: payload.prebookId,
      transactionId: payload.transactionId,
      clientReference: session.clientReference,
      holder: safeHolder,
      guests: safeGuests
    }));
    const parsedBooking = supplierBookingSchema.safeParse(supplierBooking);
    if (!parsedBooking.success) {
      throw new HttpError(502, 'Supplier booking payload is invalid');
    }
    const booking = parsedBooking.data;

    const bookingData = booking as {
      data?: {
        bookingId?: string;
        status?: string;
      };
      bookingId?: string;
      status?: string;
    };
    const liteApiBookingId = bookingData.data?.bookingId ?? bookingData.bookingId ?? null;
    const status = bookingData.data?.status ?? bookingData.status ?? 'unknown';
    const localBookingId = await persistBooking({
      quoteId: session.quoteId,
      liteApiBookingId,
      status,
      metadata: {
        clientReference: session.clientReference,
        transactionId: payload.transactionId,
        prebookId: payload.prebookId,
        itinerary: {
          hotelId: quoteToVerify.hotelId,
          roomId: quoteToVerify.roomId,
          baseAmount: quoteToVerify.baseAmount,
          totalAmount: quoteToVerify.totalAmount,
          currency: quoteToVerify.currency,
          quoteSignature: quoteToVerify.signature
        },
        holder: safeHolder,
        guests: safeGuests
      }
    });
    if (!localBookingId && env.NODE_ENV === 'production' && env.STRICT_PERSISTENCE_MODE) {
      throw new HttpError(503, 'Booking persistence unavailable');
    }
    const bookingViewToken = localBookingId ? signBookingViewToken({ bookingId: localBookingId }) : null;

    logger.info(
      {
        correlationId,
        transactionId: payload.transactionId,
        localBookingId,
        liteApiBookingId,
        status
      },
      'Booking finalized'
    );

    const responsePayload = {
      booking: stripSupplierSecrets(booking),
      localBookingId,
      bookingViewToken,
      liteApiBookingId,
      status,
      clientReference: session.clientReference,
      quoteSignature: quoteToVerify.signature
    };

    await saveFinalizedBookingResult(payload.transactionId, responsePayload);

    return NextResponse.json(responsePayload);
  } catch (error) {
    logger.warn({ error, route: 'booking-book' }, 'Book request failed');
    const httpError = toHttpError(error);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  } finally {
    if (lockAcquired && transactionIdForLock) {
      try {
        await releaseFinalizeBookingLock(transactionIdForLock);
      } catch (error) {
        logger.error(
          { error, route: 'booking-book', transactionId: transactionIdForLock },
          'Failed to release booking finalization lock'
        );
      }
    }
  }
}

