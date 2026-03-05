# Directory Structure Map

## Root Layout
- App source: `src/`
- Tests: `tests/`
- Documentation: `docs/` and project root markdown reports
- Planning/state docs: `.planning/`
- DB migration assets: `supabase/migrations/`
- Performance/load assets: `load/`
- Utility scripts: `scripts/`

## Source Tree Overview (`src`)
- `src/app/`: Next App Router pages and API route handlers.
- `src/components/`: shared UI components used across features.
- `src/features/`: feature-scoped UI/hook/store modules.
- `src/server/`: server-side domain logic and infrastructure adapters.
- `src/shared/`: cross-feature helpers, hooks, types, auth wrappers.
- `src/types/`: central type declarations.
- `src/middleware.ts`: route protection and security headers.

## App Router Structure
- Route groups include:
  - pages: `src/app/page.tsx`, `src/app/search/page.tsx`, `src/app/hotels/[hotelId]/page.tsx`
  - auth: `src/app/auth/**`
  - booking: `src/app/booking/**`, `src/app/bookings/**`
  - content/blog: `src/app/blog/**`
- API surface grouped by domain in `src/app/api/**`:
  - booking, bookings, checkout, search, hotels
  - admin reports, analytics, support, webhooks
  - health/readiness endpoints.

## Feature Module Organization
- `src/features/search/`:
  - `components/`, `hooks/`, `lib/`, `stores/`
- `src/features/hotels/`:
  - `components/`, `hooks/`
- `src/features/booking/`:
  - booking-focused UI actions/components
- Other modules:
  - `src/features/ai/`, `src/features/blog/`, `src/features/wishlist/`.

## Server Module Organization
- Booking domain: `src/server/booking/**`
- Admin/reporting: `src/server/admin/**`
- Payments: `src/server/payments/**`
- Supabase adapters: `src/server/supabase/**`
- Cross-cutting server modules:
  - `env.ts`, `errors.ts`, `logger.ts`, `request.ts`, `ratelimit.ts`, `csrf.ts`.

## Test Structure
- Root integration/security tests in `tests/*.test.ts`.
- Domain folders for focused suites:
  - `tests/admin/`
  - `tests/auth/`
  - `tests/security/`
  - `tests/mocks/`
  - `tests/helpers/`.

## Naming and Routing Conventions (Observed)
- Route handlers use `route.ts`.
- Dynamic routes use `[param]` folders.
- Server files are domain-labeled (`booking-session.ts`, `webhook-idempotency.ts`).
