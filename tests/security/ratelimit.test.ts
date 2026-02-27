import { describe, expect, it, vi } from 'vitest';

async function loadRateLimitModule() {
  vi.resetModules();
  vi.doMock('@/server/env', async () => {
    const actual = await vi.importActual<typeof import('@/server/env')>('@/server/env');
    return {
      ...actual,
      env: {
        ...actual.env,
        UPSTASH_REDIS_REST_URL: undefined,
        UPSTASH_REDIS_REST_TOKEN: undefined
      }
    };
  });

  return import('@/server/ratelimit');
}

describe('rate-limit policies', () => {
  it('builds normalized keys by route class', async () => {
    const { createRateLimitKey } = await loadRateLimitModule();

    expect(createRateLimitKey('mutation', ' 1.2.3.4 ', 'Wishlist POST')).toBe('mutation:1.2.3.4:wishlist-post');
    expect(createRateLimitKey('booking', '', 'Finalize')).toBe('booking:anonymous:finalize');
  });

  it('enforces stricter booking limits than generic mutation limits', async () => {
    const { assertRateLimit } = await loadRateLimitModule();
    const bookingKey = `booking:test:${Date.now()}`;
    const mutationKey = `mutation:test:${Date.now()}`;

    for (let index = 0; index < 15; index += 1) {
      await expect(assertRateLimit(bookingKey, 'booking')).resolves.toBeUndefined();
    }
    await expect(assertRateLimit(bookingKey, 'booking')).rejects.toThrow();

    for (let index = 0; index < 30; index += 1) {
      await expect(assertRateLimit(mutationKey, 'mutation')).resolves.toBeUndefined();
    }
    await expect(assertRateLimit(mutationKey, 'mutation')).rejects.toThrow();
  });

  it('prunes expired in-memory fallback keys', async () => {
    const {
      assertRateLimit,
      __unsafeInMemoryRateLimitSizeForTests,
      __unsafePruneInMemoryRateLimitStoreForTests
    } = await loadRateLimitModule();
    const baseNow = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(baseNow);

    await assertRateLimit(`mutation:expired:${baseNow}`, 'mutation');
    await assertRateLimit(`mutation:active:${baseNow}`, 'mutation');
    expect(__unsafeInMemoryRateLimitSizeForTests()).toBeGreaterThanOrEqual(2);

    vi.setSystemTime(baseNow + 61_000);
    __unsafePruneInMemoryRateLimitStoreForTests();

    expect(__unsafeInMemoryRateLimitSizeForTests()).toBe(0);
    vi.useRealTimers();
  });

  it('caps in-memory fallback map size under key churn', async () => {
    const { assertRateLimit, __unsafeInMemoryRateLimitSizeForTests } = await loadRateLimitModule();
    const keyPrefix = `mutation:churn:${Date.now()}`;

    for (let index = 0; index < 10_500; index += 1) {
      await assertRateLimit(`${keyPrefix}:${index}`, 'mutation');
    }

    expect(__unsafeInMemoryRateLimitSizeForTests()).toBeLessThanOrEqual(10_000);
  });
});
