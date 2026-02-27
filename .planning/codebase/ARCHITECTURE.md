# Architecture

**Analysis Date:** 2026-02-23

## Pattern Overview

**Overall:** Next.js App Router monolith with feature-sliced UI and server utility modules.

**Key Characteristics:**
- Route-driven composition: UI pages and API handlers are colocated under `src/app/**` (for example `src/app/search/page.tsx`, `src/app/api/property-preview/route.ts`).
- Thin route handlers: API routes validate/authorize/rate-limit, then delegate to server modules under `src/server/**` (for example `src/app/api/booking/book/route.ts` -> `src/server/liteapi.ts`, `src/server/booking/repository.ts`).
- Shared cross-cutting utilities: request parsing, environment validation, error mapping, logging, caching, and rate limiting are centralized in `src/server/request.ts`, `src/server/env.ts`, `src/server/errors.ts`, `src/server/logger.ts`, `src/server/cache.ts`, and `src/server/ratelimit.ts`.

## Layers

**App Routes (UI + API):**
- Purpose: Define public pages, dynamic pages, and HTTP API surface.
- Location: `src/app/`
- Contains: `page.tsx`, `layout.tsx`, dynamic segments (for example `src/app/hotels/[hotelId]/page.tsx`), and API `route.ts` files.
- Depends on: Feature components (`src/features/**`), shared hooks/libs (`src/shared/**`), and server modules (`src/server/**`).
- Used by: Browser navigation and HTTP clients.

**Feature UI Layer:**
- Purpose: Implement domain UI for search, hotels, booking, and AI interactions.
- Location: `src/features/`
- Contains: Stateful client components and hooks (for example `src/features/search/components/search-results-page.tsx`, `src/features/booking/components/booking-console.tsx`, `src/features/hotels/hooks/use-hotel-rates.ts`).
- Depends on: Shared UI (`src/components/**`), shared libraries/hooks (`src/shared/**`), and internal API endpoints (`/api/*`).
- Used by: App route pages in `src/app/**`.

**Shared Presentation + Client Utilities:**
- Purpose: Provide reusable UI primitives and browser-side helpers.
- Location: `src/components/` and `src/shared/`
- Contains: UI primitives in `src/components/ui/*.tsx`, providers in `src/components/providers/*.tsx`, hooks in `src/shared/hooks/*.ts`, utility libs in `src/shared/lib/*.ts`.
- Depends on: React, TanStack Query, Supabase browser client, utility functions.
- Used by: Feature layer and page files.

**Server Domain/Infrastructure Layer:**
- Purpose: Encapsulate integrations, business rules, security checks, persistence, and resilience.
- Location: `src/server/`
- Contains: LiteAPI client/domain adapters (`src/server/liteapi.ts`), booking persistence (`src/server/booking/repository.ts`), signature logic (`src/server/pricing.ts`, `src/server/booking-session.ts`, `src/server/booking-view-token.ts`), authz/rate-limit/cache/error/env helpers.
- Depends on: External SDKs/APIs (LiteAPI, Supabase, Upstash, OpenAI), Node crypto, environment variables.
- Used by: API routes and selected server-rendered pages (for example `src/app/hotels/[hotelId]/page.tsx`).

**Data Layer (Supabase + Redis + Fallback Memory):**
- Purpose: Persist bookings/events and provide low-latency cache/idempotency/session storage.
- Location: `src/server/supabase/*.ts`, `src/server/cache.ts`, `src/server/booking-store.ts`, `src/server/booking-idempotency.ts`, `src/server/webhook-idempotency.ts`.
- Contains: Supabase admin/server/browser clients and Redis-backed utilities with in-memory fallback.
- Depends on: `SUPABASE_*`, `UPSTASH_*` env configuration from `src/server/env.ts`.
- Used by: Booking lifecycle, analytics ingestion, and hot-path query endpoints.

## Data Flow

**Search & Listing Flow:**

1. User submits destination/date filters from `src/features/search/components/hero-search-bar.tsx`, which navigates to `src/app/search/page.tsx`.
2. The page normalizes query params via `src/features/search/lib/listing-search-params.ts` and renders `src/features/search/components/search-results-page.tsx`.
3. Client hooks call API routes (`src/features/search/hooks/use-property-preview.ts` -> `src/app/api/property-preview/route.ts`, `src/features/search/hooks/use-autocomplete.ts` -> `src/app/api/autocomplete/route.ts`).
4. API routes apply Zod validation + rate limiting and delegate to `src/server/liteapi.ts`; responses are optionally cached via `src/server/cache.ts` and returned to UI.

**Booking Checkout Flow:**

1. User selects a rate in `src/features/hotels/components/hotel-detail-experience.tsx` and lands on `src/app/booking/page.tsx` with selected query params.
2. `src/features/booking/components/booking-console.tsx` calls `src/app/api/booking/prebook/route.ts`.
3. Prebook route validates input, rate-limits, calls LiteAPI prebook (`src/server/liteapi.ts`), builds signed quote (`src/server/pricing.ts`), persists quote/session (`src/server/booking/repository.ts`, `src/server/booking-store.ts`), and returns session signatures (`src/server/booking-session.ts`).
4. Client launches LiteAPI payment SDK, stores checkout session in browser storage, then returns through `src/app/booking/return/page.tsx` + `src/app/booking/return/booking-return-client.tsx`, which finalizes via `src/app/api/booking/book/route.ts`.
5. Book route verifies quote/session signatures, enforces idempotency locks (`src/server/booking-idempotency.ts`), persists booking (`src/server/booking/repository.ts`), signs a view token (`src/server/booking-view-token.ts`), and redirects to `src/app/bookings/[bookingId]/page.tsx`.

