---
phase: 02-search-and-discovery-experience
plan: 05
subsystem: search-results
tags: [navigation, truthfulness, legacy-filters, vitest]

requires:
  - phase: 02-03
    provides: degraded-state search results and property preview envelope
  - phase: 02-04
    provides: URL-synced search results filters and browse controls
provides:
  - Preference-aware hotel-card navigation on the search results surface
  - Truthful hotel-card merchandising with unsupported booking claims removed
  - Visible clear-all affordance for legacy minReviewCount-only URLs
affects: [search, discovery, hotel-detail-navigation]

tech-stack:
  added: []
  patterns:
    - Preference-aware navigation through shared PreferenceLink
    - Truthfulness guardrails enforced with source-based regression tests

key-files:
  created:
    - tests/search-results-card-behavior.test.tsx
  modified:
    - src/features/search/components/horizontal-hotel-card.tsx
    - src/features/search/components/filters-sidebar.tsx
    - tests/search-results-url-state.test.ts

key-decisions:
  - "Search-result links must route through PreferenceLink so language and currency survive navigation to hotel detail."
  - "Search-result cards only render pricing and benefit copy that the current listing payload can support."
  - "Legacy minReviewCount URLs remain backward-compatible and visibly clearable through existing sidebar affordances."

requirements-completed: [DISC-03, DISC-04]

duration: 1 min
completed: 2026-03-11
---

# Phase 2 Plan 05: Search results regression closure summary

**Search-result cards now preserve stored language/currency preferences, avoid unsupported booking-terms claims, and keep legacy `minReviewCount` filters visibly clearable.**

## Performance

- **Duration:** 1 min
- **Completed:** 2026-03-11
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Replaced raw hotel-card anchors with `PreferenceLink` so search-to-detail navigation keeps preference-aware query decoration.
- Removed unconditional booking-benefit pills and fabricated comparison pricing from the results card to keep supplier-facing copy truthful.
- Restored sidebar active-filter visibility for legacy `minReviewCount` URLs and extended regression coverage around that contract.

## Files Created/Modified

- `src/features/search/components/horizontal-hotel-card.tsx` - Uses `PreferenceLink` for result-card navigation and removes unsupported merchandising claims.
- `src/features/search/components/filters-sidebar.tsx` - Treats `minReviewCount` as an active filter so `Clear all` stays visible for legacy URLs.
- `tests/search-results-card-behavior.test.tsx` - Guards preference-aware navigation and badge truthfulness on hotel cards.
- `tests/search-results-url-state.test.ts` - Guards legacy `minReviewCount` visibility and clear-all affordance.

## Verification

- `npm run test -- tests/search-results-card-behavior.test.tsx tests/search-results-url-state.test.ts tests/search-results-truthfulness.test.ts`

## Issues Encountered

None.

## Next Phase Readiness

- Search results navigation now preserves store-backed language/currency context into hotel detail.
- Search merchandising no longer makes unsupported booking-term claims on the main results surface.
- Legacy shared URLs with `minReviewCount` remain visible and clearable without manual URL edits.

## Self-Check: PASSED

- FOUND: `.planning/phases/02-search-and-discovery-experience/02-05-SUMMARY.md`
- VERIFIED: targeted regression tests passed

---
*Phase: 02-search-and-discovery-experience*
*Completed: 2026-03-11*
