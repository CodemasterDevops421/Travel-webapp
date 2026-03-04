import 'server-only';
import { env } from '@/server/env';
import { logger } from '@/server/logger';
import { createAdminClient } from '@/server/supabase/admin';

const failClosed = env.NODE_ENV === 'production' && env.STRICT_PERSISTENCE_MODE;

export type ReviewsCacheRecord = {
  hotel_id: string;
  payload: Record<string, unknown>;
  source: string;
  fetched_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

type UpsertReviewsCacheInput = {
  hotelId: string;
  payload: Record<string, unknown>;
  source?: string;
  ttlSeconds: number;
};

const fallbackReviewsCache = new Map<string, ReviewsCacheRecord>();
let schemaUnavailable = false;

function isSchemaMissingError(error: unknown): boolean {
  const code = (error as { code?: string } | null | undefined)?.code;
  return code === 'PGRST205';
}

export function isReviewsCacheStale(record: Pick<ReviewsCacheRecord, 'expires_at'>, now = Date.now()): boolean {
  const expiresAt = Date.parse(record.expires_at);
  if (!Number.isFinite(expiresAt)) {
    return true;
  }
  return expiresAt <= now;
}

function toFallbackRecord(input: UpsertReviewsCacheInput): ReviewsCacheRecord {
  const nowIso = new Date().toISOString();
  const existing = fallbackReviewsCache.get(input.hotelId);

  return {
    hotel_id: input.hotelId,
    payload: {
      ...input.payload
    },
    source: input.source ?? existing?.source ?? 'liteapi',
    fetched_at: nowIso,
    expires_at: new Date(Date.now() + input.ttlSeconds * 1000).toISOString(),
    created_at: existing?.created_at ?? nowIso,
    updated_at: nowIso
  };
}

export async function getReviewsCache(hotelId: string): Promise<ReviewsCacheRecord | null> {
  const fallback = fallbackReviewsCache.get(hotelId) ?? null;

  if (schemaUnavailable) {
    if (failClosed) {
      return null;
    }
    return fallback;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('reviews_cache')
    .select('hotel_id, payload, source, fetched_at, expires_at, created_at, updated_at')
    .eq('hotel_id', hotelId)
    .limit(1)
    .single();

  if (error) {
    if (isSchemaMissingError(error)) {
      schemaUnavailable = true;
      logger.warn({ error, hotelId }, 'Supabase reviews_cache schema missing during lookup.');
      if (failClosed) {
        return null;
      }
      return fallback;
    }

    logger.warn({ error, hotelId }, 'Failed to read reviews cache by hotel id');
    return fallback;
  }

  return (data as ReviewsCacheRecord) ?? fallback;
}

export async function upsertReviewsCache(input: UpsertReviewsCacheInput): Promise<boolean> {
  const fallbackRecord = toFallbackRecord(input);

  if (schemaUnavailable) {
    if (failClosed) {
      logger.error('Supabase reviews_cache persistence unavailable in production.');
      return false;
    }
    fallbackReviewsCache.set(input.hotelId, fallbackRecord);
    return true;
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('reviews_cache')
    .upsert({
      hotel_id: input.hotelId,
      payload: {
        ...input.payload
      },
      source: input.source ?? 'liteapi',
      fetched_at: fallbackRecord.fetched_at,
      expires_at: fallbackRecord.expires_at
    }, {
      onConflict: 'hotel_id'
    });

  if (error) {
    if (isSchemaMissingError(error)) {
      schemaUnavailable = true;
      logger.warn({ error, hotelId: input.hotelId }, 'Supabase reviews_cache schema missing. Using fallback reviews cache storage.');
      if (failClosed) {
        return false;
      }
      fallbackReviewsCache.set(input.hotelId, fallbackRecord);
      return true;
    }

    logger.error({ error, hotelId: input.hotelId }, 'Failed to upsert reviews cache');
    if (failClosed) {
      return false;
    }
    fallbackReviewsCache.set(input.hotelId, fallbackRecord);
    return true;
  }

  fallbackReviewsCache.set(input.hotelId, fallbackRecord);
  return true;
}
