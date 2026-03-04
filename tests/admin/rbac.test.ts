import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('admin RBAC enforcement', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('allows users with admin claim without database lookup', async () => {
    const maybeSingle = vi.fn();
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ maybeSingle })
        })
      })
    } as any;

    const { assertAdminAuthorized, __unsafeResetAdminAuthzCacheForTests } = await import('@/server/authz');
    __unsafeResetAdminAuthzCacheForTests();
    await expect(
      assertAdminAuthorized(supabase, {
        id: 'admin-user',
        app_metadata: { role: 'admin' },
        user_metadata: {}
      })
    ).resolves.toBeUndefined();

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('caches db-backed admin allow decision to reduce repeated lookups', async () => {
    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { user_id: 'db-admin', role: 'admin', is_active: true }, error: null });
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ maybeSingle })
        })
      })
    } as any;

    const { assertAdminAuthorized, __unsafeResetAdminAuthzCacheForTests } = await import('@/server/authz');
    __unsafeResetAdminAuthzCacheForTests();

    await expect(
      assertAdminAuthorized(supabase, {
        id: 'db-admin',
        app_metadata: {},
        user_metadata: {}
      })
    ).resolves.toBeUndefined();

    await expect(
      assertAdminAuthorized(supabase, {
        id: 'db-admin',
        app_metadata: {},
        user_metadata: {}
      })
    ).resolves.toBeUndefined();

    expect(maybeSingle).toHaveBeenCalledTimes(1);
  });

  it('caches db-backed deny decision and keeps returning 403', async () => {
    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { user_id: 'non-admin', role: 'viewer', is_active: true }, error: null });
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ maybeSingle })
        })
      })
    } as any;

    const { assertAdminAuthorized, __unsafeResetAdminAuthzCacheForTests } = await import('@/server/authz');
    __unsafeResetAdminAuthzCacheForTests();

    await expect(
      assertAdminAuthorized(supabase, {
        id: 'non-admin',
        app_metadata: {},
        user_metadata: {}
      })
    ).rejects.toThrow('Forbidden');

    await expect(
      assertAdminAuthorized(supabase, {
        id: 'non-admin',
        app_metadata: {},
        user_metadata: {}
      })
    ).rejects.toThrow('Forbidden');

    expect(maybeSingle).toHaveBeenCalledTimes(1);
  });

  it('does not grant admin from user_metadata role alone', async () => {
    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { user_id: 'meta-admin', role: 'viewer', is_active: true }, error: null });
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ maybeSingle })
        })
      })
    } as any;

    const { assertAdminAuthorized, __unsafeResetAdminAuthzCacheForTests } = await import('@/server/authz');
    __unsafeResetAdminAuthzCacheForTests();

    await expect(
      assertAdminAuthorized(supabase, {
        id: 'meta-admin',
        app_metadata: {},
        user_metadata: { role: 'admin' }
      } as any)
    ).rejects.toThrow('Forbidden');

    expect(maybeSingle).toHaveBeenCalledTimes(1);
  });

  it('returns 403 from admin stats route for authenticated non-admin users', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

    vi.doMock('@/server/supabase/server', () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'traveler-1',
                app_metadata: {},
                user_metadata: {}
              }
            }
          })
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'admin_users') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({ maybeSingle })
              })
            };
          }

          return {
            select: vi.fn().mockReturnValue({ count: 0, data: [] })
          };
        })
      })
    }));

    const { GET } = await import('@/app/api/admin/stats/route');
    const response = await GET();

    expect(response.status).toBe(403);
  });
});
