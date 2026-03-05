import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

describe('admin support operations routes', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unmock('@/server/ratelimit');
  });

  function createSupabaseMock() {
    const bookings = [
      {
        id: 'booking-1',
        status: 'confirmed',
        metadata: {
          supportRequestedAt: new Date().toISOString(),
          supportState: 'new',
          supportPriority: 'high',
          supportForwarded: false
        },
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
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({ data: bookings })
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

  it('returns support operations queue payload', async () => {
    vi.doMock('@/server/supabase/server', () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue(createSupabaseMock())
    }));

    const { GET } = await import('@/app/api/admin/support/operations/route');
    const req = new NextRequest('http://localhost/api/admin/support/operations?days=30&breachHours=24');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.summary.totalCases).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(json.cases)).toBe(true);
    expect(json.processing).toEqual(
      expect.objectContaining({
        truncated: expect.any(Boolean),
        scannedBookings: expect.any(Number)
      })
    );
  });

  it('defaults breachHours to 24 when query param is absent', async () => {
    vi.doMock('@/server/supabase/server', () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue(createSupabaseMock())
    }));
    const buildSupportOperationsReport = vi.fn().mockResolvedValue({
      summary: { totalCases: 0 },
      cases: []
    });
    vi.doMock('@/server/admin/support-operations-report', () => ({
      buildSupportOperationsReport
    }));

    const { GET } = await import('@/app/api/admin/support/operations/route');
    const req = new NextRequest('http://localhost/api/admin/support/operations?days=30');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(buildSupportOperationsReport).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ breachHours: 24 })
    );
  });

  it('updates support case state via patch route', async () => {
    const updateBookingMetadataById = vi.fn().mockResolvedValue(true);
    vi.doMock('@/server/supabase/server', () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue(createSupabaseMock())
    }));
    vi.doMock('@/server/booking/repository', () => ({
      getBookingById: vi.fn().mockResolvedValue({
        id: 'booking-1',
        status: 'confirmed',
        metadata: { supportAssignedTo: 'Existing Assignee', supportResolutionNote: 'Existing note' }
      }),
      updateBookingMetadataById
    }));

    const { PATCH } = await import('@/app/api/admin/support/operations/[bookingId]/route');
    const req = new NextRequest('http://localhost/api/admin/support/operations/booking-1', {
      method: 'PATCH',
      body: JSON.stringify({
        state: 'in_progress',
        priority: 'high'
      })
    });
    const res = await PATCH(req, { params: Promise.resolve({ bookingId: 'booking-1' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.state).toBe('in_progress');
    expect(updateBookingMetadataById).toHaveBeenCalledWith(
      'booking-1',
      expect.not.objectContaining({
        supportAssignedTo: expect.anything(),
        supportResolutionNote: expect.anything()
      })
    );
  });

  it('returns 429 when support operations route is rate limited', async () => {
    const { RateLimitError } = await import('@/server/errors');
    vi.doMock('@/server/supabase/server', () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue(createSupabaseMock())
    }));
    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockRejectedValue(new RateLimitError()),
      createRateLimitKey: vi.fn().mockReturnValue('mutation:test:admin-support-operations-get')
    }));

    const { GET } = await import('@/app/api/admin/support/operations/route');
    const req = new NextRequest('http://localhost/api/admin/support/operations?days=30&breachHours=24');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.error).toContain('Too many requests');
  });
});
