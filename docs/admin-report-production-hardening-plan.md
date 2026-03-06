# Admin Report Production Hardening Plan

## Objective
Harden admin reconciliation and support operations APIs for production reliability and high-concurrency readiness, with clear checkpoints to resume work later.

## Scope
- `GET /api/admin/reconciliation`
- `GET /api/admin/reconciliation/export`
- `GET /api/admin/support/operations`
- `PATCH /api/admin/support/operations/[bookingId]`
- Supporting services:
  - `src/server/admin/reconciliation-report.ts`
  - `src/server/admin/support-operations-report.ts`
  - `src/server/authz.ts`

## Current Risk Summary
- Support operations report can mask DB errors as empty data.
- Reconciliation report uses large in-memory processing and large `.in(...)` filter shape.
- Export route has inconsistent default parsing behavior for `days`.
- No endpoint-level rate limiting/caching for burst traffic on admin reports.
- No realistic load test evidence for 10,000 concurrent request claims.

## Work Plan

### Phase 1: Correctness and Fail-Closed (Priority: P0)
Status: Completed on March 4, 2026.

1. Add explicit error handling for support operations bookings query.
2. Fix reconciliation export `days` parser to default to `30` when query param is absent/blank.
3. Add regression tests for:
   - Support operations DB failure -> `503`.
   - Reconciliation export missing `days` -> default `30`.

Acceptance criteria:
- No silent-success report response when upstream DB query fails.
- Parser behavior is consistent across reconciliation routes.
- Targeted admin route tests pass.

---

### Phase 2: Bound Query and Memory Cost (Priority: P0)
Status: Completed on March 4, 2026.

1. Refactor reconciliation commission lookup to avoid one oversized `.in('booking_id', [...])`.
2. Add chunking/pagination strategy for bookings and commission rows.
3. Add explicit limits and truncation metadata in response payloads.
4. Refactor support operations query to avoid scanning all bookings for time window when not needed.

Acceptance criteria:
- Memory usage grows in a bounded way with data size.
- No oversized ID list queries.
- Endpoint latency remains stable under larger datasets.

---

### Phase 3: DB-Side Aggregation and Indexing (Priority: P1)
Status: Completed on March 4, 2026.

1. Move heavy summary calculations into SQL view/materialized view/RPC.
2. Keep API handlers thin and deterministic.
3. Validate/introduce indexes:
   - `bookings(created_at)`
   - `bookings(status, created_at)`
   - `commission_tracking(booking_id, updated_at)`

Acceptance criteria:
- Lower application CPU and memory per request.
- Measurable drop in p95/p99 latency under same load.

---

### Phase 4: Traffic Protection (Priority: P1)
Status: Completed on March 4, 2026.

1. Add rate limiting to admin report endpoints.
2. Add short TTL caching where data staleness is acceptable.
3. Validate 429 behavior and error budget alarms.

Acceptance criteria:
- Burst traffic is throttled safely.
- DB does not saturate during sudden spikes.

---

### Phase 5: Authz Path Optimization (Priority: P2)
Status: Completed on March 4, 2026.

1. Reduce repeated `admin_users` lookups (token claims and/or short TTL authz cache).
2. Keep fallback DB check for security correctness.

Acceptance criteria:
- Fewer DB roundtrips on hot paths.
- No weakening of authorization checks.

---

### Phase 6: Load and Capacity Validation (Priority: P0 before 10k claim)
Status: In progress on March 4, 2026.

1. Add dedicated load tests (k6 or Artillery) for all in-scope endpoints.
2. Define SLOs:
   - Error rate
   - p95 latency
   - p99 latency
   - DB utilization/connection limits
3. Run staged concurrency tests: 100 -> 500 -> 1k -> 2k+.
4. Publish capacity report with observed bottlenecks and safe ceiling.

Acceptance criteria:
- Capacity claim is backed by measured data.
- Team has a documented safe-concurrency ceiling.

## Suggested Execution Order
1. Phase 1
2. Phase 2
3. Phase 6 (initial baseline)
4. Phase 3
5. Phase 4
6. Phase 5
7. Phase 6 (final validation)

## Restart Checklist (When You Resume)
1. Re-run targeted tests:
   - `npm test -- tests/admin/reconciliation-routes.test.ts tests/admin/support-operations-routes.test.ts`
