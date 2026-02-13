import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { HttpError, RateLimitError, toHttpError } from '@/server/errors';

describe('error mapping', () => {
  it('maps zod errors to 400', () => {
    const schema = z.object({ id: z.string().min(1) });
    const result = schema.safeParse({ id: '' });
    if (result.success) {
      throw new Error('Expected parse failure');
    }

    const err = toHttpError(result.error);
    expect(err.status).toBe(400);
    expect(err.message).toBe('Invalid request payload');
  });

  it('preserves custom HTTP errors', () => {
    const err = toHttpError(new HttpError(418, 'teapot'));
    expect(err.status).toBe(418);
    expect(err.message).toBe('teapot');
  });

  it('creates rate-limit errors with 429', () => {
    const err = new RateLimitError();
    expect(err.status).toBe(429);
  });
});
