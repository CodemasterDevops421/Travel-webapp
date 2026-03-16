import { createServerSupabaseClient } from '@/server/supabase/server';
import { assertAdminAuthorized } from '@/server/authz';
import { HttpError } from '@/server/errors';
import { NextRequest, NextResponse } from 'next/server';

function parseRecentLimit(raw: string | null): number {
    if (raw == null || raw.trim() === '') return 10;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return 10;
    return Math.max(1, Math.min(50, Math.floor(parsed)));
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const {
            data: { user }
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await assertAdminAuthorized(supabase, user);
        const recentLimit = parseRecentLimit(request.nextUrl.searchParams.get('recentLimit'));
        const periodStartIso = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)).toISOString();

        // Fetch stats in parallel
        const [bookingsResult, usersResult, revenueSummaryResult] = await Promise.allSettled([
            supabase.from('bookings').select('id', { count: 'exact', head: true }),
            supabase.from('profiles').select('id', { count: 'exact' }),
            supabase.rpc('fn_admin_reconciliation_summary', { period_start_iso: periodStartIso })
        ]);

        const totalBookings =
            bookingsResult.status === 'fulfilled' ? (bookingsResult.value.count ?? 0) : 0;
        const activeUsers =
            usersResult.status === 'fulfilled' ? (usersResult.value.count ?? 0) : 0;

        const revenueSummary = revenueSummaryResult.status === 'fulfilled' && Array.isArray(revenueSummaryResult.value.data)
            ? revenueSummaryResult.value.data[0] as { gross_confirmed_amount?: number | null } | undefined
            : undefined;
        const totalRevenue = typeof revenueSummary?.gross_confirmed_amount === 'number'
            ? revenueSummary.gross_confirmed_amount
            : 0;

        // Recent bookings
        const { data: recentBookings } = await supabase
            .from('bookings')
            .select('id, liteapi_booking_id, status, created_at, metadata')
            .order('created_at', { ascending: false })
            .limit(recentLimit);

        return NextResponse.json({
            stats: {
                totalBookings,
                activeUsers,
                totalRevenue: Math.round(totalRevenue * 100) / 100,
                conversionRate: totalBookings > 0 ? ((totalBookings / Math.max(activeUsers, 1)) * 100).toFixed(1) : '0.0'
            },
            recentBookings: recentBookings || []
        });
    } catch (error) {
        if (error instanceof HttpError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
