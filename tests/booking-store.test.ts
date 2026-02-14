import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('booking prebook session fallback store', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.stubEnv('NODE_ENV', 'test');
  });

  it('expires in-memory sessions after TTL when Redis is unavailable', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    process.env.LITEAPI_API_KEY = 'test';
    process.env.QUOTE_SIGNING_SECRET = '1234567890abcdef1234567890abcdef12';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
    process.env.UPSTASH_REDIS_REST_URL = '';
    process.env.UPSTASH_REDIS_REST_TOKEN = '';

    const { savePrebookSession, getPrebookSession } = await import('@/server/booking-store');

    await savePrebookSession({
      prebookId: 'pb-1',
      transactionId: 'tx-1',
      clientReference: 'cr-1',
      quoteId: 'q-1',
      quote: {
        hotelId: 'h1',
        roomId: 'r1',
        baseAmount: 100,
        totalAmount: 112,
        currency: 'USD',
        signature: 'sig-1'
      },
      createdAt: new Date().toISOString()
    });

    expect(await getPrebookSession('tx-1')).toBeTruthy();

    vi.advanceTimersByTime(30 * 60 * 1000 + 1);
    expect(await getPrebookSession('tx-1')).toBeNull();
  });

  it('fails closed in production when Redis session persistence is unavailable', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('STRICT_PERSISTENCE_MODE', 'true');
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    process.env.LITEAPI_API_KEY = 'test';
    process.env.QUOTE_SIGNING_SECRET = '1234567890abcdef1234567890abcdef12';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
    process.env.UPSTASH_REDIS_REST_URL = '';
    process.env.UPSTASH_REDIS_REST_TOKEN = '';

    const { savePrebookSession, getPrebookSession } = await import('@/server/booking-store');

    await expect(
      savePrebookSession({
        prebookId: 'pb-2',
        transactionId: 'tx-2',
        clientReference: 'cr-2',
        quoteId: 'q-2',
        quote: {
          hotelId: 'h2',
          roomId: 'r2',
          baseAmount: 120,
          totalAmount: 132,
          currency: 'USD',
          signature: 'sig-2'
        },
        createdAt: new Date().toISOString()
      })
    ).rejects.toMatchObject({ status: 503 });

    await expect(getPrebookSession('tx-2')).rejects.toMatchObject({ status: 503 });
  });
});
