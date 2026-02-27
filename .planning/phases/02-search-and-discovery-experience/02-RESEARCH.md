# Phase 2: Search and Discovery Experience - Research

**Researched:** 2026-02-23
**Domain:** Next.js App Router SSR search UX, SEO crawlability, URL-state architecture, cache/degradation strategy
**Confidence:** MEDIUM-HIGH

## Summary

Phase 2 should be planned as a **URL-driven SSR search platform** rather than as a client-only listing page. The highest-leverage decision is to treat the URL as the single source of truth for destination, dates, guests, vibe, filters, sorting, and browse mode. This directly supports DISC-02/03/04 (crawlable SSR + stable filter/sort/grid-map state), and it reduces state bugs between mobile and desktop.

For performance and supplier resilience (DISC-05/06), use a **two-layer caching model**: Next.js Data Cache (`fetch` with `next.revalidate` in the 5-15 minute range) plus existing provider/app-level safeguards from Phase 1. Plan degraded behavior as a first-class product state (not just exception handling): stale-but-labeled results when possible, truthful outage messaging when not, and explicit telemetry tags for degraded responses.

SEO success hinges on rendering destination pages server-side with complete metadata and crawl-safe linking. Next.js supports this directly via App Router server rendering, `generateMetadata`, and dynamic routes. Keep streaming benefits, but plan status/robots behavior carefully for not-found and invalid routes.

**Primary recommendation:** Plan Phase 2 around a canonical SSR destination route with validated URL query schema, taggable TTL caching (300-900s), and explicit degraded-state UX contracts.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DISC-01 | Home search supports destination autocomplete, stay dates, guest selection, and natural-language vibe input | URL query schema + server-rendered destination route + client search controls bound to query params |
| DISC-02 | Search results pages are server-rendered and SEO-friendly for destination queries | Dynamic route segments + `generateMetadata` + crawl-safe links + canonical handling |
| DISC-03 | Search results support filters for price, star rating, amenities, property type, and distance from center | Typed filter schema in query params + server-side validation + deterministic serialization |
| DISC-04 | Search results support sorting by price, rating, and popularity with grid/map and pagination/infinite browsing | URL-driven sort/view/page state + SSR first page + progressive pagination/infinite strategy |
| DISC-05 | Supplier-backed search/rate responses use caching with 5-15 minute TTL and truthful degraded-state handling | Next.js `fetch` revalidation (300-900s), cache tags, stale-while-revalidate semantics, explicit degraded banners/messages |
| DISC-06 | Search and listing experiences are mobile-responsive and meet launch performance targets (Lighthouse 90+) | Server-first rendering, limited client bundle boundaries, streaming/loading states, Lighthouse CI/perf budgets |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router (existing project stack) | Keep existing pinned version | SSR route rendering, metadata, caching, streaming | Prior decisions require brownfield improvement inside existing stack |
| React Server + Client Components | Match existing stack | Server-first data fetch + client interactivity for filters/map | Minimizes JS shipped while preserving rich interactions |
| Next.js extended `fetch` + Data Cache | Built-in | TTL caching + request memoization + tag revalidation | Direct fit for DISC-05 without adding infra complexity |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `URLSearchParams` + Next `searchParams`/`useSearchParams` | Built-in | Canonical URL state for filters/sort/view/page | Always for search/discovery state management |
| Next Metadata API (`generateMetadata`) | Built-in | Destination-specific title/description/canonical/robots | On all SEO-targeted destination pages |
| `loading.tsx` + Suspense boundaries | Built-in | Fast perceived performance while results stream | Use on route-level and slow result subtrees |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| URL as single state source | Local-only client store for filters/sort | Faster local coding, but weaker deep-linking/SEO and higher state drift risk |
| Next built-in cache/revalidate | Custom cache service first | More control, but higher complexity and slower phase delivery |
| SSR-first destination pages | CSR-only result rendering | Simpler interactivity, but weak crawl/index behavior for DISC-02 |

**Installation:**
```bash
# No new baseline packages required; use existing Next.js stack.
```

## Architecture Patterns

### Recommended Project Structure
```
app/
├── (marketing)/page.tsx                  # Home search entry (DISC-01)
├── stays/[destination]/page.tsx          # SSR destination results (DISC-02)
├── stays/[destination]/loading.tsx       # Route-level streaming fallback
├── stays/[destination]/not-found.tsx     # Invalid destination handling
└── api/search/route.ts                   # Server search proxy/orchestration (if needed)

src/
├── search/schema.ts                      # Query param parser/validator/normalizer
├── search/serialize.ts                   # Stable query encode/decode helpers
├── search/data.ts                        # Supplier fetch + cache/degraded logic
├── search/seo.ts                         # Metadata + canonical helpers
└── search/ui/                            # Filter, sort, grid/map, pagination components
```

