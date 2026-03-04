import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/server/supabase/server';
import { assertAdminAuthorized } from '@/server/authz';
import { HttpError } from '@/server/errors';

type RouteContext = {
  params: Promise<{
    bookingId: string;
  }>;
};

function roundCurrency(value: number | null): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return Math.round(value * 100) / 100;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await assertAdminAuthorized(supabase, user);

    const { bookingId } = await context.params;
    if (!bookingId?.trim()) {
      return NextResponse.json({ error: 'Invalid booking id' }, { status: 400 });
    }

    const [bookingResult, commissionResult, paymentResult] = await Promise.allSettled([
      supabase
        .from('bookings')
        .select(
          'id, status, total_amount, commission_amount, currency, liteapi_booking_id, payment_status, confirmation_code, latest_payment_log_id, metadata, created_at'
        )
        .eq('id', bookingId)
        .single(),
      supabase
        .from('commission_tracking')
        .select(
          'id, booking_id, payment_log_id, gross_booking_value, commission_percent, commission_amount, currency, metadata, created_at, updated_at'
        )
        .eq('booking_id', bookingId)
        .maybeSingle(),
      supabase
        .from('payment_logs')
        .select(
          'id, booking_id, provider, external_payment_id, event_type, status, amount, currency, correlation_id, metadata, created_at'
        )
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })
        .limit(1)
    ]);

    if (bookingResult.status !== 'fulfilled' || bookingResult.value.error || !bookingResult.value.data) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = bookingResult.value.data;
    const commission =
      commissionResult.status === 'fulfilled' && !commissionResult.value.error
        ? commissionResult.value.data
        : null;
    const payment =
      paymentResult.status === 'fulfilled' && !paymentResult.value.error
        ? (paymentResult.value.data?.[0] ?? null)
        : null;

    const bookingTotal =
      typeof booking.total_amount === 'number'
        ? booking.total_amount
        : typeof (booking.metadata as Record<string, unknown> | null)?.totalAmount === 'number'
          ? ((booking.metadata as Record<string, unknown>).totalAmount as number)
          : 0;
    const bookingCommission =
      typeof booking.commission_amount === 'number'
        ? booking.commission_amount
        : typeof (booking.metadata as Record<string, unknown> | null)?.commissionAmount === 'number'
          ? ((booking.metadata as Record<string, unknown>).commissionAmount as number)
          : 0;
    const trackedGross = typeof commission?.gross_booking_value === 'number' ? commission.gross_booking_value : null;
    const trackedCommission = typeof commission?.commission_amount === 'number' ? commission.commission_amount : null;

    const grossDelta =
      trackedGross === null ? null : roundCurrency(bookingTotal - trackedGross);
    const commissionDelta =
      trackedCommission === null ? null : roundCurrency(bookingCommission - trackedCommission);

    return NextResponse.json({
      booking,
      commission,
      latestPaymentLog: payment,
      issueState: {
        resolved:
          ((booking.metadata as Record<string, unknown> | null)?.reconciliation as Record<string, unknown> | undefined)
            ?.resolved === true,
        resolvedAt:
          typeof ((booking.metadata as Record<string, unknown> | null)?.reconciliation as Record<string, unknown> | undefined)
            ?.resolvedAt === 'string'
            ? (((booking.metadata as Record<string, unknown>).reconciliation as Record<string, unknown>).resolvedAt as string)
            : null,
        resolvedBy:
          typeof ((booking.metadata as Record<string, unknown> | null)?.reconciliation as Record<string, unknown> | undefined)
            ?.resolvedBy === 'string'
            ? (((booking.metadata as Record<string, unknown>).reconciliation as Record<string, unknown>).resolvedBy as string)
            : null,
        resolutionNote:
          typeof ((booking.metadata as Record<string, unknown> | null)?.reconciliation as Record<string, unknown> | undefined)
            ?.resolutionNote === 'string'
            ? (((booking.metadata as Record<string, unknown>).reconciliation as Record<string, unknown>).resolutionNote as string)
            : null
      },
      reconciliation: {
        grossDelta,
        commissionDelta,
        hasTracking: Boolean(commission),
        hasPaymentLog: Boolean(payment)
      }
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
