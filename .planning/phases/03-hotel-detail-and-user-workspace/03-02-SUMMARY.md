---
phase: 03-hotel-detail-and-user-workspace
plan: 02
subsystem: ui
tags: [hotel-rates, cancellation-policy, booking-context, react-query, vitest]

requires:
  - phase: 03-hotel-detail-and-user-workspace
    provides: normalized hotel detail contracts and truthful fallback sections from HOTL-01
provides:
  - explicit cancellation-context fields in hotel rates API and hook contracts
  - single selected-rate state binding room cards, sticky booking card, and booking CTA
  - HOTL-02 regression coverage for selection synchronization and cancellation visibility
affects: [hotel-detail, rates-api, booking-handoff, phase-03]

tech-stack:
  added: []
  patterns: [explicit nullable cancellation fields, selected-rate source-of-truth state, query hand-off contract testing]

key-files:
  created: [tests/hotel-booking-card.test.tsx]
  modified: [src/app/api/hotels/rates/route.ts, src/features/hotels/hooks/use-hotel-rates.ts, src/features/hotels/components/hotel-detail-experience.tsx]

key-decisions:
  - "Cancellation context is exposed as explicit nullable fields (`isRefundable`, `cancellationDeadline`, `cancellationNote`) instead of deriving meaning from display strings."
  - "Room row state, sticky booking card content, and reserve CTA now derive from one selected-rate key to prevent drift."
  - "Booking hand-off query payload now carries cancellation metadata with selected room identifiers and pricing context."

patterns-established:
  - "HOTL-02 booking integrity: selected rate is the only source for sidebar totals, policy copy, and booking links."
  - "Cancellation visibility contract: refundable status, deadline, and note remain explicit and nullable from API to UI."

requirements-completed: [HOTL-02]

duration: 5 min
completed: 2026-02-23
---

# Phase 3 Plan 02: Bind room selection and cancellation context to booking hand-off Summary

**Hotel rates now carry explicit cancellation context fields and the hotel detail page uses one selected-rate contract so room cards, sticky booking card, and checkout hand-off always stay in sync.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-23T13:40:13Z
- **Completed:** 2026-02-23T13:45:37Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Added stable cancellation-context fields at the rates API boundary and in `useHotelRates` typing/normalization.
- Refactored hotel detail room selection into a single selected-rate source driving room highlights, sticky summary, cancellation copy, and reserve CTA.
- Added HOTL-02 regression tests asserting selected-rate sync and booking hand-off query payload includes cancellation fields.

## Task Commits

Each task was committed atomically:

1. **Task 1: Normalize cancellation policy context in rates API contract** - `ac7f60f` (feat)
2. **Task 2: Implement selected-room source of truth for room cards and sticky booking card** - `201cca6` (feat)
3. **Task 3: Add HOTL-02 regression tests for selection and cancellation visibility** - `3701b6c` (test)

## Files Created/Modified
- `src/app/api/hotels/rates/route.ts` - normalizes rate cancellation fields into explicit nullable contract values.
- `src/features/hotels/hooks/use-hotel-rates.ts` - exports cancellation-aware rate type and keeps client data normalized.
- `src/features/hotels/components/hotel-detail-experience.tsx` - unifies selected-rate state for room list, sticky card, cancellation messaging, and booking link.
- `tests/hotel-booking-card.test.tsx` - regression checks for selected-rate synchronization and cancellation-field query hand-off.

## Decisions Made
- Promoted cancellation policy into explicit API/hook fields (`isRefundable`, `cancellationDeadline`, `cancellationNote`) to avoid UI-side string inference.
- Used a composite selected-rate key (`offerId:roomId`) as the single source of truth for room highlighting and booking CTA generation.
- Included cancellation metadata in booking query hand-off so checkout receives the same traveler-visible context.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- HOTL-02 is complete with synchronized selected-room state and visible cancellation policy context before checkout hand-off.
- Ready for `03-03-PLAN.md`.

## Self-Check: PASSED

- FOUND: `.planning/phases/03-hotel-detail-and-user-workspace/03-02-SUMMARY.md`
- FOUND: `ac7f60f`
- FOUND: `201cca6`
- FOUND: `3701b6c`
