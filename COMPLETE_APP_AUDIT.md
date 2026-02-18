# Complete App Audit — Travel-webapp

## 1) Executive summary
- This is a **Next.js App Router OTA-style hotel booking app** with server routes under `src/app/api/*`, frontend pages under `src/app/*`, and domain logic in `src/server/*`.
- Core product flow: **search destination → list property previews → open hotel details/rates → prebook → finalize booking → secure confirmation page**.
- Primary integrations: **LiteAPI** (inventory/rates/prebook/book), **Supabase** (quote + booking persistence), **Upstash Redis** (cache/rate-limit/idempotency/session), optional **OpenAI** (concierge), optional **Google Places** fallback autocomplete.
- Reliability strategy is mixed-mode: Redis/Supabase enabled in production, plus in-memory fallback behavior for local/degraded environments, controlled by `STRICT_PERSISTENCE_MODE`.
- Hardening update (current branch): production now enforces fail-fast config validation, booking management APIs are auth-gated, funnel analytics are persisted to DB when available, and Supabase migration SQL/runbook are included.

---

## 2) Runtime architecture

### Frontend (App Router)
- Home: `src/app/page.tsx` renders hero, search, and marketing blocks.
- Search results: `src/app/search/page.tsx` parses query params and renders `SearchResultsPage`.
- Hotel details: `src/app/hotels/[hotelId]/page.tsx` fetches details + rates server-side and injects Hotel JSON-LD.
- Checkout: `src/app/booking/page.tsx` drives booking with prefilled query params.
- Confirmation: `src/app/bookings/[bookingId]/page.tsx` requires signed `viewToken` before showing booking details.
- Global shell: `src/app/layout.tsx` mounts theme/query providers, header, and the floating AI chatbot.

### Backend (Route Handlers)
- API implemented in Next.js Route Handlers (`src/app/api/**/route.ts`) with Zod validation, rate limiting, and normalized HTTP errors.

### Domain/services
- `src/server/liteapi.ts`: supplier API orchestration + response normalization + fallback data.
- `src/server/booking/repository.ts`: quote/booking persistence with Supabase + in-memory fallback.
- `src/server/booking-store.ts`: prebook session storage in Redis or fallback map.
- `src/server/booking-session.ts`: HMAC session signatures for checkout integrity.
- `src/server/booking-view-token.ts`: signed short-lived booking page token.
- `src/server/webhook-idempotency.ts`: webhook event dedupe using Redis/fallback map.
- `src/server/ratelimit.ts`: Upstash sliding-window (30 req/min) or in-memory fallback.
- `src/server/cache.ts`: Redis cache wrappers for API responses.

---

## 3) Environment model and config
- Server env schema (Zod): `src/server/env.ts`.
- Public env schema: `src/shared/env.public.ts`.
- Key settings:
  - LiteAPI endpoints + API key + timeout.
  - Supabase public/service keys.
  - Upstash Redis credentials.
  - `STRICT_PERSISTENCE_MODE` to fail-closed in prod when persistence backend unavailable.
  - pricing defaults (`PRICE_MARKUP_PERCENT`, `DEFAULT_CURRENCY`), booking token TTL.
  - Optional OpenAI + Sentry + Google Places.

Operational implication:
- Missing secrets will not always crash startup because defaults/placeholders are supplied, but functional behavior degrades to fallback paths.

---

## 4) End-to-end product flows

### A. Discovery/search flow
1. User lands on `/` and uses hero search.
2. Search page parses params (`query/checkin/checkout/adults/rooms/language/currency`).
3. Client fetches `/api/property-preview`.
4. API applies:
   - query validation,
   - IP rate limit,
   - Redis cache keying,
   - LiteAPI search with optional filter hints and multi-strategy lookup (placeId/city/aiSearch),
   - fallback handling when upstream sparse/unavailable.
5. UI applies local filters/sorting/pagination and renders cards.

### B. Hotel detail + rate flow
1. User opens `/hotels/[hotelId]?...`.
2. Server page concurrently calls `getHotelDetails` + `getHotelRates`.
3. LiteAPI adapters normalize facility/review/image/rate structures and attempt enrichment when needed.
4. UI renders details and rate options; JSON-LD (Hotel/Offer) emitted for SEO.

### C. Booking flow (critical path)
1. Checkout page `/booking` receives selected offer context.
2. Client posts `/api/booking/prebook` with hotel/room/offer/dates/guests.
3. Server:
   - validates input + date ordering,
   - calls LiteAPI prebook,
   - creates signed quote,
   - persists quote (Supabase/fallback),
   - stores prebook session (Redis/fallback),
   - returns `sessionSignature`, `quote`, `quoteId`, transaction references.
4. Client posts `/api/booking/book` with guest holder details and signed quote info.
5. Server:
   - reloads stored prebook session or recovers from signed payload,
   - verifies session signature (if recovered),
   - verifies quote signature/session coherence,
   - calls LiteAPI book endpoint,
   - persists booking status/meta,
   - signs `bookingViewToken` for confirmation page.
6. Client redirects to `/bookings/[bookingId]?viewToken=...`.
7. Confirmation page validates token before revealing booking data.

