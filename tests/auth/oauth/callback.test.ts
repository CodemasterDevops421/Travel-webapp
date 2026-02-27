import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('oauth callback flow', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('proceeds with code exchange even without state (email confirmation flow)', async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: { message: 'invalid_code' } });

    vi.doMock('@/server/supabase/server', () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue({
        auth: { exchangeCodeForSession }
      })
    }));

    const { GET } = await import('@/app/auth/callback/route');
    const response = await GET(new Request('https://example.com/auth/callback?code=abc'));

    // state is no longer required (email confirmations don't include it)
    expect(exchangeCodeForSession).toHaveBeenCalledWith('abc');
    // code exchange failed, so redirect to login with error
    expect(response.headers.get('location')).toBe('https://example.com/auth/login?error=callback_failed');
  });

  it('upserts profile and redirects to safe relative path', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });

    vi.doMock('@/server/supabase/server', () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue({
        auth: {
          exchangeCodeForSession,
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'user-1',
                email: 'alex@example.com',
                email_confirmed_at: '2026-02-23T00:00:00.000Z',
                app_metadata: { provider: 'google' },
                user_metadata: { name: 'Alex Traveler' }
              }
            }
          })
        },
        from: vi.fn().mockReturnValue({ upsert })
      })
    }));

    const { GET } = await import('@/app/auth/callback/route');
    const response = await GET(
      new Request('https://example.com/auth/callback?code=abc&state=xyz&next=https://evil.com')
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith('abc');
    expect(upsert).toHaveBeenCalledWith(
      { id: 'user-1', full_name: 'Alex Traveler' },
      { onConflict: 'id' }
    );
    expect(response.headers.get('location')).toBe('https://example.com/');
  });

  it('rejects unverified google accounts to avoid unsafe linking', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });

    vi.doMock('@/server/supabase/server', () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue({
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'user-2',
                email: 'unverified@example.com',
                email_confirmed_at: null,
                app_metadata: { provider: 'google' },
                user_metadata: {}
              }
            }
          }),
          signOut
        },
        from: vi.fn().mockReturnValue({ upsert: vi.fn() })
      })
    }));

    const { GET } = await import('@/app/auth/callback/route');
    const response = await GET(new Request('https://example.com/auth/callback?code=abc&state=xyz'));

    expect(signOut).toHaveBeenCalled();
    expect(response.headers.get('location')).toBe(
      'https://example.com/auth/login?error=oauth_email_unverified'
    );
  });
});
