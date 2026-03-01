import 'server-only';
import { randomUUID } from 'node:crypto';
import { createAdminClient } from '@/server/supabase/admin';
import { env } from '@/server/env';
import type { PriceQuote } from '@/server/pricing';
import { logger } from '@/server/logger';
import { assertValidBookingTransition, canTransitionBookingState } from '@/server/booking/lifecycle';
import { enqueueBookingLifecycleNotification } from '@/server/booking/outbox';
import { upsertCommissionTracking } from '@/server/commission-tracking-repository';

type GuestInput = {
  adults: number;
  children?: number;
};

type PersistQuoteInput = {
  quote: PriceQuote;
  checkIn: string;
  checkOut: string;
  guests: GuestInput[];
  userId?: string | null;
  correlationId?: string | null;
  searchLogId?: string | null;
};

type FallbackQuoteRecord = {
  id: string;
  user_id: string | null;
  hotel_id: string;
  room_id: string;
  check_in: string;
  check_out: string;
  guests: GuestInput[];
  total_amount: number;
  currency: string;
  price_signature: string;
  correlation_id: string | null;
  search_log_id: string | null;
  expires_at: string;
  created_at: string;
};

const fallbackQuotes = new Map<string, FallbackQuoteRecord>();
let supabaseSchemaUnavailable = false;
const failClosed = env.NODE_ENV === 'production' && env.STRICT_PERSISTENCE_MODE;

function isSchemaMissingError(error: unknown): boolean {
  const code = (error as { code?: string } | null | undefined)?.code;
  return code === 'PGRST205';
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

function assertCanonicalBookingState(state: string): void {
  if (!canTransitionBookingState(state, state)) {
    throw new Error(`Invalid booking lifecycle state: ${state}`);
  }
}

function readNestedNumber(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === 'number' ? value : null;
}

function readNestedString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

function deriveBookingCanonicalFields(
  booking: Pick<
    BookingRecord,
    'total_amount' | 'commission_amount' | 'payment_status' | 'confirmation_code'
  >,
  metadata: Record<string, unknown>
): {
  totalAmount: number | null;
  commissionAmount: number | null;
  paymentStatus: string | null;
  confirmationCode: string | null;
} {
  const itinerary = (metadata.itinerary as Record<string, unknown> | undefined) ?? {};
  const pricing = (metadata.pricing as Record<string, unknown> | undefined) ?? {};

  const totalAmount =
    readNestedNumber(metadata, 'totalAmount') ??
    readNestedNumber(itinerary, 'totalAmount') ??
    readNestedNumber(pricing, 'totalAmount') ??
    booking.total_amount;
  const commissionAmount = readNestedNumber(metadata, 'commissionAmount') ?? booking.commission_amount;
  const paymentStatus = readNestedString(metadata, 'paymentStatus') ?? booking.payment_status;
  const confirmationCode = readNestedString(metadata, 'confirmationCode') ?? booking.confirmation_code;

  return {
    totalAmount,
    commissionAmount,
    paymentStatus,
    confirmationCode
  };
}

type LifecycleNotificationStatus = 'confirmed' | 'failed' | 'refunded';

const LIFECYCLE_NOTIFICATION_STATUSES = new Set<LifecycleNotificationStatus>([
  'confirmed',
  'failed',
  'refunded'
]);

const COMMISSION_TRACKING_STATUSES = new Set([
  'payment_authorized',
  'confirmed',
  'refunded',
  'failed'
]);

type CommissionTrackingLifecycleInput = {
  bookingId: string;
  status: string;
  totalAmount: number | null;
  commissionAmount: number | null;
  currency: string | null;
  paymentLogId: string | null;
  metadata: Record<string, unknown> | null;
};

function normalizeCommissionPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return env.PRICE_MARKUP_PERCENT;
  }

  return Math.min(100, Math.max(0, value));
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function deriveCommissionPercent(metadata: Record<string, unknown> | null, totalAmount: number, commissionAmount: number): number {
  const explicitPercent = typeof metadata?.commissionPercent === 'number'
    ? metadata.commissionPercent
    : null;

  if (typeof explicitPercent === 'number' && Number.isFinite(explicitPercent)) {
    return normalizeCommissionPercent(explicitPercent);
  }

  if (totalAmount > 0 && Number.isFinite(commissionAmount) && commissionAmount > 0) {
    return normalizeCommissionPercent((commissionAmount / totalAmount) * 100);
  }

  return normalizeCommissionPercent(env.PRICE_MARKUP_PERCENT);
}

