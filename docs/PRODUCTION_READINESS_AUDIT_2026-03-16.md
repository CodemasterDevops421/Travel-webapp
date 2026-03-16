# Production Readiness Audit - 2026-03-16

Branch: `feature/production-readiness-audit`

## Blockers Before Production

### 1. Booking status endpoint can expose booking access tokens
- Severity: High
- Impacted area: Security, authz, booking lifecycle
- Why it matters: a leaked or observed `transactionId` can be turned into a valid booking-view token and used to access booking details or trigger privileged flows.
- Evidence: `src/app/api/booking/status/route.ts:23`, `src/app/api/booking/status/route.ts:123`, `src/app/api/booking/status/route.ts:142`, `src/app/api/booking/status/route.ts:159`, `src/features/booking/components/booking-console.tsx:603`, `src/features/booking/components/booking-console.tsx:616`.
- Fix: require authenticated ownership checks on status lookup, stop returning `bookingViewToken` and `confirmationCode` from this endpoint, and replace URL-visible `transactionId` with a one-time opaque nonce.

### 2. Duplicate bookings can be created for the same payment transaction
- Severity: Critical
- Impacted area: Reliability, data integrity, payments
- Why it matters: Stripe webhook reconciliation and booking finalization can write separate booking rows for the same real-world payment, corrupting reconciliation and risking duplicate notifications or inconsistent status.
- Evidence: `src/app/api/webhooks/stripe/route.ts:259`, `src/app/api/booking/book/route.ts:205`, `src/server/booking/repository.ts:781`, `src/server/booking/repository.ts:978`, `supabase/migrations/20260217_ota_core.sql:33`, `supabase/migrations/20260225_booking_lifecycle_guards.sql:37`, `tests/stripe-webhook-route.test.ts:163`.
- Fix: add a first-class unique `transaction_id` column, upsert on it everywhere, and make webhook/finalize flows reconcile the same canonical booking row.

### 3. Promo flow can break quote integrity at final booking
- Severity: Critical
- Impacted area: Checkout funnel, contract integrity
- Why it matters: the UI can show a discounted total while the server still holds the original prebook quote, causing `Quote mismatch` or reversion to the undiscounted amount.
- Evidence: `src/features/booking/components/booking-console.tsx:784`, `src/app/api/booking/prebook/route.ts:133`, `src/app/api/booking/book/route.ts:167`, `src/app/api/booking/book/route.ts:171`.
- Fix: make promo application mutate the authoritative server-side prebook session atomically, or force promo application before prebook creation.

### 4. Production can boot with placeholder secrets and still look healthy
- Severity: Critical
- Impacted area: DevOps, rollout safety
- Why it matters: a broken deployment can be marked healthy and receive traffic even when booking, auth, or payment configuration is invalid.
- Evidence: `src/server/env.ts:18`, `src/server/env.ts:40`, `src/server/env.ts:41`, `src/app/api/healthz/route.ts:3`, `src/app/api/healthz/route.ts:11`, `Dockerfile:20`.
- Fix: remove placeholder defaults for prod-critical secrets, fail startup on invalid prod config, and gate readiness on config plus critical dependencies.

### 5. Cache layer has no stampede control and no negative caching
- Severity: Critical
- Impacted area: Performance, scalability
- Why it matters: hot cache misses fan out into duplicate upstream calls, and empty/falsy results are treated as misses, which will hammer suppliers under load.
- Evidence: `src/server/cache.ts:21`, `src/server/cache.ts:24`, `src/server/cache.ts:27`, `src/app/api/property-preview/route.ts:108`, `src/app/api/hotels/[hotelId]/route.ts:42`, `src/app/api/hotels/rates/route.ts:85`, `src/app/api/autocomplete/route.ts:68`, `src/app/api/review-snippets/route.ts:36`.
- Fix: implement single-flight locking with Redis, cache negative results, and add stale-while-revalidate semantics.

