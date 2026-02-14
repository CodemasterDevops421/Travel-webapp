import 'server-only';
import { randomUUID } from 'node:crypto';
import { createAdminClient } from '@/server/supabase/admin';
import { env } from '@/server/env';
import type { PriceQuote } from '@/server/pricing';
import { logger } from '@/server/logger';
import { getOrSetRedisCache } from '@/server/cache';

type GuestInput = {
  adults: number;
  children?: number;
};

type PersistQuoteInput = {
  quote: PriceQuote;
  checkIn: string;
  checkOut: string;
  guests: GuestInput[];
};

type FallbackQuoteRecord = {
  id: string;
  hotel_id: string;
  room_id: string;
  check_in: string;
  check_out: string;
  guests: GuestInput[];
  total_amount: number;
  currency: string;
  price_signature: string;
  expires_at: string;
  created_at: string;
};

// Fallback storage with TTL cleanup - only for development
const fallbackQuotes = new Map<string, FallbackQuoteRecord>();
const fallbackBookings = new Map<string, BookingRecord>();
const SCHEMA_ERROR_CODE = 'PGRST205';

function isSchemaMissingError(error: unknown): boolean {
  if (error === null || typeof error !== 'object') return false;
  const code = (error as { code?: unknown }).code;
  return code === SCHEMA_ERROR_CODE;
}

function mergeMetadata(
  existing: Record<string, unknown> | null | undefined,
  incoming: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...(existing ?? {}),
    ...incoming
  };
}

function cleanupExpiredFallbackRecords(): void {
  const now = new Date().toISOString();
  for (const [id, record] of fallbackQuotes) {
    if (record.expires_at < now) {
      fallbackQuotes.delete(id);
    }
  }
  // Cleanup old bookings (older than 24 hours)
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  for (const [id, record] of fallbackBookings) {
    if (record.created_at < cutoff) {
      fallbackBookings.delete(id);
    }
  }
}

export async function persistQuote(input: PersistQuoteInput): Promise<string | null> {
  const fallbackId = randomUUID();
  const fallbackRecord: FallbackQuoteRecord = {
    id: fallbackId,
    hotel_id: input.quote.hotelId,
    room_id: input.quote.roomId,
    check_in: input.checkIn,
    check_out: input.checkOut,
    guests: input.guests,
    total_amount: input.quote.totalAmount,
    currency: input.quote.currency,
    price_signature: input.quote.signature,
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString()
  };

  // Production safety: fail closed if persistence is required
  if (env.NODE_ENV === 'production' && env.STRICT_PERSISTENCE_MODE) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('booking_quotes')
      .insert({
        hotel_id: input.quote.hotelId,
        room_id: input.quote.roomId,
        check_in: input.checkIn,
        check_out: input.checkOut,
        guests: input.guests,
        total_amount: input.quote.totalAmount,
        currency: input.quote.currency,
        price_signature: input.quote.signature,
        expires_at: fallbackRecord.expires_at
      })
      .select('id')
      .single();

    if (error) {
      logger.error({ error }, 'Failed to persist booking quote in production');
      return null;
    }

    return data?.id ?? null;
  }

  // Development: try Supabase first, fall back to in-memory
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('booking_quotes')
      .insert({
        hotel_id: input.quote.hotelId,
        room_id: input.quote.roomId,
        check_in: input.checkIn,
        check_out: input.checkOut,
        guests: input.guests,
        total_amount: input.quote.totalAmount,
        currency: input.quote.currency,
        price_signature: input.quote.signature,
        expires_at: fallbackRecord.expires_at
      })
      .select('id')
      .single();

    if (error) {
      if (isSchemaMissingError(error)) {
        logger.warn({ error }, 'Supabase schema missing, using fallback storage');
      } else {
        logger.error({ error }, 'Failed to persist booking quote');
      }
      // Fall through to fallback
    } else if (data?.id) {
      return data.id;
    }
  } catch (error) {
    logger.error({ error }, 'Supabase connection failed, using fallback');
  }

  // Fallback storage
  cleanupExpiredFallbackRecords();
  fallbackQuotes.set(fallbackId, fallbackRecord);
  return fallbackId;
}

type PersistBookingInput = {
  quoteId: string | null;
  liteApiBookingId: string | null;
  status: string;
  metadata: Record<string, unknown>;
};