async function maybeUpsertCommissionTracking(input: CommissionTrackingLifecycleInput): Promise<boolean> {
  if (!COMMISSION_TRACKING_STATUSES.has(input.status)) {
    return true;
  }

  const grossBookingValue = typeof input.totalAmount === 'number' ? input.totalAmount : 0;
  const initialCommissionAmount = typeof input.commissionAmount === 'number' ? input.commissionAmount : 0;
  const commissionPercent = deriveCommissionPercent(input.metadata, grossBookingValue, initialCommissionAmount);
  const commissionAmount = typeof input.commissionAmount === 'number'
    ? roundCurrency(input.commissionAmount)
    : roundCurrency(grossBookingValue * (commissionPercent / 100));

  const commissionId = await upsertCommissionTracking({
    bookingId: input.bookingId,
    paymentLogId: input.paymentLogId,
    grossBookingValue: roundCurrency(grossBookingValue),
    commissionPercent,
    commissionAmount,
    currency: input.currency ?? env.DEFAULT_CURRENCY,
    metadata: {
      ...(input.metadata ?? {}),
      bookingStatus: input.status
    }
  });

  if (!commissionId && failClosed) {
    logger.error(
      {
        bookingId: input.bookingId,
        bookingStatus: input.status
      },
      'Failed to upsert commission tracking during strict persistence mode'
    );
    return false;
  }

  return true;
}

function deriveInvoiceStatus(status: string, paymentStatus: string | null): string {
  if (status === 'refunded') {
    return 'refunded';
  }

  if (status === 'confirmed') {
    return paymentStatus === 'captured' ? 'paid' : 'issued';
  }

  if (status === 'failed') {
    return 'void';
  }

  return 'pending';
}

function withLifecycleMetadata(
  metadata: Record<string, unknown>,
  status: string,
  paymentStatus: string | null
): Record<string, unknown> {
  return {
    ...metadata,
    invoiceStatus: deriveInvoiceStatus(status, paymentStatus)
  };
}

type LifecycleNotificationInput = {
  id: string;
  status: string;
  liteapi_booking_id: string | null;
  confirmation_code: string | null;
  check_in: string | null;
  check_out: string | null;
  total_amount: number | null;
  currency: string | null;
  metadata: Record<string, unknown> | null;
};

function maybeEnqueueLifecycleNotification(input: LifecycleNotificationInput): void {
  if (!LIFECYCLE_NOTIFICATION_STATUSES.has(input.status as LifecycleNotificationStatus)) {
    return;
  }

  const metadata = input.metadata ?? {};
  const holder = (metadata.holder as Record<string, unknown> | undefined) ?? {};
  const toEmail = typeof holder.email === 'string' ? holder.email : null;
  if (!toEmail) {
    return;
  }

  const eventStatus = input.status as LifecycleNotificationStatus;
  const bookingReference = input.confirmation_code ?? input.liteapi_booking_id ?? input.id;
  const invoiceStatus = typeof metadata.invoiceStatus === 'string'
    ? metadata.invoiceStatus
    : deriveInvoiceStatus(input.status, typeof metadata.paymentStatus === 'string' ? metadata.paymentStatus : null);

  enqueueBookingLifecycleNotification({
    bookingId: input.id,
    transition: eventStatus,
    toEmail,
    bookingReference,
    checkIn: input.check_in,
    checkOut: input.check_out,
    totalAmount: input.total_amount,
    currency: input.currency,
    invoiceStatus
  });
}

