import { vi } from 'vitest';

type SecurityRouteMockOptions = {
  authenticated?: boolean;
  commissionPercent?: number;
};

export function resetSecurityRouteMocks(): void {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
}

export function mockSecurityRouteDependencies(options: SecurityRouteMockOptions = {}): void {
  const authenticated = options.authenticated ?? true;
  const commissionPercent = options.commissionPercent ?? 12;

  vi.doMock('@/server/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
  }));

  vi.doMock('@/server/ratelimit', () => ({
    assertRateLimit: vi.fn().mockResolvedValue(undefined)
  }));

  vi.doMock('@/server/settings/repository', () => ({
    getAppSettings: vi.fn().mockResolvedValue({
      commissionPercent,
      environmentMode: 'sandbox',
      requireLoginForBooking: false,
      updatedAt: null,
      updatedBy: null,
      source: 'fallback'
    })
  }));

  vi.doMock('@/server/supabase/server', () => ({
    createServerSupabaseClient: vi.fn().mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: authenticated ? { id: 'user_1' } : null
          }
        })
      }
    })
  }));

  vi.doMock('@/server/csrf', () => ({
    assertSameOrigin: vi.fn()
  }));
}
