import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

describe('internal job routes', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.BOOKING_API_AUTH_SECRET = 'abcdefghijklmnopqrstuvwxyz123456';
  });

  it('rejects unauthorized outbox processing requests', async () => {
    const { POST } = await import('@/app/api/internal/jobs/process-outbox/route');
    const response = await POST(new NextRequest('http://localhost/api/internal/jobs/process-outbox', {
      method: 'POST'
    }));

    expect(response.status).toBe(401);
  });

  it('runs recovery sweeps when internal secret is provided', async () => {
    vi.doMock('@/server/ops/reconciliation-sweeps', () => ({
      runRecoverySweeps: vi.fn().mockResolvedValue({
        bookingRequested: { inspected: 1, autoRecovered: 0, stillPendingWithinSla: 1, escalatedManualReview: 0, unrecoverableDeadLetter: 0 },
        capturedWithoutTerminalOutcome: { inspected: 0, autoRecovered: 0, stillPendingWithinSla: 0, escalatedManualReview: 0, unrecoverableDeadLetter: 0 },
        staleOutboxProcessing: { reclaimedCandidates: 0, deadLetterCount: 0, pendingCount: 0, processingCount: 0 },
        promoExpiry: { inspected: 0, expiredReservations: 0, skipped: true, reason: 'not-enabled' },
        checkedAt: new Date().toISOString()
      })
    }));

    const { POST } = await import('@/app/api/internal/jobs/run-recovery-sweeps/route');
    const response = await POST(new NextRequest('http://localhost/api/internal/jobs/run-recovery-sweeps', {
      method: 'POST',
      headers: {
        'x-internal-job-secret': process.env.BOOKING_API_AUTH_SECRET!
      }
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.bookingRequested.inspected).toBe(1);
  });
});
