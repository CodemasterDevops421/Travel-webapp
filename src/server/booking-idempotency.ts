import { Redis } from '@upstash/redis';
import { env } from '@/server/env';
import { HttpError } from '@/server/errors';

type BookingFinalizeCacheValue = {
  booking: unknown;
  localBookingId: string | null;
  bookingViewToken: string | null;
  liteApiBookingId: string | null;
  status: string;
  clientReference: string;
  quoteSignature: string | null;
};

const isVitest = process.env.VITEST === 'true';

const redis = !isVitest && env.NODE_ENV !== 'test' && env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
  ? Redis.fromEnv()
  : null;

const failClosed = !isVitest && env.NODE_ENV === 'production' && env.STRICT_PERSISTENCE_MODE;

const fallbackCache = new Map<string, { expiresAt: number; value: BookingFinalizeCacheValue }>();
const fallbackLocks = new Map<string, number>();

function responseKey(transactionId: string): string {
  return `booking:book:idempotency:${transactionId}`;
}

function lockKey(transactionId: string): string {
  return `booking:book:lock:${transactionId}`;
}


function assertPersistenceAvailable(): void {
  if (!redis && failClosed) {
    throw new HttpError(503, 'Booking idempotency persistence unavailable');
  }
}
function cleanupFallback(): void {
  const now = Date.now();
  for (const [key, entry] of fallbackCache) {
    if (entry.expiresAt <= now) {
      fallbackCache.delete(key);
    }
  }
  for (const [key, expiresAt] of fallbackLocks) {
    if (expiresAt <= now) {
      fallbackLocks.delete(key);
    }
  }
}

export async function getFinalizedBookingResult(transactionId: string): Promise<BookingFinalizeCacheValue | null> {
  assertPersistenceAvailable();
  if (redis) {
    return (await redis.get<BookingFinalizeCacheValue>(responseKey(transactionId))) ?? null;
  }

  cleanupFallback();
  return fallbackCache.get(responseKey(transactionId))?.value ?? null;
}

export async function saveFinalizedBookingResult(
  transactionId: string,
  value: BookingFinalizeCacheValue,
  ttlSeconds = 60 * 60 * 24
): Promise<void> {
  assertPersistenceAvailable();
  if (redis) {
    await redis.set(responseKey(transactionId), value, { ex: ttlSeconds });
    return;
  }

  cleanupFallback();
  fallbackCache.set(responseKey(transactionId), {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000
  });
}

export async function acquireFinalizeBookingLock(transactionId: string, ttlSeconds = 120): Promise<boolean> {
  assertPersistenceAvailable();
  if (redis) {
    const result = await redis.set(lockKey(transactionId), '1', { nx: true, ex: ttlSeconds });
    return result === 'OK';
  }

  cleanupFallback();
  const key = lockKey(transactionId);
  if (fallbackLocks.has(key)) {
    return false;
  }
  fallbackLocks.set(key, Date.now() + ttlSeconds * 1000);
  return true;
}

export async function releaseFinalizeBookingLock(transactionId: string): Promise<void> {
  assertPersistenceAvailable();
  if (redis) {
    await redis.del(lockKey(transactionId));
    return;
  }
  fallbackLocks.delete(lockKey(transactionId));
}
