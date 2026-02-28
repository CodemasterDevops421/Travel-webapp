import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertRateLimit } from '@/server/ratelimit';
import { getClientIp } from '@/server/request';
import { getOrSetRedisCache } from '@/server/cache';
import { getGuestReviews } from '@/server/liteapi';
import { toHttpError } from '@/server/errors';
import { getReviewsCache, isReviewsCacheStale, upsertReviewsCache } from '@/server/reviews-cache-repository';
import { CACHE_TTL_SECONDS } from '@/shared/lib/cache-ttl';

type ReviewSnippet = {
  hotelId: string;
  quote: string;
  author: string | null;
  score: number | null;
};

type ReviewSnippetCachePayload = {
  snippet: ReviewSnippet | null;
};

const querySchema = z.object({
  hotelIds: z.string().trim().min(1).max(1200)
});

function truncateSnippet(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 160) {
    return trimmed;
  }
  return `${trimmed.slice(0, 157)}...`;
}

async function loadSnippet(hotelId: string): Promise<ReviewSnippet | null> {
  const cacheKey = `review-snippet:${hotelId}`;
  return getOrSetRedisCache(cacheKey, CACHE_TTL_SECONDS.propertyPreview, async () => {
    const canonical = await getReviewsCache(hotelId);
    if (canonical && !isReviewsCacheStale(canonical)) {
      const payload = canonical.payload as ReviewSnippetCachePayload | null;
      if (payload && typeof payload === 'object' && 'snippet' in payload) {
        return payload.snippet;
      }
    }

    const reviews = await getGuestReviews(hotelId, 3);
    if (!reviews || reviews.length === 0) {
      await upsertReviewsCache({
        hotelId,
        payload: { snippet: null },
        ttlSeconds: CACHE_TTL_SECONDS.propertyPreview
      });
      return null;
    }

    const firstReview = reviews.find((item) => item.comment.trim().length > 0) ?? reviews[0];
    const snippet: ReviewSnippet = {
      hotelId,
      quote: truncateSnippet(firstReview.comment),
      author: firstReview.author,
      score: firstReview.score
    };

    await upsertReviewsCache({
      hotelId,
      payload: { snippet },
      ttlSeconds: CACHE_TTL_SECONDS.propertyPreview
    });

    return snippet;
  });
}

export async function GET(request: NextRequest) {
  try {
    const parsed = querySchema.parse({
      hotelIds: request.nextUrl.searchParams.get('hotelIds')
    });

    await assertRateLimit(`review-snippets:${getClientIp(request)}`);

    const hotelIds = Array.from(
      new Set(
        parsed.hotelIds
          .split(',')
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
      )
    ).slice(0, 10);

    const snippets = await Promise.all(hotelIds.map((hotelId) => loadSnippet(hotelId)));
    return NextResponse.json({
      snippets: snippets.filter((item): item is ReviewSnippet => item !== null)
    });
  } catch (error) {
    const httpError = toHttpError(error);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
