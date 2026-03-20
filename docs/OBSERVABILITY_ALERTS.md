# Observability Alerts

## Signals
- `recovery.booking_requested_backlog_age`
- `recovery.captured_without_terminal_outcome`
- `recovery.outbox_pending`
- `recovery.outbox_processing`
- `recovery.outbox_dead_letter`
- `recovery.sweep_recovered`
- `recovery.sweep_escalated`
- `recovery.sweep_manual_review`
- `recovery.webhook_replay_rejected`
- `recovery.reconciliation_failures`
- `readiness.readiness.degraded`
- admin report latency and scan-size observations

## Alert Defaults
- `booking_requested_backlog_age > 30m` -> warn
- `booking_requested_backlog_age > 120m` -> critical
- `captured_without_terminal_outcome > 0` -> warn
- `captured_without_terminal_outcome > 10` -> critical
- `outbox_dead_letter > 0` -> critical
- admin report `p95 > 800ms` -> warn
- admin report `p95 > 1500ms` -> critical
- readiness degraded -> critical

## Runbooks
- Stuck booking recovery: verify supplier outcome, inspect reconciliation metadata, and escalate if supplier truth is still missing.
- Payment/provider mismatch: Stripe remains payment truth, supplier callback/finalization remains booking truth, and compensation flows own refunds.
- Outbox dead-letter replay: inspect `booking_outbox_events.last_error`, replay idempotently after the root cause is fixed, and confirm backlog returns to zero.
- Sweep escalation handling: treat escalated/manual-review classifications as operational queue items; sweeps must never invent booking confirmation.
