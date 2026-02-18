# Complete Application Audit — TravelForge OTA (`/workspace/Travel-webapp`)

## 1) What this application is
TravelForge OTA is a **Next.js 15 App Router monolith** that combines:
- a public hotel discovery + booking web UI,
- server-side API routes for search/rates/prebook/book/manage/webhooks,
- integration adapters for LiteAPI inventory/booking,
- optional AI concierge interactions,
- persistence in Supabase with fallback in-memory stores,
- optional Redis cache/rate-limit/idempotency through Upstash.

It is designed as an OTA-like booking flow from discovery to confirmed booking reference.

---

## 2) Runtime and stack
### Core framework/runtime
- Next.js `^15.5.12`, React `19.0.0`, TypeScript.
- App Router routes in `src/app/**`.
- Server route handlers in `src/app/api/**/route.ts`.

### Main runtime dependencies
- LiteAPI SDK: `liteapi-node-sdk`.
- Persistence/auth infra: `@supabase/supabase-js`, `@supabase/ssr`.
- Cache/rate limit: `@upstash/redis`, `@upstash/ratelimit`.
- Validation: `zod`.
- Logging: `pino`.
- Client data fetching: `@tanstack/react-query`.
- UI: Tailwind, Radix, Framer Motion, Lucide.

### Scripts and packaging
- `npm run dev|build|start|lint|typecheck|test`.
- Multi-stage Node 22 Alpine Dockerfile.
- `docker-compose.yml` starts app on `3000:3000`.

---

## 3) Surface area inventory
### Pages (7)
1. `/` — marketing + search hero.
2. `/search` — hotel listings + filtering/sorting + optional split map mode.
3. `/hotels` — catalog page (entry page for hotels domain).
4. `/hotels/[hotelId]` — hotel details + room rates + JSON-LD.
5. `/booking` — checkout console + payment widget launch.
6. `/booking/return` — payment callback finalization client.
7. `/bookings/[bookingId]` — secure booking confirmation page gated by signed token.

### API routes (12)
1. `GET /api/autocomplete`
2. `GET /api/property-preview`
3. `GET /api/hotels/[hotelId]`
4. `GET /api/hotels/rates`
5. `POST /api/booking/prebook`
6. `POST /api/booking/book`
7. `GET /api/bookings`
8. `GET /api/bookings/[bookingId]`
9. `PUT /api/bookings/[bookingId]`
10. `POST /api/webhooks/liteapi`
11. `POST /api/concierge`
12. `POST /api/hotel-ai`
13. `POST /api/analytics/funnel`

> Note: physically 12 route files exist, one file (`bookings/[bookingId]/route.ts`) exposes two HTTP methods.

### Test inventory
- 13 Vitest test files covering env, booking routes/store/repository/token, analytics route, cache TTL, errors, request helpers, sitemap, utils.

---

## 4) User-facing behavior: exact flows
### A) Discovery/search
1. User lands on `/`, sees hero + trust/value sections + destination discovery content.
2. Search interaction navigates to `/search` with query params.
3. `SearchResultsPage` fetches `/api/property-preview`.
4. Results are filtered/sorted client-side by price/rating/stars and paginated.
5. User can toggle list vs split-map mode (Google Maps embed style view).

### B) Hotel evaluation
1. User opens `/hotels/[hotelId]` with stay params.
2. Server fetches hotel details and rate options.
3. UI shows photos/facilities/reviews/rates and emits structured metadata.
4. Optional `POST /api/hotel-ai` answers targeted hotel questions from loaded hotel data.

### C) Checkout and booking
1. `/booking` accepts selected offer context.
2. Client calls `POST /api/booking/prebook`.
3. Server validates payload + date order, calls LiteAPI prebook, computes signed quote (markup applied), persists quote, stores prebook session, returns transaction/session signatures.
4. Frontend stores checkout session in browser storage and invokes LiteAPI Payment SDK.
5. LiteAPI redirects to `/booking/return?prebookId=...&transactionId=...`.
6. Return page calls `POST /api/booking/book`, optionally recovering from signed session if server prebook session is unavailable.
7. Server verifies session + quote integrity, books with LiteAPI, persists booking, returns signed booking-view token.
8. Client redirects to `/bookings/[bookingId]?viewToken=...`.
9. Confirmation page verifies token before showing booking references/status.

### D) Booking ops and webhook lifecycle
1. Internal/ops clients can list/get/cancel bookings via `/api/bookings*` (header auth enforced when configured).
2. LiteAPI webhook hits `/api/webhooks/liteapi`.
3. Signature and timestamp are verified (plus legacy signature fallback).
4. Idempotency key prevents replay.
5. Booking status is updated by LiteAPI booking ID or transaction ID; fallback persistence occurs for unmatched events.

---

## 5) Backend modules and responsibilities
### External adapter layer
- `src/server/liteapi.ts`
  - Autocomplete.
  - Property preview search + fallback hotel list.
  - Hotel details normalization/enrichment.
  - Rate retrieval normalization.
  - Prebook/book/list/get/cancel operations.

