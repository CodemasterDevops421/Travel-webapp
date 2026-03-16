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

export const CHECKOUT_PROGRESS_STATES = [
  'guest_details_captured',
  'payment_initiated',
  'awaiting_confirmation'
] as const;

export type CheckoutProgressState = (typeof CHECKOUT_PROGRESS_STATES)[number];

export type CheckoutProgressSession = {
  transactionId: string;
  prebookId: string;
  clientReference: string;
  quoteId: string | null;
  sessionSignature: string;
  quoteSignature: string;
  holderEmail: string;
  holder: {
    firstName: string;
    lastName: string;
    email: string;
  };
  guests: Array<{
    occupancyNumber: number;
    firstName: string;
    lastName: string;
  }>;
  quote: PriceQuote;
  state: CheckoutProgressState;
  updatedAt: string;
};

const PREBOOK_SESSION_TTL_MS = 30 * 60 * 1000;

type FallbackSessionEntry = {
  session: PrebookSession;
  expiresAt: number;
};

type FallbackCheckoutEntry = {
  session: CheckoutProgressSession;
  expiresAt: number;
};

const fallbackStore = new Map<string, FallbackSessionEntry>();
const fallbackCheckoutStore = new Map<string, FallbackCheckoutEntry>();
const fallbackCheckoutPrebookIndex = new Map<string, { transactionId: string; expiresAt: number }>();

const CHECKOUT_PROGRESS_TTL_MS = 60 * 60 * 1000;

function key(transactionId: string): string {
  return `booking:prebook:${transactionId}`;
}

function checkoutKey(transactionId: string): string {
  return `booking:checkout:${transactionId}`;
}

function checkoutPrebookIndexKey(prebookId: string): string {
  return `booking:checkout:prebook:${prebookId}`;
}

function purgeExpiredFallbackEntries(now = Date.now()): void {
  for (const [sessionKey, entry] of fallbackStore) {
    if (entry.expiresAt <= now) {
      fallbackStore.delete(sessionKey);
    }
  }

  for (const [sessionKey, entry] of fallbackCheckoutStore) {
    if (entry.expiresAt <= now) {
      fallbackCheckoutStore.delete(sessionKey);
    }
  }

  for (const [indexKey, entry] of fallbackCheckoutPrebookIndex) {
    if (entry.expiresAt <= now) {
      fallbackCheckoutPrebookIndex.delete(indexKey);
    }
  }
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
  purgeExpiredFallbackEntries(now);

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

  purgeExpiredFallbackEntries();

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

export async function saveCheckoutProgressSession(session: CheckoutProgressSession): Promise<void> {
  if (!redis && failClosed) {
    throw new HttpError(503, 'Booking session persistence unavailable');
  }

  const ttlSeconds = CHECKOUT_PROGRESS_TTL_MS / 1000;
  const transactionSessionKey = checkoutKey(session.transactionId);
  const prebookIndexKey = checkoutPrebookIndexKey(session.prebookId);

  if (redis) {
    await Promise.all([
      redis.set(transactionSessionKey, session, { ex: ttlSeconds }),
      redis.set(prebookIndexKey, session.transactionId, { ex: ttlSeconds })
    ]);
    return;
  }

  const now = Date.now();
  const expiresAt = now + CHECKOUT_PROGRESS_TTL_MS;
  purgeExpiredFallbackEntries(now);
  fallbackCheckoutStore.set(transactionSessionKey, {
    session,
    expiresAt
  });
  fallbackCheckoutPrebookIndex.set(prebookIndexKey, {
    transactionId: session.transactionId,
    expiresAt
  });
}

export async function getCheckoutProgressSessionByTransactionId(
  transactionId: string
): Promise<CheckoutProgressSession | null> {
  if (!redis && failClosed) {
    throw new HttpError(503, 'Booking session persistence unavailable');
  }

  const transactionSessionKey = checkoutKey(transactionId);
  if (redis) {
    return (await redis.get<CheckoutProgressSession>(transactionSessionKey)) ?? null;
  }

  purgeExpiredFallbackEntries();
  const entry = fallbackCheckoutStore.get(transactionSessionKey);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= Date.now()) {
    fallbackCheckoutStore.delete(transactionSessionKey);
    return null;
  }
  return entry.session;
}

export async function getCheckoutProgressSessionByPrebookId(
  prebookId: string
): Promise<CheckoutProgressSession | null> {
  if (!redis && failClosed) {
    throw new HttpError(503, 'Booking session persistence unavailable');
  }

  const prebookIndexKey = checkoutPrebookIndexKey(prebookId);
  if (redis) {
    const transactionId = await redis.get<string>(prebookIndexKey);
    if (!transactionId) {
      return null;
    }
    return getCheckoutProgressSessionByTransactionId(transactionId);
  }

  purgeExpiredFallbackEntries();
  const entry = fallbackCheckoutPrebookIndex.get(prebookIndexKey);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= Date.now()) {
    fallbackCheckoutPrebookIndex.delete(prebookIndexKey);
    return null;
  }
  return getCheckoutProgressSessionByTransactionId(entry.transactionId);
}
