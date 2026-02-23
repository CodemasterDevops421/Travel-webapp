# Stack Research

**Domain:** Production hardening for a hotel booking web app (Next.js + Supabase + LiteAPI)
**Researched:** 2026-02-23
**Confidence:** HIGH (core platform choices), MEDIUM (some optional tooling choices)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js (App Router) | 16.1.x (current: 16.1.6) | Web app runtime, SSR/RSC, route handlers, `proxy.ts` auth boundary | Current stable line with active security fixes; Node runtime `proxy.ts` model is clearer for auth/session checks and hardened server routing behavior. |
| React | 19.2.x | UI runtime for App Router | Matches Next.js 16 defaults; stable for modern App Router patterns. |
| Node.js | >=20.9 LTS | Server runtime for Next.js | Required by Next.js 16; standardized LTS baseline for production ops. |
| Supabase Postgres + Auth | Managed platform (with `@supabase/supabase-js@2.97.x`, `@supabase/ssr@0.8.x`) | Auth, RLS-backed data plane, booking/reconciliation persistence | Strong fit for server-first auth + RLS authorization; SSR package now documents secure cookie/proxy patterns and server claim verification guidance. |
| LiteAPI Build APIs | v3.x REST/GraphQL | Search, rates, prebook, book, cancellation, reconciliation | Existing business integration; docs now provide explicit reliability/rate-limit guidance and SSP/commission behavior needed for launch-safe monetization. |
| Upstash Redis + Ratelimit (optional but recommended) | `@upstash/redis@1.36.x`, `@upstash/ratelimit@2.0.x` | Global cache, abuse/rate limiting, burst smoothing | HTTP-native, serverless-friendly, multi-region capable; practical fit for protecting expensive supplier endpoints. |
| Stripe Webhooks pattern (if Stripe is used in payment flow) | Current API + webhook signing | Asynchronous payment truth + retry-safe event handling | Official webhook guidance is explicit on signature verification, duplicate handling, async processing, and quick `2xx` responses. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | 4.3.x | Runtime validation of all external inputs | Mandatory for LiteAPI payloads, booking forms, webhook payload envelopes, admin mutations. |
| `jose` | 6.1.x | JWT/JWS verification and signing utilities | For custom token verification paths and service-to-service signatures; avoid homegrown crypto. |
| `pino` | 10.3.x | Structured JSON logging | Required in production for booking/audit trails with redaction and correlation IDs. |
| `@sentry/nextjs` | 10.39.x | Error tracking + traces + release/source-map visibility | Use across client/server/edge runtimes for launch-readiness and rapid incident triage. |
| `@vercel/otel` + OTel SDK | `@vercel/otel@2.1.x`, `@opentelemetry/api@1.9.x` | Distributed traces, latency/error attribution | Use if you need vendor-neutral traces and supplier call latency breakdown beyond error-only monitoring. |
| `cockatiel` (or equivalent resilience lib) | 3.2.x | Retry, timeout, circuit-breaker policies | Wrap LiteAPI calls with explicit per-endpoint resilience policy instead of ad-hoc `try/catch`. |
| `@playwright/test` | 1.58.x | End-to-end launch verification | Use for pre-launch critical journeys: search -> prebook -> book -> cancellation -> reconciliation checks. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| TypeScript 5.9+ | Type-safe codebase contracts | Keep `strict` on; pair with runtime validation (types are not runtime security). |
| ESLint CLI (not `next lint`) | Static guardrails and policy linting | `next lint` is deprecated in current Next.js direction; run ESLint directly in CI. |
| GitHub Actions + Dependabot/Renovate | CI, security updates, reproducible releases | Use lockfile + automated dependency patch PRs, especially for Next.js/Supabase security update cadence. |
| Secret scanning (GitHub Advanced Security or equivalent) | Secret hygiene and leakage prevention | Mandatory for API key posture (`sb_secret`, LiteAPI key, webhook secrets). |

## Production Posture (2025/2026 Standard)

1. **Security baseline (HIGH confidence):**
   - RLS enabled on every Data API-exposed table; policy scope by `authenticated` role and explicit ownership checks.
   - Use Supabase publishable key client-side, secret/service credentials server-side only.
   - For server auth checks, prefer verified claims/token validation flows; do not trust unvalidated session blobs.
   - Cookie sessions: `HttpOnly`, `Secure`, `SameSite=lax/strict`, explicit expiry/rotation.

2. **Booking correctness baseline (HIGH confidence):**
   - Enforce strict state machine: `search -> prebook -> book -> reconcile`.
   - Idempotency keys for booking and cancellation writes; DB uniqueness constraints as final guard.
   - Persist supplier request/response snapshots with correlation IDs for audit and replay-safe recovery.

3. **Reliability baseline (MEDIUM-HIGH confidence):**
   - Timeouts per supplier call, bounded retries with jitter, and circuit-breaker/degradation mode.
   - Cache only safe read paths (search/rates metadata), never mutable booking authority records.
   - Queue non-user-blocking side effects (emails, analytics, downstream sync) away from request path.

4. **Revenue/reporting baseline (HIGH confidence):**
   - Store both supplier economics (net, SSP, markup inputs) and customer price shown at booking time.
   - Track commission decisions (`margin`, `additionalMarkup`) as immutable booking facts.
   - Use reconciliation endpoint pulls + internal ledger tables for payout accuracy.

5. **Launch readiness baseline (MEDIUM-HIGH confidence):**
   - SLOs and error budgets defined before launch (availability, booking success rate, p95/p99 latency).
   - Run synthetic canaries for core booking flow against sandbox and limited production routes.
   - Security checklist gates release: key rotation tested, webhook signatures verified, RLS audit green.

