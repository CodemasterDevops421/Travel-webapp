import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertRateLimit } from '@/server/ratelimit';
import { buildPriceQuote } from '@/server/pricing';
import { prebookRate } from '@/server/liteapi';
import { savePrebookSession } from '@/server/booking-store';
import { toHttpError } from '@/server/errors';
import { persistQuote } from '@/server/booking/repository';

const requestSchema = z.object({
  hotelId: z.string().trim().min(1),
  roomId: z.string().trim().min(1),
  offerId: z.string().trim().min(1),
  amount: z.number().positive(),
  currency: z.string().trim().length(3),
  checkIn: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.array(
    z.object({
      adults: z.number().int().positive(),
      children: z.number().int().min(0).optional()
    })
  ).min(1)
});

function createClientReference(input: { hotelId: string; roomId: string; offerId: string }): string {
  const compact = `${input.hotelId}-${input.roomId}-${input.offerId}`
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 48);
  return `tf-${Date.now()}-${compact}`;
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = request.headers.get('x-forwarded-for') ?? 'anonymous';
    await assertRateLimit(`booking-prebook:${clientIp}`);

    const raw = await request.json();
    const payload = requestSchema.parse(raw);
    if (new Date(payload.checkOut) <= new Date(payload.checkIn)) {
      return NextResponse.json({ error: 'checkOut must be after checkIn' }, { status: 400 });
    }
    const quote = buildPriceQuote({
      hotelId: payload.hotelId,
      roomId: payload.roomId,
      amount: payload.amount,
      currency: payload.currency.toUpperCase()
    });

    const prebook = await prebookRate(payload.offerId);
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

    await savePrebookSession({
      prebookId: prebook.prebookId,
      transactionId: prebook.transactionId,
      clientReference,
      quoteId,
      quote,
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({
      prebookId: prebook.prebookId,
      transactionId: prebook.transactionId,
      clientReference,
      secretKey: prebook.secretKey,
      paymentSdk: true,
      quoteId,
      quote
    });
  } catch (error) {
    const httpError = toHttpError(error);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
