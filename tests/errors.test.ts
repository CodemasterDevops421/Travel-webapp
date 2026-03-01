import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

describe('error mapping', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('maps zod errors to 400', async () => {
    const { toHttpError } = await import('@/server/errors');
    const schema = z.object({ id: z.string().min(1) });
    const result = schema.safeParse({ id: '' });
    if (result.success) {
      throw new Error('Expected parse failure');
    }

    const err = toHttpError(result.error);
    expect(err.status).toBe(400);
    expect(err.message).toBe('Invalid request payload');
  });

  it('preserves custom HTTP errors', async () => {
    const { HttpError, toHttpError } = await import('@/server/errors');
    const err = toHttpError(new HttpError(418, 'teapot'));
    expect(err.status).toBe(418);
    expect(err.message).toBe('teapot');
  });

  it('creates rate-limit errors with 429', async () => {
    const { RateLimitError } = await import('@/server/errors');
    const err = new RateLimitError();
    expect(err.status).toBe(429);
  });

  it('forwards captured errors to sentry with redacted metadata', async () => {
    const captureException = vi.fn();
    vi.doMock('@sentry/nextjs', () => ({
      captureException
    }));

    const { toHttpError } = await import('@/server/errors');
    toHttpError(new Error('boom'), {
      route: 'webhook-stripe',
      event: 'webhook.stripe.failed',
      correlationId: 'cid-1',
      metadata: {
        token: 'secret-token',
        nested: { apiKey: 'sensitive' },
        ok: 'safe'
      }
    });

    expect(captureException).toHaveBeenCalledOnce();
    const [, scope] = captureException.mock.calls[0] as [unknown, { extra?: Record<string, unknown> }];
    const metadata = (scope.extra?.metadata ?? {}) as Record<string, unknown>;
    expect(metadata.token).toBe('[REDACTED]');
    expect((metadata.nested as Record<string, unknown>).apiKey).toBe('[REDACTED]');
    expect(metadata.ok).toBe('safe');
  });

  it('passes route and module as Sentry tags for structured tracing', async () => {
    const captureException = vi.fn();
    vi.doMock('@sentry/nextjs', () => ({
      captureException
    }));

    const { toHttpError } = await import('@/server/errors');
    toHttpError(new Error('test-error'), {
      route: 'booking-prebook',
      module: 'booking.prebook',
      event: 'booking.prebook.failed',
      correlationId: 'cid-2'
    });

    expect(captureException).toHaveBeenCalledOnce();
    const [, scope] = captureException.mock.calls[0] as [unknown, { tags?: Record<string, unknown>; extra?: Record<string, unknown> }];
    expect(scope.tags).toMatchObject({
      event: 'booking.prebook.failed',
      route: 'booking-prebook',
      module: 'booking.prebook'
    });
    expect(scope.extra).toMatchObject({
      correlation_id: 'cid-2'
    });
  });

  it('does not throw when Sentry captureException is undefined', async () => {
    vi.doMock('@sentry/nextjs', () => ({
      captureException: undefined
    }));

    const { captureServerError } = await import('@/server/errors');
    expect(() => {
      captureServerError(new Error('test-graceful'), {
        route: 'booking-book',
        module: 'booking.finalize'
      });
    }).not.toThrow();
  });

  it('handles non-Error exceptions safely', async () => {
    const captureException = vi.fn();
    vi.doMock('@sentry/nextjs', () => ({
      captureException
    }));

    const { toHttpError } = await import('@/server/errors');
    const err = toHttpError('string-error', { route: 'test-route' });
    expect(err.status).toBe(500);
    expect(err.code).toBe('UNHANDLED_EXCEPTION');
    expect(captureException).toHaveBeenCalledOnce();
  });
});
