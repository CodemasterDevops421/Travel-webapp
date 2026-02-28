# Integrations

## Supabase (Auth + Database)
- Admin client for privileged server writes in `src/server/supabase/admin.ts`.
- Server auth client used in API routes like `src/app/api/admin/stats/route.ts`.
- Canonical schema managed through SQL migrations in `supabase/migrations/`.
- Key tables used by runtime paths include `bookings`, `payment_logs`, `commission_tracking`, and `reviews_cache` (`supabase/migrations/006_phase1_foundation.sql`).

## LiteAPI (Supplier Content + Booking)
- Supplier calls centralized in `src/server/liteapi.ts`.
- Used by search/rates/reviews and booking-adjacent flows (`src/app/api/hotels/rates/route.ts`, `src/app/api/review-snippets/route.ts`).
- Incoming supplier webhook endpoint: `src/app/api/webhooks/liteapi/route.ts`.
- Signature verification and timestamp skew checks implemented in route handler.

## Stripe (Payments)
- Checkout session creation: `src/app/api/checkout/session/route.ts` via `src/server/payments/stripe.ts`.
- Stripe webhook ingestion: `src/app/api/webhooks/stripe/route.ts`.
- Payment events reconciled into booking lifecycle and canonical payment logs.

## Upstash Redis (Cache + Rate Limit + Idempotency)
- Generic cache read-through helper: `src/server/cache.ts`.
- Route rate limiting: `src/server/ratelimit.ts`.
- Webhook dedup and two-phase event processing: `src/server/webhook-idempotency.ts`.
- Checkout/prebook session persistence: `src/server/booking-store.ts`.

## OpenAI (Optional Concierge)
- Optional AI-backed concierge flow exposed through `src/app/api/concierge/route.ts`.
- Server-side concierge utility in `src/server/concierge.ts`.
- Controlled by `OPENAI_API_KEY` and related env fields in `src/server/env.ts`.

## Sentry (Optional Error Monitoring)
- Sentry config files present: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`.
- Errors are normalized through shared error mapping (`src/server/errors.ts`) before route responses.

## Auth/OAuth
- Supabase Auth powers email/password and OAuth callback flows (`src/app/auth/callback/route.ts`, `src/app/auth/login/page.tsx`).
- Middleware gating for protected and admin routes in `src/middleware.ts`.

## Integration Reliability Patterns
- Fail-closed mode toggled by `STRICT_PERSISTENCE_MODE` for production-critical persistence (`src/server/env.ts`).
- Non-production fallback storage in memory for degraded local/test operation (`src/server/booking/repository.ts`).
- Correlation IDs propagated through request helpers (`src/server/request.ts`) and structured logs (`src/server/logger.ts`).
