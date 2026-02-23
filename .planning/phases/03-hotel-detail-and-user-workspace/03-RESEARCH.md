# Phase 3: Hotel Detail and User Workspace - Research

**Researched:** 2026-02-23
**Domain:** Hotel detail content completeness, booking-context UX, grounded hotel AI Q&A, authenticated wishlist/workspace
**Confidence:** MEDIUM-HIGH

## User Constraints

- No `CONTEXT.md` exists for this phase; planning must use roadmap/requirements/prior summaries/current code patterns.
- Honor prior decision sequencing: discovery UX and cache-backed search ship before hotel detail and checkout expansion.
- Preserve brownfield architecture and current stack (Next.js App Router monolith, Supabase, LiteAPI, Upstash, React Query).

## Summary

Phase 3 should be planned as a **hardening and completion phase**, not a greenfield build. The codebase already has a working hotel route (`/hotels/[hotelId]`), SSR fetches for details/rates, a sticky booking sidebar, a simple hotel AI endpoint, and an authenticated wishlist API/page. The main planning problem is to close quality and contract gaps so existing pieces become requirement-complete for HOTL-01..04.

The highest-leverage approach is to formalize a **hotel detail contract** across three layers: supplier normalization (`src/server/liteapi.ts`), route/API validation (`src/app/api/hotels/*` and `src/app/hotels/[hotelId]/page.tsx`), and UI truthfulness (`src/features/hotels/components/hotel-detail-experience.tsx`). This should explicitly include missing/partial states for policies, location context, reviews/pros-cons, and cancellation terms so travelers can evaluate properties confidently.

For user workspace, the platform already has persistence and protected retrieval (`saved_hotels` table + `/api/wishlist` + `/wishlist`). Planning should focus on unifying this into a clearer account workspace surface, tightening auth/error semantics, and adding regression coverage for save/remove/retrieve flows and hotel-page integration.

**Primary recommendation:** Plan Phase 3 as four implementation tracks mapped 1:1 to HOTL-01..04, reusing existing endpoints/components while adding explicit data contracts, truthful fallback UX, and targeted tests.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HOTL-01 | Hotel detail pages present LiteAPI-backed details, amenities, gallery, policies, location, reviews, and pros/cons | Existing `getHotelDetails`/`getGuestReviews` normalization + `/hotels/[hotelId]` SSR route provide base; plan must add explicit policy/pros-cons/location context modeling and empty-state contracts |
| HOTL-02 | Hotel detail pages include sticky booking card, room selection, and visible cancellation policy context | Sticky sidebar and room cards already exist in `hotel-detail-experience.tsx`; plan should strengthen cancellation visibility and selection-state linkage to `/booking` query contract |
| HOTL-03 | AI Q&A on hotel pages answers within hotel-data context without bypassing booking logic | Current `/api/hotel-ai` is deterministic and grounded to `getHotelDetails`; plan should expand grounding depth, provenance/guardrails, and booking-safe answer boundaries |
| HOTL-04 | Authenticated users can save/manage wishlist hotels and retrieve them in account workspace | `saved_hotels` schema + `/api/wishlist` + `useWishlist` + `/wishlist` already work; plan should integrate save/remove from hotel/search surfaces and define account workspace retrieval UX/testing |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | `^15.5.12` | SSR hotel detail route and API route handlers | Already established across Phase 1/2; preserves brownfield architecture |
| React + Client Components | `19.0.0` | Interactive tabs, sticky booking card, room selection, wishlist toggles | Current feature UI pattern for interactivity on top of SSR data |
| LiteAPI SDK + direct fetch adapter | `liteapi-node-sdk ^4.3.2` | Supplier-backed hotel/rates/review data normalization | Existing integration in `src/server/liteapi.ts` already powers discovery and hotel detail |
| Supabase SSR + JS client | `@supabase/ssr ^0.5.2`, `@supabase/supabase-js ^2.48.1` | Authenticated wishlist persistence/retrieval | Existing auth + RLS-backed data model already live |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TanStack Query | `^5.66.8` | Client revalidation for hotel details/rates/wishlist | Client islands that need optimistic or post-SSR refresh behavior |
| Zod | `^3.24.1` | Route payload/query validation | All mutation and supplier-adjacent boundaries |
| Upstash Redis + rate limit | `@upstash/redis ^1.35.3`, `@upstash/ratelimit ^2.0.5` | TTL cache + abuse control for hotel and wishlist APIs | Hot-path reads and authenticated mutation endpoints |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extend current hotel route/components | Build new parallel hotel detail stack | Faster greenfield coding, but duplicates logic and violates brownfield constraint |
| Extend `/wishlist` into workspace | Build entirely separate account backend now | More future-flexible, but delays HOTL-04 and duplicates auth/persistence paths |
| Grounded deterministic hotel AI first | Full agentic multi-tool assistant first | More expressive AI, but higher hallucination/latency/risk for booking-critical UX |

