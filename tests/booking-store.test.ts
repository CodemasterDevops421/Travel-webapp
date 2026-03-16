import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('booking prebook session fallback store', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.stubEnv('NODE_ENV', 'test');
    process.env.BOOKING_VIEW_TOKEN_SECRET = '1234567890abcdef';
    process.env.LITEAPI_WEBHOOK_SECRET = 'liteapi-webhook-secret-123';
    process.env.BOOKING_API_AUTH_SECRET = 'abcdefghijklmnopqrstuvwxyz123456';
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'upstash-token';
  });

  it('expires in-memory sessions after TTL when Redis is unavailable', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    process.env.LITEAPI_API_KEY = 'test';
    process.env.QUOTE_SIGNING_SECRET = '1234567890abcdef';
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

  it('fails fast in production when Redis credentials are missing', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('STRICT_PERSISTENCE_MODE', 'true');
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    process.env.LITEAPI_API_KEY = 'test';
    process.env.QUOTE_SIGNING_SECRET = '1234567890abcdef';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
    process.env.UPSTASH_REDIS_REST_URL = '';
    process.env.UPSTASH_REDIS_REST_TOKEN = '';

    const { assertProductionReadiness } = await import('@/server/env');
    expect(() => assertProductionReadiness()).toThrow(/Production configuration invalid/i);
  });

  it('recovers checkout progress by transaction and prebook ids', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    process.env.LITEAPI_API_KEY = 'test';
    process.env.QUOTE_SIGNING_SECRET = '1234567890abcdef';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
    process.env.UPSTASH_REDIS_REST_URL = '';
    process.env.UPSTASH_REDIS_REST_TOKEN = '';

    const {
      getCheckoutProgressSessionByPrebookId,
      getCheckoutProgressSessionByTransactionId,
      saveCheckoutProgressSession
    } = await import('@/server/booking-store');

    await saveCheckoutProgressSession({
      transactionId: 'tx-progress-1',
      prebookId: 'pb-progress-1',
      clientReference: 'client-ref-1',
      quoteId: 'quote-1',
      sessionSignature: 'session-signature-1',
      quoteSignature: 'quote-signature-1',
      holderEmail: 'traveler@example.com',
      holder: {
        firstName: 'Test',
        lastName: 'Traveler',
        email: 'traveler@example.com'
      },
      guests: [{ occupancyNumber: 1, firstName: 'Test', lastName: 'Traveler' }],
      quote: {
        hotelId: 'h1',
        roomId: 'r1',
        baseAmount: 100,
        totalAmount: 112,
        currency: 'USD',
        signature: 'quote-signature-1'
      },
      state: 'awaiting_confirmation',
      updatedAt: new Date().toISOString()
    });

    const byTransaction = await getCheckoutProgressSessionByTransactionId('tx-progress-1');
    const byPrebook = await getCheckoutProgressSessionByPrebookId('pb-progress-1');

    expect(byTransaction?.state).toBe('awaiting_confirmation');
    expect(byPrebook?.transactionId).toBe('tx-progress-1');

    vi.advanceTimersByTime(60 * 60 * 1000 + 1);

    expect(await getCheckoutProgressSessionByTransactionId('tx-progress-1')).toBeNull();
    expect(await getCheckoutProgressSessionByPrebookId('pb-progress-1')).toBeNull();
  });
});
