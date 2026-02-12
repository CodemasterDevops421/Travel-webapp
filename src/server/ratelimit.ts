import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env } from '@/server/env';

const redis = env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
  ? Redis.fromEnv()
  : null;

const inMemory = new Map<string, { count: number; expiresAt: number }>();

const ratelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '1 m'),
      analytics: true
    })
  : null;

export async function assertRateLimit(key: string): Promise<void> {
  if (ratelimit) {
    const result = await ratelimit.limit(key);
    if (!result.success) {
      throw new Error('Too many requests');
    }
    return;
  }

  const now = Date.now();
  const current = inMemory.get(key);
  if (!current || current.expiresAt <= now) {
    inMemory.set(key, { count: 1, expiresAt: now + 60_000 });
    return;
  }
  current.count += 1;
  if (current.count > 30) {
    throw new Error('Too many requests');
  }
}
