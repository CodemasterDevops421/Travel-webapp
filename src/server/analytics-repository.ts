import 'server-only';
import { randomUUID } from 'node:crypto';
import { createAdminClient } from '@/server/supabase/admin';
import { logger } from '@/server/logger';

type AnalyticsEventName =
  | 'search_input_started'
  | 'autocomplete_suggestion_selected'
  | 'search_submitted'
  | 'preview_card_opened'
  | 'checkout_started'
  | 'payment_initiated'
  | 'booking_confirmation_viewed';

type FunnelEvent = {
  name: AnalyticsEventName;
  step: 'discovery' | 'search' | 'consideration' | 'checkout' | 'payment' | 'booking';
  properties: Record<string, string | number | boolean | null>;
  correlationId: string;
  ts: number;
  clientIp: string;
  userId?: string | null;
  bookingQuoteId?: string | null;
};

const fallbackEvents = new Map<string, FunnelEvent>();
let schemaUnavailable = false;

function isSchemaMissingError(error: unknown): boolean {
  const code = (error as { code?: string } | null | undefined)?.code;
  return code === 'PGRST205';
}

export async function persistFunnelEvent(event: FunnelEvent): Promise<string | null> {
  const fallbackId = randomUUID();
  const checkIn = typeof event.properties.checkIn === 'string' ? event.properties.checkIn : null;
  const checkOut = typeof event.properties.checkOut === 'string' ? event.properties.checkOut : null;
  const guests = typeof event.properties.guests === 'number'
    ? [{ adults: event.properties.guests }]
    : null;

  if (schemaUnavailable) {
    fallbackEvents.set(fallbackId, event);
    return fallbackId;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('search_logs')
    .insert({
      user_id: event.userId ?? null,
      query_text: typeof event.properties.query === 'string' ? event.properties.query : null,
      destination: typeof event.properties.destination === 'string' ? event.properties.destination : null,
      check_in: checkIn,
      check_out: checkOut,
      guests: guests,
      filters: {
        event: event.name,
        funnel_step: event.step,
        properties: event.properties
      },
      correlation_id: event.correlationId,
      result_count: typeof event.properties.resultCount === 'number' ? event.properties.resultCount : null,
      degraded: Boolean(event.properties.degraded ?? false),
      booking_quote_id: event.bookingQuoteId ?? null,
      metadata: {
        module: 'analytics-funnel',
        client_ip: event.clientIp,
        occurred_at: new Date(event.ts).toISOString()
      }
    })
    .select('id')
    .single();

  if (error) {
    if (isSchemaMissingError(error)) {
      schemaUnavailable = true;
      logger.warn({ error }, 'Supabase search_logs schema missing. Falling back to memory.');
    } else {
      logger.error({ error }, 'Failed to persist funnel event');
    }

    fallbackEvents.set(fallbackId, event);
    return fallbackId;
  }

  return data?.id ?? fallbackId;
}

export type SearchPerformanceSummary = {
  searches: number;
  averageResults: number;
  degradedRate: number;
  zeroResultRate: number;
  degraded: boolean;
  degradedReason: string | null;
};

export async function getSearchPerformanceSummary(days = 7): Promise<SearchPerformanceSummary> {
  const fallback: SearchPerformanceSummary = {
    searches: fallbackEvents.size,
    averageResults: 0,
    degradedRate: 0,
    zeroResultRate: 0,
    degraded: schemaUnavailable,
    degradedReason: schemaUnavailable ? 'search_logs_schema_unavailable' : null
  };

  if (schemaUnavailable) {
    return fallback;
  }

  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('search_logs')
    .select('result_count, degraded, created_at')
    .gte('created_at', from);

  if (error) {
    if (isSchemaMissingError(error)) {
      schemaUnavailable = true;
      logger.warn({ error }, 'Supabase search_logs schema missing while reading metrics.');
      return {
        ...fallback,
        degraded: true,
        degradedReason: 'search_logs_schema_unavailable'
      };
    }

    logger.error({ error }, 'Failed to load search performance summary');
    return {
      ...fallback,
      degraded: true,
      degradedReason: 'search_logs_query_failed'
    };
  }

  const rows = data ?? [];
  if (rows.length === 0) {
    return {
      searches: 0,
      averageResults: 0,
      degradedRate: 0,
      zeroResultRate: 0,
      degraded: false,
      degradedReason: null
    };
  }

  let totalResults = 0;
  let degradedCount = 0;
  let zeroResultCount = 0;

  for (const row of rows) {
    const count = typeof row.result_count === 'number' ? row.result_count : 0;
    totalResults += count;
    if (row.degraded === true) degradedCount += 1;
    if (count === 0) zeroResultCount += 1;
  }

  const round = (value: number) => Math.round(value * 100) / 100;

  return {
    searches: rows.length,
    averageResults: round(totalResults / rows.length),
    degradedRate: round((degradedCount / rows.length) * 100),
    zeroResultRate: round((zeroResultCount / rows.length) * 100),
    degraded: false,
    degradedReason: null
  };
}

export type LifecycleAnalyticsInput = {
  bookingId: string;
  transition: 'confirmed' | 'failed' | 'refunded';
  paymentStatus: string | null;
  totalAmount: number | null;
  currency: string | null;
};

export async function persistLifecycleAnalyticsEvent(input: LifecycleAnalyticsInput): Promise<string | null> {
  const eventId = randomUUID();
  const occurredAt = new Date().toISOString();

  if (schemaUnavailable) {
    return eventId;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('booking_events')
    .insert({
      booking_id: input.bookingId,
      event_name: `booking_${input.transition}`,
      funnel_step: 'booking',
      properties: {
        paymentStatus: input.paymentStatus,
        totalAmount: input.totalAmount,
        currency: input.currency
      },
      correlation_id: `booking-${input.bookingId}-${input.transition}`,
      client_ip: 'server',
      occurred_at: occurredAt
    })
    .select('id')
    .single();

  if (error) {
    if (isSchemaMissingError(error)) {
      schemaUnavailable = true;
      logger.warn({ error }, 'Booking analytics schema missing. Skipping persistence.');
      return eventId;
    }

    logger.error({ error, bookingId: input.bookingId, transition: input.transition }, 'Failed to persist lifecycle analytics event');
    return eventId;
  }

  return data?.id ?? eventId;
}
