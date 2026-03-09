# Documentation Guide

This is the canonical documentation entrypoint for developers and AI agents.

## What This Codebase Is

Hostel Stays is a hotel booking web application. It is not a generic travel CMS and it is not a multi-product marketplace.

Its primary job is:
- search hotel inventory from LiteAPI,
- render hotel detail pages with room/rate selection,
- run a LiteAPI-first booking and payment flow,
- reconcile booking lifecycle updates,
- expose operator/admin reporting and launch-readiness tooling.

## What Is Canonical

Read these files first:

1. [../README.md](C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/README.md)
2. [PLATFORM_STATUS.md](C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/docs/PLATFORM_STATUS.md)
3. [../.planning/ROADMAP.md](C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/.planning/ROADMAP.md)
4. [../.planning/REQUIREMENTS.md](C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/.planning/REQUIREMENTS.md)
5. [../.planning/STATE.md](C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/.planning/STATE.md)

Operational docs:
- [GO_LIVE_CHECKLIST.md](C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/docs/GO_LIVE_CHECKLIST.md)
- [DB_RUNBOOK.md](C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/docs/DB_RUNBOOK.md)
- [perf/README.md](C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/docs/perf/README.md)

## Runtime Architecture

### User-facing surfaces

- `/` homepage and discovery
- `/stays/[destination]` and `/search` listing flows
- `/hotels/[hotelId]` hotel detail and room selection
- `/booking` checkout
- `/booking/return` payment return/finalize
- `/bookings/[bookingId]` secure booking confirmation and cancellation/status view
- `/wishlist` authenticated saved stays
- `/admin` operator/admin area

### Core backend modules

- `src/server/liteapi.ts`
  - supplier search, hotel detail, rates, booking, webhook-related helpers
- `src/server/booking/`
  - lifecycle, repository, notifications, persistence rules
- `src/server/authz.ts`
  - route-level authz helpers
- `src/server/ops/`
  - readiness and launch checks
- `src/server/*repository.ts`
  - analytics, commission, payment logs, review cache, admin reporting

### Payment and booking reality

- Launch profile is LiteAPI-first.
- Stripe is mode-gated fallback only.
- All supplier calls must run server-side.
- Canonical booking states remain:
  - `pending`
  - `payment_authorized`
  - `confirmed`
  - `failed`
  - `refunded`

### Frontend state ownership

- Search listing data: `src/features/search/`
- Hotel detail and rate selection: `src/features/hotels/`
- Checkout and payment widget mount: `src/features/booking/`
- Booking status/cancellation messaging: `src/app/bookings/[bookingId]/page.tsx`

## Directory Map

```text
src/app/
  Route entrypoints and API endpoints

src/features/search/
  Search page, listing cards, filters, property preview hooks

src/features/hotels/
  Hotel detail experience, room/rate rendering, booking sidebar

src/features/booking/
  Checkout console, payment flow, cancellation/support actions

src/server/
  Supplier integration, auth, booking lifecycle, settings, admin reports

tests/
  Source-of-truth regression coverage for product and operational behavior
```

## What Was Removed From Main Docs

The repo previously had several overlapping docs that repeated the same product story with conflicting status and stale counts. Those are intentionally removed from the main surface so AI models and developers do not index contradictory summaries.

Examples of documentation that should not become source-of-truth:
- one-off audits after the codebase has moved on,
- planning docs duplicated outside `.planning/`,
- “what’s built” narratives that drift from current code,
- template-style implementation docs that do not reflect installed versions or actual scripts.

## How To Update Docs Safely

- Update docs when code and runtime behavior change.
- Prefer one canonical explanation over multiple overlapping summaries.
- If a document is historical but no longer useful for onboarding or operations, delete it instead of leaving it in the main docs surface.
- When docs disagree with code, code wins and docs must be corrected.
