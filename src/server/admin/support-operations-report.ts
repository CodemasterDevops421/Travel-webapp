import 'server-only';
import { HttpError } from '@/server/errors';

export type SupportCaseState = 'new' | 'in_progress' | 'awaiting_supplier' | 'resolved' | 'closed';
export type SupportCasePriority = 'low' | 'medium' | 'high' | 'urgent';

export type SupportOpsCase = {
  bookingId: string;
  bookingStatus: string;
  state: SupportCaseState;
  priority: SupportCasePriority;
  assignedTo: string | null;
  supportRequestId: string | null;
  supportRequestedAt: string;
  updatedAt: string;
  ageHours: number;
  slaBreach: boolean;
  supportForwarded: boolean;
  lastError: string | null;
  resolutionNote: string | null;
};

export type SupportOpsSummary = {
  totalCases: number;
  openCases: number;
  breachedCases: number;
  highPriorityOpenCases: number;
  assignedCases: number;
  unresolvedForwardingFailures: number;
};

export type SupportOpsReport = {
  periodDays: number;
  breachHours: number;
  summary: SupportOpsSummary;
  cases: SupportOpsCase[];
  processing: {
    truncated: boolean;
    truncationReason: 'none' | 'booking_scan_limit' | 'case_limit';
    scannedBookings: number;
    maxScannedBookings: number;
    returnedCases: number;
    maxCases: number;
  };
};

type BookingSupportRow = {
  id: string;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type SupportOpsSummaryRpcRow = {
  total_cases: number | null;
  open_cases: number | null;
  breached_cases: number | null;
  high_priority_open_cases: number | null;
  assigned_cases: number | null;
  unresolved_forwarding_failures: number | null;
};

function toIsoString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString();
}

function toBoolean(value: unknown): boolean {
  return value === true;
}

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function normalizeState(value: unknown): SupportCaseState {
  if (value === 'new' || value === 'in_progress' || value === 'awaiting_supplier' || value === 'resolved' || value === 'closed') {
    return value;
  }
  return 'new';
}

function normalizePriority(value: unknown): SupportCasePriority {
  if (value === 'low' || value === 'medium' || value === 'high' || value === 'urgent') {
    return value;
  }
  return 'medium';
}

function isOpenState(state: SupportCaseState): boolean {
  return state !== 'resolved' && state !== 'closed';
}

const BOOKING_PAGE_SIZE = 500;
const MAX_SCANNED_BOOKINGS = 5000;

function toNumber(value: number | null | undefined, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return fallback;
}

function mapSupportOpsSummaryRpc(row: SupportOpsSummaryRpcRow): SupportOpsSummary {
  return {
    totalCases: toNumber(row.total_cases),
    openCases: toNumber(row.open_cases),
    breachedCases: toNumber(row.breached_cases),
    highPriorityOpenCases: toNumber(row.high_priority_open_cases),
    assignedCases: toNumber(row.assigned_cases),
    unresolvedForwardingFailures: toNumber(row.unresolved_forwarding_failures)
  };
}

async function fetchSupportOpsSummaryFromRpc(
  supabase: any,
  periodStartIso: string,
  breachHours: number
): Promise<SupportOpsSummary | null> {
  if (!supabase || typeof supabase.rpc !== 'function') {
    return null;
  }

  const rpcResult = await supabase.rpc('fn_admin_support_operations_summary', {
    period_start_iso: periodStartIso,
    breach_hours_input: breachHours
  });

  if (rpcResult?.error) {
    return null;
  }

  const row = Array.isArray(rpcResult?.data)
    ? (rpcResult.data[0] as SupportOpsSummaryRpcRow | undefined)
    : (rpcResult?.data as SupportOpsSummaryRpcRow | null);
  if (!row) {
    return null;
  }

  return mapSupportOpsSummaryRpc(row);
}

