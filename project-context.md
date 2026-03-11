# Project Context: Hostel Stays / Travel-webapp

## Purpose

Hostel Stays is a Next.js hotel booking platform. Travelers search hotels, view hotel details, complete a checkout flow, and manage bookings. Operators use admin tooling to manage settings and, eventually, analytics and monetization workflows.

This repository is the web application for that platform. It uses the Next.js App Router and keeps supplier, auth, payment, and persistence logic on the server side.

## Product Scope

Implemented or partially implemented areas in the current codebase:

- Search and discovery with autocomplete, filters, sorting, map browsing, and destination pages
- Hotel detail pages with gallery, amenities, reviews, room/rate display, and hotel AI Q&A
- Booking and checkout flows, including prebook/book/status handling
- Authentication via Supabase, including email/password and OAuth callback flows
- Wishlist and booking management flows
- Stripe and LiteAPI webhook handling
- Email notifications for booking confirmation and cancellation
- Basic admin area and admin stats endpoint

Planned but not fully complete:

- Phase 5 admin monetization, revenue visibility, and launch operations
- Remaining roadmap gap-closure work for auth/booking security and observability wiring

## Technical Baseline

- Framework: Next.js 15 App Router
- Language: TypeScript with `strict: true`
- UI: React 19, Tailwind CSS, Radix primitives, Framer Motion
- State: TanStack React Query, Zustand
- Backend services: Supabase, LiteAPI, Stripe, Upstash Redis
- Validation: Zod
- Testing: Vitest with tests under `tests/**/*.test.ts`
- Deployment target: Vercel

## Codebase Shape

- `src/app`: App Router pages and route handlers
- `src/app/api`: Server endpoints for search, hotels, booking, checkout, concierge, admin, analytics, support, promo, wishlist, and webhooks
- `src/features`: Feature-focused UI and hooks for search, hotels, booking, and AI
- `src/components`: Shared UI, providers, layout, and home-page sections
- `src/server`: Server-only business logic, env parsing, payments, authz, persistence helpers, caching, notifications, and supplier integrations
- `src/shared`: Shared client-safe hooks, auth helpers, utilities, analytics, and types
- `src/emails`: Email templates
- `supabase`: Database-related assets and migrations
- `tests`: Vitest coverage for server and application behavior
- `docs`: Product, roadmap, and operational documentation
- `.planning`: Requirements and roadmap artifacts

## Architectural Rules

- Keep supplier secrets server-side. LiteAPI keys, Stripe secrets, Supabase service-role credentials, and booking protection secrets must never be exposed to client components.
- Prefer route handlers plus `src/server` modules for business logic. Avoid embedding domain logic directly in page components.
- Treat `src/server/env.ts` as the source of truth for server runtime configuration. Add new env vars there with validation before use elsewhere.
- Preserve typed route and strict TypeScript compatibility.
- Keep mutations protected. Existing code expects CSRF, authz, rate limiting, or signed-token patterns around sensitive operations.
- Preserve booking lifecycle integrity. Do not bypass idempotency, signed quotes, webhook verification, or booking-state transition guards.
- Maintain truthful UX behavior for supplier data. Missing or degraded upstream data should surface as explicit fallback states, not fabricated values.
- Keep APIs reusable and stateless where possible so future mobile clients can consume the same backend surface.

## Frontend Rules

- Follow existing feature boundaries instead of scattering hotel/search/booking logic across unrelated folders.
- Reuse shared UI primitives in `src/components/ui` before introducing new base components.
- Preserve responsive behavior across desktop and mobile.
- Keep client/server boundaries explicit. Do not move server concerns into client components without a clear reason.
- Continue using Tailwind utility composition and the existing design language unless a feature explicitly requires a visual expansion.

## Backend Rules

- New supplier, payment, persistence, or auth logic belongs in `src/server`.
- Validate external input and important internal contracts with Zod or explicit guards.
- Prefer additive, auditable changes around booking/payment/webhook flows.
- Keep structured logging and error handling in mind for booking-critical and supplier-critical paths.
- Respect environment mode separation between LiteAPI sandbox and production.

## Security and Reliability Constraints

- Security headers are configured in both `next.config.mjs` and `src/middleware.ts`; do not weaken them casually.
- Protected routes currently include booking and admin areas. Preserve auth gating and admin role checks.
- Production readiness depends on required secrets such as `QUOTE_SIGNING_SECRET`, `BOOKING_VIEW_TOKEN_SECRET`, `BOOKING_API_AUTH_SECRET`, and webhook secrets.
- Upstash is part of caching/rate-limiting expectations in production.
- Webhook handlers must remain idempotent and authoritative for payment/booking state updates.

## Key Commands

- `npm run dev`: start local development
- `npm run build`: production build
- `npm run start`: serve production build
- `npm run lint`: lint checks
- `npm run typecheck`: Next type generation plus TypeScript validation
- `npm run test`: run Vitest suite

## Agent Guidance

- Before large changes, inspect the relevant feature folder plus related `src/server` modules.
- Prefer minimal, local changes that preserve current architecture.
- When adding a feature, update both the UI-facing module and the corresponding server/domain module instead of placing everything in a route handler.
- When changing API shapes, check for matching hooks/components/tests that depend on the contract.
- Add or update tests when touching booking, auth, webhook, env, or search-contract behavior.
- Do not introduce placeholder behavior that fabricates travel inventory, pricing, reviews, or booking outcomes.
- Favor production-safe defaults over convenience shortcuts.

## Current Delivery Context

- Product docs present Phases 1 to 4 as functionally complete, with Phase 5 next.
- Planning docs still track Phase 5, Phase 6, and Phase 7 work as pending gap-closure or operationalization work.
- In practice, changes should assume the core traveler experience exists, while admin analytics, monetization, and some hardening/observability work may still need completion.

## Primary References

- `README.md`
- `docs/PRODUCT_OVERVIEW.md`
- `docs/WHATS_BUILT.md`
- `docs/NEXT_PHASE_ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `IMPLEMENTATION.md`
