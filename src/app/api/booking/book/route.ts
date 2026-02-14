import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertRateLimit } from '@/server/ratelimit';
import { bookRate } from '@/server/liteapi';
import { getPrebookSession } from '@/server/booking-store';
import { HttpError, toHttpError } from '@/server/errors';
import { persistBooking } from '@/server/booking/repository';
import { verifyCheckoutSessionSignature } from '@/server/booking-session';
import { verifyPriceQuoteSignature } from '@/server/pricing';
import { signBookingViewToken } from '@/server/booking-view-token';
import { env } from '@/server/env';
import { logger } from '@/server/logger';
import { getClientIp, getCorrelationId } from '@/server/request';

const requestSchema = z.object({
  prebookId: z.string().trim().min(1, 'Prebook ID is required'),
  transactionId: z.string().trim().min(1, 'Transaction ID is required'),
  clientReference: z.string().trim().min(1).optional(),
  quoteId: z.string().trim().min(1).nullable().optional(),
  sessionSignature: z.string().trim().min(32).optional(),
  quoteSignature: z.string().trim().min(32, 'Quote signature is required'),
  holder: z.object({
    firstName: z.string().trim().min(1, 'First name is required'),
    lastName: z.string().trim().min(1, 'Last name is required'),
    email: z.string().trim().email('Valid email is required')
  }),
  guests: z.array(
    z.object({
      occupancyNumber: z.number().int().positive(),
      firstName: z.string().trim().min(1),
      lastName: z.string().trim().min(1)
    })
  ).min(1, 'At least one guest is required')
});

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const correlationId = getCorrelationId(request);
    await assertRateLimit(`booking-book:${clientIp}`);

    const raw = await request.json();
    const parsed = requestSchema.safeParse(raw);
    
    if (!parsed.success) {
      const errors = parsed.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }
    
    const payload = parsed.data;

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
      throw new HttpError(400, 'Prebook session expired or invalid');
    }

    // CRITICAL: Always verify quote signature to prevent price tampering
    if (storedSession) {
      // Verify stored quote matches submitted quote
      if (storedSession.quote.signature !== payload.quoteSignature) {
        logger.warn({ correlationId, transactionId: payload.transactionId }, 'Quote signature mismatch - possible tampering');
        throw new HttpError(400, 'Quote validation failed');
      }
      
      // Additional verification: validate the quote signature cryptographically
      const isValidQuote = verifyPriceQuoteSignature(storedSession.quote);
      if (!isValidQuote) {
        logger.error({ correlationId, transactionId: payload.transactionId }, 'Quote signature cryptographically invalid');
        throw new HttpError(400, 'Quote integrity check failed');
      }
    } else if (recoveredSession) {
      // For recovered sessions, verify the session signature
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
        logger.warn({ correlationId, transactionId: payload.transactionId }, 'Invalid session signature');
        throw new HttpError(400, 'Session validation failed');
      }
    }

    if (session.prebookId !== payload.prebookId) {
      logger.warn({ correlationId, expected: session.prebookId, received: payload.prebookId }, 'Prebook ID mismatch');
      throw new HttpError(400, 'Prebook mismatch');
    }

    const booking = await bookRate({
      prebookId: payload.prebookId,
      transactionId: payload.transactionId,
      clientReference: session.clientReference,
      holder: payload.holder,
      guests: payload.guests
    });

    // Validate booking response structure
    if (!booking || typeof booking !== 'object') {
      logger.error({ correlationId, transactionId: payload.transactionId }, 'Invalid booking response from LiteAPI');
      throw new HttpError(502, 'Invalid response from booking provider');
    }

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
    
    if (!liteApiBookingId) {
      logger.error({ correlationId, transactionId: payload.transactionId, booking }, 'Missing booking ID in response');
      throw new HttpError(502, 'Booking provider returned incomplete data');
    }
    
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
