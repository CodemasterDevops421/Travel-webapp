import 'server-only';
import { randomUUID } from 'node:crypto';
import { createAdminClient } from '@/server/supabase/admin';
import { logStructuredEvent } from '@/server/logger';

export type TelemetryCategory = 'admin_report' | 'recovery' | 'readiness' | 'failure_proof';

export type TelemetryEventInput = {
  category: TelemetryCategory;
  metric: string;
  value: number;
  unit?: string | null;
  status?: 'ok' | 'warn' | 'fail' | 'info';
  dimensions?: Record<string, unknown>;
  observedAt?: string;
};

export type TelemetrySnapshot = {
  windowMs: number;
  values: Record<string, number>;
};

const MAX_FALLBACK_EVENTS = 20_000;
const fallbackEvents: Array<TelemetryEventInput & { observedAt: string }> = [];
let dbUnavailable = false;

function shouldUseFallbackOnly(): boolean {
  return process.env.NODE_ENV === 'test';
}

function normalizeObservedAt(observedAt?: string): string {
  if (typeof observedAt === 'string' && !Number.isNaN(Date.parse(observedAt))) {
    return new Date(observedAt).toISOString();
  }

  return new Date().toISOString();
}

function isMissingTableError(error: unknown): boolean {
  const code = (error as { code?: string } | null | undefined)?.code;
  return code === 'PGRST205' || code === '42P01';
}

function pushFallbackEvent(event: TelemetryEventInput & { observedAt: string }): void {
  fallbackEvents.push(event);
  if (fallbackEvents.length > MAX_FALLBACK_EVENTS) {
    fallbackEvents.splice(0, fallbackEvents.length - MAX_FALLBACK_EVENTS);
  }
}

export async function emitTelemetryEvent(input: TelemetryEventInput): Promise<void> {
  const event = {
    ...input,
    observedAt: normalizeObservedAt(input.observedAt)
  };

  logStructuredEvent('info', 'observability.telemetry.emitted', {
    module: 'observability.telemetry',
    category: event.category,
    metric: event.metric,
    value: event.value,
    unit: event.unit ?? null,
    status: event.status ?? 'info',
    ...(event.dimensions ?? {})
  });

  if (dbUnavailable) {
    pushFallbackEvent(event);
    return;
  }

  if (shouldUseFallbackOnly()) {
    pushFallbackEvent(event);
    return;
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('ops_telemetry_events').insert({
      id: randomUUID(),
      category: event.category,
      metric: event.metric,
      value: event.value,
      unit: event.unit ?? null,
      status: event.status ?? 'info',
      dimensions: event.dimensions ?? {},
      observed_at: event.observedAt
    });

    if (error) {
      if (isMissingTableError(error)) {
        dbUnavailable = true;
      } else {
        pushFallbackEvent(event);
      }
    }
  } catch {
    pushFallbackEvent(event);
  }
}

export async function getTelemetrySnapshot(
  metrics: string[],
  category?: TelemetryCategory,
  windowMs = 15 * 60 * 1000,
  now = Date.now()
): Promise<TelemetrySnapshot> {
  const lowerBoundIso = new Date(now - windowMs).toISOString();

  if (!dbUnavailable && !shouldUseFallbackOnly()) {
    try {
      const supabase = createAdminClient();
      let query = supabase
        .from('ops_telemetry_events')
        .select('metric, value, observed_at')
        .in('metric', metrics)
        .gte('observed_at', lowerBoundIso)
        .order('observed_at', { ascending: true });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (!error) {
        const values = Object.fromEntries(metrics.map((metric) => [metric, 0])) as Record<string, number>;
        for (const row of (data as Array<{ metric: string; value: number }> | null) ?? []) {
          values[row.metric] = typeof row.value === 'number' && Number.isFinite(row.value) ? row.value : 0;
        }
        return { windowMs, values };
      }

      if (isMissingTableError(error)) {
        dbUnavailable = true;
      }
    } catch {
      // fall through to in-memory snapshot
    }
  }

  const lowerBound = now - windowMs;
  const values = Object.fromEntries(metrics.map((metric) => [metric, 0])) as Record<string, number>;
  const scoped = fallbackEvents.filter((event) => Date.parse(event.observedAt) >= lowerBound);
  for (const metric of metrics) {
    const rows = scoped.filter((event) => event.metric === metric && (!category || event.category === category));
    values[metric] = rows.length > 0 ? rows[rows.length - 1].value : 0;
  }

  return { windowMs, values };
}

export function __unsafeResetTelemetryForTests(): void {
  fallbackEvents.splice(0, fallbackEvents.length);
  dbUnavailable = false;
}
