import 'server-only';
import { randomUUID } from 'node:crypto';
import { createAdminClient } from '@/server/supabase/admin';
import type { PriceQuote } from '@/server/pricing';
import { logger } from '@/server/logger';

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

const fallbackQuotes = new Map<string, FallbackQuoteRecord>();

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
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    })
    .select('id')
    .single();

  if (error) {
    logger.error({ error }, 'Failed to persist booking quote');
    fallbackQuotes.set(fallbackId, fallbackRecord);
    return fallbackId;
  }

  return data?.id ?? fallbackId;
}

type PersistBookingInput = {
  quoteId: string | null;
  liteApiBookingId: string | null;
  status: string;
  metadata: Record<string, unknown>;
};

type FallbackBookingRecord = BookingRecord;
const fallbackBookings = new Map<string, FallbackBookingRecord>();

export async function persistBooking(input: PersistBookingInput): Promise<string | null> {
  const fallbackId = randomUUID();
  const fallbackRecord: FallbackBookingRecord = {
    id: fallbackId,
    liteapi_booking_id: input.liteApiBookingId,
    status: input.status,
    quote_id: input.quoteId,
    metadata: input.metadata,
    created_at: new Date().toISOString()
  };

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
    logger.error({ error }, 'Failed to persist booking');
    fallbackBookings.set(fallbackId, fallbackRecord);
    return fallbackId;
  }

  return data?.id ?? fallbackId;
}

export type BookingRecord = {
  id: string;
  liteapi_booking_id: string | null;
  status: string;
  quote_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export async function getBookingById(id: string): Promise<BookingRecord | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bookings')
    .select('id, liteapi_booking_id, status, quote_id, metadata, created_at')
    .eq('id', id)
    .single();

  if (error) {
    logger.warn({ error, id }, 'Booking lookup by id failed');
    return fallbackBookings.get(id) ?? null;
  }

  return (data as BookingRecord) ?? fallbackBookings.get(id) ?? null;
}

export async function updateBookingStatusByLiteApiId(
  liteApiBookingId: string,
  status: string,
  metadata: Record<string, unknown>
): Promise<boolean> {
  for (const [id, booking] of fallbackBookings) {
    if (booking.liteapi_booking_id === liteApiBookingId) {
      fallbackBookings.set(id, {
        ...booking,
        status,
        metadata
      });
      return true;
    }
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('bookings')
    .update({
      status,
      metadata
    })
    .eq('liteapi_booking_id', liteApiBookingId);

  if (error) {
    logger.error({ error, liteApiBookingId }, 'Failed to update booking by liteapi booking id');
    return false;
  }

  return true;
}

export async function updateBookingStatusByTransactionId(
  transactionId: string,
  status: string,
  metadata: Record<string, unknown>
): Promise<boolean> {
  for (const [id, booking] of fallbackBookings) {
    const existingTransactionId = typeof booking.metadata?.transactionId === 'string'
      ? booking.metadata.transactionId
      : null;
    if (existingTransactionId === transactionId) {
      fallbackBookings.set(id, {
        ...booking,
        status,
        metadata
      });
      return true;
    }
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bookings')
    .select('id, metadata')
    .contains('metadata', { transactionId })
    .limit(1)
    .single();

  if (error || !data?.id) {
    logger.warn({ error, transactionId }, 'Booking lookup by transactionId failed');
    return false;
  }

  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      status,
      metadata
    })
    .eq('id', data.id);

  if (updateError) {
    logger.error({ updateError, transactionId }, 'Failed to update booking by transactionId');
    return false;
  }

  return true;
}
