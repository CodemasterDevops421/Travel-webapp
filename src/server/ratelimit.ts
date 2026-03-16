import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env } from '@/server/env';
import { HttpError, RateLimitError } from '@/server/errors';

export type RateLimitClass = 'auth' | 'mutation' | 'booking';

type RateLimitPolicy = {
  limit: number;
  windowSeconds: number;
  prefix: string;
};

const RATE_LIMIT_POLICIES: Record<RateLimitClass, RateLimitPolicy> = {
  auth: {
    limit: 20,
    windowSeconds: 60,
    prefix: 'auth'
  },
  mutation: {
    limit: 30,
    windowSeconds: 60,
    prefix: 'mutation'
  },
  booking: {
    limit: 15,
    windowSeconds: 60,
    prefix: 'booking'
  }
};

const redis = env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
  ? Redis.fromEnv()
  : null;

const allowTestFallback = env.NODE_ENV === 'test';
const inMemory = allowTestFallback ? new Map<string, { count: number; expiresAt: number }>() : null;
const IN_MEMORY_MAX_KEYS = 10000;
let fallbackCallCounter = 0;

const rateLimiters = redis
  ? {
      auth: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(RATE_LIMIT_POLICIES.auth.limit, `${RATE_LIMIT_POLICIES.auth.windowSeconds} s`),
        analytics: true,
        prefix: RATE_LIMIT_POLICIES.auth.prefix
      }),
      mutation: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(RATE_LIMIT_POLICIES.mutation.limit, `${RATE_LIMIT_POLICIES.mutation.windowSeconds} s`),
        analytics: true,
        prefix: RATE_LIMIT_POLICIES.mutation.prefix
      }),
      booking: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(RATE_LIMIT_POLICIES.booking.limit, `${RATE_LIMIT_POLICIES.booking.windowSeconds} s`),
        analytics: true,
        prefix: RATE_LIMIT_POLICIES.booking.prefix
      })
    }
  : null;

function normalizeKeyPart(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

export function createRateLimitKey(routeClass: RateLimitClass, identifier: string, action?: string): string {
  const routePart = RATE_LIMIT_POLICIES[routeClass].prefix;
  const subjectPart = normalizeKeyPart(identifier || 'anonymous');
  const actionPart = action ? `:${normalizeKeyPart(action)}` : '';
  return `${routePart}:${subjectPart}${actionPart}`;
}

function pruneInMemoryStore(now: number): void {
  const store = inMemory;
  if (!store) {
    return;
  }

  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt <= now) {
      store.delete(key);
    }
  }

  while (store.size > IN_MEMORY_MAX_KEYS) {
    const oldestKey = store.keys().next().value;
    if (!oldestKey) {
      break;
    }
    store.delete(oldestKey);
  }
}

export function __unsafeInMemoryRateLimitSizeForTests(): number {
  return inMemory?.size ?? 0;
}

export function __unsafePruneInMemoryRateLimitStoreForTests(now = Date.now()): void {
  pruneInMemoryStore(now);
}

export async function assertRateLimit(key: string, routeClass: RateLimitClass = 'mutation'): Promise<void> {
  const policy = RATE_LIMIT_POLICIES[routeClass];

  if (rateLimiters) {
    const result = await rateLimiters[routeClass].limit(key);
    if (!result.success) {
      throw new RateLimitError();
    }
    return;
  }

  if (!inMemory) {
    throw new HttpError(503, 'Rate limit persistence unavailable');
  }

  const now = Date.now();
  fallbackCallCounter += 1;
  if (fallbackCallCounter % 64 === 0 || inMemory.size > IN_MEMORY_MAX_KEYS) {
    pruneInMemoryStore(now);
  }

  const current = inMemory.get(key);
  if (!current || current.expiresAt <= now) {
    inMemory.set(key, { count: 1, expiresAt: now + (policy.windowSeconds * 1000) });
    if (inMemory.size > IN_MEMORY_MAX_KEYS) {
      pruneInMemoryStore(now);
    }
    return;
  }
  current.count += 1;
  if (current.count > policy.limit) {
    throw new RateLimitError();
  }
}
