import 'server-only';

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
};

type BookingSupportRow = {
  id: string;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
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

export async function buildSupportOperationsReport(
  supabase: any,
  options?: { periodDays?: number; breachHours?: number; limit?: number }
): Promise<SupportOpsReport> {
  const periodDays = options?.periodDays ?? 30;
  const breachHours = options?.breachHours ?? 24;
  const limit = options?.limit ?? 300;

  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - periodDays);

  const bookingsResult = await supabase
    .from('bookings')
    .select('id, status, metadata, created_at')
    .gte('created_at', periodStart.toISOString())
    .order('created_at', { ascending: false });

  const bookings: BookingSupportRow[] = (bookingsResult.data as BookingSupportRow[] | null) ?? [];
  const now = Date.now();
  const cases: SupportOpsCase[] = [];

  let openCases = 0;
  let breachedCases = 0;
  let highPriorityOpenCases = 0;
  let assignedCases = 0;
  let unresolvedForwardingFailures = 0;

  for (const booking of bookings) {
    const metadata = booking.metadata ?? {};
    const requestedAt = toIsoString(metadata.supportRequestedAt);
    if (!requestedAt) continue;

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

  return {
    periodDays,
    breachHours,
    summary: {
      totalCases: cases.length,
      openCases,
      breachedCases,
      highPriorityOpenCases,
      assignedCases,
      unresolvedForwardingFailures
    },
    cases: cases.slice(0, limit)
  };
}
