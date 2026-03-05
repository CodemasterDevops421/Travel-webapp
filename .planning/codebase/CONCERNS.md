# Technical Concerns Map

## 1) Monolith Growth Pressure
- The single Next.js codebase now contains many domains: search, hotels, booking, admin analytics, blog, concierge.
- Risk: rising cross-domain coupling and harder change impact analysis.
- Evidence:
  - wide API surface in `src/app/api/**`
  - broad `src/server/**` domain set.

## 2) Configuration Complexity
- Runtime behavior depends on many env vars and provider modes.
- Risk: production misconfiguration during deploys and mode transitions.
- Evidence:
  - large env schema in `src/server/env.ts`
  - multiple payment and LiteAPI mode combinations.

## 3) Security Header Duplication
- Security headers are configured both in middleware and `next.config.mjs`.
- Risk: drift between two sources of truth over time.
- Impact: inconsistent policy behavior between routes/runtimes.

## 4) External Dependency Blast Radius
- Core user flows rely on LiteAPI, Supabase, Upstash, Stripe, and optional OpenAI/Sentry.
- Risk: upstream outage or latency can degrade booking/search reliability.
- Mitigation signals exist (fallback guards, idempotency) but dependency breadth remains high.

## 5) Persistence and Idempotency Fragility Zones
- Booking finalization has lock/cache/session/repository coordination.
- Risk: subtle race conditions, stale lock behavior, and partial-write edge cases.
- Evidence:
  - `src/app/api/booking/book/route.ts`
  - `src/server/booking-idempotency.ts`
  - `src/server/booking/repository.ts`.

## 6) Test Suite Maintenance Cost
- Test coverage appears broad, especially around booking and route behavior.
- Risk: slow or brittle tests over time as API surface evolves.
- No explicit centralized coverage threshold observed in current config.

## 7) Secrets Handling Discipline
- `.env.example` is comprehensive and many secrets are required in production.
- Risk: accidental leakage in docs/logs or inconsistent secret provisioning.
- Positive signal: production assertions and placeholder checks in `src/server/env.ts`.

## Priority Watchlist
- Keep env/mode rollout paths tightly verified per release.
- Review and possibly consolidate security header ownership.
- Track booking finalization regressions with targeted stress tests.
- Periodically prune/segment server modules by bounded context.
