import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('booking promo authority', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv('NODE_ENV', 'test');
    process.env.QUOTE_SIGNING_SECRET = '1234567890abcdef';
    process.env.BOOKING_VIEW_TOKEN_SECRET = '1234567890abcdef';
    process.env.LITEAPI_WEBHOOK_SECRET = 'liteapi-webhook-secret-123';
    process.env.BOOKING_API_AUTH_SECRET = 'abcdefghijklmnopqrstuvwxyz123456';
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'upstash-token';
    process.env.LITEAPI_API_KEY = 'test-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
  });

  it('applies promo discount on the server during prebook creation', async () => {
    const savePrebookSession = vi.fn().mockResolvedValue(undefined);
    const persistQuote = vi.fn().mockResolvedValue('quote-1');

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } })
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  code: 'SAVE10',
                  discount_percent: 10,
                  expires_at: null,
                  max_uses: null,
                  current_uses: 0,
                  is_active: true
                },
                error: null
              })
            })
          })
        })
      })
    };

    vi.doMock('@/server/supabase/server', () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue(supabase)
    }));
    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/request', async () => {
      const actual = await vi.importActual<typeof import('@/server/request')>('@/server/request');
      return {
        ...actual,
        getRequestContext: vi.fn().mockReturnValue({ clientIp: '127.0.0.1', correlationId: 'cid-1' })
      };
    });
    vi.doMock('@/server/liteapi', () => ({
      prebookRate: vi.fn().mockResolvedValue({
        prebookId: 'pb-1',
        transactionId: 'txn-1',
        secretKey: 'secret',
        price: 200,
        currency: 'USD'
      })
    }));
    vi.doMock('@/server/booking-store', () => ({
      savePrebookSession
    }));
    vi.doMock('@/server/booking/repository', () => ({
      persistQuote
    }));

    const { POST } = await import('@/app/api/booking/prebook/route');
    const response = await POST({
      headers: new Headers({ origin: 'https://example.com' }),
      json: async () => ({
        hotelId: 'hotel-1',
        roomId: 'room-1',
        offerId: 'offer-1',
        promoCode: 'save10',
        checkIn: '2026-06-10',
        checkOut: '2026-06-12',
        guests: [{ adults: 2 }]
      })
    } as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.quote.totalAmount).toBe(180);
    expect(savePrebookSession).toHaveBeenCalledWith(expect.objectContaining({
      quote: expect.objectContaining({ totalAmount: 180 })
    }));
    expect(persistQuote).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      quote: expect.objectContaining({ totalAmount: 180 })
    }));
  });
});
