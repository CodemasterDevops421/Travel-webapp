import 'server-only';
import { createAdminClient } from '@/server/supabase/admin';
import { updateBookingMetadataById } from '@/server/booking/repository';
import { recordRecoveryObservation } from '@/server/ops/recovery-observability';

type SweepClassification =
  | 'auto_recovered'
  | 'still_pending_within_sla'
  | 'escalated_manual_review'
  | 'unrecoverable_dead_letter';

type BookingSweepRow = {
  id: string;
  transaction_id: string | null;
  status: string;
  payment_status: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type RecoverySweepCounts = {
  autoRecovered: number;
  stillPendingWithinSla: number;
  escalatedManualReview: number;
  unrecoverableDeadLetter: number;
  inspected: number;
};

export type RecoverySweepResult = {
  bookingRequested: RecoverySweepCounts;
  capturedWithoutTerminalOutcome: RecoverySweepCounts;
  staleOutboxProcessing: {
    reclaimedCandidates: number;
    deadLetterCount: number;
    pendingCount: number;
    processingCount: number;
  };
  promoExpiry: {
    inspected: number;
    expiredReservations: number;
    skipped: boolean;
    reason: string | null;
  };
  checkedAt: string;
};

const BOOKING_REQUESTED_SLA_MINUTES = 30;
const CAPTURED_OUTCOME_SLA_MINUTES = 30;
const OUTBOX_RECLAIM_SECONDS = 90;

function minutesSince(iso: string, now = Date.now()): number {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) {
    return Number.POSITIVE_INFINITY;
  }
  return (now - parsed) / (1000 * 60);
}

function buildReconciliationMetadata(
  existingMetadata: Record<string, unknown> | null,
  classification: SweepClassification,
  reason: string,
  at: string
): Record<string, unknown> {
  const reconciliation = {
    ...((existingMetadata?.reconciliation as Record<string, unknown> | undefined) ?? {}),
    classification,
    reason,
    lastSweepAt: at
  };

  return {
    ...(existingMetadata ?? {}),
    reconciliation
  };
}

async function markBookingReconciliationState(
  booking: BookingSweepRow,
  classification: SweepClassification,
  reason: string,
  checkedAtIso: string
): Promise<boolean> {
  const metadata = buildReconciliationMetadata(booking.metadata, classification, reason, checkedAtIso);
  const result = await updateBookingMetadataById(booking.id, metadata);
  return result.ok;
}

async function sweepBookingRequested(now = Date.now()): Promise<RecoverySweepCounts> {
  const checkedAtIso = new Date(now).toISOString();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bookings')
    .select('id, transaction_id, status, payment_status, metadata, created_at')
    .eq('status', 'booking_requested')
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) {
    throw error;
  }

  const rows = (data as BookingSweepRow[] | null) ?? [];
  const counts: RecoverySweepCounts = {
    autoRecovered: 0,
    stillPendingWithinSla: 0,
    escalatedManualReview: 0,
    unrecoverableDeadLetter: 0,
    inspected: rows.length
  };

  for (const booking of rows) {
    const ageMinutes = minutesSince(booking.created_at, now);
    const classification: SweepClassification =
      ageMinutes <= BOOKING_REQUESTED_SLA_MINUTES
        ? 'still_pending_within_sla'
        : 'escalated_manual_review';
    const reason = ageMinutes <= BOOKING_REQUESTED_SLA_MINUTES
      ? 'Booking request is still within reconciliation SLA.'
      : 'Booking request exceeded reconciliation SLA without supplier terminal outcome.';

    const updated = await markBookingReconciliationState(booking, classification, reason, checkedAtIso);
    if (!updated) {
      counts.unrecoverableDeadLetter += 1;
      continue;
    }

    if (classification === 'still_pending_within_sla') {
      counts.stillPendingWithinSla += 1;
    } else {
      counts.escalatedManualReview += 1;
    }
  }

  recordRecoveryObservation(
    'booking_requested_backlog_age',
    rows.length === 0 ? 0 : Math.max(...rows.map((row) => minutesSince(row.created_at, now)))
  );
  recordRecoveryObservation('sweep_escalated', counts.escalatedManualReview);
  recordRecoveryObservation('sweep_manual_review', counts.unrecoverableDeadLetter);
  return counts;
}

