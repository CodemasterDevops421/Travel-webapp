import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('liteapi resilience helper', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('LITEAPI_TIMEOUT_MS', '1000');
    process.env.LITEAPI_API_KEY = 'test-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    process.env.QUOTE_SIGNING_SECRET = '1234567890abcdef';
  });

  it('retries transient supplier failures before succeeding', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('upstream down', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const { __unsafeFetchSupplierResponseForTests, __unsafeResetLiteApiCircuitBreakerForTests } = await import('@/server/liteapi');
    __unsafeResetLiteApiCircuitBreakerForTests();

    const response = await __unsafeFetchSupplierResponseForTests('https://supplier.example.com/test', undefined, {
      circuitKey: 'test:retry',
      retries: 1,
      retryDelayMs: 1,
      timeoutMs: 1000
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('opens the circuit after repeated supplier failures and fails fast', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('down', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const { __unsafeFetchSupplierResponseForTests, __unsafeResetLiteApiCircuitBreakerForTests } = await import('@/server/liteapi');
    __unsafeResetLiteApiCircuitBreakerForTests();

    await __unsafeFetchSupplierResponseForTests('https://supplier.example.com/test', undefined, {
      circuitKey: 'test:circuit',
      retries: 0,
      timeoutMs: 1000
    });
    await __unsafeFetchSupplierResponseForTests('https://supplier.example.com/test', undefined, {
      circuitKey: 'test:circuit',
      retries: 0,
      timeoutMs: 1000
    });
    await __unsafeFetchSupplierResponseForTests('https://supplier.example.com/test', undefined, {
      circuitKey: 'test:circuit',
      retries: 0,
      timeoutMs: 1000
    });

    await expect(
      __unsafeFetchSupplierResponseForTests('https://supplier.example.com/test', undefined, {
        circuitKey: 'test:circuit',
        retries: 0,
        timeoutMs: 1000
      })
    ).rejects.toMatchObject({ status: 503 });

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
