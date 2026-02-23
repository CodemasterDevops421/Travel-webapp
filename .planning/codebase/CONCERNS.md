# Codebase Concerns

**Analysis Date:** 2026-02-23

## Tech Debt

**LiteAPI integration module (`src/server/liteapi.ts`):**
- Issue: The file combines transport concerns, caching, mapping, fallback data, and domain orchestration in a single 1188-line module.
- Files: `src/server/liteapi.ts`
- Impact: Changes are high-risk, merge conflicts are frequent, and regressions are hard to isolate because unrelated responsibilities are tightly coupled.
- Fix approach: Split into focused modules (`client`, `mappers`, `search`, `booking`, `reviews`) and keep route handlers dependent on stable service interfaces.

**Persistence fallback strategy spread across memory maps:**
- Issue: Multiple server paths silently switch to in-memory fallback stores when Redis/Supabase are unavailable.
- Files: `src/server/booking/repository.ts`, `src/server/booking-store.ts`, `src/server/booking-idempotency.ts`, `src/server/webhook-idempotency.ts`, `src/server/analytics-repository.ts`
- Impact: Data durability depends on process lifetime and single-instance behavior; restart or horizontal scaling can lose state and produce inconsistent booking outcomes.
- Fix approach: Route all critical booking and webhook state through durable storage only in production, and gate fallback mode to local/test environments.

**Implicitly optional API authorization secret:**
- Issue: Booking API auth is disabled when `BOOKING_API_AUTH_SECRET` is unset.
- Files: `src/server/authz.ts`, `src/app/api/bookings/route.ts`, `src/app/api/bookings/[bookingId]/route.ts`, `src/server/env.ts`
- Impact: Deployments missing this env variable expose booking read/cancel endpoints to unauthenticated callers.
- Fix approach: Enforce secret presence in production boot checks and fail closed in `assertBookingApiAuthorized` when running production.

## Known Bugs

**Admin revenue calculation reads wrong metadata path:**
- Symptoms: `/admin` shows `totalRevenue` as `0` or under-reported despite completed bookings.
- Files: `src/app/api/admin/stats/route.ts`, `src/app/api/booking/book/route.ts`
- Trigger: Revenue aggregator checks `metadata.totalAmount`, but booking writes amount at `metadata.itinerary.totalAmount`.
- Workaround: Query and sum `metadata->itinerary->totalAmount` directly until route logic is corrected.

**Debug logging left in production UI path:**
- Symptoms: Browser console receives noisy click logs from the search bar container.
- Files: `src/features/search/components/hero-search-bar.tsx`
- Trigger: Clicking the search container executes `console.log('MOTION DIV CLICKED')`.
- Workaround: Remove the handler or guard debug logs behind a development flag.

## Security Considerations

**Admin endpoint lacks role/claim authorization:**
- Risk: Any authenticated user can access admin stats and booking metadata.
- Files: `src/app/api/admin/stats/route.ts`, `src/app/admin/page.tsx`, `src/server/supabase/server.ts`
- Current mitigation: Session presence is checked with `supabase.auth.getUser()`.
- Recommendations: Require an explicit admin claim/role check before returning admin data.

**CSRF protection helper exists but is not enforced:**
- Risk: Cookie-authenticated write endpoints rely on auth state only and do not verify same-origin requests.
- Files: `src/server/csrf.ts`, `src/app/api/wishlist/route.ts`, `src/app/api/promo/validate/route.ts`
- Current mitigation: None detected at route level.
- Recommendations: Apply `assertSameOrigin` (or CSRF token checks) to state-changing cookie-authenticated endpoints.

**Client IP trust model allows spoofed rate-limit keys:**
- Risk: Attackers can manipulate `x-real-ip`/`x-forwarded-for` and evade per-IP rate limits.
- Files: `src/server/request.ts`, `src/server/ratelimit.ts`
- Current mitigation: Rate-limiting is applied, but key identity is header-derived and untrusted.
- Recommendations: Use trusted proxy headers only from known infrastructure or fallback to platform-provided source IP metadata.

**Checkout session payload stored in browser storage:**
- Risk: PII (`holder.email`) and booking signatures are persisted in `sessionStorage` and `localStorage`.
- Files: `src/features/booking/components/booking-console.tsx`, `src/app/booking/return/booking-return-client.tsx`
- Current mitigation: Payload is cleared after successful finalize flow.
- Recommendations: Store an opaque server session reference instead of full checkout payload in browser storage.

## Performance Bottlenecks

**Admin stats revenue query scans full bookings metadata:**
- Problem: Revenue aggregation iterates over all rows from `bookings` to compute totals on each request.
- Files: `src/app/api/admin/stats/route.ts`
- Cause: Application-level sum on `metadata` rather than indexed/materialized aggregate.
- Improvement path: Use SQL aggregation/materialized views and restrict fetched columns/rows.

