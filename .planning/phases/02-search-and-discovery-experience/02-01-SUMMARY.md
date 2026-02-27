---
phase: 02-search-and-discovery-experience
plan: 01
subsystem: search
tags: [nextjs, url-search-params, vitest, zustand]
requires:
  - phase: 01-platform-foundation-and-security
    provides: Hardened routing, validation posture, and shared preference normalization utilities
provides:
  - Canonical parse/serialize contract for discovery URL query state
  - Home search submissions serialized through normalized URL contract
  - Regression tests for query normalization and deterministic serialization
affects: [search, discovery, seo, caching]
tech-stack:
  added: []
  patterns: [Single-source URL query normalization, Deterministic query serialization order]
key-files:
  created:
    - src/features/search/lib/discovery-query.ts
    - tests/discovery-query.test.ts
  modified:
    - src/features/search/lib/listing-search-params.ts
    - src/features/search/components/hero-search-bar.tsx
    - src/features/search/stores/search-ui-store.ts
key-decisions:
  - "Use guests as canonical URL field while accepting adults input for backward compatibility."
  - "Serialize discovery query params in fixed key order to prevent URL/key drift across equivalent inputs."
patterns-established:
  - "Canonical discovery query contract: parse to typed state, serialize from normalized state only."
  - "Home search navigation must flow through shared serializer rather than ad-hoc URLSearchParams assembly."
requirements-completed: [DISC-01]
duration: 4 min
completed: 2026-02-23
---

# Phase 2 Plan 1: Canonical Discovery Query Contract Summary

**Canonical destination/date/guest/vibe URL state now drives home search navigation with deterministic query serialization and normalization safeguards.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-23T11:57:09Z
- **Completed:** 2026-02-23T12:01:37Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Added `parseDiscoveryQuery` and `serializeDiscoveryQuery` as a single typed contract for destination, dates, guests/rooms, vibe, locale, view/sort, and page.
- Replaced listing helper ad-hoc parsing with canonical discovery query normalization to remove divergent URL handling.
- Wired home search submission to canonical serializer and included selected mood (`vibe`) in outgoing URLs.
- Added regression coverage for invalid dates, bounds clamping, empty destination/vibe normalization, and deterministic equivalent-input serialization.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build canonical discovery query parser and serializer** - `66d194b` (feat)
2. **Task 2: Wire home search and mood selection into canonical URL state** - `4f5780e` (feat)
3. **Task 3: Add normalization and edge-case regression coverage** - `3c62c60` (test)

## Files Created/Modified
- `src/features/search/lib/discovery-query.ts` - Canonical parse/serialize contract and normalization rules.
- `src/features/search/lib/listing-search-params.ts` - Listing search param parsing now delegates to canonical discovery parser.
- `src/features/search/components/hero-search-bar.tsx` - Home search submission now serializes normalized discovery query including vibe.
- `src/features/search/stores/search-ui-store.ts` - Mood setter now trims values before state persistence.
- `tests/discovery-query.test.ts` - Regression suite for normalization and deterministic serialization behavior.

## Decisions Made
- Canonicalized guest count as `guests` in serialized output while preserving backward compatibility by parsing both `guests` and `adults`.
- Fixed serialization key order to make equivalent inputs produce stable query strings for sharing and cache consistency.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Discovery URL-state foundation is in place for SSR destination routing and richer filter/sort/view expansions.
- Ready for `02-02-PLAN.md`.

## Self-Check: PASSED

- FOUND: `.planning/phases/02-search-and-discovery-experience/02-01-SUMMARY.md`
- FOUND: `66d194b`
- FOUND: `4f5780e`
- FOUND: `3c62c60`

---
*Phase: 02-search-and-discovery-experience*
*Completed: 2026-02-23*
