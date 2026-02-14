import { Redis } from '@upstash/redis';
import { env } from '@/server/env';
import { HttpError } from '@/server/errors';
import type { PriceQuote } from '@/server/pricing';

const redis = env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
  ? Redis.fromEnv()
  : null;
const failClosed = env.NODE_ENV === 'production' && env.STRICT_PERSISTENCE_MODE;

type PrebookSession = {
  prebookId: string;
  transactionId: string;
  clientReference: string;
  quoteId: string | null;
  quote: PriceQuote;
  createdAt: string;
};

const PREBOOK_SESSION_TTL_MS = 30 * 60 * 1000;

type FallbackSessionEntry = {
  session: PrebookSession;
  expiresAt: number;
};

const fallbackStore = new Map<string, FallbackSessionEntry>();

function key(transactionId: string): string {
  return `booking:prebook:${transactionId}`;
}

export async function savePrebookSession(session: PrebookSession): Promise<void> {
  if (!redis && failClosed) {
    throw new HttpError(503, 'Booking session persistence unavailable');
  }

  if (redis) {
    await redis.set(key(session.transactionId), session, { ex: 60 * 30 });
    return;
  }

  const now = Date.now();
  for (const [sessionKey, entry] of fallbackStore) {
    if (entry.expiresAt <= now) {
      fallbackStore.delete(sessionKey);
    }
  }

  fallbackStore.set(key(session.transactionId), {
    session,
    expiresAt: now + PREBOOK_SESSION_TTL_MS
  });
}

export async function getPrebookSession(transactionId: string): Promise<PrebookSession | null> {
  if (!redis && failClosed) {
    throw new HttpError(503, 'Booking session persistence unavailable');
  }

  if (redis) {
    return (await redis.get<PrebookSession>(key(transactionId))) ?? null;
  }

  const sessionKey = key(transactionId);
  const entry = fallbackStore.get(sessionKey);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    fallbackStore.delete(sessionKey);
    return null;
  }

  return entry.session;
}
