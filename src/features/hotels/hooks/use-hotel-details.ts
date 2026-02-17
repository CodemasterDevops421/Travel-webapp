'use client';

import { useQuery } from '@tanstack/react-query';
import { CACHE_STALE_TIME_MS } from '@/shared/lib/cache-ttl';
import { type HotelDetails } from '@/server/liteapi';

async function fetchHotelDetails(hotelId: string, language?: string, currency?: string): Promise<HotelDetails | null> {
    const params = new URLSearchParams();
    if (language) params.set('language', language);
    if (currency) params.set('currency', currency);

    const response = await fetch(`/api/hotels/${hotelId}?${params.toString()}`);
    if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch hotel details');
    }
    return response.json();
}

export function useHotelDetails(
    hotelId: string,
    language?: string,
    currency?: string,
    options?: { initialData?: HotelDetails }
) {
    return useQuery({
        queryKey: ['hotel-details', hotelId, language, currency],
        queryFn: () => fetchHotelDetails(hotelId, language, currency),
        enabled: !!hotelId,
        staleTime: CACHE_STALE_TIME_MS.hotelDetails,
        initialData: options?.initialData,
    });
}
