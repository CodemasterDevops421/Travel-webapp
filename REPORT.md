# TravelForge Audit Report (Re-Audit)

Date: February 13, 2026
Auditor: Codex (Principal Engineer / Release Auditor)
Scope: End-to-end repository verification against TravelForge LiteAPI + Next.js 15 plan and system prompt v2.

## Executive Summary

| Category | Verdict | Notes |
|---|---|---|
| A) Stack & Project Setup | ⚠️ Partial | Core stack mostly present; shadcn/Radix usage shallow; legacy Express app still coexists. |
| B) Security Boundaries | ⚠️ Partial | LiteAPI server-side boundary is mostly correct in Next app, but legacy runtime, weak fallback secret, and PII/session risks remain. |
| C) Booking Flow Correctness | ⚠️ Partial | Prebook/book/webhook path exists and works; price authority and quote integrity model still weak for production trust. |
| D) Caching & Performance | ❌ Fail | Key hotel details/rates/search calls use `no-store`; TTL policy not aligned; missing granular Next caching strategy. |
| E) State Management Rules | ✅ Pass (with caveats) | TanStack Query for remote, Zustand for UI-only mood state; mutations via route handlers. |
| F) SEO & Accessibility | ❌ Fail | No JSON-LD/canonical/robots/sitemap/noindex strategy; accessibility is better but still incomplete on form semantics and keyboard flow. |
| G) Observability & Ops | ⚠️ Partial | Sentry init files exist; no funnel analytics, weak correlation propagation, webhook replay protections missing. |
| H) Repo Architecture | ⚠️ Partial | Good `src/features/*` direction for search/booking; missing auth feature folder and legacy `server.js` splits architecture. |

**Ship Readiness:** **NO-GO for production launch**. This is a strong beta/staging candidate, not a production-grade OTA yet.

## Implemented / Partial / Missing Matrix

| Requirement | Status | Evidence | Gap |
|---|---|---|---|
| Next.js 15 App Router + strict TS | ✅ | `package.json:29`, `tsconfig.json:11`, `src/app/*` | None significant. |
| Tailwind + Framer Motion | ✅ | `tailwind.config.ts:1`, `src/features/search/components/hero-search.tsx:5` | None significant. |
| shadcn/ui + Radix | ⚠️ | Custom UI primitives in `src/components/ui/button.tsx:1`; Radix only icons (`package.json:16`) | No real Radix primitives usage; no clear shadcn scaffold/components set. |
| TanStack Query v5 + Zustand | ✅ | `package.json:20`, `package.json:38`, hooks/store in `src/features/search/*` | Zustand usage currently minimal (fine). |
| Zod + React Hook Form | ✅ | `src/features/booking/components/booking-console.tsx:4-6`, route schemas | Good coverage on API inputs. |
| Supabase + Upstash | ✅ | `src/server/booking/repository.ts:18`, `src/server/cache.ts:5`, `src/server/ratelimit.ts:6` | Need stronger schema/index/RLS ops hardening. |
| `liteapi-node-sdk` server-side | ✅ | `src/server/liteapi.ts:2`, used in server module only | Partial REST fallbacks via raw `fetch` are okay. |
| Sentry client+server | ⚠️ | `sentry.client.config.ts:1`, `sentry.server.config.ts:1`, `sentry.edge.config.ts:1` | No richer context/tags/release/env integration verified. |
| Structured logging (pino) | ✅ | `src/server/logger.ts:1` | Correlation not propagated end-to-end. |
| `.env.example` hygiene | ⚠️ | `.env.example` includes placeholders only | Contains legacy + unused variables; can confuse runtime contracts. |
| Security boundary: no secrets client-side | ✅ | `src/shared/env.public.ts:3-7` exposes only public vars | Legacy app path still exists; deployment ambiguity risk. |
| LiteAPI only on server | ✅ | LiteAPI calls in `src/server/liteapi.ts`, API routes | No direct client LiteAPI fetch found. |
| Rate limiting on search/prebook/book | ⚠️ | Applied in `src/app/api/autocomplete/route.ts:34`, `property-preview:23`, `prebook:36`, `book:38` | Missing webhook and hotel detail/rates path limits; client-IP derivation weak. |
| Security headers | ⚠️ | `next.config.mjs:2-11` | CSP uses `'unsafe-inline'`; no middleware-level dynamic controls. |
| Zod validation on external input | ⚠️ | API routes validate inputs | URL params in pages (`/hotels/[hotelId]`) are not schema-validated before usage. |
| Booking flow scaffold end-to-end | ⚠️ | Search → details/rates → prebook → payment widget → book → webhook + persist exists | Quote authority and payment flow hardening incomplete; Stripe-specific path unclear. |
| Prebook uses `usePaymentSdk: true` | ✅ | `src/server/liteapi.ts:191` | None. |
| Prebook handles `transactionId` + `secretKey` | ✅ | `src/server/liteapi.ts:202`, `src/app/api/booking/prebook/route.ts:72-80` | None. |
| Quote signature persisted prebook→book | ✅ | `src/server/pricing.ts:22`, `src/app/api/booking/book/route.ts:43-56` | Signature does not prove supplier-authoritative amount. |
| Markup once server-side | ⚠️ | `src/server/pricing.ts:35-48` | Base amount originates from client input (`prebook` payload), so trust model is weak. |
| Caching policy alignment | ❌ | `src/server/liteapi.ts` uses `cache: 'no-store'` for details/rates/search | Missing required TTLs for details/rates/search policy. |
| SEO fundamentals (JSON-LD/canonical/robots) | ❌ | No `robots.ts`, `sitemap.ts`, JSON-LD implementation found | Critical SEO readiness gap. |
| Funnel analytics events | ❌ | No search for funnel event names in src | Missing conversion instrumentation. |
| Webhook signature validation | ✅ | `src/app/api/webhooks/liteapi/route.ts:19-39` | No replay/timestamp protection. |
| Feature-based architecture | ⚠️ | `src/features/search/*`, `src/features/booking/*`, `src/shared/*`, `src/server/*` | `src/features/hotels/*`, `src/features/auth/*` missing; legacy `server.js` breaks boundary clarity. |

