# External Integrations

**Analysis Date:** 2026-02-23

## APIs & External Services

**Travel inventory and booking APIs:**
- LiteAPI - hotel search, rates, prebook, booking, booking lookup/cancel, and reviews
  - SDK/Client: `liteapi-node-sdk` plus direct `fetch` calls in `src/server/liteapi.ts`
  - Auth: `LITEAPI_API_KEY` from `src/server/env.ts`

**Places/autocomplete APIs:**
- Google Places Autocomplete API - fallback suggestions when primary inventory autocomplete is empty
  - SDK/Client: direct `fetch` in `src/app/api/autocomplete/route.ts`
  - Auth: `GOOGLE_PLACES_API_KEY` from `src/server/env.ts`

**AI APIs:**
- OpenAI Responses API - concierge chat inference and structured JSON filter extraction
  - SDK/Client: direct `fetch` to `https://api.openai.com/v1/responses` in `src/server/concierge.ts`
  - Auth: `OPENAI_API_KEY` (model override via `OPENAI_MODEL`) from `src/server/env.ts`

**Monitoring services:**
- Sentry - Next.js client/edge/server telemetry initialization
  - SDK/Client: `@sentry/nextjs` in `sentry.client.config.ts`, `sentry.edge.config.ts`, `sentry.server.config.ts`
  - Auth: `SENTRY_DSN` in `src/server/env.ts`

**Auth and BaaS services:**
- Supabase - authentication, session cookies, and Postgres-backed data access
  - SDK/Client: `@supabase/ssr` and `@supabase/supabase-js` in `src/server/supabase/server.ts`, `src/server/supabase/client.ts`, `src/server/supabase/admin.ts`
  - Auth: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in `src/server/env.ts`

## Data Storage

**Databases:**
- Supabase Postgres
  - Connection: Supabase URL/key env vars in `src/server/env.ts`
  - Client: Supabase JS clients in `src/server/supabase/*.ts`
  - Schema/migrations: `supabase/schema.sql` and `supabase/migrations/*.sql`

**File Storage:**
- Local filesystem only (static assets in `public/`); no cloud object storage client detected in `src/**`

**Caching:**
- Upstash Redis (optional) for cache/rate-limit/idempotency/session persistence in `src/server/cache.ts`, `src/server/ratelimit.ts`, `src/server/booking-store.ts`, `src/server/booking-idempotency.ts`, `src/server/webhook-idempotency.ts`
- In-memory fallback is used when Upstash env vars are absent in these same modules

## Authentication & Identity

**Auth Provider:**
- Supabase Auth
  - Implementation: Browser and server Supabase clients in `src/server/supabase/client.ts` and `src/server/supabase/server.ts`, route protection in `src/middleware.ts`, OAuth callback handling in `src/app/auth/callback/route.ts`, login OAuth initiation in `src/app/auth/login/page.tsx`

## Monitoring & Observability

**Error Tracking:**
- Sentry via Next.js SDK bootstrap files `sentry.client.config.ts`, `sentry.edge.config.ts`, and `sentry.server.config.ts`

**Logs:**
- Structured JSON logs through Pino in `src/server/logger.ts`

## CI/CD & Deployment

**Hosting:**
- Vercel is configured as the framework target in `vercel.json`
- Containerized deployment path exists via `Dockerfile` and `docker-compose.yml`

**CI Pipeline:**
- GitHub Actions CI in `.github/workflows/ci.yml` (install, lint, typecheck, test, build, audit)

## Environment Configuration

**Required env vars:**
- Core app: `NEXT_PUBLIC_APP_URL`, `NODE_ENV` (validated/defaulted in `src/server/env.ts`)
- LiteAPI: `LITEAPI_API_KEY`, `LITEAPI_BASE_URL`, `LITEAPI_BOOK_BASE_URL`, `LITEAPI_TIMEOUT_MS`, `LITEAPI_WEBHOOK_SECRET` (`src/server/env.ts`)
- Booking/security: `QUOTE_SIGNING_SECRET`, `BOOKING_VIEW_TOKEN_SECRET`, `BOOKING_API_AUTH_SECRET`, `STRICT_PERSISTENCE_MODE` (`src/server/env.ts`)
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (`src/server/env.ts`)
- Redis: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (`src/server/env.ts`)
- Optional integrations: `GOOGLE_PLACES_API_KEY`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `SENTRY_DSN` (`src/server/env.ts`)

**Secrets location:**
- Local development: `.env.local` file present in project root
- Deployment: Vercel environment variables documented in `README.md`

## Webhooks & Callbacks

**Incoming:**
- LiteAPI webhook endpoint at `src/app/api/webhooks/liteapi/route.ts` (`POST /api/webhooks/liteapi`) with HMAC signature verification and idempotency handling
- OAuth callback endpoint at `src/app/auth/callback/route.ts` for Supabase auth code exchange

**Outgoing:**
- No third-party webhook emitter detected in `src/**`
- Outbound API callbacks are standard HTTP requests to LiteAPI/OpenAI/Google from `src/server/liteapi.ts`, `src/server/concierge.ts`, and `src/app/api/autocomplete/route.ts`

---

*Integration audit: 2026-02-23*
