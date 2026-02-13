import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertRateLimit } from '@/server/ratelimit';
import { getOrSetRedisCache } from '@/server/cache';
import { searchPropertyPreviews } from '@/server/liteapi';
import { toHttpError } from '@/server/errors';

const querySchema = z.object({
  q: z.string().trim().min(2).max(120)
});

export async function GET(request: NextRequest) {
  try {
    const parsed = querySchema.safeParse({
      q: request.nextUrl.searchParams.get('q')
    });
    if (!parsed.success) {
      return NextResponse.json([], { status: 200 });
    }

    const q = parsed.data.q;
    const clientIp = request.headers.get('x-forwarded-for') ?? 'anonymous';
    await assertRateLimit(`property-preview:${clientIp}`);

    const payload = await getOrSetRedisCache(`property-preview:${q.toLowerCase()}`, 300, async () => {
      return searchPropertyPreviews(q);
    });

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const httpError = toHttpError(error);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