### Pattern 1: Canonical URL-State Contract
**What:** Define one typed query schema for all discovery controls (`checkin`, `checkout`, `guests`, `vibe`, filters, `sort`, `view`, `page`).
**When to use:** For all DISC-01/03/04 interactions and deep links.
**Example:**
```ts
// Source: https://nextjs.org/docs/app/api-reference/functions/use-search-params
// and https://nextjs.org/docs/app/api-reference/file-conventions/page
export type SearchQuery = {
  checkin?: string
  checkout?: string
  guests?: number
  vibe?: string
  minPrice?: number
  maxPrice?: number
  stars?: number[]
  amenities?: string[]
  propertyType?: string[]
  distanceKm?: number
  sort?: 'price' | 'rating' | 'popularity'
  view?: 'grid' | 'map'
  page?: number
}
```

### Pattern 2: SSR-First Destination Page, Client-Only Controls
**What:** Keep page/data fetch in Server Components; isolate only interactive widgets as Client Components.
**When to use:** Any results page that must be SEO-friendly and performant.
**Example:**
```tsx
// Source: https://nextjs.org/docs/app/getting-started/server-and-client-components
export default async function DestinationPage({ params, searchParams }) {
  const query = normalizeSearchQuery(searchParams)
  const results = await getSearchResults(params.destination, query)
  return <ResultsScreen initialResults={results} initialQuery={query} />
}
```

### Pattern 3: TTL Cache + Truthful Degraded Response Envelope
**What:** Return results with explicit `freshness` and `degraded` fields; do not mask partial outages.
**When to use:** All supplier-backed search/rate reads.
**Example:**
```ts
// Source: https://nextjs.org/docs/app/api-reference/functions/fetch
// and https://nextjs.org/docs/app/building-your-application/caching
const res = await fetch(url, { next: { revalidate: 600, tags: ['search', destination] } })
// UI contract includes: data, degraded:boolean, degradedReason, asOf
```

### Pattern 4: Crawlable Metadata per Destination
**What:** Generate destination-specific metadata server-side; ensure canonical consistency.
**When to use:** All SEO-entry search routes.
**Example:**
```ts
// Source: https://nextjs.org/docs/app/getting-started/metadata-and-og-images
export async function generateMetadata({ params }) {
  return {
    title: `Stays in ${params.destination}`,
    description: `Compare stays, filters, and map view for ${params.destination}.`,
  }
}
```

### Anti-Patterns to Avoid
- **Split-brain state:** Independent local filter state not reflected in URL.
- **CSR-only results route:** Reduces crawlability and weakens DISC-02.
- **Silent degradation:** Returning stale/partial data without visible user disclosure.
- **Over-broad `use client`:** Inflates JS bundle and hurts Lighthouse targets.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Route-level caching/revalidation | Custom cache invalidation engine first | Next.js Data Cache + `next.revalidate` + tags | Built-in handles common cache semantics with less risk |
| Query parsing/mutation conventions | Ad-hoc string concatenation in components | Centralized search query serializer/parser | Prevents inconsistent URLs and broken back/forward behavior |
| Streaming orchestration | Manual loading state protocol | `loading.tsx` + Suspense | Framework-native behavior with SEO-aware defaults |
| 404/indexability safeguards | Custom crawler branching logic | `notFound()` + segment `not-found.tsx` + metadata | Built-in noindex behavior for streamed not-found cases |

**Key insight:** Phase 2 risk is mostly coordination risk (state, cache, SEO correctness), not missing primitives. Built-in framework primitives should be composed, not replaced.

## Common Pitfalls

### Pitfall 1: URL State Drift Across Grid/Map/Filters
**What goes wrong:** Toggle state works in-session but breaks on refresh/share/back-button.
**Why it happens:** State partially kept in component state instead of URL schema.
**How to avoid:** Enforce one query schema and one serializer for all discovery controls.
**Warning signs:** QA finds different results after page reload or copied link.

### Pitfall 2: False "Fresh" Perception During Supplier Outage
**What goes wrong:** Users see old/partial prices without disclosure.
**Why it happens:** Cache fallback exists but UX/state model lacks degraded indicators.
**How to avoid:** Include `degraded` + `asOf` in data contract and render explicit banner/inline notices.
**Warning signs:** Support tickets on price mismatch; logs show upstream 5xx/timeouts with normal UI.

### Pitfall 3: Streaming + Status Code Confusion
**What goes wrong:** Not-found-like pages stream with 200 and get misinterpreted in analytics.
**Why it happens:** Streaming starts before not-found checks; status cannot change afterward.
**How to avoid:** Resolve destination validity before streaming boundary when true 404 is required.
**Warning signs:** Soft-404 reports or analytics anomalies on invalid destinations.

### Pitfall 4: Lighthouse Regressions from Over-Clientization
**What goes wrong:** Search page becomes interactive but performance score drops below 90.
**Why it happens:** Large client bundles and map logic loaded eagerly.
**How to avoid:** Keep SSR shell + progressively hydrate only interactive controls; defer heavy map modules.
**Warning signs:** Increased TBT/LCP after adding filters/map widgets.

