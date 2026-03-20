import 'server-only';
import { Redis } from '@upstash/redis';
import { env, assertProductionReadiness } from '@/server/env';
import { createAdminClient } from '@/server/supabase/admin';
import { getAdminReportBudgetSnapshot } from '@/server/admin/report-observability';
import { getRecoverySnapshot } from '@/server/ops/recovery-observability';
import { emitTelemetryEvent } from '@/server/observability/telemetry';

export type ReadinessCheckStatus = 'pass' | 'fail' | 'warn';

export type ReadinessCheck = {
  id: 'env' | 'redis' | 'supabase' | 'admin_reports' | 'recovery';
  status: ReadinessCheckStatus;
  latencyMs: number | null;
  message: string;
};

export type ReadinessAlarm = {
  id: 'admin-report-error-budget' | 'recovery-backlog';
  severity: 'warn' | 'critical';
  message: string;
  snapshot: {
    windowMs: number;
    totalRequests: number;
    errorRate: number;
    throttleRate: number;
    p95LatencyMs: number;
    recoveryBacklog?: {
      bookingRequestedBacklogAge: number;
      capturedWithoutTerminalOutcome: number;
      outboxDeadLetter: number;
    };
  };
};

export type ReadinessReport = {
  ok: boolean;
  checkedAt: string;
  checks: ReadinessCheck[];
  alarms: ReadinessAlarm[];
};

function elapsedMs(start: number): number {
  return Math.round(performance.now() - start);
}

function parseErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return 'Unknown error';
}

async function checkEnv(): Promise<ReadinessCheck> {
  const startedAt = performance.now();
  try {
    assertProductionReadiness();
    return {
      id: 'env',
      status: 'pass',
      latencyMs: elapsedMs(startedAt),
      message: 'Environment readiness checks passed.'
    };
  } catch (error) {
    if (env.NODE_ENV !== 'production') {
      return {
        id: 'env',
        status: 'warn',
        latencyMs: elapsedMs(startedAt),
        message: `Non-production profile: ${parseErrorMessage(error)}`
      };
    }
    return {
      id: 'env',
      status: 'fail',
      latencyMs: elapsedMs(startedAt),
      message: parseErrorMessage(error)
    };
  }
}

async function checkRedis(): Promise<ReadinessCheck> {
  const startedAt = performance.now();
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    return {
      id: 'redis',
      status: env.NODE_ENV === 'production' ? 'fail' : 'warn',
      latencyMs: elapsedMs(startedAt),
      message: 'Redis credentials are not configured.'
    };
  }

  try {
    const redis = Redis.fromEnv();
    const probeKey = `ops:readyz:${Date.now()}`;
    await redis.set(probeKey, 'ok', { ex: 15 });
    const stored = await redis.get<string>(probeKey);
    await redis.del(probeKey);

    if (stored !== 'ok') {
      return {
        id: 'redis',
        status: 'fail',
        latencyMs: elapsedMs(startedAt),
        message: 'Redis probe returned an unexpected value.'
      };
    }

    return {
      id: 'redis',
      status: 'pass',
      latencyMs: elapsedMs(startedAt),
      message: 'Redis probe succeeded.'
    };
  } catch (error) {
    return {
      id: 'redis',
      status: 'fail',
      latencyMs: elapsedMs(startedAt),
      message: parseErrorMessage(error)
    };
  }
}

async function checkSupabase(): Promise<ReadinessCheck> {
  const startedAt = performance.now();

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('bookings')
      .select('id', { count: 'estimated', head: true })
      .limit(1);

    if (error) {
      return {
        id: 'supabase',
        status: 'fail',
        latencyMs: elapsedMs(startedAt),
        message: error.message
      };
    }

    return {
      id: 'supabase',
      status: 'pass',
      latencyMs: elapsedMs(startedAt),
      message: 'Supabase query probe succeeded.'
    };
  } catch (error) {
    return {
      id: 'supabase',
      status: 'fail',
      latencyMs: elapsedMs(startedAt),
      message: parseErrorMessage(error)
    };
  }
}

