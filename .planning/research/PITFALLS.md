# Pitfalls Research

**Domain:** OTA hotel booking web app launch hardening (existing app, pre-launch)
**Researched:** 2026-02-23
**Confidence:** MEDIUM

## Hardening Phases (for mapping)

- **Phase 1 - Security Baseline Lockdown:** Secrets, authz, CSRF/session defenses, compliance guardrails.
- **Phase 2 - Booking Integrity and Money Correctness:** Inventory consistency, idempotency, pricing/tax parity.
- **Phase 3 - Resilience and Scale Validation:** Timeouts/retries/circuit breakers, durability, load and failure testing.
- **Phase 4 - Launch Readiness and Safe Operations:** Observability, runbooks, migration/release safety, game days.

## Critical Pitfalls

### Pitfall 1: Admin auth looks "secure" but is privilege-bypassable

**What goes wrong:**
Admin and support endpoints rely on frontend checks or coarse roles; operators can access actions outside intended scope.

**Why it happens:**
Teams retrofit admin features late, skip resource-level authorization, and treat internal users as trusted.

**How to avoid:**
Implement server-side RBAC/ABAC at handler level, enforce least privilege, require step-up auth for destructive actions, and audit every admin mutation.

**Warning signs:**
Single `admin=true` flag, missing policy tests, support tools calling undocumented endpoints directly, no immutable audit trail for overrides/refunds.

**Phase to address:**
Phase 1 - Security Baseline Lockdown

---

### Pitfall 2: CSRF protections are missing on cookie-authenticated flows

**What goes wrong:**
State-changing endpoints (profile updates, booking changes, refunds) accept forged cross-site requests.

**Why it happens:**
Teams assume SameSite cookies alone are enough or only protect public forms, not admin/backoffice tooling.

**How to avoid:**
Use CSRF tokens for all cookie-auth mutations, validate Origin/Referer, enforce SameSite and secure cookie attributes, and test CSRF in integration suites.

**Warning signs:**
`POST/PUT/DELETE` routes without token validation, mixed auth modes (cookie + bearer) with unclear middleware, no CSRF regression tests.

**Phase to address:**
Phase 1 - Security Baseline Lockdown

---

### Pitfall 3: Secrets leak through client bundles, logs, or CI artifacts

**What goes wrong:**
Supplier keys, payment secrets, or signing credentials are exposed in browser code, error payloads, screenshots, or build logs.

**Why it happens:**
Inconsistent env var naming, debug logging in production, and no automated secret scanning at commit/build time.

**How to avoid:**
Enforce server-only secret boundaries, redact logs by default, rotate keys before launch, add pre-commit and CI secret scanning, and block deploys on leaks.

**Warning signs:**
Secrets prefixed for public exposure, verbose request/response logs from PSP/supplier APIs, no key rotation runbook.

**Phase to address:**
Phase 1 - Security Baseline Lockdown

---

### Pitfall 4: Booking creation is not idempotent end-to-end

**What goes wrong:**
Retrying create/cancel/modify calls produces duplicate bookings, duplicate charges, or inconsistent cancellation status.

**Why it happens:**
Idempotency is implemented only at payment layer or only at API edge, not across booking workflow and supplier adapters.

**How to avoid:**
Require idempotency keys on booking mutations, persist operation state transitions, dedupe at gateway + service + provider adapter, and reconcile asynchronously.

**Warning signs:**
Duplicate confirmations for same cart/user/timestamp, manual finance reversals increasing, retries implemented via naive loop.

**Phase to address:**
Phase 2 - Booking Integrity and Money Correctness

---

### Pitfall 5: Inventory hold and payment capture are not transactionally coordinated

**What goes wrong:**
Rooms are oversold, holds expire before capture, or successful payments end with failed reservations.

**Why it happens:**
Teams treat payment and supplier reservation as independent API calls without compensating transactions.

**How to avoid:**
Define explicit booking state machine (hold -> confirm -> ticket), use saga/compensation for partial failures, enforce hold TTL checks, and isolate finalization logic.

**Warning signs:**
Frequent "payment succeeded but booking failed" tickets, negative inventory spikes, manual intervention queues growing.

