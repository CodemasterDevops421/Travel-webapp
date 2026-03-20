import 'server-only';
import { emitTelemetryEvent } from '@/server/observability/telemetry';

export type AdminReportEndpointId =
  | 'admin_reconciliation_get'
  | 'admin_reconciliation_export_get'
  | 'admin_support_sla_get'
  | 'admin_support_operations_get'
  | 'admin_support_operations_patch'
  | 'admin_settlement_ledger_get';

type AdminReportObservation = {
  endpoint: AdminReportEndpointId;
  at: number;
  status: number;
  latencyMs: number;
  scannedRows: number;
  totalRows: number;
};

export type AdminReportBudgetSnapshot = {
  windowMs: number;
  totalRequests: number;
  serverErrorCount: number;
  throttleCount: number;
  errorRate: number;
  throttleRate: number;
  p95LatencyMs: number;
  maxScannedRows: number;
  maxTotalRows: number;
};

type TelemetryObservationRow = {
  status: number;
  latencyMs: number;
  scannedRows: number;
  totalRows: number;
};

const MAX_OBSERVATIONS = 20_000;
const observations: AdminReportObservation[] = [];

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

export function recordAdminReportObservation(
  endpoint: AdminReportEndpointId,
  status: number,
  latencyMs: number,
  extras?: { scannedRows?: number; totalRows?: number },
  at = Date.now()
): void {
  observations.push({
    endpoint,
    at,
    status,
    latencyMs: Number.isFinite(latencyMs) ? Math.max(0, Math.round(latencyMs)) : 0,
    scannedRows: typeof extras?.scannedRows === 'number' && Number.isFinite(extras.scannedRows)
      ? Math.max(0, Math.round(extras.scannedRows))
      : 0,
    totalRows: typeof extras?.totalRows === 'number' && Number.isFinite(extras.totalRows)
      ? Math.max(0, Math.round(extras.totalRows))
      : 0
  });

  if (observations.length > MAX_OBSERVATIONS) {
    observations.splice(0, observations.length - MAX_OBSERVATIONS);
  }

  void emitTelemetryEvent({
    category: 'admin_report',
    metric: `admin_report.${endpoint}.latency_ms`,
    value: Number.isFinite(latencyMs) ? Math.max(0, Math.round(latencyMs)) : 0,
    unit: 'ms',
    status: status >= 500 ? 'fail' : status === 429 ? 'warn' : 'ok',
    dimensions: {
      endpoint,
      httpStatus: status,
      scannedRows: typeof extras?.scannedRows === 'number' ? extras.scannedRows : 0,
      totalRows: typeof extras?.totalRows === 'number' ? extras.totalRows : 0
    },
    observedAt: new Date(at).toISOString()
  });
}

function buildBudgetSnapshotFromRows(
  rows: TelemetryObservationRow[],
  windowMs: number
): AdminReportBudgetSnapshot {
  const totalRequests = rows.length;
  const serverErrorCount = rows.filter((row) => row.status >= 500).length;
  const throttleCount = rows.filter((row) => row.status === 429).length;
  const latencyValues = rows.map((row) => row.latencyMs);
  const maxScannedRows = rows.reduce((max, row) => Math.max(max, row.scannedRows), 0);
  const maxTotalRows = rows.reduce((max, row) => Math.max(max, row.totalRows), 0);

  const errorRate = totalRequests > 0 ? serverErrorCount / totalRequests : 0;
  const throttleRate = totalRequests > 0 ? throttleCount / totalRequests : 0;
  const p95LatencyMs = percentile(latencyValues, 95);

  return {
    windowMs,
    totalRequests,
    serverErrorCount,
    throttleCount,
    errorRate,
    throttleRate,
    p95LatencyMs,
    maxScannedRows,
    maxTotalRows
  };
}

async function getPersistedAdminReportRows(
  windowMs: number,
  now: number
): Promise<TelemetryObservationRow[] | null> {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  try {
    const { createAdminClient } = await import('@/server/supabase/admin');
    const supabase = createAdminClient();
    const lowerBoundIso = new Date(now - windowMs).toISOString();
    const { data, error } = await supabase
      .from('ops_telemetry_events')
      .select('status, value, dimensions')
      .eq('category', 'admin_report')
      .gte('observed_at', lowerBoundIso);

    if (error) {
      return null;
    }

    return ((data as Array<{
      status?: string | null;
      value?: number | null;
      dimensions?: Record<string, unknown> | null;
    }> | null) ?? []).map((row) => {
      const dimensions = row.dimensions ?? {};
      const httpStatus = typeof dimensions.httpStatus === 'number'
        ? dimensions.httpStatus
        : typeof row.status === 'string' && row.status === 'fail'
          ? 500
          : typeof row.status === 'string' && row.status === 'warn'
            ? 429
            : 200;
      return {
        status: httpStatus,
        latencyMs: typeof row.value === 'number' && Number.isFinite(row.value) ? row.value : 0,
        scannedRows: typeof dimensions.scannedRows === 'number' && Number.isFinite(dimensions.scannedRows)
          ? dimensions.scannedRows
          : 0,
        totalRows: typeof dimensions.totalRows === 'number' && Number.isFinite(dimensions.totalRows)
          ? dimensions.totalRows
          : 0
      };
    });
  } catch {
    return null;
  }
}

export async function getAdminReportBudgetSnapshot(
  windowMs = 5 * 60 * 1000,
  now = Date.now()
): Promise<AdminReportBudgetSnapshot> {
  const persistedRows = await getPersistedAdminReportRows(windowMs, now);
  if (persistedRows && persistedRows.length > 0) {
    return buildBudgetSnapshotFromRows(persistedRows, windowMs);
  }

  const lowerBound = now - windowMs;
  const scoped = observations.filter((row) => row.at >= lowerBound);
  return buildBudgetSnapshotFromRows(scoped, windowMs);
}

export function __unsafeResetAdminReportObservabilityForTests(): void {
  observations.splice(0, observations.length);
}