**Installation:**
```bash
# No new baseline packages required for planning.
# Use current stack first; only add packages if gaps are proven during plan decomposition.
```

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── app/
│   ├── hotels/[hotelId]/page.tsx                # SSR hotel detail entry
│   ├── api/hotels/[hotelId]/route.ts            # Hotel detail API boundary
│   ├── api/hotels/rates/route.ts                # Rates + cancellation context boundary
│   ├── api/hotel-ai/route.ts                    # Grounded hotel Q&A endpoint
│   ├── api/wishlist/route.ts                    # Auth wishlist mutations/retrieval
│   └── wishlist/page.tsx                        # Workspace retrieval surface (or account workspace extension)
├── features/hotels/
│   ├── components/hotel-detail-experience.tsx   # Main detail UX + sticky booking card
│   └── hooks/use-hotel-details.ts               # Query-backed detail refresh
├── server/
│   ├── liteapi.ts                               # Supplier normalization + review enrichment
│   └── concierge.ts                             # Existing OpenAI JSON-response utility patterns
└── shared/hooks/use-wishlist.ts                 # Client wishlist state and optimistic updates
```

### Pattern 1: SSR Detail + Client Revalidation
**What:** Fetch full hotel detail and rates server-side for first paint, then allow client hooks to refresh data with TTL-aware Query.
**When to use:** Core hotel page rendering and date/currency updates.
**Why:** Preserves SEO/fast first render while keeping interactive room/rate behavior current.

### Pattern 2: Defensive Supplier Normalization Contract
**What:** Continue centralizing LiteAPI shape normalization (`photos`, facilities, coordinates, review score/count/breakdown/reviews) in `src/server/liteapi.ts`.
**When to use:** Any new supplier field (policies/pros-cons/location snippets) required by HOTL-01/HOTL-02.
**Why:** Keeps UI components simple and prevents route/component-level ad-hoc parsing drift.

### Pattern 3: Booking-Safe Room Selection Hand-off
**What:** Keep room selection as query-driven hand-off into `/booking` (`hotelId`, `roomId`, `offerId`, `amount`, `checkIn`, `checkOut`, etc.), with cancellation context shown before hand-off.
**When to use:** Room cards and sticky booking card CTA.
**Why:** Maintains compatibility with existing checkout prebook/finalize pipeline and signature flow.

### Pattern 4: Authenticated Wishlist as Server-Checked Mutation Flow
**What:** Use authenticated route (`/api/wishlist`) with CSRF/rate limiting and Supabase user checks, plus optimistic client updates.
**When to use:** Save/remove actions from search cards, hotel detail, and workspace list.
**Why:** Security posture is already aligned with Phase 1 hardening and avoids client-trusted persistence.

### Pattern 5: Grounded Hotel AI with Strict Scope
**What:** AI answers must be generated only from hotel-specific normalized data; responses should avoid payment/booking promises and direct users to booking terms where needed.
**When to use:** Hotel page Q&A only (HOTL-03), not global freeform assistant behavior.
**Why:** Requirement demands context grounding and booking-logic safety.

### Anti-Patterns to Avoid
- **Parallel detail implementations:** Do not split between `hotel-detail-experience.tsx` and unused alternate UIs (for example `hotel-details-page.tsx`) without consolidation.
- **UI-only truth claims:** Avoid static badges/text for cancellation/facilities when supplier data is missing or partial.
- **Ungrounded AI fallback:** Avoid generic chatbot responses that are not tied to current hotel payload.
- **Workspace/auth mismatch:** Avoid exposing save/remove UI actions that silently fail for unauthenticated users without explicit redirect or message.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Data fetching cache layer for hotel details/rates | New custom client cache framework | Existing React Query + current TTL constants + API cache wrappers | Existing stack already solves freshness and cache invalidation needs for this phase |
| Auth/session plumbing for workspace | Custom JWT/session system | Existing Supabase SSR auth + middleware + server clients | Security model and route protection already established in Phase 1 |
| AI orchestration framework | New autonomous multi-agent layer | Existing route-level hotel Q&A + `src/server/concierge.ts` JSON contract patterns | Phase 3 needs grounded, bounded answers, not broad autonomy |
| Supplier schema mappers in components | Component-level parsing per field | Centralized normalization in `src/server/liteapi.ts` | Prevents parsing divergence and duplicated fallback logic |

**Key insight:** Phase 3 risk is integration coherence (data truthfulness + booking-context integrity + authenticated workspace behavior), not missing primitives.

## Common Pitfalls

### Pitfall 1: Incomplete Hotel Content Presented as Complete
**What goes wrong:** UI appears complete while policies/pros-cons/location details are placeholder or inferred.
**Why it happens:** Current `HotelDetails` type does not explicitly model all HOTL-01 fields (especially policy/pros-cons structure).
**How to avoid:** Define explicit nullable fields and required fallback messaging for each HOTL-01 content block.
**Warning signs:** Frequent "unavailable" text with no structured reason; static badges contradict supplier payload.

### Pitfall 2: Sticky Booking Card Disconnect from Room Selection
**What goes wrong:** Sidebar shows one summary while selected room/cancellation context in list implies another.
**Why it happens:** No single selected-rate state contract currently binds list interactions and sticky card display.
**How to avoid:** Introduce canonical selected-rate state and derive all booking CTA query params/cancellation copy from it.
**Warning signs:** Different amounts between room card and CTA payload, or missing cancel deadline in CTA context.

### Pitfall 3: AI Answers Drift Beyond Grounded Hotel Data
**What goes wrong:** Q&A provides plausible but unverified policy/amenity claims.
**Why it happens:** Prompt/logic not tied tightly to normalized hotel fields and missing provenance handling.
**How to avoid:** Restrict answer generation to known fields, include "not in available data" responses, and block booking-payment instructions.
**Warning signs:** Answers mention facts absent from `getHotelDetails` output.

### Pitfall 4: Wishlist UX Works in Page but Not Cross-Surface
**What goes wrong:** `/wishlist` works, but save/remove actions from hotel detail/search are missing or inconsistent.
**Why it happens:** Heart buttons in search/hotel surfaces are presentational or disconnected from `useWishlist`.
**How to avoid:** Standardize one save-toggle interaction contract and test from every entry surface.
**Warning signs:** Saved count mismatch between header/workspace and card-level icon state.

### Pitfall 5: Thin Regression Coverage for Phase 3 Critical Flows
**What goes wrong:** Changes to supplier mapping or booking query params break hotel page/workspace silently.
**Why it happens:** Existing tests focus Phase 1 security + Phase 2 search; Phase 3 routes/components have little direct coverage.
**How to avoid:** Add targeted tests for hotel detail API mapping, cancellation visibility, grounded AI behavior, and wishlist auth lifecycle.
**Warning signs:** Manual QA catches breakages before tests do.

## Code Examples

Verified patterns from the current codebase:

### SSR Hotel Detail Fetch + Hydration Seed
```tsx
// Source: src/app/hotels/[hotelId]/page.tsx
const [hotel, rates] = await Promise.all([
  getHotelDetails(hotelId, qs.language, currency),
  getHotelRates({ hotelId, checkin, checkout, adults, currency })
]);

