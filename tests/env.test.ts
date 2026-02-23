import { describe, expect, it, vi } from 'vitest';

describe('env parsing', () => {
  it('treats empty strings as missing and applies defaults', async () => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_APP_URL = '';
    process.env.LITEAPI_API_KEY = '';
    process.env.QUOTE_SIGNING_SECRET = '1234567890abcdef';
    process.env.NEXT_PUBLIC_SUPABASE_URL = '';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '';
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    process.env.UPSTASH_REDIS_REST_URL = '';
    process.env.UPSTASH_REDIS_REST_TOKEN = '';

    const { env } = await import('@/server/env');

    expect(env.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000');
    expect(env.LITEAPI_API_KEY).toBe('liteapi-placeholder-key');
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://example.supabase.co');
    expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('supabase-anon-placeholder');
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe('supabase-service-role-placeholder');
    expect(env.UPSTASH_REDIS_REST_URL).toBeUndefined();
    expect(env.UPSTASH_REDIS_REST_TOKEN).toBeUndefined();
  });

  it('fails fast in production when critical config is missing', async () => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('LITEAPI_API_KEY', 'liteapi-placeholder-key');
    vi.stubEnv('QUOTE_SIGNING_SECRET', '');
    vi.stubEnv('BOOKING_VIEW_TOKEN_SECRET', '');
    vi.stubEnv('LITEAPI_WEBHOOK_SECRET', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'supabase-service-role-placeholder');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
    vi.stubEnv('BOOKING_API_AUTH_SECRET', '');
    vi.stubEnv('STRICT_PERSISTENCE_MODE', 'false');

    const { assertProductionReadiness } = await import('@/server/env');
    expect(() => assertProductionReadiness()).toThrow(/Production configuration invalid/i);
  });

  it('selects LiteAPI runtime config from environment mode', async () => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('LITEAPI_ENV', 'production');
    vi.stubEnv('LITEAPI_SANDBOX_API_KEY', 'sandbox-key');
    vi.stubEnv('LITEAPI_PRODUCTION_API_KEY', 'production-key');
    vi.stubEnv('LITEAPI_SANDBOX_BASE_URL', 'https://sandbox.example.com/v3');
    vi.stubEnv('LITEAPI_PRODUCTION_BASE_URL', 'https://api.example.com/v3');
    vi.stubEnv('LITEAPI_SANDBOX_BOOK_BASE_URL', 'https://sandbox-book.example.com/v3');
    vi.stubEnv('LITEAPI_PRODUCTION_BOOK_BASE_URL', 'https://book.example.com/v3');

    const { env, getLiteApiRuntimeConfig } = await import('@/server/env');
    const selected = getLiteApiRuntimeConfig();

    expect(selected.mode).toBe('production');
    expect(selected.apiKey).toBe('production-key');
    expect(selected.baseUrl).toBe('https://api.example.com/v3');
    expect(selected.bookBaseUrl).toBe('https://book.example.com/v3');
    expect(env.LITEAPI_API_KEY).toBe('production-key');
    expect(env.LITEAPI_BASE_URL).toBe('https://api.example.com/v3');
    expect(env.LITEAPI_BOOK_BASE_URL).toBe('https://book.example.com/v3');
  });
});
