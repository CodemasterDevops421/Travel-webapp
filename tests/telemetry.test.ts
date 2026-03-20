import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('telemetry sink', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('stores fallback telemetry in test mode and returns latest snapshot', async () => {
    const { emitTelemetryEvent, getTelemetrySnapshot, __unsafeResetTelemetryForTests } = await import('@/server/observability/telemetry');
    __unsafeResetTelemetryForTests();
    await emitTelemetryEvent({
      category: 'recovery',
      metric: 'outbox_dead_letter',
      value: 2
    });
    await emitTelemetryEvent({
      category: 'recovery',
      metric: 'outbox_dead_letter',
      value: 3
    });

    const snapshot = await getTelemetrySnapshot(['outbox_dead_letter'], 'recovery');
    expect(snapshot.values.outbox_dead_letter).toBe(3);
  });

  it('emits structured observability logs for telemetry events', async () => {
    const logStructuredEvent = vi.fn();
    vi.doMock('@/server/logger', () => ({
      logStructuredEvent
    }));

    const { emitTelemetryEvent, __unsafeResetTelemetryForTests } = await import('@/server/observability/telemetry');
    __unsafeResetTelemetryForTests();
    await emitTelemetryEvent({
      category: 'readiness',
      metric: 'readiness.degraded',
      value: 1,
      status: 'fail'
    });

    expect(logStructuredEvent).toHaveBeenCalledWith(
      'info',
      'observability.telemetry.emitted',
      expect.objectContaining({
        category: 'readiness',
        metric: 'readiness.degraded',
        value: 1
      })
    );
  });
});
