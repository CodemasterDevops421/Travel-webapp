# Technology Stack

**Analysis Date:** 2026-02-23

## Languages

**Primary:**
- TypeScript - App, API routes, and server modules in `src/**/*.ts` and `src/**/*.tsx`

**Secondary:**
- SQL - Supabase schema and migrations in `supabase/schema.sql` and `supabase/migrations/*.sql`
- JavaScript - Build/config files in `next.config.mjs` and `postcss.config.js`

## Runtime

**Environment:**
- Node.js (containerized target: Node 22 Alpine) in `Dockerfile`
- Node.js (CI target: Node 20) in `.github/workflows/ci.yml`

**Package Manager:**
- npm (script lifecycle in `package.json`)
- Lockfile: present (`package-lock.json`)

## Frameworks

**Core:**
- Next.js `^15.5.12` - full-stack React framework for App Router pages and route handlers in `package.json` and `src/app/**`
- React `19.0.0` / React DOM `19.0.0` - UI rendering in `package.json`
- Tailwind CSS `^3.4.17` - utility styling configured in `tailwind.config.ts`

**Testing:**
- Vitest `^3.0.5` - unit/integration test runner configured in `vitest.config.ts`
- Testing Library (`@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`) in `package.json`

**Build/Dev:**
- TypeScript `^5.7.3` - strict type checking configured in `tsconfig.json`
- ESLint `^9.20.1` with `eslint-config-next` - linting in `.eslintrc.json` and `package.json`
- PostCSS + Autoprefixer - CSS processing in `postcss.config.js`
- Docker multi-stage build - production image workflow in `Dockerfile`
- GitHub Actions CI - lint/typecheck/test/build/audit in `.github/workflows/ci.yml`

## Key Dependencies

**Critical:**
- `liteapi-node-sdk` `^4.3.2` - OTA inventory/booking integration in `src/server/liteapi.ts`
- `@supabase/ssr` `^0.5.2` and `@supabase/supabase-js` `^2.48.1` - auth/session + database clients in `src/server/supabase/*.ts` and `src/middleware.ts`
- `zod` `^3.24.1` - runtime validation for env and API payloads in `src/server/env.ts` and `src/app/api/**/route.ts`

**Infrastructure:**
- `@upstash/redis` `^1.35.3` - cache/session/idempotency storage in `src/server/cache.ts`, `src/server/booking-store.ts`, `src/server/webhook-idempotency.ts`, `src/server/booking-idempotency.ts`
- `@upstash/ratelimit` `^2.0.5` - API rate limiting in `src/server/ratelimit.ts`
- `@sentry/nextjs` `^10.39.0` - error/perf monitoring bootstrap in `sentry.client.config.ts`, `sentry.edge.config.ts`, `sentry.server.config.ts`
- `pino` `^9.6.0` - structured server logging in `src/server/logger.ts`

## Configuration

**Environment:**
- Server env is schema-validated with Zod in `src/server/env.ts`
- Public env is schema-validated with Zod in `src/shared/env.public.ts`
- Local env files are present (`.env.local`, `.env.example`) and referenced by setup docs in `README.md` and `docker-compose.yml`
- Production readiness checks enforce required vars in `src/server/env.ts` via `assertProductionReadiness()`

**Build:**
- Next config: `next.config.mjs`
- TS config: `tsconfig.json`
- Tailwind config: `tailwind.config.ts`
- PostCSS config: `postcss.config.js`
- Test config: `vitest.config.ts`
- Vercel config: `vercel.json`
- Container build config: `Dockerfile`

## Platform Requirements

**Development:**
- Node.js + npm to run scripts from `package.json` (`npm ci`, `npm run dev`, `npm run test`)
- Environment configuration file expected before local run (documented in `README.md`)

**Production:**
- Primary hosting target is Vercel (`vercel.json`, `README.md`)
- Container deployment path is supported via `Dockerfile` and `docker-compose.yml`

---

*Stack analysis: 2026-02-23*