return (
  <HotelDetailExperience
    hotelId={hotelId}
    checkin={checkin}
    checkout={checkout}
    adults={adults}
    rooms={rooms}
    hotel={hotel}
    rates={rates}
  />
);
```

### Authenticated Wishlist Route Guard
```ts
// Source: src/app/api/wishlist/route.ts
const supabase = await createServerSupabaseClient();
const {
  data: { user }
} = await supabase.auth.getUser();

if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Grounded Hotel AI Boundary (Current Baseline)
```ts
// Source: src/app/api/hotel-ai/route.ts
const hotel = await getHotelDetails(parsed.data.hotelId);
const answer = answerFromHotelData(parsed.data.question, hotel);
return NextResponse.json({ answer }, { status: 200 });
```

### Supplier Review Enrichment Fallback
```ts
// Source: src/server/liteapi.ts
const enrichment = (reviews.length === 0 && (reviewScore === null || reviewCount === null))
  ? await fetchReviewEnrichmentFromRates(hotelId, currency)
  : null;
```

## State of the Art

| Old/Current in Repo | Current Recommended for Phase 3 | When to Shift | Impact |
|---------------------|----------------------------------|---------------|--------|
| Hotel detail has rich UI but partial explicit field contracts for policies/pros-cons | Contract-driven hotel content sections with explicit null/partial states | Start of HOTL-01 tasks | More truthful traveler evaluation and easier regression testing |
| Sticky booking sidebar is mostly summary + CTA anchor | Sidebar bound to selected room and cancellation context | HOTL-02 tasks | Better conversion confidence and fewer pricing/cancellation surprises |
| `/api/hotel-ai` is deterministic keyword logic | Keep grounding-first behavior, optionally extend with structured model output while preserving strict scope | HOTL-03 tasks | Better answer quality without hallucination risk |
| Wishlist is a standalone page | Workspace-oriented retrieval surface that still uses same backend contract | HOTL-04 tasks | Clearer account value loop and reuse of secure persistence path |

**Deprecated/outdated for this phase:**
- Treating `src/features/hotels/components/hotel-details-page.tsx` as active source of truth; active route uses `hotel-detail-experience.tsx`.

