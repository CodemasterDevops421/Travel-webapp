import 'server-only';
import { HttpError } from '@/server/errors';

type BookingLedgerRow = {
  id: string;
  status: string;
  total_amount: number | null;
  commission_amount: number | null;
  currency: string | null;
  payment_status: string | null;
  liteapi_booking_id: string | null;
  created_at: string;
};

type CommissionLedgerRow = {
  booking_id: string;
  gross_booking_value: number;
  commission_amount: number;
  currency: string;
  updated_at: string;
};

type PaymentLedgerRow = {
  booking_id: string | null;
  provider: string;
  event_type: string;
  status: string;
  amount: number | null;
  currency: string | null;
  created_at: string;
};

export type SettlementLedgerEntry = {
  bookingId: string;
  bookingStatus: string;
  paymentStatus: string | null;
  grossAmount: number;
  commissionAmount: number;
  currency: string;
  trackingPresent: boolean;
  paymentLogPresent: boolean;
  settlementStatus: 'settled' | 'awaiting_tracking' | 'awaiting_payment' | 'exception';
  issue: string | null;
  createdAt: string;
};

export type SettlementLedgerReport = {
  periodDays: number;
  summary: {
    totalRows: number;
    settledRows: number;
    awaitingTrackingRows: number;
    awaitingPaymentRows: number;
    exceptionRows: number;
  };
  ledger: SettlementLedgerEntry[];
};

function toCurrency(value: string | null | undefined): string {
  return typeof value === 'string' && value.trim().length === 3 ? value.toUpperCase() : 'USD';
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function pickSettlementStatus(
  booking: BookingLedgerRow,
  tracking: CommissionLedgerRow | null,
  payment: PaymentLedgerRow | null
): { status: SettlementLedgerEntry['settlementStatus']; issue: string | null } {
  if (!tracking) {
    return { status: 'awaiting_tracking', issue: 'Missing commission tracking row' };
  }
  if (!payment && (booking.status === 'confirmed' || booking.status === 'payment_authorized')) {
    return { status: 'awaiting_payment', issue: `Missing payment log for ${booking.status} booking` };
  }
  if (booking.currency && tracking.currency && booking.currency !== tracking.currency) {
    return { status: 'exception', issue: `Currency mismatch ${booking.currency}/${tracking.currency}` };
  }
  const bookingTotal = typeof booking.total_amount === 'number' ? booking.total_amount : 0;
  if (Math.abs(round2(bookingTotal) - round2(tracking.gross_booking_value)) > 0.01) {
    return { status: 'exception', issue: 'Gross amount mismatch between booking and tracking' };
  }
  if (booking.status === 'refunded') {
    return { status: 'settled', issue: null };
  }
  return { status: 'settled', issue: null };
}

export async function buildSettlementLedgerReport(
  supabase: any,
  options?: { periodDays?: number; limit?: number }
): Promise<SettlementLedgerReport> {
  const periodDays = options?.periodDays ?? 30;
  const limit = options?.limit ?? 300;

  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - periodDays);

  const bookingsResult = await supabase
    .from('bookings')
    .select('id, status, total_amount, commission_amount, currency, payment_status, liteapi_booking_id, created_at')
    .gte('created_at', periodStart.toISOString())
    .in('status', ['confirmed', 'payment_authorized', 'refunded'])
    .order('created_at', { ascending: false })
    .limit(limit);
  if (bookingsResult.error) {
    throw new HttpError(503, 'Failed to load bookings for settlement ledger report');
  }

  const bookings: BookingLedgerRow[] = (bookingsResult.data as BookingLedgerRow[] | null) ?? [];
  const bookingIds = bookings.map((b) => b.id);

  const commissionResult = bookingIds.length > 0
    ? (await supabase
      .from('commission_tracking')
      .select('booking_id, gross_booking_value, commission_amount, currency, updated_at')
      .in('booking_id', bookingIds)
      .order('updated_at', { ascending: false }))
    : { data: [] as CommissionLedgerRow[], error: null as unknown };
  if (commissionResult.error) {
    throw new HttpError(503, 'Failed to load commission tracking for settlement ledger report');
  }
  const commissionRows: CommissionLedgerRow[] = (commissionResult.data as CommissionLedgerRow[] | null) ?? [];

  const paymentResult = bookingIds.length > 0
    ? (await supabase
      .from('payment_logs')
      .select('booking_id, provider, event_type, status, amount, currency, created_at')
      .in('booking_id', bookingIds)
      .order('created_at', { ascending: false }))
    : { data: [] as PaymentLedgerRow[], error: null as unknown };
  if (paymentResult.error) {
    throw new HttpError(503, 'Failed to load payment logs for settlement ledger report');
  }
  const paymentRows: PaymentLedgerRow[] = (paymentResult.data as PaymentLedgerRow[] | null) ?? [];

  const commissionByBooking = new Map<string, CommissionLedgerRow>();
  for (const row of commissionRows) {
    if (!commissionByBooking.has(row.booking_id)) {
      commissionByBooking.set(row.booking_id, row);
    }
  }

  const paymentByBooking = new Map<string, PaymentLedgerRow>();
  for (const row of paymentRows) {
    if (!row.booking_id) continue;
    if (!paymentByBooking.has(row.booking_id)) {
      paymentByBooking.set(row.booking_id, row);
    }
  }

  let settledRows = 0;
  let awaitingTrackingRows = 0;
  let awaitingPaymentRows = 0;
  let exceptionRows = 0;

  const ledger: SettlementLedgerEntry[] = [];
  for (const booking of bookings) {
    const tracking = commissionByBooking.get(booking.id) ?? null;
    const payment = paymentByBooking.get(booking.id) ?? null;
    const settlement = pickSettlementStatus(booking, tracking, payment);

    if (settlement.status === 'settled') settledRows += 1;
    if (settlement.status === 'awaiting_tracking') awaitingTrackingRows += 1;
    if (settlement.status === 'awaiting_payment') awaitingPaymentRows += 1;
    if (settlement.status === 'exception') exceptionRows += 1;

    ledger.push({
      bookingId: booking.id,
      bookingStatus: booking.status,
      paymentStatus: booking.payment_status,
      grossAmount: typeof booking.total_amount === 'number' ? booking.total_amount : 0,
      commissionAmount: typeof booking.commission_amount === 'number' ? booking.commission_amount : 0,
      currency: toCurrency(booking.currency),
      trackingPresent: Boolean(tracking),
      paymentLogPresent: Boolean(payment),
      settlementStatus: settlement.status,
      issue: settlement.issue,
      createdAt: booking.created_at
    });
  }

  return {
    periodDays,
    summary: {
      totalRows: ledger.length,
      settledRows,
      awaitingTrackingRows,
      awaitingPaymentRows,
      exceptionRows
    },
    ledger
  };
}
