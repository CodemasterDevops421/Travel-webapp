import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('booking route handlers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv('NODE_ENV', 'test');
    process.env.QUOTE_SIGNING_SECRET = '1234567890abcdef';
    process.env.LITEAPI_API_KEY = 'test';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
    process.env.BOOKING_VIEW_TOKEN_SECRET = '1234567890abcdef';
    process.env.LITEAPI_WEBHOOK_SECRET = 'liteapi-webhook-secret-123';
    process.env.BOOKING_API_AUTH_SECRET = 'abcdefghijklmnopqrstuvwxyz123456';
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'upstash-token';
  });

  it('prebook route returns payment sdk payload and persists session', async () => {
    const savePrebookSession = vi.fn().mockResolvedValue(undefined);
    const persistQuote = vi.fn().mockResolvedValue('quote-1');

    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/pricing', () => ({
      buildPriceQuote: vi.fn().mockReturnValue({
        hotelId: 'h1',
        roomId: 'r1',
        baseAmount: 100,
        totalAmount: 112,
        currency: 'USD',
        signature: 'sig-1'
      })
    }));
    vi.doMock('@/server/liteapi', () => ({
      prebookRate: vi.fn().mockResolvedValue({
        prebookId: 'pb-1',
        transactionId: 'tx-1',
        secretKey: 'sk-1',
        price: 112,
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
    const req = {
      headers: new Headers(),
      json: async () => ({
        hotelId: 'h1',
        roomId: 'r1',
        offerId: 'offer-1',
        amount: 100,
        currency: 'USD',
        checkIn: '2026-04-10',
        checkOut: '2026-04-12',
        guests: [{ adults: 2 }]
      })
    } as unknown as Request;

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.paymentSdk).toBe(true);
    expect(body.prebookId).toBe('pb-1');
    expect(savePrebookSession).toHaveBeenCalledOnce();
    expect(persistQuote).toHaveBeenCalledOnce();
  });

  it('prebook route continues when quote persistence is unavailable', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('STRICT_PERSISTENCE_MODE', 'true');
    const savePrebookSession = vi.fn().mockResolvedValue(undefined);
    const persistQuote = vi.fn().mockResolvedValue(null);

    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/pricing', () => ({
      buildPriceQuote: vi.fn().mockReturnValue({
        hotelId: 'h1',
        roomId: 'r1',
        baseAmount: 100,
        totalAmount: 112,
        currency: 'USD',
        signature: 'sig-1'
      })
    }));
    vi.doMock('@/server/liteapi', () => ({
      prebookRate: vi.fn().mockResolvedValue({
        prebookId: 'pb-1',
        transactionId: 'tx-1',
        secretKey: 'sk-1',
        price: 112,
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
    const req = {
      headers: new Headers(),
      json: async () => ({
        hotelId: 'h1',
        roomId: 'r1',
        offerId: 'offer-1',
        checkIn: '2026-04-10',
        checkOut: '2026-04-12',
        guests: [{ adults: 2 }]
      })
    } as unknown as Request;

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.prebookId).toBe('pb-1');
    expect(savePrebookSession).toHaveBeenCalledOnce();
  });

  it('book route rejects invalid fallback session signatures', async () => {
    const bookRate = vi.fn();

    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/liteapi', () => ({
      bookRate
    }));
    vi.doMock('@/server/booking-store', () => ({
      getPrebookSession: vi.fn().mockResolvedValue(null)
    }));
    vi.doMock('@/server/booking-session', () => ({
      verifyCheckoutSessionSignature: vi.fn().mockReturnValue(false)
    }));
    vi.doMock('@/server/booking/repository', () => ({
      persistBooking: vi.fn()
    }));

    const { POST } = await import('@/app/api/booking/book/route');
    const req = {
      headers: new Headers(),
      json: async () => ({
        prebookId: 'pb-1',
        transactionId: 'tx-1',
        clientReference: 'client-ref-1',
        quoteId: 'q1',
        quoteSignature: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        sessionSignature: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        holder: { firstName: 'A', lastName: 'B', email: 'a@b.com' },
        guests: [{ occupancyNumber: 1, firstName: 'A', lastName: 'B' }]
      })
    } as unknown as Request;

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/(Invalid session signature|Prebook session expired)/i);
    expect(bookRate).not.toHaveBeenCalled();
  });

  it('book route returns short-lived booking view token', async () => {
    const persistBooking = vi.fn().mockResolvedValue('local-booking-1');
    const signBookingViewToken = vi.fn().mockReturnValue('booking-view-token-1');

    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/liteapi', () => ({
      bookRate: vi.fn().mockResolvedValue({
        data: {
          bookingId: 'lite-booking-1',
          status: 'confirmed'
        }
      })
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
    vi.doMock('@/server/booking/repository', () => ({
      persistBooking
    }));
    vi.doMock('@/server/booking-view-token', () => ({
      signBookingViewToken
    }));

    const { POST } = await import('@/app/api/booking/book/route');
    const req = {
      headers: new Headers(),
      json: async () => ({
        prebookId: 'pb-1',
        transactionId: 'tx-1',
        quoteSignature: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        holder: { firstName: 'A', lastName: 'B', email: 'a@b.com' },
        guests: [{ occupancyNumber: 1, firstName: 'A', lastName: 'B' }]
      })
    } as unknown as Request;

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.localBookingId).toBe('local-booking-1');
    expect(body.bookingViewToken).toBe('booking-view-token-1');
    expect(signBookingViewToken).toHaveBeenCalledWith({ bookingId: 'local-booking-1' });
    expect(persistBooking).toHaveBeenCalledOnce();
  });

  it('book route fails closed in production when booking persistence is unavailable', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('STRICT_PERSISTENCE_MODE', 'true');
    const persistBooking = vi.fn().mockResolvedValue(null);

    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/liteapi', () => ({
      bookRate: vi.fn().mockResolvedValue({
        data: {
          bookingId: 'lite-booking-1',
          status: 'confirmed'
        }
      })
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
    vi.doMock('@/server/booking/repository', () => ({
      persistBooking
    }));
    vi.doMock('@/server/booking-view-token', () => ({
      signBookingViewToken: vi.fn().mockReturnValue('unused')
    }));

    const { POST } = await import('@/app/api/booking/book/route');
    const req = {
      headers: new Headers(),
      json: async () => ({
        prebookId: 'pb-1',
        transactionId: 'tx-1',
        quoteSignature: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        holder: { firstName: 'A', lastName: 'B', email: 'a@b.com' },
        guests: [{ occupancyNumber: 1, firstName: 'A', lastName: 'B' }]
      })
    } as unknown as Request;

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error).toMatch(/persistence unavailable/i);
    expect(persistBooking).toHaveBeenCalledOnce();
  });

  it('webhook route verifies signature and updates booking status', async () => {
    process.env.LITEAPI_WEBHOOK_SECRET = 'test-webhook-secret';
    process.env.QUOTE_SIGNING_SECRET = 'replace-with-strong-quote-signing-secret';
    process.env.LITEAPI_API_KEY = 'test';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';

    const updateByLiteApiId = vi.fn().mockResolvedValue(true);
    const loggerInfo = vi.fn();

    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/webhook-idempotency', () => ({
      markWebhookEventProcessed: vi.fn().mockResolvedValue(true)
    }));
    vi.doMock('@/server/booking/repository', () => ({
      updateBookingStatusByLiteApiId: updateByLiteApiId,
      updateBookingStatusByTransactionId: vi.fn().mockResolvedValue(false),
      persistBooking: vi.fn().mockResolvedValue(null)
    }));
    vi.doMock('@/server/logger', () => ({
      logger: { info: loggerInfo }
    }));

    const raw = JSON.stringify({
      id: 'evt-1',
      type: 'booking_confirmed',
      data: {
        bookingId: 'lite-booking-1',
        status: 'confirmed'
      }
    });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac('sha256', process.env.LITEAPI_WEBHOOK_SECRET).update(`${timestamp}.${raw}`).digest('hex');

    const { POST } = await import('@/app/api/webhooks/liteapi/route');
    const req = {
      headers: new Headers({
        'x-liteapi-signature': signature,
        'x-liteapi-timestamp': timestamp,
        'x-request-id': 'rid-1'
      }),
      text: async () => raw
    } as unknown as Request;

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(updateByLiteApiId).toHaveBeenCalledWith(
      'lite-booking-1',
      'confirmed',
      expect.objectContaining({ bookingId: 'lite-booking-1' })
    );
    expect(loggerInfo).toHaveBeenCalled();
  });

  it('webhook route ignores duplicate events', async () => {
    process.env.LITEAPI_WEBHOOK_SECRET = 'test-webhook-secret';
    process.env.QUOTE_SIGNING_SECRET = 'replace-with-strong-quote-signing-secret';
    process.env.LITEAPI_API_KEY = 'test';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';

    const loggerInfo = vi.fn();
    const updateByLiteApiId = vi.fn();

    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/webhook-idempotency', () => ({
      markWebhookEventProcessed: vi.fn().mockResolvedValue(false)
    }));
    vi.doMock('@/server/booking/repository', () => ({
      updateBookingStatusByLiteApiId: updateByLiteApiId,
      updateBookingStatusByTransactionId: vi.fn().mockResolvedValue(false),
      persistBooking: vi.fn().mockResolvedValue(null)
    }));
    vi.doMock('@/server/logger', () => ({
      logger: { info: loggerInfo }
    }));

    const raw = JSON.stringify({
      id: 'evt-duplicate',
      type: 'booking_confirmed',
      data: {
        bookingId: 'lite-booking-dup',
        status: 'confirmed'
      }
    });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac('sha256', process.env.LITEAPI_WEBHOOK_SECRET).update(`${timestamp}.${raw}`).digest('hex');

    const { POST } = await import('@/app/api/webhooks/liteapi/route');
    const req = {
      headers: new Headers({
        'x-liteapi-signature': signature,
        'x-liteapi-timestamp': timestamp,
        'x-request-id': 'rid-dup'
      }),
      text: async () => raw
    } as unknown as Request;

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.duplicate).toBe(true);
    expect(updateByLiteApiId).not.toHaveBeenCalled();
    expect(loggerInfo).toHaveBeenCalled();
  });
});
