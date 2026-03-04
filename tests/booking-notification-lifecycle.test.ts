import { beforeEach, describe, expect, it, vi } from 'vitest';

function seedRequiredEnv() {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('PAYMENT_PROVIDER', 'hybrid');
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
  process.env.STRIPE_SECRET_KEY = 'sk_test_123';
}

describe('booking notification lifecycle', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    seedRequiredEnv();
  });

  it('cancels captured bookings with refund and invoice-status sync', async () => {
    const getBookingById = vi.fn().mockResolvedValue({
      id: 'booking_1',
      liteapi_booking_id: 'lite_1',
      status: 'confirmed',
      payment_status: 'captured',
      stripe_payment_intent_id: 'pi_123'
    });
    const updateBookingStatusById = vi.fn().mockResolvedValue(true);
    const cancelBooking = vi.fn().mockResolvedValue({ ok: true });
    const createStripeRefund = vi.fn().mockResolvedValue({
      refundId: 're_123',
      status: 'succeeded',
      paymentIntentId: 'pi_123'
    });

    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/authz', () => ({
      assertBookingApiAuthorized: vi.fn()
    }));
    vi.doMock('@/server/request', () => ({
      getClientIp: vi.fn().mockReturnValue('127.0.0.1')
    }));
    vi.doMock('@/server/liteapi', () => ({ cancelBooking }));
    vi.doMock('@/server/payments/stripe', () => ({ createStripeRefund }));
    vi.doMock('@/server/booking/repository', () => ({
      getBookingById,
      updateBookingStatusById
    }));

    const { POST } = await import('@/app/api/bookings/[bookingId]/cancel/route');
    const request = {
      headers: new Headers(),
      json: async () => ({ reason: 'Guest requested cancellation' })
    } as unknown as Request;

    const response = await POST(request as never, {
      params: Promise.resolve({ bookingId: 'booking_1' })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(cancelBooking).toHaveBeenCalledWith({ bookingId: 'lite_1' });
    expect(createStripeRefund).toHaveBeenCalledWith(
      expect.objectContaining({ paymentIntentId: 'pi_123' })
    );
    expect(updateBookingStatusById).toHaveBeenCalledWith(
      'booking_1',
      'confirmed',
      expect.objectContaining({
        cancellationOutcome: 'refund_pending_webhook',
        refundPending: true,
        stripeRefundId: 're_123'
      })
    );
    expect(body.status).toBe('confirmed');
    expect(body.cancellationOutcome).toBe('refund_pending_webhook');
    expect(body.invoiceStatus).toBe('paid');
  });

  it('cancels captured bookings in liteapi mode without requiring stripe refund ids', async () => {
    vi.stubEnv('PAYMENT_PROVIDER', 'liteapi');

    const getBookingById = vi.fn().mockResolvedValue({
      id: 'booking_1',
      liteapi_booking_id: 'lite_1',
      status: 'confirmed',
      payment_status: 'captured',
      stripe_payment_intent_id: null
    });
    const updateBookingStatusById = vi.fn().mockResolvedValue(true);
    const cancelBooking = vi.fn().mockResolvedValue({ ok: true });
    const createStripeRefund = vi.fn();

    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/authz', () => ({
      assertBookingApiAuthorized: vi.fn()
    }));
    vi.doMock('@/server/request', () => ({
      getClientIp: vi.fn().mockReturnValue('127.0.0.1')
    }));
    vi.doMock('@/server/liteapi', () => ({ cancelBooking }));
    vi.doMock('@/server/payments/stripe', () => ({ createStripeRefund }));
    vi.doMock('@/server/booking/repository', () => ({
      getBookingById,
      updateBookingStatusById
    }));

    const { POST } = await import('@/app/api/bookings/[bookingId]/cancel/route');
    const request = {
      headers: new Headers(),
      json: async () => ({ reason: 'Guest requested cancellation' })
    } as unknown as Request;

    const response = await POST(request as never, {
      params: Promise.resolve({ bookingId: 'booking_1' })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(cancelBooking).toHaveBeenCalledWith({ bookingId: 'lite_1' });
    expect(createStripeRefund).not.toHaveBeenCalled();
    expect(updateBookingStatusById).toHaveBeenCalledWith(
      'booking_1',
      'confirmed',
      expect.objectContaining({
        cancellationOutcome: 'liteapi_refund_managed',
        refundPending: true,
        refundManagedBy: 'liteapi'
      })
    );
    expect(body.cancellationOutcome).toBe('liteapi_refund_managed');
    expect(body.invoiceStatus).toBe('pending_refund');
  });

  it('emits lifecycle emails once per booking transition and keeps invoice status aligned', async () => {
    const sendLifecycleEmail = vi.fn().mockResolvedValue(undefined);

    vi.doUnmock('@/server/booking/repository');
    vi.doUnmock('@/server/liteapi');
    vi.doUnmock('@/server/payments/stripe');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');

    vi.doMock('@/server/supabase/admin', () => ({
      createAdminClient: vi.fn(() => ({
        from: vi.fn(() => ({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST205', message: 'missing booking schema' }
              })
            }))
          }))
        }))
      }))
    }));
    vi.doMock('@/server/logger', () => ({
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
    }));
    vi.doMock('@/server/commission-tracking-repository', () => ({
      upsertCommissionTracking: vi.fn().mockResolvedValue('commission-1')
    }));
    vi.doMock('@/server/notifications/email', () => ({ sendLifecycleEmail }));

    const repo = await import('@/server/booking/repository');
    const outbox = await import('@/server/booking/outbox');

    outbox.resetBookingOutboxForTests();

    const bookingId = await repo.persistBooking({
      quoteId: 'quote-1',
      liteApiBookingId: 'lite-booking-1',
      status: 'pending',
      metadata: {
        transactionId: 'txn-1',
        paymentStatus: 'pending',
        itinerary: {
          totalAmount: 500,
          currency: 'USD'
        },
        stayDates: {
          checkIn: '2026-06-10',
          checkOut: '2026-06-12'
        },
        holder: {
          email: 'guest@example.com'
        }
      }
    });

    expect(bookingId).toBeTypeOf('string');

    const authorized = await repo.updateBookingStatusByTransactionId('txn-1', 'payment_authorized', {
      paymentStatus: 'authorized',
      stripeEventId: 'evt_checkout_1',
      stripeEventType: 'checkout.session.completed'
    });
    expect(authorized).toBe(true);

    const confirmedFirst = await repo.updateBookingStatusByTransactionId('txn-1', 'confirmed', {
      paymentStatus: 'captured',
      confirmationCode: 'CONF-123',
      stripeEventId: 'evt_payment_1',
      stripeEventType: 'payment_intent.succeeded'
    });
    expect(confirmedFirst).toBe(true);

    const confirmedSecond = await repo.updateBookingStatusByTransactionId('txn-1', 'confirmed', {
      paymentStatus: 'captured',
      confirmationCode: 'CONF-123',
      stripeEventId: 'evt_payment_2',
      stripeEventType: 'payment_intent.succeeded'
    });
    expect(confirmedSecond).toBe(true);

    await outbox.waitForBookingOutboxDrain();

    expect(sendLifecycleEmail).toHaveBeenCalledTimes(1);
    expect(sendLifecycleEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId,
        transition: 'confirmed',
        invoiceStatus: 'paid'
      })
    );

    const booking = await repo.getBookingById(bookingId as string);
    expect(booking?.metadata).toMatchObject({
      invoiceStatus: 'paid',
      paymentStatus: 'captured'
    });
  });

  it('allows first-party cancellation with booking view token when booking API key is absent', async () => {
    const getBookingById = vi.fn().mockResolvedValue({
      id: 'booking_1',
      liteapi_booking_id: 'lite_1',
      status: 'confirmed',
      payment_status: 'captured',
      stripe_payment_intent_id: 'pi_123'
    });
    const updateBookingStatusById = vi.fn().mockResolvedValue(true);
    const cancelBooking = vi.fn().mockResolvedValue({ ok: true });
    const createStripeRefund = vi.fn().mockResolvedValue({
      refundId: 're_123',
      status: 'succeeded',
      paymentIntentId: 'pi_123'
    });

    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/authz', async () => {
      const { HttpError } = await import('@/server/errors');
      return {
        assertBookingApiAuthorized: vi.fn(() => {
          throw new HttpError(401, 'Unauthorized booking API request.');
        })
      };
    });
    vi.doMock('@/server/request', () => ({
      getClientIp: vi.fn().mockReturnValue('127.0.0.1')
    }));
    vi.doMock('@/server/liteapi', () => ({ cancelBooking }));
    vi.doMock('@/server/payments/stripe', () => ({ createStripeRefund }));
    vi.doMock('@/server/booking/repository', () => ({
      getBookingById,
      updateBookingStatusById
    }));

    const { signBookingViewToken } = await import('@/server/booking-view-token');
    const { POST } = await import('@/app/api/bookings/[bookingId]/cancel/route');
    const request = {
      headers: new Headers({
        'x-booking-view-token': signBookingViewToken({ bookingId: 'booking_1' })
      }),
      json: async () => ({ reason: 'Guest requested cancellation' })
    } as unknown as Request;

    const response = await POST(request as never, {
      params: Promise.resolve({ bookingId: 'booking_1' })
    });

    expect(response.status).toBe(200);
    expect(cancelBooking).toHaveBeenCalledWith({ bookingId: 'lite_1' });
  });

  it('fails cancellation in liteapi mode when supplier booking id is missing', async () => {
    vi.stubEnv('PAYMENT_PROVIDER', 'liteapi');

    const getBookingById = vi.fn().mockResolvedValue({
      id: 'booking_1',
      liteapi_booking_id: null,
      status: 'confirmed',
      payment_status: 'captured',
      stripe_payment_intent_id: null
    });

    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/authz', () => ({
      assertBookingApiAuthorized: vi.fn()
    }));
    vi.doMock('@/server/request', () => ({
      getClientIp: vi.fn().mockReturnValue('127.0.0.1')
    }));
    vi.doMock('@/server/liteapi', () => ({ cancelBooking: vi.fn() }));
    vi.doMock('@/server/payments/stripe', () => ({ createStripeRefund: vi.fn() }));
    vi.doMock('@/server/booking/repository', () => ({
      getBookingById,
      updateBookingStatusById: vi.fn()
    }));

    const { POST } = await import('@/app/api/bookings/[bookingId]/cancel/route');
    const request = {
      headers: new Headers(),
      json: async () => ({ reason: 'Guest requested cancellation' })
    } as unknown as Request;

    const response = await POST(request as never, {
      params: Promise.resolve({ bookingId: 'booking_1' })
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toMatch(/supplier booking id is missing/i);
  });

  it('rejects cancellation when API key and booking view token are both missing', async () => {
    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/authz', async () => {
      const { HttpError } = await import('@/server/errors');
      return {
        assertBookingApiAuthorized: vi.fn(() => {
          throw new HttpError(401, 'Unauthorized booking API request.');
        })
      };
    });
    vi.doMock('@/server/request', () => ({
      getClientIp: vi.fn().mockReturnValue('127.0.0.1')
    }));
    vi.doMock('@/server/liteapi', () => ({
      cancelBooking: vi.fn().mockResolvedValue({ ok: true })
    }));
    vi.doMock('@/server/payments/stripe', () => ({
      createStripeRefund: vi.fn().mockResolvedValue({ refundId: 're_1' })
    }));
    vi.doMock('@/server/booking/repository', () => ({
      getBookingById: vi.fn(),
      updateBookingStatusById: vi.fn()
    }));

    const { POST } = await import('@/app/api/bookings/[bookingId]/cancel/route');
    const request = {
      headers: new Headers(),
      json: async () => ({ reason: 'Guest requested cancellation' })
    } as unknown as Request;

    const response = await POST(request as never, {
      params: Promise.resolve({ bookingId: 'booking_1' })
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toMatch(/unauthorized booking api request/i);
  });
});
