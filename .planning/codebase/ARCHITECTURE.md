# Architecture

## High-Level Pattern
- Single Next.js monolith with App Router handling both SSR UI and backend API routes.
- Backend logic is extracted into `src/server/*` modules; route handlers stay orchestration-focused.
- Shared client/server contracts and helpers live in `src/shared/*`.

## Layering
- Presentation layer: `src/app/**` pages and components.
- API boundary: `src/app/api/**/route.ts` files.
- Domain/service layer: `src/server/**` modules (booking, payments, supplier, authz, cache).
- Data layer: Supabase repositories and migration SQL (`src/server/*repository.ts`, `supabase/migrations/*`).

## Request Flow (Typical)
- Request enters route handler (`src/app/api/.../route.ts`).
- Input is validated with Zod and parsed through helpers (`src/server/request.ts`).
- Security checks applied (rate limit, origin checks, auth checks).
- Domain action executed via server module (e.g., Stripe/LiteAPI/booking repository).
- Errors mapped with `toHttpError` and safe responses returned (`src/server/errors.ts`).

## Booking and Payment Flow
- Booking lifecycle states and transitions are centralized (`src/server/booking/lifecycle.ts`).
- Checkout session creation route links transaction + Stripe metadata (`src/app/api/checkout/session/route.ts`).
- Stripe/LiteAPI webhooks reconcile lifecycle state and now write canonical payment logs (`src/app/api/webhooks/stripe/route.ts`, `src/app/api/webhooks/liteapi/route.ts`).
- Booking repository remains lifecycle authority and triggers commission tracking updates (`src/server/booking/repository.ts`).

## Caching and Idempotency
- Redis-based read-through cache helper for supplier reads (`src/server/cache.ts`).
- Webhook idempotency uses two-phase claim/finalize semantics (`src/server/webhook-idempotency.ts`).
- Booking prebook/checkout sessions persist in Redis with in-memory fallback (`src/server/booking-store.ts`).

## Security Architecture
- Global security headers configured in both middleware and Next headers (`src/middleware.ts`, `next.config.mjs`).
- Route-level throttling classes (`auth`, `mutation`, `booking`) in `src/server/ratelimit.ts`.
- CSRF and sanitization helpers in `src/server/csrf.ts` and `src/server/request.ts`.
- Admin authorization is explicit and claim-aware (`src/server/authz.ts`).

## Observability
- Pino structured logger with redaction in `src/server/logger.ts`.
- Central error capture + HTTP-safe mapping in `src/server/errors.ts`.
- Correlation ID derivation for traceability in `src/server/request.ts`.

## Architectural Traits
- Strong preference for additive, backward-compatible changes in repositories/migrations.
- Runtime resilience via fail-open local fallbacks (non-prod) and fail-closed strict mode (prod).
- Testability through module seams and explicit dependency boundaries across route/server layers.
