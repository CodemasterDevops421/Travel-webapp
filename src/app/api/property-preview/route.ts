import { NextRequest, NextResponse } from 'next/server';
import { assertRateLimit } from '@/server/ratelimit';
import { getOrSetRedisCache } from '@/server/cache';
import { searchPropertyPreviews } from '@/server/liteapi';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json([], { status: 200 });
  }

  const clientIp = request.headers.get('x-forwarded-for') ?? 'anonymous';
  await assertRateLimit(`property-preview:${clientIp}`);

  const payload = await getOrSetRedisCache(`property-preview:${q.toLowerCase()}`, 300, async () => {
    return searchPropertyPreviews(q);
  });

  return NextResponse.json(payload, { status: 200 });
}
