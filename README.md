# TravelForge OTA

## Setup
```bash
cp .env.example .env.local
npm ci
npm run dev
```

## Commands
- `npm run dev`
- `npm run lint`
- `npm run test`
- `npx tsc --noEmit`
- `npm run build`
- `npm run start`

## Vercel required env vars
- `NODE_ENV=production`
- `NEXT_PUBLIC_APP_URL=https://<your-vercel-domain>`
- `LITEAPI_API_KEY=<liteapi_key>`
- `LITEAPI_ENV=sandbox|production`
- `LITEAPI_BASE_URL=https://api.liteapi.travel/v3.0`
- `LITEAPI_TIMEOUT_MS=8000`
- `NEXT_PUBLIC_SUPABASE_URL=<supabase_url>`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase_anon_key>`
- `SUPABASE_SERVICE_ROLE_KEY=<supabase_service_role_key>`
- `QUOTE_SIGNING_SECRET=<min_16_chars>`
- `BOOKING_VIEW_TOKEN_SECRET=<min_16_chars>`
- `BOOKING_API_AUTH_SECRET=<min_24_chars>`
- `LITEAPI_WEBHOOK_SECRET=<webhook_secret>`
- `UPSTASH_REDIS_REST_URL=<upstash_url>`
- `UPSTASH_REDIS_REST_TOKEN=<upstash_token>`
- `STRICT_PERSISTENCE_MODE=true`

## Optional Vercel env vars
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `GOOGLE_PLACES_API_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `LITEAPI_WEBHOOK_SECRET`
- `DATABASE_URL`
- `SENTRY_DSN`
- `LOG_LEVEL`

## Notes
- Prefer `LITEAPI_API_KEY`; `LITEAPI_KEY` is only for legacy compatibility.
- Keep all secrets server-side; never place private keys in `NEXT_PUBLIC_*` variables.
- Redis is optional; app falls back to in-memory cache/rate-limit behavior in local development.
- Booking management APIs (`/api/bookings*`) require `x-booking-api-key` matching `BOOKING_API_AUTH_SECRET` when configured.
