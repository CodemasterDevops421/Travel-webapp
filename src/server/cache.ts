import { unstable_cache } from 'next/cache';
import { Redis } from '@upstash/redis';
import { env } from '@/server/env';
import { DISCOVERY_SUPPLIER_TTL_SECONDS } from '@/shared/lib/cache-ttl';

const redis = env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
  ? Redis.fromEnv()
  : null;

export type CacheTTL = {
  revalidate: number;
};

export function clampDiscoveryTTL(ttlSeconds: number): number {
  return Math.min(
    DISCOVERY_SUPPLIER_TTL_SECONDS.max,
    Math.max(DISCOVERY_SUPPLIER_TTL_SECONDS.min, Math.round(ttlSeconds))
  );
}

export async function getOrSetRedisCache<T>(key: string, ttlSeconds: number, fallback: () => Promise<T>): Promise<T> {
  const normalizedTtl = clampDiscoveryTTL(ttlSeconds);
  if (!redis) return fallback();
  const cached = await redis.get<T>(key);
  if (cached) return cached;
  const value = await fallback();
  await redis.set(key, value, { ex: normalizedTtl });
  return value;
}

export function withNextCache<TArgs extends unknown[], TResult>(
  cacheKey: string[],
  ttl: CacheTTL,
  fn: (...args: TArgs) => Promise<TResult>
) {
  return unstable_cache(fn, cacheKey, ttl);
}
