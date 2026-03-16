import 'server-only';

export type AdminReportEndpointId =
  | 'admin_reconciliation_get'
  | 'admin_reconciliation_export_get'
  | 'admin_support_sla_get'
  | 'admin_support_operations_get'
  | 'admin_support_operations_patch';

type AdminReportObservation = {
  endpoint: AdminReportEndpointId;
  at: number;
  status: number;
  latencyMs: number;
};

export type AdminReportBudgetSnapshot = {
  windowMs: number;
  totalRequests: number;
  serverErrorCount: number;
  throttleCount: number;
  errorRate: number;
  throttleRate: number;
  p95LatencyMs: number;
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
  at = Date.now()
): void {
  observations.push({
    endpoint,
    at,
    status,
    latencyMs: Number.isFinite(latencyMs) ? Math.max(0, Math.round(latencyMs)) : 0
  });

  if (observations.length > MAX_OBSERVATIONS) {
    observations.splice(0, observations.length - MAX_OBSERVATIONS);
  }
}

export function getAdminReportBudgetSnapshot(windowMs = 5 * 60 * 1000, now = Date.now()): AdminReportBudgetSnapshot {
  const lowerBound = now - windowMs;
  const scoped = observations.filter((row) => row.at >= lowerBound);
  const totalRequests = scoped.length;
  const serverErrorCount = scoped.filter((row) => row.status >= 500).length;
  const throttleCount = scoped.filter((row) => row.status === 429).length;
  const latencyValues = scoped.map((row) => row.latencyMs);

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
    p95LatencyMs
  };
}

export function __unsafeResetAdminReportObservabilityForTests(): void {
  observations.splice(0, observations.length);
}