## Installation

```bash
# Core runtime dependencies
npm install next@^16.1.6 react@^19.2.0 react-dom@^19.2.0 @supabase/supabase-js@^2.97.0 @supabase/ssr@^0.8.0

# Supporting production dependencies
npm install zod@^4.3.6 jose@^6.1.3 pino@^10.3.1 @sentry/nextjs@^10.39.0 @upstash/redis@^1.36.2 @upstash/ratelimit@^2.0.8 cockatiel@^3.2.1

# Observability and verification
npm install @vercel/otel@^2.1.1 @opentelemetry/api@^1.9.0
npm install -D @playwright/test@^1.58.2 eslint@^10.0.1 typescript@^5.9.3
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Supabase Auth + RLS | NextAuth/Auth.js + separate DB auth model | Use only if you need custom IdP/session architecture not aligned with Supabase Auth and are ready to own authz consistency yourself. |
| Upstash Redis | In-memory process cache only | Use only for tiny single-instance deployments; not sufficient for distributed production or abuse protection. |
| Next.js route handlers + server actions | Dedicated separate BFF service from day one | Use when org boundaries, multi-client API products, or strict service isolation justify the added ops cost now. |
| Sentry + OTel | Sentry only | Acceptable for smaller teams; add full OTel when you need cross-service vendor-neutral tracing. |
| LiteAPI markup controls with compliance guardrails | Hardcoded static markup | Use only for MVP; production needs dynamic margin policy and SSP-aware controls. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Exposing `service_role` / `sb_secret` in browser bundles | Full data bypass (including RLS) if leaked | Publishable key on client, secret keys only on trusted server components |
| Trusting client-side checks or layout-only guards for authorization | Bypassable and incomplete across route handlers/actions | Server-enforced authz in DAL + route handlers + DB RLS |
| Booking writes without idempotency and unique DB constraints | Duplicate bookings/charges under retries or user refreshes | Request idempotency keys + unique indexes + state-machine transitions |
| Unbounded retries to LiteAPI on 5xx/timeout | Retry storms amplify outages and cost | Capped retries with jitter, per-endpoint timeouts, circuit breaking |
| Using `next lint` as long-term lint strategy | Deprecated path in modern Next.js | Direct ESLint CLI or Biome, wired explicitly in CI |
| Publicly selling below SSP without CUG controls | Rate-violation risk and partner penalties | SSP-aware pricing policy with CUG/private channel handling |

## Stack Patterns by Variant

**If you are launching B2C quickly (single region, moderate traffic):**
- Use Next.js 16 + Supabase + LiteAPI with Upstash for rate limiting and short-lived search cache.
- Keep one booking service boundary in the app, but enforce strict DB idempotency and immutable booking ledger tables.
- Because this gives fastest path to production while retaining critical correctness/security controls.

**If you are scaling to multi-region/high-volume traffic:**
- Add stronger queueing/outbox patterns, multi-region cache strategy, and explicit supplier degradation modes.
- Increase observability depth (OTel traces + Sentry + synthetic booking canaries).
- Because supplier variability and burst demand dominate failure modes at scale.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `next@16.1.x` | `react@19.2.x`, `react-dom@19.2.x`, `node>=20.9`, `typescript>=5.1` | Current stable baseline; keep on patched minors due active security advisories. |
| `@supabase/supabase-js@2.x` | `@supabase/ssr@0.8.x` | Use SSR package for cookie-aware server/browser clients and token refresh flow in Next.js. |
| `@upstash/ratelimit@2.x` | `@upstash/redis@1.x` | Connectionless HTTP model fits serverless and edge-facing workloads. |

## Sources

- Next.js 16 release notes (version requirements, runtime changes, deprecations): https://nextjs.org/blog/next-16 
- Next.js 2025 security advisory (upgrade urgency for App Router lines): https://nextjs.org/blog/security-update-2025-12-11
- Next.js auth guidance (server-side authz patterns, cookies, `proxy.ts`): https://nextjs.org/docs/app/building-your-application/authentication
- Supabase SSR + secure server auth guidance (`getClaims`, proxy/session refresh): https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Supabase API keys model (publishable vs secret, service-role risk): https://supabase.com/docs/guides/api/api-keys
- Supabase RLS guide and hardening Data API guide: https://supabase.com/docs/guides/database/postgres/row-level-security and https://supabase.com/docs/guides/database/hardening-data-api
- Supabase JWT guide (verification and key model): https://supabase.com/docs/guides/auth/jwts
- LiteAPI performance/reliability/rate limits and uptime commitment: https://docs.liteapi.travel/docs/performance-reliability-rate-limiting and https://docs.liteapi.travel/docs/service-availability-uptime-commitment
- LiteAPI security overview: https://docs.liteapi.travel/docs/security-privacy-compliance-overview
- LiteAPI pricing/revenue controls (margin, additionalMarkup, SSP guidance): https://docs.liteapi.travel/docs/revenue-management-and-commission
- Upstash rate limit overview (HTTP-first, serverless/edge focus): https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
- Sentry Next.js setup and production sampling guidance: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Stripe webhook reliability/security practices (signatures, duplicates, async handling): https://stripe.com/docs/webhooks
- OWASP transaction authorization controls (idempotency-like uniqueness, server-side enforcement): https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html

---
*Stack research for: production hardening of Next.js + Supabase + LiteAPI hotel booking app*
*Researched: 2026-02-23*
