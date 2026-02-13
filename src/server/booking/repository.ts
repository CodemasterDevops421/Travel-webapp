import 'server-only';
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

export async function persistQuote(input: PersistQuoteInput): Promise<string | null> {
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
    return null;
  }

  return data?.id ?? null;
}

type PersistBookingInput = {
  quoteId: string | null;
  liteApiBookingId: string | null;
  status: string;
  metadata: Record<string, unknown>;
};

export async function persistBooking(input: PersistBookingInput): Promise<string | null> {
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
    return null;
  }

  return data?.id ?? null;
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
    return null;
  }

  return data as BookingRecord;
}

export async function updateBookingStatusByLiteApiId(
  liteApiBookingId: string,
  status: string,
  metadata: Record<string, unknown>
): Promise<boolean> {
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
