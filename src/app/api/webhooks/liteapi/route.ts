import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/server/env';
import { logger } from '@/server/logger';
import {
  persistBooking,
  updateBookingStatusByLiteApiId,
  updateBookingStatusByTransactionId
} from '@/server/booking/repository';

function readSignatureHeader(request: NextRequest): string {
  return (
    request.headers.get('x-liteapi-signature')
    ?? request.headers.get('liteapi-signature')
    ?? ''
  );
}

function verifySignature(rawBody: string, signature: string): boolean {
  if (!env.LITEAPI_WEBHOOK_SECRET || !signature) {
    return false;
  }

  const expected = createHmac('sha256', env.LITEAPI_WEBHOOK_SECRET).update(rawBody).digest('hex');
  const left = Buffer.from(expected);
  const right = Buffer.from(signature);
  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = readSignatureHeader(request);
  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const correlationId = request.headers.get('x-request-id') ?? request.headers.get('x-correlation-id') ?? 'unknown';
  const payload = event.data as Record<string, unknown> | undefined;
  const bookingId = String(
    payload?.bookingId
    ?? payload?.liteapiBookingId
    ?? event.bookingId
    ?? ''
  );
  const transactionId = String(payload?.transactionId ?? event.transactionId ?? '');
  const status = String(payload?.status ?? event.status ?? event.type ?? 'received');

  let persisted = false;
  if (bookingId) {
    persisted = await updateBookingStatusByLiteApiId(bookingId, status, {
      ...payload,
      eventId: event.id ?? null,
      eventType: event.type ?? null
    });
  } else if (transactionId) {
    persisted = await updateBookingStatusByTransactionId(transactionId, status, {
      ...payload,
      eventId: event.id ?? null,
      eventType: event.type ?? null
    });
  } else {
    const localId = await persistBooking({
      quoteId: null,
      liteApiBookingId: null,
      status,
      metadata: {
        ...payload,
        eventId: event.id ?? null,
        eventType: event.type ?? null
      }
    });
    persisted = Boolean(localId);
  }

  logger.info(
    {
      correlationId,
      eventType: event.type ?? 'unknown',
      eventId: event.id ?? null,
      bookingId: bookingId || null,
      transactionId: transactionId || null,
      status,
      persisted
    },
    'LiteAPI webhook received'
  );

  return NextResponse.json({ ok: true }, { status: 200 });
}
