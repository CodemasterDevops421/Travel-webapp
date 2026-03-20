import 'server-only';
import { emitTelemetryEvent, getTelemetrySnapshot } from '@/server/observability/telemetry';

export type RecoveryMetricId =
  | 'booking_requested_backlog_age'
  | 'captured_without_terminal_outcome'
  | 'outbox_pending'
  | 'outbox_processing'
  | 'outbox_dead_letter'
  | 'sweep_recovered'
  | 'sweep_escalated'
  | 'sweep_manual_review'
  | 'webhook_replay_rejected'
  | 'reconciliation_failures';

type RecoveryObservation = {
  at: number;
  metric: RecoveryMetricId;
  value: number;
};

export type RecoverySnapshot = {
  windowMs: number;
  counts: Record<RecoveryMetricId, number>;
};

const METRIC_IDS: RecoveryMetricId[] = [
  'booking_requested_backlog_age',
  'captured_without_terminal_outcome',
  'outbox_pending',
  'outbox_processing',
  'outbox_dead_letter',
  'sweep_recovered',
  'sweep_escalated',
  'sweep_manual_review',
  'webhook_replay_rejected',
  'reconciliation_failures'
];

const MAX_OBSERVATIONS = 20_000;
const observations: RecoveryObservation[] = [];

export function recordRecoveryObservation(metric: RecoveryMetricId, value: number, at = Date.now()): void {
  observations.push({
    at,
    metric,
    value: Number.isFinite(value) ? value : 0
  });

  void emitTelemetryEvent({
    category: 'recovery',
    metric,
    value: Number.isFinite(value) ? value : 0,
    observedAt: new Date(at).toISOString()
  });

  if (observations.length > MAX_OBSERVATIONS) {
    observations.splice(0, observations.length - MAX_OBSERVATIONS);
  }
}

export async function getRecoverySnapshot(windowMs = 15 * 60 * 1000, now = Date.now()): Promise<RecoverySnapshot> {
  const telemetrySnapshot = await getTelemetrySnapshot(METRIC_IDS, 'recovery', windowMs, now);
  const lowerBound = now - windowMs;
  const scoped = observations.filter((row) => row.at >= lowerBound);
  const counts = Object.fromEntries(METRIC_IDS.map((metric) => [metric, 0])) as Record<RecoveryMetricId, number>;

  for (const metric of METRIC_IDS) {
    const metricRows = scoped.filter((row) => row.metric === metric);
    counts[metric] = telemetrySnapshot.values[metric] || (metricRows.length > 0 ? metricRows[metricRows.length - 1].value : 0);
  }

  return {
    windowMs,
    counts
  };
}

export function __unsafeResetRecoveryObservabilityForTests(): void {
  observations.splice(0, observations.length);
}
