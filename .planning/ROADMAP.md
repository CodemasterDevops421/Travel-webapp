# Roadmap: Hostel Stays Production Platform

## Overview

This roadmap delivers a production-grade travel commerce platform by first establishing secure multi-environment foundations, then shipping high-conversion discovery, then hotel detail and user workspace capabilities, then money-safe checkout and booking lifecycle controls, and finally launch-grade admin analytics and operations guardrails.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Platform Foundation and Security** - Stand up secure backend boundaries, environments, auth, and core data models. (completed 2026-02-23)
- [ ] **Phase 2: Search and Discovery Experience** - Deliver responsive SSR search with filtering, sorting, and cache-backed supplier data.
- [x] **Phase 3: Hotel Detail and User Workspace** - Ship rich hotel pages, contextual AI Q&A, and wishlist-driven user value. (completed 2026-02-25)
- [ ] **Phase 4: Checkout and Booking Lifecycle Integrity** - Implement payment-safe checkout with idempotent booking state transitions.
- [ ] **Phase 5: Admin Monetization and Launch Operations** - Operationalize revenue visibility, controls, analytics, and deployment readiness.
- [ ] **Phase 6: Auth and Booking Security Gap Closure** - Close milestone-blocking auth-linking and booking security regression gaps from audit.
- [ ] **Phase 7: Canonical Data Wiring and Observability Closure** - Close canonical runtime wiring and structured observability integration gaps from audit.
- [x] **Phase 8: Hotel Detail Content Intelligence and Review UX** - Upgrade smart highlights, review synthesis, and description quality for hotel detail conversion. (completed 2026-02-28)

## Phase Details

### Phase 1: Platform Foundation and Security
**Goal**: The platform operates with secure API boundaries, production-safe auth controls, and canonical persistence ready for scale.
**Depends on**: Nothing (first phase)
**Requirements**: ARCH-01, ARCH-02, ARCH-03, ARCH-04, ARCH-05, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. LiteAPI keys are never visible in client traffic and all supplier calls flow through secured backend proxy routes.
  2. Operators can run the application in sandbox or production mode with isolated credentials and settings.
  3. Travelers can authenticate with email/password or Google OAuth and access protected account areas.
  4. Non-admin users are denied admin actions, and mutation endpoints reject requests failing CSRF/rate/security policy checks.
  5. Booking, payment, search, and admin domain records persist in canonical tables and are queryable via structured logs.
**Plans**: 4 plans

Plans:
- [ ] 01-01-PLAN.md - Secure server-only LiteAPI proxy and multi-environment runtime boundary
- [ ] 01-02-PLAN.md - Establish canonical schema coverage and structured observability foundations
- [ ] 01-03-PLAN.md - Implement auth flows and enforce admin RBAC boundaries
- [ ] 01-04-PLAN.md - Enforce CSRF/rate-limit/header hardening and payload sanitization

### Phase 2: Search and Discovery Experience
**Goal**: Travelers can quickly discover relevant stays through an SEO-friendly, high-performance search surface.
**Depends on**: Phase 1
**Requirements**: DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, DISC-06
**Success Criteria** (what must be TRUE):
  1. Travelers can search by destination, dates, guests, and vibe query from the home page on desktop and mobile.
  2. Destination result pages are server-rendered and crawlable for SEO-critical search routes.
  3. Travelers can filter and sort results, and switch between grid/map browse modes without broken state.
  4. Search responses remain performant via TTL caching, and supplier outages return truthful degraded-state messages.
**Plans**: 4 plans

Plans:
- [ ] 02-01-PLAN.md - Establish canonical URL query contract and home search input flow
- [ ] 02-02-PLAN.md - Ship crawlable SSR destination route and metadata wiring
- [ ] 02-03-PLAN.md - Implement cache-backed supplier search envelope with degraded-state truthfulness
- [ ] 02-04-PLAN.md - Deliver URL-synced filters/sort/map browsing and mobile performance hardening

### Phase 02.2: Home and Search Motion Audit (INSERTED)

**Goal:** Lock the homepage, header, and search-shell motion direction before UI implementation so later polish work stays accessible, search-safe, and visually coherent.
**Requirements**: DISC-01, DISC-06
**Depends on:** Phase 2
**Plans:** 3/4 plans executed

