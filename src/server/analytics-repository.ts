import 'server-only';
import { randomUUID } from 'node:crypto';
import { createAdminClient } from '@/server/supabase/admin';
import { logger } from '@/server/logger';

type FunnelEvent = {
  name: 'search_input_started' | 'autocomplete_suggestion_selected' | 'search_submitted' | 'preview_card_opened';
  step: 'discovery' | 'search' | 'consideration';
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
