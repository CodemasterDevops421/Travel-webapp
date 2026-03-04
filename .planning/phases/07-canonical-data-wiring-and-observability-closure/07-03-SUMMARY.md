---
phase: 07-canonical-data-wiring-and-observability-closure
plan: "03"
subsystem: observability
tags: [error-handling, sentry, booking, webhooks, stripe, liteapi, redaction]

requires:
  - phase: 07-canonical-data-wiring-and-observability-closure
    provides: Structured event coverage and webhook reconciliation wiring from 07-02
provides:
  - Centralized exception forwarding from shared server error utilities to Sentry
  - Safe-message HTTP responses on booking and webhook critical error paths
  - Regression coverage for telemetry capture metadata redaction and failure-path context
affects: [incident-response, booking-ops, webhook-ops, security-observability]

tech-stack:
  added: []
  patterns: [shared toHttpError capture pipeline, safeMessage response boundary, failure-context metadata on webhook catch paths]

key-files:
  created: []
  modified:
    - src/server/errors.ts
    - tests/errors.test.ts
    - src/app/api/booking/book/route.ts
    - src/app/api/webhooks/stripe/route.ts
    - src/app/api/webhooks/liteapi/route.ts
    - tests/stripe-webhook-route.test.ts

key-decisions:
  - "Redact payload/body-shaped telemetry metadata keys before centralized capture to avoid leaking upstream supplier blobs."
  - "Return `httpError.safeMessage` from booking/webhook catches so public contracts remain safe while preserving internal exception detail in telemetry."
  - "Attach webhook `eventId` and transaction identifiers to centralized catch-path metadata for faster incident triage."

patterns-established:
  - "Critical routes treat centralized capture as the single failure-reporting path, with context passed through `toHttpError` metadata."
  - "Response safety and observability depth are decoupled: public responses use safeMessage, telemetry keeps structured identifiers."

requirements-completed: [ARCH-05]

duration: 4 min
completed: 2026-03-04
---

# Phase 07 Plan 03: Canonical Data Wiring and Observability Closure Summary

**Booking and webhook critical failures now flow through a centralized capture pipeline with payload-safe metadata redaction and safe public error responses.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-04T06:25:00Z
- **Completed:** 2026-03-04T06:29:08Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Hardened `captureServerError` redaction to strip payload/body-shaped metadata keys before Sentry forwarding.
- Locked centralized capture behavior in `tests/errors.test.ts`, including payload redaction alongside existing secret/token redaction guarantees.
- Routed booking, Stripe webhook, and LiteAPI webhook catch branches to safe-response boundaries while enriching centralized failure metadata with operational identifiers.

## Task Commits

Each task was committed atomically:

1. **Task 1: Integrate centralized exception forwarding in shared error utilities** - `dd06c72` (fix)
2. **Task 2: Route booking and webhook failures through the shared capture pipeline** - `a089531` (fix)

**Plan metadata:** Pending

## Files Created/Modified
- `src/server/errors.ts` - Expands metadata redaction to suppress raw payload/body keys in centralized capture.
- `tests/errors.test.ts` - Adds regression coverage for payload redaction in Sentry metadata.
- `src/app/api/booking/book/route.ts` - Uses `httpError.safeMessage` in booking failure responses.
- `src/app/api/webhooks/stripe/route.ts` - Captures Stripe event/transaction context in failure telemetry and returns safe public errors.
- `src/app/api/webhooks/liteapi/route.ts` - Captures LiteAPI event/booking/transaction context in failure telemetry and returns safe public errors.
- `tests/stripe-webhook-route.test.ts` - Asserts webhook failure capture metadata stays context-rich and free of sensitive header leakage.

## Decisions Made
- Redaction now treats payload/body metadata keys as unsafe by default to avoid accidental supplier blob leakage.
- Critical route responses now consistently use safe-message boundaries, regardless of internal error payload richness.
- Webhook failure telemetry now carries stable identifiers for reconciliation troubleshooting.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- ARCH-05 centralized error-capture closure is now complete across shared utilities and booking/webhook critical routes.
- Phase 07 plan set is complete pending state/metadata bookkeeping commit.

---
*Phase: 07-canonical-data-wiring-and-observability-closure*
*Completed: 2026-03-04*

## Self-Check: PASSED

- Confirmed `.planning/phases/07-canonical-data-wiring-and-observability-closure/07-03-SUMMARY.md` exists.
- Confirmed task commit `dd06c72` exists in git history.
- Confirmed task commit `a089531` exists in git history.