export async function persistQuote(input: PersistQuoteInput): Promise<string | null> {
  const fallbackId = randomUUID();
  const fallbackRecord: FallbackQuoteRecord = {
    id: fallbackId,
    user_id: input.userId ?? null,
    hotel_id: input.quote.hotelId,
    room_id: input.quote.roomId,
    check_in: input.checkIn,
    check_out: input.checkOut,
    guests: input.guests,
    total_amount: input.quote.totalAmount,
    currency: input.quote.currency,
    price_signature: input.quote.signature,
    correlation_id: input.correlationId ?? null,
    search_log_id: input.searchLogId ?? null,
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString()
  };

  if (supabaseSchemaUnavailable) {
    if (failClosed) {
      logger.error('Supabase booking quote persistence unavailable in production.');
      return null;
    }
    fallbackQuotes.set(fallbackId, fallbackRecord);
    return fallbackId;
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('booking_quotes')
    .insert({
      user_id: input.userId ?? null,
      hotel_id: input.quote.hotelId,
      room_id: input.quote.roomId,
      check_in: input.checkIn,
      check_out: input.checkOut,
      guests: input.guests,
      total_amount: input.quote.totalAmount,
      currency: input.quote.currency,
      price_signature: input.quote.signature,
      correlation_id: input.correlationId ?? null,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    })
    .select('id')
    .single();

  if (error) {
    if (isSchemaMissingError(error)) {
      supabaseSchemaUnavailable = true;
      logger.warn({ error }, 'Supabase booking schema missing. Using fallback booking quote storage.');
    } else {
      logger.error({ error }, 'Failed to persist booking quote');
    }
    if (failClosed) {
      return null;
    }
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
  userId?: string | null;
  correlationId?: string | null;
  searchLogId?: string | null;
  latestPaymentLogId?: string | null;
  stripePaymentIntentId?: string | null;
  stripeCheckoutSessionId?: string | null;
};

type FallbackBookingRecord = BookingRecord;
const fallbackBookings = new Map<string, FallbackBookingRecord>();

export async function persistBooking(input: PersistBookingInput): Promise<string | null> {
  try {
    assertCanonicalBookingState(input.status);
  } catch (error) {
    logger.warn({ error, status: input.status }, 'Rejected booking persist with invalid lifecycle status');
    return null;
  }

  const itinerary = (input.metadata.itinerary as Record<string, unknown> | undefined) ?? {};
  const stayDates = (input.metadata.stayDates as Record<string, unknown> | undefined) ?? {};
  const pricing = (input.metadata.pricing as Record<string, unknown> | undefined) ?? {};

  const hotelId = typeof itinerary.hotelId === 'string' ? itinerary.hotelId : null;
  const roomId = typeof itinerary.roomId === 'string' ? itinerary.roomId : null;
  const checkIn = typeof stayDates.checkIn === 'string' ? stayDates.checkIn : null;
  const checkOut = typeof stayDates.checkOut === 'string' ? stayDates.checkOut : null;
  const totalAmount = typeof itinerary.totalAmount === 'number'
    ? itinerary.totalAmount
    : typeof pricing.totalAmount === 'number'
      ? pricing.totalAmount
      : null;
  const paymentStatus = typeof input.metadata.paymentStatus === 'string' ? input.metadata.paymentStatus : 'pending';
  const confirmationCode = typeof input.metadata.confirmationCode === 'string' ? input.metadata.confirmationCode : null;
  const commissionAmount = typeof input.metadata.commissionAmount === 'number' ? input.metadata.commissionAmount : null;
  const searchLogIdFromMetadata = typeof input.metadata.searchLogId === 'string' ? input.metadata.searchLogId : null;
  const latestPaymentLogIdFromMetadata = typeof input.metadata.latestPaymentLogId === 'string'
    ? input.metadata.latestPaymentLogId
    : typeof input.metadata.paymentLogId === 'string'
      ? input.metadata.paymentLogId
      : null;
  const stripePaymentIntentId = typeof input.stripePaymentIntentId === 'string'
    ? input.stripePaymentIntentId
    : typeof input.metadata.stripePaymentIntentId === 'string'
      ? input.metadata.stripePaymentIntentId
      : null;
  const stripeCheckoutSessionId = typeof input.stripeCheckoutSessionId === 'string'
    ? input.stripeCheckoutSessionId
    : typeof input.metadata.stripeCheckoutSessionId === 'string'
      ? input.metadata.stripeCheckoutSessionId
      : null;
  const currency = typeof itinerary.currency === 'string'
    ? itinerary.currency
    : typeof pricing.currency === 'string'
      ? pricing.currency
      : null;
  const normalizedMetadata = withLifecycleMetadata(input.metadata, input.status, paymentStatus);

  const fallbackId = randomUUID();
  const fallbackRecord: FallbackBookingRecord = {
    id: fallbackId,
    user_id: input.userId ?? null,
    liteapi_booking_id: input.liteApiBookingId,
    status: input.status,
    quote_id: input.quoteId,
    hotel_id: hotelId,
    room_id: roomId,
    check_in: checkIn,
    check_out: checkOut,
    total_amount: totalAmount,
    currency,
    commission_amount: commissionAmount,
    payment_status: paymentStatus,
    confirmation_code: confirmationCode,
    correlation_id: input.correlationId ?? null,
    search_log_id: input.searchLogId ?? searchLogIdFromMetadata,
    latest_payment_log_id: input.latestPaymentLogId ?? latestPaymentLogIdFromMetadata,
    stripe_payment_intent_id: stripePaymentIntentId,
    stripe_checkout_session_id: stripeCheckoutSessionId,
    metadata: normalizedMetadata,
    created_at: new Date().toISOString()
  };

  if (supabaseSchemaUnavailable) {
    if (failClosed) {
      logger.error('Supabase booking persistence unavailable in production.');
      return null;
    }
    fallbackBookings.set(fallbackId, fallbackRecord);
    return fallbackId;
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      quote_id: input.quoteId,
      user_id: input.userId ?? null,
      liteapi_booking_id: input.liteApiBookingId,
      status: input.status,
      hotel_id: hotelId,
      room_id: roomId,
      check_in: checkIn,
      check_out: checkOut,
      total_amount: totalAmount,
      currency,
      payment_status: paymentStatus,
      confirmation_code: confirmationCode,
      commission_amount: commissionAmount,
      correlation_id: input.correlationId ?? null,
      search_log_id: input.searchLogId ?? searchLogIdFromMetadata,
      latest_payment_log_id: input.latestPaymentLogId ?? latestPaymentLogIdFromMetadata,
      stripe_payment_intent_id: stripePaymentIntentId,
      stripe_checkout_session_id: stripeCheckoutSessionId,
      metadata: normalizedMetadata
    })
    .select('id')
    .single();

  if (error) {
    if (isSchemaMissingError(error)) {
      supabaseSchemaUnavailable = true;
      logger.warn({ error }, 'Supabase booking schema missing. Using fallback booking storage.');
    } else {
      logger.error({ error }, 'Failed to persist booking');
    }
    if (failClosed) {
      return null;
    }
    fallbackBookings.set(fallbackId, fallbackRecord);
    maybeEnqueueLifecycleNotification(fallbackRecord);
    const commissionPersisted = await maybeUpsertCommissionTracking({
      bookingId: fallbackId,
      status: fallbackRecord.status,
      totalAmount: fallbackRecord.total_amount,
      commissionAmount: fallbackRecord.commission_amount,
      currency: fallbackRecord.currency,
      paymentLogId: fallbackRecord.latest_payment_log_id,
      metadata: fallbackRecord.metadata
    });
    if (!commissionPersisted) {
      logger.warn({ bookingId: fallbackId }, 'Commission tracking failed after booking insert (fallback) — booking persisted, commission degraded');
    }
    return fallbackId;
  }

  const persistedId = data?.id ?? fallbackId;
  maybeEnqueueLifecycleNotification({
    ...fallbackRecord,
    id: persistedId
  });
  const commissionPersisted = await maybeUpsertCommissionTracking({
    bookingId: persistedId,
    status: fallbackRecord.status,
    totalAmount: fallbackRecord.total_amount,
    commissionAmount: fallbackRecord.commission_amount,
    currency: fallbackRecord.currency,
    paymentLogId: fallbackRecord.latest_payment_log_id,
    metadata: fallbackRecord.metadata
  });
  if (!commissionPersisted) {
    logger.warn({ bookingId: persistedId }, 'Commission tracking failed after booking insert — booking persisted, commission degraded');
  }
  return persistedId;
}

export type BookingRecord = {
  id: string;
  user_id: string | null;
  liteapi_booking_id: string | null;
  status: string;
  quote_id: string | null;
  hotel_id: string | null;
  room_id: string | null;
  check_in: string | null;
  check_out: string | null;
  total_amount: number | null;
  currency: string | null;
  commission_amount: number | null;
  payment_status: string | null;
  confirmation_code: string | null;
  correlation_id: string | null;
  search_log_id: string | null;
  latest_payment_log_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export async function getBookingById(id: string): Promise<BookingRecord | null> {
  if (supabaseSchemaUnavailable) {
    if (failClosed) {
      return null;
    }
    return fallbackBookings.get(id) ?? null;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bookings')
    .select(
      'id, user_id, liteapi_booking_id, status, quote_id, hotel_id, room_id, check_in, check_out, total_amount, currency, commission_amount, payment_status, confirmation_code, correlation_id, search_log_id, latest_payment_log_id, stripe_payment_intent_id, stripe_checkout_session_id, metadata, created_at'
    )
    .eq('id', id)
    .single();

  if (error) {
    if (isSchemaMissingError(error)) {
      supabaseSchemaUnavailable = true;
      logger.warn({ error, id }, 'Supabase booking schema missing during lookup. Using fallback storage.');
    } else {
      logger.warn({ error, id }, 'Booking lookup by id failed');
    }
    if (failClosed) {
      return null;
    }
    return fallbackBookings.get(id) ?? null;
  }

  return (data as BookingRecord) ?? fallbackBookings.get(id) ?? null;
}

export async function updateBookingStatusById(
  bookingId: string,
  status: string,
  metadata: Record<string, unknown>
): Promise<boolean> {
  if (supabaseSchemaUnavailable) {
    const booking = fallbackBookings.get(bookingId);
    if (!booking) {
      return false;
    }

    try {
      assertValidBookingTransition(booking.status, status);
    } catch (error) {
      logger.warn({ error, bookingId, from: booking.status, to: status }, 'Rejected invalid booking lifecycle transition');
      return false;
    }

    const mergedMetadata = mergeMetadata(booking.metadata, metadata);
    const fields = deriveBookingCanonicalFields(booking, mergedMetadata);
    const normalizedMetadata = withLifecycleMetadata(mergedMetadata, status, fields.paymentStatus);
    const updatedBooking: FallbackBookingRecord = {
      ...booking,
      status,
      total_amount: fields.totalAmount,
      commission_amount: fields.commissionAmount,
      payment_status: fields.paymentStatus,
      confirmation_code: fields.confirmationCode,
      metadata: normalizedMetadata
    };

    fallbackBookings.set(bookingId, updatedBooking);
    maybeEnqueueLifecycleNotification(updatedBooking);
    const commissionPersisted = await maybeUpsertCommissionTracking({
      bookingId,
      status,
      totalAmount: updatedBooking.total_amount,
      commissionAmount: updatedBooking.commission_amount,
      currency: updatedBooking.currency,
      paymentLogId: updatedBooking.latest_payment_log_id,
      metadata: updatedBooking.metadata
    });
    if (!commissionPersisted) {
      logger.warn({ bookingId }, 'Commission tracking failed after booking status update (fallback) — update persisted, commission degraded');
    }
    return true;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bookings')
    .select('id, status, liteapi_booking_id, check_in, check_out, currency, metadata, total_amount, commission_amount, payment_status, confirmation_code, latest_payment_log_id, stripe_payment_intent_id, stripe_checkout_session_id')
    .eq('id', bookingId)
    .single();

  if (error || !data?.id) {
    if (isSchemaMissingError(error)) {
      supabaseSchemaUnavailable = true;
      logger.warn({ error, bookingId }, 'Supabase booking schema missing during lookup by booking id.');
    } else {
      logger.warn({ error, bookingId }, 'Booking lookup by booking id failed');
    }
    return false;
  }

  try {
    assertValidBookingTransition(data.status, status);
  } catch (transitionError) {
    logger.warn({ error: transitionError, bookingId, from: data.status, to: status }, 'Rejected invalid booking lifecycle transition');
    return false;
  }

  const mergedMetadata = mergeMetadata(data.metadata as Record<string, unknown> | null | undefined, metadata);
  const fields = deriveBookingCanonicalFields(
    {
      total_amount: data.total_amount as number | null,
      commission_amount: data.commission_amount as number | null,
      payment_status: data.payment_status as string | null,
      confirmation_code: data.confirmation_code as string | null
    },
    mergedMetadata
  );
  const normalizedMetadata = withLifecycleMetadata(mergedMetadata, status, fields.paymentStatus);

  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      status,
      total_amount: fields.totalAmount,
      commission_amount: fields.commissionAmount,
      payment_status: fields.paymentStatus,
      confirmation_code: fields.confirmationCode,
      metadata: normalizedMetadata
    })
    .eq('id', data.id);

  if (updateError) {
    logger.error({ updateError, bookingId }, 'Failed to update booking by booking id');
    return false;
  }

  maybeEnqueueLifecycleNotification({
    id: data.id as string,
    status,
    liteapi_booking_id: (data.liteapi_booking_id as string | null) ?? null,
    confirmation_code: fields.confirmationCode,
    check_in: (data.check_in as string | null) ?? null,
    check_out: (data.check_out as string | null) ?? null,
    total_amount: fields.totalAmount,
    currency: (data.currency as string | null) ?? null,
    metadata: normalizedMetadata
  });

  const freshPaymentLogId = typeof normalizedMetadata.latestPaymentLogId === 'string'
    ? normalizedMetadata.latestPaymentLogId
    : typeof normalizedMetadata.paymentLogId === 'string'
      ? normalizedMetadata.paymentLogId
      : (data.latest_payment_log_id as string | null) ?? null;
  const commissionPersisted = await maybeUpsertCommissionTracking({
    bookingId: data.id as string,
    status,
    totalAmount: fields.totalAmount,
    commissionAmount: fields.commissionAmount,
    currency: (data.currency as string | null) ?? null,
    paymentLogId: freshPaymentLogId,
    metadata: normalizedMetadata
  });
  if (!commissionPersisted) {
    logger.warn({ bookingId: data.id }, 'Commission tracking failed after booking status update — update persisted, commission degraded');
  }

  return true;
}

export async function getBookingByTransactionId(transactionId: string): Promise<BookingRecord | null> {
  for (const booking of fallbackBookings.values()) {
    const existingTransactionId = typeof booking.metadata?.transactionId === 'string'
      ? booking.metadata.transactionId
      : null;
    if (existingTransactionId === transactionId) {
      return booking;
    }
  }

  if (supabaseSchemaUnavailable) {
    return null;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bookings')
    .select(
      'id, user_id, liteapi_booking_id, status, quote_id, hotel_id, room_id, check_in, check_out, total_amount, currency, commission_amount, payment_status, confirmation_code, correlation_id, search_log_id, latest_payment_log_id, stripe_payment_intent_id, stripe_checkout_session_id, metadata, created_at'
    )
    .contains('metadata', { transactionId })
    .limit(1)
    .single();

  if (error) {
    if (isSchemaMissingError(error)) {
      supabaseSchemaUnavailable = true;
      logger.warn({ error, transactionId }, 'Supabase booking schema missing during lookup by transaction id.');
    } else {
      logger.warn({ error, transactionId }, 'Booking lookup by transaction id failed');
    }
    return null;
  }

  return (data as BookingRecord) ?? null;
}

export async function updateBookingStatusByLiteApiId(
  liteApiBookingId: string,
  status: string,
  metadata: Record<string, unknown>
): Promise<boolean> {
  for (const [id, booking] of fallbackBookings) {
    if (booking.liteapi_booking_id === liteApiBookingId) {
      try {
        assertValidBookingTransition(booking.status, status);
      } catch (error) {
        logger.warn({ error, liteApiBookingId, from: booking.status, to: status }, 'Rejected invalid booking lifecycle transition');
        return false;
      }

      const mergedMetadata = mergeMetadata(booking.metadata, metadata);
      const stripePaymentIntentId = typeof mergedMetadata.stripePaymentIntentId === 'string'
        ? mergedMetadata.stripePaymentIntentId
        : booking.stripe_payment_intent_id;
      const stripeCheckoutSessionId = typeof mergedMetadata.stripeCheckoutSessionId === 'string'
        ? mergedMetadata.stripeCheckoutSessionId
        : booking.stripe_checkout_session_id;
      const fields = deriveBookingCanonicalFields(booking, mergedMetadata);
      const normalizedMetadata = withLifecycleMetadata(mergedMetadata, status, fields.paymentStatus);
      const updatedBooking: FallbackBookingRecord = {
        ...booking,
        status,
        total_amount: fields.totalAmount,
        commission_amount: fields.commissionAmount,
        payment_status: fields.paymentStatus,
        confirmation_code: fields.confirmationCode,
        stripe_payment_intent_id: stripePaymentIntentId,
        stripe_checkout_session_id: stripeCheckoutSessionId,
        metadata: normalizedMetadata
      };
      fallbackBookings.set(id, {
        ...updatedBooking
      });
      maybeEnqueueLifecycleNotification(updatedBooking);
      const commissionPersisted = await maybeUpsertCommissionTracking({
        bookingId: id,
        status,
        totalAmount: updatedBooking.total_amount,
        commissionAmount: updatedBooking.commission_amount,
        currency: updatedBooking.currency,
        paymentLogId: updatedBooking.latest_payment_log_id,
        metadata: updatedBooking.metadata
      });
      if (!commissionPersisted) {
        logger.warn({ bookingId: id }, 'Commission tracking failed after booking status update by liteapi id (fallback) — update persisted, commission degraded');
      }
      return true;
    }
  }

  if (supabaseSchemaUnavailable) {
    return false;
  }

  const supabase = createAdminClient();
  const { data, error: lookupError } = await supabase
    .from('bookings')
    .select('id, status, liteapi_booking_id, check_in, check_out, currency, metadata, total_amount, commission_amount, payment_status, confirmation_code, latest_payment_log_id, stripe_payment_intent_id, stripe_checkout_session_id')
    .eq('liteapi_booking_id', liteApiBookingId)
    .limit(1)
    .single();

  if (lookupError || !data?.id) {
    if (isSchemaMissingError(lookupError)) {
      supabaseSchemaUnavailable = true;
      logger.warn({ error: lookupError, liteApiBookingId }, 'Supabase booking schema missing during lookup by liteapi id.');
    } else {
      logger.warn({ error: lookupError, liteApiBookingId }, 'Booking lookup by liteapi booking id failed');
    }
    return false;
  }

  try {
    assertValidBookingTransition(data.status, status);
  } catch (error) {
    logger.warn({ error, liteApiBookingId, from: data.status, to: status }, 'Rejected invalid booking lifecycle transition');
    return false;
  }

  const mergedMetadata = mergeMetadata(
    data.metadata as Record<string, unknown> | null | undefined,
    metadata
  );
  const stripePaymentIntentId = typeof mergedMetadata.stripePaymentIntentId === 'string'
    ? mergedMetadata.stripePaymentIntentId
    : (data.stripe_payment_intent_id as string | null);
  const stripeCheckoutSessionId = typeof mergedMetadata.stripeCheckoutSessionId === 'string'
    ? mergedMetadata.stripeCheckoutSessionId
    : (data.stripe_checkout_session_id as string | null);
  const fields = deriveBookingCanonicalFields(
    {
      total_amount: data.total_amount as number | null,
      commission_amount: data.commission_amount as number | null,
      payment_status: data.payment_status as string | null,
      confirmation_code: data.confirmation_code as string | null
    },
    mergedMetadata
  );
  const normalizedMetadata = withLifecycleMetadata(mergedMetadata, status, fields.paymentStatus);
  const { error } = await supabase
    .from('bookings')
    .update({
      status,
      total_amount: fields.totalAmount,
      commission_amount: fields.commissionAmount,
      payment_status: fields.paymentStatus,
      confirmation_code: fields.confirmationCode,
      stripe_payment_intent_id: stripePaymentIntentId,
      stripe_checkout_session_id: stripeCheckoutSessionId,
      metadata: normalizedMetadata
    })
    .eq('id', data.id);

  if (error) {
    if (isSchemaMissingError(error)) {
      supabaseSchemaUnavailable = true;
      logger.warn({ error, liteApiBookingId }, 'Supabase booking schema missing during update by liteapi id.');
    } else {
      logger.error({ error, liteApiBookingId }, 'Failed to update booking by liteapi booking id');
    }
    return false;
  }

  maybeEnqueueLifecycleNotification({
    id: data.id as string,
    status,
    liteapi_booking_id: (data.liteapi_booking_id as string | null) ?? null,
    confirmation_code: fields.confirmationCode,
    check_in: (data.check_in as string | null) ?? null,
    check_out: (data.check_out as string | null) ?? null,
    total_amount: fields.totalAmount,
    currency: (data.currency as string | null) ?? null,
    metadata: normalizedMetadata
  });

  const freshPaymentLogId2 = typeof normalizedMetadata.latestPaymentLogId === 'string'
    ? normalizedMetadata.latestPaymentLogId
    : typeof normalizedMetadata.paymentLogId === 'string'
      ? normalizedMetadata.paymentLogId
      : (data.latest_payment_log_id as string | null) ?? null;
  const commissionPersisted = await maybeUpsertCommissionTracking({
    bookingId: data.id as string,
    status,
    totalAmount: fields.totalAmount,
    commissionAmount: fields.commissionAmount,
    currency: (data.currency as string | null) ?? null,
    paymentLogId: freshPaymentLogId2,
    metadata: normalizedMetadata
  });
  if (!commissionPersisted) {
    logger.warn({ bookingId: data.id }, 'Commission tracking failed after booking status update by liteapi id — update persisted, commission degraded');
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
      try {
        assertValidBookingTransition(booking.status, status);
      } catch (error) {
        logger.warn({ error, transactionId, from: booking.status, to: status }, 'Rejected invalid booking lifecycle transition');
        return false;
      }

      const mergedMetadata = mergeMetadata(booking.metadata, metadata);
      const stripePaymentIntentId = typeof mergedMetadata.stripePaymentIntentId === 'string'
        ? mergedMetadata.stripePaymentIntentId
        : booking.stripe_payment_intent_id;
      const stripeCheckoutSessionId = typeof mergedMetadata.stripeCheckoutSessionId === 'string'
        ? mergedMetadata.stripeCheckoutSessionId
        : booking.stripe_checkout_session_id;
      const fields = deriveBookingCanonicalFields(booking, mergedMetadata);
      const normalizedMetadata = withLifecycleMetadata(mergedMetadata, status, fields.paymentStatus);
      const updatedBooking: FallbackBookingRecord = {
        ...booking,
        status,
        total_amount: fields.totalAmount,
        commission_amount: fields.commissionAmount,
        payment_status: fields.paymentStatus,
        confirmation_code: fields.confirmationCode,
        stripe_payment_intent_id: stripePaymentIntentId,
        stripe_checkout_session_id: stripeCheckoutSessionId,
        metadata: normalizedMetadata
      };
      fallbackBookings.set(id, {
        ...updatedBooking
      });
      maybeEnqueueLifecycleNotification(updatedBooking);
      const commissionPersisted = await maybeUpsertCommissionTracking({
        bookingId: id,
        status,
        totalAmount: updatedBooking.total_amount,
        commissionAmount: updatedBooking.commission_amount,
        currency: updatedBooking.currency,
        paymentLogId: updatedBooking.latest_payment_log_id,
        metadata: updatedBooking.metadata
      });
      if (!commissionPersisted) {
        logger.warn({ bookingId: id }, 'Commission tracking failed after booking status update by txn id (fallback) — update persisted, commission degraded');
      }
      return true;
    }
  }

  if (supabaseSchemaUnavailable) {
    return false;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bookings')
    .select('id, status, liteapi_booking_id, check_in, check_out, currency, metadata, total_amount, commission_amount, payment_status, confirmation_code, latest_payment_log_id, stripe_payment_intent_id, stripe_checkout_session_id')
    .contains('metadata', { transactionId })
    .limit(1)
    .single();

  if (error || !data?.id) {
    if (isSchemaMissingError(error)) {
      supabaseSchemaUnavailable = true;
      logger.warn({ error, transactionId }, 'Supabase booking schema missing during lookup by transactionId.');
    } else {
      logger.warn({ error, transactionId }, 'Booking lookup by transactionId failed');
    }
    return false;
  }

  try {
    assertValidBookingTransition(data.status, status);
  } catch (transitionError) {
    logger.warn({ error: transitionError, transactionId, from: data.status, to: status }, 'Rejected invalid booking lifecycle transition');
    return false;
  }

  const mergedMetadata = mergeMetadata(
    data.metadata as Record<string, unknown> | null | undefined,
    metadata
  );
  const stripePaymentIntentId = typeof mergedMetadata.stripePaymentIntentId === 'string'
    ? mergedMetadata.stripePaymentIntentId
    : (data.stripe_payment_intent_id as string | null);
  const stripeCheckoutSessionId = typeof mergedMetadata.stripeCheckoutSessionId === 'string'
    ? mergedMetadata.stripeCheckoutSessionId
    : (data.stripe_checkout_session_id as string | null);
  const fields = deriveBookingCanonicalFields(
    {
      total_amount: data.total_amount as number | null,
      commission_amount: data.commission_amount as number | null,
      payment_status: data.payment_status as string | null,
      confirmation_code: data.confirmation_code as string | null
    },
    mergedMetadata
  );
  const normalizedMetadata = withLifecycleMetadata(mergedMetadata, status, fields.paymentStatus);
  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      status,
      total_amount: fields.totalAmount,
      commission_amount: fields.commissionAmount,
      payment_status: fields.paymentStatus,
      confirmation_code: fields.confirmationCode,
      stripe_payment_intent_id: stripePaymentIntentId,
      stripe_checkout_session_id: stripeCheckoutSessionId,
      metadata: normalizedMetadata
    })
    .eq('id', data.id);

  if (updateError) {
    logger.error({ updateError, transactionId }, 'Failed to update booking by transactionId');
    return false;
  }

  maybeEnqueueLifecycleNotification({
    id: data.id as string,
    status,
    liteapi_booking_id: (data.liteapi_booking_id as string | null) ?? null,
    confirmation_code: fields.confirmationCode,
    check_in: (data.check_in as string | null) ?? null,
    check_out: (data.check_out as string | null) ?? null,
    total_amount: fields.totalAmount,
    currency: (data.currency as string | null) ?? null,
    metadata: normalizedMetadata
  });

  const freshPaymentLogId3 = typeof normalizedMetadata.latestPaymentLogId === 'string'
    ? normalizedMetadata.latestPaymentLogId
    : typeof normalizedMetadata.paymentLogId === 'string'
      ? normalizedMetadata.paymentLogId
      : (data.latest_payment_log_id as string | null) ?? null;
  const commissionPersisted = await maybeUpsertCommissionTracking({
    bookingId: data.id as string,
    status,
    totalAmount: fields.totalAmount,
    commissionAmount: fields.commissionAmount,
    currency: (data.currency as string | null) ?? null,
    paymentLogId: freshPaymentLogId3,
    metadata: normalizedMetadata
  });
  if (!commissionPersisted) {
    logger.warn({ bookingId: data.id }, 'Commission tracking failed after booking status update by txn id — update persisted, commission degraded');
  }

  return true;
}
