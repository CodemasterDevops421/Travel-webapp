import 'server-only';
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

type ReconciliationState = {
  resolved: boolean;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNote: string | null;
};

type ReconciliationSummaryRpcRow = {
  confirmed_count: number | null;
  reconciled_count: number | null;
  pending_count: number | null;
  mismatch_count: number | null;
  open_issue_count: number | null;
  resolved_issue_count: number | null;
  gross_confirmed_amount: number | null;
  expected_commission_amount: number | null;
  recorded_commission_amount: number | null;
  variance_amount: number | null;
  coverage_percent: number | null;
};

type ReconciliationIssueRpcRow = {
  booking_id: string;
  issue_type: ReconciliationIssue['type'];
  detail: string;
  created_at: string;
  reconciliation: Record<string, unknown> | null;
};

export type ReconciliationIssue = {
  bookingId: string;
  type: 'missing_tracking' | 'amount_mismatch' | 'currency_mismatch';
  detail: string;
  createdAt: string;
  reconciliation: ReconciliationState;
};

export type ReconciliationSummary = {
  confirmedCount: number;
  reconciledCount: number;
  pendingCount: number;
  mismatchCount: number;
  openIssueCount: number;
  resolvedIssueCount: number;
  grossConfirmedAmount: number;
  expectedCommissionAmount: number;
  recordedCommissionAmount: number;
  varianceAmount: number;
  coveragePercent: number;
};

