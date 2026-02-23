# Roadmap: Hostel Stays Production Hardening

## Overview

This roadmap hardens an existing booking product for production launch by locking security boundaries first, then enforcing booking and pricing correctness, then adding supplier-facing resilience controls, and finally proving launch readiness with monetization accuracy and operations guardrails.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Security Boundary Lockdown** - Eliminate launch-blocking secret, authz, CSRF, and header risks.
- [ ] **Phase 2: Booking and Checkout Integrity** - Guarantee booking/payment correctness and durable transactional behavior.
- [ ] **Phase 3: Supplier Resilience for Search and Rates** - Make upstream failures predictable, bounded, and truthful to users.
- [ ] **Phase 4: Monetization and Launch Operations Readiness** - Ensure finance visibility and operational proof for safe launch.

## Phase Details

### Phase 1: Security Boundary Lockdown
**Goal**: Travelers and operators use a platform with hardened secret handling and protected privileged/mutation paths.
**Depends on**: Nothing (first phase)
**Requirements**: SECU-01, SECU-02, SECU-03, SECU-04, SECU-05
**Success Criteria** (what must be TRUE):
  1. Release checks show no active leaked credentials in repository history and rotated production credentials are in use.
  2. A signed-in non-admin user is denied access to admin APIs and admin UI actions.
  3. Cookie-authenticated mutation requests without valid CSRF proof are rejected.
  4. Browser responses include hardened CSP and security headers on production routes.
  5. Internal booking-management endpoints reject requests when required API auth secrets are absent.
**Plans**: TBD

### Phase 2: Booking and Checkout Integrity
**Goal**: Travelers can complete checkout once, with durable booking state and correct final amounts under retries and webhook churn.
**Depends on**: Phase 1
**Requirements**: BOOK-01, BOOK-02, BOOK-03, BOOK-04, BOOK-05, MONE-03
**Success Criteria** (what must be TRUE):
  1. Repeating booking finalization with the same idempotency context results in one committed booking outcome.
  2. Confirmed bookings persist required identity, stay, amount, payment, and confirmation fields for later retrieval.
  3. The charged/confirmed booking amount matches the signed quote and checkout total shown to the traveler.
  4. Duplicate or replayed supplier webhooks do not create duplicate state transitions and final status reconciles correctly.
  5. Promo and discount application cannot be double-applied or abused to alter totals outside policy.
**Plans**: TBD

### Phase 3: Supplier Resilience for Search and Rates
**Goal**: Travelers receive reliable search/rate behavior with bounded latency and honest failure signals during supplier instability.
**Depends on**: Phase 2
**Requirements**: SRCH-01, SRCH-02, SRCH-03
**Success Criteria** (what must be TRUE):
  1. Search requests with empty input or invalid date chronology are rejected with actionable validation errors.
  2. Upstream supplier calls honor explicit timeout and retry policies and do not hang booking-critical user flows.
  3. When live supplier data is unavailable, search/rate endpoints return truthful degraded-state responses instead of misleading success.
**Plans**: TBD

### Phase 4: Monetization and Launch Operations Readiness
**Goal**: Finance and operations teams can trust revenue reporting and run the platform confidently at launch traffic.
**Depends on**: Phase 3
**Requirements**: MONE-01, MONE-02, OPER-01, OPER-02, OPER-03
**Success Criteria** (what must be TRUE):
  1. Revenue and commission outputs reconcile against canonical booking records for the same period.
  2. Failed bookings and payment anomalies are captured with queryable records for finance/ops investigation.
  3. Operators can monitor booking funnel SLIs with correlation IDs and receive actionable alerts on threshold breaches.
  4. Runbooks for payment outage, supplier outage, webhook delay/replay, and partial data-store failures are executable end-to-end by on-call staff.
  5. Load and resilience test results demonstrate expected launch traffic/concurrency can be handled within defined reliability targets.
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Security Boundary Lockdown | 0/TBD | Not started | - |
| 2. Booking and Checkout Integrity | 0/TBD | Not started | - |
| 3. Supplier Resilience for Search and Rates | 0/TBD | Not started | - |
| 4. Monetization and Launch Operations Readiness | 0/TBD | Not started | - |
