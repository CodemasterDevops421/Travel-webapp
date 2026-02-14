import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('env parsing', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('treats empty strings as missing and applies defaults in test mode', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
    vi.stubEnv('LITEAPI_API_KEY', '');
    vi.stubEnv('QUOTE_SIGNING_SECRET', '1234567890abcdef1234567890abcdef'); // 32+ chars
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');

    const { env } = await import('@/server/env');

    // In test mode, these get safe defaults
    expect(env.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000');
    expect(env.LITEAPI_API_KEY).toBeUndefined();
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe('http://localhost:54321');
    expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('dev-anon-key');
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe('dev-service-key');
    expect(env.UPSTASH_REDIS_REST_URL).toBeUndefined();
    expect(env.UPSTASH_REDIS_REST_TOKEN).toBeUndefined();
  });
});