export type ReconciliationReport = {
  periodDays: number;
  dataFreshness: {
    generatedAt: string;
    source: 'rpc' | 'fallback';
  };
  summary: ReconciliationSummary;
  issues: ReconciliationIssue[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  processing: {
    truncated: boolean;
    truncationReason: 'none' | 'booking_scan_limit' | 'issue_limit';
    scannedBookings: number;
    maxScannedBookings: number;
    returnedIssues: number;
    maxIssues: number;
    commissionQueryBatches: number;
    maxCommissionIdsPerBatch: number;
  };
};

const BOOKING_PAGE_SIZE = 500;
const MAX_SCANNED_BOOKINGS = 5000;
const COMMISSION_BATCH_SIZE = 200;

function toNumber(value: number | null | undefined, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function mapRpcSummary(row: ReconciliationSummaryRpcRow): ReconciliationSummary {
  return {
    confirmedCount: toNumber(row.confirmed_count),
    reconciledCount: toNumber(row.reconciled_count),
    pendingCount: toNumber(row.pending_count),
    mismatchCount: toNumber(row.mismatch_count),
    openIssueCount: toNumber(row.open_issue_count),
    resolvedIssueCount: toNumber(row.resolved_issue_count),
    grossConfirmedAmount: toNumber(row.gross_confirmed_amount),
    expectedCommissionAmount: toNumber(row.expected_commission_amount),
    recordedCommissionAmount: toNumber(row.recorded_commission_amount),
    varianceAmount: toNumber(row.variance_amount),
    coveragePercent: toNumber(row.coverage_percent, 100)
  };
}

async function fetchReconciliationSummaryFromRpc(
  supabase: any,
  periodStartIso: string
): Promise<ReconciliationSummary | null> {
  if (!supabase || typeof supabase.rpc !== 'function') {
    return null;
  }

  const rpcResult = await supabase.rpc('fn_admin_reconciliation_summary', {
    period_start_iso: periodStartIso
  });

  if (rpcResult?.error) {
    return null;
  }

  const row = Array.isArray(rpcResult?.data)
    ? (rpcResult.data[0] as ReconciliationSummaryRpcRow | undefined)
    : (rpcResult?.data as ReconciliationSummaryRpcRow | null);

  return row ? mapRpcSummary(row) : null;
}

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

function readReconciliationState(metadata: Record<string, unknown> | null): ReconciliationState {
  const raw = (metadata?.reconciliation as Record<string, unknown> | undefined) ?? {};
  return {
    resolved: raw.resolved === true,
    resolvedAt: typeof raw.resolvedAt === 'string' ? raw.resolvedAt : null,
    resolvedBy: typeof raw.resolvedBy === 'string' ? raw.resolvedBy : null,
    resolutionNote: typeof raw.resolutionNote === 'string' ? raw.resolutionNote : null
  };
}

function mapRpcIssue(row: ReconciliationIssueRpcRow): ReconciliationIssue {
  return {
    bookingId: row.booking_id,
    type: row.issue_type,
    detail: row.detail,
    createdAt: row.created_at,
    reconciliation: readReconciliationState(row.reconciliation)
  };
}

async function fetchReconciliationIssuesFromRpc(
  supabase: any,
  periodStartIso: string,
  includeResolved: boolean,
  page: number,
  limit: number
): Promise<{ issues: ReconciliationIssue[]; total: number } | null> {
  if (!supabase || typeof supabase.rpc !== 'function') {
    return null;
  }

  const [issuePage, issueCount] = await Promise.all([
    supabase.rpc('fn_admin_reconciliation_issue_page', {
      period_start_iso: periodStartIso,
      include_resolved: includeResolved,
      page_offset: (page - 1) * limit,
      page_limit: limit
    }),
    supabase.rpc('fn_admin_reconciliation_issue_count', {
      period_start_iso: periodStartIso,
      include_resolved: includeResolved
    })
  ]);

  if (issuePage?.error || issueCount?.error) {
    return null;
  }

  const rows = Array.isArray(issuePage?.data) ? issuePage.data as ReconciliationIssueRpcRow[] : [];
  const countRow = Array.isArray(issueCount?.data)
    ? issueCount.data[0] as { total_count?: number } | undefined
    : issueCount?.data as { total_count?: number } | null;

  return {
    issues: rows.map(mapRpcIssue),
    total: toNumber(countRow?.total_count)
  };
}

export async function buildReconciliationReport(
  supabase: any,
  options?: { periodDays?: number; includeResolved?: boolean; maxIssues?: number; page?: number; limit?: number }
): Promise<ReconciliationReport> {
  const periodDays = options?.periodDays ?? 30;
  const includeResolved = options?.includeResolved ?? false;
  const maxIssues = options?.maxIssues ?? 200;
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 50;

  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - periodDays);
  const periodStartIso = periodStart.toISOString();
  const rpcSummary = await fetchReconciliationSummaryFromRpc(supabase, periodStartIso);
  const rpcIssues = await fetchReconciliationIssuesFromRpc(supabase, periodStartIso, includeResolved, page, limit);

  if (rpcSummary && rpcIssues) {
    return {
      periodDays,
      dataFreshness: {
        generatedAt: new Date().toISOString(),
        source: 'rpc'
      },
      summary: rpcSummary,
      issues: rpcIssues.issues,
      pagination: {
        page,
        limit,
        total: rpcIssues.total,
        totalPages: Math.max(1, Math.ceil(rpcIssues.total / limit))
      },
      processing: {
        truncated: false,
        truncationReason: 'none',
        scannedBookings: 0,
        maxScannedBookings: MAX_SCANNED_BOOKINGS,
        returnedIssues: rpcIssues.issues.length,
        maxIssues,
        commissionQueryBatches: 0,
        maxCommissionIdsPerBatch: COMMISSION_BATCH_SIZE
      }
    };
  }

  const bookings: BookingRow[] = [];
  let bookingScanTruncated = false;

  for (let offset = 0; offset < MAX_SCANNED_BOOKINGS; offset += BOOKING_PAGE_SIZE) {
    const bookingsResult = await supabase
      .from('bookings')
      .select('id, status, total_amount, commission_amount, currency, metadata, created_at')
      .gte('created_at', periodStartIso)
      .in('status', ['booking_confirmed', 'refunded', 'confirmed'])
      .order('created_at', { ascending: false })
      .range(offset, offset + BOOKING_PAGE_SIZE - 1);

    if (bookingsResult.error) {
      throw new HttpError(503, 'Failed to load bookings for reconciliation report');
    }

    const pageRows: BookingRow[] = (bookingsResult.data as BookingRow[] | null) ?? [];
    bookings.push(...pageRows);

    if (pageRows.length < BOOKING_PAGE_SIZE) {
      break;
    }

    if (bookings.length >= MAX_SCANNED_BOOKINGS) {
      bookingScanTruncated = true;
      break;
    }
  }

  const bookingIds = bookings.map((b) => b.id);
  const commissionRows: CommissionRow[] = [];
  let commissionQueryBatches = 0;

  for (let index = 0; index < bookingIds.length; index += COMMISSION_BATCH_SIZE) {
    const bookingIdBatch = bookingIds.slice(index, index + COMMISSION_BATCH_SIZE);
    if (bookingIdBatch.length === 0) {
      continue;
    }

    const commissionResult = await supabase
      .from('commission_tracking')
      .select('booking_id, gross_booking_value, commission_amount, commission_percent, currency, updated_at')
      .gte('updated_at', periodStartIso)
      .in('booking_id', bookingIdBatch)
      .order('updated_at', { ascending: false });

    if (commissionResult.error) {
      throw new HttpError(503, 'Failed to load commission tracking for reconciliation report');
    }

    const batchRows: CommissionRow[] = (commissionResult.data as CommissionRow[] | null) ?? [];
    commissionRows.push(...batchRows);
    commissionQueryBatches += 1;
  }

  const commissionByBookingId = new Map<string, CommissionRow>();
  for (const row of commissionRows) {
    if (!commissionByBookingId.has(row.booking_id)) {
      commissionByBookingId.set(row.booking_id, row);
    }
  }

  let grossConfirmedAmount = 0;
  let recordedCommissionAmount = 0;
  let expectedCommissionAmount = 0;
  let reconciledCount = 0;
  let mismatchCount = 0;
  let openIssueCount = 0;
  let resolvedIssueCount = 0;
  const issues: ReconciliationIssue[] = [];
  let issuesTruncated = false;

  for (const booking of bookings) {
    const tracking = commissionByBookingId.get(booking.id);
    const bookingTotal = typeof booking.total_amount === 'number' ? booking.total_amount : 0;
    if (!rpcSummary) {
      grossConfirmedAmount += bookingTotal;
    }

    const bookingCommission =
      typeof booking.commission_amount === 'number'
        ? booking.commission_amount
        : readMetadataNumber(booking.metadata, 'commissionAmount');
    const commissionPercent = readMetadataPercent(booking.metadata);
    const expectedFromPercent = typeof commissionPercent === 'number'
      ? bookingTotal * (commissionPercent / 100)
      : null;
    const expectedCommission = bookingCommission ?? expectedFromPercent ?? tracking?.commission_amount ?? 0;
    if (!rpcSummary) {
      expectedCommissionAmount += expectedCommission;
    }

    if (!tracking) {
      const reconciliation = readReconciliationState(booking.metadata);
      if (!rpcSummary) {
        if (reconciliation.resolved) {
          resolvedIssueCount += 1;
        } else {
          openIssueCount += 1;
        }
      }
      if (includeResolved || !reconciliation.resolved) {
        if (issues.length >= maxIssues) {
          issuesTruncated = true;
          continue;
        }
        issues.push({
          bookingId: booking.id,
          type: 'missing_tracking',
          detail: 'No commission_tracking row found for booking',
          createdAt: booking.created_at,
          reconciliation
        });
      }
      continue;
    }

    if (!rpcSummary) {
      reconciledCount += 1;
      recordedCommissionAmount += tracking.commission_amount;
    }

    if (booking.currency && tracking.currency && booking.currency !== tracking.currency) {
      if (!rpcSummary) {
        mismatchCount += 1;
      }
      const reconciliation = readReconciliationState(booking.metadata);
      if (!rpcSummary) {
        if (reconciliation.resolved) {
          resolvedIssueCount += 1;
        } else {
          openIssueCount += 1;
        }
      }
      if (includeResolved || !reconciliation.resolved) {
        if (issues.length >= maxIssues) {
          issuesTruncated = true;
          continue;
        }
        issues.push({
          bookingId: booking.id,
          type: 'currency_mismatch',
          detail: `Booking currency ${booking.currency} differs from tracking currency ${tracking.currency}`,
          createdAt: booking.created_at,
          reconciliation
        });
      }
      continue;
    }

    if (
      Math.abs(roundCurrency(tracking.gross_booking_value) - roundCurrency(bookingTotal)) > 0.01 ||
      Math.abs(roundCurrency(tracking.commission_amount) - roundCurrency(expectedCommission)) > 0.01
    ) {
      if (!rpcSummary) {
        mismatchCount += 1;
      }
      const reconciliation = readReconciliationState(booking.metadata);
      if (!rpcSummary) {
        if (reconciliation.resolved) {
          resolvedIssueCount += 1;
        } else {
          openIssueCount += 1;
        }
      }
      if (includeResolved || !reconciliation.resolved) {
        if (issues.length >= maxIssues) {
          issuesTruncated = true;
          continue;
        }
        issues.push({
          bookingId: booking.id,
          type: 'amount_mismatch',
          detail: `Gross/commission mismatch (booking=${roundCurrency(bookingTotal)}, tracking=${roundCurrency(tracking.gross_booking_value)})`,
          createdAt: booking.created_at,
          reconciliation
        });
      }
    }
  }

  const summary: ReconciliationSummary = rpcSummary ?? {
    confirmedCount: bookings.length,
    reconciledCount,
    pendingCount: Math.max(bookings.length - reconciledCount, 0),
    mismatchCount,
    openIssueCount,
    resolvedIssueCount,
    grossConfirmedAmount: roundCurrency(grossConfirmedAmount),
    expectedCommissionAmount: roundCurrency(expectedCommissionAmount),
    recordedCommissionAmount: roundCurrency(recordedCommissionAmount),
    varianceAmount: roundCurrency(expectedCommissionAmount - recordedCommissionAmount),
    coveragePercent: bookings.length > 0 ? Number(((reconciledCount / bookings.length) * 100).toFixed(1)) : 100
  };

  const totalIssues = issues.length;
  const start = (page - 1) * limit;

  return {
    periodDays,
    dataFreshness: {
      generatedAt: new Date().toISOString(),
      source: 'fallback'
    },
    summary,
    issues: issues.slice(start, start + limit),
    pagination: {
      page,
      limit,
      total: totalIssues,
      totalPages: Math.max(1, Math.ceil(totalIssues / limit))
    },
    processing: {
      truncated: bookingScanTruncated || issuesTruncated,
      truncationReason: bookingScanTruncated ? 'booking_scan_limit' : issuesTruncated ? 'issue_limit' : 'none',
      scannedBookings: bookings.length,
      maxScannedBookings: MAX_SCANNED_BOOKINGS,
      returnedIssues: Math.min(limit, Math.max(0, totalIssues - start)),
      maxIssues,
      commissionQueryBatches,
      maxCommissionIdsPerBatch: COMMISSION_BATCH_SIZE
    }
  };
}
