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
    const insertPaymentLog = vi.fn();

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
    vi.doMock('@/server/payment-logs-repository', () => ({
      insertPaymentLog
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
    expect(insertPaymentLog).not.toHaveBeenCalled();
  });

  it('reconciles verified payment events through transaction updates', async () => {
    const updateBookingStatusByTransactionId = vi.fn().mockResolvedValue(true);
    const insertPaymentLog = vi.fn().mockResolvedValue('payment-log-1');

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
    vi.doMock('@/server/payment-logs-repository', () => ({
      insertPaymentLog
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
    expect(insertPaymentLog).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'stripe',
      externalPaymentId: 'evt_success',
      status: 'confirmed'
    }));
    expect(updateBookingStatusByTransactionId).toHaveBeenCalledWith(
      'txn_123',
      'confirmed',
      expect.objectContaining({
        stripeEventId: 'evt_success',
        stripeEventType: 'payment_intent.succeeded',
        stripePaymentIntentId: 'pi_123',
        paymentStatus: 'captured',
        latestPaymentLogId: 'payment-log-1',
        paymentLogId: 'payment-log-1'
      })
    );
  });

  it('creates reconciliation booking record when transaction update misses', async () => {
    const updateBookingStatusByTransactionId = vi.fn().mockResolvedValue(false);
    const persistBooking = vi.fn().mockResolvedValue('booking_1');
    const insertPaymentLog = vi.fn().mockResolvedValue('payment-log-2');

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
    vi.doMock('@/server/payment-logs-repository', () => ({
      insertPaymentLog
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
        stripePaymentIntentId: 'pi_123',
        latestPaymentLogId: 'payment-log-2',
        paymentLogId: 'payment-log-2'
      })
    }));
  });

  it('preserves zero-decimal currency amounts for webhook payment logs', async () => {
    const updateBookingStatusByTransactionId = vi.fn().mockResolvedValue(true);
    const insertPaymentLog = vi.fn().mockResolvedValue('payment-log-jpy');

    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/payments/stripe', () => ({
      constructStripeEvent: vi.fn().mockReturnValue({
        id: 'evt_jpy_success',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_jpy_123',
            amount: 5000,
            currency: 'jpy',
            metadata: { transactionId: 'txn_jpy_123' },
            customer: 'cus_jpy_123'
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
    vi.doMock('@/server/payment-logs-repository', () => ({
      insertPaymentLog
    }));

    const { POST } = await import('@/app/api/webhooks/stripe/route');
    const req = {
      headers: new Headers({ 'stripe-signature': 'sig' }),
      text: async () => '{"id":"evt_jpy_success"}'
    } as unknown as Request;

    const res = await POST(req as never);

    expect(res.status).toBe(200);
    expect(insertPaymentLog).toHaveBeenCalledWith(expect.objectContaining({
      amount: 5000,
      currency: 'JPY',
      externalPaymentId: 'evt_jpy_success'
    }));
  });

  it('captures centralized error telemetry when webhook processing throws', async () => {
    const captureException = vi.fn();

    vi.doMock('@sentry/nextjs', () => ({
      captureException
    }));
    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockRejectedValue(new Error('rate limit backend down'))
    }));

    const { POST } = await import('@/app/api/webhooks/stripe/route');
    const req = {
      headers: new Headers({
        'stripe-signature': 'sig',
        'x-request-id': 'cid-webhook-1'
      }),
      text: async () => '{"id":"evt_failure"}'
    } as unknown as Request;

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toMatch(/internal server error/i);
    expect(captureException).toHaveBeenCalledOnce();
    const [, scope] = captureException.mock.calls[0] as [unknown, { tags?: Record<string, unknown>; extra?: Record<string, unknown> }];
    expect(scope.tags).toMatchObject({
      event: 'webhook.stripe.failed',
      route: 'webhook-stripe'
    });
    const metadata = (scope.extra?.metadata ?? {}) as Record<string, unknown>;
    expect(metadata.transactionId ?? null).toBeNull();
    expect(metadata.stripeEventId ?? null).toBeNull();
    expect(metadata['stripe-signature']).toBeUndefined();
    expect(metadata.authorization).toBeUndefined();
  });

  it('emits webhook.stripe.reconciled structured event on successful reconciliation', async () => {
    const logStructuredEvent = vi.fn();

    vi.doMock('@/server/logger', () => ({
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn() },
      logStructuredEvent
    }));
    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/payments/stripe', () => ({
      constructStripeEvent: vi.fn().mockReturnValue({
        id: 'evt_structured',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_s',
            metadata: { transactionId: 'txn_s' },
            customer: null,
            amount: 5000,
            currency: 'usd'
          }
        }
      })
    }));
    vi.doMock('@/server/webhook-idempotency', () => ({
      claimWebhookEvent: vi.fn().mockResolvedValue(true),
      finalizeWebhookEvent: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/booking/repository', () => ({
      updateBookingStatusByTransactionId: vi.fn().mockResolvedValue(true),
      persistBooking: vi.fn()
    }));
    vi.doMock('@/server/payment-logs-repository', () => ({
      insertPaymentLog: vi.fn().mockResolvedValue('plog-1')
    }));

    const { POST } = await import('@/app/api/webhooks/stripe/route');
    const req = {
      headers: new Headers({ 'stripe-signature': 'sig', 'x-request-id': 'cid-sr-1' }),
      text: async () => '{"id":"evt_structured"}'
    } as unknown as Request;

    const res = await POST(req as never);
    expect(res.status).toBe(200);

    const reconciledCalls = logStructuredEvent.mock.calls.filter(
      (c: unknown[]) => c[1] === 'webhook.stripe.reconciled'
    );
    expect(reconciledCalls.length).toBe(1);
    expect(reconciledCalls[0][2]).toMatchObject({
      route: 'webhook-stripe',
      module: 'webhook.stripe',
      event_id: 'evt_structured',
      booking_status: 'confirmed'
    });
  });

  it('emits webhook.stripe.failed structured event when processing throws', async () => {
    const logStructuredEvent = vi.fn();

    vi.doMock('@/server/logger', () => ({
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn() },
      logStructuredEvent
    }));
    vi.doMock('@sentry/nextjs', () => ({
      captureException: vi.fn()
    }));
    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockRejectedValue(new Error('rate limit down'))
    }));

    const { POST } = await import('@/app/api/webhooks/stripe/route');
    const req = {
      headers: new Headers({ 'stripe-signature': 'sig', 'x-request-id': 'cid-sf-1' }),
      text: async () => '{"id":"evt_fail_structured"}'
    } as unknown as Request;

    const res = await POST(req as never);
    expect(res.status).toBe(500);

    const failedCalls = logStructuredEvent.mock.calls.filter(
      (c: unknown[]) => c[1] === 'webhook.stripe.failed'
    );
    expect(failedCalls.length).toBe(1);
    expect(failedCalls[0][0]).toBe('error');
    expect(failedCalls[0][2]).toMatchObject({
      route: 'webhook-stripe',
      module: 'webhook.stripe'
    });
  });
});
