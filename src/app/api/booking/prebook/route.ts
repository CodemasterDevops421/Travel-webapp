import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertRateLimit } from '@/server/ratelimit';
import { assertSameOrigin } from '@/server/csrf';
import { buildPriceQuoteExact } from '@/server/pricing';
import { prebookRate } from '@/server/liteapi';
import { savePrebookSession } from '@/server/booking-store';
import { HttpError, toHttpError } from '@/server/errors';
import { persistQuote } from '@/server/booking/repository';
import { signCheckoutSession } from '@/server/booking-session';
import { logger } from '@/server/logger';
import { getRequestContext, parseRequestBody, sanitizeUnknown } from '@/server/request';
import { assertProductionReadiness } from '@/server/env';
import { createServerSupabaseClient } from '@/server/supabase/server';

const requestSchema = z.object({
  hotelId: z.string().trim().min(1),
  roomId: z.string().trim().min(1),
  offerId: z.string().trim().min(1),
  checkIn: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.array(
    z.object({
      adults: z.number().int().positive(),
      children: z.number().int().min(0).optional()
    })
  ).min(1)
});

const supplierPrebookSchema = z.object({
  prebookId: z.string().trim().min(1),
  transactionId: z.string().trim().min(1),
  secretKey: z.string().trim().min(1),
  price: z.number().nonnegative(),
  currency: z.string().trim().length(3)
});

const clientPrebookResponseSchema = z.object({
  prebookId: z.string().trim().min(1),
  transactionId: z.string().trim().min(1),
  clientReference: z.string().trim().min(1),
  paymentToken: z.string().trim().min(1),
  paymentSdk: z.literal(true),
  quoteId: z.string().trim().min(1).nullable(),
  sessionSignature: z.string().trim().min(1),
  quote: z.object({
    hotelId: z.string().trim().min(1),
    roomId: z.string().trim().min(1),
    baseAmount: z.number().nonnegative(),
    totalAmount: z.number().nonnegative(),
    currency: z.string().trim().length(3),
    signature: z.string().trim().min(1)
  })
});

function createClientReference(input: { hotelId: string; roomId: string; offerId: string }): string {
  const compact = `${input.hotelId}-${input.roomId}-${input.offerId}`
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 48);
  return `tf-${Date.now()}-${compact}`;
}

export async function POST(request: NextRequest) {
  try {
    assertProductionReadiness();
    assertSameOrigin(request);

    const supabase = await createServerSupabaseClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in required to continue booking.', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const { clientIp, correlationId } = getRequestContext(request);
    await assertRateLimit(`booking:${clientIp}:prebook`, 'booking');

    const payload = await parseRequestBody(request, requestSchema);
    if (new Date(payload.checkOut) <= new Date(payload.checkIn)) {
      return NextResponse.json({ error: 'checkOut must be after checkIn' }, { status: 400 });
    }
    const supplierPrebook = sanitizeUnknown(await prebookRate(payload.offerId));
    const parsedPrebook = supplierPrebookSchema.safeParse(supplierPrebook);
    if (!parsedPrebook.success) {
      throw new HttpError(502, 'Supplier prebook payload is invalid');
    }
    const prebook = parsedPrebook.data;
    const quote = buildPriceQuoteExact({
      hotelId: payload.hotelId,
      roomId: payload.roomId,
      amount: prebook.price,
      currency: prebook.currency.toUpperCase()
    });
    const clientReference = createClientReference({
      hotelId: payload.hotelId,
      roomId: payload.roomId,
      offerId: payload.offerId
    });
    const quoteId = await persistQuote({
      quote,
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
      guests: payload.guests
    });
    if (!quoteId) {
      logger.warn({ correlationId }, 'Booking quote persistence unavailable; continuing with signed session only.');
    }

    await savePrebookSession({
      prebookId: prebook.prebookId,
      transactionId: prebook.transactionId,
      clientReference,
      quoteId,
      quote,
      createdAt: new Date().toISOString()
    });
    const sessionSignature = signCheckoutSession({
      prebookId: prebook.prebookId,
      transactionId: prebook.transactionId,
      clientReference,
      quoteId,
      quoteSignature: quote.signature
    });

    logger.info(
      {
        correlationId,
        prebookId: prebook.prebookId,
        transactionId: prebook.transactionId,
        quoteId
      },
      'Prebook session created'
    );

    const responsePayload = clientPrebookResponseSchema.parse({
      prebookId: prebook.prebookId,
      transactionId: prebook.transactionId,
      clientReference,
      paymentToken: prebook.secretKey,
      paymentSdk: true,
      quoteId,
      sessionSignature,
      quote
    });

    return NextResponse.json(responsePayload);
  } catch (error) {
    logger.warn({ error, route: 'booking-prebook' }, 'Prebook request failed');
    const httpError = toHttpError(error);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
