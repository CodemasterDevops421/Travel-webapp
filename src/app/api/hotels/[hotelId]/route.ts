import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertRateLimit } from '@/server/ratelimit';
import { getHotelDetails } from '@/server/liteapi';
import { getOrSetRedisCache } from '@/server/cache';
import { toHttpError } from '@/server/errors';
import { CACHE_TTL_SECONDS } from '@/shared/lib/cache-ttl';
import { getClientIp } from '@/server/request';

const paramsSchema = z.object({
    hotelId: z.string().trim().min(1)
});

const querySchema = z.object({
    language: z.string().trim().length(2).optional(),
    currency: z.string().trim().length(3).optional()
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ hotelId: string }> }) {
    try {
        const { hotelId } = await params;
        const paramsResult = paramsSchema.safeParse({ hotelId });

        if (!paramsResult.success) {
            return NextResponse.json({ error: 'Invalid hotel ID' }, { status: 400 });
        }

        const queryResult = querySchema.safeParse({
            language: request.nextUrl.searchParams.get('language') ?? undefined,
            currency: request.nextUrl.searchParams.get('currency') ?? undefined
        });

        if (!queryResult.success) {
            return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
        }

        const { language, currency } = queryResult.data;
        const clientIp = getClientIp(request);
        await assertRateLimit(`hotel-details:${clientIp}`);

        const cacheKey = `hotel-details:${hotelId}:${language ?? 'en'}:${currency ?? 'USD'}`;
        const payload = await getOrSetRedisCache(
            cacheKey,
            CACHE_TTL_SECONDS.hotelDetails,
            async () => {
                return getHotelDetails(hotelId, language, currency);
            }
        );

        if (!payload) {
            return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
        }

        return NextResponse.json(payload, { status: 200 });
    } catch (error) {
        const httpError = toHttpError(error);
        return NextResponse.json({ error: httpError.message }, { status: httpError.status });
    }
}
