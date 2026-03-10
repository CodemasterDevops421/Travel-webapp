# Production Readiness Audit — Travel Webapp

## Executive verdict
**Verdict: NOT READY FOR PRODUCTION**

This codebase has meaningful strengths (typed validation with Zod, basic rate limits, webhook signature checks, lifecycle tests), but it still contains production blockers in access control, data exposure, anti-abuse, and resilience patterns that will fail under malicious traffic and scale.

## Scoring
- **Production readiness:** 4.8 / 10
- **Security:** 4.3 / 10
- **Scalability:** 5.0 / 10
- **Reliability:** 5.1 / 10
- **Maintainability:** 6.2 / 10

---

## 1) Blockers before production

### 1.1 Admin authorization can be bypassed by forged JWT role claim
- **Severity:** Critical
- **Impacted area:** Security, authz, admin routes
- **Why it matters:** Any compromised/forged token carrying `app_metadata.role=admin` skips DB-backed admin checks and gets full admin access.
- **Evidence:** `assertAdminAuthorized` returns immediately if `hasAdminClaim(user)` is true; DB lookup to `admin_users` is skipped entirely. `middleware.ts` also trusts `app_metadata.role` for `/admin` route gating. This allows privilege elevation if auth claims are misissued or stale. 
- **Affected components/files:**
  - `src/server/authz.ts`
  - `src/middleware.ts`
  - admin API routes under `src/app/api/admin/**`
- **Exact remediation:**
  1. Remove trust-on-claim short-circuit; always enforce DB `admin_users` + `is_active` for write/read admin APIs.
  2. Keep claim as optimization hint only (never as source of truth).
  3. Add signed, short-lived internal admin session cache keyed by user+role version; invalidate on admin role updates.
  4. Add test: forged claim with missing DB membership must return 403.

### 1.2 Booking support endpoint leaks sensitive booking data to token holders
- **Severity:** High
- **Impacted area:** Security, privacy, compliance
- **Why it matters:** A bearer of `x-booking-view-token` can retrieve full support packet including holder email and internal references in response body.
- **Evidence:** `/api/support/liteapi` allows either API secret OR booking view token; response includes `supportPacket` with `holderEmail`, transaction IDs, booking status, and internal identifiers.
- **Affected components/files:**
  - `src/app/api/support/liteapi/route.ts`
- **Exact remediation:**
  1. Split auth scopes: booking-view token can submit request but must not receive full packet; return opaque `supportRequestId` only.
  2. Restrict full packet retrieval to authenticated support/admin context.
  3. Remove `holderEmail` from client response payload and redact PII in forwarded logs.

### 1.3 IP-based controls are trivially bypassable due to header trust
- **Severity:** High
- **Impacted area:** Security, abuse prevention, availability
- **Why it matters:** Attackers can spoof `x-real-ip` / `x-forwarded-for`, bypassing rate limits and poisoning analytics attribution.
- **Evidence:** `getClientIp` directly trusts `x-real-ip` and first `x-forwarded-for` value with no trusted-proxy validation.
- **Affected components/files:**
  - `src/server/request.ts`
  - all routes calling `assertRateLimit` with `getClientIp`
- **Exact remediation:**
  1. Only trust forwarded headers from known edge proxy IP ranges.
  2. On Vercel/Cloudflare/AWS, use platform-provided canonical client IP headers and verify provenance.
  3. Add secondary rate-limit identity (user ID, auth token hash, device fingerprint) for authenticated flows.

### 1.4 Open external forwarding target is SSRF/control-plane abuse risk
- **Severity:** High
- **Impacted area:** Security, outbound egress
- **Why it matters:** Misconfiguration or compromised env var can turn support forwarding into blind SSRF and credential exfiltration channel.
- **Evidence:** `forwardToSupportBridge` posts arbitrary payloads to `env.LITEAPI_SUPPORT_FORWARD_URL` with bearer token; no allowlist, hostname validation, or scheme constraints beyond generic URL validation in env parser.
- **Affected components/files:**
  - `src/app/api/support/liteapi/route.ts`
  - `src/server/env.ts`
- **Exact remediation:**
  1. Enforce strict allowlist of support bridge hostnames.
  2. Require HTTPS, pinned domain suffix, and optional mTLS/private network route.
  3. Strip high-risk fields before forwarding and sign payload with HMAC for downstream verification.

### 1.5 Production resilience still depends on in-memory fallbacks
- **Severity:** High
- **Impacted area:** Reliability, consistency, horizontal scale
- **Why it matters:** In-memory fallback stores break cross-instance consistency and idempotency under autoscaling/restarts; duplicate bookings/webhook replays can slip.
- **Evidence:** `booking-store`, `booking-idempotency`, `webhook-idempotency`, and booking repository all use in-memory `Map` fallbacks when Redis/schema is unavailable. That behavior exists in non-production, but operationally often leaks into staging/canary and causes false confidence.
- **Affected components/files:**
  - `src/server/booking-store.ts`
  - `src/server/booking-idempotency.ts`
  - `src/server/webhook-idempotency.ts`
  - `src/server/booking/repository.ts`
