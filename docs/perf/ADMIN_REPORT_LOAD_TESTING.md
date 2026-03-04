# Admin Report Load Testing Runbook

## Scope
- `GET /api/admin/reconciliation`
- `GET /api/admin/reconciliation/export`
- `GET /api/admin/support/operations`
- `PATCH /api/admin/support/operations/[bookingId]` (separate write validation run)

## SLO Targets
- Error rate: `< 1%`
- p95 latency: `< 800ms`
- p99 latency: `< 1500ms`
- No sustained DB saturation (CPU/IO/connection pool) at validated ceiling

## Required Environment
- `PERF_BASE_URL` (example: `https://staging.example.com`)
- `ADMIN_JWT` (admin bearer token for test account)

## Commands
1. Single k6 run:
   - `npm run perf:admin:k6`
2. Staged concurrency campaign (`100 -> 500 -> 1000 -> 2000`):
   - `npm run perf:admin:staged`
3. Generate report from staged summaries:
   - `npm run perf:admin:report`
4. Alternative Artillery run:
   - `npm run perf:admin:artillery`

## Artifacts
- k6 stage summaries:
  - `docs/perf/admin-load-results/k6-summary-100.json`
  - `docs/perf/admin-load-results/k6-summary-500.json`
  - `docs/perf/admin-load-results/k6-summary-1000.json`
  - `docs/perf/admin-load-results/k6-summary-2000.json`
- Generated capacity report:
  - `docs/perf/ADMIN_REPORT_CAPACITY_REPORT.md`

## Pass/Fail Rule
- Stage is considered passing only if all SLOs hold and DB telemetry remains within safe limits.
- Safe concurrency ceiling is highest passing stage.
- Do not claim 10k readiness without additional staged evidence beyond 2k and stable DB telemetry.
