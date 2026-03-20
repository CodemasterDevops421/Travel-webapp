import 'server-only';
import { HttpError } from '@/server/errors';

export type SupportCaseRow = {
  bookingId: string;
  bookingStatus: string;
  supportRequestedAt: string;
  supportForwarded: boolean;
  supportForwardError: string | null;
  supportRequestId: string | null;
  ageHours: number;
  breach: boolean;
};

export type SupportSlaSummary = {
  totalCases: number;
  openCases: number;
  forwardedCases: number;
  forwardingFailures: number;
  breachCount: number;
  averageAgeHours: number;
};

export type SupportSlaReport = {
  periodDays: number;
  breachHours: number;
  dataFreshness: {
    generatedAt: string;
    source: 'rpc' | 'fallback';
  };
  summary: SupportSlaSummary;
  cases: SupportCaseRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  processing: {
    truncated: boolean;
    truncationReason: 'none' | 'rpc_unavailable';
    scannedBookings: number;
    returnedCases: number;
  };
};

type BookingSupportRow = {
  id: string;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type SupportSlaSummaryRpcRow = {
  total_cases: number | null;
  open_cases: number | null;
  forwarded_cases: number | null;
  forwarding_failures: number | null;
  breach_count: number | null;
  average_age_hours: number | null;
};

type SupportSlaCaseRpcRow = {
  booking_id: string;
  booking_status: string;
  support_requested_at: string;
  support_forwarded: boolean | null;
  support_forward_error: string | null;
  support_request_id: string | null;
  age_hours: number | null;
  breach: boolean | null;
};

function toIsoString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return new Date(parsed).toISOString();
}

function toBoolean(value: unknown): boolean {
  return value === true;
}

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function toNumber(value: number | null | undefined, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

async function fetchSupportSlaSummaryFromRpc(
  supabase: any,
  periodStartIso: string,
  breachHours: number
): Promise<SupportSlaSummary | null> {
  if (!supabase || typeof supabase.rpc !== 'function') {
    return null;
  }

  const rpcResult = await supabase.rpc('fn_admin_support_sla_summary', {
    period_start_iso: periodStartIso,
    breach_hours_input: breachHours
  });

  if (rpcResult?.error) {
    return null;
  }

  const row = Array.isArray(rpcResult?.data)
    ? rpcResult.data[0] as SupportSlaSummaryRpcRow | undefined
    : rpcResult?.data as SupportSlaSummaryRpcRow | null;
  if (!row) {
    return null;
  }

  return {
    totalCases: toNumber(row.total_cases),
    openCases: toNumber(row.open_cases),
    forwardedCases: toNumber(row.forwarded_cases),
    forwardingFailures: toNumber(row.forwarding_failures),
    breachCount: toNumber(row.breach_count),
    averageAgeHours: toNumber(row.average_age_hours)
  };
}

export async function buildSupportSlaReport(
  supabase: any,
  options?: { periodDays?: number; breachHours?: number; page?: number; limit?: number }
): Promise<SupportSlaReport> {
  const periodDays = options?.periodDays ?? 30;
  const breachHours = options?.breachHours ?? 24;
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 50;

  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - periodDays);
  const periodStartIso = periodStart.toISOString();
  const rpcSummary = await fetchSupportSlaSummaryFromRpc(supabase, periodStartIso, breachHours);

  if (rpcSummary && supabase && typeof supabase.rpc === 'function') {
    const [pageResult, countResult] = await Promise.all([
      supabase.rpc('fn_admin_support_sla_case_page', {
        period_start_iso: periodStartIso,
        breach_hours_input: breachHours,
        page_offset: (page - 1) * limit,
        page_limit: limit
      }),
      supabase.rpc('fn_admin_support_sla_case_count', {
        period_start_iso: periodStartIso
      })
    ]);

    if (!pageResult?.error && !countResult?.error) {
      const rows = Array.isArray(pageResult?.data) ? pageResult.data as SupportSlaCaseRpcRow[] : [];
      const totalRow = Array.isArray(countResult?.data)
        ? countResult.data[0] as { total_count?: number } | undefined
        : countResult?.data as { total_count?: number } | null;
      const total = typeof totalRow?.total_count === 'number' ? totalRow.total_count : 0;

      return {
        periodDays,
        breachHours,
        dataFreshness: {
          generatedAt: new Date().toISOString(),
          source: 'rpc'
        },
        summary: rpcSummary,
        cases: rows.map((row) => ({
          bookingId: row.booking_id,
          bookingStatus: row.booking_status,
          supportRequestedAt: row.support_requested_at,
          supportForwarded: row.support_forwarded === true,
          supportForwardError: row.support_forward_error,
          supportRequestId: row.support_request_id,
          ageHours: toNumber(row.age_hours),
          breach: row.breach === true
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
          scannedBookings: rows.length,
          returnedCases: rows.length
        }
      };
    }
  }

  const bookingsResult = await supabase
    .from('bookings')
    .select('id, status, metadata, created_at')
    .gte('created_at', periodStartIso)
    .order('created_at', { ascending: false });
  if (bookingsResult.error) {
    throw new HttpError(503, 'Failed to load bookings for support SLA report');
  }

  const bookings: BookingSupportRow[] = (bookingsResult.data as BookingSupportRow[] | null) ?? [];
  const now = Date.now();
  const rows: SupportCaseRow[] = [];

  let forwardedCases = 0;
  let forwardingFailures = 0;
  let breachCount = 0;
  let totalAge = 0;

  for (const booking of bookings) {
    const metadata = booking.metadata ?? {};
    const requestedAt = toIsoString(metadata.supportRequestedAt);
    if (!requestedAt) {
      continue;
    }

    const forwarded = toBoolean(metadata.supportForwarded);
    const forwardError = toNullableString(metadata.supportForwardError);
    const supportRequestId = toNullableString(metadata.lastSupportRequestId);
    const ageHours = (now - Date.parse(requestedAt)) / (1000 * 60 * 60);
    const breach = ageHours > breachHours && !forwarded;

    if (forwarded) {
      forwardedCases += 1;
    }
    if (forwardError) {
      forwardingFailures += 1;
    }
    if (breach) {
      breachCount += 1;
    }
    totalAge += ageHours;

    rows.push({
      bookingId: booking.id,
      bookingStatus: booking.status,
      supportRequestedAt: requestedAt,
      supportForwarded: forwarded,
      supportForwardError: forwardError,
      supportRequestId,
      ageHours: Math.round(ageHours * 10) / 10,
      breach
    });
  }

  const totalCases = rows.length;
  const averageAgeHours = totalCases > 0 ? Math.round((totalAge / totalCases) * 10) / 10 : 0;
  const openCases = rows.filter((row) => !row.supportForwarded).length;

  return {
    periodDays,
    breachHours,
    dataFreshness: {
      generatedAt: new Date().toISOString(),
      source: 'fallback'
    },
    summary: {
      totalCases,
      openCases,
      forwardedCases,
      forwardingFailures,
      breachCount,
      averageAgeHours
    },
    cases: rows.slice((page - 1) * limit, page * limit),
    pagination: {
      page,
      limit,
      total: rows.length,
      totalPages: Math.max(1, Math.ceil(rows.length / limit))
    },
    processing: {
      truncated: false,
      truncationReason: 'rpc_unavailable',
      scannedBookings: bookings.length,
      returnedCases: Math.min(limit, Math.max(0, rows.length - ((page - 1) * limit)))
    }
  };
}
