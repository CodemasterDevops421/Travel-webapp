import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertRateLimit } from '@/server/ratelimit';
import { cancelBooking, getBooking } from '@/server/liteapi';
import { toHttpError } from '@/server/errors';
import { getClientIp } from '@/server/request';

const querySchema = z.object({
  timeout: z.coerce.number().positive().max(30).optional()
});

const paramsSchema = z.object({
  bookingId: z.string().trim().min(1)
});

export async function GET(request: NextRequest, context: { params: { bookingId: string } }) {
  try {
    const params = paramsSchema.parse(context.params);
    const parsed = querySchema.safeParse({
      timeout: request.nextUrl.searchParams.get('timeout') ?? undefined
    });

    const clientIp = getClientIp(request);
    await assertRateLimit(`bookings-get:${clientIp}`);

    const payload = await getBooking({
      bookingId: params.bookingId,
      timeoutSeconds: parsed.success ? parsed.data.timeout : undefined
    });

    if (!payload) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const httpError = toHttpError(error);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}

export async function PUT(request: NextRequest, context: { params: { bookingId: string } }) {
  try {
    const params = paramsSchema.parse(context.params);
    const parsed = querySchema.safeParse({
      timeout: request.nextUrl.searchParams.get('timeout') ?? undefined
    });

    const clientIp = getClientIp(request);
    await assertRateLimit(`bookings-cancel:${clientIp}`);

    const payload = await cancelBooking({
      bookingId: params.bookingId,
      timeoutSeconds: parsed.success ? parsed.data.timeout : undefined
    });

    if (!payload) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const httpError = toHttpError(error);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
