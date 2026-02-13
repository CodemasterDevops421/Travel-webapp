import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertRateLimit } from '@/server/ratelimit';
import { getOrSetRedisCache } from '@/server/cache';
import { searchPropertyPreviews } from '@/server/liteapi';
import { toHttpError } from '@/server/errors';
import { CACHE_TTL_SECONDS } from '@/shared/lib/cache-ttl';
import { getClientIp } from '@/server/request';

const querySchema = z.object({
  q: z.string().trim().min(2).max(120),
  currency: z.string().trim().toUpperCase().length(3).optional()
});

export async function GET(request: NextRequest) {
  try {
    const parsed = querySchema.safeParse({
      q: request.nextUrl.searchParams.get('q'),
      currency: request.nextUrl.searchParams.get('currency') ?? undefined
    });
    if (!parsed.success) {
      return NextResponse.json([], { status: 200 });
    }

    const q = parsed.data.q;
    const currency = parsed.data.currency;
    const clientIp = getClientIp(request);
    await assertRateLimit(`property-preview:${clientIp}`);

    const payload = await getOrSetRedisCache(
      `property-preview:${q.toLowerCase()}:${currency ?? 'default'}`,
      CACHE_TTL_SECONDS.propertyPreview,
      async () => {
      return searchPropertyPreviews(q, currency);
      }
    );

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const httpError = toHttpError(error);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