## Open Questions

1. **Workspace IA choice (`/wishlist` only vs `/account` workspace shell)**
   - What we know: HOTL-04 requires workspace retrieval; `/wishlist` already exists and is protected.
   - What's unclear: Whether planner should formalize an account workspace route now or keep wishlist as workspace MVP.
   - Recommendation: Default to extending `/wishlist` as Phase 3 workspace unless product direction explicitly requires multi-tab account IA.

2. **Source of cancellation policy richness in room cards**
   - What we know: Current rates mapping exposes `refundableTag` and optional first `cancelTime`.
   - What's unclear: Whether supplier payload has additional cancellation tiers/fees needed for HOTL-02 context depth.
   - Recommendation: Plan an early audit task on LiteAPI cancellation payload shape before final UI contract is frozen.

3. **AI implementation scope (rule-based vs model-assisted) for hotel page Q&A**
   - What we know: Current endpoint is grounded and safe but limited; `src/server/concierge.ts` already has model + schema patterns.
   - What's unclear: Required answer breadth to satisfy HOTL-03 acceptance.
   - Recommendation: Keep deterministic grounded baseline first; add model-assisted mode only behind strict schema and fallback checks if needed.

4. **Pros/cons presentation source of truth**
   - What we know: `getGuestReviews` currently composes comments from `pros`/`cons` when available.
   - What's unclear: Whether HOTL-01 expects aggregate pros/cons summary blocks or per-review formatting is sufficient.
   - Recommendation: Define acceptance text in planning: either review-level pros/cons satisfies requirement or add aggregate extraction.

## Sources

### Primary (HIGH confidence)
- `C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/.planning/ROADMAP.md` - phase goals, dependencies, success criteria.
- `C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/.planning/REQUIREMENTS.md` - HOTL-01..HOTL-04 requirement definitions.
- `C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/.planning/STATE.md` - sequencing and locked architectural direction.
- `C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/.planning/phases/02-search-and-discovery-experience/02-01-SUMMARY.md` - canonical URL query decisions.
- `C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/.planning/phases/02-search-and-discovery-experience/02-02-SUMMARY.md` - SSR destination route and SEO canonicalization patterns.
- `C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/.planning/phases/02-search-and-discovery-experience/02-03-SUMMARY.md` - degraded-state envelope and TTL policy.
- `C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/.planning/phases/01-platform-foundation-and-security/01-01-SUMMARY.md` - server-only supplier boundary + secret redaction.
- `C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/.planning/phases/01-platform-foundation-and-security/01-02-SUMMARY.md` - canonical schema/observability foundation.
- `C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/.planning/phases/01-platform-foundation-and-security/01-03-SUMMARY.md` - auth/RBAC posture.
- `C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/.planning/phases/01-platform-foundation-and-security/01-04-SUMMARY.md` - CSRF/rate-limit/validation chain.
- `C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/src/app/hotels/[hotelId]/page.tsx` - active hotel detail SSR entry.
- `C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/src/features/hotels/components/hotel-detail-experience.tsx` - active hotel detail UX and sticky booking card baseline.
- `C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/src/server/liteapi.ts` - supplier normalization and review/rates mapping.
- `C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/src/app/api/hotel-ai/route.ts` - current grounded AI endpoint behavior.
- `C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/src/app/api/wishlist/route.ts` - authenticated wishlist persistence contract.
- `C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/src/app/wishlist/page.tsx` - current workspace retrieval surface.
- `C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/src/shared/hooks/use-wishlist.ts` - client wishlist state contract.
- `C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/supabase/migrations/006_phase1_foundation.sql` - canonical `saved_hotels` schema and indexes.
- `C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/package.json` - dependency versions and stack lock.

### Secondary (MEDIUM confidence)
- https://nextjs.org/docs/app/getting-started/server-and-client-components - server/client boundary and bundle-size guidance (v16.1.6, updated 2026-02-20).
- https://supabase.com/docs/guides/database/postgres/row-level-security - RLS behavior and policy guidance.

### Tertiary (LOW confidence)
- OpenAI Responses API official reference could not be fetched due access restriction (HTTP 403) during this run; model-specific recommendations are based on current in-repo implementation patterns (`src/server/concierge.ts`).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - fully confirmed by `package.json` and active imports/routes.
- Architecture: MEDIUM-HIGH - strong evidence from current code and completed Phase 1/2 outputs; exact LiteAPI payload depth for cancellation/policy fields still needs targeted validation.
- Pitfalls: MEDIUM - grounded in observed code gaps and prior phase patterns, but some risk assumptions need confirmation during task-level spike work.

**Research date:** 2026-02-23
**Valid until:** 2026-03-25