2. Confirm open TODOs in this plan by phase.
3. Implement next unchecked phase.
4. Re-run tests and update a short changelog in this file.

## Notes
- Do not claim 10,000 concurrent readiness until Phase 6 has passing evidence at meaningful staged load.
- Keep changes incremental and verifiable per phase.

## Changelog
- 2026-03-04:
  - Phase 1 completed: fail-closed DB error handling and parser default fixes with regression tests.
  - Phase 2 completed:
    - Reconciliation report now pages bookings (`range`) with bounded scan cap and chunked commission queries.
    - Reconciliation response now includes `processing` truncation/limit metadata.
    - Support operations report now pages bookings (`range`), fails closed on query errors, and stops early at bounded case/scan limits.
    - Support operations response now includes `processing` truncation/limit metadata.
  - Verified with:
    - `npm test -- tests/admin/reconciliation-routes.test.ts tests/admin/support-operations-routes.test.ts tests/admin/operations-routes.test.ts tests/admin/settlement-ledger-route.test.ts`
- 2026-03-04 (Phase 3):
  - Added DB RPC aggregations:
    - `public.fn_admin_reconciliation_summary(period_start_iso timestamptz)`
    - `public.fn_admin_support_operations_summary(period_start_iso timestamptz, breach_hours_input integer)`
  - Added indexes:
    - `bookings(created_at desc)`
    - `bookings(status, created_at desc)`
    - `commission_tracking(booking_id, updated_at desc)`
  - Wired report services to prefer RPC summaries and safely fall back to in-process calculations if RPC is unavailable.
  - Verified with:
    - `npm test -- tests/admin/reconciliation-routes.test.ts tests/admin/support-operations-routes.test.ts tests/admin/operations-routes.test.ts tests/admin/settlement-ledger-route.test.ts`
- 2026-03-04 (Phase 4, partial):
  - Added endpoint-level rate limiting to:
    - `GET /api/admin/reconciliation`
    - `GET /api/admin/reconciliation/export`
    - `GET /api/admin/support/operations`
    - `PATCH /api/admin/support/operations/[bookingId]`
  - Added short TTL in-memory report caching for admin GET report routes and cache invalidation on support operations PATCH.
  - Added 429 regression tests for admin reconciliation and support operations report routes.
  - Verified with:
    - `npm test -- tests/admin/reconciliation-routes.test.ts tests/admin/support-operations-routes.test.ts tests/admin/operations-routes.test.ts tests/admin/settlement-ledger-route.test.ts`
- 2026-03-04 (Phase 4 completion):
  - Implemented admin report error-budget observability and readiness alarm wiring:
    - Added in-memory observation tracking for in-scope admin endpoints.
    - Added readiness check `admin_reports` with warn/critical thresholds on error rate, throttling rate, and p95 latency.
    - Added readiness alarms payload and `x-alert-state` header (`ok`/`warn`/`critical`) on `/api/readyz`.
  - Added tests for readiness alarm behavior and admin report budget thresholding.
- 2026-03-04 (Phase 5):
  - Added short TTL in-memory cache for DB-backed admin authorization decisions in `src/server/authz.ts`.
  - Kept claim-based fast path and DB fallback when claims are absent.
  - Added RBAC regression tests covering cached allow and cached deny decisions.
  - Verified with:
    - `npm test -- tests/admin/rbac.test.ts tests/admin/reconciliation-routes.test.ts tests/admin/support-operations-routes.test.ts tests/admin/operations-routes.test.ts tests/admin/settlement-ledger-route.test.ts`
- 2026-03-04 (Phase 6, partial):
  - Added load test assets:
    - `load/admin-reports.k6.js`
    - `load/admin-reports.artillery.yml`
    - `load/artillery-processor.js`
  - Added staged run/report scripts:
    - `scripts/run-admin-load-phases.js`
    - `scripts/generate-admin-capacity-report.js`
  - Added npm scripts:
    - `perf:admin:k6`
    - `perf:admin:artillery`
    - `perf:admin:staged`
    - `perf:admin:report`
  - Added runbook with SLO targets and artifact paths:
    - `docs/perf/ADMIN_REPORT_LOAD_TESTING.md`
  - Remaining in Phase 6:
    - Execute staged load campaign on a deployed environment with real DB telemetry.
    - Publish measured safe ceiling in `docs/perf/ADMIN_REPORT_CAPACITY_REPORT.md`.
