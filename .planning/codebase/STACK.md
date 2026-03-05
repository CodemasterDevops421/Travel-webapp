# Codebase Stack Map

## Runtime and Platform
- Framework: Next.js 15 (App Router) in `package.json`.
- Language: TypeScript (strict mode) in `tsconfig.json`.
- Runtime target: modern Node/ES (`ES2022`, `moduleResolution: bundler`).
- React: `react@19` and `react-dom@19`.
- Deployment shape: Vercel-style Next app with optional Docker (`Dockerfile`, `docker-compose.yml`).

## Frontend Stack
- UI layer built under `src/app`, `src/components`, and `src/features`.
- Styling: Tailwind CSS via `tailwind.config.ts` + `postcss.config.js`.
- Motion: `framer-motion`.
- Forms and validation: `react-hook-form`, `@hookform/resolvers`, `zod`.
- Client state:
  - server/cache state: `@tanstack/react-query`
  - local UI state: `zustand`
- Maps and geospatial UI: `leaflet`, `react-leaflet`.

## Backend and API Stack
- API routes implemented with Next route handlers in `src/app/api/**/route.ts`.
- Domain/server logic in `src/server/**`.
- Validation and contracts: `zod`.
- Logging: `pino` with wrappers in `src/server/logger.ts`.
- Server-only protections visible via `import 'server-only'` in server modules.

## Data and Infrastructure
- Primary data/auth provider: Supabase (`@supabase/supabase-js`, `@supabase/ssr`).
- Optional direct DB access path documented via `DATABASE_URL` and `supabase/migrations/`.
- Cache and rate limiting: Upstash Redis (`@upstash/redis`, `@upstash/ratelimit`).
- Payments:
  - LiteAPI mode (`liteapi-node-sdk`)
  - Stripe mode (`stripe`)
  - Hybrid mode controlled by `PAYMENT_PROVIDER`.

## Observability and Ops
- Error monitoring: Sentry (`@sentry/nextjs`, `sentry.*.config.ts`).
- Health/readiness endpoints exist (`src/app/api/healthz/route.ts`, `src/app/api/readyz/route.ts`).
- Load/perf tooling scripts under `load/` and `scripts/`.

## Build, Quality, and Tooling
- Lint: `next lint` (`.eslintrc.json` extends `next/core-web-vitals`).
- Typecheck: `next typegen && tsc --noEmit`.
- Tests: Vitest + Testing Library (`vitest.config.ts`, `tests/**`).
- Lockfile and package manager: npm (`package-lock.json`).

## Key Configuration Files
- `package.json`
- `tsconfig.json`
- `next.config.mjs`
- `vitest.config.ts`
- `.env.example`