async function sweepCapturedWithoutTerminalOutcome(now = Date.now()): Promise<RecoverySweepCounts> {
  const checkedAtIso = new Date(now).toISOString();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bookings')
    .select('id, transaction_id, status, payment_status, metadata, created_at')
    .eq('payment_status', 'captured')
    .in('status', ['payment_authorized', 'booking_requested'])
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) {
    throw error;
  }

  const rows = (data as BookingSweepRow[] | null) ?? [];
  const counts: RecoverySweepCounts = {
    autoRecovered: 0,
    stillPendingWithinSla: 0,
    escalatedManualReview: 0,
    unrecoverableDeadLetter: 0,
    inspected: rows.length
  };

  for (const booking of rows) {
    const ageMinutes = minutesSince(booking.created_at, now);
    const classification: SweepClassification =
      ageMinutes <= CAPTURED_OUTCOME_SLA_MINUTES
        ? 'still_pending_within_sla'
        : 'escalated_manual_review';
    const reason = ageMinutes <= CAPTURED_OUTCOME_SLA_MINUTES
      ? 'Captured payment is still within booking terminal-outcome SLA.'
      : 'Captured payment has no booking terminal outcome after reconciliation SLA.';

    const updated = await markBookingReconciliationState(booking, classification, reason, checkedAtIso);
    if (!updated) {
      counts.unrecoverableDeadLetter += 1;
      continue;
    }

    if (classification === 'still_pending_within_sla') {
      counts.stillPendingWithinSla += 1;
    } else {
      counts.escalatedManualReview += 1;
    }
  }

  recordRecoveryObservation('captured_without_terminal_outcome', rows.length);
  return counts;
}

async function inspectOutbox(now = Date.now()): Promise<RecoverySweepResult['staleOutboxProcessing']> {
  const reclaimBeforeIso = new Date(now - (OUTBOX_RECLAIM_SECONDS * 1000)).toISOString();
  const supabase = createAdminClient();

  const [staleProcessing, deadLetter, pending, processing] = await Promise.all([
    supabase
      .from('booking_outbox_events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'processing')
      .lte('locked_at', reclaimBeforeIso),
    supabase
      .from('booking_outbox_events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'dead_letter'),
    supabase
      .from('booking_outbox_events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('booking_outbox_events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'processing')
  ]);

  const snapshot = {
    reclaimedCandidates: staleProcessing.count ?? 0,
    deadLetterCount: deadLetter.count ?? 0,
    pendingCount: pending.count ?? 0,
    processingCount: processing.count ?? 0
  };

  recordRecoveryObservation('outbox_pending', snapshot.pendingCount);
  recordRecoveryObservation('outbox_processing', snapshot.processingCount);
  recordRecoveryObservation('outbox_dead_letter', snapshot.deadLetterCount);
  return snapshot;
}

async function inspectPromoExpiry(now = Date.now()): Promise<RecoverySweepResult['promoExpiry']> {
  const supabase = createAdminClient();
  const { error, count } = await supabase
    .from('promo_redemptions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'reserved')
    .lte('expires_at', new Date(now).toISOString());

  if (error) {
    const code = (error as { code?: string } | null | undefined)?.code;
    if (code === 'PGRST205' || code === '42P01') {
      return {
        inspected: 0,
        expiredReservations: 0,
        skipped: true,
        reason: 'Promo reservation table is not implemented yet.'
      };
    }
    throw error;
  }

  return {
    inspected: count ?? 0,
    expiredReservations: count ?? 0,
    skipped: false,
    reason: null
  };
}

export async function runRecoverySweeps(now = Date.now()): Promise<RecoverySweepResult> {
  const [bookingRequested, capturedWithoutTerminalOutcome, staleOutboxProcessing, promoExpiry] = await Promise.all([
    sweepBookingRequested(now),
    sweepCapturedWithoutTerminalOutcome(now),
    inspectOutbox(now),
    inspectPromoExpiry(now)
  ]);

  return {
    bookingRequested,
    capturedWithoutTerminalOutcome,
    staleOutboxProcessing,
    promoExpiry,
    checkedAt: new Date(now).toISOString()
  };
}
