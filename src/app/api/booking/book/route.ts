import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertRateLimit } from '@/server/ratelimit';
import { bookRate } from '@/server/liteapi';
import { getPrebookSession } from '@/server/booking-store';
import { HttpError, toHttpError } from '@/server/errors';
import { persistBooking } from '@/server/booking/repository';
import { verifyCheckoutSessionSignature } from '@/server/booking-session';
import { signBookingViewToken } from '@/server/booking-view-token';
import { env } from '@/server/env';
import { logger } from '@/server/logger';
import { getClientIp, getCorrelationId } from '@/server/request';

const requestSchema = z.object({
  prebookId: z.string().trim().min(1),
  transactionId: z.string().trim().min(1),
  clientReference: z.string().trim().min(1).optional(),
  quoteId: z.string().trim().min(1).nullable().optional(),
  sessionSignature: z.string().trim().min(32).optional(),
  quoteSignature: z.string().trim().min(32),
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

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const correlationId = getCorrelationId(request);
    await assertRateLimit(`booking-book:${clientIp}`);

    const raw = await request.json();
    const payload = requestSchema.parse(raw);

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
    if (storedSession && storedSession.quote.signature !== payload.quoteSignature) {
      throw new HttpError(400, 'Quote mismatch');
    }

    const booking = await bookRate({
      prebookId: payload.prebookId,
      transactionId: payload.transactionId,
      clientReference: session.clientReference,
      holder: payload.holder,
      guests: payload.guests
    });

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
        prebookId: payload.prebookId
      }
    });
    if (!localBookingId && env.NODE_ENV === 'production') {
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

    return NextResponse.json({
      booking,
      localBookingId,
      bookingViewToken,
      liteApiBookingId,
      status,
      clientReference: session.clientReference,
      quoteSignature: storedSession?.quote.signature ?? payload.quoteSignature ?? null
    });
  } catch (error) {
    logger.warn({ error, route: 'booking-book' }, 'Book request failed');
    const httpError = toHttpError(error);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
