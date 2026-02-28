import 'server-only';
import { randomUUID } from 'node:crypto';
import { env } from '@/server/env';
import { logger } from '@/server/logger';
import { createAdminClient } from '@/server/supabase/admin';

const failClosed = env.NODE_ENV === 'production' && env.STRICT_PERSISTENCE_MODE;

export type CommissionTrackingRecord = {
  id: string;
  booking_id: string;
  payment_log_id: string | null;
  gross_booking_value: number;
  commission_percent: number;
  commission_amount: number;
  currency: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type UpsertCommissionTrackingInput = {
  bookingId: string;
  paymentLogId?: string | null;
  grossBookingValue: number;
  commissionPercent: number;
  commissionAmount: number;
  currency: string;
  metadata?: Record<string, unknown> | null;
};

const fallbackCommissionByBookingId = new Map<string, CommissionTrackingRecord>();
let schemaUnavailable = false;

function isSchemaMissingError(error: unknown): boolean {
  const code = (error as { code?: string } | null | undefined)?.code;
  return code === 'PGRST205';
}

function normalizeNumber(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 100) / 100;
}

function normalizeMetadata(value: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!value) {
    return null;
  }

  return {
    ...value
  };
}

function upsertFallback(input: UpsertCommissionTrackingInput): string {
  const existing = fallbackCommissionByBookingId.get(input.bookingId);
  const now = new Date().toISOString();
  const id = existing?.id ?? randomUUID();

  fallbackCommissionByBookingId.set(input.bookingId, {
    id,
    booking_id: input.bookingId,
    payment_log_id: input.paymentLogId ?? existing?.payment_log_id ?? null,
    gross_booking_value: normalizeNumber(input.grossBookingValue),
    commission_percent: normalizeNumber(input.commissionPercent),
    commission_amount: normalizeNumber(input.commissionAmount),
    currency: input.currency,
    metadata: normalizeMetadata(input.metadata) ?? existing?.metadata ?? null,
    created_at: existing?.created_at ?? now,
    updated_at: now
  });

  return id;
}

export async function upsertCommissionTracking(input: UpsertCommissionTrackingInput): Promise<string | null> {
  if (schemaUnavailable) {
    if (failClosed) {
      logger.error('Supabase commission_tracking persistence unavailable in production.');
      return null;
    }
    return upsertFallback(input);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('commission_tracking')
    .upsert({
      booking_id: input.bookingId,
      payment_log_id: input.paymentLogId ?? null,
      gross_booking_value: normalizeNumber(input.grossBookingValue),
      commission_percent: normalizeNumber(input.commissionPercent),
      commission_amount: normalizeNumber(input.commissionAmount),
      currency: input.currency,
      metadata: normalizeMetadata(input.metadata)
    }, {
      onConflict: 'booking_id'
    })
    .select('id')
    .single();

  if (error) {
    if (isSchemaMissingError(error)) {
      schemaUnavailable = true;
      logger.warn({ error }, 'Supabase commission_tracking schema missing. Using fallback commission tracking storage.');
      if (failClosed) {
        return null;
      }
      return upsertFallback(input);
    }

    logger.error({ error, bookingId: input.bookingId }, 'Failed to upsert commission tracking');
    if (failClosed) {
      return null;
    }
    return upsertFallback(input);
  }

  return data?.id ?? upsertFallback(input);
}

export async function getCommissionTrackingByBookingId(bookingId: string): Promise<CommissionTrackingRecord | null> {
  const fallback = fallbackCommissionByBookingId.get(bookingId) ?? null;

  if (schemaUnavailable) {
    if (failClosed) {
      return null;
    }
    return fallback;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('commission_tracking')
    .select('id, booking_id, payment_log_id, gross_booking_value, commission_percent, commission_amount, currency, metadata, created_at, updated_at')
    .eq('booking_id', bookingId)
    .limit(1)
    .single();

  if (error) {
    if (isSchemaMissingError(error)) {
      schemaUnavailable = true;
      logger.warn({ error, bookingId }, 'Supabase commission_tracking schema missing during lookup.');
      if (failClosed) {
        return null;
      }
      return fallback;
    }
    logger.warn({ error, bookingId }, 'Failed to read commission tracking by booking id');
    return fallback;
  }

  return (data as CommissionTrackingRecord) ?? fallback;
}
