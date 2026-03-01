import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertRateLimit } from '@/server/ratelimit';
import { getHotelRates } from '@/server/liteapi';
import { getOrSetRedisCache } from '@/server/cache';
import { toHttpError } from '@/server/errors';
import { CACHE_TTL_SECONDS } from '@/shared/lib/cache-ttl';
import { env } from '@/server/env';
import { getRequestContext, stripSupplierSecrets } from '@/server/request';
import type { HotelRateOption } from '@/server/liteapi';
import { getAppSettings } from '@/server/settings/repository';

type RateWithCancellationContext = HotelRateOption & {
    isRefundable: boolean | null;
    cancellationDeadline: string | null;
    cancellationNote: string | null;
};

function toRefundableStatus(refundableTag: string): boolean | null {
    const normalized = refundableTag.trim().toLowerCase();
    if (!normalized) return null;
    if (normalized.includes('non-refund')) return false;
    if (normalized.includes('refund')) return true;
    return null;
}

function toCancellationNote(refundable: boolean | null, deadline: string | null): string | null {
    if (refundable === false) {
        return 'Non-refundable';
    }
    if (deadline) {
        return `Free cancellation until ${deadline}`;
    }
    if (refundable === true) {
        return 'Refundable (deadline not provided by supplier)';
    }
    return null;
}

function normalizeRates(payload: unknown): RateWithCancellationContext[] {
    const rates = Array.isArray(payload) ? payload : [];
    return rates.map((rate) => {
        const typedRate = rate as HotelRateOption;
        const cancellationDeadline = typeof typedRate.cancelTime === 'string' ? typedRate.cancelTime : null;
        const isRefundable = toRefundableStatus(String(typedRate.refundableTag ?? ''));

        return {
            ...typedRate,
            cancellationDeadline,
            isRefundable,
            cancellationNote: toCancellationNote(isRefundable, cancellationDeadline)
        };
    });
}

const querySchema = z.object({
    hotelId: z.string().trim().min(1),
    checkin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    checkout: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    adults: z.coerce.number().int().min(1).max(10),
    rooms: z.coerce.number().int().min(1).max(5),
    currency: z.string().trim().length(3).optional(),
    guestNationality: z.string().trim().length(2).optional()
});

export async function GET(request: NextRequest) {
    try {
        if (!env.LITEAPI_API_KEY || env.LITEAPI_API_KEY.toLowerCase().includes('placeholder')) {
            return NextResponse.json({ error: 'Live hotel rates are temporarily unavailable.' }, { status: 503 });
        }

        const searchParams = Object.fromEntries(request.nextUrl.searchParams);
        const result = querySchema.safeParse(searchParams);

        if (!result.success) {
            return NextResponse.json({ error: 'Invalid query parameters', details: result.error.format() }, { status: 400 });
        }

        const { hotelId, checkin, checkout, adults, rooms, currency, guestNationality } = result.data;
        const { clientIp } = getRequestContext(request);
        await assertRateLimit(`hotel-rates:${clientIp}`);
        const settings = await getAppSettings();

        const cacheKey = `hotel-rates:${hotelId}:${checkin}:${checkout}:${adults}:${rooms}:${currency ?? 'USD'}:${guestNationality ?? 'US'}:m${settings.commissionPercent}`;
        const payload = await getOrSetRedisCache(
            cacheKey,
            CACHE_TTL_SECONDS.hotelRates,
            async () => {
                return getHotelRates({
                    hotelId,
                    checkin,
                    checkout,
                    adults,
                    rooms,
                    currency,
                    guestNationality,
                    margin: settings.commissionPercent
                });
            }
        );

        return NextResponse.json(normalizeRates(stripSupplierSecrets(payload)), { status: 200 });
    } catch (error) {
        const httpError = toHttpError(error);
        return NextResponse.json({ error: httpError.message }, { status: httpError.status });
    }
}
