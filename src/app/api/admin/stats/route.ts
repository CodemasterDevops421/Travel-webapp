import { createServerSupabaseClient } from '@/server/supabase/server';
import { assertAdminAuthorized } from '@/server/authz';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = await createServerSupabaseClient();
        const {
            data: { user }
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await assertAdminAuthorized(supabase, user.id);

        // Fetch stats in parallel
        const [bookingsResult, usersResult, revenueResult] = await Promise.allSettled([
            supabase.from('bookings').select('id, status, created_at, metadata', { count: 'exact' }),
            supabase.from('profiles').select('id', { count: 'exact' }),
            supabase.from('bookings').select('metadata')
        ]);

        const totalBookings =
            bookingsResult.status === 'fulfilled' ? (bookingsResult.value.count ?? 0) : 0;
        const activeUsers =
            usersResult.status === 'fulfilled' ? (usersResult.value.count ?? 0) : 0;

        // Calculate revenue from booking metadata
        let totalRevenue = 0;
        if (revenueResult.status === 'fulfilled' && revenueResult.value.data) {
            for (const booking of revenueResult.value.data) {
                const meta = booking.metadata as Record<string, unknown> | null;
                if (meta && typeof meta.totalAmount === 'number') {
                    totalRevenue += meta.totalAmount;
                }
            }
        }

        // Recent bookings
        const { data: recentBookings } = await supabase
            .from('bookings')
            .select('id, liteapi_booking_id, status, created_at, metadata')
            .order('created_at', { ascending: false })
            .limit(10);

        return NextResponse.json({
            stats: {
                totalBookings,
                activeUsers,
                totalRevenue: Math.round(totalRevenue * 100) / 100,
                conversionRate: totalBookings > 0 ? ((totalBookings / Math.max(activeUsers, 1)) * 100).toFixed(1) : '0.0'
            },
            recentBookings: recentBookings || []
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal server error';
        const isForbidden = message === 'Forbidden';
        const isUnauthorized = message === 'Unauthorized';
        const status = isForbidden ? 403 : isUnauthorized ? 401 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
