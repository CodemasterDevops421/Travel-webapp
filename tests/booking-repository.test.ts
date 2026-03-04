import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    vi.unstubAllEnvs();
    vi.stubEnv('NODE_ENV', 'test');
    process.env.QUOTE_SIGNING_SECRET = '1234567890abcdef';
    process.env.BOOKING_VIEW_TOKEN_SECRET = '1234567890abcdef';
    process.env.LITEAPI_WEBHOOK_SECRET = 'liteapi-webhook-secret-123';
    process.env.BOOKING_API_AUTH_SECRET = 'abcdefghijklmnopqrstuvwxyz123456';
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'upstash-token';
    process.env.LITEAPI_API_KEY = 'test-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    vi.doMock('@/server/commission-tracking-repository', () => ({
      upsertCommissionTracking: vi.fn().mockResolvedValue('commission-default')
    }));
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
      'payment_authorized',
      { source: 'webhook' }
    );
    const booking = await repo.getBookingById(id as string);

    expect(updated).toBe(true);
    expect(booking).toMatchObject({
      id,
      status: 'payment_authorized',
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

  it('fails closed in production when Supabase booking persistence is unavailable', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('STRICT_PERSISTENCE_MODE', 'true');

    const loggerWarn = vi.fn();
    const loggerError = vi.fn();
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST205', message: 'relation \"bookings\" does not exist' }
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
    const id = await repo.persistBooking(buildBookingInput());

    expect(id).toBeNull();
    expect(createAdminClient).toHaveBeenCalledTimes(1);
    expect(loggerWarn).toHaveBeenCalledTimes(1);
    expect(loggerError).not.toHaveBeenCalled();
  });

  it('rejects illegal lifecycle status transitions in fallback records', async () => {
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
      { source: 'webhook' }
    );
    const booking = await repo.getBookingById(id as string);

    expect(updated).toBe(false);
    expect(booking?.status).toBe('pending');
    expect(loggerWarn).toHaveBeenCalledTimes(2);
  });

  it('updates canonical booking fields on valid transitions', async () => {
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
      logger: { warn: vi.fn(), error: vi.fn() }
    }));

    const repo = await import('@/server/booking/repository');
    const id = await repo.persistBooking(
      buildBookingInput({
        metadata: {
          transactionId: 'txn-1',
          itinerary: { totalAmount: 500 },
          paymentStatus: 'pending'
        }
      })
    );

    expect(id).toBeTypeOf('string');

    const authorized = await repo.updateBookingStatusByLiteApiId(
      'lite-booking-1',
      'payment_authorized',
      {
        paymentStatus: 'authorized',
        totalAmount: 525,
        commissionAmount: 52.5
      }
    );
    expect(authorized).toBe(true);

    const confirmed = await repo.updateBookingStatusByTransactionId('txn-1', 'confirmed', {
      paymentStatus: 'captured',
      confirmationCode: 'CONF-123'
    });

    const booking = await repo.getBookingById(id as string);

    expect(confirmed).toBe(true);
    expect(booking).toMatchObject({
      status: 'confirmed',
      payment_status: 'captured',
      total_amount: 525,
      commission_amount: 52.5,
      confirmation_code: 'CONF-123'
    });
  });

  it('upserts commission tracking once per booking across replayed transitions', async () => {
    const upsertCommissionTracking = vi.fn().mockResolvedValue('commission-1');
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
      logger: { warn: vi.fn(), error: vi.fn() }
    }));
    vi.doMock('@/server/commission-tracking-repository', () => ({
      upsertCommissionTracking
    }));

    const repo = await import('@/server/booking/repository');
    const bookingId = await repo.persistBooking(
      buildBookingInput({
        status: 'payment_authorized',
        metadata: {
          transactionId: 'txn-1',
          totalAmount: 200,
          commissionAmount: 20,
          paymentStatus: 'authorized'
        }
      })
    );

    expect(bookingId).toBeTypeOf('string');

    const confirmed = await repo.updateBookingStatusByTransactionId('txn-1', 'confirmed', {
      paymentStatus: 'captured',
      confirmationCode: 'CONF-999'
    });

    expect(confirmed).toBe(true);
    expect(upsertCommissionTracking).toHaveBeenCalledTimes(2);
    expect(upsertCommissionTracking).toHaveBeenNthCalledWith(1, expect.objectContaining({
      bookingId,
      commissionAmount: 20,
      currency: 'USD'
    }));
    expect(upsertCommissionTracking).toHaveBeenNthCalledWith(2, expect.objectContaining({
      bookingId,
      metadata: expect.objectContaining({
        bookingStatus: 'confirmed',
        confirmationCode: 'CONF-999'
      })
    }));
  });

  it('allows fallback booking persistence when commission table is unavailable in non-production', async () => {
    const upsertCommissionTracking = vi.fn().mockResolvedValue(null);
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
      logger: { warn: vi.fn(), error: vi.fn() }
    }));
    vi.doMock('@/server/commission-tracking-repository', () => ({
      upsertCommissionTracking
    }));

    const repo = await import('@/server/booking/repository');
    const bookingId = await repo.persistBooking(
      buildBookingInput({
        status: 'payment_authorized',
        metadata: {
          transactionId: 'txn-1',
          totalAmount: 150,
          commissionAmount: 18,
          paymentStatus: 'authorized'
        }
      })
    );

    expect(bookingId).toBeTypeOf('string');
    expect(upsertCommissionTracking).toHaveBeenCalledOnce();
  });
});