async function checkAdminReportErrorBudget(): Promise<{ check: ReadinessCheck; alarm: ReadinessAlarm | null }> {
  const snapshot = await getAdminReportBudgetSnapshot();
  if (snapshot.totalRequests < 20) {
    return {
      check: {
        id: 'admin_reports',
        status: 'warn',
        latencyMs: null,
        message: 'Admin report error-budget sample size is too small for reliable alarms.'
      },
      alarm: null
    };
  }

  const exceedsCritical =
    snapshot.errorRate > 0.05 || snapshot.throttleRate > 0.2 || snapshot.p95LatencyMs > 1500;
  const exceedsWarn =
    snapshot.errorRate > 0.01 || snapshot.throttleRate > 0.05 || snapshot.p95LatencyMs > 800;

  if (exceedsCritical || exceedsWarn) {
    const severity: ReadinessAlarm['severity'] = exceedsCritical ? 'critical' : 'warn';
    const checkStatus: ReadinessCheckStatus = exceedsCritical ? 'fail' : 'warn';
    const message =
      `Admin report error budget exceeded (${severity}): ` +
      `errorRate=${(snapshot.errorRate * 100).toFixed(2)}%, ` +
      `throttleRate=${(snapshot.throttleRate * 100).toFixed(2)}%, ` +
      `p95=${Math.round(snapshot.p95LatencyMs)}ms`;

    return {
      check: {
        id: 'admin_reports',
        status: checkStatus,
        latencyMs: null,
        message
      },
      alarm: {
        id: 'admin-report-error-budget',
        severity,
        message,
        snapshot: {
          windowMs: snapshot.windowMs,
          totalRequests: snapshot.totalRequests,
          errorRate: snapshot.errorRate,
          throttleRate: snapshot.throttleRate,
          p95LatencyMs: snapshot.p95LatencyMs
        }
      }
    };
  }

  return {
    check: {
      id: 'admin_reports',
      status: 'pass',
      latencyMs: null,
      message:
        `Admin report error budget healthy: ` +
        `errorRate=${(snapshot.errorRate * 100).toFixed(2)}%, ` +
        `throttleRate=${(snapshot.throttleRate * 100).toFixed(2)}%, ` +
        `p95=${Math.round(snapshot.p95LatencyMs)}ms`
    },
    alarm: null
  };
}

async function checkRecoveryBacklog(): Promise<{ check: ReadinessCheck; alarm: ReadinessAlarm | null }> {
  const snapshot = await getRecoverySnapshot();
  const backlogAge = snapshot.counts.booking_requested_backlog_age;
  const captured = snapshot.counts.captured_without_terminal_outcome;
  const deadLetter = snapshot.counts.outbox_dead_letter;

  const exceedsCritical = backlogAge > 120 || captured > 10 || deadLetter > 0;
  const exceedsWarn = backlogAge > 30 || captured > 0;

  if (exceedsCritical || exceedsWarn) {
    const severity: ReadinessAlarm['severity'] = exceedsCritical ? 'critical' : 'warn';
    const status: ReadinessCheckStatus = exceedsCritical ? 'fail' : 'warn';
    const message =
      `Recovery backlog elevated (${severity}): ` +
      `bookingRequestedBacklogAge=${Math.round(backlogAge)}m, ` +
      `capturedWithoutTerminalOutcome=${captured}, ` +
      `outboxDeadLetter=${deadLetter}`;

    return {
      check: {
        id: 'recovery',
        status,
        latencyMs: null,
        message
      },
      alarm: {
        id: 'recovery-backlog',
        severity,
        message,
        snapshot: {
          windowMs: snapshot.windowMs,
          totalRequests: 0,
          errorRate: 0,
          throttleRate: 0,
          p95LatencyMs: 0,
          recoveryBacklog: {
            bookingRequestedBacklogAge: backlogAge,
            capturedWithoutTerminalOutcome: captured,
            outboxDeadLetter: deadLetter
          }
        }
      }
    };
  }

  return {
    check: {
      id: 'recovery',
      status: 'pass',
      latencyMs: null,
      message:
        `Recovery backlog healthy: ` +
        `bookingRequestedBacklogAge=${Math.round(backlogAge)}m, ` +
        `capturedWithoutTerminalOutcome=${captured}, ` +
        `outboxDeadLetter=${deadLetter}`
    },
    alarm: null
  };
}

export async function buildReadinessReport(): Promise<ReadinessReport> {
  const [envCheck, redisCheck, supabaseCheck] = await Promise.all([checkEnv(), checkRedis(), checkSupabase()]);
  const budget = await checkAdminReportErrorBudget();
  const recovery = await checkRecoveryBacklog();
  const checks = [envCheck, redisCheck, supabaseCheck, budget.check, recovery.check];
  const alarms = [budget.alarm, recovery.alarm].filter(Boolean) as ReadinessAlarm[];
  const hasFailure = checks.some((check) => check.status === 'fail');

  void emitTelemetryEvent({
    category: 'readiness',
    metric: 'readiness.degraded',
    value: hasFailure ? 1 : 0,
    status: hasFailure ? 'fail' : alarms.length > 0 ? 'warn' : 'ok',
    dimensions: {
      failedChecks: checks.filter((check) => check.status === 'fail').map((check) => check.id),
      warningChecks: checks.filter((check) => check.status === 'warn').map((check) => check.id)
    }
  });

  return {
    ok: !hasFailure,
    checkedAt: new Date().toISOString(),
    checks,
    alarms
  };
}
