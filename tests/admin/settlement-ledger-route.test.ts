import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

describe('admin settlement ledger route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unmock('@/server/admin/settlement-ledger-report');
  });

  function createSupabaseMock() {
    const bookings = [
      {
        id: 'booking-1',
        status: 'confirmed',
        total_amount: 120,
        commission_amount: 14.4,
        currency: 'USD',
        payment_status: 'captured',
        liteapi_booking_id: 'lite-1',
        created_at: new Date().toISOString()
      }
    ];

    const commissions = [
      {
        booking_id: 'booking-1',
        gross_booking_value: 120,
        commission_amount: 14.4,
        currency: 'USD',
        updated_at: new Date().toISOString()
      }
    ];

    const payments = [
      {
        booking_id: 'booking-1',
        provider: 'stripe',
        event_type: 'payment_intent.succeeded',
        status: 'confirmed',
        amount: 120,
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
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({ data: bookings })
                  })
                })
              })
            })
          };
        }
        if (table === 'commission_tracking') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: commissions })
              })
            })
          };
        }
        if (table === 'payment_logs') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: payments })
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

  it('returns settlement ledger payload for admin', async () => {
    vi.doMock('@/server/supabase/server', () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue(createSupabaseMock())
    }));

    const { GET } = await import('@/app/api/admin/settlement/ledger/route');
    const req = new NextRequest('http://localhost/api/admin/settlement/ledger?days=30');
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.summary.totalRows).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(json.ledger)).toBe(true);
  });

  it('defaults settlement ledger period to 30 days when query param is absent', async () => {
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

        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
            })
          })
        };
      })
    };

    const buildSettlementLedgerReport = vi.fn().mockResolvedValue({
      periodDays: 30,
      summary: {
        totalRows: 0,
        settledRows: 0,
        awaitingTrackingRows: 0,
        awaitingPaymentRows: 0,
        exceptionRows: 0
      },
      ledger: []
    });

    vi.doMock('@/server/supabase/server', () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue(supabase)
    }));
    vi.doMock('@/server/admin/settlement-ledger-report', () => ({
      buildSettlementLedgerReport
    }));

    const { GET } = await import('@/app/api/admin/settlement/ledger/route');
    const req = new NextRequest('http://localhost/api/admin/settlement/ledger');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(buildSettlementLedgerReport).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ periodDays: 30 })
    );
  });

  it('returns 503 when settlement bookings query fails', async () => {
    const { HttpError } = await import('@/server/errors');
    const supabase = createSupabaseMock();
    const buildSettlementLedgerReport = vi.fn().mockRejectedValue(
      new HttpError(503, 'Failed to load bookings for settlement ledger report')
    );

    vi.doMock('@/server/supabase/server', () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue(supabase)
    }));
    vi.doMock('@/server/admin/settlement-ledger-report', () => ({
      buildSettlementLedgerReport
    }));

    const { GET } = await import('@/app/api/admin/settlement/ledger/route');
    const req = new NextRequest('http://localhost/api/admin/settlement/ledger?days=30');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.error).toContain('Failed to load bookings');
  });

});
