---
phase: 06-auth-and-booking-security-gap-closure
plan: "02"
subsystem: auth
tags: [booking, security, redaction, vitest, liteapi]
requires:
  - phase: 04-checkout-and-booking-lifecycle-integrity
    provides: booking session signing, quote verification, fail-closed booking persistence guards
provides:
  - Explicit allowlisted prebook response contract for checkout payment bootstrap
  - Shared security-route test mocks to eliminate regression setup drift
  - Regression assertions for secret-leak prevention and malformed supplier payload fail-closed behavior
affects: [booking-api, checkout-ui, security-regressions]
tech-stack:
  added: []
  patterns:
    - Response-boundary allowlist contracts for client-facing booking payloads
    - Shared route-mock fixtures for security regression test determinism
key-files:
  created:
    - tests/helpers/security-route-mocks.ts
  modified:
    - src/app/api/booking/prebook/route.ts
    - src/features/booking/components/booking-console.tsx
    - tests/api-security-regression.test.ts
    - tests/booking-routes.test.ts
    - tests/security/validation.test.ts
key-decisions:
  - "Expose supplier payment bootstrap key as explicit allowlisted paymentToken instead of leaking secret-like field names."
  - "Centralize security-route mocks in a helper module so redaction regression tests execute route behavior instead of failing in setup."
patterns-established:
  - "Client payload boundaries: validate outbound response shape with explicit schema before JSON return."
  - "Security regressions: assert absence of secret-like key patterns recursively, not only known field names."
requirements-completed: [ARCH-01, AUTH-05]
duration: 6 min
completed: 2026-02-28
---

# Phase 06 Plan 02: Auth and Booking Security Gap Closure Summary

**Prebook responses now ship only explicit checkout bootstrap fields while regression suites deterministically enforce no secret-like leakage and fail-closed malformed supplier payload handling.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-28T07:50:00Z
- **Completed:** 2026-02-28T07:56:06Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Locked `/api/booking/prebook` output to an explicit allowlist, including schema-validated outbound payload and renamed `paymentToken` client bootstrap field.
- Updated checkout client consumption to use the tightened prebook contract without payment-launch regressions.
- Added shared security-route mocks and migrated security regression suites to remove setup drift and exercise real route behavior.
- Extended regression coverage with recursive secret-key-pattern negatives plus malformed supplier prebook/booking fail-closed assertions.

## Task Commits

Each task was committed atomically:

1. **Task 1: Enforce prebook payment bootstrap allowlist at response boundary** - `7e936a3` (feat)
2. **Task 2: Stabilize security regression mocks and extend leakage assertions** - `b2b03d6` (test)

**Plan metadata:** pending

## Files Created/Modified
- `tests/helpers/security-route-mocks.ts` - Shared deterministic mocks for logger, rate-limit, settings, CSRF, and supabase auth dependencies.
- `src/app/api/booking/prebook/route.ts` - Explicit response allowlist schema and `paymentToken` outbound contract.
- `src/features/booking/components/booking-console.tsx` - Checkout payment widget now consumes `paymentToken` from prebook payload.
- `tests/api-security-regression.test.ts` - Drift-free route setup and recursive negative leak assertions for rates and booking responses.
- `tests/booking-routes.test.ts` - Prebook allowlist assertions and fail-closed malformed supplier payload tests for prebook and book flows.
- `tests/security/validation.test.ts` - Recursive key-pattern redaction coverage while preserving allowlisted token field.

## Decisions Made
- Exposed payment bootstrap credential as `paymentToken` to avoid secret-like key naming in browser payload contracts while preserving required checkout behavior.
- Standardized security route test setup through a helper fixture to keep regression suites aligned with route dependencies and prevent setup-only failures.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `tests/api-security-regression.test.ts` initially failed with HTTP 500 due to missing `getAppSettings` fixture for rates route execution; resolved by shared security-route mocks in Task 2.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- ARCH-01 and AUTH-05 evidence is now encoded in route contracts and automated regression checks.
- Ready for remaining phase-06 execution plans and verification pass.

---
*Phase: 06-auth-and-booking-security-gap-closure*
*Completed: 2026-02-28*

## Self-Check: PASSED

- FOUND: `.planning/phases/06-auth-and-booking-security-gap-closure/06-02-SUMMARY.md`
- FOUND: `7e936a3`
- FOUND: `b2b03d6`
