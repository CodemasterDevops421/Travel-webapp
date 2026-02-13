import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('booking view token', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.QUOTE_SIGNING_SECRET = '1234567890abcdef';
    delete process.env.BOOKING_VIEW_TOKEN_SECRET;
    process.env.BOOKING_VIEW_TOKEN_TTL_SECONDS = '600';
  });

  it('signs and verifies token for matching booking id', async () => {
    const { signBookingViewToken, verifyBookingViewToken } = await import('@/server/booking-view-token');
    const token = signBookingViewToken({
      bookingId: 'booking-1',
      ttlSeconds: 60,
      nowMs: 1_000_000
    });

    const valid = verifyBookingViewToken({
      bookingId: 'booking-1',
      token,
      nowMs: 1_030_000
    });

    expect(valid).toBe(true);
  });

  it('rejects token for a different booking id', async () => {
    const { signBookingViewToken, verifyBookingViewToken } = await import('@/server/booking-view-token');
    const token = signBookingViewToken({
      bookingId: 'booking-1',
      ttlSeconds: 60,
      nowMs: 1_000_000
    });

    const valid = verifyBookingViewToken({
      bookingId: 'booking-2',
      token,
      nowMs: 1_030_000
    });

    expect(valid).toBe(false);
  });

  it('rejects expired token', async () => {
    const { signBookingViewToken, verifyBookingViewToken } = await import('@/server/booking-view-token');
    const token = signBookingViewToken({
      bookingId: 'booking-1',
      ttlSeconds: 5,
      nowMs: 1_000_000
    });

    const valid = verifyBookingViewToken({
      bookingId: 'booking-1',
      token,
      nowMs: 1_006_000
    });

    expect(valid).toBe(false);
  });

  it('rejects malformed token', async () => {
    const { verifyBookingViewToken } = await import('@/server/booking-view-token');

    const valid = verifyBookingViewToken({
      bookingId: 'booking-1',
      token: 'bad-token'
    });

    expect(valid).toBe(false);
  });
});