Plans:
- [x] 02.2-01-PLAN.md - Create discovery-shell audit, motion contract, and validation guardrails
- [x] 02.2-02-PLAN.md - Rebuild the homepage hero around polished travel motion
- [x] 02.2-03-PLAN.md - Polish the header and shared search shell without regressing usability
- [ ] 02.2-04-PLAN.md - Close search-shell interaction coverage gaps for keyboard, touch, and reduced-motion safety

### Phase 3: Hotel Detail and User Workspace
**Goal**: Travelers can confidently evaluate properties and manage saved stays in their account workspace.
**Depends on**: Phase 2
**Requirements**: HOTL-01, HOTL-02, HOTL-03, HOTL-04
**Success Criteria** (what must be TRUE):
  1. Hotel pages show complete supplier-backed content including amenities, gallery, policies, location, and reviews context.
  2. Travelers can select rooms and understand cancellation implications from a sticky booking card.
  3. Hotel AI Q&A returns contextual answers grounded in selected hotel data.
  4. Authenticated users can save and remove wishlist hotels and view them in account workspace.
**Plans**: 4 plans

Plans:
- [ ] 03-01-PLAN.md - Formalize hotel detail content contract and truthful completeness fallbacks
- [ ] 03-02-PLAN.md - Bind sticky booking card, room selection, and cancellation-context hand-off
- [ ] 03-03-PLAN.md - Enforce grounded, booking-safe hotel AI Q&A behavior
- [ ] 03-04-PLAN.md - Integrate authenticated wishlist flows into account workspace retrieval

### Phase 4: Checkout and Booking Lifecycle Integrity
**Goal**: Travelers can complete payment and receive one correct booking outcome with full lifecycle reliability.
**Depends on**: Phase 3
**Requirements**: BOOK-01, BOOK-02, BOOK-03, BOOK-04, BOOK-05, BOOK-06
**Success Criteria** (what must be TRUE):
  1. Travelers complete a 3-step checkout and receive confirmation details after successful payment.
  2. Stripe payment status is updated only through verified webhook events and reflected in booking records.
  3. Booking states transition only through valid lifecycle states (`pending`, `payment_authorized`, `confirmed`, `failed`, `refunded`).
  4. Retry or duplicate submit events do not create duplicate bookings or inconsistent confirmations.
  5. Confirmation/cancellation emails and invoice state reflect the real booking/payment lifecycle.
**Plans**: 4 plans

Plans:
- [ ] 04-01-PLAN.md - Enforce canonical booking lifecycle transitions with additive DB and repository guards
- [ ] 04-02-PLAN.md - Make Stripe webhook events authoritative with layered idempotent finalization
- [ ] 04-03-PLAN.md - Deliver persisted 3-step checkout UX and lifecycle-gated confirmation rendering
- [ ] 04-04-PLAN.md - Add lifecycle-driven email/outbox notifications and cancellation-invoice synchronization

### Phase 5: Admin Monetization and Launch Operations
**Goal**: Operators can monitor business health, control monetization, and run production launch safely.
**Depends on**: Phase 4
**Requirements**: OPER-01, OPER-02, OPER-03, OPER-04, OPER-05
**Success Criteria** (what must be TRUE):
  1. Admin users can review bookings, failed payments, and search-performance metrics from a unified dashboard.
  2. Commission percentage and environment mode controls update platform behavior with audit-safe constraints.
  3. Revenue reports expose gross booking value and net commission that reconcile to canonical booking/payment records.
  4. Analytics hooks emit funnel and lifecycle events needed for growth and operations monitoring.
  5. Production deployment and webhook setup are executable from documented configs with domain-ready settings.
**Plans**: TBD

