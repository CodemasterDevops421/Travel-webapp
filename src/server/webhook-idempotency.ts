import { Redis } from '@upstash/redis';
import { env } from '@/server/env';

const redis = env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
  ? Redis.fromEnv()
  : null;

const fallbackEvents = new Map<string, number>();

function eventKey(source: string, eventId: string): string {
  return `webhook:${source}:event:${eventId}`;
}

/**
 * Two-phase webhook idempotency:
 *
 * Phase 1 – `claimWebhookEvent`: Acquire a short-lived processing lock (60s).
 *   Returns true if the event has not been seen. Concurrent retries within
 *   the lock window are rejected, but the lock auto-expires so a failed
 *   handler will allow the next Stripe retry to re-attempt.
 *
 * Phase 2 – `finalizeWebhookEvent`: Extend the key to the full TTL (7 days)
 *   after the booking state is successfully persisted. This prevents future
 *   retries from re-processing a completed event.
 */
export async function claimWebhookEvent(
  eventId: string,
  source = 'default',
  lockSeconds = 60
): Promise<boolean> {
  const key = eventKey(source, eventId);
  if (redis) {
    const result = await redis.set(key, 'processing', { nx: true, ex: lockSeconds });
    return result === 'OK';
  }

  const now = Date.now();
  for (const [k, expiresAt] of fallbackEvents) {
    if (expiresAt <= now) fallbackEvents.delete(k);
  }
  if (fallbackEvents.has(key)) return false;

  fallbackEvents.set(key, now + lockSeconds * 1000);
  return true;
}

export async function finalizeWebhookEvent(
  eventId: string,
  source = 'default',
  ttlSeconds = 7 * 24 * 60 * 60
): Promise<void> {
  const key = eventKey(source, eventId);
  if (redis) {
    await redis.set(key, 'processed', { ex: ttlSeconds });
    return;
  }

  fallbackEvents.set(key, Date.now() + ttlSeconds * 1000);
}

/**
 * @deprecated Use claimWebhookEvent + finalizeWebhookEvent instead.
 * Kept for backward compatibility.
 */
export async function markWebhookEventProcessed(
  eventId: string,
  ttlSeconds = 7 * 24 * 60 * 60,
  source = 'default'
): Promise<boolean> {
  const key = eventKey(source, eventId);
  if (redis) {
    const result = await redis.set(key, '1', { nx: true, ex: ttlSeconds });
    return result === 'OK';
  }

  const now = Date.now();
  for (const [k, expiresAt] of fallbackEvents) {
    if (expiresAt <= now) fallbackEvents.delete(k);
  }

  if (fallbackEvents.has(key)) return false;

  fallbackEvents.set(key, now + ttlSeconds * 1000);
  return true;
}
