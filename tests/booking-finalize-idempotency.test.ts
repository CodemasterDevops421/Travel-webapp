import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('booking finalize idempotency', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv('NODE_ENV', 'test');
    process.env.QUOTE_SIGNING_SECRET = '1234567890abcdef';
    process.env.BOOKING_VIEW_TOKEN_SECRET = '1234567890abcdef';
    process.env.BOOKING_API_AUTH_SECRET = 'abcdefghijklmnopqrstuvwxyz123456';
    process.env.LITEAPI_WEBHOOK_SECRET = 'liteapi-webhook-secret';
    process.env.LITEAPI_API_KEY = 'test-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';

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

  function buildRequest(transactionId = 'txn_1'): Request {
    return {
      url: 'https://example.com/api/booking/book',
      headers: new Headers({ origin: 'https://example.com' }),
      json: async () => ({
        prebookId: 'pb_1',
        transactionId,
        quoteSignature: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        holder: { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' },
        guests: [{ occupancyNumber: 1, firstName: 'Ada', lastName: 'Lovelace' }]
      })
    } as unknown as Request;
  }

  it('keeps lifecycle pending even when supplier response reports confirmed', async () => {
    const persistBooking = vi.fn().mockResolvedValue('booking_1');
    const saveFinalizedBookingResult = vi.fn().mockResolvedValue(undefined);

    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined),
      createRateLimitKey: vi.fn().mockReturnValue('booking:test:finalize')
    }));
    vi.doMock('@/server/booking-idempotency', () => ({
      getFinalizedBookingResult: vi.fn().mockResolvedValue(null),
      acquireFinalizeBookingLock: vi.fn().mockResolvedValue(true),
      releaseFinalizeBookingLock: vi.fn().mockResolvedValue(undefined),
      saveFinalizedBookingResult
    }));
    vi.doMock('@/server/booking-store', () => ({
      getPrebookSession: vi.fn().mockResolvedValue({
        prebookId: 'pb_1',
        transactionId: 'txn_1',
        clientReference: 'client_ref_1',
        quoteId: 'quote_1',
        quote: {
          hotelId: 'hotel_1',
          roomId: 'room_1',
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
          bookingId: 'lite_booking_1',
          status: 'confirmed'
        }
      })
    }));
    vi.doMock('@/server/booking/repository', () => ({
      persistBooking
    }));
    vi.doMock('@/server/booking-view-token', () => ({
      signBookingViewToken: vi.fn().mockReturnValue('view_token_1')
    }));

    const { POST } = await import('@/app/api/booking/book/route');
    const res = await POST(buildRequest() as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('pending');
    expect(body.supplierStatus).toBe('confirmed');
    expect(persistBooking).toHaveBeenCalledWith(expect.objectContaining({
      status: 'pending',
      metadata: expect.objectContaining({
        supplierStatus: 'confirmed',
        paymentStatus: 'pending'
      })
    }));
    expect(saveFinalizedBookingResult).toHaveBeenCalledWith('txn_1', expect.objectContaining({ status: 'pending' }));
  });

  it('returns 409 when a concurrent finalize lock already exists', async () => {
    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined),
      createRateLimitKey: vi.fn().mockReturnValue('booking:test:finalize')
    }));
    vi.doMock('@/server/booking-idempotency', () => ({
      getFinalizedBookingResult: vi.fn().mockResolvedValue(null),
      acquireFinalizeBookingLock: vi.fn().mockResolvedValue(false),
      releaseFinalizeBookingLock: vi.fn().mockResolvedValue(undefined),
      saveFinalizedBookingResult: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/booking-store', () => ({
      getPrebookSession: vi.fn()
    }));
    vi.doMock('@/server/liteapi', () => ({
      bookRate: vi.fn()
    }));

    const { POST } = await import('@/app/api/booking/book/route');
    const res = await POST(buildRequest('txn_lock') as never);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toMatch(/already in progress/i);
  });

  it('returns in-flight cached response when lock exists but cache is filled', async () => {
    const getFinalizedBookingResult = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        booking: { data: { bookingId: 'lite_cached_1' } },
        localBookingId: 'local_cached_1',
        bookingViewToken: 'view_cached_1',
        liteApiBookingId: 'lite_cached_1',
        status: 'pending',
        supplierStatus: 'confirmed',
        clientReference: 'client_ref_1',
        quoteSignature: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      });

    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined),
      createRateLimitKey: vi.fn().mockReturnValue('booking:test:finalize')
    }));
    vi.doMock('@/server/booking-idempotency', () => ({
      getFinalizedBookingResult,
      acquireFinalizeBookingLock: vi.fn().mockResolvedValue(false),
      releaseFinalizeBookingLock: vi.fn().mockResolvedValue(undefined),
      saveFinalizedBookingResult: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/booking-store', () => ({
      getPrebookSession: vi.fn()
    }));
    vi.doMock('@/server/liteapi', () => ({
      bookRate: vi.fn()
    }));

    const { POST } = await import('@/app/api/booking/book/route');
    const res = await POST(buildRequest('txn_race') as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.localBookingId).toBe('local_cached_1');
    expect(body.status).toBe('pending');
  });
});
