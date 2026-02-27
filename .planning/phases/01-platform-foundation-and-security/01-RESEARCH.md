# Phase 01 Research - Platform Foundation and Security

## Scope

Phase 1 requirements: `ARCH-01`, `ARCH-02`, `ARCH-03`, `ARCH-04`, `ARCH-05`, `AUTH-01`, `AUTH-02`, `AUTH-03`, `AUTH-04`, `AUTH-05`.

## Current Codebase Signals

- Existing backend boundaries already exist in `src/app/api/*` and `src/server/*`, including LiteAPI utilities (`src/server/liteapi.ts`) and env validation (`src/server/env.ts`).
- Auth surfaces exist (login/signup pages and Supabase callbacks), but current roadmap now requires explicit email/password + JWT expectations, Google OAuth linking behavior, and stronger RBAC/CSRF/rate-limit guarantees.
- Database foundation exists through Supabase SQL migrations, but canonical domain coverage for `CommissionTracking` and `ReviewsCache` needs explicit schema-level ownership and docs/tests.

## Planning Constraints

1. Preserve brownfield architecture (Next.js App Router + Supabase + LiteAPI), no re-platforming.
2. Keep all LiteAPI key usage server-only and centralize environment-mode switching in server config.
3. Finish canonical persistence and auth boundaries before discovery/checkout phases.
4. Security controls must be enforceable by tests and production readiness checks (not documentation-only).

## Recommended Plan Slices

1. **Core runtime boundary and environment hardening**
   - Server-only LiteAPI proxy contracts, sandbox/production switching, stateless API conventions.
2. **Canonical schema and observability foundation**
   - Complete canonical tables and repositories, structured logging and error capture standards.
3. **Identity and authorization boundary**
   - Email/password auth, Google OAuth linking, JWT session contract, admin RBAC.
4. **Request protection and response sanitization**
   - CSRF/rate-limit/secure headers, input validation and supplier response sanitization.

## Risks to Explicitly Plan Around

- Auth implementation conflicts with existing Supabase session model. Mitigation: define one canonical session contract and test for it.
- Security hardening can break current booking/search routes. Mitigation: route-level regression checks in each plan.
- Schema additions can drift from existing migrations. Mitigation: migration-first tasks plus verification via Supabase SQL checks.

## Output Requirement for Planning

Create 4 executable PLAN.md files in `.planning/phases/01-platform-foundation-and-security/`, with wave/dependency mapping and full requirement coverage.
