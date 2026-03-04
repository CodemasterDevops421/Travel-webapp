import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('ops health routes', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('healthz returns alive status', async () => {
    const { GET } = await import('@/app/api/healthz/route');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.status).toBe('alive');
    expect(typeof body.timestamp).toBe('string');
  });

  it('readyz returns 503 when readiness report fails', async () => {
    vi.doMock('@/server/ops/readiness', () => ({
      buildReadinessReport: vi.fn().mockResolvedValue({
        ok: false,
        checkedAt: new Date().toISOString(),
        checks: [{ id: 'redis', status: 'fail', latencyMs: 12, message: 'connection refused' }]
      })
    }));

    const { GET } = await import('@/app/api/readyz/route');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.ok).toBe(false);
    expect(Array.isArray(body.checks)).toBe(true);
  });
});
