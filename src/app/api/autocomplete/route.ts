import { NextRequest, NextResponse } from 'next/server';
import { assertRateLimit } from '@/server/ratelimit';
import { autocomplete } from '@/server/liteapi';
import { getOrSetRedisCache } from '@/server/cache';

async function googlePlacesFallback(query: string): Promise<Array<{ id: string; name: string; type: 'landmark'; source: 'google' }>> {
  return [
    {
      id: `google-${query}`,
      name: `${query} (Google fallback)`,
      type: 'landmark',
      source: 'google'
    }
  ];
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json([], { status: 200 });
  }

  const clientIp = request.headers.get('x-forwarded-for') ?? 'anonymous';
  await assertRateLimit(`autocomplete:${clientIp}`);

  const payload = await getOrSetRedisCache(`autocomplete:${q.toLowerCase()}`, 90, async () => {
    const liteResults = await autocomplete(q);
    if (liteResults.length > 0) {
      return liteResults.map((item) => ({ ...item, source: 'liteapi' as const }));
    }

    const shouldFallbackToGoogle = q.split(' ').length > 2 || /near|address|street/i.test(q);
    if (shouldFallbackToGoogle) {
      return googlePlacesFallback(q);
    }

    return [];
  });

  return NextResponse.json(payload, { status: 200 });
}
