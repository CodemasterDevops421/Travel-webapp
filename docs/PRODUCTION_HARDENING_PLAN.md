# Production Hardening Plan

This repository now treats Supabase as the durability boundary for booking idempotency, webhook processing, and lifecycle outbox persistence.

## Implemented foundation
- Expanded booking, payment, and supplier lifecycle vocabulary.
- Finalize route persists `booking_requested` instead of prematurely confirming a booking.
- Stripe webhook reconciliation updates payment truth without claiming provider confirmation.
- DB-backed webhook idempotency table.
- DB-backed finalize idempotency table.
- DB-backed lifecycle outbox table plus scheduled processing route.

## Invariants
- Redis is an optimization layer only.
- One booking truth record exists per supplier transaction / finalize idempotency scope.
- Outbox rows represent deferred side effects and are recoverable after worker failure.
- Reconciliation sweeps remain required for stuck supplier outcomes, dead-letter events, and refund edge cases.
