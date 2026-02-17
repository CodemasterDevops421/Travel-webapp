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
};

const fallbackEvents = new Map<string, FunnelEvent>();
let schemaUnavailable = false;

function isSchemaMissingError(error: unknown): boolean {
  const code = (error as { code?: string } | null | undefined)?.code;
  return code === 'PGRST205';
}

export async function persistFunnelEvent(event: FunnelEvent): Promise<string | null> {
  const fallbackId = randomUUID();

  if (schemaUnavailable) {
    fallbackEvents.set(fallbackId, event);
    return fallbackId;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('booking_events')
    .insert({
      event_name: event.name,
      funnel_step: event.step,
      properties: event.properties,
      correlation_id: event.correlationId,
      occurred_at: new Date(event.ts).toISOString(),
      client_ip: event.clientIp
    })
    .select('id')
    .single();

  if (error) {
    if (isSchemaMissingError(error)) {
      schemaUnavailable = true;
      logger.warn({ error }, 'Supabase booking_events schema missing. Falling back to memory.');
    } else {
      logger.error({ error }, 'Failed to persist funnel event');
    }

    fallbackEvents.set(fallbackId, event);
    return fallbackId;
  }

  return data?.id ?? fallbackId;
}