## Repo Map

### Key Directories
- `src/app/*` (App Router pages + route handlers)
- `src/features/search/*`
- `src/features/booking/*`
- `src/components/*` (providers, home blocks, UI)
- `src/server/*` (env, LiteAPI, cache, ratelimit, logging, booking persistence)
- `src/shared/*` (public env + utilities)
- `tests/*` (Vitest route/unit tests)
- `supabase/schema.sql` (DB tables)
- `server.js`, `views/*`, `public/*` (legacy Express app)

### Main Entry Pages
- `src/app/page.tsx`
- `src/app/hotels/[hotelId]/page.tsx`
- `src/app/booking/page.tsx`
- `src/app/booking/return/page.tsx`
- `src/app/bookings/[bookingId]/page.tsx`

### Route Handlers
- `src/app/api/autocomplete/route.ts`
- `src/app/api/property-preview/route.ts`
- `src/app/api/booking/prebook/route.ts`
- `src/app/api/booking/book/route.ts`
- `src/app/api/webhooks/liteapi/route.ts`

### Server Actions
- None found.

### Shared Utilities / Providers
- Query provider: `src/components/providers/query-provider.tsx`
- Theme provider: `src/components/providers/theme-provider.tsx`
- Cache helpers: `src/server/cache.ts`
- Pricing/signature helpers: `src/server/pricing.ts`

## Architecture & Code Quality Findings

1. **Dual runtime architecture remains (Next + legacy Express), creating deployment ambiguity and drift risk.**
   - Evidence: `server.js:1-372` plus App Router in `src/app/*`.
   - Impact: inconsistent behavior, duplicated flows, security posture split.

2. **Legacy fallback secret is unsafe for production if that runtime is ever started.**
   - Evidence: `server.js:37` (`'change-me-now'`).
   - Impact: session compromise risk.

3. **Feature boundaries are incomplete against target architecture.**
   - Evidence: no `src/features/hotels/*` or `src/features/auth/*`; hotel logic sits in page layer (`src/app/hotels/[hotelId]/page.tsx:24-151`).

4. **Type/test setup has leftovers from old stack.**
   - Evidence: `tests/app.test.js` (Express) is excluded by Vitest include (`vitest.config.ts:12`).
   - Impact: stale tests can mislead confidence.

## Security & Compliance Findings

1. **Webhook verification lacks replay defense (timestamp/nonce).**
   - Evidence: `src/app/api/webhooks/liteapi/route.ts:19-39` only static HMAC check.

2. **PII is persisted client-side during payment return handoff.**
   - Evidence: holder + guest data stored in `localStorage` at `src/features/booking/components/booking-console.tsx:183`; read in `src/app/booking/return/booking-return-client.tsx:56-67`.
   - Impact: XSS blast radius and shared-device data exposure.

3. **Rate-limit identity source is weak/spoofable and may collapse to shared `anonymous`.**
   - Evidence: `request.headers.get('x-forwarded-for') ?? 'anonymous'` in `prebook:35`, `book:37`, `autocomplete:33`, `property-preview:22`.

4. **CSP is permissive (`unsafe-inline`) and broad `connect-src https:`.**
   - Evidence: `next.config.mjs:10`.