## Code Examples

Verified patterns from official sources:

### Query-Driven Navigation Update
```tsx
// Source: https://nextjs.org/docs/app/api-reference/functions/use-search-params
'use client'
import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export function setSort(sort: 'price' | 'rating' | 'popularity') {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const nextQs = useCallback(() => {
    const p = new URLSearchParams(searchParams.toString())
    p.set('sort', sort)
    p.set('page', '1')
    return p.toString()
  }, [searchParams, sort])

  router.push(`${pathname}?${nextQs()}`)
}
```

### TTL-Cached Supplier Fetch
```ts
// Source: https://nextjs.org/docs/app/api-reference/functions/fetch
export async function getSearchResults(url: string) {
  const res = await fetch(url, { next: { revalidate: 900, tags: ['search'] } })
  if (!res.ok) throw new Error('SUPPLIER_UNAVAILABLE')
  return res.json()
}
```

### Destination Metadata
```ts
// Source: https://nextjs.org/docs/app/getting-started/metadata-and-og-images
export async function generateMetadata({ params }) {
  return {
    title: `Hostels in ${params.destination}`,
    description: `Search hostels in ${params.destination} by dates, guests, and vibe.`,
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CSR-heavy search pages with client data fetch | Server-first App Router rendering with selective client interactivity | Next.js App Router era | Better SEO, lower JS payload, improved first render |
| App-level custom cache layers for basic TTL | Framework-level fetch cache + revalidate/tags | Next.js App Router caching model | Faster delivery, fewer cache consistency bugs |
| Hidden fallback on upstream failure | Explicit degraded-state UX contract | Reliability-focused product patterns | Better user trust and supportability |

**Deprecated/outdated:**
- `dynamic = 'force-dynamic'` as primary lever for dynamic rendering when request-coupled rendering is needed; current guidance prefers `connection()` semantics in App Router docs.

## Open Questions

1. **Exact destination URL taxonomy (city slug only vs city+country vs geo-id)**
   - What we know: DISC-02 requires crawlable destination routes.
   - What's unclear: Final canonical route shape and redirect rules.
   - Recommendation: Decide canonical slug strategy before plan/task breakdown; this affects SEO, pagination URLs, and cache keys.

2. **Map provider and map payload strategy in existing stack**
   - What we know: DISC-04 requires grid/map mode parity.
   - What's unclear: Existing map dependency footprint and mobile performance cost.
   - Recommendation: Treat map as progressively loaded client island; define desktop/mobile fallback if map JS exceeds budget.

3. **Supplier failure taxonomy for user-facing degraded messages**
   - What we know: DISC-05 requires truthful degraded handling.
   - What's unclear: Which upstream failures become stale fallback vs hard error UX.
   - Recommendation: Define a small error contract (`timeout`, `partial`, `unavailable`) before implementation tasks.

## Sources

### Primary (HIGH confidence)
- https://nextjs.org/docs/app/building-your-application/caching - caching model, `revalidate`, tags, dynamic/static behavior (doc v16.1.6, updated 2026-02-20)
- https://nextjs.org/docs/app/api-reference/functions/fetch - server `fetch` cache semantics and options (doc v16.1.6, updated 2026-02-20)
- https://nextjs.org/docs/app/api-reference/functions/use-search-params - query-string state handling and SSR/CSR caveats (doc v16.1.6, updated 2026-02-20)
- https://nextjs.org/docs/app/getting-started/metadata-and-og-images - metadata APIs and crawler behavior (doc v16.1.6, updated 2026-02-20)
- https://nextjs.org/docs/app/api-reference/file-conventions/loading - streaming/loading SEO and status nuances (doc v16.1.6, updated 2026-02-20)
- https://nextjs.org/docs/app/api-reference/functions/not-found - not-found behavior and injected noindex semantics (doc v16.1.6, updated 2026-02-20)
- https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes - destination route patterning for SSR pages (doc v16.1.6, updated 2026-02-20)

### Secondary (MEDIUM confidence)
- https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics - Googlebot rendering/indexing behavior and JS SEO practices (updated 2025-12-18)
- https://developer.chrome.com/docs/lighthouse/overview - Lighthouse usage and CI integration context (updated 2025-06-02)
- https://web.dev/articles/lcp - LCP thresholds and measurement guidance (updated 2025-09-04)

### Tertiary (LOW confidence)
- https://web.dev/articles/stale-while-revalidate - SWR caching concept for freshness tradeoffs (older article, 2019)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - grounded in roadmap/prior decision to keep existing stack + official Next.js docs.
- Architecture: MEDIUM-HIGH - strong framework guidance, but repo-specific constraints (exact current map/search modules) are not yet validated.
- Pitfalls: MEDIUM - based on official behavior plus common production failure patterns; needs project-specific verification during planning.

**Research date:** 2026-02-23
**Valid until:** 2026-03-25
