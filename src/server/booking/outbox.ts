import 'server-only';
import { randomUUID } from 'node:crypto';
import { Redis } from '@upstash/redis';
import { env } from '@/server/env';
import { logger } from '@/server/logger';
import { createAdminClient } from '@/server/supabase/admin';
import { sendLifecycleEmail, type LifecycleEmailPayload } from '@/server/notifications/email';
import { persistLifecycleAnalyticsEvent } from '@/server/analytics-repository';

type LifecycleOutboxTransition = 'confirmed' | 'failed' | 'refunded';
type OutboxStatus = 'pending' | 'processing' | 'processed' | 'dead_letter';

export type BookingLifecycleOutboxEvent = LifecycleEmailPayload & {
  bookingId: string;
  transition: LifecycleOutboxTransition;
};

type PersistedLifecycleOutboxEvent = BookingLifecycleOutboxEvent & {
  id: string;
  attemptCount: number;
  availableAt: string;
  lockedAt: string | null;
  lockToken: string | null;
};

const redis = env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
  ? Redis.fromEnv()
  : null;

const fallbackDedupe = new Map<string, number>();
const fallbackQueue = new Map<string, PersistedLifecycleOutboxEvent>();
const inFlight = new Set<Promise<void>>();
let schemaUnavailable = false;

const DEFAULT_LEASE_SECONDS = 60;
const DEFAULT_HEARTBEAT_SECONDS = 20;
const DEFAULT_RECLAIM_SECONDS = 90;
const DEFAULT_MAX_ATTEMPTS = 8;

function dedupeKey(event: BookingLifecycleOutboxEvent): string {
  return `booking:lifecycle:${event.bookingId}:${event.transition}`;
}

function isSchemaMissingError(error: unknown): boolean {
  const code = (error as { code?: string } | null | undefined)?.code;
  return code === 'PGRST205' || code === '42P01';
}

function pruneFallbackDedupe(): void {
  const now = Date.now();
  for (const [entry, expiresAt] of fallbackDedupe) {
    if (expiresAt <= now) {
      fallbackDedupe.delete(entry);
    }
  }
}

async function claimDispatchSlot(key: string, ttlSeconds = DEFAULT_LEASE_SECONDS): Promise<boolean> {
  if (redis) {
    const result = await redis.set(key, 'processing', { nx: true, ex: ttlSeconds });
    return result === 'OK';
  }

  pruneFallbackDedupe();
  if (fallbackDedupe.has(key)) {
    return false;
  }

  fallbackDedupe.set(key, Date.now() + ttlSeconds * 1000);
  return true;
}

async function finalizeDispatchSlot(key: string, ttlSeconds = 60 * 60 * 24 * 30): Promise<void> {
  if (redis) {
    await redis.set(key, 'processed', { ex: ttlSeconds });
    return;
  }

  fallbackDedupe.set(key, Date.now() + ttlSeconds * 1000);
}

async function dispatchLifecycleEvent(event: BookingLifecycleOutboxEvent): Promise<void> {
  const key = dedupeKey(event);
  const claimed = await claimDispatchSlot(key, DEFAULT_LEASE_SECONDS);
  if (!claimed) {
    logger.info({ bookingId: event.bookingId, transition: event.transition }, 'Duplicate lifecycle outbox event ignored');
    return;
  }

  const [emailResult, analyticsResult] = await Promise.allSettled([
    sendLifecycleEmail(event),
    persistLifecycleAnalyticsEvent({
      bookingId: event.bookingId,
      transition: event.transition,
      paymentStatus: null,
      totalAmount: event.totalAmount,
      currency: event.currency
    })
  ]);

  if (emailResult.status === 'rejected') {
    throw emailResult.reason;
  }

  await finalizeDispatchSlot(key);

  if (analyticsResult.status === 'rejected') {
    logger.warn(
      { bookingId: event.bookingId, transition: event.transition, error: analyticsResult.reason },
      'Lifecycle analytics dispatch failed'
    );
  }
}

