# External Integrations Map

## Booking and Hotel Supply
- LiteAPI is the hotel inventory and booking provider.
- Core integration points:
  - `src/server/liteapi.ts`
  - `src/app/api/search/rooms/route.ts`
  - `src/app/api/hotels/[hotelId]/route.ts`
  - `src/app/api/booking/prebook/route.ts`
  - `src/app/api/booking/book/route.ts`
- LiteAPI webhook receiver:
  - `src/app/api/webhooks/liteapi/route.ts`

## Payments
- Stripe SDK is present for Stripe-only or hybrid checkout modes.
- Core Stripe integration points:
  - `src/server/payments/stripe.ts`
  - `src/app/api/webhooks/stripe/route.ts`
  - `src/app/api/checkout/session/route.ts`
- Runtime switch:
  - `PAYMENT_PROVIDER` in `.env.example`
  - logic in `src/server/env.ts`.

## Auth and Identity
- Supabase Auth for session/user identity.
- Server and client entry points:
  - `src/server/supabase/server.ts`
  - `src/server/supabase/client.ts`
  - `src/server/supabase/admin.ts`
  - `src/shared/auth/client-auth.ts`
- Middleware route protection:
  - `src/middleware.ts`.

## Data Storage and Persistence
- Supabase/Postgres-backed repositories:
  - `src/server/booking/repository.ts`
  - `src/server/settings/repository.ts`
  - `src/server/analytics-repository.ts`
- Database migration assets:
  - `supabase/migrations/`.

## Caching and Rate Limiting
- Upstash Redis integration:
  - `src/server/cache.ts`
  - `src/server/ratelimit.ts`
- Used for TTL caches, idempotency support, and abuse controls.

## Observability and Error Monitoring
- Sentry for browser/edge/server telemetry:
  - `sentry.client.config.ts`
  - `sentry.edge.config.ts`
  - `sentry.server.config.ts`
- Structured logging support in `src/server/logger.ts`.

## Optional AI/Assistant
- Concierge/AI functionality appears in:
  - `src/server/concierge.ts`
  - `src/server/hotel-ai-context.ts`
  - `src/app/api/concierge/route.ts`
  - `src/app/api/hotel-ai/route.ts`
- Optional key surfaced via `OPENAI_API_KEY` in `.env.example`.

## Ops and External Tooling
- Load tests:
  - `load/admin-reports.k6.js`
  - `load/admin-reports.artillery.yml`
- Validation/report scripts:
  - `scripts/verify-live-webhook.js`
  - `scripts/verify-live-email.js`
  - `scripts/perf-proof.js`
