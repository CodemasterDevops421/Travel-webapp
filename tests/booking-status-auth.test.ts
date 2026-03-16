import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('booking status route authz', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('rejects unauthenticated booking status checks', async () => {
    vi.doMock('@/server/csrf', () => ({
      assertSameOrigin: vi.fn()
    }));
    vi.doMock('@/server/request', () => ({
      parseRequestBody: vi.fn().mockResolvedValue({ transactionId: 'txn_1' })
    }));
    vi.doMock('@/server/supabase/server', () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null } })
        }
      })
    }));

    const { POST } = await import('@/app/api/booking/status/route');
    const response = await POST({ headers: new Headers() } as never);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toMatch(/sign in required/i);
  });

  it('does not mint booking view tokens from authenticated status polling', async () => {
    vi.doMock('@/server/csrf', () => ({
      assertSameOrigin: vi.fn()
    }));
    vi.doMock('@/server/request', () => ({
      parseRequestBody: vi.fn().mockResolvedValue({ transactionId: 'txn_1' })
    }));
    vi.doMock('@/server/supabase/server', () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user_1', email: 'guest@example.com' } }
          })
        }
      })
    }));
    vi.doMock('@/server/booking-store', () => ({
      getCheckoutProgressSessionByTransactionId: vi.fn().mockResolvedValue(null),
      getCheckoutProgressSessionByPrebookId: vi.fn().mockResolvedValue(null),
      saveCheckoutProgressSession: vi.fn()
    }));
    vi.doMock('@/server/booking/repository', () => ({
      getBookingById: vi.fn().mockResolvedValue(null),
      getBookingByTransactionId: vi.fn().mockResolvedValue({
        id: 'booking_1',
        user_id: 'user_1',
        status: 'confirmed',
        payment_status: 'captured',
        confirmation_code: 'CONFIRM-1',
        metadata: null
      })
    }));

    const { POST } = await import('@/app/api/booking/status/route');
    const response = await POST({ headers: new Headers() } as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.outcome).toBe('confirmed');
    expect(body.localBookingId).toBe('booking_1');
    expect(body.bookingViewToken).toBeUndefined();
    expect(body.confirmationCode).toBeUndefined();
  });

  it('rejects status polling for unknown transactions without a verified checkout session', async () => {
    vi.doMock('@/server/csrf', () => ({
      assertSameOrigin: vi.fn()
    }));
    vi.doMock('@/server/request', () => ({
      parseRequestBody: vi.fn().mockResolvedValue({ transactionId: 'txn_missing' })
    }));
    vi.doMock('@/server/supabase/server', () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user_1', email: 'guest@example.com' } }
          })
        }
      })
    }));
    vi.doMock('@/server/booking-store', () => ({
      getCheckoutProgressSessionByTransactionId: vi.fn().mockResolvedValue(null),
      getCheckoutProgressSessionByPrebookId: vi.fn().mockResolvedValue(null),
      saveCheckoutProgressSession: vi.fn()
    }));
    vi.doMock('@/server/booking/repository', () => ({
      getBookingById: vi.fn().mockResolvedValue(null),
      getBookingByTransactionId: vi.fn().mockResolvedValue(null)
    }));

    const { POST } = await import('@/app/api/booking/status/route');
    const response = await POST({ headers: new Headers() } as never);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toMatch(/booking not found/i);
  });
});
