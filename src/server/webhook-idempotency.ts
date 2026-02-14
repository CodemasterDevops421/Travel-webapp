import { Redis } from '@upstash/redis';
import { env } from '@/server/env';

const redis = env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
  ? Redis.fromEnv()
  : null;

const fallbackEvents = new Map<string, number>();

function key(eventId: string): string {
  return `webhook:event:${eventId}`;
}

export async function markWebhookEventProcessed(eventId: string, ttlSeconds = 7 * 24 * 60 * 60): Promise<boolean> {
  if (redis) {
    const result = await redis.set(key(eventId), '1', { nx: true, ex: ttlSeconds });
    return result === 'OK';
  }

  const now = Date.now();
  for (const [eventKey, expiresAt] of fallbackEvents) {
    if (expiresAt <= now) {
      fallbackEvents.delete(eventKey);
    }
  }

  const eventKey = key(eventId);
  if (fallbackEvents.has(eventKey)) {
    return false;
  }

  fallbackEvents.set(eventKey, now + ttlSeconds * 1000);
  return true;
}
