import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('stripe webhook route', () => {
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
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';
  });

  it('rejects invalid signatures', async () => {
    const claimWebhookEvent = vi.fn();
    const finalizeWebhookEvent = vi.fn();

    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/payments/stripe', () => ({
      constructStripeEvent: vi.fn().mockImplementation(() => {
        throw new Error('bad signature');
      })
    }));
    vi.doMock('@/server/webhook-idempotency', () => ({
      claimWebhookEvent,
      finalizeWebhookEvent
    }));

    const { POST } = await import('@/app/api/webhooks/stripe/route');
    const req = {
      headers: new Headers({ 'stripe-signature': 'sig' }),
      text: async () => '{"id":"evt_1"}'
    } as unknown as Request;

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toMatch(/invalid webhook signature/i);
    expect(claimWebhookEvent).not.toHaveBeenCalled();
  });

  it('ignores duplicate events by Stripe event id', async () => {
    const updateBookingStatusByTransactionId = vi.fn();
    const persistBooking = vi.fn();

    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/payments/stripe', () => ({
      constructStripeEvent: vi.fn().mockReturnValue({
        id: 'evt_duplicate',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123',
            metadata: { transactionId: 'txn_123' },
            customer: null
          }
        }
      })
    }));
    vi.doMock('@/server/webhook-idempotency', () => ({
      claimWebhookEvent: vi.fn().mockResolvedValue(false),
      finalizeWebhookEvent: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/booking/repository', () => ({
      updateBookingStatusByTransactionId,
      persistBooking
    }));

    const { POST } = await import('@/app/api/webhooks/stripe/route');
    const req = {
      headers: new Headers({ 'stripe-signature': 'sig' }),
      text: async () => '{"id":"evt_duplicate"}'
    } as unknown as Request;

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.duplicate).toBe(true);
    expect(updateBookingStatusByTransactionId).not.toHaveBeenCalled();
    expect(persistBooking).not.toHaveBeenCalled();
  });

  it('reconciles verified payment events through transaction updates', async () => {
    const updateBookingStatusByTransactionId = vi.fn().mockResolvedValue(true);

    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/payments/stripe', () => ({
      constructStripeEvent: vi.fn().mockReturnValue({
        id: 'evt_success',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123',
            metadata: { transactionId: 'txn_123' },
            customer: 'cus_123'
          }
        }
      })
    }));
    vi.doMock('@/server/webhook-idempotency', () => ({
      claimWebhookEvent: vi.fn().mockResolvedValue(true),
      finalizeWebhookEvent: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/booking/repository', () => ({
      updateBookingStatusByTransactionId,
      persistBooking: vi.fn().mockResolvedValue(null)
    }));

    const { POST } = await import('@/app/api/webhooks/stripe/route');
    const req = {
      headers: new Headers({ 'stripe-signature': 'sig' }),
      text: async () => '{"id":"evt_success"}'
    } as unknown as Request;

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.received).toBe(true);
    expect(updateBookingStatusByTransactionId).toHaveBeenCalledWith(
      'txn_123',
      'confirmed',
      expect.objectContaining({
        stripeEventId: 'evt_success',
        stripeEventType: 'payment_intent.succeeded',
        stripePaymentIntentId: 'pi_123',
        paymentStatus: 'captured'
      })
    );
  });

  it('creates reconciliation booking record when transaction update misses', async () => {
    const updateBookingStatusByTransactionId = vi.fn().mockResolvedValue(false);
    const persistBooking = vi.fn().mockResolvedValue('booking_1');

    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/payments/stripe', () => ({
      constructStripeEvent: vi.fn().mockReturnValue({
        id: 'evt_checkout',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_123',
            payment_intent: 'pi_123',
            customer: 'cus_123',
            client_reference_id: 'txn_456',
            metadata: { transactionId: 'txn_456' }
          }
        }
      })
    }));
    vi.doMock('@/server/webhook-idempotency', () => ({
      claimWebhookEvent: vi.fn().mockResolvedValue(true),
      finalizeWebhookEvent: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/booking/repository', () => ({
      updateBookingStatusByTransactionId,
      persistBooking
    }));

    const { POST } = await import('@/app/api/webhooks/stripe/route');
    const req = {
      headers: new Headers({ 'stripe-signature': 'sig' }),
      text: async () => '{"id":"evt_checkout"}'
    } as unknown as Request;

    const res = await POST(req as never);

    expect(res.status).toBe(200);
    expect(updateBookingStatusByTransactionId).toHaveBeenCalledOnce();
    expect(persistBooking).toHaveBeenCalledWith(expect.objectContaining({
      status: 'payment_authorized',
      metadata: expect.objectContaining({
        transactionId: 'txn_456',
        stripeCheckoutSessionId: 'cs_123',
        stripePaymentIntentId: 'pi_123'
      })
    }));
  });
});
