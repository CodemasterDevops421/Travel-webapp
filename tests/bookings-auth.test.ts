import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('booking api auth gate', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('QUOTE_SIGNING_SECRET', '1234567890abcdef');
    vi.stubEnv('BOOKING_VIEW_TOKEN_SECRET', '1234567890abcdef');
    vi.stubEnv('BOOKING_API_AUTH_SECRET', 'abcdefghijklmnopqrstuvwxyz123456');
    vi.stubEnv('LITEAPI_API_KEY', 'test-key');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');

    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
  });

  it('rejects bookings list without x-booking-api-key', async () => {
    vi.doMock('@/server/liteapi', () => ({
      listBookings: vi.fn().mockResolvedValue({ data: [] })
    }));

    const { GET } = await import('@/app/api/bookings/route');
    const request = {
      headers: new Headers(),
      nextUrl: new URL('https://example.com/api/bookings?clientReference=tf-1')
    } as never;

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('allows bookings list with x-booking-api-key', async () => {
    const listBookings = vi.fn().mockResolvedValue({ data: [] });
    vi.doMock('@/server/liteapi', () => ({
      listBookings
    }));

    const { GET } = await import('@/app/api/bookings/route');
    const request = {
      headers: new Headers({
        'x-booking-api-key': 'abcdefghijklmnopqrstuvwxyz123456'
      }),
      nextUrl: new URL('https://example.com/api/bookings?clientReference=tf-1')
    } as never;

    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(listBookings).toHaveBeenCalled();
  });
});