**Phase to address:**
Phase 2 - Booking Integrity and Money Correctness

---

### Pitfall 6: Price/tax/fee calculations differ across search, checkout, and confirmation

**What goes wrong:**
Displayed totals change late, margins are eroded, and customer disputes increase due to mismatch between quoted and charged amounts.

**Why it happens:**
Multiple pricing implementations exist (frontend, backend, supplier adapter) with divergent rounding and tax rules.

**How to avoid:**
Create a single pricing engine/service as source of truth, version pricing rules, lock quote snapshots at checkout, and add golden tests for tax/FX/rounding edge cases.

**Warning signs:**
Revenue reconciliation deltas, many "price changed" events near payment step, inconsistent totals by channel/currency.

**Phase to address:**
Phase 2 - Booking Integrity and Money Correctness

---

### Pitfall 7: Timeout/retry policy causes cascading failures or user-visible flakiness

**What goes wrong:**
Slow dependencies tie up workers, retries amplify load, and users see random failures during supplier or PSP degradation.

**Why it happens:**
No per-integration timeout budget, no circuit breakers/bulkheads, and identical retry strategy for all error classes.

**How to avoid:**
Set per-hop timeout budgets, classify retryable errors, add exponential backoff + jitter, implement circuit breakers, and cap concurrent in-flight requests.

**Warning signs:**
P95/P99 latency inflation before incidents, thread/connection pool exhaustion, synchronized retry storms in logs.

**Phase to address:**
Phase 3 - Resilience and Scale Validation

---

### Pitfall 8: Fallback paths are fast but not durable

**What goes wrong:**
When primary integrations fail, fallback queues/caches drop booking intents or lose ordering, causing silent booking loss.

**Why it happens:**
Fallback is designed for availability demos, not recovery guarantees (durable queue, replay, idempotent consumers, DLQ visibility).

**How to avoid:**
Use durable messaging for booking-critical fallbacks, define replayable event contracts, require DLQ monitoring and replay tooling, and verify exactly-once effect via idempotent handlers.

**Warning signs:**
Gap between accepted requests and downstream confirmations, no replay procedure, fallback workers with best-effort logging only.

**Phase to address:**
Phase 3 - Resilience and Scale Validation

---

### Pitfall 9: Load tests ignore real booking traffic shape

**What goes wrong:**
System appears healthy in synthetic tests but fails at launch due to bursty searches, checkout contention, and third-party throttling.

**Why it happens:**
Teams test average RPS only, not spike profiles, cache-miss storms, lock contention, or supplier rate-limit behavior.

**How to avoid:**
Model realistic traffic (search-heavy + spiky checkout), run soak + spike + chaos tests, include third-party throttling simulations, and verify degradation modes.

**Warning signs:**
Good benchmark numbers but poor canary behavior, DB lock waits under burst, rate-limit errors concentrated around campaigns.

**Phase to address:**
Phase 3 - Resilience and Scale Validation

---

### Pitfall 10: Launch ops are underprepared (observability/runbooks/migrations)

**What goes wrong:**
Incidents take too long to detect and triage; risky schema/config changes disrupt active bookings during launch window.

**Why it happens:**
Monitoring focuses on infra uptime, not booking SLOs; release plans skip rollback drills and booking-safe migration patterns.

**How to avoid:**
Define booking-centric SLOs (search->book conversion, confirmation latency, payment-success-to-book-success ratio), instrument end-to-end tracing, rehearse incident runbooks, and use expand/contract migrations with rollback playbooks.

**Warning signs:**
No alert tied to booking success ratio, missing owner/escalation matrix, migrations requiring downtime or blocking writes.

