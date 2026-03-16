import { beforeEach, describe, expect, it, vi } from 'vitest';

const notFound = vi.fn(() => {
  throw new Error('NOT_FOUND');
});

vi.mock('next/navigation', () => ({
  notFound
}));

vi.mock('next/link', () => ({
  default: ({ children }: { children: unknown }) => children
}));

describe('booking confirmation page auth enforcement', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.QUOTE_SIGNING_SECRET = '1234567890abcdef';
  });

  it('rejects missing token', async () => {
    vi.doMock('@/server/booking/repository', () => ({
      getBookingById: vi.fn().mockResolvedValue({
        id: 'booking-1',
        user_id: null,
        metadata: null
      })
    }));
    vi.doMock('@/server/supabase/server', () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null } })
        }
      })
    }));
    vi.doMock('@/server/booking-view-token', () => ({
      verifyBookingViewToken: vi.fn().mockReturnValue(false)
    }));

    const { default: BookingConfirmationPage } = await import('@/app/bookings/[bookingId]/page');
    await expect(
      BookingConfirmationPage({
        params: Promise.resolve({ bookingId: 'booking-1' }),
        searchParams: Promise.resolve({})
      })
    ).rejects.toThrow('NOT_FOUND');
    expect(notFound).toHaveBeenCalledOnce();
  });

  it('rejects invalid token', async () => {
    const verifyBookingViewToken = vi.fn().mockReturnValue(false);
    vi.doMock('@/server/booking/repository', () => ({
      getBookingById: vi.fn().mockResolvedValue({
        id: 'booking-1',
        user_id: null,
        metadata: null
      })
    }));
    vi.doMock('@/server/supabase/server', () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null } })
        }
      })
    }));
    vi.doMock('@/server/booking-view-token', () => ({
      verifyBookingViewToken
    }));

    const { default: BookingConfirmationPage } = await import('@/app/bookings/[bookingId]/page');
    await expect(
      BookingConfirmationPage({
        params: Promise.resolve({ bookingId: 'booking-1' }),
        searchParams: Promise.resolve({ viewToken: 'bad-token' })
      })
    ).rejects.toThrow('NOT_FOUND');
    expect(verifyBookingViewToken).toHaveBeenCalledWith({
      bookingId: 'booking-1',
      token: 'bad-token'
    });
    expect(notFound).toHaveBeenCalledOnce();
  });

  it('accepts valid token and proceeds to booking lookup', async () => {
    const getBookingById = vi.fn().mockResolvedValue(null);

    vi.doMock('@/server/booking/repository', () => ({
      getBookingById
    }));
    vi.doMock('@/server/booking-view-token', () => ({
      verifyBookingViewToken: vi.fn().mockReturnValue(true)
    }));

    vi.doMock('@/server/supabase/server', () => ({
      createServerSupabaseClient: vi.fn()
    }));

    const { default: BookingConfirmationPage } = await import('@/app/bookings/[bookingId]/page');
    await expect(
      BookingConfirmationPage({
        params: Promise.resolve({ bookingId: 'booking-1' }),
        searchParams: Promise.resolve({ viewToken: 'good-token' })
      })
    ).rejects.toThrow('NOT_FOUND');
    expect(getBookingById).toHaveBeenCalledWith('booking-1');
    expect(notFound).toHaveBeenCalledOnce();
  });

  it('accepts authenticated owner without view token', async () => {
    const getBookingById = vi.fn().mockResolvedValue({
      id: 'booking-1',
      user_id: 'user-1',
      metadata: null
    });

    vi.doMock('@/server/booking/repository', () => ({
      getBookingById
    }));
    vi.doMock('@/server/booking-view-token', () => ({
      verifyBookingViewToken: vi.fn().mockReturnValue(false)
    }));
    vi.doMock('@/server/supabase/server', () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: { id: 'user-1', email: 'guest@example.com' }
            }
          })
        }
      })
    }));

    const { default: BookingConfirmationPage } = await import('@/app/bookings/[bookingId]/page');
    await expect(
      BookingConfirmationPage({
        params: Promise.resolve({ bookingId: 'booking-1' }),
        searchParams: Promise.resolve({})
      })
    ).rejects.toThrow(/React is not defined/);
    expect(getBookingById).toHaveBeenCalledWith('booking-1');
    expect(notFound).not.toHaveBeenCalled();
  });
});
