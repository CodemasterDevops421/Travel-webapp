import 'server-only';
import { createAdminClient } from '@/server/supabase/admin';
import { env } from '@/server/env';
import { logger } from '@/server/logger';

export type OperatingMode = 'sandbox' | 'production';

export type AppSettings = {
  commissionPercent: number;
  environmentMode: OperatingMode;
  requireLoginForBooking: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  source: 'supabase' | 'fallback';
};

type UpdateAppSettingsInput = {
  commissionPercent?: number;
  environmentMode?: OperatingMode;
  requireLoginForBooking?: boolean;
  updatedBy?: string | null;
};

const FALLBACK_KEY = 'global';

let schemaUnavailable = false;
const fallbackSettings: AppSettings = {
  commissionPercent: Number.isFinite(env.PRICE_MARKUP_PERCENT)
    ? Math.min(40, Math.max(0, env.PRICE_MARKUP_PERCENT))
    : 12,
  environmentMode: env.LITEAPI_ENV,
  requireLoginForBooking: false,
  updatedAt: null,
  updatedBy: null,
  source: 'fallback'
};

function isSchemaMissingError(error: unknown): boolean {
  const code = (error as { code?: string } | null | undefined)?.code;
  return code === 'PGRST205' || code === '42P01';
}

function normalizeCommissionPercent(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallbackSettings.commissionPercent;
  }
  return Math.min(40, Math.max(0, value));
}

function normalizeEnvironmentMode(value: unknown): OperatingMode {
  return value === 'production' ? 'production' : 'sandbox';
}

function mapRowToSettings(row: Record<string, unknown> | null | undefined): AppSettings {
  return {
    commissionPercent: normalizeCommissionPercent(row?.commission_percent),
    environmentMode: normalizeEnvironmentMode(row?.environment_mode),
    requireLoginForBooking: row?.require_login_for_booking === true,
    updatedAt: typeof row?.updated_at === 'string' ? row.updated_at : null,
    updatedBy: typeof row?.updated_by === 'string' ? row.updated_by : null,
    source: 'supabase'
  };
}

function buildFallbackSettings(updatedBy?: string | null): AppSettings {
  fallbackSettings.updatedAt = new Date().toISOString();
  fallbackSettings.updatedBy = updatedBy ?? null;
  fallbackSettings.source = 'fallback';
  return {
    ...fallbackSettings
  };
}

export async function getAppSettings(): Promise<AppSettings> {
  if (schemaUnavailable) {
    return {
      ...fallbackSettings,
      source: 'fallback'
    };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('app_settings')
    .select('commission_percent, environment_mode, require_login_for_booking, updated_at, updated_by')
    .eq('key', FALLBACK_KEY)
    .maybeSingle();

  if (error) {
    if (isSchemaMissingError(error)) {
      schemaUnavailable = true;
      logger.warn({ error }, 'App settings schema missing; using fallback settings.');
    } else {
      logger.error({ error }, 'Failed to load app settings');
    }
    return {
      ...fallbackSettings,
      source: 'fallback'
    };
  }

  if (!data) {
    return {
      ...fallbackSettings,
      source: 'fallback'
    };
  }

  return mapRowToSettings(data as Record<string, unknown>);
}

export async function updateAppSettings(input: UpdateAppSettingsInput): Promise<AppSettings> {
  const current = await getAppSettings();
  const nextCommission = input.commissionPercent ?? current.commissionPercent;
  const nextMode = input.environmentMode ?? current.environmentMode;
  const nextRequireLogin = input.requireLoginForBooking ?? current.requireLoginForBooking;

  if (schemaUnavailable) {
    fallbackSettings.commissionPercent = normalizeCommissionPercent(nextCommission);
    fallbackSettings.environmentMode = normalizeEnvironmentMode(nextMode);
    fallbackSettings.requireLoginForBooking = nextRequireLogin;
    return buildFallbackSettings(input.updatedBy);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('app_settings')
    .upsert(
      {
        key: FALLBACK_KEY,
        commission_percent: normalizeCommissionPercent(nextCommission),
        environment_mode: normalizeEnvironmentMode(nextMode),
        require_login_for_booking: nextRequireLogin,
        updated_by: input.updatedBy ?? null,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'key' }
    )
    .select('commission_percent, environment_mode, require_login_for_booking, updated_at, updated_by')
    .single();

  if (error) {
    if (isSchemaMissingError(error)) {
      schemaUnavailable = true;
      logger.warn({ error }, 'App settings schema missing during update; writing fallback settings.');
      fallbackSettings.commissionPercent = normalizeCommissionPercent(nextCommission);
      fallbackSettings.environmentMode = normalizeEnvironmentMode(nextMode);
      fallbackSettings.requireLoginForBooking = nextRequireLogin;
      return buildFallbackSettings(input.updatedBy);
    }

    logger.error({ error }, 'Failed to update app settings');
    throw new Error('Failed to update app settings');
  }

  return mapRowToSettings(data as Record<string, unknown>);
}

export function getCommissionPercentFromSettings(settings: AppSettings): number {
  return normalizeCommissionPercent(settings.commissionPercent);
}
