# Codebase Structure

**Analysis Date:** 2026-02-23

## Directory Layout

```text
travel-webapp/
├── src/                      # Application source (App Router, features, server modules)
│   ├── app/                  # Next.js routes (pages/layouts) and API route handlers
│   ├── features/             # Feature-domain UI modules (search, hotels, booking, ai)
│   ├── components/           # Shared UI primitives, layout pieces, providers
│   ├── server/               # Server-only services, integrations, persistence, security
│   ├── shared/               # Shared hooks/libs/types/env used by multiple features
│   ├── types/                # Type declarations for external SDK compatibility
│   └── middleware.ts         # Route protection/auth redirect middleware
├── tests/                    # Vitest tests and test mocks
├── supabase/                 # Database schema and migration SQL files
├── public/                   # Static public assets (web manifest)
├── docs/                     # Operational docs (runbooks)
├── .planning/codebase/       # Generated codebase mapping docs
├── next.config.mjs           # Next.js runtime/security/image config
├── tailwind.config.ts        # Tailwind design token and utility config
├── tsconfig.json             # TypeScript config + `@/*` alias mapping
└── vitest.config.ts          # Test runner config + alias overrides
```

## Directory Purposes

**`src/app/`:**
- Purpose: Own all HTTP entry points.
- Contains: App Router pages (`src/app/page.tsx`, `src/app/search/page.tsx`), route metadata (`src/app/sitemap.ts`, `src/app/robots.ts`), API handlers (`src/app/api/**/route.ts`).
- Key files: `src/app/layout.tsx`, `src/app/booking/page.tsx`, `src/app/api/booking/prebook/route.ts`, `src/app/api/webhooks/liteapi/route.ts`.

**`src/features/`:**
- Purpose: Keep domain-specific UI and client logic grouped by feature.
- Contains: `components/`, `hooks/`, optional `stores/` and `lib/` per feature.
- Key files: `src/features/search/components/search-results-page.tsx`, `src/features/booking/components/booking-console.tsx`, `src/features/hotels/components/hotel-detail-experience.tsx`, `src/features/search/stores/search-ui-store.ts`.

**`src/components/`:**
- Purpose: Shared presentational building blocks used across features.
- Contains: `ui/` primitives, `layout/` chrome, `providers/` wrappers, and `home/` sections.
- Key files: `src/components/ui/button.tsx`, `src/components/layout/header.tsx`, `src/components/providers/query-provider.tsx`.

**`src/server/`:**
- Purpose: Server-side domain and infrastructure modules.
- Contains: Integration adapters (`src/server/liteapi.ts`), persistence (`src/server/booking/repository.ts`), security and signing (`src/server/pricing.ts`, `src/server/booking-session.ts`), platform utilities (`src/server/cache.ts`, `src/server/ratelimit.ts`, `src/server/env.ts`).
- Key files: `src/server/liteapi.ts`, `src/server/booking/repository.ts`, `src/server/concierge.ts`, `src/server/supabase/admin.ts`.

**`src/shared/`:**
- Purpose: Cross-feature client/shared helpers and stable utility logic.
- Contains: Hooks (`src/shared/hooks/use-auth.ts`, `src/shared/hooks/use-wishlist.ts`), helpers (`src/shared/lib/preferences.ts`, `src/shared/lib/analytics.ts`, `src/shared/lib/cache-ttl.ts`), and public env parsing (`src/shared/env.public.ts`).
- Key files: `src/shared/lib/analytics.ts`, `src/shared/lib/utils.ts`, `src/shared/hooks/use-auth.ts`.

**`tests/`:**
- Purpose: Node-side unit/integration-style tests for server and route logic.
- Contains: `*.test.ts` files plus mocks (`tests/mocks/server-only.ts`).
- Key files: `tests/booking-routes.test.ts`, `tests/booking-repository.test.ts`, `tests/env.test.ts`.

**`supabase/`:**
- Purpose: Database schema source and migrations.
- Contains: `supabase/schema.sql` and migration files like `supabase/migrations/20260217_ota_core.sql`.
- Key files: `supabase/schema.sql`, `supabase/migrations/004_bookings_enhancements.sql`.

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root shell and global providers.
- `src/app/page.tsx`: Home route.
- `src/middleware.ts`: Auth/protected-route middleware.
- `src/app/api/booking/prebook/route.ts`: Checkout prebook endpoint.
- `src/app/api/booking/book/route.ts`: Booking finalization endpoint.
- `src/app/api/webhooks/liteapi/route.ts`: External webhook ingest endpoint.

**Configuration:**
- `package.json`: Scripts and dependency graph.
- `next.config.mjs`: Security headers, image patterns, API caching headers.
- `tsconfig.json`: Strict TS + `@/*` alias to `src/*`.
- `tailwind.config.ts`: Design tokens and utility theme extensions.
- `vitest.config.ts`: Test include pattern and alias config.

**Core Logic:**
- `src/server/liteapi.ts`: External hotel and booking API orchestration.
- `src/server/booking/repository.ts`: Booking/quote persistence abstraction.
- `src/server/booking-idempotency.ts`: Finalization locks and replay-safe caching.
- `src/server/pricing.ts`: Quote signing and promo discount signature regeneration.
- `src/features/booking/components/booking-console.tsx`: Client checkout orchestration.

**Testing:**
- `tests/booking-routes.test.ts`: Booking endpoint behavior.
- `tests/booking-store.test.ts`: Session persistence behavior.
- `tests/analytics-route.test.ts`: Analytics ingestion route behavior.

## Naming Conventions

**Files:**
- Route files use framework conventions: `page.tsx`, `layout.tsx`, `route.ts` (for example `src/app/hotels/[hotelId]/page.tsx`, `src/app/api/hotels/rates/route.ts`).
- Most non-route files use kebab-case names (for example `src/server/booking-view-token.ts`, `src/features/search/hooks/use-property-preview.ts`).
- React component files are lower-kebab with `.tsx` (for example `src/components/layout/global-top-bar.tsx`).

**Directories:**
- Feature folders are domain nouns: `src/features/search`, `src/features/hotels`, `src/features/booking`, `src/features/ai`.
- Dynamic route segments use bracket syntax from App Router: `src/app/hotels/[hotelId]`, `src/app/bookings/[bookingId]`.

## Where to Add New Code

**New Feature:**
- Primary code: add under `src/features/<feature>/` with `components/`, `hooks/`, and optional `lib/` or `stores/`.
- Route entry point: create/extend page under `src/app/<route>/page.tsx`.
- API backend: add `src/app/api/<feature>/route.ts` and delegate business logic to `src/server/<feature>.ts` or `src/server/<feature>/*.ts`.
- Tests: place route/server tests in `tests/` as `*.test.ts` (for example `tests/<feature>-route.test.ts`).

**New Component/Module:**
- Cross-feature UI primitives: `src/components/ui/`.
- Shared layout/navigation pieces: `src/components/layout/` or `src/components/navigation/`.
- Feature-scoped UI: `src/features/<feature>/components/`.

**Utilities:**
- Shared browser-safe helpers: `src/shared/lib/`.
- Shared reusable hooks: `src/shared/hooks/`.
- Server-only helpers/integrations: `src/server/`.

## Special Directories

**`src/app/api/webhooks/`:**
- Purpose: Inbound third-party callback endpoints.
- Generated: No.
- Committed: Yes.

**`supabase/migrations/`:**
- Purpose: Incremental SQL migration history.
- Generated: Manually authored SQL.
- Committed: Yes.

**`tests/mocks/`:**
- Purpose: Test doubles used by Vitest aliasing.
- Generated: No.
- Committed: Yes.

**`.next/`:**
- Purpose: Next.js build artifacts.
- Generated: Yes (build/dev output).
- Committed: No (runtime artifact directory).

---

*Structure analysis: 2026-02-23*
