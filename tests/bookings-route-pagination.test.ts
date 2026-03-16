import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

describe('bookings route pagination', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('applies hard pagination to upstream booking list results', async () => {
    vi.doMock('@/server/env', async () => {
      const actual = await vi.importActual<typeof import('@/server/env')>('@/server/env');
      return {
        ...actual,
        assertProductionReadiness: vi.fn()
      };
    });
    vi.doMock('@/server/authz', () => ({
      assertBookingApiAuthorized: vi.fn()
    }));
    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/request', () => ({
      getClientIp: vi.fn().mockReturnValue('127.0.0.1')
    }));
    vi.doMock('@/server/liteapi', () => ({
      listBookings: vi.fn().mockResolvedValue({
        data: Array.from({ length: 5 }, (_, index) => ({ id: `booking-${index + 1}` }))
      })
    }));

    const { GET } = await import('@/app/api/bookings/route');
    const response = await GET(new NextRequest('http://localhost/api/bookings?clientReference=abc&page=2&limit=2'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([{ id: 'booking-3' }, { id: 'booking-4' }]);
    expect(body.pagination).toEqual({
      page: 2,
      limit: 2,
      total: 5,
      totalPages: 3
    });
  });
});
