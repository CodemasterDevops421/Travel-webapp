'use client';

import { useQuery } from '@tanstack/react-query';
import { CACHE_STALE_TIME_MS } from '@/shared/lib/cache-ttl';

export type PropertyPreview = {
  hotelId: string;
  name: string;
  city: string;
  countryCode?: string;
  starRating: number | null;
  reviewScore?: number | null;
  reviewCount?: number | null;
  imageUrl?: string;
  price: number | null;
  currency: string;
  amenities?: string[];
};

export type PropertyPreviewFilters = {
  brief?: string;
  minStars?: number;
  minGuestRating?: number;
  maxPrice?: number;
};

export type PropertyPreviewEnvelope = {
  data: PropertyPreview[];
  results: PropertyPreview[];
  degraded: boolean;
  degradedReason: 'timeout' | 'partial' | 'unavailable' | null;
  asOf: string;
  freshness: 'fresh' | 'stale';
};

async function fetchPropertyPreview(
  query: string,
  language: string,
  currency: string,
  checkin: string,
  checkout: string,
  adults: number,
  rooms: number,
  filters?: PropertyPreviewFilters
): Promise<PropertyPreviewEnvelope> {
  const brief = filters?.brief;
  const params = new URLSearchParams({
    q: query,
    language,
    currency,
    checkin,
    checkout,
    adults: String(adults),
    rooms: String(rooms)
  });
  if (brief && brief.trim().length > 2) {
    params.set('brief', brief.trim());
  }
  if (typeof filters?.minStars === 'number') {
    params.set('minStars', String(filters.minStars));
  }
  if (typeof filters?.minGuestRating === 'number') {
    params.set('minGuestRating', String(filters.minGuestRating));
  }
  if (typeof filters?.maxPrice === 'number') {
    params.set('maxPrice', String(filters.maxPrice));
  }

  const response = await fetch(`/api/property-preview?${params.toString()}`);
  if (!response.ok) throw new Error('Property preview failed');
  const payload = (await response.json()) as PropertyPreview[] | PropertyPreviewEnvelope;
  if (Array.isArray(payload)) {
    const now = new Date().toISOString();
    return {
      data: payload,
      results: payload,
      degraded: false,
      degradedReason: null,
      asOf: now,
      freshness: 'fresh'
    };
  }

  if (Array.isArray(payload.data) && Array.isArray(payload.results)) {
    return payload;
  }

  const normalizedResults = Array.isArray(payload.results) ? payload.results : payload.data;
  return {
    data: normalizedResults,
    results: normalizedResults,
    degraded: payload.degraded,
    degradedReason: payload.degradedReason,
    asOf: payload.asOf,
    freshness: payload.freshness
  };
}

export function usePropertyPreview(
  query: string,
  language: string,
  currency: string,
  checkin: string,
  checkout: string,
  adults: number,
  rooms: number,
  filters?: PropertyPreviewFilters
) {
  const resolvedBrief = filters?.brief?.trim() ?? '';
  const resolvedMinStars = filters?.minStars ?? null;
  const resolvedMinGuestRating = filters?.minGuestRating ?? null;
  const resolvedMaxPrice = filters?.maxPrice ?? null;
  return useQuery({
    queryKey: [
      'property-preview',
      query,
      language,
      currency,
      checkin,
      checkout,
      adults,
      rooms,
      resolvedBrief,
      resolvedMinStars,
      resolvedMinGuestRating,
      resolvedMaxPrice
    ],
    queryFn: () => fetchPropertyPreview(query, language, currency, checkin, checkout, adults, rooms, filters),
    enabled: query.length > 2,
    staleTime: CACHE_STALE_TIME_MS.propertyPreview
  });
}
