---
phase: 02-search-and-discovery-experience
plan: 03
subsystem: api
tags: [liteapi, cache, degraded-state, vitest]

requires:
  - phase: 02-01
    provides: canonical discovery query and property preview baseline
provides:
  - Property preview API envelope with degraded and freshness metadata
  - Supplier discovery TTL policy anchored to 300-900 second window
  - Regression coverage for degraded-state taxonomy and TTL bounds
affects: [search, discovery, supplier-integration]

tech-stack:
  added: []
  patterns:
    - Explicit degraded response taxonomy (timeout, partial, unavailable)
    - Canonical discovery TTL clamping through shared cache helpers

key-files:
  created:
    - tests/search-degraded-state.test.ts
  modified:
    - src/app/api/property-preview/route.ts
    - src/server/liteapi.ts
    - src/server/cache.ts
    - src/shared/lib/cache-ttl.ts
    - src/features/search/hooks/use-property-preview.ts
    - tests/cache-ttl.test.ts

key-decisions:
  - "Property preview responses always return an envelope with data/results plus degraded metadata."
  - "Any successful search after a prior supplier failure is labeled degradedReason=partial to avoid false freshness claims."

patterns-established:
  - "Discovery endpoints expose asOf + freshness fields alongside payload data."
  - "Supplier TTL values are defined centrally and clamped before cache writes."

requirements-completed: [DISC-05]

duration: 1 min
completed: 2026-02-23
---

# Phase 2 Plan 03: Cache-backed truthful supplier discovery summary

**Property preview search now returns a typed degraded envelope with freshness timestamps while supplier-backed TTLs are constrained to a 5-15 minute policy window.**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-23T04:10:48-08:00
- **Completed:** 2026-02-23T04:11:29-08:00
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Standardized discovery cache policy to 300-900 seconds with a 600-second default and cache-side clamping.
- Introduced a property-preview response envelope exposing `degraded`, `degradedReason`, `asOf`, and `freshness` without breaking client compatibility.
- Classified supplier failure states into timeout/partial/unavailable and added regression tests for degraded truthfulness plus TTL bounds.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define discovery caching TTLs and response envelope contract** - `6459e28` (feat)
2. **Task 2: Implement truthful degraded-state mapping for supplier failure classes** - `41f0d6b` (fix)
3. **Task 3: Add regression tests for TTL and degraded response correctness** - `37d7fd3` (test)

## Files Created/Modified
- `tests/search-degraded-state.test.ts` - Verifies fresh, partial, and unavailable degraded envelope outcomes.
- `tests/cache-ttl.test.ts` - Guards discovery TTLs against drifting outside 300-900 seconds.
- `src/shared/lib/cache-ttl.ts` - Defines canonical discovery supplier TTL constants.
- `src/server/cache.ts` - Clamps TTL values before writing Redis cache entries.
- `src/server/liteapi.ts` - Maps supplier failures to degraded taxonomy and returns typed search result metadata.
- `src/app/api/property-preview/route.ts` - Shapes API output into additive envelope contract with freshness fields.
- `src/features/search/hooks/use-property-preview.ts` - Preserves frontend compatibility with both legacy array and new envelope payloads.

## Decisions Made
- Response contract is additive: route returns both `data` and `results` arrays so consumers can migrate safely.
- A recovered result after earlier supplier failures is explicitly tagged `partial` and `stale` to avoid silent freshness claims.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Preserved existing frontend consumers while introducing envelope responses**
- **Found during:** Task 1
- **Issue:** Existing client hook expected an array response and would break once route switched to envelope payloads.
- **Fix:** Updated hook parsing to accept both legacy array payloads and new envelope contract.
- **Files modified:** src/features/search/hooks/use-property-preview.ts
- **Verification:** `npm run lint && npm run typecheck`
- **Committed in:** 6459e28

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Compatibility fix was required to keep existing discovery UI behavior while shipping the new API contract.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Discovery API now communicates degraded truthfulness explicitly and is protected by regression tests.
- Ready for `02-04-PLAN.md`.

## Self-Check: PASSED
- FOUND: `.planning/phases/02-search-and-discovery-experience/02-03-SUMMARY.md`
- FOUND commits: `6459e28`, `41f0d6b`, `37d7fd3`

---
*Phase: 02-search-and-discovery-experience*
*Completed: 2026-02-23*