### Booking integrity and session security
- `src/server/pricing.ts`: quote creation + HMAC signatures.
- `src/server/booking-session.ts`: checkout session signing/verification.
- `src/server/booking-view-token.ts`: short-lived signed booking view token.
- `src/server/secrets.ts`: secret resolution fallback logic.

### Persistence and state
- `src/server/booking/repository.ts`
  - Quote persistence.
  - Booking persistence and lookup.
  - Status updates by LiteAPI booking ID / transaction ID.
  - Graceful fallback to in-memory maps when Supabase schema unavailable unless strict fail-closed mode is active.
- `src/server/booking-store.ts`: prebook session storage (Redis or memory map).
- `src/server/analytics-repository.ts`: funnel events persistence (`booking_events`) with fallback map.

### Reliability controls
- `src/server/ratelimit.ts`: Upstash sliding window (30 req/min) or in-memory fallback.
- `src/server/cache.ts`: Redis read-through cache wrapper with TTL.
- `src/server/webhook-idempotency.ts`: dedupe webhook events via Redis or fallback map.

### Request/ops
- `src/server/request.ts`: client IP extraction and correlation IDs.
- `src/server/logger.ts`: pino logger.
- `src/server/errors.ts`: normalized HTTP error classes.
- `src/server/authz.ts`: booking API key header protection (`x-booking-api-key`).

### AI features
- `src/server/concierge.ts`: OpenAI Responses API (JSON contract) with deterministic fallback if key missing or parse fails.
- `/api/hotel-ai` route: no LLM; rule-based answers from hotel data.

---

## 6) Data model and storage
### Supabase tables in schema/migration
- `booking_quotes`:
  - hotel/room identifiers, stay dates, guests payload, amount/currency, quote signature, expiry.
- `bookings`:
  - optional quote linkage, LiteAPI booking id, status, metadata, timestamps.
- `booking_events`:
  - funnel event name/step, event properties, correlation id, client IP, occurred_at.

### Fallback behavior
If Supabase/Redis are unavailable or schema missing:
- quote/booking/event/session/idempotency data falls back to process memory maps,
- behavior becomes **single-instance only** (no cross-instance consistency),
- strict production mode can force fail-closed for persistence-related operations.

---

## 7) Security posture and controls
### Implemented controls
- Strong request validation using Zod across major APIs.
- Route-level rate limiting on all key endpoints.
- Booking quote tamper prevention via HMAC signatures.
- Checkout session integrity via signed session payload.
- Booking confirmation access control via signed short TTL view token.
- Webhook signature verification + replay protection.
- Optional API auth secret gate for booking management endpoints.
- Robots disallow indexing for booking and API paths.

### Production readiness guard
`assertProductionReadiness()` enforces production-time mandatory config:
- real LiteAPI key,
- quote/view/webhook secrets,
- Supabase service role key,
- Upstash credentials,
- booking API auth secret,
- strict persistence mode.

---

## 8) Performance and reliability characteristics
- Caching for autocomplete/property previews/hotel details/rates with endpoint-specific TTLs.
- Global per-key rate limiting at 30 requests/minute.
- Network failures return normalized HTTP errors through shared error mapper.
- LiteAPI wrappers include fallback behavior for some read paths.
- App can continue in degraded mode without Redis/Supabase (unless strict mode blocks it).

Observed caveats:
- Memory fallback state is not shared across replicas/pods.
- Cache + in-memory fallbacks rely on process lifetime.
- Some user-input parse failures intentionally return empty arrays (autocomplete/property preview) instead of 4xx.

---

## 9) SEO, analytics, and observability
### SEO
- Metadata per page.
- Canonical links.
- `sitemap.ts` and `robots.ts` route handlers.
- Hotel details include structured content support path.

### Analytics
- `POST /api/analytics/funnel` accepts defined funnel event enum and persists/logs asynchronously.

### Observability
- `pino` structured logger with correlation ID support.
- Sentry config files exist for client/server/edge setup.
- No explicit Prometheus/OpenTelemetry endpoint currently present.

---

## 10) Operations and deployment readiness
- Local dev: `.env.local` + `npm ci` + `npm run dev`.
- Containerized runtime via Dockerfile.
- Compose quickstart available.
- Vercel-friendly config with required env list in README.
- Makefile provides common targets (`install`, `dev`, `lint`, `test`, `build`).

---

## 11) Known implementation details and risks worth changing next
1. **Fallback stores** are process-local; multi-instance production should rely on healthy Redis/Supabase and strict mode.
2. **No dedicated health/ready endpoints** in API surface.
3. **No explicit metrics endpoint** for p95/p99/SLO tracking.
4. **Payment finalization depends on browser storage session continuity** after redirect.
5. **Some non-critical validation failures return benign empty payloads** rather than explicit client errors.

---

## 12) Bottom line: what this app does (single sentence)
This app provides an end-to-end hotel OTA booking experience—search, evaluate, prebook, pay, confirm, and manage bookings—using LiteAPI as the supplier backend, with signed integrity controls, Supabase persistence, Redis acceleration, and graceful but limited in-memory fallbacks.