export type BookingRecord = {
  id: string;
  liteapi_booking_id: string | null;
  status: string;
  quote_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export async function persistBooking(input: PersistBookingInput): Promise<string | null> {
  const fallbackId = randomUUID();
  const fallbackRecord: BookingRecord = {
    id: fallbackId,
    liteapi_booking_id: input.liteApiBookingId,
    status: input.status,
    quote_id: input.quoteId,
    metadata: input.metadata,
    created_at: new Date().toISOString()
  };

  // Production safety: fail closed
  if (env.NODE_ENV === 'production' && env.STRICT_PERSISTENCE_MODE) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        quote_id: input.quoteId,
        liteapi_booking_id: input.liteApiBookingId,
        status: input.status,
        metadata: input.metadata
      })
      .select('id')
      .single();

    if (error) {
      logger.error({ error }, 'Failed to persist booking in production');
      return null;
    }

    return data?.id ?? null;
  }

  // Development: try Supabase first
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        quote_id: input.quoteId,
        liteapi_booking_id: input.liteApiBookingId,
        status: input.status,
        metadata: input.metadata
      })
      .select('id')
      .single();

    if (error) {
      if (isSchemaMissingError(error)) {
        logger.warn({ error }, 'Supabase schema missing, using fallback storage');
      } else {
        logger.error({ error }, 'Failed to persist booking');
      }
    } else if (data?.id) {
      return data.id;
    }
  } catch (error) {
    logger.error({ error }, 'Supabase connection failed, using fallback');
  }

  // Fallback storage
  cleanupExpiredFallbackRecords();
  fallbackBookings.set(fallbackId, fallbackRecord);
  return fallbackId;
}

export async function getBookingById(id: string): Promise<BookingRecord | null> {
  // Check fallback first (fast path)
  const fallback = fallbackBookings.get(id);
  if (fallback) {
    return fallback;
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('bookings')
      .select('id, liteapi_booking_id, status, quote_id, metadata, created_at')
      .eq('id', id)
      .single();

    if (error) {
      if (isSchemaMissingError(error)) {
        logger.warn({ error, id }, 'Supabase schema missing during lookup');
      } else {
        logger.warn({ error, id }, 'Booking lookup failed');
      }
      return null;
    }

    return data as BookingRecord;
  } catch (error) {
    logger.error({ error, id }, 'Supabase connection failed during lookup');
    return null;
  }
}

export async function updateBookingStatusByLiteApiId(
  liteApiBookingId: string,
  status: string,
  metadata: Record<string, unknown>
): Promise<boolean> {
  // Update fallback if exists
  for (const [id, booking] of fallbackBookings) {
    if (booking.liteapi_booking_id === liteApiBookingId) {
      fallbackBookings.set(id, {
        ...booking,
        status,
        metadata: mergeMetadata(booking.metadata, metadata)
      });
      return true;
    }
  }

  try {
    const supabase = createAdminClient();
    
    // Use a single atomic query with update returning
    const { error } = await supabase
      .from('bookings')
      .update({
        status,
        metadata: supabase.rpc('jsonb_merge', { 
          existing: 'metadata',
          incoming: JSON.stringify(metadata)
        })
      })
      .eq('liteapi_booking_id', liteApiBookingId);

    if (error) {
      if (isSchemaMissingError(error)) {
        logger.warn({ error, liteApiBookingId }, 'Supabase schema missing during update');
      } else {
        logger.error({ error, liteApiBookingId }, 'Failed to update booking');
      }
      return false;
    }

    return true;
  } catch (error) {
    logger.error({ error, liteApiBookingId }, 'Supabase connection failed during update');
    return false;
  }
}

export async function updateBookingStatusByTransactionId(
  transactionId: string,
  status: string,
  metadata: Record<string, unknown>
): Promise<boolean> {
  // Update fallback if exists
  for (const [id, booking] of fallbackBookings) {
    const existingTransactionId = typeof booking.metadata?.transactionId === 'string'
      ? booking.metadata.transactionId
      : null;
    if (existingTransactionId === transactionId) {
      fallbackBookings.set(id, {
        ...booking,
        status,
        metadata: mergeMetadata(booking.metadata, metadata)
      });
      return true;
    }
  }

  try {
    const supabase = createAdminClient();
    
    // Use a more reliable query pattern
    const { data: bookings, error: lookupError } = await supabase
      .from('bookings')
      .select('id, metadata')
      .filter('metadata->>transactionId', 'eq', transactionId)
      .limit(1);

    if (lookupError || !bookings || bookings.length === 0) {
      if (lookupError && isSchemaMissingError(lookupError)) {
        logger.warn({ error: lookupError, transactionId }, 'Supabase schema missing');
      } else {
        logger.warn({ error: lookupError, transactionId }, 'Booking lookup by transactionId failed');
      }
      return false;
    }

    const booking = bookings[0];
    const mergedMetadata = mergeMetadata(
      booking.metadata as Record<string, unknown> | null | undefined,
      metadata
    );
    
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status,
        metadata: mergedMetadata
      })
      .eq('id', booking.id);

    if (updateError) {
      logger.error({ updateError, transactionId }, 'Failed to update booking');
      return false;
    }

    return true;
  } catch (error) {
    logger.error({ error, transactionId }, 'Supabase connection failed');
    return false;
  }
}
