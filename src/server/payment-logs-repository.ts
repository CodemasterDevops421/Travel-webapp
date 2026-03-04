import 'server-only';
import { randomUUID } from 'node:crypto';
import { env } from '@/server/env';
import { logger } from '@/server/logger';
import { createAdminClient } from '@/server/supabase/admin';

const failClosed = env.NODE_ENV === 'production' && env.STRICT_PERSISTENCE_MODE;

type PaymentLogRecord = {
  id: string;
  booking_id: string | null;
  provider: string;
  external_payment_id: string | null;
  event_type: string;
  status: string;
  amount: number | null;
  currency: string | null;
  correlation_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type InsertPaymentLogInput = {
  bookingId?: string | null;
  provider: string;
  externalPaymentId?: string | null;
  eventType: string;
  status: string;
  amount?: number | null;
  currency?: string | null;
  correlationId?: string | null;
  metadata?: Record<string, unknown> | null;
};

const fallbackPaymentLogs = new Map<string, PaymentLogRecord>();
const fallbackNaturalKeyToId = new Map<string, string>();
let schemaUnavailable = false;

function isSchemaMissingError(error: unknown): boolean {
  const code = (error as { code?: string } | null | undefined)?.code;
  return code === 'PGRST205';
}

function normalizeMetadata(value: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!value) {
    return null;
  }

  return {
    ...value
  };
}

function paymentLogNaturalKey(input: InsertPaymentLogInput): string | null {
  if (!input.externalPaymentId) {
    return null;
  }

  return [input.provider, input.eventType, input.externalPaymentId].join(':');
}

function upsertFallbackPaymentLog(input: InsertPaymentLogInput): string {
  const naturalKey = paymentLogNaturalKey(input);
  const now = new Date().toISOString();
  const existingId = naturalKey ? fallbackNaturalKeyToId.get(naturalKey) ?? null : null;

  if (existingId) {
    const existing = fallbackPaymentLogs.get(existingId);
    if (existing) {
      fallbackPaymentLogs.set(existingId, {
        ...existing,
        booking_id: input.bookingId ?? existing.booking_id,
        amount: typeof input.amount === 'number' ? input.amount : existing.amount,
        currency: input.currency ?? existing.currency,
        correlation_id: input.correlationId ?? existing.correlation_id,
        metadata: normalizeMetadata(input.metadata) ?? existing.metadata
      });
      return existingId;
    }
  }

  const id = randomUUID();
  const record: PaymentLogRecord = {
    id,
    booking_id: input.bookingId ?? null,
    provider: input.provider,
    external_payment_id: input.externalPaymentId ?? null,
    event_type: input.eventType,
    status: input.status,
    amount: typeof input.amount === 'number' ? input.amount : null,
    currency: input.currency ?? null,
    correlation_id: input.correlationId ?? null,
    metadata: normalizeMetadata(input.metadata),
    created_at: now
  };

  fallbackPaymentLogs.set(id, record);
  if (naturalKey) {
    fallbackNaturalKeyToId.set(naturalKey, id);
  }
  return id;
}

export async function insertPaymentLog(input: InsertPaymentLogInput): Promise<string | null> {
  if (schemaUnavailable) {
    if (failClosed) {
      logger.error('Supabase payment_logs persistence unavailable in production.');
      return null;
    }
    return upsertFallbackPaymentLog(input);
  }

  const supabase = createAdminClient();
  const naturalKey = paymentLogNaturalKey(input);

  if (naturalKey && input.externalPaymentId) {
    const { data: existingRows, error: existingError } = await supabase
      .from('payment_logs')
      .select('id, booking_id')
      .eq('provider', input.provider)
      .eq('event_type', input.eventType)
      .eq('external_payment_id', input.externalPaymentId)
      .limit(1);

    if (existingError) {
      if (isSchemaMissingError(existingError)) {
        schemaUnavailable = true;
        logger.warn({ error: existingError }, 'Supabase payment_logs schema missing. Using fallback payment logs storage.');
        if (failClosed) {
          return null;
        }
        return upsertFallbackPaymentLog(input);
      }
      logger.error({ error: existingError }, 'Payment log lookup failed before insert');
    }

    const existing = existingRows?.[0] as { id?: string; booking_id?: string | null } | undefined;
    if (existing?.id) {
      if (!existing.booking_id && input.bookingId) {
        const { error: updateError } = await supabase
          .from('payment_logs')
          .update({
            booking_id: input.bookingId,
            correlation_id: input.correlationId ?? null,
            metadata: normalizeMetadata(input.metadata)
          })
          .eq('id', existing.id);
        if (updateError) {
          logger.warn({ error: updateError, paymentLogId: existing.id }, 'Failed to hydrate booking link on existing payment log');
        }
      }
      return existing.id;
    }
  }

  const { data, error } = await supabase
    .from('payment_logs')
    .insert({
      booking_id: input.bookingId ?? null,
      provider: input.provider,
      external_payment_id: input.externalPaymentId ?? null,
      event_type: input.eventType,
      status: input.status,
      amount: typeof input.amount === 'number' ? input.amount : null,
      currency: input.currency ?? null,
      correlation_id: input.correlationId ?? null,
      metadata: normalizeMetadata(input.metadata)
    })
    .select('id')
    .single();

  if (error) {
    if (isSchemaMissingError(error)) {
      schemaUnavailable = true;
      logger.warn({ error }, 'Supabase payment_logs schema missing. Using fallback payment logs storage.');
      if (failClosed) {
        return null;
      }
      return upsertFallbackPaymentLog(input);
    }

    logger.error({ error }, 'Failed to persist payment log');
    if (failClosed) {
      return null;
    }
    return upsertFallbackPaymentLog(input);
  }

  return data?.id ?? upsertFallbackPaymentLog(input);
}

export async function getLatestPaymentLogByBookingId(bookingId: string): Promise<PaymentLogRecord | null> {
  let latestFallback: PaymentLogRecord | null = null;
  for (const record of fallbackPaymentLogs.values()) {
    if (record.booking_id !== bookingId) {
      continue;
    }
    if (!latestFallback || record.created_at > latestFallback.created_at) {
      latestFallback = record;
    }
  }

  if (schemaUnavailable) {
    if (failClosed) {
      return null;
    }
    return latestFallback;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('payment_logs')
    .select('id, booking_id, provider, external_payment_id, event_type, status, amount, currency, correlation_id, metadata, created_at')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    if (isSchemaMissingError(error)) {
      schemaUnavailable = true;
      logger.warn({ error, bookingId }, 'Supabase payment_logs schema missing during lookup by booking id.');
      if (failClosed) {
        return null;
      }
      return latestFallback;
    }
    logger.warn({ error, bookingId }, 'Failed to fetch payment log by booking id');
    return latestFallback;
  }

  return (data?.[0] as PaymentLogRecord | undefined) ?? latestFallback;
}
