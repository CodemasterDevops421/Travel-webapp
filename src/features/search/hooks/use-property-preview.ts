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
};

async function fetchPropertyPreview(
  query: string,
  language: string,
  currency: string,
  checkin: string,
  checkout: string,
  adults: number,
  rooms: number
): Promise<PropertyPreview[]> {
  const response = await fetch(
    `/api/property-preview?q=${encodeURIComponent(query)}&language=${encodeURIComponent(language)}&currency=${encodeURIComponent(currency)}&checkin=${encodeURIComponent(checkin)}&checkout=${encodeURIComponent(checkout)}&adults=${adults}&rooms=${rooms}`
  );
  if (!response.ok) throw new Error('Property preview failed');
  return response.json();
}

export function usePropertyPreview(
  query: string,
  language: string,
  currency: string,
  checkin: string,
  checkout: string,
  adults: number,
  rooms: number
) {
  return useQuery({
    queryKey: ['property-preview', query, language, currency, checkin, checkout, adults, rooms],
    queryFn: () => fetchPropertyPreview(query, language, currency, checkin, checkout, adults, rooms),
    enabled: query.length > 2,
    staleTime: CACHE_STALE_TIME_MS.propertyPreview
  });
}
