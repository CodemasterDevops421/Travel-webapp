# Project Research Summary

**Project:** Hostel Stays Production Hardening
**Domain:** Brownfield OTA hotel booking web app hardening (Next.js + Supabase + LiteAPI)
**Researched:** 2026-02-23
**Confidence:** MEDIUM

## Executive Summary

This is a brownfield production-hardening effort for an already functional hotel booking app, not a net-new product build. The research converges on a server-first reliability and security model: keep the existing Next.js + Supabase + LiteAPI architecture, but tighten correctness at money and booking boundaries with strict state transitions, end-to-end idempotency, and reconciliation as first-class workflows. Expert practice here is to treat booking finalization, webhook handling, and admin overrides as controlled command paths with auditability, rather than ad-hoc route logic.

The recommended approach is to sequence work by risk dependency: lock down security and secret boundaries first, then harden booking and payment correctness, then add resilience testing and finally launch operations guardrails. This order is supported by both feature dependencies (ledger before reconciliation, state machine before fallback automation) and architecture sequencing (canonical data model and transactional finalization before async workers and admin tooling).

The highest launch risks are silent integrity failures (duplicate bookings/charges, hold/capture mismatch, price drift), authorization gaps in admin surfaces, and brittle retry/fallback behavior during supplier incidents. Mitigation is explicit and proven: DB-backed idempotency constraints, immutable ledger + reconcile jobs, server-enforced RBAC/CSRF/secret scanning, bounded retries with circuit breaking, and booking-centric SLOs with game-day runbooks.

## Key Findings

### Recommended Stack

The stack recommendation is to stay on modern stable versions of the current platform and add production guardrail libraries rather than re-platform. Next.js 16.1 + React 19.2 + Node 20.9+ is the baseline, with Supabase Auth/Postgres + RLS for authz/data boundaries and LiteAPI v3 as the supplier integration backbone. Optional-but-strongly-recommended Upstash Redis supports distributed idempotency/rate limiting and lock semantics.

**Core technologies:**
- `Next.js 16.1.x` + `React 19.2.x` + `Node >=20.9`: app runtime and server boundary (`proxy.ts`, route handlers) aligned with current security patch cadence.
- `Supabase Postgres + Auth` (`@supabase/supabase-js@2.97.x`, `@supabase/ssr@0.8.x`): source of truth with RLS and secure server-side session/claim handling.
- `LiteAPI v3`: authoritative hotel search/price/prebook/book/reconcile workflow integration.
- `Upstash Redis + Ratelimit` (recommended): distributed lock/idempotency/rate-limit controls for expensive supplier paths.
- `zod`, `jose`, `pino`, `@sentry/nextjs`, optional OTel, resilience lib (`cockatiel`): input validation, token correctness, audit logging, incident visibility, and retry/circuit policies.

Critical version constraints: keep `next@16.1.x` patched, enforce `node>=20.9`, and keep Supabase JS/SSR compatibility in the documented pairings.

### Expected Features

Research is explicit that launch readiness is defined by integrity and ops controls more than new user-facing UX. The feature baseline is heavy on P1 hardening: idempotent booking/payment, inventory protection, immutable ledger + reconciliation, RBAC/audit, security controls, observability SLOs, DR drills, privacy lifecycle controls, and safe rollout mechanics.

**Must have (table stakes):**
- Idempotent booking/payment operations with immutable ledger and daily reconciliation.
- Atomic inventory locking with hold/confirm/expire state machine.
- RBAC + admin audit trail + approval controls for sensitive operations.
- Security baseline (auth/session hardening, API authz, dependency and secret hygiene).
- Booking/payment observability with SLO-driven alerting.
- Backup/restore drills, DR runbooks, data lifecycle/privacy workflows, and release safety controls.

**Should have (competitive):**
- Revenue integrity command center.
- Intelligent retry/fallback orchestration.
- Property reliability scoring in ranking.
- Proactive guest trust automation during disruptions.

**Defer (v2+):**
- Operations policy engine with simulation/versioning.
- Real-time ML risk scoring platform.
- Dynamic pricing engine and broad loyalty economics.
- Active-active multi-region architecture.

### Architecture Approach

Architecture research recommends a modular monolith with strict boundaries: thin API transport in `app/api/*`, business orchestration in `src/modules/*`, and database constraints/policies as primary correctness controls. The pivotal patterns are transactional finalization with idempotency keys, webhook inbox plus asynchronous reconciler, and dual-control admin commands with immutable audit.

**Major components:**
1. Booking Finalization Orchestrator - validates signed quotes, applies idempotency/locking, and commits state transitions transactionally.
2. Webhook Intake + Reconciliation Worker - stores provider events first, then applies deterministic idempotent state repair asynchronously.
3. Admin Control Plane - executes bounded override/retry/refund actions with RBAC, reason codes, and full audit snapshots.
4. Observability Pipeline - correlation IDs, structured logs, traces, and booking-centric metrics/SLO alerts.

### Critical Pitfalls

1. **Privilege-bypassable admin authz** - avoid with server-side RBAC/ABAC, least privilege, step-up auth, and mandatory audit logs.
2. **Missing CSRF protections on cookie-auth mutations** - avoid with CSRF tokens, Origin/Referer checks, secure cookie policy, and regression tests.
3. **Non-idempotent booking/payment workflows** - avoid with operation keys, dedupe at every layer, uniqueness constraints, and async reconciliation.
4. **Hold/capture and booking state desynchronization** - avoid with explicit state machine + saga compensation + TTL enforcement.
5. **Retry/fallback policies that amplify incidents** - avoid with per-hop timeouts, classified retries + jitter, circuit breakers, durable queues, and DLQ replay drills.

