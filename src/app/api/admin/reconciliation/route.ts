import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/server/supabase/server';
import { assertAdminAuthorized } from '@/server/authz';
import { HttpError } from '@/server/errors';

type BookingRow = {
  id: string;
  status: string;
  total_amount: number | null;
  commission_amount: number | null;
  currency: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type CommissionRow = {
  booking_id: string;
  gross_booking_value: number;
  commission_amount: number;
  commission_percent: number;
  currency: string;
  updated_at: string;
};

type ReconciliationIssue = {
  bookingId: string;
  type: 'missing_tracking' | 'amount_mismatch' | 'currency_mismatch';
  detail: string;
  createdAt: string;
};

function readMetadataNumber(metadata: Record<string, unknown> | null, key: string): number | null {
  const value = metadata?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readMetadataPercent(metadata: Record<string, unknown> | null): number | null {
  const value = metadata?.commissionPercent;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await assertAdminAuthorized(supabase, user);

    const periodDays = 30;
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);

    const [bookingsResult, commissionResult] = await Promise.allSettled([
      supabase
        .from('bookings')
        .select('id, status, total_amount, commission_amount, currency, metadata, created_at')
        .gte('created_at', periodStart.toISOString())
        .in('status', ['confirmed', 'refunded'])
        .order('created_at', { ascending: false }),
      supabase
        .from('commission_tracking')
        .select('booking_id, gross_booking_value, commission_amount, commission_percent, currency, updated_at')
        .gte('updated_at', periodStart.toISOString())
    ]);

    const bookings: BookingRow[] =
      bookingsResult.status === 'fulfilled' ? ((bookingsResult.value.data as BookingRow[]) ?? []) : [];
    const commissionRows: CommissionRow[] =
      commissionResult.status === 'fulfilled' ? ((commissionResult.value.data as CommissionRow[]) ?? []) : [];

    const commissionByBookingId = new Map<string, CommissionRow>();
    for (const row of commissionRows) {
      commissionByBookingId.set(row.booking_id, row);
    }

    let grossConfirmedAmount = 0;
    let recordedCommissionAmount = 0;
    let expectedCommissionAmount = 0;
    let reconciledCount = 0;
    let mismatchCount = 0;
    const issues: ReconciliationIssue[] = [];

    for (const booking of bookings) {
      const tracking = commissionByBookingId.get(booking.id);
      const bookingTotal = typeof booking.total_amount === 'number' ? booking.total_amount : 0;
      grossConfirmedAmount += bookingTotal;

      const bookingCommission =
        typeof booking.commission_amount === 'number'
          ? booking.commission_amount
          : readMetadataNumber(booking.metadata, 'commissionAmount');

      const commissionPercent = readMetadataPercent(booking.metadata);
      const expectedFromPercent =
        typeof commissionPercent === 'number' ? bookingTotal * (commissionPercent / 100) : null;
      const expectedCommission =
        bookingCommission ?? tracking?.commission_amount ?? expectedFromPercent ?? 0;
      expectedCommissionAmount += expectedCommission;

      if (!tracking) {
        issues.push({
          bookingId: booking.id,
          type: 'missing_tracking',
          detail: 'No commission_tracking row found for booking',
          createdAt: booking.created_at
        });
        continue;
      }

      reconciledCount += 1;
      recordedCommissionAmount += tracking.commission_amount;

      if (booking.currency && tracking.currency && booking.currency !== tracking.currency) {
        mismatchCount += 1;
        issues.push({
          bookingId: booking.id,
          type: 'currency_mismatch',
          detail: `Booking currency ${booking.currency} differs from tracking currency ${tracking.currency}`,
          createdAt: booking.created_at
        });
        continue;
      }

      if (
        Math.abs(roundCurrency(tracking.gross_booking_value) - roundCurrency(bookingTotal)) > 0.01 ||
        Math.abs(roundCurrency(tracking.commission_amount) - roundCurrency(expectedCommission)) > 0.01
      ) {
        mismatchCount += 1;
        issues.push({
          bookingId: booking.id,
          type: 'amount_mismatch',
          detail: `Gross/commission mismatch (booking=${roundCurrency(bookingTotal)}, tracking=${roundCurrency(tracking.gross_booking_value)})`,
          createdAt: booking.created_at
        });
      }
    }

    const confirmedCount = bookings.length;
    const pendingCount = Math.max(confirmedCount - reconciledCount, 0);
    const coveragePercent = confirmedCount > 0 ? (reconciledCount / confirmedCount) * 100 : 100;
    const varianceAmount = roundCurrency(expectedCommissionAmount - recordedCommissionAmount);

    return NextResponse.json({
      periodDays,
      summary: {
        confirmedCount,
        reconciledCount,
        pendingCount,
        mismatchCount,
        grossConfirmedAmount: roundCurrency(grossConfirmedAmount),
        expectedCommissionAmount: roundCurrency(expectedCommissionAmount),
        recordedCommissionAmount: roundCurrency(recordedCommissionAmount),
        varianceAmount,
        coveragePercent: Number(coveragePercent.toFixed(1))
      },
      issues: issues.slice(0, 20)
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
