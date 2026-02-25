import 'server-only';
import { Redis } from '@upstash/redis';
import { env } from '@/server/env';
import { logger } from '@/server/logger';
import { sendLifecycleEmail, type LifecycleEmailPayload } from '@/server/notifications/email';

type LifecycleOutboxTransition = 'confirmed' | 'failed' | 'refunded';

export type BookingLifecycleOutboxEvent = LifecycleEmailPayload & {
  bookingId: string;
  transition: LifecycleOutboxTransition;
};

const redis = env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
  ? Redis.fromEnv()
  : null;

const fallbackDedupe = new Map<string, number>();
const inFlight = new Set<Promise<void>>();

function dedupeKey(event: BookingLifecycleOutboxEvent): string {
  return `booking:lifecycle:${event.bookingId}:${event.transition}`;
}

async function claimDispatchSlot(key: string, ttlSeconds = 60 * 60 * 24 * 30): Promise<boolean> {
  if (redis) {
    const result = await redis.set(key, '1', { nx: true, ex: ttlSeconds });
    return result === 'OK';
  }

  const now = Date.now();
  for (const [entry, expiresAt] of fallbackDedupe) {
    if (expiresAt <= now) {
      fallbackDedupe.delete(entry);
    }
  }

  if (fallbackDedupe.has(key)) {
    return false;
  }

  fallbackDedupe.set(key, now + ttlSeconds * 1000);
  return true;
}

async function dispatchLifecycleEvent(event: BookingLifecycleOutboxEvent): Promise<void> {
  const key = dedupeKey(event);
  const firstSeen = await claimDispatchSlot(key);
  if (!firstSeen) {
    logger.info({ bookingId: event.bookingId, transition: event.transition }, 'Duplicate lifecycle outbox event ignored');
    return;
  }

  await sendLifecycleEmail(event);
}

export function enqueueBookingLifecycleNotification(event: BookingLifecycleOutboxEvent): void {
  const task = dispatchLifecycleEvent(event)
    .catch((error) => {
      logger.error({ error, bookingId: event.bookingId, transition: event.transition }, 'Lifecycle outbox dispatch failed');
    })
    .finally(() => {
      inFlight.delete(task);
    });

  inFlight.add(task);
}

export async function waitForBookingOutboxDrain(): Promise<void> {
  if (inFlight.size === 0) {
    return;
  }

  await Promise.all(Array.from(inFlight));
}

export function resetBookingOutboxForTests(): void {
  fallbackDedupe.clear();
  inFlight.clear();
}