- **Exact remediation:**
  1. Fail hard in all pre-production environments used for release validation (not just prod).
  2. Add startup checks requiring Redis + critical tables.
  3. Run canary with same persistence guarantees as prod; no in-memory fallbacks on payment paths.

---

## 2) High-priority fixes

### 2.1 Admin stats endpoint performs full table scans and unbounded aggregation
- **Severity:** High
- **Impacted area:** Performance, cost, availability
- **Why it matters:** Under scale, reading all `bookings.metadata` to calculate revenue will degrade p95 and DB CPU first.
- **Evidence:** `/api/admin/stats` fetches `bookings` metadata wholesale and loops in app code for revenue calculation.
- **Affected components/files:**
  - `src/app/api/admin/stats/route.ts`
- **Exact remediation:**
  1. Move aggregates to SQL/materialized views.
  2. Add date bounds and pagination to all admin list queries.
  3. Cache aggregate snapshots with explicit freshness SLA.

### 2.2 API responses leak internal persistence errors directly to clients
- **Severity:** Medium
- **Impacted area:** Security, DX, supportability
- **Why it matters:** Returning raw DB/provider error messages leaks internals and increases attack surface.
- **Evidence:** Multiple routes return `error.message` directly (`wishlist`, bookings routes, admin routes in some branches).
- **Affected components/files:**
  - `src/app/api/wishlist/route.ts`
  - `src/app/api/bookings/*.ts`
- **Exact remediation:**
  1. Return stable public error codes/messages.
  2. Keep detailed cause only in structured logs with correlation ID.

### 2.3 CSRF protection relies on strict Origin header; clients with stripped origin will fail
- **Severity:** Medium
- **Impacted area:** Reliability, compatibility
- **Why it matters:** Legitimate requests from strict privacy clients/proxies may fail; conversely, this pattern still misses defense-in-depth for authenticated mutations.
- **Evidence:** `assertSameOrigin` hard-fails if `Origin` missing and is applied to mutation APIs.
- **Affected components/files:**
  - `src/server/csrf.ts`
- **Exact remediation:**
  1. Pair origin check with anti-CSRF token (double-submit cookie or synchronizer token).
  2. Accept same-site POSTs from trusted browser paths where origin can be omitted only if CSRF token present.

### 2.4 Caching strategy risks cardinality explosion
- **Severity:** Medium
- **Impacted area:** Performance, Redis memory pressure
- **Why it matters:** Search cache keys include many dimensions (`q`, dates, pax, filters, page, limit, mode, currency), causing high key churn and low hit ratio.
- **Evidence:** property-preview route constructs highly granular key including free text and many filters.
- **Affected components/files:**
  - `src/app/api/property-preview/route.ts`
- **Exact remediation:**
  1. Normalize keys by coarse buckets for exploratory search.
  2. Use two-layer cache (top destinations + query-specific short TTL).
  3. Add Redis memory guardrails and eviction monitoring.

### 2.5 Content Security Policy allows unsafe inline scripts/styles
- **Severity:** Medium
- **Impacted area:** Security hardening
- **Why it matters:** XSS blast radius is larger with `'unsafe-inline'` in script/style sources.
- **Evidence:** Both middleware and Next headers set `script-src 'unsafe-inline'` and `style-src 'unsafe-inline'`.
- **Affected components/files:**
  - `src/middleware.ts`
  - `next.config.mjs`
- **Exact remediation:**
  1. Move to nonce-based CSP (`script-src 'self' 'nonce-...'`).
  2. Remove inline style/script dependencies where possible.

### 2.6 README operational links are broken and non-portable
- **Severity:** Medium
- **Impacted area:** Operability, onboarding
- **Why it matters:** Incident responders/new engineers cannot navigate runbooks quickly.
- **Evidence:** README links use local Windows absolute paths (`C:/Users/...`) instead of repo-relative paths.
- **Affected components/files:**
  - `README.md`
- **Exact remediation:**
  1. Replace all absolute local paths with relative markdown links.
  2. Add quick “prod incident drill” section with exact commands.

---

## 3) Important but not blocking improvements

### 3.1 Data model integrity is still partially JSONB-driven
- **Severity:** Medium
- **Impacted area:** DB correctness, analytics quality
- **Why it matters:** Critical business fields (commission, support state, payment hints) are frequently parsed from `metadata` JSON; this degrades query safety and consistency.
- **Evidence:** report SQL functions and repository logic repeatedly parse metadata JSON text/number fields.
- **Affected components/files:**
  - `supabase/migrations/20260304_admin_report_phase3.sql`
  - `src/server/booking/repository.ts`
- **Exact remediation:**
  1. Promote high-value fields to typed columns with constraints.
  2. Use generated columns/indexes for frequently filtered metadata fields during migration period.

### 3.2 No explicit queue for email/side effects; process-local outbox is fragile
- **Severity:** Medium
- **Impacted area:** Reliability, at-least-once delivery
- **Why it matters:** On serverless/runtime restarts, in-process outbox can drop notifications or duplicate sends.
- **Evidence:** lifecycle notifications are enqueued via server module function without external durable queue contract.
- **Affected components/files:**
  - `src/server/booking/outbox.ts`
  - `src/server/booking/repository.ts`
