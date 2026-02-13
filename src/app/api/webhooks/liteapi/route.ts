import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/server/env';
import { logger } from '@/server/logger';
import { assertRateLimit } from '@/server/ratelimit';
import { markWebhookEventProcessed } from '@/server/webhook-idempotency';
import { toHttpError } from '@/server/errors';
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

function readTimestampHeader(request: NextRequest): string {
  return (
    request.headers.get('x-liteapi-timestamp')
    ?? request.headers.get('liteapi-timestamp')
    ?? ''
  );
}

function toEpochMs(rawTimestamp: string): number | null {
  const value = Number(rawTimestamp);
  if (!Number.isFinite(value)) {
    return null;
  }

  const epochMs = value > 1e12 ? value : value * 1000;
  if (!Number.isFinite(epochMs) || epochMs <= 0) {
    return null;
  }

  return epochMs;
}

function safeCompareHex(expected: string, actual: string): boolean {
  const left = Buffer.from(expected);
  const right = Buffer.from(actual);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

function verifySignature(rawBody: string, signature: string, rawTimestamp: string): boolean {
  if (!env.LITEAPI_WEBHOOK_SECRET || !signature || !rawTimestamp) {
    return false;
  }

  const epochMs = toEpochMs(rawTimestamp);
  if (!epochMs) {
    return false;
  }

  const now = Date.now();
  const maxSkewMs = 5 * 60 * 1000;
  if (Math.abs(now - epochMs) > maxSkewMs) {
    return false;
  }

  const signedPayload = `${rawTimestamp}.${rawBody}`;
  const expectedTimestampSignature = createHmac('sha256', env.LITEAPI_WEBHOOK_SECRET).update(signedPayload).digest('hex');
  if (safeCompareHex(expectedTimestampSignature, signature)) {
    return true;
  }

  const expectedLegacySignature = createHmac('sha256', env.LITEAPI_WEBHOOK_SECRET).update(rawBody).digest('hex');
  return safeCompareHex(expectedLegacySignature, signature);
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = request.headers.get('x-forwarded-for') ?? 'anonymous';
    await assertRateLimit(`webhook-liteapi:${clientIp}`);

    const rawBody = await request.text();
    const signature = readSignatureHeader(request);
    const timestamp = readTimestampHeader(request);
    if (!verifySignature(rawBody, signature, timestamp)) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    let event: Record<string, unknown>;
    try {
      event = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const correlationId = request.headers.get('x-request-id') ?? request.headers.get('x-correlation-id') ?? 'unknown';
    const eventId = String(event.id ?? createHash('sha256').update(rawBody).digest('hex'));
    const firstSeen = await markWebhookEventProcessed(eventId);
    if (!firstSeen) {
      logger.info({ correlationId, eventId }, 'Duplicate LiteAPI webhook ignored');
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
    }

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
        eventId,
        eventType: event.type ?? 'unknown',
        bookingId: bookingId || null,
        transactionId: transactionId || null,
        status,
        persisted
      },
      'LiteAPI webhook received'
    );

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const httpError = toHttpError(error);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