async function persistLifecycleOutboxEvent(event: BookingLifecycleOutboxEvent): Promise<void> {
  if (!schemaUnavailable) {
    try {
      const supabase = createAdminClient();
      const outboxId = randomUUID();
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from('booking_outbox_events')
        .insert({
          id: outboxId,
          aggregate_type: 'booking',
          aggregate_id: event.bookingId,
          event_type: `booking.lifecycle.${event.transition}`,
          idempotency_key: dedupeKey(event),
          payload_json: event,
          status: 'pending',
          attempt_count: 0,
          available_at: nowIso
        });

      if (!error) {
        return;
      }

      if (isSchemaMissingError(error)) {
        schemaUnavailable = true;
      } else {
        throw error;
      }
    } catch (error) {
      logger.warn({ error, bookingId: event.bookingId, transition: event.transition }, 'DB outbox insert failed; falling back to in-memory dispatch');
    }
  }

  const fallbackEvent: PersistedLifecycleOutboxEvent = {
    id: randomUUID(),
    attemptCount: 0,
    availableAt: new Date().toISOString(),
    lockedAt: null,
    lockToken: null,
    ...event
  };
  fallbackQueue.set(fallbackEvent.id, fallbackEvent);
  const task = dispatchLifecycleEvent(event)
    .finally(() => {
      fallbackQueue.delete(fallbackEvent.id);
      inFlight.delete(task);
    })
    .catch((error) => {
      logger.error({ error, bookingId: event.bookingId, transition: event.transition }, 'Lifecycle outbox dispatch failed');
    });
  inFlight.add(task);
}

export function enqueueBookingLifecycleNotification(event: BookingLifecycleOutboxEvent): void {
  const task = persistLifecycleOutboxEvent(event).finally(() => {
    inFlight.delete(task);
  });
  inFlight.add(task);
}

function toPersistedEvent(row: Record<string, unknown>): PersistedLifecycleOutboxEvent | null {
  const payload = row.payload_json;
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const event = payload as BookingLifecycleOutboxEvent;
  return {
    ...event,
    id: String(row.id),
    attemptCount: typeof row.attempt_count === 'number' ? row.attempt_count : 0,
    availableAt: typeof row.available_at === 'string' ? row.available_at : new Date().toISOString(),
    lockedAt: typeof row.locked_at === 'string' ? row.locked_at : null,
    lockToken: typeof row.lock_token === 'string' ? row.lock_token : null
  };
}

export async function claimPendingLifecycleOutboxEvents(limit = 20): Promise<PersistedLifecycleOutboxEvent[]> {
  if (schemaUnavailable) {
    return Array.from(fallbackQueue.values()).slice(0, limit);
  }

  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();
  const reclaimBeforeIso = new Date(Date.now() - (DEFAULT_RECLAIM_SECONDS * 1000)).toISOString();
  const lockToken = randomUUID();

  const { data, error } = await supabase
    .from('booking_outbox_events')
    .select('id, payload_json, attempt_count, available_at, locked_at, lock_token')
    .eq('status', 'pending')
    .lte('available_at', nowIso)
    .order('available_at', { ascending: true })
    .limit(limit);

  if (error) {
    if (isSchemaMissingError(error)) {
      schemaUnavailable = true;
      return [];
    }
    throw error;
  }

  const pendingRows = (data as Record<string, unknown>[] | null) ?? [];
  const claimed: PersistedLifecycleOutboxEvent[] = [];
  for (const row of pendingRows) {
    const id = String(row.id);
    const update = await supabase
      .from('booking_outbox_events')
      .update({
        status: 'processing',
        locked_at: nowIso,
        lock_token: lockToken,
        locked_by: 'booking_outbox_worker'
      })
      .eq('id', id)
      .eq('status', 'pending')
      .lte('available_at', nowIso)
      .select('id, payload_json, attempt_count, available_at, locked_at, lock_token')
      .maybeSingle();

    if (update.error && isSchemaMissingError(update.error)) {
      schemaUnavailable = true;
      return [];
    }

    const claimedEvent = update.data ? toPersistedEvent(update.data as Record<string, unknown>) : null;
    if (claimedEvent) {
      claimed.push(claimedEvent);
    }
  }

  const { data: staleData, error: staleError } = await supabase
    .from('booking_outbox_events')
    .select('id, payload_json, attempt_count, available_at, locked_at, lock_token')
    .eq('status', 'processing')
    .lte('locked_at', reclaimBeforeIso)
    .order('locked_at', { ascending: true })
    .limit(Math.max(0, limit - claimed.length));

  if (staleError) {
    if (isSchemaMissingError(staleError)) {
      schemaUnavailable = true;
      return claimed;
    }
    throw staleError;
  }

  const staleRows = (staleData as Record<string, unknown>[] | null) ?? [];
  for (const row of staleRows) {
    const id = String(row.id);
    const update = await supabase
      .from('booking_outbox_events')
      .update({
        status: 'processing',
        locked_at: nowIso,
        lock_token: lockToken,
        locked_by: 'booking_outbox_worker'
      })
      .eq('id', id)
      .eq('status', 'processing')
      .lte('locked_at', reclaimBeforeIso)
      .select('id, payload_json, attempt_count, available_at, locked_at, lock_token')
      .maybeSingle();

    const reclaimedEvent = update.data ? toPersistedEvent(update.data as Record<string, unknown>) : null;
    if (reclaimedEvent) {
      claimed.push(reclaimedEvent);
    }
  }

  return claimed;
}