**Search preview performs multiple sequential network fallbacks:**
- Problem: Property preview can chain several upstream calls before returning fallback data.
- Files: `src/server/liteapi.ts`, `src/app/api/property-preview/route.ts`
- Cause: Sequential strategy (`placeId` -> `cityName` -> `aiSearch` -> legacy fallback calls) increases worst-case latency.
- Improvement path: Short-circuit earlier, cap retries/fallback stages, and parallelize safe branches where possible.

**Cache helper has no Redis error isolation:**
- Problem: Redis outages can propagate as request failures instead of degrading to direct fetch.
- Files: `src/server/cache.ts`, `src/app/api/autocomplete/route.ts`, `src/app/api/property-preview/route.ts`, `src/app/api/hotels/rates/route.ts`, `src/app/api/hotels/[hotelId]/route.ts`
- Cause: `getOrSetRedisCache` has no `try/catch` around `redis.get`/`redis.set`.
- Improvement path: Add fallback behavior on Redis exceptions and emit structured degraded-mode logs.

## Fragile Areas

**Fallback event cache without eviction:**
- Files: `src/server/analytics-repository.ts`
- Why fragile: `fallbackEvents` grows unbounded with no TTL or cleanup path.
- Safe modification: Introduce capped size/TTL eviction and metrics to monitor fallback growth.
- Test coverage: No dedicated tests for fallback memory growth behavior.

**Booking fallback quote/booking maps without lifecycle cleanup:**
- Files: `src/server/booking/repository.ts`
- Why fragile: `fallbackQuotes` and `fallbackBookings` persist for process lifetime and can diverge from durable state.
- Safe modification: Add TTL cleanup and explicit persistence mode boundaries.
- Test coverage: `tests/booking-repository.test.ts` validates fallback activation, but not long-run memory behavior.

**Client auth hook recreates Supabase client per render:**
- Files: `src/shared/hooks/use-auth.ts`, `src/server/supabase/client.ts`
- Why fragile: New client instances can cause repeated subscriptions/effects and subtle auth state race behavior.
- Safe modification: Memoize a singleton client in hook/module scope and keep stable effect dependencies.
- Test coverage: No tests for repeated render/subscription behavior.

## Scaling Limits

**Rate-limiting fallback is process-local:**
- Current capacity: 30 requests/minute per key within a single process.
- Limit: Multi-instance deployments do not share `inMemory` counters.
- Scaling path: Require Upstash Redis in production and disable process-local fallback for internet-facing environments.

**Idempotency and booking session fallbacks are instance-bound:**
- Current capacity: Map-backed storage for prebook sessions and finalize locks per process.
- Limit: Concurrent requests routed to different instances can bypass lock/idempotency guarantees.
- Scaling path: Keep lock and result persistence in shared Redis only for production traffic.

**Repository growth risk from backup dependency directory:**
- Current capacity: Additional local dependency tree present at `node_modules.bak.1770961141/`.
- Limit: Increases disk usage, scan time, and accidental inclusion risk in tooling/archival workflows.
- Scaling path: Remove backup dependency directories from workspace and enforce ignore/cleanup rules.

## Dependencies at Risk

**`liteapi-node-sdk` integration surface mismatch:**
- Risk: Client initialization uses type cast `as never`, indicating type contract mismatch.
- Impact: SDK updates can break behavior without compile-time safeguards.
- Migration plan: Replace unsafe cast with typed wrapper and contract tests around LiteAPI client methods.

## Missing Critical Features

**Explicit authorization model for admin surface:**
- Problem: Admin UX and API rely on authentication only, without an authorization boundary.
- Blocks: Safe exposure of operational stats in multi-user production environments.

**Operational monitoring for fallback/degraded modes:**
- Problem: Fallback stores activate silently with limited visibility.
- Blocks: Fast detection of persistence outages and confident incident response.

## Test Coverage Gaps

**Core LiteAPI service orchestration untested:**
- What's not tested: Retry/backoff behavior, multi-stage search fallback ordering, and mapping edge cases.
- Files: `src/server/liteapi.ts`
- Risk: Upstream API changes or mapping regressions can ship unnoticed.
- Priority: High

**Admin and user-data API surfaces lack route tests:**
- What's not tested: Authorization boundaries and response contracts for admin and wishlist endpoints.
- Files: `src/app/api/admin/stats/route.ts`, `src/app/api/wishlist/route.ts`
- Risk: Privilege or data-leak regressions are not caught before release.
- Priority: High

**Hotel discovery APIs lack direct tests:**
- What's not tested: Query validation, cache fallback behavior, and response semantics for hotel endpoints.
- Files: `src/app/api/property-preview/route.ts`, `src/app/api/autocomplete/route.ts`, `src/app/api/hotels/[hotelId]/route.ts`, `src/app/api/hotels/rates/route.ts`
- Risk: Search UX can silently degrade without automated detection.
- Priority: Medium

**Security helper adoption is unverified:**
- What's not tested: CSRF enforcement integration and trusted-IP extraction rules.
- Files: `src/server/csrf.ts`, `src/server/request.ts`
- Risk: Security controls can remain absent or regress without test failures.
- Priority: High

---

*Concerns audit: 2026-02-23*