5. **Good:** LiteAPI key is server-only in Next path.
   - Evidence: server calls in `src/server/liteapi.ts`; public env excludes private keys (`src/shared/env.public.ts:3-13`).

## Performance & Caching Findings

1. **Core supplier calls are explicitly `no-store`; this violates intended caching policy.**
   - Evidence: `src/server/liteapi.ts:118`, `150`, `193`, `243`, `261`, `309`.

2. **TTL policy mismatch:**
   - Property preview uses 300s (`src/app/api/property-preview/route.ts:25`), exceeding target 60–120s search window.
   - No 30–60s rates cache path.
   - No 6–24h hotel details cache.

3. **Positive:** static home enrichment uses Next cache correctly.
   - Evidence: `src/components/home/trending-destinations.tsx:11-13`.

4. **Bundle is acceptable right now but homepage JS is already non-trivial.**
   - Evidence: build output showed `/` first-load ~162kB.

## Booking Flow Correctness Findings

1. **Flow exists end-to-end with prebook/payment/book/webhook/persistence.**
   - Evidence: `prebook route`, `booking console`, `return client`, `book route`, `webhook route`, `repository`.

2. **Prebook SDK mode is correctly set.**
   - Evidence: `src/server/liteapi.ts:191`.

3. **Critical trust gap: displayed payable amount is client-influenced before signing.**
   - Evidence: client sends `amount` in prebook (`src/features/booking/components/booking-console.tsx:141`), server signs that amount (`src/app/api/booking/prebook/route.ts:43-48`).
   - Impact: quote signature protects tampering after prebook, but does not guarantee supplier-authoritative amount was used.

4. **Price UI claim “includes taxes/fees” may not be fully authoritative in all paths.**
   - Evidence: UI label in `src/app/hotels/[hotelId]/page.tsx:131`; mapping logic depends on first total entry only (`src/server/liteapi.ts:324-337`).

5. **Webhook status persistence is implemented (good progress).**
   - Evidence: `src/app/api/webhooks/liteapi/route.ts:60-72`, repository update methods.

## SEO & Accessibility Findings

1. **Missing foundational SEO artifacts.**
   - Evidence: no `robots`, `sitemap`, canonical strategy files in `src/app`; metadata is minimal only (`src/app/layout.tsx:19-22`).

2. **No JSON-LD for Hotel/Offer/Booking confirmation.**
   - Evidence: none found in `src/app/hotels/[hotelId]/page.tsx`, `src/app/bookings/[bookingId]/page.tsx`.

3. **Parameter-indexing controls are missing (risk of crawl spam).**
   - Evidence: dynamic query usage in `/booking` and `/hotels/[hotelId]`, no noindex logic.

4. **A11y is improved but incomplete.**
   - Good focus styles in `src/components/ui/button.tsx:6` and `src/components/ui/input.tsx:9`.
   - Missing explicit `<label htmlFor>` linkage and richer error semantics in booking form (`src/features/booking/components/booking-console.tsx:227-276`).

## Observability & Ops Readiness Findings

1. **Sentry init exists on client/server/edge.**
   - Evidence: `sentry.client.config.ts:1-6`, `sentry.server.config.ts:1-6`, `sentry.edge.config.ts:1-6`.

2. **No funnel analytics events (`search_started`, `results_loaded`, etc.).**
   - Evidence: no matching event instrumentation in `src/*`.

3. **Correlation IDs are not propagated through full booking pipeline.**
   - Evidence: webhook logs correlation (`src/app/api/webhooks/liteapi/route.ts:48`), but prebook/book do not log/request-bind correlation IDs.

4. **CI is healthy and complete for core gates.**
   - Evidence: `.github/workflows/ci.yml:25-35` runs lint, typecheck, test, build.

## Test Coverage & CI Readiness Findings

1. **Good:** route tests now cover prebook/book/webhook happy/error paths.
   - Evidence: `tests/booking-routes.test.ts`.

2. **Gap:** no integration tests against real Supabase tables or replay/idempotency webhook behavior.

3. **Gap:** no UI E2E for search → rate select → payment return → confirmation path.

4. **Gap:** stale Express test exists but is excluded.
   - Evidence: `tests/app.test.js` vs `vitest.config.ts:12`.

## Top 10 Launch-Blocking/High-Impact Issues

1. `P0` Dual runtime still present (Next + legacy Express) causes production drift and security split.
   - Files: `server.js`, `public/app.js`, `views/*`.

2. `P0` Supplier pricing trust model is weak because quote source amount is client-provided before signing.
   - Files: `src/features/booking/components/booking-console.tsx:141`, `src/app/api/booking/prebook/route.ts:43-48`.

