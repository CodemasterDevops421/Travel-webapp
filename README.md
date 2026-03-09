# Hostel Stays

LiteAPI-first hotel booking platform built with Next.js 15, React 19, Supabase, and Upstash Redis.

This codebase lets travelers:
- search hotels by destination or vibe,
- inspect hotel details, rooms, reviews, and policies,
- prebook and pay through the LiteAPI payment SDK,
- receive confirmation, cancellation, and refund-status updates,
- manage bookings through secure booking links,
- and lets operators inspect admin, reconciliation, and launch-readiness surfaces.

## Start Here

If you are a developer or an AI agent, read these in order:

1. [docs/README.md](C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/docs/README.md)
2. [docs/PLATFORM_STATUS.md](C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/docs/PLATFORM_STATUS.md)
3. [.planning/ROADMAP.md](C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/.planning/ROADMAP.md)
4. [.planning/REQUIREMENTS.md](C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/.planning/REQUIREMENTS.md)

Operational docs:
- [docs/GO_LIVE_CHECKLIST.md](C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/docs/GO_LIVE_CHECKLIST.md)
- [docs/DB_RUNBOOK.md](C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/docs/DB_RUNBOOK.md)
- [docs/perf/README.md](C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/docs/perf/README.md)

## Current Runtime Shape

- Primary booking and payment path: `LiteAPI`
- Optional fallback mode: `Stripe` only when `PAYMENT_PROVIDER` is `stripe` or `hybrid`
- Auth: `Supabase Auth`
- Persistence: `Supabase` + optional `Upstash Redis`
- Monitoring: `Sentry` optional
- AI features: `OpenAI` optional

Canonical booking lifecycle states:
- `pending`
- `payment_authorized`
- `confirmed`
- `failed`
- `refunded`

## Core Flows

- Search: homepage/search -> `/api/property-preview` -> search and listing UI
- Hotel detail: `/hotels/[hotelId]` -> hotel details + rates + room selection
- Booking: prebook -> LiteAPI payment SDK -> return -> finalize booking
- Booking management: secure booking view -> cancel/support actions
- Ops: admin reconciliation, settlement, readiness, and support operations routes

## Quick Start

Prerequisites:
- Node.js 20+
- npm

Setup:

```bash
git clone <repo-url>
cd Travel-webapp
cp .env.example .env.local
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start local development server |
| `npm run build` | Production build |
| `npm run start` | Run built app |
| `npm run lint` | ESLint |
| `npm run typecheck` | Type generation + TypeScript validation |
| `npm run test` | Full Vitest suite |
| `npm run verify:live:webhook:liteapi` | Post-deploy LiteAPI webhook proof |
| `npm run verify:live:email` | Post-deploy email proof |

## Environment

Important variables:
- `PAYMENT_PROVIDER`
- `LITEAPI_API_KEY`
- `LITEAPI_ENV`
- `LITEAPI_WEBHOOK_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRICT_PERSISTENCE_MODE`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

See [.env.example](C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/.env.example) for the complete list.

## Repository Shape

```text
src/
  app/        Next.js routes and API endpoints
  components/ reusable UI primitives and home sections
  features/   feature modules: search, hotels, booking, ai, wishlist
  server/     supplier, booking, auth, ops, logging, persistence logic
tests/        Vitest coverage
supabase/     migrations
docs/         canonical docs and operational runbooks
.planning/    roadmap, requirements, and phase history
```

## Documentation Policy

- `README.md` and `docs/README.md` are the human/AI onboarding entrypoints.
- `.planning/*` is the source of truth for roadmap and requirements.
- Historical review or one-off planning docs should not remain in the main docs surface once superseded by current code and current runbooks.
