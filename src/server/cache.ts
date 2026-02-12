import { unstable_cache } from 'next/cache';
import { Redis } from '@upstash/redis';
import { env } from '@/server/env';

const redis = env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
  ? Redis.fromEnv()
  : null;

export type CacheTTL = {
  revalidate: number;
};

export async function getOrSetRedisCache<T>(key: string, ttlSeconds: number, fallback: () => Promise<T>): Promise<T> {
  if (!redis) return fallback();
  const cached = await redis.get<T>(key);
  if (cached) return cached;
  const value = await fallback();
  await redis.set(key, value, { ex: ttlSeconds });
  return value;
}

export function withNextCache<TArgs extends unknown[], TResult>(
  cacheKey: string[],
  ttl: CacheTTL,
  fn: (...args: TArgs) => Promise<TResult>
) {
  return unstable_cache(fn, cacheKey, ttl);
}
