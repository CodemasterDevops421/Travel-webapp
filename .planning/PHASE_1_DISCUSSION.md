# Phase 1 Discussion - Security Boundary Lockdown

**Date:** 2026-02-23
**Mode:** Auto (`/gsd-discuss-phase 1 --auto`)

## Objective

Phase 1 secures launch-blocking boundaries so the platform fails closed for privileged access and booking-management APIs while blocking common browser attack paths.

Covered requirements: `SECU-01`, `SECU-02`, `SECU-03`, `SECU-04`, `SECU-05`.

## Evidence from Current Codebase

- Booking API auth is optional when `BOOKING_API_AUTH_SECRET` is missing (`src/server/authz.ts`).
- Admin API and UI gate on authentication only (no explicit role check) (`src/app/api/admin/stats/route.ts`, `src/app/admin/page.tsx`).
- CSRF helper exists but is not enforced on mutation endpoints (`src/server/csrf.ts`, `src/app/api/wishlist/route.ts`, `src/app/api/promo/validate/route.ts`).
- CSP currently allows `unsafe-inline` and `unsafe-eval` globally (`next.config.mjs`).
- Production checks exist in `assertProductionReadiness`, but secret hygiene still needs operational controls (`src/server/env.ts`, `.env.example`, release workflow).

## Plan Options Considered

### Option A - Requirement-by-requirement (5 small plans)

- One plan per requirement for strict traceability.
- Pros: very clear acceptance mapping.
- Cons: overhead and repeated test/setup work.

### Option B - Boundary-based bundles (4 plans)

- Group closely related controls into implementation bundles.
- Pros: better delivery flow and lower integration churn.
- Cons: each plan touches multiple files/domains.

### Option C - Single hardening sprint (1 large plan)

- Do all phase requirements in one pass.
- Pros: fastest on paper.
- Cons: high blast radius and difficult rollback.

## Auto Selection

Selected: **Option B (4 plans)**.

Rationale: keeps risk bounded while still minimizing context switching.

## Approved Plan Breakdown

### Plan 1.1 - Secret Hygiene and Fail-Closed Booking Auth

**Requirements:** `SECU-01`, `SECU-05`

Scope:
- Enforce fail-closed booking API auth behavior in production paths.
- Tighten env validation and startup checks for auth and signing secrets.
- Add release-time secret scanning/verification checklist and document credential rotation expectations.
- Ensure internal booking-management endpoints return explicit auth failure when secret is absent/mismatched.

Acceptance:
- Production run with missing booking auth secret fails readiness checks.
- Booking-management routes reject unauthorized calls in production mode.

### Plan 1.2 - Admin RBAC Boundary

**Requirements:** `SECU-02`

Scope:
- Add explicit admin role/claim checks on admin APIs.
- Enforce same authorization boundary for `/admin` UI data access.
- Add tests for non-admin authenticated user denial and admin allow cases.

Acceptance:
- Authenticated non-admin user receives deny response on admin routes.
- Admin user can access stats and dashboard successfully.

### Plan 1.3 - CSRF Enforcement on Cookie-Auth Mutations

**Requirements:** `SECU-03`

Scope:
- Apply `assertSameOrigin` (or equivalent) on cookie-authenticated mutation routes.
- Standardize which HTTP methods require CSRF enforcement.
- Add tests for missing/invalid Origin and valid same-origin requests.

Acceptance:
- Cross-origin mutation attempts are rejected.
- Legitimate same-origin mutations continue to work.

### Plan 1.4 - Security Header and CSP Hardening

**Requirements:** `SECU-04`

Scope:
- Harden CSP directives to reduce inline/eval execution where possible.
- Keep required third-party payment frame/script allowances scoped.
- Add verification checks for expected headers across app and API routes.

Acceptance:
- Security headers are present on production routes.
- CSP is stricter than baseline while preserving booking/payment flow.

## Execution Order

1. Plan 1.1
2. Plan 1.2
3. Plan 1.3
4. Plan 1.4

Reasoning: fail-closed secret/auth boundary first, then privilege boundary, then CSRF mutation protection, then CSP/header tightening once functionality-critical auth flows are stable.

## Risks and Mitigations

- Role source ambiguity (where admin claim is stored): resolve by standardizing a single helper and test fixture.
- CSRF enforcement can break legitimate clients: enforce only on cookie-auth mutation routes and validate with route tests.
- CSP hardening can break checkout embeds/scripts: stage with report-first validation in non-prod and explicit allowlist review.

## Done Criteria for Phase 1

Phase 1 is complete when all four plans pass tests and satisfy roadmap success criteria 1-5 for Security Boundary Lockdown.