**Webhook Reconciliation Flow:**

1. LiteAPI posts events to `src/app/api/webhooks/liteapi/route.ts`.
2. Route verifies HMAC signatures and timestamp skew, then de-duplicates events via `src/server/webhook-idempotency.ts`.
3. Route updates booking status by LiteAPI booking ID or transaction ID through `src/server/booking/repository.ts`.

**State Management:**
- Server state: managed by TanStack Query provider `src/components/providers/query-provider.tsx` with feature hooks in `src/features/**/hooks/*.ts`.
- UI preference state: managed with Zustand store in `src/features/search/stores/search-ui-store.ts`.
- Auth state: managed by Supabase client listener in `src/shared/hooks/use-auth.ts`.

## Key Abstractions

**Route Handler Facade:**
- Purpose: Keep endpoint code focused on transport concerns and delegate business logic.
- Examples: `src/app/api/property-preview/route.ts`, `src/app/api/booking/prebook/route.ts`, `src/app/api/booking/book/route.ts`.
- Pattern: Parse/validate -> authorize/rate-limit -> call `src/server/**` -> map errors via `toHttpError`.

**Server Service Modules:**
- Purpose: Wrap external providers and normalize data.
- Examples: `src/server/liteapi.ts`, `src/server/concierge.ts`, `src/server/analytics-repository.ts`.
- Pattern: Provider call + defensive parsing + fallback behavior + typed returns.

**Security Signatures:**
- Purpose: Ensure quote integrity and secure confirmation page access.
- Examples: `src/server/pricing.ts`, `src/server/booking-session.ts`, `src/server/booking-view-token.ts`.
- Pattern: HMAC sign + timing-safe verification + short-lived token semantics.

**Resilience with Fallback Stores:**
- Purpose: Maintain degraded operation when Redis/Supabase schema is unavailable.
- Examples: `src/server/booking-store.ts`, `src/server/booking-idempotency.ts`, `src/server/booking/repository.ts`, `src/server/analytics-repository.ts`.
- Pattern: Prefer remote persistence; fallback to in-memory maps unless strict production mode blocks.

## Entry Points

**Application Shell:**
- Location: `src/app/layout.tsx`
- Triggers: Every page render.
- Responsibilities: Global fonts/styles, `ThemeProvider`, `AppQueryProvider`, header/navigation, chatbot mount.

**Primary Landing Page:**
- Location: `src/app/page.tsx`
- Triggers: `GET /`.
- Responsibilities: Home content composition and search entry UI.

**Routing Middleware:**
- Location: `src/middleware.ts`
- Triggers: Matched page requests.
- Responsibilities: Hydrate Supabase auth from cookies, protect routes (`/booking`, `/wishlist`, `/admin`), redirect auth-state mismatches.

**Public API Surface:**
- Location: `src/app/api/**/route.ts`
- Triggers: `fetch`/HTTP calls.
- Responsibilities: Expose search, hotel detail/rates, booking prebook/book/list/cancel, promo validation, wishlist/admin, analytics, concierge, and webhook ingestion.

**Server-Side Dynamic Data Page:**
- Location: `src/app/hotels/[hotelId]/page.tsx`
- Triggers: `GET /hotels/:hotelId`.
- Responsibilities: SSR fetch of hotel details + rates using `src/server/liteapi.ts`, then hydrate interactive client experience.

## Error Handling

**Strategy:** Centralize error normalization and return HTTP-safe responses from routes.

**Patterns:**
- Route-level try/catch + `toHttpError` mapping in API handlers (for example `src/app/api/booking/book/route.ts`, `src/app/api/autocomplete/route.ts`).
- Input validation via Zod schemas at route boundaries before domain calls (for example `src/app/api/concierge/route.ts`, `src/app/api/hotels/rates/route.ts`).
- Domain-specific typed errors (`HttpError`, `RateLimitError`) in `src/server/errors.ts` for consistent status handling.

## Cross-Cutting Concerns

**Logging:** `src/server/logger.ts` (Pino) with structured logs in booking/webhook/analytics flows (`src/app/api/booking/prebook/route.ts`, `src/app/api/webhooks/liteapi/route.ts`, `src/app/api/analytics/funnel/route.ts`).
**Validation:** Zod is used at env and request boundaries (`src/server/env.ts`, `src/app/api/**/route.ts`).
**Authentication:** Supabase session checks in middleware and protected routes (`src/middleware.ts`, `src/app/api/wishlist/route.ts`, `src/app/api/admin/stats/route.ts`), plus API key auth for booking management routes via `src/server/authz.ts`.

---

*Architecture analysis: 2026-02-23*
