# Concerns

## 1) STATE.md Progress Drift
- `Progress: [##########] 100%` in `.planning/STATE.md` does not match current phase position (`Plan: 1 of 3`).
- Risk: planning/execution automation may report misleading status.
- Suggested action: normalize state format and ensure gsd state tools can parse/update it reliably.

## 2) Tooling/Environment Fragility (Git PATH)
- Shell-level `git` not on PATH caused workflow interruptions even though Git exists.
- Evidence: README includes workaround section and recent execution required absolute git path.
- Risk: automation scripts fail unexpectedly on contributor machines.

## 3) Fallback Memory Stores in Runtime Paths
- Multiple core flows use in-memory fallbacks (`src/server/booking/repository.ts`, `src/server/booking-store.ts`, `src/server/webhook-idempotency.ts`).
- Risk: process restarts lose state; horizontal scaling can diverge behavior.
- Mitigation exists via strict mode, but local/staging behavior can hide production-only issues.

## 4) Admin Stats Data Source Simplicity
- `src/app/api/admin/stats/route.ts` computes revenue from booking metadata only.
- Risk: analytics drift versus canonical `commission_tracking` and payment logs.
- Suggested action: pivot to canonical tables with fallback path during transition.

## 5) Large, Multi-Responsibility Repository Module
- `src/server/booking/repository.ts` is very large and handles persistence, transition guards, notification triggers, and now commission wiring.
- Risk: regression probability and difficult code review/test targeting.
- Suggested action: split into smaller focused modules (lookup, transition update, commission synchronization).

## 6) Test Strategy Mostly Module/Route-Level
- Tests are strong at unit/integration seams but there is no visible E2E browser/user-flow suite.
- Risk: cross-page regressions and client-side integration issues can slip through.

## 7) Security Header Duplication
- Security policy appears in both `next.config.mjs` and `src/middleware.ts`.
- Risk: drift over time if one side changes and the other does not.
- Suggested action: centralize header policy constants and reuse.

## 8) Optional Integrations and Conditional Complexity
- Runtime behavior branches by provider mode (`liteapi`/`hybrid`/`stripe`) and optional OpenAI/Sentry envs (`src/server/env.ts`).
- Risk: under-tested combinations in less common environment matrices.
- Suggested action: matrix smoke tests for key mode combinations.
