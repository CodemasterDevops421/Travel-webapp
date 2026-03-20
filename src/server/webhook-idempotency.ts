import { Redis } from '@upstash/redis';
import { env } from '@/server/env';
import { createAdminClient } from '@/server/supabase/admin';

const redis = env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
  ? Redis.fromEnv()
  : null;

const fallbackEvents = new Map<string, number>();
let schemaUnavailable = false;

function eventKey(source: string, eventId: string): string {
  return `webhook:${source}:event:${eventId}`;
}

function isSchemaMissingError(error: unknown): boolean {
  const code = (error as { code?: string } | null | undefined)?.code;
  return code === 'PGRST205' || code === '42P01';
}

function cleanupFallback(): void {
  const now = Date.now();
  for (const [k, expiresAt] of fallbackEvents) {
    if (expiresAt <= now) {
      fallbackEvents.delete(k);
    }
  }
}

async function claimWebhookEventInDb(
  eventId: string,
  source: string,
  lockSeconds: number
): Promise<boolean> {
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();
  const staleBeforeIso = new Date(Date.now() - (lockSeconds * 1000)).toISOString();

  const { data, error } = await supabase
    .from('processed_webhook_events')
    .select('event_id, status, locked_at')
    .eq('source', source)
    .eq('event_id', eventId)
    .maybeSingle();

  if (error) {
    if (isSchemaMissingError(error)) {
      schemaUnavailable = true;
      return false;
    }
    throw error;
  }

  if (!data) {
    const { error: insertError } = await supabase
      .from('processed_webhook_events')
      .insert({
        source,
        event_id: eventId,
        status: 'processing',
        locked_at: nowIso
      });

    if (!insertError) {
      return true;
    }

    if (isSchemaMissingError(insertError)) {
      schemaUnavailable = true;
      return false;
    }
  }

  if (data?.status === 'processed') {
    return false;
  }

  const lockedAt = typeof data?.locked_at === 'string' ? data.locked_at : null;
  if (lockedAt && lockedAt > staleBeforeIso) {
    return false;
  }

  const update = await supabase
    .from('processed_webhook_events')
    .update({
      status: 'processing',
      locked_at: nowIso
    })
    .eq('source', source)
    .eq('event_id', eventId)
    .eq('status', 'processing')
    .lte('locked_at', staleBeforeIso)
    .select('event_id')
    .maybeSingle();

  if (update.error) {
    if (isSchemaMissingError(update.error)) {
      schemaUnavailable = true;
      return false;
    }
    throw update.error;
  }

  return Boolean(update.data?.event_id);
}

async function finalizeWebhookEventInDb(
  eventId: string,
  source: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('processed_webhook_events')
    .upsert({
      source,
      event_id: eventId,
      status: 'processed',
      locked_at: new Date().toISOString(),
      processed_at: new Date().toISOString()
    }, {
      onConflict: 'source,event_id'
    });

  if (error && isSchemaMissingError(error)) {
    schemaUnavailable = true;
  } else if (error) {
    throw error;
  }
}

/**
 * Two-phase webhook idempotency:
 *
 * Phase 1 – `claimWebhookEvent`: Acquire a short-lived processing lock (60s).
 * Phase 2 – `finalizeWebhookEvent`: Mark the event durable as processed.
 */
export async function claimWebhookEvent(
  eventId: string,
  source = 'default',
  lockSeconds = 60
): Promise<boolean> {
  if (!schemaUnavailable) {
    try {
      return await claimWebhookEventInDb(eventId, source, lockSeconds);
    } catch {
      // Fall back to Redis/in-memory if DB path degrades.
    }
  }

  if (redis) {
    const result = await redis.set(eventKey(source, eventId), 'processing', { nx: true, ex: lockSeconds });
    return result === 'OK';
  }

  cleanupFallback();
  const key = eventKey(source, eventId);
  if (fallbackEvents.has(key)) {
    return false;
  }

  fallbackEvents.set(key, Date.now() + (lockSeconds * 1000));
  return true;
}

export async function finalizeWebhookEvent(
  eventId: string,
  source = 'default',
  ttlSeconds = 7 * 24 * 60 * 60
): Promise<void> {
  if (!schemaUnavailable) {
    try {
      await finalizeWebhookEventInDb(eventId, source);
      return;
    } catch {
      // Fall back below.
    }
  }

  if (redis) {
    await redis.set(eventKey(source, eventId), 'processed', { ex: ttlSeconds });
    return;
  }

  fallbackEvents.set(eventKey(source, eventId), Date.now() + (ttlSeconds * 1000));
}

/**
 * @deprecated Use claimWebhookEvent + finalizeWebhookEvent instead.
 */
export async function markWebhookEventProcessed(
  eventId: string,
  ttlSeconds = 7 * 24 * 60 * 60,
  source = 'default'
): Promise<boolean> {
  const claimed = await claimWebhookEvent(eventId, source);
  if (!claimed) {
    return false;
  }

  await finalizeWebhookEvent(eventId, source, ttlSeconds);
  return true;
}
