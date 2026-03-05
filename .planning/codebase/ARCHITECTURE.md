# Architecture Map

## High-Level Pattern
- Monolithic Next.js application with App Router.
- Vertical feature modules in `src/features/**` for UI and interaction logic.
- Shared backend/domain services in `src/server/**`.
- Route handlers in `src/app/api/**` orchestrate request validation, auth, and domain calls.

## Layered Responsibility
- Presentation/UI:
  - `src/app/**` pages and layouts
  - `src/components/**`
  - `src/features/**/components`
- Application/API orchestration:
  - `src/app/api/**/route.ts`
- Domain/service layer:
  - booking, payments, authz, pricing, ratelimit in `src/server/**`
- Infrastructure adapters:
  - Supabase adapters in `src/server/supabase/**`
  - external SDK adapters (`src/server/liteapi.ts`, `src/server/payments/stripe.ts`).

## Request Flow
1. Request enters Next route handler (`src/app/api/.../route.ts`).
2. Validation with `zod` schemas at the edge of each handler.
3. Auth and policy checks (Supabase auth, admin checks, same-origin, rate limits).
4. Domain operations in `src/server/**`.
5. Persistence and side effects (repositories, webhooks, notifications).
6. Structured response with sanitized payloads.

## Cross-Cutting Controls
- Security headers and route gating in `src/middleware.ts`.
- Additional security headers in `next.config.mjs`.
- Error normalization in `src/server/errors.ts`.
- Structured logging in `src/server/logger.ts`.
- Environment and production assertions in `src/server/env.ts`.

## Booking Subsystem Shape
- Endpoints:
  - prebook, book, status in `src/app/api/booking/**`
  - booking lifecycle and cancellation in `src/app/api/bookings/**`
- Domain modules:
  - `src/server/booking/lifecycle.ts`
  - `src/server/booking/repository.ts`
  - `src/server/booking/outbox.ts`
  - idempotency and token/session helpers around checkout finalization.

## Operational/Admin Architecture
- Admin reporting APIs under `src/app/api/admin/**`.
- Report generation/cache/observability under `src/server/admin/**`.
- Health and readiness endpoints (`healthz`, `readyz`) support ops probing.

## Architectural Characteristics
- Strengths:
  - clear separation between HTTP handlers and server domain modules
  - strong runtime validation and defensive checks
  - explicit environment and production-readiness assertions
- Tradeoff:
  - single-repo monolith means high coupling risk as feature count grows.
