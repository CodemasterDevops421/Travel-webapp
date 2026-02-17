import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertRateLimit } from '@/server/ratelimit';
import { listBookings } from '@/server/liteapi';
import { toHttpError } from '@/server/errors';
import { getClientIp } from '@/server/request';
import { assertBookingApiAuthorized } from '@/server/authz';

const querySchema = z.object({
  clientReference: z.string().trim().min(1),
  timeout: z.coerce.number().positive().max(30).optional()
});

export async function GET(request: NextRequest) {
  try {
    assertBookingApiAuthorized(request);

    const parsed = querySchema.safeParse({
      clientReference: request.nextUrl.searchParams.get('clientReference'),
      timeout: request.nextUrl.searchParams.get('timeout') ?? undefined
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'clientReference is required' }, { status: 400 });
    }

    const clientIp = getClientIp(request);
    await assertRateLimit(`bookings-list:${clientIp}`);

    const payload = await listBookings({
      clientReference: parsed.data.clientReference,
      timeoutSeconds: parsed.data.timeout
    });

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const httpError = toHttpError(error);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
