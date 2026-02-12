'use client';

import { useQuery } from '@tanstack/react-query';

export type AutocompleteItem = {
  id: string;
  name: string;
  type: 'city' | 'hotel' | 'landmark';
  countryCode?: string;
  source: 'liteapi' | 'google';
};

async function fetchAutocomplete(query: string): Promise<AutocompleteItem[]> {
  const response = await fetch(`/api/autocomplete?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('Autocomplete failed');
  return response.json();
}

export function useAutocomplete(query: string) {
  return useQuery({
    queryKey: ['autocomplete', query],
    queryFn: () => fetchAutocomplete(query),
    enabled: query.length > 2,
    staleTime: 60_000
  });
}
