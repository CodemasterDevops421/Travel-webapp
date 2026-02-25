---
phase: 04-checkout-and-booking-lifecycle-integrity
plan: "04"
subsystem: bookings
tags: [outbox, notifications, resend, refunds, booking-lifecycle]

requires:
  - phase: 04-02
    provides: webhook-authoritative lifecycle transitions and payment reconciliation fields
provides:
  - Lifecycle transition outbox with idempotent dispatch per booking transition
  - Deterministic booking confirmation/cancellation HTML email delivery adapter
  - Cancellation/refund API that keeps booking lifecycle and invoice status synchronized
affects: [phase-04-completion, booking-communications, reconciliation-ops]

tech-stack:
  added: []
  patterns: [transition-driven outbox side effects, transition-scoped email idempotency, cancellation-refund lifecycle synchronization]

key-files:
  created:
    - src/server/booking/outbox.ts
    - src/server/notifications/email.tsx
    - src/emails/booking-confirmation.tsx
    - src/emails/booking-cancellation.tsx
    - src/app/api/bookings/[bookingId]/cancel/route.ts
    - tests/booking-notification-lifecycle.test.ts
  modified:
    - src/server/booking/repository.ts
    - src/server/payments/stripe.ts
    - src/server/env.ts
    - .planning/phases/04-checkout-and-booking-lifecycle-integrity/04-USER-SETUP.md

key-decisions:
  - "Outbox dedupe key is bookingId+transition to prevent duplicate lifecycle emails under webhook replay and retries."
  - "Invoice state is synchronized via transition metadata (`invoiceStatus`) during every booking status write."
  - "Cancellation endpoint derives `refunded` vs `failed` from captured-payment truth and executes Stripe refunds only when required."

patterns-established:
  - "Lifecycle side effects pattern: repository writes enqueue async notifications without blocking request/webhook persistence paths."
  - "Communication authority pattern: emails are generated only from transition events (`confirmed`, `failed`, `refunded`) rather than client assumptions."

requirements-completed: [BOOK-06]

duration: 6 min
completed: 2026-02-25
---

# Phase 4 Plan 04: Lifecycle Communication and Cancellation Summary

**Lifecycle transitions now drive idempotent booking emails and cancellation/refund handling so traveler notifications and invoice state match authoritative booking/payment outcomes.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-25T19:12:20Z
- **Completed:** 2026-02-25T19:18:21Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Added an outbox-style lifecycle dispatch layer that dedupes by booking transition and asynchronously invokes notification delivery outside persistence critical paths.
- Implemented deterministic HTML confirmation/cancellation templates and a Resend adapter keyed by transition-scoped idempotency keys.
- Added cancellation/refund API flow with eligibility checks, optional Stripe refund initiation, and synchronized booking lifecycle + invoice state updates backed by lifecycle tests.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add lifecycle-driven outbox and notification adapter** - `898708a` (feat)
2. **Task 2: Implement booking confirmation and cancellation HTML emails** - `f09a4ea` (feat)
3. **Task 3: Add cancellation/refund endpoint with invoice-state synchronization** - `9cfcf78` (feat)
4. **Task 3 auto-fix follow-up:** `63b84aa` (fix)

**Plan metadata:** _pending_

## Files Created/Modified

- `src/server/booking/outbox.ts` - Transition-triggered outbox dedupe and async lifecycle email dispatch.
- `src/server/booking/repository.ts` - Lifecycle metadata/invoice synchronization and outbox enqueue wiring for status updates.
- `src/server/notifications/email.tsx` - Lifecycle-aware Resend adapter with deterministic subject/body payload contracts.
- `src/emails/booking-confirmation.tsx` - Confirmation template carrying booking reference, dates, and total.
- `src/emails/booking-cancellation.tsx` - Cancellation/refund template carrying lifecycle outcome and invoice status.
- `src/app/api/bookings/[bookingId]/cancel/route.ts` - Cancellation boundary coordinating supplier cancel, Stripe refund, and transition update.
- `src/server/payments/stripe.ts` - Refund helper with deterministic idempotency key.
- `tests/booking-notification-lifecycle.test.ts` - Cancellation + outbox exactly-once lifecycle regression coverage.
- `.planning/phases/04-checkout-and-booking-lifecycle-integrity/04-USER-SETUP.md` - Added Resend setup/env guidance.

## Decisions Made

- Kept lifecycle email triggers constrained to `confirmed`, `failed`, and `refunded` transitions to prevent client-authoritative messaging drift.
- Chose metadata-based `invoiceStatus` synchronization in booking writes (no schema migration) to avoid architectural expansion while preserving lifecycle alignment.
- Made cancellation/refund routing branch on captured payment evidence (`payment_status === captured`) to prevent unnecessary refund attempts.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed duplicate legacy email module after TSX migration**
- **Found during:** Task 3 verification
- **Issue:** Legacy `src/server/notifications/email.ts` remained after moving JSX logic to `email.tsx`, risking ambiguous module resolution and stale implementation drift.
- **Fix:** Deleted the legacy file and kept a single canonical lifecycle email module.
- **Files modified:** `src/server/notifications/email.ts`
- **Verification:** `npm run typecheck`
- **Committed in:** `63b84aa`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Auto-fix removed an implementation hazard without expanding scope; lifecycle behavior remains aligned with plan intent.

## Authentication Gates

None.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration.** See `04-USER-SETUP.md` for Stripe + Resend env vars, dashboard steps, and lifecycle verification commands.

## Next Phase Readiness

- BOOK-06 communication/cancellation lifecycle alignment is implemented with deterministic tests.
- Phase 04 implementation plans are complete and ready for phase transition review.

---
*Phase: 04-checkout-and-booking-lifecycle-integrity*
*Completed: 2026-02-25*

## Self-Check: PASSED

- Verified files exist: `04-04-SUMMARY.md`, `04-USER-SETUP.md`
- Verified task commits exist: `898708a`, `f09a4ea`, `9cfcf78`, `63b84aa`