export async function extendLifecycleOutboxLease(eventId: string): Promise<void> {
  if (schemaUnavailable) {
    return;
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('booking_outbox_events')
    .update({
      locked_at: new Date().toISOString()
    })
    .eq('id', eventId)
    .eq('status', 'processing');

  if (error && isSchemaMissingError(error)) {
    schemaUnavailable = true;
  } else if (error) {
    throw error;
  }
}

export async function markLifecycleOutboxProcessed(eventId: string): Promise<void> {
  if (schemaUnavailable) {
    fallbackQueue.delete(eventId);
    return;
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('booking_outbox_events')
    .update({
      status: 'processed' satisfies OutboxStatus,
      processed_at: new Date().toISOString(),
      locked_at: null,
      lock_token: null,
      locked_by: null,
      last_error: null
    })
    .eq('id', eventId)
    .eq('status', 'processing');

  if (error && isSchemaMissingError(error)) {
    schemaUnavailable = true;
  } else if (error) {
    throw error;
  }
}

export async function markLifecycleOutboxFailed(eventId: string, errorMessage: string, attemptCount: number): Promise<void> {
  if (schemaUnavailable) {
    return;
  }

  const supabase = createAdminClient();
  const nextStatus: OutboxStatus = attemptCount >= DEFAULT_MAX_ATTEMPTS ? 'dead_letter' : 'pending';
  const availableAt = new Date(Date.now() + (DEFAULT_HEARTBEAT_SECONDS * 1000)).toISOString();
  const { error } = await supabase
    .from('booking_outbox_events')
    .update({
      status: nextStatus,
      attempt_count: attemptCount,
      available_at: availableAt,
      locked_at: null,
      lock_token: null,
      locked_by: null,
      last_error: errorMessage
    })
    .eq('id', eventId);

  if (error && isSchemaMissingError(error)) {
    schemaUnavailable = true;
  } else if (error) {
    throw error;
  }
}

export async function processLifecycleOutboxBatch(limit = 20): Promise<{ processed: number; failed: number }> {
  const events = await claimPendingLifecycleOutboxEvents(limit);
  let processed = 0;
  let failed = 0;

  for (const event of events) {
    try {
      await extendLifecycleOutboxLease(event.id);
      await dispatchLifecycleEvent(event);
      await markLifecycleOutboxProcessed(event.id);
      processed += 1;
    } catch (error) {
      failed += 1;
      await markLifecycleOutboxFailed(event.id, error instanceof Error ? error.message : 'Unknown outbox failure', event.attemptCount + 1);
      logger.error({ error, eventId: event.id, bookingId: event.bookingId }, 'Lifecycle outbox event processing failed');
    }
  }

  return { processed, failed };
}

export async function waitForBookingOutboxDrain(): Promise<void> {
  if (inFlight.size > 0) {
    await Promise.all(Array.from(inFlight));
  }
}

export function resetBookingOutboxForTests(): void {
  fallbackDedupe.clear();
  fallbackQueue.clear();
  inFlight.clear();
  schemaUnavailable = false;
}
