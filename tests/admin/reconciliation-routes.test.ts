import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

describe('admin reconciliation routes', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  function createSupabaseMock() {
    const bookings = [
      {
        id: 'booking-1',
        status: 'confirmed',
        total_amount: 200,
        commission_amount: 24,
        currency: 'USD',
        liteapi_booking_id: 'lite-1',
        payment_status: 'captured',
        confirmation_code: 'CONF1',
        latest_payment_log_id: 'pay-1',
        metadata: { commissionPercent: 12, transactionId: 'txn-1' },
        created_at: new Date().toISOString()
      }
    ];

    const commission = [
      {
        id: 'ct-1',
        booking_id: 'booking-1',
        payment_log_id: 'pay-1',
        gross_booking_value: 200,
        commission_percent: 12,
        commission_amount: 24,
        currency: 'USD',
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const paymentLogs = [
      {
        id: 'pay-1',
        booking_id: 'booking-1',
        provider: 'stripe',
        external_payment_id: 'pi_1',
        event_type: 'payment_intent.succeeded',
        status: 'confirmed',
        amount: 200,
        currency: 'USD',
        correlation_id: 'cid-1',
        metadata: {},
        created_at: new Date().toISOString()
      }
    ];

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'admin-1', email: 'admin@example.com', app_metadata: { role: 'admin' } } }
        })
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'bookings') {
          return {
            select: vi.fn().mockImplementation(() => ({
              gte: vi.fn().mockImplementation(() => ({
                in: vi.fn().mockImplementation(() => ({
                  order: vi.fn().mockResolvedValue({ data: bookings })
                }))
              })),
              eq: vi.fn().mockImplementation(() => ({
                single: vi.fn().mockResolvedValue({ data: bookings[0], error: null })
              }))
            })),
            update: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockResolvedValue({ error: null })
            }))
          };
        }

        if (table === 'commission_tracking') {
          return {
            select: vi.fn().mockImplementation(() => ({
              gte: vi.fn().mockImplementation(() => ({
                in: vi.fn().mockImplementation(() => ({
                  order: vi.fn().mockResolvedValue({ data: commission })
                }))
              })),
              eq: vi.fn().mockImplementation(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: commission[0], error: null })
              }))
            }))
          };
        }

        if (table === 'payment_logs') {
          return {
            select: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockImplementation(() => ({
                order: vi.fn().mockImplementation(() => ({
                  limit: vi.fn().mockResolvedValue({ data: paymentLogs, error: null })
                }))
              }))
            }))
          };
        }

        if (table === 'admin_users') {
          return {
            select: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockImplementation(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null })
              }))
            }))
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

    return supabase;
  }

  it('returns reconciliation summary payload', async () => {
    const supabase = createSupabaseMock();

    vi.doMock('@/server/supabase/server', () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue(supabase)
    }));

    const { GET } = await import('@/app/api/admin/reconciliation/route');
    const req = new NextRequest('http://localhost/api/admin/reconciliation?days=30');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.summary.coveragePercent).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(json.issues)).toBe(true);
  });

  it('exports reconciliation issues as csv', async () => {
    const supabase = createSupabaseMock();

    vi.doMock('@/server/supabase/server', () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue(supabase)
    }));

    const { GET } = await import('@/app/api/admin/reconciliation/export/route');
    const req = new NextRequest('http://localhost/api/admin/reconciliation/export?days=30');
    const res = await GET(req);
    const csv = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    expect(csv).toContain('booking_id,issue_type,detail');
  });

  it('resolves a reconciliation issue with note', async () => {
    const supabase = createSupabaseMock();

    vi.doMock('@/server/supabase/server', () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue(supabase)
    }));

    const { POST } = await import('@/app/api/admin/reconciliation/[bookingId]/resolve/route');
    const req = new NextRequest('http://localhost/api/admin/reconciliation/booking-1/resolve', {
      method: 'POST',
      body: JSON.stringify({
        issueType: 'amount_mismatch',
        resolutionNote: 'Verified with supplier and adjusted local metadata.'
      })
    });

    const res = await POST(req, {
      params: Promise.resolve({ bookingId: 'booking-1' })
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.bookingId).toBe('booking-1');
  });
});