### 6. Payment log idempotency is not enforced at the database layer
- Severity: Critical
- Impacted area: Payments, auditability
- Why it matters: concurrent webhook retries can create duplicate payment log rows and poison settlement/reconciliation data.
- Evidence: `src/server/payment-logs-repository.ts:116`, `src/server/payment-logs-repository.ts:156`, `supabase/migrations/006_phase1_foundation.sql:175`, `supabase/migrations/006_phase1_foundation.sql:205`.
- Fix: add a unique constraint on the natural event key and switch to insert-on-conflict/upsert.

## High-Priority Fixes

### 7. Rate limiting trusts spoofable IP headers
- Severity: High
- Impacted area: Security, abuse prevention
- Why it matters: attackers can rotate `X-Forwarded-For` and bypass throttling on booking, checkout, support, and webhook routes.
- Evidence: `src/server/request.ts:13`, `src/server/request.ts:19`, `src/server/ratelimit.ts:67`, `src/app/api/booking/prebook/route.ts:95`, `src/app/api/booking/book/route.ts:100`.
- Fix: trust only platform-injected proxy metadata and add user/resource-scoped limiter keys.

### 8. Checkout secrets and traveler PII are stored in browser storage
- Severity: Medium
- Impacted area: Security, privacy
- Why it matters: any XSS, compromised dependency, extension, or shared-device access can read session signatures and traveler data.
- Evidence: `src/features/booking/components/booking-console.tsx:69`, `src/features/booking/components/booking-console.tsx:232`, `src/features/booking/components/booking-console.tsx:237`, `src/app/booking/return/booking-return-client.tsx:60`.
- Fix: move checkout state server-side and use short-lived `HttpOnly` cookies with opaque references.

### 9. Checkout restoration can hydrate the wrong booking session
- Severity: High
- Impacted area: Frontend, correctness
- Why it matters: a user opening a new booking page can be forced into a previous transaction's confirmation state.
- Evidence: `src/features/booking/components/booking-console.tsx:147`, `src/features/booking/components/booking-console.tsx:394`, `src/features/booking/components/booking-console.tsx:402`.
- Fix: restore only when the current route fingerprint matches the stored session and never auto-advance from unrelated local state.

### 10. Supplier calls on critical flows have no shared timeout budget
- Severity: High
- Impacted area: Reliability, latency
- Why it matters: hung upstream calls will tie up server concurrency until platform timeout and amplify client retries.
- Evidence: `src/server/liteapi.ts:2162`, `src/server/liteapi.ts:2211`, `src/server/liteapi.ts:2251`, `src/server/liteapi.ts:2282`, `src/server/liteapi.ts:2313`, `src/server/liteapi.ts:2346`, `src/server/liteapi.ts:2574`; timeout wrapper exists separately at `src/server/liteapi.ts:308`.
- Fix: route every supplier call through a shared helper with `AbortController`, bounded retries, jitter, and per-operation deadlines.

### 11. Search and hotel detail cold paths are too expensive
- Severity: High
- Impacted area: Performance, supplier cost
- Why it matters: search and hotel pages will become the first visible latency and quota failures under 10x-100x traffic.
- Evidence: `src/server/liteapi.ts:1888`, `src/server/liteapi.ts:1961`, `src/server/liteapi.ts:2023`, `src/server/liteapi.ts:2115`, `src/server/liteapi.ts:2346`, `src/server/liteapi.ts:2369`, `src/server/liteapi.ts:2464`.
- Fix: reduce fallback chains, parallelize only bounded independent work, split caches by subresource, and stop synchronously fetching multiple review pages.

### 12. No row-level security policies are defined for sensitive Supabase tables
- Severity: High
- Impacted area: Security, compliance
- Why it matters: all DB protection is in app code; any route mistake or future client exposure has a larger blast radius.
- Evidence: no `ENABLE ROW LEVEL SECURITY` or `CREATE POLICY` statements found under `supabase/*.sql`; service-role client in `src/server/supabase/admin.ts:5`.
- Fix: enable RLS on booking, payment, analytics, and user tables and define explicit policies.

