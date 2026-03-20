import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('recovery sweeps', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    const { __unsafeResetRecoveryObservabilityForTests } = await import('@/server/ops/recovery-observability');
    __unsafeResetRecoveryObservabilityForTests();
  });

  it('classifies stale booking_requested rows by reconciliation SLA', async () => {
    const updateBookingMetadataById = vi.fn().mockResolvedValue({ ok: true, reason: 'updated' });
    const now = Date.now();
    const bookingRows = [
      {
        id: 'booking-fresh',
        transaction_id: 'txn-fresh',
        status: 'booking_requested',
        payment_status: 'authorized',
        metadata: {},
        created_at: new Date(now - (10 * 60 * 1000)).toISOString()
      },
      {
        id: 'booking-stale',
        transaction_id: 'txn-stale',
        status: 'booking_requested',
        payment_status: 'authorized',
        metadata: {},
        created_at: new Date(now - (45 * 60 * 1000)).toISOString()
      }
    ];

    const outboxCounts = [1, 0, 0, 0];
    const createAdminClient = vi.fn().mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'bookings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((column: string) => {
                if (column === 'status') {
                  return {
                    order: vi.fn().mockReturnValue({
                      limit: vi.fn().mockResolvedValue({ data: bookingRows, error: null })
                    })
                  };
                }

                return {
                  in: vi.fn().mockReturnValue({
                    order: vi.fn().mockReturnValue({
                      limit: vi.fn().mockResolvedValue({ data: [], error: null })
                    })
                  })
                };
              })
            })
          };
        }

        if (table === 'booking_outbox_events') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation(() => ({
                lte: vi.fn().mockResolvedValue({ count: outboxCounts.shift() ?? 0, error: null })
              }))
            })
          };
        }

        if (table === 'promo_redemptions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({ count: 0, error: { code: '42P01' } })
              })
            })
          };
        }

        throw new Error(`Unexpected table ${table}`);
      })
    });

    vi.doMock('@/server/supabase/admin', () => ({
      createAdminClient
    }));
    vi.doMock('@/server/booking/repository', () => ({
      updateBookingMetadataById
    }));

    const { runRecoverySweeps } = await import('@/server/ops/reconciliation-sweeps');
    const result = await runRecoverySweeps(now);

    expect(result.bookingRequested.inspected).toBe(2);
    expect(result.bookingRequested.stillPendingWithinSla).toBe(1);
    expect(result.bookingRequested.escalatedManualReview).toBe(1);
    expect(updateBookingMetadataById).toHaveBeenCalledWith(
      'booking-stale',
      expect.objectContaining({
        reconciliation: expect.objectContaining({
          classification: 'escalated_manual_review'
        })
      })
    );
  });

  it('tracks captured payments without booking terminal outcome', async () => {
    const updateBookingMetadataById = vi.fn().mockResolvedValue({ ok: true, reason: 'updated' });
    const now = Date.now();
    const capturedRows = [
      {
        id: 'booking-captured',
        transaction_id: 'txn-cap',
        status: 'booking_requested',
        payment_status: 'captured',
        metadata: {},
        created_at: new Date(now - (50 * 60 * 1000)).toISOString()
      }
    ];

    const createAdminClient = vi.fn().mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'bookings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((column: string) => {
                if (column === 'status') {
                  return {
                    order: vi.fn().mockReturnValue({
                      limit: vi.fn().mockResolvedValue({ data: [], error: null })
                    })
                  };
                }

                return {
                  in: vi.fn().mockReturnValue({
                    order: vi.fn().mockReturnValue({
                      limit: vi.fn().mockResolvedValue({ data: capturedRows, error: null })
                    })
                  })
                };
              })
            })
          };
        }

        if (table === 'booking_outbox_events') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({ count: 0, error: null })
              })
            })
          };
        }

        if (table === 'promo_redemptions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({ count: 0, error: { code: '42P01' } })
              })
            })
          };
        }

        throw new Error(`Unexpected table ${table}`);
      })
    });

    vi.doMock('@/server/supabase/admin', () => ({
      createAdminClient
    }));
    vi.doMock('@/server/booking/repository', () => ({
      updateBookingMetadataById
    }));

    const { runRecoverySweeps } = await import('@/server/ops/reconciliation-sweeps');
    const result = await runRecoverySweeps(now);

    expect(result.capturedWithoutTerminalOutcome.inspected).toBe(1);
    expect(result.capturedWithoutTerminalOutcome.escalatedManualReview).toBe(1);
    expect(updateBookingMetadataById).toHaveBeenCalledWith(
      'booking-captured',
      expect.objectContaining({
        reconciliation: expect.objectContaining({
          reason: expect.stringContaining('Captured payment')
        })
      })
    );
  });
});
