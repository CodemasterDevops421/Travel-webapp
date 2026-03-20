# Approved: Final Environment Validation Gate

This document is the operational launch-clearance procedure for the hardening work already implemented in code.

## Status Label

- Approved: Final Environment Validation Gate

## Go/No-Go Rule

- `Cleared` only if migration/RPC verification, failure-proof artifacts, and readiness/alert validation are all clean at the same time.
- Otherwise `Blocked`, with the failed artifact or blocking signal named explicitly and the rollback decision recorded.

## Required Commands

Apply the target migration in staging/pre-prod first:

- [20260320_observability_and_admin_report_rpc.sql](/C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/supabase/migrations/20260320_observability_and_admin_report_rpc.sql)

Then run:

```bash
npm run verify:launch:clearance
```

## Required Environment

- `LAUNCH_CLEARANCE_BASE_URL` or `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LAUNCH_CLEARANCE_ADMIN_COOKIE` or `SMOKE_ADMIN_COOKIE`
- `LAUNCH_CLEARANCE_INTERNAL_SECRET` or `BOOKING_API_AUTH_SECRET`
- `STRIPE_WEBHOOK_SECRET`
- `FAILURE_PROOF_FINALIZE_PAYLOAD`

Launch-profile failure proof also expects explicit environment hooks for:

- `FAILURE_PROOF_MARK_PROCESSED_FAILURE_URL`
- `FAILURE_PROOF_MARK_PROCESSED_FAILURE_RESTORE_URL`
- `FAILURE_PROOF_REDIS_DEGRADE_URL`
- `FAILURE_PROOF_REDIS_RESTORE_URL`
- `FAILURE_PROOF_DB_LATENCY_URL`
- `FAILURE_PROOF_DB_LATENCY_RESTORE_URL`

If those hooks are not configured, the final clearance run remains blocked and records the missing scenario as a failed artifact.

## What The Clearance Runner Verifies

- target RPCs exist and execute successfully
- telemetry persistence table accepts writes and reads them back
- deployed admin routes use `rpc` data freshness, not fallback paths
- route pagination totals match direct DB truth
- unexpected fallback-path usage is zero during validation
- failure-proof artifacts are produced for the required launch scenarios
- readiness transitions to `critical` when persisted admin-report and recovery telemetry exceed thresholds
- readiness returns after cleanup and records the state transition in the artifact bundle

## Artifacts

The clearance runner writes timestamped artifacts under:

- [docs/perf/launch-clearance-results](/C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/docs/perf/launch-clearance-results)

Outputs include:

- migration/RPC verification JSON
- failure-proof JSON artifact
- readiness/alert validation JSON
- final launch-clearance JSON summary
- final launch-clearance Markdown note

## Clearance Requirement

Full paid launch remains blocked until the final note says:

- `Status: Cleared`
- `Rollback: rollback not required`

If the note says `Blocked`, use the named blocking signal or failed artifact as the immediate remediation target before another promotion attempt.
