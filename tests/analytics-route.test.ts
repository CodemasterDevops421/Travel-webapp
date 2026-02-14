import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('analytics funnel route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('QUOTE_SIGNING_SECRET', '1234567890abcdef');
    vi.stubEnv('LITEAPI_API_KEY', 'test');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service');
  });

  it('accepts valid funnel event payload', async () => {
    const loggerInfo = vi.fn();
    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/logger', () => ({
      logger: { info: loggerInfo }
    }));

    const { POST } = await import('@/app/api/analytics/funnel/route');
    const req = {
      headers: new Headers({
        'x-request-id': 'rid-funnel-1'
      }),
      json: async () => ({
        name: 'search_submitted',
        step: 'search',
        properties: { queryLength: 8 }
      })
    } as unknown as Request;

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(202);
    expect(body.ok).toBe(true);
    expect(loggerInfo).toHaveBeenCalled();
  });

  it('rejects malformed payload', async () => {
    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/logger', () => ({
      logger: { info: vi.fn() }
    }));

    const { POST } = await import('@/app/api/analytics/funnel/route');
    const req = {
      headers: new Headers(),
      json: async () => ({
        name: 'unknown_event',
        step: 'search'
      })
    } as unknown as Request;

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/invalid request payload/i);
  });
});
