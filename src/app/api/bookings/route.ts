import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertRateLimit } from '@/server/ratelimit';
import { listBookings } from '@/server/liteapi';
import { toHttpError } from '@/server/errors';
import { getClientIp } from '@/server/request';
import { assertBookingApiAuthorized } from '@/server/authz';
import { assertProductionReadiness } from '@/server/env';

const querySchema = z.object({
  clientReference: z.string().trim().min(1),
  page: z.coerce.number().int().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  timeout: z.coerce.number().positive().max(30).optional()
});

export async function GET(request: NextRequest) {
  try {
    assertProductionReadiness();
    assertBookingApiAuthorized(request);

    const parsed = querySchema.safeParse({
      clientReference: request.nextUrl.searchParams.get('clientReference'),
      page: request.nextUrl.searchParams.get('page') ?? undefined,
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
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

    const page = parsed.data.page ?? 1;
    const limit = parsed.data.limit ?? 20;
    const items = Array.isArray(payload?.data) ? payload.data : [];
    const start = (page - 1) * limit;
    const paginatedData = items.slice(start, start + limit);

    return NextResponse.json({
      ...payload,
      data: paginatedData,
      pagination: {
        page,
        limit,
        total: items.length,
        totalPages: Math.max(1, Math.ceil(items.length / limit))
      }
    }, { status: 200 });
  } catch (error) {
    const httpError = toHttpError(error);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
