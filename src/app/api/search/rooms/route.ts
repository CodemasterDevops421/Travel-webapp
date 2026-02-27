import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertRateLimit } from '@/server/ratelimit';
import { getClientIp } from '@/server/request';
import { toHttpError } from '@/server/errors';
import { searchHotelRoomsByText } from '@/server/liteapi';

const querySchema = z.object({
  query: z.string().trim().min(3).max(200),
  language: z.string().trim().toLowerCase().length(2).optional(),
  city: z.string().trim().min(2).max(80).optional(),
  countryCode: z.string().trim().toUpperCase().length(2).optional(),
  limit: z.coerce.number().int().min(1).max(10).optional()
});

export async function GET(request: NextRequest) {
  try {
    const parsed = querySchema.parse({
      query: request.nextUrl.searchParams.get('query'),
      language: request.nextUrl.searchParams.get('language') ?? undefined,
      city: request.nextUrl.searchParams.get('city') ?? undefined,
      countryCode: request.nextUrl.searchParams.get('countryCode') ?? undefined,
      limit: request.nextUrl.searchParams.get('limit') ?? undefined
    });

    await assertRateLimit(`room-search:${getClientIp(request)}`);
    const results = await searchHotelRoomsByText(parsed.query, {
      language: parsed.language,
      city: parsed.city,
      countryCode: parsed.countryCode,
      limit: parsed.limit
    });
    return NextResponse.json({ results });
  } catch (error) {
    const httpError = toHttpError(error);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
