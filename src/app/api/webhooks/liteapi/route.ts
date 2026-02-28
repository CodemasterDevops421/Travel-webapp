import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { assertProductionReadiness, env } from '@/server/env';
import { logger } from '@/server/logger';
import { assertRateLimit } from '@/server/ratelimit';
import { claimWebhookEvent, finalizeWebhookEvent } from '@/server/webhook-idempotency';
import { toHttpError } from '@/server/errors';
import {
  persistBooking,
  updateBookingStatusByLiteApiId,
  updateBookingStatusByTransactionId
} from '@/server/booking/repository';
import { getClientIp, getCorrelationId } from '@/server/request';
import { normalizeSupplierBookingState } from '@/server/booking/lifecycle';

type ReconciliationUpdate = {
  bookingId: string | null;
  transactionId: string | null;
  status: 'pending' | 'payment_authorized' | 'confirmed' | 'failed' | 'refunded';
  metadata: Record<string, unknown>;
};

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

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function derivePaymentStatus(canonicalState: ReconciliationUpdate['status']): string {
  if (canonicalState === 'payment_authorized') {
    return 'authorized';
  }
  if (canonicalState === 'confirmed') {
    return 'captured';
  }
  if (canonicalState === 'refunded') {
    return 'refunded';
  }
  if (canonicalState === 'failed') {
    return 'failed';
  }
  return 'pending';
}

function buildReconciliationUpdate(event: Record<string, unknown>): ReconciliationUpdate | null {
  const payload = readRecord(event.data) ?? {};
  const bookingId =
    readString(payload.bookingId)
    ?? readString(payload.liteapiBookingId)
    ?? readString(event.bookingId);
  const transactionId = readString(payload.transactionId) ?? readString(event.transactionId);

  const candidates = [
    readString(payload.status),
    readString(event.status),
    readString(event.type)
  ].filter((value): value is string => Boolean(value));

  let normalizedStatus: ReconciliationUpdate['status'] | null = null;
  for (const candidate of candidates) {
    const mapped = normalizeSupplierBookingState(candidate);
    if (mapped) {
      normalizedStatus = mapped;
      break;
    }
  }

  if (!normalizedStatus) {
    return null;
  }

  return {
    bookingId: bookingId ?? null,
    transactionId: transactionId ?? null,
    status: normalizedStatus,
    metadata: {
      ...payload,
      supplierStatus: readString(payload.status) ?? readString(event.status) ?? null,
      eventId: event.id ?? null,
      eventType: event.type ?? null,
      paymentStatus: derivePaymentStatus(normalizedStatus)
    }
  };
}

export async function POST(request: NextRequest) {
  try {
    assertProductionReadiness();
    const clientIp = getClientIp(request);
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

    const correlationId = getCorrelationId(request);
    const eventId = String(event.id ?? createHash('sha256').update(rawBody).digest('hex'));
    const claimed = await claimWebhookEvent(eventId, 'liteapi', 60);
    if (!claimed) {
      logger.info({ correlationId, eventId }, 'Duplicate LiteAPI webhook ignored');
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
    }

    const update = buildReconciliationUpdate(event);
    if (!update) {
      await finalizeWebhookEvent(eventId, 'liteapi');
      logger.info({ correlationId, eventId, eventType: event.type ?? 'unknown' }, 'LiteAPI webhook ignored (unsupported status)');
      return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
    }

    let persisted = false;
    if (update.bookingId) {
      persisted = await updateBookingStatusByLiteApiId(update.bookingId, update.status, update.metadata);
    } else if (update.transactionId) {
      persisted = await updateBookingStatusByTransactionId(update.transactionId, update.status, update.metadata);
    } else {
      const localId = await persistBooking({
        quoteId: null,
        liteApiBookingId: null,
        status: update.status,
        metadata: update.metadata
      });
      persisted = Boolean(localId);
    }

    if (!persisted) {
      logger.warn({ correlationId, eventId, eventType: event.type ?? 'unknown' }, 'LiteAPI webhook reconciliation failed; allow retry');
      return NextResponse.json({ error: 'Reconciliation failed' }, { status: 500 });
    }

    await finalizeWebhookEvent(eventId, 'liteapi');

    logger.info(
      {
        correlationId,
        eventId,
        eventType: event.type ?? 'unknown',
        bookingId: update.bookingId,
        transactionId: update.transactionId,
        status: update.status,
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