3. `P0` Missing replay protection for webhook signature validation.
   - File: `src/app/api/webhooks/liteapi/route.ts`.

4. `P0` SEO baseline absent (no robots/sitemap/canonical/JSON-LD), reducing discoverability and trust.
   - Files: `src/app/layout.tsx`, missing `src/app/robots.ts`, missing `src/app/sitemap.ts`, hotel/booking pages.

5. `P1` Core details/rates/search caching policy not implemented; many supplier calls forced `no-store`.
   - File: `src/server/liteapi.ts`.

6. `P1` CSP too permissive for production (`unsafe-inline`).
   - File: `next.config.mjs:10`.

7. `P1` Client-side storage of PII in localStorage during checkout handoff.
   - Files: `src/features/booking/components/booking-console.tsx:183`, `src/app/booking/return/booking-return-client.tsx:56`.

8. `P1` Missing analytics funnel events; conversion blind spots.
   - Files: `src/features/search/components/hero-search.tsx`, `src/features/booking/components/booking-console.tsx`, API routes.

9. `P2` Architecture not fully aligned with feature modules (`hotels/auth` feature folders absent).
   - Files: `src/app/hotels/[hotelId]/page.tsx`, repo structure.

10. `P2` Test suite lacks E2E and real DB integration coverage for booking reliability.
   - Files: `tests/*`, CI workflow.

## Final Ship Readiness Verdict

**Not production-grade yet.**

Current app is **functionally promising** and now has a credible booking skeleton with server-side LiteAPI integration, signed quotes, webhook signature checks, persistence, and CI gates. However, it still fails key production criteria for a high-trust OTA: authoritative price integrity, hardened webhook defenses, mature caching policy, complete SEO baseline, and architecture consolidation.

## Prioritized Fix Plan (P0/P1/P2)

### P0 (Must fix before any launch)

1. **Retire or isolate legacy Express runtime.**
   - Targets: `server.js`, `public/app.js`, `views/*`, `tests/app.test.js`.
   - Approach: remove from runtime/deploy artifact; keep only Next.js app entrypoints.

2. **Make server the sole price authority for prebook inputs.**
   - Targets: `src/app/api/booking/prebook/route.ts`, `src/server/liteapi.ts`, `src/app/hotels/[hotelId]/page.tsx`, `src/features/booking/components/booking-console.tsx`.
   - Approach: prebook should accept `offerId`/selection identifiers only; server resolves final amount from supplier rate payload and signs that.

3. **Add webhook replay/idempotency protections.**
   - Targets: `src/app/api/webhooks/liteapi/route.ts`, `supabase/schema.sql`, `src/server/booking/repository.ts`.
   - Approach: require event timestamp + id; reject old/replayed events; store processed event IDs with unique constraint.

4. **Implement SEO baseline primitives.**
   - Targets: `src/app/layout.tsx`, new `src/app/robots.ts`, new `src/app/sitemap.ts`, `src/app/hotels/[hotelId]/page.tsx`.
   - Approach: canonical strategy, robots rules for parameter pages, JSON-LD for hotel/offer.

### P1 (Should fix before beta)

1. **Implement required caching TTL policy by endpoint type.**
   - Targets: `src/server/liteapi.ts`, `src/server/cache.ts`, route handlers.
   - Approach: details 6–24h, rates 30–60s, search 60–120s using Redis + `unstable_cache` where suitable.

2. **Tighten CSP and remove unnecessary inline allowances.**
   - Target: `next.config.mjs`.
   - Approach: nonce/hash-based script strategy and explicit host allowlist.

3. **Remove PII from browser storage.**
   - Targets: `src/features/booking/components/booking-console.tsx`, `src/app/booking/return/booking-return-client.tsx`, `src/server/booking-store.ts`.
   - Approach: store checkout context server-side keyed by opaque token.

4. **Add booking funnel analytics + correlation propagation.**
   - Targets: search/booking UI and API handlers.
   - Approach: emit required funnel events and pass request IDs through prebook/book/webhook logs.

### P2 (Polish / scale)

1. **Refactor into complete feature modules (`hotels`, `auth`).**
   - Targets: new `src/features/hotels/*`, `src/features/auth/*`, thinner page files.

2. **Upgrade accessibility semantics for forms and errors.**
   - Target: `src/features/booking/components/booking-console.tsx`.

3. **Add E2E and DB integration tests.**
   - Targets: `tests/*`, CI pipeline.
   - Approach: Playwright + seeded Supabase test project.

4. **Clean stale dependency/test drift.**
   - Targets: `package.json`, `tests/app.test.js`, docs.

