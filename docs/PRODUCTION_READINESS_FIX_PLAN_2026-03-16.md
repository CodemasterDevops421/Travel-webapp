# Production Readiness Fix Plan - 2026-03-16

Source audit: `docs/PRODUCTION_READINESS_AUDIT_2026-03-16.md`

## Goal
Turn the current system from `NOT READY FOR PRODUCTION` into `CONDITIONALLY READY AFTER FIXING BLOCKERS` with a sequence that reduces security, money, and data-corruption risk first.

## Execution Order

### Phase 0 - Release Freeze and Safety Rails
Status: must do first

Objectives:
- Stop unsafe production rollout while fixes are in flight.
- Prevent false-green deploys.

Tasks:
- Remove placeholder production secrets from `src/server/env.ts`.
- Make startup fail in production when required env vars are missing or placeholder values.
- Make `/api/readyz` block traffic on invalid config and critical dependency failure.
- Keep `/api/healthz` shallow, but make platform readiness use `/api/readyz`.
- Add a temporary release freeze rule: no merge to deploy branch without passing `typecheck`, `test`, and readiness checks.

Exit criteria:
- App cannot boot in production with fake keys.
- A broken config deploy is marked not ready.

### Phase 1 - Booking/Authz/Money Integrity Blockers
Status: P0

Objectives:
- Eliminate the easiest paths to unauthorized booking access.
- Make duplicate booking/payment records impossible at the DB layer.
- Make checkout quote integrity deterministic.

Tasks:
- Lock down `src/app/api/booking/status/route.ts`:
  - require authenticated ownership verification;
  - stop returning `bookingViewToken` and `confirmationCode`;
  - replace return URL `transactionId` usage with one-time opaque server nonce.
- Add `bookings.transaction_id` as a first-class unique column.
- Backfill existing booking rows from metadata into `transaction_id`.
- Refactor all booking lookups/writes in `src/server/booking/repository.ts`, `src/app/api/booking/book/route.ts`, and `src/app/api/webhooks/stripe/route.ts` to use `transaction_id`.
- Add DB uniqueness for payment log idempotency in `payment_logs`.
- Convert payment log writes to upsert/insert-on-conflict.
- Fix promo flow so `/api/promo/validate` updates the authoritative prebook session or move promo application before prebook.
- Add invariant checks so final booking cannot proceed with mismatched quote/signature state.

Exit criteria:
- One real payment maps to one canonical booking row.
- Replayed webhooks do not create duplicate payment or booking records.
- Promo-applied checkout completes successfully end-to-end.
- Booking status endpoint no longer grants access from leaked identifiers.

Required tests:
- webhook replay twice -> still one booking row, one canonical payment log sequence;
- finalize + webhook race -> one booking row only;
- promo -> prebook -> payment return -> finalize;
- unauthorized booking status lookup returns `401`/`403`;
- leaked transaction URL cannot mint view access.

### Phase 2 - Checkout Session Security and Client-State Hardening
Status: P0

Objectives:
- Remove sensitive checkout state from browser-readable storage.
- Prevent stale or wrong-session restoration.

Tasks:
- Remove `sessionSignature`, `quoteSignature`, guest data, and holder data from `localStorage` and `sessionStorage` in `src/features/booking/components/booking-console.tsx`.
- Replace client-stored checkout session with server-side persisted state referenced by a short-lived opaque token in an `HttpOnly` cookie.
- Require the current authenticated user and current booking fingerprint to match before restoring a session.
- Prevent auto-transition to confirmation when restored state does not match current route context.
- Review booking return flow in `src/app/booking/return/booking-return-client.tsx` to use server session recovery only.

Exit criteria:
- Browser storage no longer contains booking secrets or traveler PII.
- Opening a new booking flow cannot silently restore another transaction.

Required tests:
- wrong property/offer does not restore prior checkout;
- restored checkout requires valid opaque session;
- no PII/signature material is written to Web Storage.

### Phase 3 - Supplier Resilience and Traffic Survival
Status: P0

Objectives:
- Stop supplier-backed endpoints from collapsing under burst traffic or dependency slowness.

Tasks:
- Replace `src/server/cache.ts` with:
  - single-flight lock;
  - negative caching;
  - stale-while-revalidate;
  - jittered TTLs.
- Create one shared LiteAPI request wrapper with:
  - `AbortController` timeout;
  - capped retries;
  - status-aware retry policy;
  - circuit-breaker behavior;
  - structured error classification.
- Route all supplier calls in `src/server/liteapi.ts` through that helper.
- Simplify search fallback logic to one primary path plus one bounded fallback.
- Break hotel detail assembly into independently cached fragments.
- Stop synchronously fetching multiple review pages on cold path.

Exit criteria:
- Hot-key cache misses do not cause request stampedes.
- Supplier hangs fail fast within a bounded timeout budget.
- Search and hotel detail p95 remains stable under load tests.

Required tests:
- cache negative-result reuse;
- concurrent same-key misses trigger one upstream call;
- supplier timeout returns degraded response, not hung request;
- search fallback count stays within defined maximum.

Mandatory load tests:
- autocomplete burst;
- property-preview burst;
- hotel detail cold-cache traffic;
- booking prebook/book traffic with injected LiteAPI latency.

