# Stack

## Runtime and Language
- Primary runtime: Node.js via Next.js App Router (`package.json`).
- Language: TypeScript across app/server/test layers (`src/**/*.ts`, `tests/**/*.test.ts`).
- React runtime: React 19 with Next.js 15 (`package.json`).

## Core Frameworks
- Web framework: Next.js 15 (`next`, `src/app/layout.tsx`, `src/app/api/**/route.ts`).
- UI: React components with Tailwind CSS (`tailwind.config.ts`, `src/components/**`).
- Motion and UI libs: `framer-motion`, Radix primitives (`package.json`).

## Data and Persistence
- Primary data store: Supabase/Postgres (`src/server/supabase/admin.ts`, `supabase/migrations/*.sql`).
- Cache and ephemeral state: Upstash Redis (`src/server/cache.ts`, `src/server/booking-store.ts`, `src/server/webhook-idempotency.ts`).
- Fallback behavior: in-memory maps when Redis/Supabase unavailable in non-production (`src/server/booking/repository.ts`).

## API and Integrations Libraries
- Supplier API: LiteAPI SDK (`liteapi-node-sdk`, `src/server/liteapi.ts`).
- Payments: Stripe SDK (`stripe`, `src/server/payments/stripe.ts`).
- Monitoring: Sentry Next.js package (`@sentry/nextjs`, optional via env).
- Validation: Zod for request and env parsing (`src/server/env.ts`, route schemas).

## State and Data Fetching
- Client/server query caching: React Query (`@tanstack/react-query`).
- Local UI state: Zustand stores (`package.json`, feature state modules).

## Security and Platform Configuration
- CSP + security headers in Next config (`next.config.mjs`).
- Middleware-based auth/access guards (`src/middleware.ts`).
- CSRF and request sanitization utilities (`src/server/csrf.ts`, `src/server/request.ts`).

## Testing and Tooling
- Test runner: Vitest (`vitest.config.ts`, `npm run test`).
- Test style: module-level mocks with `vi.doMock` and API handler testing (`tests/**/*.test.ts`).
- Lint/typecheck scripts: `next lint`, `tsc --noEmit` (`package.json`).

## Build and Deployment
- Local dev/build scripts in `package.json` (`dev`, `build`, `start`).
- Docker artifacts exist (`Dockerfile`, `docker-compose.yml`).
- Vercel deployment target indicated (`vercel.json`, README deployment note).
