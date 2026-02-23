'use client';

import { useQuery } from '@tanstack/react-query';
import { CACHE_STALE_TIME_MS } from '@/shared/lib/cache-ttl';
import { type HotelRateOption } from '@/server/liteapi';

export type HotelRateWithCancellationContext = HotelRateOption & {
    isRefundable: boolean | null;
    cancellationDeadline: string | null;
    cancellationNote: string | null;
};

type UseHotelRatesParams = {
    hotelId: string;
    checkin: string;
    checkout: string;
    adults: number;
    rooms: number;
    currency?: string;
    guestNationality?: string;
};

function toRefundableStatus(refundableTag: string): boolean | null {
    const normalized = refundableTag.trim().toLowerCase();
    if (!normalized) return null;
    if (normalized.includes('non-refund')) return false;
    if (normalized.includes('refund')) return true;
    return null;
}

function normalizeRate(rate: HotelRateOption): HotelRateWithCancellationContext {
    const cancellationDeadline = typeof rate.cancelTime === 'string' ? rate.cancelTime : null;
    const isRefundable = toRefundableStatus(rate.refundableTag ?? '');

    return {
        ...rate,
        cancellationDeadline,
        isRefundable,
        cancellationNote:
            isRefundable === false
                ? 'Non-refundable'
                : cancellationDeadline
                    ? `Free cancellation until ${cancellationDeadline}`
                    : isRefundable === true
                        ? 'Refundable (deadline not provided by supplier)'
                        : null
    };
}

async function fetchHotelRates(params: UseHotelRatesParams): Promise<HotelRateWithCancellationContext[]> {
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
    const json = (await response.json()) as HotelRateOption[];
    return json.map(normalizeRate);
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
        initialData: options?.initialData?.map(normalizeRate),
    });
}