**Phase to address:**
Phase 4 - Launch Readiness and Safe Operations

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoded supplier-specific rules in checkout | Ships connector quickly | Fragile branching and pricing drift | Only behind short-lived feature flag with retirement date |
| Skipping idempotency persistence | Less schema/workflow complexity | Duplicate bookings/charges during retries | Never |
| Manual key handling in env files | Fast setup | Secret sprawl and rotation failure | Never |
| One shared admin super-role | Faster ops tooling | Privilege abuse and no accountability | Only in isolated staging, never production |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Hotel supplier API | Assume reservation confirmation is immediate/final | Model async confirmation states and reconciliation jobs |
| Payment gateway | Retry charge requests without idempotency key | Require idempotency key and store gateway correlation IDs |
| Email/SMS notifications | Treat send success as booking success | Trigger notifications from confirmed booking state only |
| Fraud/risk provider | Block booking path on slow risk score | Use bounded wait + fallback decision policy |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Synchronous fan-out to multiple suppliers in request path | Long tail latency and timeouts | Parallelize with strict timeout budget + partial result policy | Campaign spikes or supplier slowness |
| Cache stampede on search metadata | DB CPU spikes after cache expiry | Request coalescing, staggered TTL, warmup jobs | 5k+ concurrent search users |
| Shared DB pool for reads/writes/background jobs | Booking latency jitter and deadlocks | Separate pools/queues and priority for booking writes | Under burst + reconciliation jobs |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing partner API keys in frontend runtime vars | Partner abuse, contract breach | Enforce server-only secret policy and build-time checks |
| Weak admin session controls (long-lived tokens/no MFA) | Account takeover and high-impact fraud | Short session TTL, MFA, device/IP anomaly checks |
| Missing anti-automation on booking/payment endpoints | Card testing and inventory abuse | Rate limits, bot detection, velocity rules, challenge flows |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Price changes appear only at final submit | Trust loss and cart abandonment | Surface quote expiry and reprice events early |
| Unclear pending/confirmed booking states | Duplicate user retries and support load | Explicit status timeline with actionable next step |
| Generic payment failure messaging | Repeated failed attempts and frustration | Error classes with guidance (retry, new card, contact support) |

## "Looks Done But Isn't" Checklist

- [ ] **Booking flow:** Works in happy path, but not idempotent under retry/refresh.
- [ ] **Pricing:** UI totals match backend for simple cases, but tax/FX/rounding edge cases unverified.
- [ ] **Security:** Auth implemented, but CSRF/admin policy tests missing.
- [ ] **Fallbacks:** Queue exists, but replay/DLQ/ordering guarantees untested.
- [ ] **Scalability:** Load test passed, but no spike + dependency-failure scenario.
- [ ] **Operations:** Dashboards exist, but no on-call runbook drill for booking incident.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Duplicate bookings/charges | HIGH | Freeze retries, reconcile by idempotency key, auto-refund duplicates, notify affected users |
| Pricing mismatch in production | HIGH | Disable affected fare rules, reprice queued checkouts, run revenue reconciliation and compensations |
| Secret leak | HIGH | Revoke/rotate keys immediately, invalidate sessions/tokens, audit access logs, ship postmortem controls |
| Supplier outage with lost intents | MEDIUM-HIGH | Drain durable queue, replay with dedupe, apply customer communication template and SLA credits |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Admin privilege bypass | Phase 1 | Authorization matrix tests + admin action audit log review |
| Missing CSRF on cookie-auth mutations | Phase 1 | Automated CSRF integration tests pass for all mutation routes |
| Secret exposure | Phase 1 | CI secret scan clean + key rotation drill completed |
| Missing idempotency | Phase 2 | Replay test produces no duplicate booking/charge effects |
| Hold/capture inconsistency | Phase 2 | Chaos test of partial failures resolves via saga compensation |
| Pricing/tax mismatch | Phase 2 | Golden pricing suite + daily revenue reconciliation within threshold |
| Timeout/retry cascade | Phase 3 | Load + dependency-failure test shows bounded latency and error budget compliance |
| Non-durable fallback | Phase 3 | DLQ replay drill recovers all intents without duplication |
| Unrealistic load testing | Phase 3 | Spike/soak/campaign simulation meets booking SLO targets |
| Weak launch operations | Phase 4 | Game day + rollback drill meet MTTR and rollback objectives |

## Sources

- Internal context provided for this milestone: known risk areas (secret leaks, weak admin authorization, missing CSRF, durability concerns, revenue mismatch, timeout policy, scalability uncertainty).
- Industry-standard OTA/commerce launch incident patterns (idempotency, oversell prevention, payment-booking coordination, and reconciliation controls).

---
*Pitfalls research for: OTA hotel booking web app production hardening*
*Researched: 2026-02-23*
