# Phase 2: Search and Discovery Experience - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

## Phase Boundary

This context clarifies the remaining search-results behavior needed for Phase 2's discovery surface: preference-safe navigation, truthful results merchandising, and backward-compatible filter behavior on shared and legacy URLs. It does not expand search scope beyond the existing search/discovery experience already defined in the roadmap.

## Implementation Decisions

### Preference-aware hotel navigation
- Hotel-result links must preserve preference-aware navigation semantics when moving from results into hotel detail.
- Search result cards should use the established preference-linking path rather than raw anchor tags so language/currency context is not silently dropped.
- Search-to-detail navigation should keep the existing result-context params (`checkin`, `checkout`, `adults`, `rooms`, and return context) while also preserving user preferences consistently.

### Truthful rate merchandising
- Search result cards must not advertise booking benefits unless the current listing data actually supports those claims.
- Generic badges like free cancellation, pay later, or limited supply should be removed or made conditional on trustworthy supplier-backed signals.
- When search-result payloads do not include enough rate-policy detail, the UI should prefer silence over speculative conversion copy.

### Legacy filter compatibility
- `minReviewCount` remains part of the backward-compatible search URL/filter contract for shared and legacy links.
- If `minReviewCount` is active, the sidebar must treat it as an active filter so users can discover and clear that constraint.
- Hidden filters are not acceptable on the search results surface; active filtering must remain visible or explicitly resettable.

### Claude's Discretion
- Exact component refactor used to reintroduce preference-aware links on hotel cards.
- Whether truthful badge handling is implemented by removing unsupported badges entirely or by deriving a minimal safe subset from current data.
- Whether legacy `minReviewCount` is surfaced via badge/count/reset affordance only or via a visible sidebar control, as long as users can clearly detect and remove it.

## Specific Ideas

- Review findings to close:
  - Search result hotel links currently bypass preference-aware URL decoration.
  - Listing badges currently make unconditional rate-policy claims on every hotel.
  - A legacy `minReviewCount` filter can remain active while the sidebar hides `Clear all`.
- Preserve the current redesigned visual layout where possible; this follow-up is about truthful behavior and navigation continuity, not a new search-page redesign.

## Existing Code Insights

### Reusable Assets
- `src/components/navigation/preference-link.tsx`: existing preference-aware navigation primitive that should be reused for hotel-card links.
- `src/features/search/components/horizontal-hotel-card.tsx`: current result-card surface where navigation and benefit-badge behavior are centralized.
- `src/features/search/components/filters-sidebar.tsx`: existing sidebar clear/reset logic where hidden legacy-filter visibility must be restored.
- `src/features/search/components/search-results-page.tsx`: canonical source for URL-state parsing, filter application, and active-filter counting.
- `src/features/search/lib/listing-search-params.ts`: canonical listing filter contract that still includes `minReviewCount`.

### Established Patterns
- Phase 2 already established backward-compatible query handling and canonical URL behavior; this follow-up should restore compatibility rather than redefine the contract.
- Phase 2 degraded-state decisions require truthful search messaging; the same truthfulness standard applies to merchandising badges on result cards.
- Preference-aware routing is already an app-level pattern and should not be bypassed on the main discovery-to-detail transition.

### Integration Points
- Search result image/title/location/CTA links in `horizontal-hotel-card.tsx`.
- Active-filter visibility and reset affordances in `filters-sidebar.tsx`.
- Search filter counting and legacy URL parsing in `search-results-page.tsx` and `listing-search-params.ts`.
- Hotel detail navigation continuity for locale/currency-sensitive supplier requests downstream.

## Deferred Ideas

- Any richer rate-policy merchandising on search cards that requires new supplier fields belongs in a separate enhancement, not this regression closure.
- Any broader redesign of the search-results card visual system is out of scope for this context update.

---

*Phase: 02-search-and-discovery-experience*
*Context gathered: 2026-03-11*
