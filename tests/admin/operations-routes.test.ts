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
    const req = new NextRequest('http://localhost/api/admin/support/sla?days=30&breachHours=24');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.summary.totalCases).toBeGreaterThanOrEqual(1);
  });

  it('returns readiness gate payload', async () => {
    vi.doMock('@/server/supabase/server', () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue(createSupabaseMock())
    }));

    const { GET } = await import('@/app/api/admin/readiness/route');
    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(typeof json.overallPassed).toBe('boolean');
    expect(Array.isArray(json.gates)).toBe(true);
  });
});
