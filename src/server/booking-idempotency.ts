import { Redis } from '@upstash/redis';
import { env } from '@/server/env';
import { HttpError } from '@/server/errors';
import { createAdminClient } from '@/server/supabase/admin';

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
let schemaUnavailable = false;

function responseKey(transactionId: string): string {
  return `booking:book:idempotency:${transactionId}`;
}

function lockKey(transactionId: string): string {
  return `booking:book:lock:${transactionId}`;
}

function isSchemaMissingError(error: unknown): boolean {
  const code = (error as { code?: string } | null | undefined)?.code;
  return code === 'PGRST205' || code === '42P01';
}

function assertPersistenceAvailable(): void {
  if (!redis && failClosed && schemaUnavailable) {
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

async function getDbRow(transactionId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('booking_finalize_idempotency')
    .select('transaction_id, response_json, locked_at')
    .eq('transaction_id', transactionId)
    .maybeSingle();

  if (error) {
    if (isSchemaMissingError(error)) {
      schemaUnavailable = true;
      return null;
    }
    throw error;
  }

  return data;
}

export async function getFinalizedBookingResult(transactionId: string): Promise<BookingFinalizeCacheValue | null> {
  if (!schemaUnavailable) {
    try {
      const row = await getDbRow(transactionId);
      const response = row?.response_json;
      return response && typeof response === 'object' ? response as BookingFinalizeCacheValue : null;
    } catch {
      // Fall back below.
    }
  }

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
  if (!schemaUnavailable) {
    try {
      const supabase = createAdminClient();
      const { error } = await supabase
        .from('booking_finalize_idempotency')
        .upsert({
          transaction_id: transactionId,
          response_json: value,
          locked_at: null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'transaction_id'
        });

      if (!error) {
        return;
      }

      if (isSchemaMissingError(error)) {
        schemaUnavailable = true;
      } else {
        throw error;
      }
    } catch {
      // Fall back below.
    }
  }

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
  if (!schemaUnavailable) {
    try {
      const row = await getDbRow(transactionId);
      if (row?.response_json) {
        return false;
      }

      const supabase = createAdminClient();
      const nowIso = new Date().toISOString();
      const staleBeforeIso = new Date(Date.now() - (ttlSeconds * 1000)).toISOString();

      if (!row) {
        const { error } = await supabase
          .from('booking_finalize_idempotency')
          .insert({
            transaction_id: transactionId,
            locked_at: nowIso,
            updated_at: nowIso
          });
        if (!error) {
          return true;
        }
        if (isSchemaMissingError(error)) {
          schemaUnavailable = true;
        }
      }

      if (typeof row?.locked_at === 'string' && row.locked_at > staleBeforeIso) {
        return false;
      }

      const { data, error } = await supabase
        .from('booking_finalize_idempotency')
        .update({
          locked_at: nowIso,
          updated_at: nowIso
        })
        .eq('transaction_id', transactionId)
        .or(`locked_at.is.null,locked_at.lte.${staleBeforeIso}`)
        .is('response_json', null)
        .select('transaction_id')
        .maybeSingle();

      if (error) {
        if (isSchemaMissingError(error)) {
          schemaUnavailable = true;
        } else {
          throw error;
        }
      } else if (data?.transaction_id) {
        return true;
      }
    } catch {
      // Fall back below.
    }
  }

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
  if (!schemaUnavailable) {
    try {
      const supabase = createAdminClient();
      const { error } = await supabase
        .from('booking_finalize_idempotency')
        .update({
          locked_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('transaction_id', transactionId)
        .is('response_json', null);

      if (!error) {
        return;
      }

      if (isSchemaMissingError(error)) {
        schemaUnavailable = true;
      } else {
        throw error;
      }
    } catch {
      // Fall back below.
    }
  }

  assertPersistenceAvailable();
  if (redis) {
    await redis.del(lockKey(transactionId));
    return;
  }
  fallbackLocks.delete(lockKey(transactionId));
}
