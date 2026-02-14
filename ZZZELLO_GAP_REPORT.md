# ZZZello Parity Gap Report (DevTools MCP + Code Audit)

Date: 2026-02-13

## Scope
Compared your app against `https://www.zzzello.com/?language=en&currency=INR` using Chrome DevTools MCP (screens, network, runtime modules) and mapped gaps to current Next.js code.

## Evidence Snapshot
- ZZZello routes/modules observed via network/bundle: `/`, `/hotels`, `/hotels/:id`, `/booking`, `HotelsListLayoutList`, `NewHotelCard`, `Checkout`, `Confirmation`, `CancellationPolicies` (from `main--gXQN3W6.js` and loaded chunks).
- ZZZello home/list behavior observed: photo-first cards, rating + review count on cards, language/currency URL params, dedicated hotels listing modules and filters endpoint (`/v1/hotels/filters?language=en`).
- Your app verified from code and build/test:
  - Build passes (`npm run build`)
  - Tests pass (`34/34`)

## Parity Status
| Area | Status | Notes |
|---|---|---|
| Home destination/date/adults search | ✅ | Implemented in `src/features/search/components/hero-search.tsx:149` |
| Home language/currency chooser UI | ✅ | Present at `src/app/page.tsx:35`, `src/components/home/language-currency-chooser.tsx:35` |
| Hotel cards with image + rating + price | ✅ | `src/features/search/components/search-results-page.tsx:132` and `src/features/search/components/hero-search.tsx:290` |
| Whole-card click to open details | ✅ | Cards are `<Link>` wrappers (`src/features/search/components/search-results-page.tsx:133`, `src/features/search/components/hero-search.tsx:291`) |
| Rich hotel detail page sections | ✅ | Tabs + overview/facilities/rooms/reviews/description in `src/features/hotels/components/hotel-detail-experience.tsx:16` |
| Reviews consistently populated | ⚠️ | UI exists, but backend data source is often sparse (`src/server/liteapi.ts:717`) |
| Listing-page depth comparable to zzzello | ⚠️ | You have `/search`, not a full `/hotels` productized list experience |
| Language/currency end-to-end behavior | ❌ | UI state is local only, not fully propagated through API requests/URLs |
| Booking payment reliability | ⚠️ | Prebook + widget exists, but some flow weaknesses remain |

## Critical Gaps (What’s Missing vs ZZZello)

### P0
1. Language selection is mostly cosmetic, not an end-to-end search/data input.
- `language` is stored in Zustand/localStorage but not sent in search/property APIs.
- Files: `src/features/search/stores/search-ui-store.ts:5`, `src/features/search/hooks/use-property-preview.ts:27`, `src/app/api/property-preview/route.ts:10`, `src/app/api/autocomplete/route.ts:12`

2. Guest occupancy is incorrect at prebook time (hardcoded adults=2).
- This can create price/policy mismatch vs selected party size.
- File: `src/features/booking/components/booking-console.tsx:171`

3. Booking return depends on sessionStorage-only write path.
- Read supports localStorage fallback, but write only uses `sessionStorage`; cross-tab/redirect edge cases can fail finalization.
- Files: `src/features/booking/components/booking-console.tsx:72`, `src/app/booking/return/booking-return-client.tsx:27`

4. Search/rates fetches are forced `no-store` broadly, reducing cache efficiency and perceived speed vs zzzello.
- Files: `src/server/liteapi.ts:416`, `src/server/liteapi.ts:724`, `src/server/liteapi.ts:799`

### P1
5. Hotels listing page depth is weaker than zzzello’s dedicated `/hotels` experience.
- You have filtering/sorting in client, but not the same structured listing architecture (list/map layout system, richer listing filters, paging behavior).
- Files: `src/app/search/page.tsx:33`, `src/features/search/components/search-results-page.tsx:73`

6. Reviews often appear “missing” because details are sourced from one endpoint without review-enrichment fallback.
- UI supports reviews, but data source may not include enough review objects for many properties.
- Files: `src/server/liteapi.ts:717`, `src/features/hotels/components/hotel-detail-experience.tsx:246`

7. Language/currency controls appear only on home, not consistently persistent in top nav across search/details/booking.
- Files: `src/app/page.tsx:35`, `src/app/search/page.tsx:33`, `src/app/hotels/[hotelId]/page.tsx:42`, `src/app/booking/page.tsx:41`

8. Search/list cards still include CTA text, while your desired UX is “click anywhere.”
- Card is clickable already, but CTA text invites button-style interaction (minor UX mismatch).
- Files: `src/features/search/components/search-results-page.tsx:162`, `src/features/search/components/hero-search.tsx:335`

### P2
9. Branded copy still emphasizes internal payment stack language in some checkout messaging.
- You asked for no provider mention on-site; code is mostly neutral now, but ensure no provider naming leaks in future copy.
- File: `src/app/booking/page.tsx:46`

10. Visual polish gap remains vs zzzello’s denser card rhythm and compact information hierarchy.
- Layout foundation is solid but still less “classic OTA” dense in list/info density.
- Files: `src/features/search/components/search-results-page.tsx:64`, `src/features/hotels/components/hotel-detail-experience.tsx:87`

## What Is Already Correct (Do Not Regress)
- Whole hotel card click behavior is implemented.
- Date/adults/rooms controls exist in home search.
- Detail page has tabs, facilities, room offers, reviews section, and ask-AI section.
- Payment CSP already allows external payment script: `next.config.mjs:10`.

## Fastest Path To ZZZello-Like Parity
1. Wire `language` and `currency` end-to-end in every read path (query params, API validation, server calls, cache keys).
2. Fix occupancy payload in prebook to match selected adults/rooms.
3. Persist checkout session in both `sessionStorage` and `localStorage`; clear both on completion.
4. Add review-enrichment fallback API path when hotel detail lacks `reviews`/`reviewBreakdown`.
5. Build a first-class `/hotels` listing route with consistent top toolbar (language/currency + dates/guests + filters + map/list).
6. Keep full-card click, remove redundant CTA wording, tighten card information density.

