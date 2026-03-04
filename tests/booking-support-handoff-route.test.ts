import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('booking support handoff route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv('NODE_ENV', 'test');
    process.env.QUOTE_SIGNING_SECRET = '1234567890abcdef';
    process.env.BOOKING_VIEW_TOKEN_SECRET = '1234567890abcdef';
    process.env.LITEAPI_WEBHOOK_SECRET = 'liteapi-webhook-secret-123';
    process.env.BOOKING_API_AUTH_SECRET = 'abcdefghijklmnopqrstuvwxyz123456';
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'upstash-token';
    process.env.LITEAPI_API_KEY = 'test';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
  });

  it('creates liteapi support packet with booking-view token auth', async () => {
    const getBookingById = vi.fn().mockResolvedValue({
      id: 'booking_1',
      liteapi_booking_id: 'lite_1',
      status: 'confirmed',
      payment_status: 'captured',
      metadata: {
        transactionId: 'tx_1',
        prebookId: 'pb_1',
        clientReference: 'client_1',
        holder: { email: 'guest@example.com' }
      }
    });
    const updateBookingStatusById = vi.fn().mockResolvedValue(true);

    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/request', () => ({
      getClientIp: vi.fn().mockReturnValue('127.0.0.1')
    }));
    vi.doMock('@/server/authz', async () => {
      const { HttpError } = await import('@/server/errors');
      return {
        assertBookingApiAuthorized: vi.fn(() => {
          throw new HttpError(401, 'Unauthorized booking API request.');
        })
      };
    });
    vi.doMock('@/server/booking/repository', () => ({
      getBookingById,
      updateBookingStatusById
    }));

    const { signBookingViewToken } = await import('@/server/booking-view-token');
    const { POST } = await import('@/app/api/support/liteapi/route');
    const request = {
      headers: new Headers({
        'x-booking-view-token': signBookingViewToken({ bookingId: 'booking_1' })
      }),
      json: async () => ({
        bookingId: 'booking_1',
        channel: 'chat',
        notes: 'Need assistance with amendment request'
      })
    } as unknown as Request;

    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.supportPacket.provider).toBe('liteapi');
    expect(body.supportPacket.transactionId).toBe('tx_1');
    expect(updateBookingStatusById).toHaveBeenCalledWith(
      'booking_1',
      'confirmed',
      expect.objectContaining({
        supportHandoff: expect.objectContaining({
          provider: 'liteapi',
          bookingId: 'booking_1'
        })
      })
    );
  });

  it('rejects support handoff when both api key and view token are missing', async () => {
    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/request', () => ({
      getClientIp: vi.fn().mockReturnValue('127.0.0.1')
    }));
    vi.doMock('@/server/authz', async () => {
      const { HttpError } = await import('@/server/errors');
      return {
        assertBookingApiAuthorized: vi.fn(() => {
          throw new HttpError(401, 'Unauthorized booking API request.');
        })
      };
    });
    vi.doMock('@/server/booking/repository', () => ({
      getBookingById: vi.fn(),
      updateBookingStatusById: vi.fn()
    }));

    const { POST } = await import('@/app/api/support/liteapi/route');
    const request = {
      headers: new Headers(),
      json: async () => ({ bookingId: 'booking_1' })
    } as unknown as Request;

    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toMatch(/unauthorized/i);
  });

  it('auto-forwards support packet when support bridge is configured', async () => {
    vi.stubEnv('LITEAPI_SUPPORT_AUTO_FORWARD', 'true');
    vi.stubEnv('LITEAPI_SUPPORT_FORWARD_URL', 'https://support-bridge.example.com/handoff');
    vi.stubEnv('LITEAPI_SUPPORT_FORWARD_TOKEN', 'bridge-token');

    const getBookingById = vi.fn().mockResolvedValue({
      id: 'booking_1',
      liteapi_booking_id: 'lite_1',
      status: 'confirmed',
      payment_status: 'captured',
      metadata: {
        transactionId: 'tx_1',
        prebookId: 'pb_1',
        clientReference: 'client_1',
        holder: { email: 'guest@example.com' }
      }
    });
    const updateBookingStatusById = vi.fn().mockResolvedValue(true);
    const supportFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', supportFetch as unknown as typeof fetch);

    vi.doMock('@/server/ratelimit', () => ({
      assertRateLimit: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock('@/server/request', () => ({
      getClientIp: vi.fn().mockReturnValue('127.0.0.1')
    }));
    vi.doMock('@/server/authz', async () => {
      const { HttpError } = await import('@/server/errors');
      return {
        assertBookingApiAuthorized: vi.fn(() => {
          throw new HttpError(401, 'Unauthorized booking API request.');
        })
      };
    });
    vi.doMock('@/server/booking/repository', () => ({
      getBookingById,
      updateBookingStatusById
    }));

    const { signBookingViewToken } = await import('@/server/booking-view-token');
    const { POST } = await import('@/app/api/support/liteapi/route');
    const request = {
      headers: new Headers({
        'x-booking-view-token': signBookingViewToken({ bookingId: 'booking_1' })
      }),
      json: async () => ({ bookingId: 'booking_1', channel: 'chat' })
    } as unknown as Request;

    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.supportForwarded).toBe(true);
    expect(supportFetch).toHaveBeenCalledWith(
      'https://support-bridge.example.com/handoff',
      expect.objectContaining({ method: 'POST' })
    );
    expect(updateBookingStatusById).toHaveBeenCalledWith(
      'booking_1',
      'confirmed',
      expect.objectContaining({ supportForwarded: true })
    );
  });
});