### Phase 4 - Database Safety and Access Control
Status: P1

Objectives:
- Make DB constraints match runtime assumptions.
- Reduce blast radius with DB-level access controls.

Tasks:
- Enable RLS on booking, payment, analytics, and user-adjacent tables.
- Add explicit policies for end-user access and admin-only access.
- Audit every service-role query path in `src/server/supabase/admin.ts` consumers.
- Regenerate `supabase/schema.sql` or remove it as canonical source if migrations are the source of truth.
- Review indexes for transaction, booking lookup, reconciliation, and admin reporting paths.
- Move JSON metadata lookups that are part of core identity to first-class columns.

Exit criteria:
- Core data integrity is DB-enforced.
- Sensitive tables are not relying only on app-layer access control.

### Phase 5 - Durable Outbox, Ops, and Deployment Controls
Status: P1

Objectives:
- Make booking side effects auditable and retryable.
- Make deploys observable and reversible.

Tasks:
- Replace in-memory outbox in `src/server/booking/outbox.ts` with a DB-backed outbox table.
- Write outbox records in the same transaction as booking state mutations.
- Process outbox via a worker/cron with retries, dead-letter state, and metrics.
- Add CI/CD stages for:
  - migration validation against staging;
  - deploy smoke tests;
  - readiness verification;
  - rollback instructions or automated rollback gate.
- Add container `HEALTHCHECK` and align infra to use readiness probe.

Exit criteria:
- Notifications and critical side effects survive restarts/deploys.
- Production deploys have real preflight and post-deploy validation.

### Phase 6 - Observability, Admin Scale, and Compliance
Status: P1

Objectives:
- Make production incidents detectable and diagnosable.
- Reduce operational blind spots and compliance exposure.

Tasks:
- Add durable metrics for booking, prebook, payment, webhook, support handoff, rate-limit hits, supplier timeout, and readiness status.
- Add tracing/span coverage around booking and supplier calls.
- Stop logging raw supplier error bodies; parse-and-redact before logging.
- Move admin reports toward indexed SQL/materialized views and shared cache.
- Surface truncation explicitly in admin/report APIs.
- Define booking PII retention and purge workflow.
- Document legal/compliance boundaries for traveler data retention and deletion.

Exit criteria:
- Incidents can be detected from dashboards/alerts, not only user reports.
- Booking PII has defined retention and deletion controls.

### Phase 7 - Contract Cleanup and Test Strategy Upgrade
Status: P2

Objectives:
- Remove contract drift and weak regression coverage.

Tasks:
- Share one validation schema for hotel rates between SSR and API entry points.
- Make invalid property-preview requests return `400`, not empty `200`.
- Align pricing contracts across property and booking screens using explicit fields like `stayTotalAmount`, `nightlyAverageAmount`, and `taxesAndFeesAmount`.
- Replace string-based checkout tests with runtime integration/component tests.
- Add focused E2E coverage for the booking funnel.

Exit criteria:
- Contracts are validated consistently across all entry points.
- Checkout regressions are caught behaviorally.

## Team Split Recommendation

### Workstream A - Security and Access Control
- booking status authz
- RLS
- browser storage removal
- logging redaction

### Workstream B - Booking and Payment Integrity
- transaction_id migration
- webhook/finalize idempotency
- payment_logs unique constraints
- promo/prebook quote authority

### Workstream C - Performance and Reliability
- cache redesign
- LiteAPI timeout/retry wrapper
- search/detail cold-path simplification
- admin query optimization

### Workstream D - Platform and Operations
- env/startup/readiness hardening
- outbox worker
- CI/CD rollout gates
- metrics/tracing/alerts

## Suggested Milestone Sequence
- Milestone 1: Phase 0 + Phase 1
- Milestone 2: Phase 2 + Phase 3
- Milestone 3: Phase 4 + Phase 5
- Milestone 4: Phase 6 + Phase 7

## Definition of Done for Go-Live Reassessment
- All Phase 0 and Phase 1 work merged and verified.
- All Phase 2 and Phase 3 controls implemented or explicitly risk-accepted with evidence.
- Load test evidence exists for search, hotel detail, prebook, booking finalize, and webhook replay.
- Runbooks exist for webhook backlog, provider outage, stuck booking, and rollback.
- Dashboards and alerts exist for booking conversion, supplier failures, webhook failures, duplicate prevention, and readiness.
- Security review confirms no token minting via leaked identifiers and no readable checkout secrets in browser storage.

## Immediate Next 10 Tasks
1. Add `transaction_id` migration with uniqueness and backfill plan.
2. Patch `/api/booking/status` to require ownership and stop returning booking view tokens.
3. Design server-side checkout session replacement for browser storage.
4. Add unique payment-log constraint and upsert path.
5. Remove placeholder env defaults and fail production startup on invalid config.
6. Build shared LiteAPI request helper with timeout/retry/circuit-breaker semantics.
7. Add cache single-flight and negative caching.
8. Fix promo flow to update authoritative prebook state.
9. Replace in-memory booking outbox with DB-backed outbox table.
10. Add booking/webhook/promo integration tests and replay race tests.