### Phase 6: Auth and Booking Security Gap Closure
**Goal**: Milestone-blocking auth and booking security gaps identified by audit are closed with test-backed behavior.
**Depends on**: Phase 4
**Requirements**: AUTH-02, ARCH-01, AUTH-05
**Gap Closure**: Closes gaps from `.planning/v1.0-v1.0-MILESTONE-AUDIT.md` (AUTH-02 unsatisfied, ARCH-01 partial, AUTH-05 verification flow break)
**Success Criteria** (what must be TRUE):
  1. OAuth callback explicitly supports same-email account-link semantics for AUTH-02 and is covered by tests.
  2. Booking prebook/payment secret exposure policy is enforced so frontend receives only minimal required ephemeral payment data.
  3. Security regression tests run green without mock drift and verify redaction/forgery protections as intended.
  4. End-to-end booking security and OAuth-linking flows pass without manual workarounds.
**Plans**: 2 plans

Plans:
- [ ] 06-01-PLAN.md - Codify OAuth callback same-email linking semantics with fail-closed regression coverage
- [ ] 06-02-PLAN.md - Enforce prebook secret-safe allowlist policy and stabilize booking security regressions

### Phase 7: Canonical Data Wiring and Observability Closure
**Goal**: Canonical data consumers and structured logging are fully wired for production operations.
**Depends on**: Phase 6
**Requirements**: ARCH-04, ARCH-05
**Gap Closure**: Closes gaps from `.planning/v1.0-v1.0-MILESTONE-AUDIT.md` (ARCH-04 partial runtime wiring, ARCH-05 integration orphan)
**Success Criteria** (what must be TRUE):
  1. Runtime consumers persist and query `payment_logs`, `commission_tracking`, and `reviews_cache` for live platform operations.
  2. Booking/supplier-critical server paths emit structured events through the shared helper with actionable metadata.
  3. Data and observability wiring is validated by tests and aligns with requirements traceability.
**Plans**: 3 plans

Plans:
- [ ] 07-01-PLAN.md - Wire canonical runtime consumers for payment logs, commission tracking, and reviews cache
- [ ] 07-02-PLAN.md - Activate structured event logging taxonomy and lifecycle wiring on booking/webhook routes
- [ ] 07-03-PLAN.md - Integrate centralized error capture and safe telemetry for critical booking/webhook failures

### Phase 8: Hotel Detail Content Intelligence and Review UX
**Goal**: Travelers can evaluate properties faster through high-signal highlights, clearer review synthesis, and structured descriptions grounded in supplier data.
**Depends on**: Phase 3, Phase 7
**Requirements**: HOTL-01, HOTL-02
**Gap Closure**: Closes product parity and content-quality gaps from post-audit UX review (`.planning/research/hotel-detail-ux-gap-research-2026-02-28.md`)
**Success Criteria** (what must be TRUE):
  1. Hotel detail pages show a deterministic smart-highlights module that summarizes location, amenities, and rating context without fabricated claims.
  2. Review surfaces include concise topic-level highlights and balanced positive/trade-off summaries derived from supplier comments.
  3. Description content is rendered in structured sections with truthful fallback hierarchy when supplier narrative is partial or missing.
  4. Regression tests verify no-hallucination fallback behavior and protect highlight/topic extraction quality over time.
**Plans**: 4 plans

Plans:
- [ ] 08-01-PLAN.md - Build deterministic smart highlights contract and surface in active hotel detail experience
- [ ] 08-02-PLAN.md - Add review-topic extraction and balanced review highlights rendering
- [ ] 08-03-PLAN.md - Introduce structured description narratives with truthful fallback hierarchy
- [ ] 08-04-PLAN.md - Add regression guardrails for highlight quality and no-hallucination copy constraints

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Platform Foundation and Security | 0/4 | Complete    | 2026-02-23 |
| 2. Search and Discovery Experience | 0/4 | Not started | - |
| 02.2. Home and Search Motion Audit | 3/4 | Gap closure planned | - |
| 3. Hotel Detail and User Workspace | 4/4 | Complete | 2026-02-25 |
| 4. Checkout and Booking Lifecycle Integrity | 0/4 | Not started | - |
| 5. Admin Monetization and Launch Operations | 0/TBD | Not started | - |
| 6. Auth and Booking Security Gap Closure | 0/2 | Not started | - |
| 7. Canonical Data Wiring and Observability Closure | 0/3 | Not started | - |
| 8. Hotel Detail Content Intelligence and Review UX | 4/4 | Complete | 2026-02-28 |
