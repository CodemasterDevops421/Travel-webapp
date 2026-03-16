import { describe, expect, it, vi } from 'vitest';

async function loadCsrfModule(envOverrides: Record<string, string>) {
  vi.resetModules();
  vi.doMock('@/server/env', async () => {
    const actual = await vi.importActual<typeof import('@/server/env')>('@/server/env');
    return {
      ...actual,
      env: {
        ...actual.env,
        NODE_ENV: envOverrides.NODE_ENV ?? 'production',
        NEXT_PUBLIC_APP_URL: envOverrides.NEXT_PUBLIC_APP_URL ?? 'https://app.travel.test'
      }
    };
  });

  return import('@/server/csrf');
}

describe('csrf guards', () => {
  it('allows same-origin requests', async () => {
    const { assertSameOrigin } = await loadCsrfModule({ NODE_ENV: 'production' });
    const request = new Request('https://app.travel.test/api/booking/book', {
      method: 'POST',
      headers: {
        origin: 'https://app.travel.test',
        cookie: 'csrf_token=test-token',
        'x-csrf-token': 'test-token'
      }
    });

    expect(() => assertSameOrigin(request)).not.toThrow();
  });

  it('blocks cross-site origin headers', async () => {
    const { assertSameOrigin } = await loadCsrfModule({ NODE_ENV: 'production' });
    const request = new Request('https://app.travel.test/api/booking/book', {
      method: 'POST',
      headers: {
        origin: 'https://evil.test',
        cookie: 'csrf_token=test-token',
        'x-csrf-token': 'test-token'
      }
    });

    expect(() => assertSameOrigin(request)).toThrow(/cross-site request blocked/i);
  });

  it('requires an origin header outside tests', async () => {
    const { assertSameOrigin } = await loadCsrfModule({ NODE_ENV: 'production' });
    const request = new Request('https://app.travel.test/api/booking/book', {
      method: 'POST',
      headers: {
        cookie: 'csrf_token=test-token',
        'x-csrf-token': 'test-token'
      }
    });

    expect(() => assertSameOrigin(request)).toThrow(/origin header is required/i);
  });

  it('requires a matching csrf token for mutating requests', async () => {
    const { assertSameOrigin } = await loadCsrfModule({ NODE_ENV: 'production' });
    const request = new Request('https://app.travel.test/api/booking/book', {
      method: 'POST',
      headers: {
        origin: 'https://app.travel.test',
        cookie: 'csrf_token=test-token',
        'x-csrf-token': 'wrong-token'
      }
    });

    expect(() => assertSameOrigin(request)).toThrow(/invalid csrf token/i);
  });

  it('skips enforcement in test mode', async () => {
    const { assertSameOrigin } = await loadCsrfModule({ NODE_ENV: 'test' });
    const request = new Request('https://app.travel.test/api/booking/book', {
      method: 'POST'
    });

    expect(() => assertSameOrigin(request)).not.toThrow();
  });
});