### 13. CI/CD does not gate migrations or production smoke checks
- Severity: High
- Impacted area: Deployment safety
- Why it matters: deploys can pass CI and still fail after migration or on booking-critical paths with no automated brake or rollback proof.
- Evidence: `.github/workflows/ci.yml:8`, `.github/workflows/ci.yml:37`, `docs/DB_RUNBOOK.md:16`, `docs/GO_LIVE_CHECKLIST.md:16`.
- Fix: add migration validation, staged deploy smoke tests, and rollback automation.

## Important But Not Blocking Improvements

### 14. Supplier error bodies are logged raw enough to leak sensitive data
- Severity: Medium
- Impacted area: Observability, privacy
- Evidence: `src/server/liteapi.ts:2178`, `src/server/liteapi.ts:2233`, `src/server/liteapi.ts:2265`, `src/server/liteapi.ts:2296`, `src/server/liteapi.ts:2328`; redaction limits in `src/server/logger.ts:15`.
- Fix: stop logging upstream body snippets or parse-and-redact them first.

### 15. Admin reporting is expensive, partly uncached, and silently truncates
- Severity: High
- Impacted area: Operations, scalability
- Evidence: `src/app/admin/page.tsx:218`, `src/server/admin/support-sla-report.ts:68`, `src/server/admin/reconciliation-report.ts:176`, `src/server/admin/support-operations-report.ts:171`, `src/server/admin/report-cache.ts:8`.
- Fix: move heavy aggregates into indexed SQL/materialized views, use shared cache, and make truncation explicit.

### 16. Outbox processing is in-memory, not durable
- Severity: High
- Impacted area: Reliability, notifications
- Evidence: `src/server/booking/repository.ts:498`, `src/server/booking/repository.ts:675`, `src/server/booking/repository.ts:945`, `src/server/booking/outbox.ts:20`, `src/server/booking/outbox.ts:95`.
- Fix: persist outbox rows transactionally and deliver them from a worker/queue.

### 17. SSR hotel rates path bypasses the validated API contract
- Severity: High
- Impacted area: API correctness, security hardening
- Evidence: `src/app/hotels/[hotelId]/page.tsx:51`, `src/app/hotels/[hotelId]/page.tsx:57`, `src/app/api/hotels/rates/route.ts:56`, `src/server/liteapi.ts:2535`.
- Fix: use a shared schema/parser module for both SSR and API entry points.

### 18. Property-preview validation failures return `200` with empty results
- Severity: Medium
- Impacted area: API contracts, observability
- Evidence: `src/app/api/property-preview/route.ts:50`, `src/app/api/property-preview/route.ts:67`.
- Fix: return `400` with structured validation details for invalid requests.

### 19. Pricing units are inconsistent across property and booking screens
- Severity: High
- Impacted area: Frontend truthfulness, conversion risk
- Evidence: `src/server/liteapi.ts:2616`, `src/features/hotels/components/property-hero.tsx:63`, `src/features/hotels/components/hotel-booking-sidebar.tsx:43`, `src/features/booking/components/booking-console.tsx:477`.
- Fix: introduce explicit `stayTotal`, `nightlyAverage`, and taxes fields in the rate contract and align all displays.

### 20. Canonical schema artifact is out of sync with migrations/runtime
- Severity: High
- Impacted area: Database operations, recovery safety
- Evidence: `supabase/schema.sql:23`, `src/server/booking/repository.ts:553`, `supabase/migrations/006_phase1_foundation.sql:151`, `supabase/migrations/20260225_booking_lifecycle_guards.sql:17`.
- Fix: regenerate or remove `supabase/schema.sql` as a source of truth.

### 21. Observability is too shallow for production incident response
- Severity: Medium
- Impacted area: Ops, SRE
- Evidence: `sentry.server.config.ts:3`, `sentry.edge.config.ts:3`, `sentry.client.config.ts:3`, `src/server/admin/report-observability.ts:26`, `src/server/admin/report-observability.ts:54`.
- Fix: emit durable metrics/traces and alert on booking/webhook/readiness failure modes.

