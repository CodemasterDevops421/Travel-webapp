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

type SettlementLedgerRpcRow = {
  booking_id: string;
  booking_status: string;
  payment_status: string | null;
  gross_amount: number | null;
  commission_amount: number | null;
  currency: string | null;
  tracking_present: boolean | null;
  payment_log_present: boolean | null;
  settlement_status: 'settled' | 'awaiting_tracking' | 'awaiting_payment' | 'exception';
  issue: string | null;
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
  dataFreshness: {
    generatedAt: string;
    source: 'rpc' | 'fallback';
  };
  summary: {
    totalRows: number;
    settledRows: number;
    awaitingTrackingRows: number;
    awaitingPaymentRows: number;
    exceptionRows: number;
  };
  ledger: SettlementLedgerEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  processing: {
    truncated: boolean;
    truncationReason: 'none' | 'rpc_unavailable';
    scannedRows: number;
    returnedRows: number;
  };
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
  options?: { periodDays?: number; page?: number; limit?: number }
): Promise<SettlementLedgerReport> {
  const periodDays = options?.periodDays ?? 30;
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 50;

  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - periodDays);
  const periodStartIso = periodStart.toISOString();

  if (supabase && typeof supabase.rpc === 'function') {
    const [pageResult, countResult] = await Promise.all([
      supabase.rpc('fn_admin_settlement_ledger_page', {
        period_start_iso: periodStartIso,
        page_offset: (page - 1) * limit,
        page_limit: limit
      }),
      supabase.rpc('fn_admin_settlement_ledger_count', {
        period_start_iso: periodStartIso
      })
    ]);

    if (!pageResult?.error && !countResult?.error) {
      const rows = Array.isArray(pageResult?.data) ? pageResult.data as SettlementLedgerRpcRow[] : [];
      const totalRow = Array.isArray(countResult?.data)
        ? countResult.data[0] as { total_count?: number } | undefined
        : countResult?.data as { total_count?: number } | null;
      const total = typeof totalRow?.total_count === 'number' ? totalRow.total_count : 0;

      const summary = rows.reduce((acc, row) => {
        acc.totalRows = total;
        if (row.settlement_status === 'settled') acc.settledRows += 1;
        if (row.settlement_status === 'awaiting_tracking') acc.awaitingTrackingRows += 1;
        if (row.settlement_status === 'awaiting_payment') acc.awaitingPaymentRows += 1;
        if (row.settlement_status === 'exception') acc.exceptionRows += 1;
        return acc;
      }, {
        totalRows: total,
        settledRows: 0,
        awaitingTrackingRows: 0,
        awaitingPaymentRows: 0,
        exceptionRows: 0
      });

      return {
        periodDays,
        dataFreshness: {
          generatedAt: new Date().toISOString(),
          source: 'rpc'
        },
        summary,
        ledger: rows.map((row) => ({
          bookingId: row.booking_id,
          bookingStatus: row.booking_status,
          paymentStatus: row.payment_status,
          grossAmount: typeof row.gross_amount === 'number' ? row.gross_amount : 0,
          commissionAmount: typeof row.commission_amount === 'number' ? row.commission_amount : 0,
          currency: toCurrency(row.currency),
          trackingPresent: row.tracking_present === true,
          paymentLogPresent: row.payment_log_present === true,
          settlementStatus: row.settlement_status,
          issue: row.issue,
          createdAt: row.created_at
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit))
        },
        processing: {
          truncated: false,
          truncationReason: 'none',
          scannedRows: rows.length,
          returnedRows: rows.length
        }
      };
    }
  }

  const bookingsResult = await supabase
    .from('bookings')
    .select('id, status, total_amount, commission_amount, currency, payment_status, liteapi_booking_id, created_at')
    .gte('created_at', periodStartIso)
    .in('status', ['confirmed', 'payment_authorized', 'refunded'])
    .order('created_at', { ascending: false })
    .limit(page * limit);
  if (bookingsResult.error) {
    throw new HttpError(503, 'Failed to load bookings for settlement ledger report');
  }

  const bookings: BookingLedgerRow[] = (bookingsResult.data as BookingLedgerRow[] | null) ?? [];
  const bookingIds = bookings.map((b) => b.id);

  const commissionResult = bookingIds.length > 0
    ? await supabase
      .from('commission_tracking')
      .select('booking_id, gross_booking_value, commission_amount, currency, updated_at')
      .in('booking_id', bookingIds)
      .order('updated_at', { ascending: false })
    : { data: [] as CommissionLedgerRow[], error: null as unknown };
  if (commissionResult.error) {
    throw new HttpError(503, 'Failed to load commission tracking for settlement ledger report');
  }
  const commissionRows: CommissionLedgerRow[] = (commissionResult.data as CommissionLedgerRow[] | null) ?? [];

  const paymentResult = bookingIds.length > 0
    ? await supabase
      .from('payment_logs')
      .select('booking_id, provider, event_type, status, amount, currency, created_at')
      .in('booking_id', bookingIds)
      .order('created_at', { ascending: false })
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

  const ledger = bookings.map((booking) => {
    const tracking = commissionByBooking.get(booking.id) ?? null;
    const payment = paymentByBooking.get(booking.id) ?? null;
    const settlement = pickSettlementStatus(booking, tracking, payment);

    if (settlement.status === 'settled') settledRows += 1;
    if (settlement.status === 'awaiting_tracking') awaitingTrackingRows += 1;
    if (settlement.status === 'awaiting_payment') awaitingPaymentRows += 1;
    if (settlement.status === 'exception') exceptionRows += 1;

    return {
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
    };
  });

  const start = (page - 1) * limit;

  return {
    periodDays,
    dataFreshness: {
      generatedAt: new Date().toISOString(),
      source: 'fallback'
    },
    summary: {
      totalRows: ledger.length,
      settledRows,
      awaitingTrackingRows,
      awaitingPaymentRows,
      exceptionRows
    },
    ledger: ledger.slice(start, start + limit),
    pagination: {
      page,
      limit,
      total: ledger.length,
      totalPages: Math.max(1, Math.ceil(ledger.length / limit))
    },
    processing: {
      truncated: false,
      truncationReason: 'rpc_unavailable',
      scannedRows: bookings.length,
      returnedRows: Math.min(limit, Math.max(0, ledger.length - start))
    }
  };
}
