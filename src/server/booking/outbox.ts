import 'server-only';
import { Redis } from '@upstash/redis';
import { env } from '@/server/env';
import { logger } from '@/server/logger';
import { sendLifecycleEmail, type LifecycleEmailPayload } from '@/server/notifications/email';
import { persistLifecycleAnalyticsEvent } from '@/server/analytics-repository';

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

async function claimDispatchSlot(key: string, ttlSeconds = 60): Promise<boolean> {
  if (redis) {
    const result = await redis.set(key, 'processing', { nx: true, ex: ttlSeconds });
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

async function finalizeDispatchSlot(key: string, ttlSeconds = 60 * 60 * 24 * 30): Promise<void> {
  if (redis) {
    await redis.set(key, 'processed', { ex: ttlSeconds }); // Overwrites 'processing' with new TTL
    return;
  }

  fallbackDedupe.set(key, Date.now() + ttlSeconds * 1000);
}

async function dispatchLifecycleEvent(event: BookingLifecycleOutboxEvent): Promise<void> {
  const key = dedupeKey(event);

  // Phase 1: 60s processing lock. Concurrent duplicates skip immediately.
  const claimed = await claimDispatchSlot(key, 60);
  if (!claimed) {
    logger.info({ bookingId: event.bookingId, transition: event.transition }, 'Duplicate lifecycle outbox event ignored');
    return;
  }

  // Send email and persist analytics concurrently
  const [emailResult, analyticsResult] = await Promise.allSettled([
    sendLifecycleEmail(event),
    persistLifecycleAnalyticsEvent({
      bookingId: event.bookingId,
      transition: event.transition,
      paymentStatus: null,
      totalAmount: event.totalAmount,
      currency: event.currency
    })
  ]);

  if (emailResult.status === 'rejected') {
    // Email failed — do NOT claim the dedup slot so retries can re-attempt
    // The 60s processing lock will expire, allowing future retries to succeed.
    throw emailResult.reason;
  }

  // Phase 2: Email succeeded — now finalize the dedup slot (30 days) to prevent future re-sends
  await finalizeDispatchSlot(key);

  if (analyticsResult.status === 'rejected') {
    logger.warn(
      { bookingId: event.bookingId, transition: event.transition, error: analyticsResult.reason },
      'Lifecycle analytics dispatch failed'
    );
  }
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
