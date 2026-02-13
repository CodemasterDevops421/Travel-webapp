import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertRateLimit } from '@/server/ratelimit';
import { bookRate } from '@/server/liteapi';
import { getPrebookSession } from '@/server/booking-store';
import { verifyPriceQuoteSignature } from '@/server/pricing';
import { HttpError, toHttpError } from '@/server/errors';
import { persistBooking } from '@/server/booking/repository';
import { verifyCheckoutSessionSignature } from '@/server/booking-session';

const requestSchema = z.object({
  prebookId: z.string().trim().min(1),
  transactionId: z.string().trim().min(1),
  clientReference: z.string().trim().min(1).optional(),
  quoteId: z.string().trim().min(1).nullable().optional(),
  sessionSignature: z.string().trim().min(32).optional(),
  quote: z.object({
    hotelId: z.string().trim().min(1),
    roomId: z.string().trim().min(1),
    baseAmount: z.number().positive(),
    totalAmount: z.number().positive(),
    currency: z.string().trim().length(3),
    signature: z.string().trim().min(32)
  }),
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
    const clientIp = request.headers.get('x-forwarded-for') ?? 'anonymous';
    await assertRateLimit(`booking-book:${clientIp}`);

    const raw = await request.json();
    const payload = requestSchema.parse(raw);

    if (!verifyPriceQuoteSignature(payload.quote)) {
      throw new HttpError(400, 'Invalid quote signature');
    }

    const storedSession = await getPrebookSession(payload.transactionId);
    const session = storedSession ?? (
      payload.clientReference && payload.sessionSignature
        ? {
            prebookId: payload.prebookId,
            transactionId: payload.transactionId,
            clientReference: payload.clientReference,
            quoteId: payload.quoteId ?? null,
            quote: payload.quote,
            createdAt: new Date().toISOString()
          }
        : null
    );
    if (!session) {
      throw new HttpError(400, 'Prebook session expired');
    }

    if (!storedSession) {
      const validSessionSignature = verifyCheckoutSessionSignature(
        {
          prebookId: payload.prebookId,
          transactionId: payload.transactionId,
          clientReference: session.clientReference,
          quoteId: session.quoteId,
          quoteSignature: payload.quote.signature
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
    if (session.quote.signature !== payload.quote.signature) {
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

    return NextResponse.json({
      booking,
      localBookingId,
      liteApiBookingId,
      status,
      clientReference: session.clientReference,
      quote: payload.quote
    });
  } catch (error) {
    const httpError = toHttpError(error);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