### 22. PII retention is undefined for booking metadata
- Severity: Medium
- Impacted area: Compliance, privacy
- Evidence: `src/app/api/booking/book/route.ts:223`, `src/app/api/booking/book/route.ts:224`, `src/server/booking/repository.ts:406`, `src/server/booking/repository.ts:465`, `docs/DB_RUNBOOK.md:63`.
- Fix: define retention windows, purge workflows, and data minimization boundaries for traveler data.

### 23. Auth hook recreates the Supabase browser client repeatedly
- Severity: Medium
- Impacted area: Frontend performance, maintainability
- Evidence: `src/shared/hooks/use-auth.ts:11`, `src/shared/hooks/use-auth.ts:13`, `src/shared/hooks/use-auth.ts:28`, `src/server/supabase/client.ts:1`.
- Fix: export a stable browser singleton from a non-server path.

### 24. Critical checkout tests rely on source-string assertions
- Severity: Medium
- Impacted area: Test depth
- Evidence: `tests/booking-checkout-flow.test.tsx:6`, `tests/booking-checkout-flow.test.tsx:17`, `tests/checkout-conversion-ui.test.ts:6`.
- Fix: replace string checks with runtime integration tests covering promo, return flow, session restoration, and price consistency.

## Nice-to-Have Optimizations

### 25. Node runtime is inconsistent across docs, CI, and Docker
- Severity: Medium
- Impacted area: Build reproducibility
- Evidence: `README.md:54`, `.github/workflows/ci.yml:19`, `Dockerfile:1`.
- Fix: pin one Node major across local, CI, and production.

## What Breaks First Under Load
- Search cold misses and hotel detail cold loads because cache misses trigger expensive supplier waterfalls.
- Booking-critical supplier calls because there is no shared timeout/circuit-breaker discipline.
- Admin reporting because it fans out heavy scans and uses process-local cache only.

## What Gets Expensive First
- Supplier API quota/spend from repeated fallback searches and uncached negative results.
- Supabase reads for admin reports and JSON-metadata lookups on booking/payment reconciliation.
- Incident response time because current observability is too shallow and partly in-memory.

## What Causes User-Visible Slowness First
- Search result generation on low-cache or degraded-supplier paths.
- Hotel detail page enrichment fetching reviews/photos/rates synchronously.
- Payment and booking finalization when upstream providers hang.

## Optimize Before Production
- Cache stampede protection and negative caching.
- DB-enforced idempotency and unique transaction identity.
- Supplier timeouts, bounded retries, and circuit breaking.
- Booking/authz hardening around status lookup and stored checkout state.

## Can Wait Until Later
- Node runtime alignment can follow blocker removal but should still happen before wide rollout.
- Admin performance tuning beyond correctness and truncation fixes can be phased after public launch if traffic is low.

## Scores
- Production readiness: 3/10
- Security: 4/10
- Scalability: 3/10
- Reliability: 3/10
- Maintainability: 5/10

## Final Verdict
NOT READY FOR PRODUCTION

## Must-Do Go-Live Checklist
- Lock down `src/app/api/booking/status/route.ts` so it cannot mint booking access tokens from leaked identifiers.
- Add a unique `transaction_id` column and make booking/webhook/payment reconciliation idempotent at the database layer.
- Fix promo application so the authoritative server-side quote cannot diverge from the UI quote.
- Remove placeholder production secrets and fail startup/readiness on invalid production config.
- Implement cache stampede protection, negative caching, and bounded stale refresh for supplier-backed reads.
- Put all LiteAPI booking/search/detail calls behind shared deadlines, retries, and circuit-breaker logic.
- Stop storing checkout secrets and traveler PII in browser storage.
- Enable Supabase RLS and define explicit policies for booking/payment/user tables.
- Replace in-memory outbox processing with a durable transactional outbox plus worker.
- Add deployment gates: migration validation, readiness/smoke tests, and rollback procedure automation.
- Add durable metrics, alerting, and tracing for booking, payment, webhook, and readiness flows.
- Add integration tests for promo -> prebook -> payment return -> finalize, webhook replay/idempotency, and wrong-session restoration.
