import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

describe('admin operations routes', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  function createSupabaseMock() {
    const bookings = [
      {
        id: 'booking-1',
        status: 'confirmed',
        metadata: {
          supportRequestedAt: new Date().toISOString(),
          supportForwarded: false,
          supportForwardError: 'bridge timeout'
        },
        created_at: new Date().toISOString(),
        total_amount: 100,
        commission_amount: 12,
        currency: 'USD'
      }
    ];

    const commissionTracking = [
      {
        booking_id: 'booking-1',
        gross_booking_value: 100,
        commission_percent: 12,
        commission_amount: 12,
        currency: 'USD',
        updated_at: new Date().toISOString()
      }
    ];

    const paymentLogs = [
      {
        booking_id: 'booking-1',
        provider: 'stripe',
        event_type: 'payment_intent.succeeded',
        status: 'confirmed',
        amount: 100,
        currency: 'USD',
        created_at: new Date().toISOString()
      }
    ];

    return {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'admin-1', app_metadata: { role: 'admin' } } }
        })
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'admin_users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null })
              })
            })
          };
        }
        if (table === 'bookings') {
          return {
            select: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: bookings })
                }),
                order: vi.fn().mockResolvedValue({ data: bookings })
              })
            })
          };
        }
        if (table === 'commission_tracking') {
          return {
            select: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: commissionTracking })
                })
              }),
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: commissionTracking })
              })
            })
          };
        }
        if (table === 'payment_logs') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: paymentLogs })
              })
            })
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
            })
          })
        };
      })
    };
  }

  it('returns support sla summary for admin', async () => {
    vi.doMock('@/server/supabase/server', () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue(createSupabaseMock())
    }));

    const { GET } = await import('@/app/api/admin/support/sla/route');
    const req = new NextRequest('http://localhost/api/admin/support/sla?days=30&breachHours=24&page=1&limit=1');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.summary.totalCases).toBeGreaterThanOrEqual(1);
    expect(json.pagination.limit).toBe(1);
    expect(json.cases.length).toBe(1);
  });

  it('returns 503 when support sla bookings query fails', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'admin-1', app_metadata: { role: 'admin' } } }
        })
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'admin_users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null })
              })
            })
          };
        }
        if (table === 'bookings') {
          return {
            select: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: null, error: { message: 'database timeout' } })
              })
            })
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
            })
          })
        };
      })
    };

    vi.doMock('@/server/supabase/server', () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue(supabase)
    }));

    const { GET } = await import('@/app/api/admin/support/sla/route');
    const req = new NextRequest('http://localhost/api/admin/support/sla?days=30&breachHours=24');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.error).toContain('Failed to load bookings');
  });

  it('returns readiness gate payload', async () => {
    vi.doMock('@/server/supabase/server', () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue(createSupabaseMock())
    }));
    vi.doMock('@/server/admin/reconciliation-report', () => ({
      buildReconciliationReport: vi.fn().mockResolvedValue({
        periodDays: 30,
        summary: {
          confirmedCount: 1,
          reconciledCount: 1,
          pendingCount: 0,
          mismatchCount: 0,
          openIssueCount: 0,
          resolvedIssueCount: 0,
          grossConfirmedAmount: 100,
          expectedCommissionAmount: 12,
          recordedCommissionAmount: 12,
          varianceAmount: 0,
          coveragePercent: 100
        },
        issues: [],
        processing: {
          truncated: false,
          truncationReason: 'none',
          scannedBookings: 1,
          maxScannedBookings: 5000,
          returnedIssues: 0,
          maxIssues: 200,
          commissionQueryBatches: 1,
          maxCommissionIdsPerBatch: 200
        }
      })
    }));
    vi.doMock('@/server/admin/support-sla-report', () => ({
      buildSupportSlaReport: vi.fn().mockResolvedValue({
        periodDays: 30,
        breachHours: 24,
        summary: {
          totalCases: 1,
          openCases: 1,
          forwardedCases: 0,
          forwardingFailures: 0,
          breachCount: 0,
          averageAgeHours: 1
        },
        cases: []
      })
    }));
    vi.doMock('@/server/admin/settlement-ledger-report', () => ({
      buildSettlementLedgerReport: vi.fn().mockResolvedValue({
        periodDays: 30,
        summary: {
          totalRows: 1,
          settledRows: 1,
          awaitingTrackingRows: 0,
          awaitingPaymentRows: 0,
          exceptionRows: 0
        },
        ledger: []
      })
    }));

    const { GET } = await import('@/app/api/admin/readiness/route');
    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(typeof json.overallPassed).toBe('boolean');
    expect(Array.isArray(json.gates)).toBe(true);
  });
});
