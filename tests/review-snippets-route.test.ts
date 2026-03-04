import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('review snippets route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv('NODE_ENV', 'test');
    process.env.QUOTE_SIGNING_SECRET = '1234567890abcdef';
    process.env.BOOKING_VIEW_TOKEN_SECRET = '1234567890abcdef';
    process.env.BOOKING_API_AUTH_SECRET = 'abcdefghijklmnopqrstuvwxyz123456';
    process.env.LITEAPI_API_KEY = 'test-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
  });

  it('returns canonical reviews_cache snippet on fresh hit', async () => {
    const getGuestReviews = vi.fn();
    const upsertReviewsCache = vi.fn();

    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/cache', () => ({
      getOrSetRedisCache: vi.fn().mockImplementation(async (_key, _ttl, producer) => producer())
    }));
    vi.doMock('@/server/liteapi', () => ({
      getGuestReviews
    }));
    vi.doMock('@/server/reviews-cache-repository', () => ({
      getReviewsCache: vi.fn().mockResolvedValue({
        hotel_id: 'hotel-1',
        payload: {
          snippet: {
            hotelId: 'hotel-1',
            quote: 'Already cached quote',
            author: 'Existing Guest',
            score: 4.5
          }
        },
        source: 'liteapi',
        fetched_at: '2026-02-28T00:00:00.000Z',
        expires_at: '2099-01-01T00:00:00.000Z',
        created_at: '2026-02-28T00:00:00.000Z',
        updated_at: '2026-02-28T00:00:00.000Z'
      }),
      isReviewsCacheStale: vi.fn().mockReturnValue(false),
      upsertReviewsCache
    }));

    const { GET } = await import('@/app/api/review-snippets/route');
    const req = {
      headers: new Headers(),
      nextUrl: new URL('https://example.com/api/review-snippets?hotelIds=hotel-1')
    } as unknown;

    const res = await GET(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.snippets).toEqual([
      {
        hotelId: 'hotel-1',
        quote: 'Already cached quote',
        author: 'Existing Guest',
        score: 4.5
      }
    ]);
    expect(getGuestReviews).not.toHaveBeenCalled();
    expect(upsertReviewsCache).not.toHaveBeenCalled();
  });

  it('refreshes canonical reviews_cache on cache miss', async () => {
    const getGuestReviews = vi.fn().mockResolvedValue([
      {
        author: 'Guest A',
        comment: 'Excellent location and very clean rooms.',
        score: 4.8
      }
    ]);
    const upsertReviewsCache = vi.fn().mockResolvedValue(true);

    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/cache', () => ({
      getOrSetRedisCache: vi.fn().mockImplementation(async (_key, _ttl, producer) => producer())
    }));
    vi.doMock('@/server/liteapi', () => ({
      getGuestReviews
    }));
    vi.doMock('@/server/reviews-cache-repository', () => ({
      getReviewsCache: vi.fn().mockResolvedValue(null),
      isReviewsCacheStale: vi.fn().mockReturnValue(true),
      upsertReviewsCache
    }));

    const { GET } = await import('@/app/api/review-snippets/route');
    const req = {
      headers: new Headers(),
      nextUrl: new URL('https://example.com/api/review-snippets?hotelIds=hotel-2')
    } as unknown;

    const res = await GET(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.snippets).toEqual([
      expect.objectContaining({
        hotelId: 'hotel-2',
        author: 'Guest A',
        score: 4.8
      })
    ]);
    expect(getGuestReviews).toHaveBeenCalledWith('hotel-2', 3);
    expect(upsertReviewsCache).toHaveBeenCalledWith(expect.objectContaining({
      hotelId: 'hotel-2',
      payload: expect.objectContaining({
        snippet: expect.objectContaining({
          hotelId: 'hotel-2'
        })
      })
    }));
  });

  it('refreshes supplier data when canonical reviews_cache is stale', async () => {
    const getGuestReviews = vi.fn().mockResolvedValue([
      {
        author: 'Guest B',
        comment: 'Friendly staff and great breakfast buffet.',
        score: 4.3
      }
    ]);
    const upsertReviewsCache = vi.fn().mockResolvedValue(true);

    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/cache', () => ({
      getOrSetRedisCache: vi.fn().mockImplementation(async (_key, _ttl, producer) => producer())
    }));
    vi.doMock('@/server/liteapi', () => ({
      getGuestReviews
    }));
    vi.doMock('@/server/reviews-cache-repository', () => ({
      getReviewsCache: vi.fn().mockResolvedValue({
        hotel_id: 'hotel-3',
        payload: {
          snippet: {
            hotelId: 'hotel-3',
            quote: 'Old cached snippet',
            author: 'Old Guest',
            score: 3.8
          }
        },
        source: 'liteapi',
        fetched_at: '2026-02-20T00:00:00.000Z',
        expires_at: '2026-02-20T01:00:00.000Z',
        created_at: '2026-02-20T00:00:00.000Z',
        updated_at: '2026-02-20T00:00:00.000Z'
      }),
      isReviewsCacheStale: vi.fn().mockReturnValue(true),
      upsertReviewsCache
    }));

    const { GET } = await import('@/app/api/review-snippets/route');
    const req = {
      headers: new Headers(),
      nextUrl: new URL('https://example.com/api/review-snippets?hotelIds=hotel-3')
    } as unknown;

    const res = await GET(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(getGuestReviews).toHaveBeenCalledWith('hotel-3', 3);
    expect(upsertReviewsCache).toHaveBeenCalledOnce();
    expect(body.snippets).toEqual([
      expect.objectContaining({
        hotelId: 'hotel-3',
        author: 'Guest B'
      })
    ]);
  });
});
