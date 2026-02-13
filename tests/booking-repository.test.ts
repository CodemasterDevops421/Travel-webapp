import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}), { virtual: true });

type BookingInput = {
  quoteId: string | null;
  liteApiBookingId: string | null;
  status: string;
  metadata: Record<string, unknown>;
};

function buildBookingInput(overrides: Partial<BookingInput> = {}): BookingInput {
  return {
    quoteId: 'quote-1',
    liteApiBookingId: 'lite-booking-1',
    status: 'pending',
    metadata: { transactionId: 'txn-1' },
    ...overrides
  };
}

describe('booking repository fallback mode', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('enables fallback mode on PGRST205 and avoids repeated Supabase writes', async () => {
    const loggerWarn = vi.fn();
    const loggerError = vi.fn();
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST205', message: 'relation "bookings" does not exist' }
    });
    const createAdminClient = vi.fn(() => ({
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single
          }))
        }))
      }))
    }));

    vi.doMock('@/server/supabase/admin', () => ({ createAdminClient }));
    vi.doMock('@/server/logger', () => ({
      logger: { warn: loggerWarn, error: loggerError }
    }));

    const repo = await import('@/server/booking/repository');

    const id1 = await repo.persistBooking(buildBookingInput());
    const id2 = await repo.persistBooking(
      buildBookingInput({ liteApiBookingId: 'lite-booking-2' })
    );

    expect(id1).toBeTypeOf('string');
    expect(id2).toBeTypeOf('string');
    expect(createAdminClient).toHaveBeenCalledTimes(1);
    expect(loggerWarn).toHaveBeenCalledTimes(1);
    expect(loggerError).not.toHaveBeenCalled();
  });

  it('keeps lookup and updates working from in-memory fallback records', async () => {
    const loggerWarn = vi.fn();
    const createAdminClient = vi.fn(() => ({
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST205', message: 'missing booking schema' }
            })
          }))
        }))
      }))
    }));

    vi.doMock('@/server/supabase/admin', () => ({ createAdminClient }));
    vi.doMock('@/server/logger', () => ({
      logger: { warn: loggerWarn, error: vi.fn() }
    }));

    const repo = await import('@/server/booking/repository');
    const id = await repo.persistBooking(buildBookingInput());

    expect(id).toBeTypeOf('string');

    const updated = await repo.updateBookingStatusByLiteApiId(
      'lite-booking-1',
      'confirmed',
      { transactionId: 'txn-1', source: 'webhook' }
    );
    const booking = await repo.getBookingById(id as string);

    expect(updated).toBe(true);
    expect(booking).toMatchObject({
      id,
      status: 'confirmed',
      liteapi_booking_id: 'lite-booking-1'
    });
    expect(booking?.metadata).toMatchObject({
      transactionId: 'txn-1',
      source: 'webhook'
    });
    expect(createAdminClient).toHaveBeenCalledTimes(1);
    expect(loggerWarn).toHaveBeenCalledTimes(1);
  });

  it('falls back for quote persistence after schema-missing error and skips further Supabase quote writes', async () => {
    const loggerWarn = vi.fn();
    const loggerError = vi.fn();
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST205', message: 'relation "booking_quotes" does not exist' }
    });
    const createAdminClient = vi.fn(() => ({
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single
          }))
        }))
      }))
    }));

    vi.doMock('@/server/supabase/admin', () => ({ createAdminClient }));
    vi.doMock('@/server/logger', () => ({
      logger: { warn: loggerWarn, error: loggerError }
    }));

    const repo = await import('@/server/booking/repository');

    const id1 = await repo.persistQuote({
      quote: {
        hotelId: 'hotel-1',
        roomId: 'room-1',
        baseAmount: 100,
        totalAmount: 120,
        currency: 'USD',
        signature: 'sig-1'
      },
      checkIn: '2026-06-10',
      checkOut: '2026-06-12',
      guests: [{ adults: 2 }]
    });
    const id2 = await repo.persistQuote({
      quote: {
        hotelId: 'hotel-1',
        roomId: 'room-2',
        baseAmount: 110,
        totalAmount: 130,
        currency: 'USD',
        signature: 'sig-2'
      },
      checkIn: '2026-07-10',
      checkOut: '2026-07-12',
      guests: [{ adults: 2, children: 1 }]
    });

    expect(id1).toBeTypeOf('string');
    expect(id2).toBeTypeOf('string');
    expect(createAdminClient).toHaveBeenCalledTimes(1);
    expect(loggerWarn).toHaveBeenCalledTimes(1);
    expect(loggerError).not.toHaveBeenCalled();
  });
});
