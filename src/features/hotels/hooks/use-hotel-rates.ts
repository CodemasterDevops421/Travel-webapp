'use client';

import { useQuery } from '@tanstack/react-query';
import { CACHE_STALE_TIME_MS } from '@/shared/lib/cache-ttl';
import { type HotelRateOption } from '@/server/liteapi';

type UseHotelRatesParams = {
    hotelId: string;
    checkin: string;
    checkout: string;
    adults: number;
    rooms: number;
    currency?: string;
    guestNationality?: string;
};

async function fetchHotelRates(params: UseHotelRatesParams): Promise<HotelRateOption[]> {
    const searchParams = new URLSearchParams({
        hotelId: params.hotelId,
        checkin: params.checkin,
        checkout: params.checkout,
        adults: String(params.adults),
        rooms: String(params.rooms)
    });

    if (params.currency) searchParams.set('currency', params.currency);
    if (params.guestNationality) searchParams.set('guestNationality', params.guestNationality);

    const response = await fetch(`/api/hotels/rates?${searchParams.toString()}`);
    if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error('Failed to fetch hotel rates');
    }
    return response.json();
}

export function useHotelRates(
    params: UseHotelRatesParams,
    options?: { initialData?: HotelRateOption[] }
) {
    return useQuery({
        queryKey: [
            'hotel-rates',
            params.hotelId,
            params.checkin,
            params.checkout,
            params.adults,
            params.rooms,
            params.currency,
            params.guestNationality
        ],
        queryFn: () => fetchHotelRates(params),
        enabled: !!params.hotelId && !!params.checkin && !!params.checkout,
        staleTime: CACHE_STALE_TIME_MS.hotelRates,
        initialData: options?.initialData,
    });
}
