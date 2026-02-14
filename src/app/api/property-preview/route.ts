import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertRateLimit } from '@/server/ratelimit';
import { getOrSetRedisCache } from '@/server/cache';
import { searchPropertyPreviews } from '@/server/liteapi';
import { toHttpError } from '@/server/errors';
import { CACHE_TTL_SECONDS } from '@/shared/lib/cache-ttl';
import { getClientIp } from '@/server/request';

const querySchema = z.object({
  q: z.string().trim().min(2, 'Search query must be at least 2 characters').max(120, 'Search query too long'),
  language: z.string().trim().toLowerCase().length(2).optional(),
  currency: z.string().trim().toUpperCase().length(3).optional(),
  checkin: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD').optional(),
  checkout: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD').optional(),
  adults: z.coerce.number().int().min(1, 'At least 1 adult required').max(8, 'Maximum 8 adults allowed').optional(),
  rooms: z.coerce.number().int().min(1, 'At least 1 room required').max(4, 'Maximum 4 rooms allowed').optional(),
  brief: z.string().trim().min(3).max(240).optional(),
  minStars: z.coerce.number().min(0).max(5).optional(),
  minGuestRating: z.coerce.number().min(0).max(10).optional(),
  maxPrice: z.coerce.number().min(50).max(5000).optional()
});

export async function GET(request: NextRequest) {
  try {
    const parsed = querySchema.safeParse({
      q: request.nextUrl.searchParams.get('q'),
      language: request.nextUrl.searchParams.get('language') ?? undefined,
      currency: request.nextUrl.searchParams.get('currency') ?? undefined,
      checkin: request.nextUrl.searchParams.get('checkin') ?? undefined,
      checkout: request.nextUrl.searchParams.get('checkout') ?? undefined,
      adults: request.nextUrl.searchParams.get('adults') ?? undefined,
      rooms: request.nextUrl.searchParams.get('rooms') ?? undefined,
      brief: request.nextUrl.searchParams.get('brief') ?? undefined,
      minStars: request.nextUrl.searchParams.get('minStars') ?? undefined,
      minGuestRating: request.nextUrl.searchParams.get('minGuestRating') ?? undefined,
      maxPrice: request.nextUrl.searchParams.get('maxPrice') ?? undefined
    });

    if (!parsed.success) {
      const errors = parsed.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    const q = parsed.data.q;
    const language = parsed.data.language;
    const currency = parsed.data.currency;
    const checkin = parsed.data.checkin;
    const checkout = parsed.data.checkout;
    const adults = parsed.data.adults;
    const rooms = parsed.data.rooms;
    const brief = parsed.data.brief;
    const minStars = parsed.data.minStars;
    const minGuestRating = parsed.data.minGuestRating;
    const maxPrice = parsed.data.maxPrice;
    const clientIp = getClientIp(request);
    await assertRateLimit(`property-preview:${clientIp}`);

    const briefKey = brief ? brief.toLowerCase().replace(/\s+/g, '-').slice(0, 80) : 'none';
    const filterKey = [
      typeof minStars === 'number' ? `stars-${minStars}` : 'stars-any',
      typeof minGuestRating === 'number' ? `rating-${minGuestRating}` : 'rating-any',
      typeof maxPrice === 'number' ? `max-${maxPrice}` : 'max-any'
    ].join(':');
    const payload = await getOrSetRedisCache(
      `property-preview:${q.toLowerCase()}:${language ?? 'en'}:${currency ?? 'default'}:${checkin ?? 'auto'}:${checkout ?? 'auto'}:${adults ?? 2}:${rooms ?? 1}:${briefKey}:${filterKey}`,
      CACHE_TTL_SECONDS.propertyPreview,
      async () => {
        return searchPropertyPreviews(q, language, currency, checkin, checkout, adults, rooms, {
          brief,
          minStars,
          minGuestRating,
          maxPrice
        });
      }
    );

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const httpError = toHttpError(error);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
