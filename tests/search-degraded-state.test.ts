import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('property preview degraded-state envelope', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  function buildRequest(url: string) {
    return {
      nextUrl: new URL(url),
      headers: new Headers()
    } as unknown as Request;
  }

  it('returns fresh envelope when supplier search succeeds', async () => {
    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/request', () => ({
      getClientIp: vi.fn().mockReturnValue('127.0.0.1')
    }));
    vi.doMock('@/server/cache', () => ({
      getOrSetRedisCache: vi.fn(async (_key: string, _ttl: number, fallback: () => Promise<unknown>) => fallback())
    }));
    vi.doMock('@/server/liteapi', () => ({
      searchPropertyPreviews: vi.fn().mockResolvedValue({
        properties: [
          {
            hotelId: 'h1',
            name: 'City Center Hotel',
            city: 'Lisbon',
            starRating: 4,
            price: 220,
            currency: 'USD',
            amenities: []
          }
        ],
        degraded: false,
        degradedReason: null,
        asOf: '2026-01-01T00:00:00.000Z',
        freshness: 'fresh'
      })
    }));

    const { GET } = await import('@/app/api/property-preview/route');
    const response = await GET(buildRequest('https://example.test/api/property-preview?q=Lisbon') as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.degraded).toBe(false);
    expect(body.degradedReason).toBeNull();
    expect(body.freshness).toBe('fresh');
    expect(body.data).toHaveLength(1);
  });

  it('returns stale envelope with partial reason when fallback data is used', async () => {
    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/request', () => ({
      getClientIp: vi.fn().mockReturnValue('127.0.0.1')
    }));
    vi.doMock('@/server/cache', () => ({
      getOrSetRedisCache: vi.fn(async (_key: string, _ttl: number, fallback: () => Promise<unknown>) => fallback())
    }));
    vi.doMock('@/server/liteapi', () => ({
      searchPropertyPreviews: vi.fn().mockResolvedValue({
        properties: [
          {
            hotelId: 'fallback-1',
            name: 'Backup Resort',
            city: 'Bali',
            starRating: 4,
            price: 180,
            currency: 'USD',
            amenities: []
          }
        ],
        degraded: true,
        degradedReason: 'partial',
        asOf: '2026-01-01T00:00:00.000Z',
        freshness: 'stale'
      })
    }));

    const { GET } = await import('@/app/api/property-preview/route');
    const response = await GET(buildRequest('https://example.test/api/property-preview?q=Bali') as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.degraded).toBe(true);
    expect(body.degradedReason).toBe('partial');
    expect(body.freshness).toBe('stale');
    expect(body.data).toHaveLength(1);
  });

  it('returns truthful unavailable metadata when supplier is down', async () => {
    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/request', () => ({
      getClientIp: vi.fn().mockReturnValue('127.0.0.1')
    }));
    vi.doMock('@/server/cache', () => ({
      getOrSetRedisCache: vi.fn(async (_key: string, _ttl: number, fallback: () => Promise<unknown>) => fallback())
    }));
    vi.doMock('@/server/liteapi', () => ({
      searchPropertyPreviews: vi.fn().mockResolvedValue({
        properties: [],
        degraded: true,
        degradedReason: 'unavailable',
        asOf: '2026-01-01T00:00:00.000Z',
        freshness: 'stale'
      })
    }));

    const { GET } = await import('@/app/api/property-preview/route');
    const response = await GET(buildRequest('https://example.test/api/property-preview?q=Zurich') as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.degraded).toBe(true);
    expect(body.degradedReason).toBe('unavailable');
    expect(body.freshness).toBe('stale');
    expect(body.data).toEqual([]);
  });
});
