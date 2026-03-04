import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockSecurityRouteDependencies, resetSecurityRouteMocks } from './helpers/security-route-mocks';

function collectSecretLikeKeys(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.flatMap((value) => collectSecretLikeKeys(value));
  }

  if (!input || typeof input !== 'object') {
    return [];
  }

  const entries = Object.entries(input as Record<string, unknown>);
  const directMatches = entries
    .filter(([key]) => /(api[_-]?key|secret)/i.test(key))
    .map(([key]) => key);

  return directMatches.concat(entries.flatMap(([, value]) => collectSecretLikeKeys(value)));
}

describe('booking route handlers', () => {
  beforeEach(() => {
    resetSecurityRouteMocks();
    vi.doUnmock('@/server/booking-idempotency');
    mockSecurityRouteDependencies();
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
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123';

  });

  it('prebook route returns payment sdk payload and persists session', async () => {
    const savePrebookSession = vi.fn().mockResolvedValue(undefined);
    const persistQuote = vi.fn().mockResolvedValue('quote-1');

    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/pricing', () => ({
      buildPriceQuoteExact: vi.fn().mockReturnValue({
        hotelId: 'h1',
        roomId: 'r1',
        baseAmount: 100,
        totalAmount: 100,
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
      url: 'https://example.com/api/booking/prebook',
      headers: new Headers({ origin: 'https://example.com' }),
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
    expect(body.paymentToken).toBe('sk-1');
    expect(collectSecretLikeKeys(body)).toEqual([]);
    expect(savePrebookSession).toHaveBeenCalledOnce();
    expect(persistQuote).toHaveBeenCalledOnce();
  });

  it('prebook route fails closed when supplier prebook payload is malformed', async () => {
    vi.doMock('@/server/liteapi', () => ({
      prebookRate: vi.fn().mockResolvedValue({
        prebookId: 'pb-1',
        transactionId: '',
        secretKey: 'sk-1',
        price: 112,
        currency: 'USD'
      })
    }));

    const { POST } = await import('@/app/api/booking/prebook/route');
    const req = {
      url: 'https://example.com/api/booking/prebook',
      headers: new Headers({ origin: 'https://example.com' }),
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

    expect(res.status).toBe(502);
    expect(body.error).toMatch(/prebook payload is invalid/i);
  });

  it('prebook route rejects unauthenticated requests', async () => {
    vi.doMock('@/server/supabase/server', () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null }
          })
        }
      })
    }));

    const { POST } = await import('@/app/api/booking/prebook/route');
    const req = {
      url: 'https://example.com/api/booking/prebook',
      headers: new Headers({ origin: 'https://example.com' }),
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

    expect(res.status).toBe(401);
    expect(body.code).toBe('AUTH_REQUIRED');
  });

  it('prebook route continues when quote persistence is unavailable', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('LITEAPI_ENV', 'production');
    vi.stubEnv('LITEAPI_PRODUCTION_API_KEY', 'prod-key-1');
    vi.stubEnv('LITEAPI_PRODUCTION_BASE_URL', 'https://api.example.com/v3');
    vi.stubEnv('LITEAPI_PRODUCTION_BOOK_BASE_URL', 'https://book.example.com/v3');
    vi.stubEnv('STRICT_PERSISTENCE_MODE', 'true');
    const savePrebookSession = vi.fn().mockResolvedValue(undefined);
    const persistQuote = vi.fn().mockResolvedValue(null);

    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/pricing', () => ({
      buildPriceQuoteExact: vi.fn().mockReturnValue({
        hotelId: 'h1',
        roomId: 'r1',
        baseAmount: 100,
        totalAmount: 100,
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
      url: 'https://example.com/api/booking/book',
      headers: new Headers({ origin: 'https://example.com' }),
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
      url: 'https://example.com/api/booking/book',
      headers: new Headers({ origin: 'https://example.com' }),
      json: async () => ({
        prebookId: 'pb-1',
        transactionId: 'tx-2',
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


  it('book route requires cryptographically verifiable quote for recovered sessions', async () => {
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
      verifyCheckoutSessionSignature: vi.fn().mockReturnValue(true)
    }));
    vi.doMock('@/server/pricing', () => ({
      verifyPriceQuoteSignature: vi.fn().mockReturnValue(false)
    }));
    vi.doMock('@/server/booking/repository', () => ({
      persistBooking: vi.fn()
    }));

    const { POST } = await import('@/app/api/booking/book/route');
    const req = {
      url: 'https://example.com/api/booking/book',
      headers: new Headers({ origin: 'https://example.com' }),
      json: async () => ({
        prebookId: 'pb-1',
        transactionId: 'tx-1',
        clientReference: 'client-ref-1',
        quoteId: 'q1',
        quoteSignature: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        sessionSignature: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        quote: {
          hotelId: 'h1',
          roomId: 'r1',
          baseAmount: 100,
          totalAmount: 112,
          currency: 'USD',
          signature: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
        },
        holder: { firstName: 'A', lastName: 'B', email: 'a@b.com' },
        guests: [{ occupancyNumber: 1, firstName: 'A', lastName: 'B' }]
      })
    } as unknown as Request;

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/invalid quote signature/i);
    expect(bookRate).not.toHaveBeenCalled();
  });

  it('book route returns cached response for duplicate transaction', async () => {
    const bookRate = vi.fn();

    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/liteapi', () => ({
      bookRate
    }));
    vi.doMock('@/server/booking-idempotency', () => ({
      getFinalizedBookingResult: vi.fn().mockResolvedValue({
        booking: { data: { bookingId: 'cached-booking' } },
        localBookingId: 'local-cached-1',
        bookingViewToken: 'view-cached-1',
        liteApiBookingId: 'cached-booking',
        status: 'confirmed',
        clientReference: 'client-ref-cached',
        quoteSignature: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      }),
      acquireFinalizeBookingLock: vi.fn(),
      releaseFinalizeBookingLock: vi.fn(),
      saveFinalizedBookingResult: vi.fn()
    }));

    const { POST } = await import('@/app/api/booking/book/route');
    const req = {
      url: 'https://example.com/api/booking/book',
      headers: new Headers({ origin: 'https://example.com' }),
      json: async () => ({
        prebookId: 'pb-1',
        transactionId: 'tx-2',
        quoteSignature: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        holder: { firstName: 'A', lastName: 'B', email: 'a@b.com' },
        guests: [{ occupancyNumber: 1, firstName: 'A', lastName: 'B' }]
      })
    } as unknown as Request;

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.localBookingId).toBe('local-cached-1');
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
    expect(persistBooking).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        itinerary: expect.objectContaining({
          hotelId: 'h1',
          roomId: 'r1',
          totalAmount: 112,
          currency: 'USD'
        }),
        holder: expect.objectContaining({ email: 'a@b.com' }),
        guests: expect.any(Array)
      })
    }));
    expect(persistBooking).toHaveBeenCalledOnce();
  });


  it('book route still succeeds when lock release fails after finalize', async () => {
    const persistBooking = vi.fn().mockResolvedValue('local-booking-1');

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
        transactionId: 'tx-4',
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
    vi.doMock('@/server/booking-idempotency', async () => {
      const actual = await vi.importActual<typeof import('@/server/booking-idempotency')>('@/server/booking-idempotency');
      return {
        ...actual,
        releaseFinalizeBookingLock: vi.fn().mockRejectedValue(new Error('redis transient failure'))
      };
    });

    const { POST } = await import('@/app/api/booking/book/route');
    const req = {
      headers: new Headers(),
      json: async () => ({
        prebookId: 'pb-1',
        transactionId: 'tx-4',
        quoteSignature: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        holder: { firstName: 'A', lastName: 'B', email: 'a@b.com' },
        guests: [{ occupancyNumber: 1, firstName: 'A', lastName: 'B' }]
      })
    } as unknown as Request;

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.localBookingId).toBe('local-booking-1');
    expect(persistBooking).toHaveBeenCalledOnce();
  });

  it('book route fails closed in production when booking persistence is unavailable', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('LITEAPI_ENV', 'production');
    vi.stubEnv('LITEAPI_PRODUCTION_API_KEY', 'prod-key-1');
    vi.stubEnv('LITEAPI_PRODUCTION_BASE_URL', 'https://api.example.com/v3');
    vi.stubEnv('LITEAPI_PRODUCTION_BOOK_BASE_URL', 'https://book.example.com/v3');
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
        transactionId: 'tx-3',
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
      url: 'https://example.com/api/booking/book',
      headers: new Headers({ origin: 'https://example.com' }),
      json: async () => ({
        prebookId: 'pb-1',
        transactionId: 'tx-3',
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

  it('book route fails closed when supplier booking payload is malformed', async () => {
    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/liteapi', () => ({
      bookRate: vi.fn().mockResolvedValue({ data: 'invalid-shape' })
    }));
    vi.doMock('@/server/booking-store', () => ({
      getPrebookSession: vi.fn().mockResolvedValue({
        prebookId: 'pb-1',
        transactionId: 'tx-malformed',
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
      persistBooking: vi.fn()
    }));

    const { POST } = await import('@/app/api/booking/book/route');
    const req = {
      url: 'https://example.com/api/booking/book',
      headers: new Headers({ origin: 'https://example.com' }),
      json: async () => ({
        prebookId: 'pb-1',
        transactionId: 'tx-malformed',
        quoteSignature: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        holder: { firstName: 'A', lastName: 'B', email: 'a@b.com' },
        guests: [{ occupancyNumber: 1, firstName: 'A', lastName: 'B' }]
      })
    } as unknown as Request;

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.error).toMatch(/booking payload is invalid/i);
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
      claimWebhookEvent: vi.fn().mockResolvedValue(true),
      finalizeWebhookEvent: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/booking/repository', () => ({
      updateBookingStatusByLiteApiId: updateByLiteApiId,
      updateBookingStatusByTransactionId: vi.fn().mockResolvedValue(false),
      persistBooking: vi.fn().mockResolvedValue(null)
    }));
    vi.doMock('@/server/payment-logs-repository', () => ({
      insertPaymentLog: vi.fn().mockResolvedValue('payment-log-1')
    }));
    vi.doMock('@/server/logger', () => ({
      logger: { info: loggerInfo },
      logStructuredEvent: vi.fn()
    }));

    const raw = JSON.stringify({
      id: 'evt-1',
      type: 'booking_confirmed',
      data: {
        bookingId: 'lite-booking-1',
        status: 'failed'
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
      'failed',
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
      claimWebhookEvent: vi.fn().mockResolvedValue(false),
      finalizeWebhookEvent: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/booking/repository', () => ({
      updateBookingStatusByLiteApiId: updateByLiteApiId,
      updateBookingStatusByTransactionId: vi.fn().mockResolvedValue(false),
      persistBooking: vi.fn().mockResolvedValue(null)
    }));
    vi.doMock('@/server/payment-logs-repository', () => ({
      insertPaymentLog: vi.fn().mockResolvedValue('payment-log-1')
    }));
    vi.doMock('@/server/logger', () => ({
      logger: { info: loggerInfo },
      logStructuredEvent: vi.fn()
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

  it('webhook route ignores unsupported supplier status', async () => {
    process.env.LITEAPI_WEBHOOK_SECRET = 'test-webhook-secret';
    process.env.QUOTE_SIGNING_SECRET = 'replace-with-strong-quote-signing-secret';
    process.env.LITEAPI_API_KEY = 'test';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';

    const updateByLiteApiId = vi.fn();
    const loggerInfo = vi.fn();

    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/webhook-idempotency', () => ({
      claimWebhookEvent: vi.fn().mockResolvedValue(true),
      finalizeWebhookEvent: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/booking/repository', () => ({
      updateBookingStatusByLiteApiId: updateByLiteApiId,
      updateBookingStatusByTransactionId: vi.fn().mockResolvedValue(false),
      persistBooking: vi.fn().mockResolvedValue(null)
    }));
    vi.doMock('@/server/payment-logs-repository', () => ({
      insertPaymentLog: vi.fn().mockResolvedValue('payment-log-1')
    }));
    vi.doMock('@/server/logger', () => ({
      logger: { info: loggerInfo, warn: vi.fn() },
      logStructuredEvent: vi.fn()
    }));

    const raw = JSON.stringify({
      id: 'evt-unsupported',
      type: 'booking_notice',
      data: {
        bookingId: 'lite-booking-1',
        status: 'queued_for_manual_review'
      }
    });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac('sha256', process.env.LITEAPI_WEBHOOK_SECRET).update(`${timestamp}.${raw}`).digest('hex');

    const { POST } = await import('@/app/api/webhooks/liteapi/route');
    const req = {
      headers: new Headers({
        'x-liteapi-signature': signature,
        'x-liteapi-timestamp': timestamp,
        'x-request-id': 'rid-unsupported'
      }),
      text: async () => raw
    } as unknown as Request;

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ignored).toBe(true);
    expect(updateByLiteApiId).not.toHaveBeenCalled();
    expect(loggerInfo).toHaveBeenCalled();
  });

  it('webhook route returns 500 when reconciliation persistence fails', async () => {
    process.env.LITEAPI_WEBHOOK_SECRET = 'test-webhook-secret';
    process.env.QUOTE_SIGNING_SECRET = 'replace-with-strong-quote-signing-secret';
    process.env.LITEAPI_API_KEY = 'test';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';

    const claimWebhookEvent = vi.fn().mockResolvedValue(true);
    const finalizeWebhookEvent = vi.fn().mockResolvedValue(undefined);
    const loggerWarn = vi.fn();

    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/webhook-idempotency', () => ({
      claimWebhookEvent,
      finalizeWebhookEvent
    }));
    vi.doMock('@/server/booking/repository', () => ({
      updateBookingStatusByLiteApiId: vi.fn().mockResolvedValue(false),
      updateBookingStatusByTransactionId: vi.fn().mockResolvedValue(false),
      persistBooking: vi.fn().mockResolvedValue(null)
    }));
    vi.doMock('@/server/payment-logs-repository', () => ({
      insertPaymentLog: vi.fn().mockResolvedValue('payment-log-1')
    }));
    vi.doMock('@/server/logger', () => ({
      logger: { info: vi.fn(), warn: loggerWarn },
      logStructuredEvent: vi.fn()
    }));

    const raw = JSON.stringify({
      id: 'evt-persist-fail',
      type: 'booking_confirmed',
      data: {
        bookingId: 'lite-booking-fail',
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
        'x-request-id': 'rid-persist-fail'
      }),
      text: async () => raw
    } as unknown as Request;

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toMatch(/reconciliation failed/i);
    expect(claimWebhookEvent).toHaveBeenCalledOnce();
    expect(finalizeWebhookEvent).not.toHaveBeenCalled();
    expect(loggerWarn).toHaveBeenCalled();
  });

  it('emits booking.prebook.failed structured event when prebook route throws', async () => {
    const logStructuredEvent = vi.fn();

    vi.doMock('@/server/logger', () => ({
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn() },
      logStructuredEvent
    }));
    vi.doMock('@sentry/nextjs', () => ({
      captureException: vi.fn()
    }));
    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockRejectedValue(new Error('rate limit failed'))
    }));

    const { POST } = await import('@/app/api/booking/prebook/route');
    const req = {
      url: 'https://example.com/api/booking/prebook',
      headers: new Headers({ origin: 'https://example.com', 'x-request-id': 'cid-prebook-err' }),
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
    expect(res.status).toBe(500);

    const failedCalls = logStructuredEvent.mock.calls.filter(
      (c: unknown[]) => c[1] === 'booking.prebook.failed'
    );
    expect(failedCalls.length).toBe(1);
    expect(failedCalls[0][0]).toBe('error');
    expect(failedCalls[0][2]).toMatchObject({
      route: 'booking-prebook',
      module: 'booking.prebook'
    });
  });

  it('emits booking.finalize.failed structured event when book route throws', async () => {
    const logStructuredEvent = vi.fn();

    vi.doMock('@/server/logger', () => ({
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn() },
      logStructuredEvent
    }));
    vi.doMock('@sentry/nextjs', () => ({
      captureException: vi.fn()
    }));
    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockRejectedValue(new Error('rate limit failed'))
    }));

    const { POST } = await import('@/app/api/booking/book/route');
    const req = {
      url: 'https://example.com/api/booking/book',
      headers: new Headers({ origin: 'https://example.com', 'x-request-id': 'cid-book-err' }),
      json: async () => ({
        prebookId: 'pb-err',
        transactionId: 'tx-err',
        quoteSignature: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        holder: { firstName: 'A', lastName: 'B', email: 'a@b.com' },
        guests: [{ occupancyNumber: 1, firstName: 'A', lastName: 'B' }]
      })
    } as unknown as Request;

    const res = await POST(req as never);
    expect(res.status).toBe(500);

    const failedCalls = logStructuredEvent.mock.calls.filter(
      (c: unknown[]) => c[1] === 'booking.finalize.failed'
    );
    expect(failedCalls.length).toBe(1);
    expect(failedCalls[0][0]).toBe('error');
    expect(failedCalls[0][2]).toMatchObject({
      route: 'booking-book',
      module: 'booking.finalize'
    });
  });
});
