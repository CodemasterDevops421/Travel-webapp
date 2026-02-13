'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CACHE_STALE_TIME_MS } from '@/shared/lib/cache-ttl';

export type AutocompleteItem = {
  id: string;
  name: string;
  type: 'city' | 'hotel' | 'landmark';
  countryCode?: string;
  source: 'inventory' | 'maps';
};

async function fetchAutocomplete(query: string): Promise<AutocompleteItem[]> {
  const response = await fetch(`/api/autocomplete?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('Autocomplete failed');
  return response.json();
}

function useDebouncedValue(value: string, delayMs: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timeoutId);
  }, [delayMs, value]);

  return debouncedValue;
}

export function useAutocomplete(query: string) {
  const debouncedQuery = useDebouncedValue(query.trim(), 250);

  return useQuery({
    queryKey: ['autocomplete', debouncedQuery],
    queryFn: () => fetchAutocomplete(debouncedQuery),
    enabled: debouncedQuery.length > 2,
    staleTime: CACHE_STALE_TIME_MS.autocomplete
  });
}