- **Exact remediation:**
  1. Move lifecycle events to durable queue (SQS/PubSub/Redis stream).
  2. Make consumer idempotent on `(bookingId, transition)`.

### 3.3 Missing explicit API versioning strategy
- **Severity:** Medium
- **Impacted area:** API evolution safety
- **Why it matters:** Public/partner API contract changes risk breaking clients silently.
- **Evidence:** No `/api/v1` namespacing, no version headers, route contracts evolve directly.
- **Affected components/files:**
  - `src/app/api/**`
- **Exact remediation:**
  1. Freeze v1 schemas (zod + generated OpenAPI).
  2. Introduce versioned route namespaces for external consumers.

### 3.4 Dependency risk controls are minimal
- **Severity:** Medium
- **Impacted area:** Supply chain
- **Why it matters:** `npm audit` in CI is insufficient for SBOM, license policy, and critical CVE blocking.
- **Evidence:** CI runs lint/type/test/build + npm audit only.
- **Affected components/files:**
  - `.github/workflows/ci.yml`
- **Exact remediation:**
  1. Add SBOM generation (CycloneDX/Syft).
  2. Add Trivy/Snyk dependency + image scan gate.
  3. Pin Node runtime version consistently across Docker and CI.

---

## 4) Nice-to-have optimizations

### 4.1 Docker image can be slimmed and hardened
- **Severity:** Low
- **Impacted area:** Cost, attack surface
- **Why it matters:** Shipping full `node_modules` from build/deps stage increases image size and CVE surface.
- **Evidence:** Dockerfile copies full node_modules into runner.
- **Exact remediation:** Use `next build` standalone output, prune dev artifacts, run as non-root, add HEALTHCHECK.

### 4.2 Improve frontend resilience states under slow network
- **Severity:** Low
- **Impacted area:** UX
- **Why it matters:** Some optimistic paths rollback on error, but inconsistent stale/loading boundaries remain in data-heavy pages.
- **Evidence:** multi-fetch admin dashboard and booking return flows lack circuit-breaker UI and partial degrade strategy.
- **Exact remediation:** add explicit stale timestamp + retry affordances + per-widget error boundaries.

---

## 5) What breaks first under high traffic
1. **Admin stats endpoint and report queries** (DB CPU + latency) due to full scans and app-side aggregation.
2. **Rate limiting efficacy** under spoofed IP headers (abuse amplification).
3. **Webhook/booking idempotency guarantees** if Redis health degrades and fallbacks get exercised in non-prod parity.
4. **Search cache memory pressure** from high-cardinality keys.

## 6) What gets expensive first
1. Repeated full-table reads for admin and analytics summaries.
2. External supplier/API calls without shared batching strategy.
3. Log volume from verbose webhook/error logs under retries.

## 7) What causes user-visible slowness first
1. Admin dashboard loading multiple heavyweight endpoints concurrently.
2. Supplier-backed search/rates on cache misses.
3. Booking return/finalize path when external provider latency spikes.

## 8) Optimize before production vs later

### Optimize before production
- Admin authz hardening (DB-source-of-truth only).
- IP trust model + anti-abuse controls.
- Support packet data minimization.
- Admin query rework (SQL aggregates/index usage).
- CSP nonce migration for script/style.

### Can wait until later
- Docker image slimming.
- Frontend micro-optimizations and bundle trimming.
- Advanced distributed tracing refinements (after baseline telemetry correctness).

---

## 9) Testing and verification gaps
Mandatory pre-go-live tests missing or weak:
1. **Load test for booking finalize + webhook replay storm** with retries and partial DB latency.
2. **Abuse tests** for rate-limit bypass via spoofed forwarding headers.
3. **Authz regression tests** ensuring JWT claim alone cannot access admin APIs.
4. **Chaos tests** for Redis outage while payment/webhook traffic continues.
5. **Contract tests** for all externally consumed booking/support routes.
6. **PII redaction tests** for support handoff and analytics logs/exports.

---

## 10) Compliance/data handling concerns
- PII surfaces in support packet responses (`holderEmail`) and likely downstream bridge payloads; minimize and classify.
- No explicit retention/deletion policy enforced in code for booking analytics/support metadata.
- Need documented DSAR/delete workflow and audit log policy before public launch.

---

## 11) Must-do go-live checklist (only critical items)
1. Enforce admin authz from DB membership only; remove claim-only trust path.
2. Lock down `getClientIp` to trusted-proxy model and update rate-limit keys with user/session dimensions.
3. Remove PII from `/api/support/liteapi` responses; restrict full packet visibility.
4. Allowlist + harden support forward target; sign outbound payloads.
5. Replace admin stats full scans with DB aggregates/materialized views.
6. Enforce no in-memory persistence fallback in release validation and production payment paths.
7. Deploy nonce-based CSP and remove `'unsafe-inline'` for scripts.
8. Add load + replay + chaos test gates in CI/pre-release pipeline.
9. Fix runbook links and verify operational docs are executable by on-call.
10. Add SBOM + vulnerability scan gates for dependencies and container image.
