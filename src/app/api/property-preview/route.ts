import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertRateLimit } from '@/server/ratelimit';
import { getOrSetRedisCache } from '@/server/cache';
import { PropertyPreview, PropertyPreviewSearchResult, searchPropertyPreviews } from '@/server/liteapi';
import { toHttpError } from '@/server/errors';
import { CACHE_TTL_SECONDS } from '@/shared/lib/cache-ttl';
import { getClientIp } from '@/server/request';

const querySchema = z.object({
  q: z.string().trim().min(2).max(120),
  mode: z.enum(['destination', 'vibe']).optional(),
  language: z.string().trim().toLowerCase().length(2).optional(),
  currency: z.string().trim().toUpperCase().length(3).optional(),
  checkin: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  checkout: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  adults: z.coerce.number().int().min(1).max(8).optional(),
  rooms: z.coerce.number().int().min(1).max(4).optional(),
  brief: z.string().trim().min(3).max(240).optional(),
  minPrice: z.coerce.number().min(0).max(5000).optional(),
  minStars: z.coerce.number().min(0).max(5).optional(),
  minGuestRating: z.coerce.number().min(0).max(10).optional(),
  maxPrice: z.coerce.number().min(50).max(5000).optional(),
  page: z.coerce.number().int().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional()
});

type PropertyPreviewEnvelope = {
  data: PropertyPreview[];
  results: PropertyPreview[];
  degraded: boolean;
  degradedReason: PropertyPreviewSearchResult['degradedReason'];
  asOf: string;
  freshness: PropertyPreviewSearchResult['freshness'];
};

function toEnvelope(payload: PropertyPreviewSearchResult): PropertyPreviewEnvelope {
  return {
    data: payload.properties,
    results: payload.properties,
    degraded: payload.degraded,
    degradedReason: payload.degradedReason,
    asOf: payload.asOf,
    freshness: payload.freshness
  };
}

export async function GET(request: NextRequest) {
  try {
    const parsed = querySchema.safeParse({
      q: request.nextUrl.searchParams.get('q'),
      mode: request.nextUrl.searchParams.get('mode') ?? undefined,
      language: request.nextUrl.searchParams.get('language') ?? undefined,
      currency: request.nextUrl.searchParams.get('currency') ?? undefined,
      checkin: request.nextUrl.searchParams.get('checkin') ?? undefined,
      checkout: request.nextUrl.searchParams.get('checkout') ?? undefined,
      adults: request.nextUrl.searchParams.get('adults') ?? undefined,
      rooms: request.nextUrl.searchParams.get('rooms') ?? undefined,
      brief: request.nextUrl.searchParams.get('brief') ?? undefined,
      minPrice: request.nextUrl.searchParams.get('minPrice') ?? undefined,
      minStars: request.nextUrl.searchParams.get('minStars') ?? undefined,
      minGuestRating: request.nextUrl.searchParams.get('minGuestRating') ?? undefined,
      maxPrice: request.nextUrl.searchParams.get('maxPrice') ?? undefined,
      page: request.nextUrl.searchParams.get('page') ?? undefined,
      limit: request.nextUrl.searchParams.get('limit') ?? undefined
    });
    if (!parsed.success) {
      return NextResponse.json(
        {
          data: [],
          results: [],
          degraded: false,
          degradedReason: null,
          asOf: new Date().toISOString(),
          freshness: 'fresh'
        } satisfies PropertyPreviewEnvelope,
        { status: 200 }
      );
    }

    const q = parsed.data.q;
    const mode = parsed.data.mode ?? 'destination';
    const language = parsed.data.language;
    const currency = parsed.data.currency;
    const checkin = parsed.data.checkin;
    const checkout = parsed.data.checkout;
    const adults = parsed.data.adults;
    const rooms = parsed.data.rooms;
    const brief = parsed.data.brief;
    const minPrice = parsed.data.minPrice;
    const minStars = parsed.data.minStars;
    const minGuestRating = parsed.data.minGuestRating;
    const maxPrice = parsed.data.maxPrice;
    const page = parsed.data.page;
    const limit = parsed.data.limit;
    const clientIp = getClientIp(request);
    await assertRateLimit(`property-preview:${clientIp}`);

    const briefKey = brief ? brief.toLowerCase().replace(/\s+/g, '-').slice(0, 80) : 'none';
    const filterKey = [
      typeof minPrice === 'number' ? `min-${minPrice}` : 'min-any',
      typeof minStars === 'number' ? `stars-${minStars}` : 'stars-any',
      typeof minGuestRating === 'number' ? `rating-${minGuestRating}` : 'rating-any',
      typeof maxPrice === 'number' ? `max-${maxPrice}` : 'max-any',
      `page-${page ?? 1}`,
      `limit-${limit ?? 8}`
    ].join(':');
    const payload = await getOrSetRedisCache(
      `property-preview:${mode}:${q.toLowerCase()}:${language ?? 'en'}:${currency ?? 'default'}:${checkin ?? 'auto'}:${checkout ?? 'auto'}:${adults ?? 2}:${rooms ?? 1}:${briefKey}:${filterKey}`,
      CACHE_TTL_SECONDS.propertyPreview,
      async () => {
        return searchPropertyPreviews(q, language, currency, checkin, checkout, adults, rooms, {
          searchMode: mode,
          brief,
          minPrice,
          minStars,
          minGuestRating,
          maxPrice,
          page,
          limit
        });
      }
    );

    return NextResponse.json(toEnvelope(payload), { status: 200 });
  } catch (error) {
    const httpError = toHttpError(error);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
