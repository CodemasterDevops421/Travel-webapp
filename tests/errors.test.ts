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
});
