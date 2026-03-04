import 'server-only';
import { Redis } from '@upstash/redis';
import { env, assertProductionReadiness } from '@/server/env';
import { createAdminClient } from '@/server/supabase/admin';

export type ReadinessCheckStatus = 'pass' | 'fail' | 'warn';

export type ReadinessCheck = {
  id: 'env' | 'redis' | 'supabase';
  status: ReadinessCheckStatus;
  latencyMs: number | null;
  message: string;
};

export type ReadinessReport = {
  ok: boolean;
  checkedAt: string;
  checks: ReadinessCheck[];
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

export async function buildReadinessReport(): Promise<ReadinessReport> {
  const checks = await Promise.all([checkEnv(), checkRedis(), checkSupabase()]);
  const hasFailure = checks.some((check) => check.status === 'fail');

  return {
    ok: !hasFailure,
    checkedAt: new Date().toISOString(),
    checks
  };
}
