import 'server-only';

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
  summary: SupportSlaSummary;
  cases: SupportCaseRow[];
};

type BookingSupportRow = {
  id: string;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
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

export async function buildSupportSlaReport(
  supabase: any,
  options?: { periodDays?: number; breachHours?: number; limit?: number }
): Promise<SupportSlaReport> {
  const periodDays = options?.periodDays ?? 30;
  const breachHours = options?.breachHours ?? 24;
  const limit = options?.limit ?? 200;

  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - periodDays);

  const bookingsResult = await supabase
    .from('bookings')
    .select('id, status, metadata, created_at')
    .gte('created_at', periodStart.toISOString())
    .order('created_at', { ascending: false });

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
    summary: {
      totalCases,
      openCases,
      forwardedCases,
      forwardingFailures,
      breachCount,
      averageAgeHours
    },
    cases: rows.slice(0, limit)
  };
}
