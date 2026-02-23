import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('admin stats authz', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    vi.doMock('@/server/supabase/server', () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null } })
        }
      })
    }));

    const { GET } = await import('@/app/api/admin/stats/route');
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.doMock('@/server/supabase/server', () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } })
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ maybeSingle })
          })
        })
      })
    }));

    const { GET } = await import('@/app/api/admin/stats/route');
    const res = await GET();
    expect(res.status).toBe(403);
  });
});
