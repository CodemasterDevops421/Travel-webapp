'use client';

import { useQuery } from '@tanstack/react-query';

export type PropertyPreview = {
  hotelId: string;
  name: string;
  city: string;
  countryCode?: string;
  starRating: number | null;
  price: number | null;
  currency: string;
};

async function fetchPropertyPreview(query: string): Promise<PropertyPreview[]> {
  const response = await fetch(`/api/property-preview?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('Property preview failed');
  return response.json();
}

export function usePropertyPreview(query: string) {
  return useQuery({
    queryKey: ['property-preview', query],
    queryFn: () => fetchPropertyPreview(query),
    enabled: query.length > 2,
    staleTime: 120_000
  });
}
