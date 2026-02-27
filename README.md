# TravelForge OTA

Production-oriented Next.js OTA app for discovery, checkout, booking lifecycle integrity, and operator controls.

## Local Setup

```bash
cp .env.example .env.local
npm ci
npm run dev
```

## Common Commands

- `npm run dev`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run start`

## Required Production Environment Variables

- `NODE_ENV=production`
- `NEXT_PUBLIC_APP_URL`
- `LITEAPI_ENV`
- `LITEAPI_API_KEY` (or mode-specific keys)
- `LITEAPI_BASE_URL`
- `LITEAPI_BOOK_BASE_URL`
- `QUOTE_SIGNING_SECRET`
- `BOOKING_VIEW_TOKEN_SECRET`
- `BOOKING_API_AUTH_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `STRICT_PERSISTENCE_MODE=true`

## Deployment and Operations

- Launch operations runbook: `docs/LAUNCH_OPERATIONS_RUNBOOK.md`
- Operator setup checklist: `.planning/phases/05-admin-monetization-and-launch-operations/05-USER-SETUP.md`
- DB schema and migration runbook: `docs/DB_RUNBOOK.md`

Webhook setup, domain cutover, and rollback steps are documented in the launch runbook.

## Notes

- Keep all secrets in server-only env vars; do not expose secrets via `NEXT_PUBLIC_*`.
- `/api/bookings*` endpoints require `x-booking-api-key` when `BOOKING_API_AUTH_SECRET` is set.
- Admin runtime controls (commission and mode) are managed from `/admin` and backed by `app_settings`.
- Fallback behavior warning: when Supabase or Upstash is unavailable, quote persistence and rate limiting fall back to in-process memory only; this is best-effort and not shared across multiple server instances.
