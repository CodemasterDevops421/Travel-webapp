import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertRateLimit } from '@/server/ratelimit';
import { autocomplete } from '@/server/liteapi';
import { getOrSetRedisCache } from '@/server/cache';
import { toHttpError } from '@/server/errors';
import { env } from '@/server/env';
import { logger } from '@/server/logger';
import { CACHE_TTL_SECONDS } from '@/shared/lib/cache-ttl';
import { getClientIp } from '@/server/request';

const querySchema = z.object({
  q: z.string().trim().min(2).max(120),
  language: z.string().trim().toLowerCase().length(2).optional()
});

async function googlePlacesFallback(query: string, language?: string): Promise<Array<{ id: string; name: string; type: 'landmark'; source: 'maps' }>> {
  if (!env.GOOGLE_PLACES_API_KEY) {
    return [];
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    url.searchParams.set('input', query);
    url.searchParams.set('key', env.GOOGLE_PLACES_API_KEY);
    if (language) {
      url.searchParams.set('language', language);
    }
    const response = await fetch(url, { next: { revalidate: 3600 } });
    if (!response.ok) {
      return [];
    }

    const json = (await response.json()) as {
      predictions?: Array<{
        place_id?: string;
        description?: string;
      }>;
    };

    return (json.predictions ?? []).slice(0, 6).map((item, index) => ({
      id: item.place_id ?? `google-${query}-${index}`,
      name: item.description ?? query,
      type: 'landmark' as const,
      source: 'maps' as const
    }));
  } catch (error) {
    logger.warn({ error }, 'Google autocomplete fallback failed');
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const parsed = querySchema.safeParse({
      q: request.nextUrl.searchParams.get('q'),
      language: request.nextUrl.searchParams.get('language') ?? undefined
    });
    if (!parsed.success) {
      return NextResponse.json([], { status: 200 });
    }

    const q = parsed.data.q;
    const language = parsed.data.language;
    const clientIp = getClientIp(request);
    await assertRateLimit(`autocomplete:${clientIp}`);

    const payload = await getOrSetRedisCache(`autocomplete:${q.toLowerCase()}:${language ?? 'en'}`, CACHE_TTL_SECONDS.autocomplete, async () => {
      const liteResults = await autocomplete(q, language);
      if (liteResults.length > 0) {
        return liteResults.map((item) => ({ ...item, source: 'inventory' as const }));
      }

      const shouldFallbackToGoogle = true;
      if (shouldFallbackToGoogle) {
        return googlePlacesFallback(q, language);
      }

      return [];
    });

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const httpError = toHttpError(error);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
