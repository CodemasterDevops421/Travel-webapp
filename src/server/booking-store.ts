import { Redis } from '@upstash/redis';
import { env } from '@/server/env';
import type { PriceQuote } from '@/server/pricing';

const redis = env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
  ? Redis.fromEnv()
  : null;

type PrebookSession = {
  prebookId: string;
  transactionId: string;
  clientReference: string;
  quoteId: string | null;
  quote: PriceQuote;
  createdAt: string;
};

const fallbackStore = new Map<string, PrebookSession>();

function key(transactionId: string): string {
  return `booking:prebook:${transactionId}`;
}

export async function savePrebookSession(session: PrebookSession): Promise<void> {
  if (redis) {
    await redis.set(key(session.transactionId), session, { ex: 60 * 30 });
    return;
  }

  fallbackStore.set(key(session.transactionId), session);
}

export async function getPrebookSession(transactionId: string): Promise<PrebookSession | null> {
  if (redis) {
    return (await redis.get<PrebookSession>(key(transactionId))) ?? null;
  }

  return fallbackStore.get(key(transactionId)) ?? null;
}
