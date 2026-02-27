import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

describe('API security regression checks', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();

    vi.doMock('@/server/supabase/server', () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user_1' } }
          })
        }
      })
    }));
  });

  it('redacts supplier secret fields from hotel rates responses', async () => {
    vi.doMock('@/server/logger', () => ({
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
    }));
    vi.doMock('@/server/env', () => ({
      env: {
        LITEAPI_API_KEY: 'sandbox-live-key'
      }
    }));
    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/cache', () => ({
      getOrSetRedisCache: vi.fn().mockImplementation(async (_key: string, _ttl: number, producer: () => Promise<unknown>) => producer())
    }));
    vi.doMock('@/server/liteapi', () => ({
      getHotelRates: vi.fn().mockResolvedValue([
        {
          offerId: 'offer-1',
          roomId: 'room-1',
          roomName: 'Room A',
          boardName: 'Breakfast',
          refundableTag: 'refundable',
          amount: 120,
          currency: 'USD',
          supplierApiKey: 'do-not-leak',
          supplierSecret: 'do-not-leak'
        }
      ])
    }));

    const { GET } = await import('@/app/api/hotels/rates/route');
    const request = new NextRequest('https://example.com/api/hotels/rates?hotelId=h1&checkin=2026-04-10&checkout=2026-04-12&adults=2&rooms=1');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body[0].supplierApiKey).toBeUndefined();
    expect(body[0].supplierSecret).toBeUndefined();
  });

  it('returns degraded responses when LiteAPI credentials are missing', async () => {
    vi.doMock('@/server/logger', () => ({
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
    }));
    vi.doMock('@/server/env', () => ({
      env: {
        LITEAPI_API_KEY: 'liteapi-placeholder-key'
      }
    }));
    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));

    const { GET } = await import('@/app/api/hotels/rates/route');
    const request = new NextRequest('https://example.com/api/hotels/rates?hotelId=h1&checkin=2026-04-10&checkout=2026-04-12&adults=2&rooms=1');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toMatch(/temporarily unavailable/i);
  });

  it('redacts supplier secret fields from booking confirmation payloads', async () => {
    vi.doMock('@/server/logger', () => ({
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
    }));
    vi.doMock('@/server/env', () => ({
      env: {
        NODE_ENV: 'test',
        STRICT_PERSISTENCE_MODE: false,
        LITEAPI_API_KEY: 'sandbox-live-key'
      },
      assertProductionReadiness: vi.fn()
    }));
    vi.doMock('@/server/csrf', () => ({
      assertSameOrigin: vi.fn()
    }));
    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/booking-idempotency', () => ({
      getFinalizedBookingResult: vi.fn().mockResolvedValue(null),
      acquireFinalizeBookingLock: vi.fn().mockResolvedValue(true),
      releaseFinalizeBookingLock: vi.fn().mockResolvedValue(undefined),
      saveFinalizedBookingResult: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/booking-store', () => ({
      getPrebookSession: vi.fn().mockResolvedValue({
        prebookId: 'pb-1',
        transactionId: 'tx-1',
        clientReference: 'client-ref-1',
        quoteId: 'q-1',
        quote: {
          hotelId: 'h1',
          roomId: 'r1',
          baseAmount: 100,
          totalAmount: 112,
          currency: 'USD',
          signature: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
        }
      })
    }));
    vi.doMock('@/server/pricing', () => ({
      verifyPriceQuoteSignature: vi.fn().mockReturnValue(true)
    }));
    vi.doMock('@/server/liteapi', () => ({
      bookRate: vi.fn().mockResolvedValue({
        data: {
          bookingId: 'lite-booking-1',
          status: 'confirmed',
          supplierSecret: 'do-not-leak',
          supplierApiKey: 'do-not-leak'
        }
      })
    }));
    vi.doMock('@/server/booking/repository', () => ({
      persistBooking: vi.fn().mockResolvedValue('local-booking-1')
    }));
    vi.doMock('@/server/booking-view-token', () => ({
      signBookingViewToken: vi.fn().mockReturnValue('booking-view-token-1')
    }));

    const { POST } = await import('@/app/api/booking/book/route');
    const request = {
      headers: new Headers(),
      json: async () => ({
        prebookId: 'pb-1',
        transactionId: 'tx-1',
        quoteSignature: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        holder: { firstName: 'A', lastName: 'B', email: 'a@b.com' },
        guests: [{ occupancyNumber: 1, firstName: 'A', lastName: 'B' }]
      })
    } as unknown as NextRequest;

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.booking.data.supplierSecret).toBeUndefined();
    expect(body.booking.data.supplierApiKey).toBeUndefined();
  });
});