## Implications for Roadmap

Based on combined research, the roadmap should follow four hardening phases that map directly to dependency order and risk containment.

### Phase 1: Security Boundary Lockdown
**Rationale:** Security defects (secret leaks, weak admin authz, missing CSRF) are launch-blocking and can invalidate later work if left open.
**Delivers:** Server-only secret boundaries, key rotation + scanning gates, RBAC/ABAC policy matrix, CSRF protections/tests, hardened session/cookie posture.
**Addresses:** Security baseline, RBAC/audit foundations, safe release preconditions.
**Avoids:** Pitfalls 1-3 (authz bypass, CSRF gaps, secret exposure).

### Phase 2: Booking and Revenue Integrity Core
**Rationale:** Money correctness depends on canonical data/state model before resilience or automation layers.
**Delivers:** Transactional finalization path, idempotent booking/payment mutations, inventory hold-confirm-expire state machine, immutable ledger, reconciliation jobs, pricing parity tests.
**Uses:** Supabase constraints/RLS, LiteAPI adapter contracts, Redis locks/idempotency (or DB fallback).
**Implements:** Booking Finalization Orchestrator + core data model.
**Addresses:** P1 integrity features from FEATURES.md.
**Avoids:** Pitfalls 4-6 (dupes, hold/capture drift, pricing mismatch).

### Phase 3: Async Reliability and Degradation Control
**Rationale:** Once correctness is stable, reliability controls can be tuned without masking logic defects.
**Delivers:** Webhook inbox separation, reconciler worker, durable fallback queue + DLQ replay tooling, timeout/retry/circuit-breaker policy, load/soak/spike/chaos validation.
**Uses:** `cockatiel`-style resilience policies, Redis rate limits/cache, Sentry/OTel instrumentation.
**Implements:** Webhook Intake + Reconciliation Worker boundaries.
**Addresses:** Retry/fallback differentiators and resilience table stakes.
**Avoids:** Pitfalls 7-9 (cascading retries, non-durable fallback, unrealistic load assumptions).

### Phase 4: Launch Operations and Controlled Expansion
**Rationale:** Final phase converts hardened flows into operable launch posture and prepares safe post-launch improvements.
**Delivers:** Booking-centric SLO dashboards/alerts, runbooks + game days, migration rollback playbooks, admin control plane completion, canary/feature-flag governance, revenue integrity command center (v1.x).
**Addresses:** Safe release controls, observability, DR, and early differentiators.
**Avoids:** Pitfall 10 (underprepared launch operations).

### Phase Ordering Rationale

- Security first because exposed credentials or weak authz can force emergency rollback regardless of feature completeness.
- Integrity second because reconciliation/fallback logic requires canonical booking states and immutable financial records.
- Resilience third because timeout/retry tuning is only meaningful after correctness invariants are enforced.
- Launch ops last to validate and operationalize completed systems with realistic drills and SLO gates.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3:** Supplier-specific rate-limit/error taxonomy and fallback contracts may vary by LiteAPI endpoints and need `/gsd-research-phase` to tune policies.
- **Phase 4:** Compliance details for privacy retention/deletion and audit evidence expectations may require jurisdiction-specific validation.

Phases with standard patterns (skip research-phase):
- **Phase 1:** RBAC/CSRF/secret scanning/session hardening are well-documented security patterns with high-quality references.
- **Phase 2:** Idempotency + state machine + ledger/reconciliation are mature OTA/payments patterns with clear implementation guidance.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Backed by official Next.js/Supabase/LiteAPI/Upstash/Sentry docs with explicit version and security guidance. |
| Features | MEDIUM | Strong consensus from standards and industry patterns, but some differentiator prioritization is strategic inference. |
| Architecture | MEDIUM | Clear patterns and sequencing, but partially derived from internal context rather than vendor reference architectures. |
| Pitfalls | MEDIUM | High face validity and incident-pattern alignment, but sources are partly generalized industry learnings. |

**Overall confidence:** MEDIUM

### Gaps to Address

- Supplier contract specifics: LiteAPI SLA semantics, throttling tiers, and webhook delivery guarantees should be validated against the exact commercial plan before final resilience targets.
- Compliance scope detail: map retention/deletion and audit controls to concrete legal regions (GDPR/PCI scope boundaries) during phase planning.
- Operational thresholds: finalize numeric SLO/error-budget targets and alert thresholds using baseline production telemetry.
- DR realism: validate RTO/RPO claims with full restore/game-day evidence, not documentation-only readiness.

## Sources

### Primary (HIGH confidence)
- Next.js official docs/blog (`nextjs.org`) - version requirements, auth/server security, deprecations, patch urgency.
- Supabase official docs (`supabase.com/docs`) - SSR auth patterns, key model, JWT verification, RLS hardening.
- LiteAPI official docs (`docs.liteapi.travel`) - reliability/rate limits, security posture, commission/SSP handling.
- Upstash official docs (`upstash.com/docs`) - HTTP-native distributed rate limiting/cache patterns.
- Stripe official docs (`stripe.com/docs/webhooks`) - webhook signature, duplicate-event handling, async processing.

### Secondary (MEDIUM confidence)
- OWASP ASVS/API Security/Transaction Authorization guidance - security and transaction-control best practices.
- Google SRE SLI/SLO guidance - incident readiness, error budgets, and reliability operations.
- OTA/commerce operational patterns referenced across research - ledger/reconciliation and booking integrity conventions.

### Tertiary (LOW confidence)
- Internal architecture interpretation and inferred sequencing decisions from current codebase context - validate with implementation spikes in roadmap planning.

---
*Research completed: 2026-02-23*
*Ready for roadmap: yes*