### D. Post-booking webhook flow
1. LiteAPI webhook hits `/api/webhooks/liteapi`.
2. Server verifies HMAC signature (timestamped + legacy body signature support).
3. Event idempotency enforced via Redis/fallback TTL map.
4. Booking status updated by LiteAPI booking id or transaction id; fallback persist if only generic event data exists.

---

## 5) API inventory (functional contract)
- `GET /api/autocomplete`: destination autocomplete, LiteAPI first, Google Places fallback.
- `GET /api/property-preview`: listing cards with optional stay/filter params.
- `GET /api/hotels/[hotelId]`: normalized hotel details.
- `GET /api/hotels/rates`: normalized room rate options.
- `POST /api/booking/prebook`: lock rate + create signed checkout session.
- `POST /api/booking/book`: finalize booking.
- `GET /api/bookings?clientReference=`: list supplier bookings.
- `GET /api/bookings/[bookingId]`: retrieve booking.
- `PUT /api/bookings/[bookingId]`: cancel booking.
- `POST /api/webhooks/liteapi`: webhook receiver.
- `POST /api/concierge`: AI concierge response + search-filter hints.
- `POST /api/hotel-ai`: rule-based Q/A on hotel details.
- `POST /api/analytics/funnel`: accepts funnel events, logs asynchronously.

All major routes use Zod parsing + `assertRateLimit` and return normalized JSON errors through `toHttpError`.

---

## 6) Security posture (what exists)
- Input validation with Zod on query/body payloads.
- Request throttling (Upstash sliding window or in-memory fallback).
- Booking integrity controls:
  - quote signatures,
  - checkout session signatures,
  - signed booking view token with exp/iat checks.
- Webhook signature verification with timestamp skew check and timing-safe comparison.
- Idempotency guard for webhook replay suppression.
- Server-only boundaries used in sensitive modules (`server-only` imports).

Security caveats/gaps to review:
- Placeholder defaults for critical secrets/API keys can hide misconfig; stronger startup fail-fast recommended in production profile.
- In-memory fallback stores are process-local (not multi-instance safe).
- Some route handlers return permissive behavior on malformed input (e.g., autocomplete/property preview returning empty arrays on invalid query).

---

## 7) Reliability/performance behavior
- Caching:
  - Redis caching for autocomplete/property preview/hotel details/rates.
  - TTL constants centralized (`CACHE_TTL_SECONDS`).
- Rate limiting:
  - 30 req/min per key.
- Degraded mode:
  - Redis/Supabase absence falls back to in-memory structures unless strict fail-closed enabled.
- Upstream resilience:
  - LiteAPI wrappers log upstream failures and use fallback datasets in some read paths.

Performance caveats:
- In-memory fallback can break consistency across multiple pods/instances.
- Google Maps iframe mode in search page is simple embed, not synchronized with result markers.

---

## 8) Data model and persistence
- Quotes table intent: `booking_quotes` with quote signature, amount, currency, stay dates, guest occupancy, expiry.
- Bookings table intent: `bookings` with local id, supplier booking id, status, quote link, metadata.
- If Supabase schema missing (`PGRST205`), repository auto-switches to in-memory fallback.

Operational caveat:
- `STRICT_PERSISTENCE_MODE=true` in production is the only guardrail preventing degraded persistence behavior.

---

## 9) AI features

### Concierge (`/api/concierge`)
- If `OPENAI_API_KEY` present:
  - sends structured prompt + conversation to Responses API,
  - enforces JSON output contract (`reply` + optional search filters),
  - normalizes filter values.
- If no key or parse mismatch:
  - deterministic fallback response returned.

### Hotel AI (`/api/hotel-ai`)
- No LLM dependency.
- Rule-based response generation from hotel detail fields/facilities/description.

---

## 10) SEO, analytics, and observability
- SEO:
  - metadata per page,
  - canonical links,
  - sitemap/robots route files exist,
  - hotel JSON-LD for details pages.
- Analytics:
  - `/api/analytics/funnel` captures funnel events but currently logs only.
- Observability:
  - central logger (`pino`), correlation IDs on key booking/webhook flows.
  - Sentry config files present (`sentry.*.config.ts`) for optional integration.

---

## 11) Testing and quality gates present
- Test framework: Vitest + Testing Library.
- Existing test files cover env, booking repository/store/routes, analytics route, request/errors utils, sitemap, etc.
- Scripts: `lint`, `typecheck`, `test`, `build` in `package.json`.

---

## 12) Complete “how it works” in one sentence
- This app is a Next.js OTA frontend+backend monolith that brokers hotel search and booking through LiteAPI, secures booking integrity via HMAC-signed quote/session/view tokens, persists booking state in Supabase with optional degraded fallbacks, and exposes operational APIs for webhooks, concierge AI, and funnel telemetry.

---

## 13) Items likely “missed” (recommended audit follow-ups)
1. Add contract/integration tests for webhook signature + replay + booking update permutations.
2. Add explicit SLO instrumentation (latency/error metrics) for each critical API.
3. Clarify compliance/privacy retention policy for booking metadata and analytics events.
4. Complete payment front-end orchestration proof for LiteAPI Payment SDK in UI playbook (server path already uses `usePaymentSdk: true`).
