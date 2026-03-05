# Hostel Stays Production Hardening

## What This Is

Hostel Stays is a Next.js hotel booking web application that supports destination search, hotel detail exploration, checkout, and booking confirmation using LiteAPI and Supabase. It is designed for travelers who want a modern booking experience with live rates and straightforward checkout. This initiative focuses on making the current brownfield product production-safe, secure, and operationally reliable.

## Core Value

A traveler can reliably find a stay and complete a trustworthy booking flow end-to-end without pricing, security, or confirmation failures.

## Requirements

### Validated

- ✓ Users can search for destinations and view hotel listings with rates and filters — existing
- ✓ Users can open hotel detail pages with dynamic images, reviews, amenities, and rate options — existing
- ✓ Users can prebook and finalize bookings through the LiteAPI checkout flow — existing
- ✓ Users can authenticate with Supabase and access user-specific pages like wishlist — existing
- ✓ Server-side booking and webhook routes persist booking lifecycle data in Supabase — existing

### Active

- [ ] Remove credential exposure risks and enforce secret hygiene for production deployment
- [ ] Add strict authorization and CSRF controls to sensitive/admin and mutation endpoints
- [ ] Enforce durable booking/session/idempotency behavior in production (no unsafe in-memory fallbacks)
- [ ] Correct revenue and commission reporting logic for accurate monetization visibility
- [ ] Harden upstream API resilience (timeouts, retries, degradation behavior) for search/booking paths
- [ ] Define and verify launch-readiness criteria for performance, observability, and scalability

### Out of Scope

- Native iOS/Android applications — web production launch is the current target
- New major consumer-facing features unrelated to launch safety — avoided to keep risk low
- Marketplace expansion (new supplier contracts/providers) — stability comes before footprint growth

## Context

The codebase already includes a complete web booking surface built with Next.js App Router, Supabase auth/data, LiteAPI integration, and optional Upstash-based caching/rate-limiting. Codebase mapping was completed under `.planning/codebase/` and indicates both strong foundations (validation, route structure, signed quote checks) and launch blockers (secret hygiene gaps, admin authz weakness, durability concerns under degraded infrastructure, and reporting mismatches). A technical/business audit has already identified high-priority production concerns that now drive the project scope.

## Constraints

- **Security**: Launch must not proceed with exposed secrets, weak admin controls, or missing request-forgery protections — direct production risk
- **Reliability**: Booking-critical flows must be durable across restarts/instance scaling — financial integrity depends on this
- **Architecture**: Work should preserve existing product behavior and avoid unnecessary rewrites — brownfield hardening over rebuild
- **Timeline**: Prioritize P0/P1 fixes first to establish a safe launch baseline — defer non-critical enhancements
- **Compatibility**: Keep existing Next.js/Supabase/LiteAPI integration model and improve within current stack boundaries

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Treat this as a brownfield hardening project, not a net-new build | Existing application already delivers core booking behavior and should be stabilized | — Pending |
| Prioritize launch blockers (security, data integrity, resilience) before feature expansion | Reduces business and operational risk fastest | — Pending |
| Keep planning/execution in auto-advance YOLO mode with research/check/verifier enabled | Maintain speed while retaining quality gates for production-critical work | — Pending |

## Initiative: World-Class Travel Blog Program (Phase 09-14)

### Objective Priority
1. Organic traffic growth and discoverability
2. Conversion efficiency from content into booking surfaces
3. Personalization and global maturity

### Dependency Chain
`09 -> 10 -> 11 -> 12 -> 13 -> 14`

### Shared KPI Glossary
- **Indexed URLs**: Count of blog detail URLs included in sitemap and discoverable by crawlers.
- **Top Landing Slugs**: Highest traffic entry slugs over a reporting window.
- **Blog -> Search CTR**: Ratio of blog sessions that click into search experiences.
- **Assisted Conversion Clicks**: Blog-attributed clicks into hotel/search/checkout journeys.
- **Pages per Session**: Average pages viewed in sessions entering through blog pages.
- **Related-Click Rate**: Ratio of article sessions with at least one related article click.

### Shared Analytics Event Contract
- Event names:
  - `blog_list_view`
  - `blog_post_view`
  - `blog_search`
  - `blog_related_click`
  - `blog_cta_click`
- Required properties:
  - `slug`
  - `category`
  - `tag`
  - `position`
  - `referrerPath`

### Shared Quality Gates
- `npm run blog:validate` passes.
- SEO contract checks pass (canonical/schema/title-description/sitemap coverage).
- Blog-focused automated tests pass.
- Build passes with no blocking errors.
- Phase gate mapping:
  - Gate A after Phase 09
  - Gate B after Phase 10
  - Gate C after Phase 12
  - Gate D after Phase 14

---
*Last updated: 2026-03-05 for Top-tier Blog Program*
