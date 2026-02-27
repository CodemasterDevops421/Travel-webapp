'use client';

import { useQuery } from '@tanstack/react-query';
import { CACHE_STALE_TIME_MS } from '@/shared/lib/cache-ttl';

export type ReviewSnippet = {
  hotelId: string;
  quote: string;
  author: string | null;
  score: number | null;
};

type ReviewSnippetResponse = {
  snippets: ReviewSnippet[];
};

async function fetchReviewSnippets(hotelIds: string[]): Promise<ReviewSnippet[]> {
  if (hotelIds.length === 0) {
    return [];
  }

  const params = new URLSearchParams({
    hotelIds: hotelIds.join(',')
  });

  const response = await fetch(`/api/review-snippets?${params.toString()}`);
  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as ReviewSnippetResponse;
  return payload.snippets ?? [];
}

export function useReviewSnippets(hotelIds: string[]) {
  const normalizedIds = hotelIds.filter((item) => item.trim().length > 0).slice(0, 10);
  return useQuery({
    queryKey: ['review-snippets', normalizedIds.join(',')],
    queryFn: () => fetchReviewSnippets(normalizedIds),
    enabled: normalizedIds.length > 0,
    staleTime: CACHE_STALE_TIME_MS.propertyPreview
  });
}