export async function buildSupportOperationsReport(
  supabase: any,
  options?: { periodDays?: number; breachHours?: number; limit?: number }
): Promise<SupportOpsReport> {
  const periodDays = options?.periodDays ?? 30;
  const breachHours = options?.breachHours ?? 24;
  const limit = options?.limit ?? 300;

  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - periodDays);
  const periodStartIso = periodStart.toISOString();
  const rpcSummary = await fetchSupportOpsSummaryFromRpc(supabase, periodStartIso, breachHours);

  const now = Date.now();
  const cases: SupportOpsCase[] = [];
  let scannedBookings = 0;
  let truncationReason: SupportOpsReport['processing']['truncationReason'] = 'none';

  let openCases = 0;
  let breachedCases = 0;
  let highPriorityOpenCases = 0;
  let assignedCases = 0;
  let unresolvedForwardingFailures = 0;
  let totalCases = 0;
  let stopProcessing = false;

  for (let offset = 0; offset < MAX_SCANNED_BOOKINGS && !stopProcessing; offset += BOOKING_PAGE_SIZE) {
    const bookingsResult = await supabase
      .from('bookings')
      .select('id, status, metadata, created_at')
      .gte('created_at', periodStartIso)
      .order('created_at', { ascending: false })
      .range(offset, offset + BOOKING_PAGE_SIZE - 1);

    if (bookingsResult.error) {
      throw new HttpError(503, 'Failed to load bookings for support operations report');
    }

    const pageRows: BookingSupportRow[] = (bookingsResult.data as BookingSupportRow[] | null) ?? [];
    scannedBookings += pageRows.length;

    for (const booking of pageRows) {
      const metadata = booking.metadata ?? {};
      const requestedAt = toIsoString(metadata.supportRequestedAt);
      if (!requestedAt) continue;

      if (!rpcSummary) {
        totalCases += 1;
      }

      const state = normalizeState(metadata.supportState);
      const priority = normalizePriority(metadata.supportPriority);
      const assignedTo = toNullableString(metadata.supportAssignedTo);
      const supportRequestId = toNullableString(metadata.lastSupportRequestId);
      const supportForwarded = toBoolean(metadata.supportForwarded);
      const lastError = toNullableString(metadata.supportForwardError);
      const resolutionNote = toNullableString(metadata.supportResolutionNote);
      const updatedAt = toIsoString(metadata.supportUpdatedAt) ?? requestedAt;
      const ageHours = (now - Date.parse(requestedAt)) / (1000 * 60 * 60);
      const slaBreach = ageHours > breachHours && isOpenState(state);

      if (!rpcSummary) {
        if (isOpenState(state)) {
          openCases += 1;
          if ((priority === 'high' || priority === 'urgent')) {
            highPriorityOpenCases += 1;
          }
          if (lastError && !supportForwarded) {
            unresolvedForwardingFailures += 1;
          }
        }
        if (slaBreach) breachedCases += 1;
        if (assignedTo) assignedCases += 1;
      }

      if (cases.length < limit) {
        cases.push({
          bookingId: booking.id,
          bookingStatus: booking.status,
          state,
          priority,
          assignedTo,
          supportRequestId,
          supportRequestedAt: requestedAt,
          updatedAt,
          ageHours: Math.round(ageHours * 10) / 10,
          slaBreach,
          supportForwarded,
          lastError,
          resolutionNote
        });
      }

      if (cases.length >= limit) {
        stopProcessing = true;
        truncationReason = 'case_limit';
        break;
      }
    }

    if (pageRows.length < BOOKING_PAGE_SIZE) {
      break;
    }

    if (scannedBookings >= MAX_SCANNED_BOOKINGS) {
      truncationReason = 'booking_scan_limit';
      break;
    }
  }

  const summary: SupportOpsSummary = rpcSummary ?? {
    totalCases,
    openCases,
    breachedCases,
    highPriorityOpenCases,
    assignedCases,
    unresolvedForwardingFailures
  };

  return {
    periodDays,
    breachHours,
    summary,
    cases,
    processing: {
      truncated: truncationReason !== 'none',
      truncationReason,
      scannedBookings,
      maxScannedBookings: MAX_SCANNED_BOOKINGS,
      returnedCases: cases.length,
      maxCases: limit
    }
  };
}
