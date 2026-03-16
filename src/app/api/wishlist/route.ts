import { createServerSupabaseClient } from '@/server/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertSameOrigin } from '@/server/csrf';
import { assertRateLimit, createRateLimitKey } from '@/server/ratelimit';
import { getClientIp, sanitizeRecord } from '@/server/request';

const wishlistBodySchema = z.object({
    hotelId: z.string().trim().min(1),
    hotelName: z.string().trim().max(200).optional(),
    hotelImage: z.string().trim().url().optional(),
    starRating: z.number().min(0).max(5).optional(),
    city: z.string().trim().max(120).optional()
});

const wishlistQuerySchema = z.object({
    page: z.coerce.number().int().min(1).max(100).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional()
});

export async function GET(request: Request) {
    try {
        const parsedQuery = wishlistQuerySchema.safeParse({
            page: new URL(request.url).searchParams.get('page') ?? undefined,
            limit: new URL(request.url).searchParams.get('limit') ?? undefined
        });
        const page = parsedQuery.success ? (parsedQuery.data.page ?? 1) : 1;
        const limit = parsedQuery.success ? (parsedQuery.data.limit ?? 20) : 20;
        const start = (page - 1) * limit;
        const end = start + limit - 1;

        const supabase = await createServerSupabaseClient();
        const {
            data: { user }
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error, count } = await supabase
            .from('saved_hotels')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .range(start, end);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            data,
            pagination: {
                page,
                limit,
                total: count ?? 0,
                totalPages: Math.max(1, Math.ceil((count ?? 0) / limit))
            }
        });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        assertSameOrigin(request);
        await assertRateLimit(createRateLimitKey('mutation', getClientIp(request), 'wishlist-post'), 'mutation');
        const supabase = await createServerSupabaseClient();
        const {
            data: { user }
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = wishlistBodySchema.parse(sanitizeRecord(await request.json()));
        const { hotelId, hotelName, hotelImage, starRating, city } = body;

        if (!hotelId) {
            return NextResponse.json({ error: 'hotelId is required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('saved_hotels')
            .upsert(
                {
                    user_id: user.id,
                    hotel_id: hotelId,
                    hotel_name: hotelName || null,
                    hotel_image: hotelImage || null,
                    star_rating: starRating || null,
                    city: city || null
                },
                { onConflict: 'user_id,hotel_id' }
            )
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data }, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        assertSameOrigin(request);
        await assertRateLimit(createRateLimitKey('mutation', getClientIp(request), 'wishlist-delete'), 'mutation');
        const supabase = await createServerSupabaseClient();
        const {
            data: { user }
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const hotelId = searchParams.get('hotelId');

        if (!hotelId) {
            return NextResponse.json({ error: 'hotelId is required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('saved_hotels')
            .delete()
            .eq('user_id', user.id)
            .eq('hotel_id', hotelId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
