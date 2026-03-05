import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('analytics blog route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('QUOTE_SIGNING_SECRET', '1234567890abcdef');
    vi.stubEnv('LITEAPI_API_KEY', 'test');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service');
  });

  it('accepts valid blog event payload and persists it', async () => {
    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    const loggerInfo = vi.fn();
    vi.doMock('@/server/logger', () => ({
      logger: { info: loggerInfo }
    }));
    const persistBlogEvent = vi.fn().mockResolvedValue('blog-event-1');
    vi.doMock('@/server/blog-analytics-repository', () => ({
      persistBlogEvent
    }));

    const { POST } = await import('@/app/api/analytics/blog/route');
    const req = {
      headers: new Headers({
        'x-request-id': 'rid-blog-1'
      }),
      json: async () => ({
        name: 'blog_cta_click',
        properties: {
          slug: 'best-time-to-book-hostels',
          category: 'itineraries',
          tag: 'hostels',
          position: 1,
          referrerPath: '/blog/best-time-to-book-hostels',
          ctaVariant: 'variant_a',
          ctaIntent: 'book_now',
          targetPath: '/search?query=hostels'
        }
      })
    } as unknown as Request;

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(202);
    expect(body.ok).toBe(true);
    expect(persistBlogEvent).toHaveBeenCalledTimes(1);
    expect(loggerInfo).toHaveBeenCalled();
  });

  it('rejects payload missing required analytics contract keys', async () => {
    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/logger', () => ({
      logger: { info: vi.fn() }
    }));
    vi.doMock('@/server/blog-analytics-repository', () => ({
      persistBlogEvent: vi.fn().mockResolvedValue('blog-event-2')
    }));

    const { POST } = await import('@/app/api/analytics/blog/route');
    const req = {
      headers: new Headers(),
      json: async () => ({
        name: 'blog_search',
        properties: {
          query: 'goa'
        }
      })
    } as unknown as Request;

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/invalid request payload/i);
  });
});
