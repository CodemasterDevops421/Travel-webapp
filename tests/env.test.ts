import { describe, expect, it, vi } from 'vitest';

describe('env parsing', () => {
  it('treats empty strings as missing and applies defaults', async () => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_APP_URL = '';
    process.env.LITEAPI_API_KEY = '';
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
});
