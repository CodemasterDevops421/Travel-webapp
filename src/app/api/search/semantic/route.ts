import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertRateLimit } from '@/server/ratelimit';
import { getClientIp } from '@/server/request';
import { toHttpError } from '@/server/errors';
import { searchHotelsBySemanticQuery } from '@/server/liteapi';

const querySchema = z.object({
  query: z.string().trim().min(3).max(200),
  language: z.string().trim().toLowerCase().length(2).optional(),
  limit: z.coerce.number().int().min(1).max(12).optional()
});

export async function GET(request: NextRequest) {
  try {
    const parsed = querySchema.parse({
      query: request.nextUrl.searchParams.get('query'),
      language: request.nextUrl.searchParams.get('language') ?? undefined,
      limit: request.nextUrl.searchParams.get('limit') ?? undefined
    });

    await assertRateLimit(`semantic-search:${getClientIp(request)}`);
    const results = await searchHotelsBySemanticQuery(parsed.query, parsed.language, parsed.limit ?? 8);
    return NextResponse.json({ results });
  } catch (error) {
    const httpError = toHttpError(error);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
