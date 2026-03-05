import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

describe('admin reconciliation booking detail route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  function createBaseSupabase() {
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

        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'booking-1',
                  status: 'confirmed',
                  total_amount: 100,
                  commission_amount: 12,
                  currency: 'USD',
                  liteapi_booking_id: 'lite-1',
                  payment_status: 'captured',
                  confirmation_code: 'CONF-1',
                  latest_payment_log_id: 'pay-1',
                  metadata: {},
                  created_at: new Date().toISOString()
                },
                error: null
              }),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null })
              })
            })
          })
        };
      })
    };
  }

  it('returns 404 when booking does not exist', async () => {
    const supabase = createBaseSupabase();
    supabase.from = vi.fn().mockImplementation((table: string) => {
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
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
            })
          })
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        })
      };
    });

    vi.doMock('@/server/supabase/server', () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue(supabase)
    }));

    const { GET } = await import('@/app/api/admin/reconciliation/[bookingId]/route');
    const req = new NextRequest('http://localhost/api/admin/reconciliation/booking-1');
    const res = await GET(req, { params: Promise.resolve({ bookingId: 'booking-1' }) });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toContain('Booking not found');
  });

  it('returns 503 when booking query fails for backend reason', async () => {
    const supabase = createBaseSupabase();
    supabase.from = vi.fn().mockImplementation((table: string) => {
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
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST999', message: 'db down' } })
            })
          })
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        })
      };
    });

    vi.doMock('@/server/supabase/server', () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue(supabase)
    }));

    const { GET } = await import('@/app/api/admin/reconciliation/[bookingId]/route');
    const req = new NextRequest('http://localhost/api/admin/reconciliation/booking-1');
    const res = await GET(req, { params: Promise.resolve({ bookingId: 'booking-1' }) });
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.error).toContain('Failed to load booking details');
  });
});
