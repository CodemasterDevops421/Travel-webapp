# Structure

## Top-Level Layout
- `src/app/`: App Router pages, layouts, route handlers.
- `src/server/`: server-only domain logic and integration wrappers.
- `src/shared/`: shared hooks, libs, and types.
- `tests/`: Vitest suites covering routes, security, auth, booking lifecycle.
- `supabase/migrations/`: SQL schema and guardrail migrations.
- `.planning/`: roadmap, requirements, phase plans/summaries, codebase docs.

## App Router Organization
- UI routes: examples include `src/app/page.tsx`, `src/app/stays/[destination]/page.tsx`, `src/app/hotels/[hotelId]/page.tsx`.
- API routes grouped by domain under `src/app/api/` (booking, checkout, webhooks, admin, search).
- Auth callback route in `src/app/auth/callback/route.ts`.

## Server Module Organization
- Booking domain: `src/server/booking/*` plus `src/server/booking-store.ts`.
- Payments: `src/server/payments/stripe.ts`.
- Supplier: `src/server/liteapi.ts`.
- Data repositories: `src/server/*repository.ts` (analytics, booking, payment logs, commission, reviews cache, settings).
- Platform/security: `src/server/env.ts`, `src/server/errors.ts`, `src/server/request.ts`, `src/server/ratelimit.ts`, `src/server/csrf.ts`.

## Shared Layer
- Cache TTL contracts: `src/shared/lib/cache-ttl.ts`.
- Client auth and hooks: `src/shared/auth/client-auth.ts`, `src/shared/hooks/use-auth.ts`.
- Utility helpers and types in `src/shared/lib/*` and `src/shared/types/*`.

## Testing Layout
- Flat domain tests in `tests/` (e.g., `tests/stripe-webhook-route.test.ts`, `tests/booking-repository.test.ts`).
- Focused subfolders for grouped concerns (e.g., `tests/security/`, `tests/auth/`).
- Test helper modules in `tests/helpers/` and mocks in `tests/mocks/`.

## Naming Conventions
- Route handlers follow Next convention: `route.ts` under segment directories.
- Dynamic route segments use bracket notation (`[bookingId]`, `[hotelId]`, `[destination]`).
- Repositories use explicit suffix `-repository.ts` or `booking/repository.ts`.
- Security tests use descriptive filenames (`api-security-regression.test.ts`, `csrf.test.ts`).

## Operational Files
- Runtime config: `next.config.mjs`, `tailwind.config.ts`, `vitest.config.ts`.
- Deployment/container artifacts: `vercel.json`, `Dockerfile`, `docker-compose.yml`.
- Documentation: `README.md` plus `docs/*.md` for product/runbook guidance.
