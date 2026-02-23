---
phase: 03-hotel-detail-and-user-workspace
plan: 01
subsystem: ui
tags: [liteapi, hotel-details, ssr, api, vitest]

requires:
  - phase: 02-search-and-discovery-experience
    provides: canonical discovery query contracts, degraded-state envelope patterns
provides:
  - normalized hotel detail contract with explicit policies/location/pros-cons/completeness sections
  - additive API/SSR hotel detail boundary behavior for partial supplier payloads
  - requirement-level UI fallback coverage tests for truthful hotel content rendering
affects: [hotel-detail, hotel-api, ssr, supplier-normalization, phase-03]

tech-stack:
  added: []
  patterns: [contract-first supplier normalization, explicit partial-data messaging, additive API metadata]

key-files:
  created: [tests/hotel-detail-content.test.ts]
  modified: [src/server/liteapi.ts, src/app/api/hotels/[hotelId]/route.ts, src/app/hotels/[hotelId]/page.tsx, src/features/hotels/components/hotel-detail-experience.tsx]

key-decisions:
  - "HotelDetails now uses explicit null/array defaults instead of optional fields so missing supplier data is deterministic across API, SSR, and UI."
  - "Hotel detail API returns additive degraded metadata (`degraded`, `degradedReason`, `asOf`) without breaking existing payload consumers."
  - "Hotel UI removes synthetic amenity defaults and shows per-section truthful fallback copy for missing supplier blocks."

patterns-established:
  - "Supplier contract completeness: include machine-readable `completeness` metadata to drive user-facing partial-data signals."
  - "Section truthfulness: each required hotel block renders either supplier data or explicit unavailable copy."

requirements-completed: [HOTL-01]

duration: 8 min
completed: 2026-02-23
---

# Phase 3 Plan 01: Formalize hotel detail content contract and truthful completeness fallbacks Summary

**Hotel detail pages now use one normalized supplier contract with explicit policies, location context, pros/cons, and completeness metadata rendered with truthful per-section fallback messaging.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-23T13:29:00Z
- **Completed:** 2026-02-23T13:37:10Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Expanded `HotelDetails` normalization in `src/server/liteapi.ts` to cover HOTL-01 sections (policies, location context, reviews/pros-cons, completeness)
- Threaded enriched detail contract through API and SSR boundaries with additive degraded metadata and safe SSR not-found behavior
- Updated `src/features/hotels/components/hotel-detail-experience.tsx` to render requirement-complete sections and explicit missing-data copy, with regression tests in `tests/hotel-detail-content.test.ts`

## Task Commits

Each task was committed atomically:

1. **Task 1: Expand normalized hotel detail contract for HOTL-01 sections** - `dd5d2aa` (feat)
2. **Task 2: Thread the enriched detail contract through API and SSR boundaries** - `8eab8da` (feat)
3. **Task 3: Render requirement-complete sections with truthful fallback messaging and tests** - `bb2104b` (feat)

## Files Created/Modified
- `src/server/liteapi.ts` - adds explicit normalized detail sections and partial-data completeness model
- `src/app/api/hotels/[hotelId]/route.ts` - returns additive degraded metadata with normalized payload
- `src/app/hotels/[hotelId]/page.tsx` - enforces SSR not-found behavior for missing detail payloads
- `src/features/hotels/components/hotel-detail-experience.tsx` - renders all HOTL-01 sections with truthful section-level fallbacks
- `tests/hotel-detail-content.test.ts` - guards section presence and partial-data copy behavior

## Decisions Made
- Adopted explicit nullability/empty-array semantics in `HotelDetails` to prevent UI-side contract drift when supplier fields are missing
- Exposed degraded-state metadata additively in the hotel API response to keep consumers backward-compatible
- Removed synthetic amenity defaults so the UI never implies completeness when supplier content is unavailable

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- HOTL-01 contract and truthful rendering baseline are complete and regression-covered.
- Ready for 03-02-PLAN.md (sticky booking card, room selection, and cancellation-context hand-off).

## Self-Check: PASSED

- FOUND: `.planning/phases/03-hotel-detail-and-user-workspace/03-01-SUMMARY.md`
- FOUND: `dd5d2aa`
- FOUND: `8eab8da`
- FOUND: `bb2104b`

---
*Phase: 03-hotel-detail-and-user-workspace*
*Completed: 2026-02-23*
