# Story 1.1: zzzello liteapi only booking

Status: ready-for-dev

## Story

As a traveler and OTA operations team,
I want the Travel-webapp experience to match zzzello-style core functionality while enforcing LiteAPI as the only supplier booking lifecycle backend,
so that users get competitive parity and the platform can run reliable, auditable booking operations without mixed supplier logic.

## Acceptance Criteria

1. Public UX parity baseline is achieved across `/`, `/search`, `/stays/[destination]`, `/hotels/[hotelId]`, `/booking`, and `/bookings/[bookingId]` for core discovery, detail, checkout, confirmation, and cancellation flows.
2. End-to-end booking lifecycle (prebook, pay, book, booking status, cancel, refund reconciliation, support handoff) uses LiteAPI contracts only for supplier actions.
3. No non-LiteAPI supplier call is used to create, confirm, retrieve supplier status, or cancel travel bookings.
4. `language` and `currency` selections are propagated through search/detail/rates/booking APIs and cache keys so user selections affect actual data responses, not only local UI state.
5. Occupancy sent to supplier prebook/book reflects the selected guests/rooms and is never hardcoded.
6. Booking return/finalization remains resilient under refresh/reopen/retry and preserves signed session integrity with idempotent finalize behavior.
7. Webhook reconciliation for LiteAPI is deterministic, idempotent, signature-verified, and transition-safe for out-of-order/duplicate events.
8. Cancellation in LiteAPI mode is not blocked by Stripe-only artifacts; lifecycle outcome is tracked until reconciliation completion.
9. Support handoff payload contains booking identifiers and lifecycle context required by LiteAPI support operations and is persisted for audit.
10. Admin operations expose reconciliation, settlement-ledger, and support SLA endpoints with correct defaults and mismatch detection semantics.
11. Regression test coverage exists for all updated booking lifecycle and parity-critical behaviors, and full test suite passes.
12. Production readiness docs/config explicitly describe LiteAPI-primary mode and rollout/validation gates.

## Tasks / Subtasks

- [ ] Task 1: Lock LiteAPI-only supplier contract boundaries (AC: 2, 3, 8)
  - [ ] Audit booking lifecycle codepaths and remove/guard any non-LiteAPI supplier operations.
  - [ ] Ensure mode-gated fallback behavior does not violate LiteAPI-only supplier lifecycle in primary mode.
  - [ ] Verify cancellation path always attempts LiteAPI cancel when supplier booking id exists.
- [ ] Task 2: Achieve zzzello parity on core discovery/detail/checkout UX behavior (AC: 1, 4)
  - [ ] Align listing/detail/checkout behavior with parity expectations from `ZZZELLO_GAP_REPORT.md`.
  - [ ] Propagate `language`/`currency` from UI state into APIs, server calls, and cache-key dimensions.
  - [ ] Preserve full-card navigation and improve list/detail information density without breaking current flows.
- [ ] Task 3: Correct booking payload integrity and session resilience (AC: 5, 6)
  - [ ] Ensure guest occupancy in prebook/book payloads is derived from selected guest state.
  - [ ] Guarantee session persistence and replay-safe finalization across refresh/redirect/browser storage edge cases.
  - [ ] Keep quote/session signature verification and finalization lock semantics intact.
- [ ] Task 4: Harden webhook-driven lifecycle state transitions (AC: 7)
  - [ ] Validate signature/timestamp checks and event dedupe behavior.
  - [ ] Ensure supplier status mapping stays canonical and transition-safe.
  - [ ] Verify duplicate and out-of-order webhook events do not corrupt booking lifecycle state.
- [ ] Task 5: Strengthen support and operations visibility (AC: 9, 10)
  - [ ] Ensure support handoff packet completeness and persisted metadata.
  - [ ] Verify reconciliation/settlement/SLA API semantics and query parameter defaults.
  - [ ] Confirm reconciliation expected commission derives correctly when booking commission is missing but metadata percent exists.
- [ ] Task 6: Regression and launch confidence (AC: 11, 12)
  - [ ] Add/refresh tests for LiteAPI booking/cancel/reconcile/support/admin-report routes.
  - [ ] Run full `npm test` and fix failures.
  - [ ] Update runbook docs for LiteAPI-primary deployment and validation sequence.

## Dev Notes

- No `epics.md`, `prd.md`, `architecture.md`, or UX spec artifacts were discovered under `_bmad-output/planning-artifacts`; this story is grounded in repository docs and implemented code.
- This is a comprehensive parity/lifecycle story that consolidates ongoing P0/P1 work from technical research and gap report into a single implementation context.

### Technical Requirements

- Supplier booking lifecycle boundaries:
  - Supplier prebook must remain `POST /rates/prebook` with `usePaymentSdk: true`.
  - Supplier book must remain `POST /rates/book` with `payment.method=TRANSACTION_ID`.
  - Supplier booking retrieval/cancellation must remain LiteAPI `/bookings` endpoints.
- Local persistence and lifecycle:
  - Keep local booking lifecycle canonical states: `pending`, `payment_authorized`, `confirmed`, `failed`, `refunded`.
  - Preserve idempotency lock/cached finalize-result behavior in booking finalize API.
- Security and correctness:
  - Keep webhook HMAC/timestamp verification strict.
  - Keep signed quote/session and booking-view token integrity checks.
  - Keep admin/authz boundaries for operational APIs.

### Architecture Compliance

- Continue using Next.js App Router route handlers as BFF boundaries under `src/app/api/**`.
- Keep supplier integration logic centralized in `src/server/liteapi.ts`; avoid duplicating supplier request logic in route handlers.
- Keep booking lifecycle transitions centralized via repository/lifecycle helpers, not ad-hoc status updates in UI.
- Keep feature-level UI logic within `src/features/**` and avoid leaking server secrets to client components.

### Library / Framework Requirements

- Next.js 15 + React 19 conventions must be preserved (`next` `^15.5.12`, `react` `19.0.0`).
- Validation remains Zod-based for route contracts.
- Tests remain Vitest-based and should extend existing admin/booking/webhook test suites.
- LiteAPI SDK/fetch integration remains on current `liteapi-node-sdk` major in this repo (`^4.3.2`) unless explicit migration is planned and tested.

### File Structure Requirements

- Primary backend files:
  - `src/server/liteapi.ts`
  - `src/app/api/booking/prebook/route.ts`
  - `src/app/api/booking/book/route.ts`
  - `src/app/api/bookings/[bookingId]/cancel/route.ts`
  - `src/app/api/webhooks/liteapi/route.ts`
  - `src/app/api/support/liteapi/route.ts`
  - `src/server/booking/repository.ts`
  - `src/server/booking/lifecycle.ts`
- Parity and UX propagation files:
  - `src/features/search/stores/search-ui-store.ts`
  - `src/features/search/hooks/*`
  - `src/features/search/components/*`
  - `src/app/search/page.tsx`
  - `src/app/stays/[destination]/page.tsx`
  - `src/app/hotels/[hotelId]/page.tsx`
  - `src/app/booking/page.tsx`
- Operations/admin files:
  - `src/server/admin/reconciliation-report.ts`
  - `src/server/admin/settlement-ledger-report.ts`
  - `src/server/admin/support-sla-report.ts`
  - `src/app/api/admin/reconciliation/route.ts`
  - `src/app/api/admin/support/sla/route.ts`
  - `src/app/api/admin/settlement/ledger/route.ts`
- Tests to touch:
  - `tests/admin/reconciliation-routes.test.ts`
  - `tests/admin/support-operations-routes.test.ts`
  - `tests/booking-finalize-idempotency.test.ts`
  - `tests/stripe-webhook-route.test.ts`
  - Add LiteAPI webhook/cancel/support regressions where missing.

### Testing Requirements

- Must add/maintain AC-traceable tests:
  - Booking prebook/book happy path and invalid signature/session scenarios.
  - Finalize idempotency and retry behavior.
  - LiteAPI webhook duplicate and out-of-order handling.
  - Cancellation in LiteAPI mode without Stripe-only artifacts.
  - Support handoff payload completeness and persistence.
  - Admin reconciliation/SLA parser defaults and mismatch computation.
- Required verification commands:
  - `npm test`
  - `npm run typecheck`
  - `npm run build`

### Previous Story Intelligence

- No prior implementation-artifact story files were found for this project, so there are no previous story dev/review learnings to inherit.

### Git Intelligence Summary

- Current repository already contains hardened booking lifecycle patterns (idempotency lock, signature verification, webhook dedupe).
- Latest fixes already landed for:
  - Expected commission derivation precedence in reconciliation.
  - Correct default handling for missing `days` and `breachHours` query params.
- Maintain these fixes and avoid regressions while expanding parity scope.

### Latest Tech Information

- LiteAPI reference contracts used in this story:
  - Overview, prebook, book, bookings list/retrieve/cancel, JS SDK.
- Current stack versions are aligned with modern runtime expectations (Next 15, React 19, TypeScript 5.7, Vitest 3).
- No framework migration is required for this story; implementation should focus on parity completeness and lifecycle hardening.

### Project Structure Notes

- Project follows monorepo-style single app layout with:
  - App routes in `src/app`
  - Feature modules in `src/features`
  - Supplier/business logic in `src/server`
  - Automated tests in `tests`
- Keep additions within established folders and naming conventions.
- Do not add new supplier abstraction layers unless required by explicit multi-supplier roadmap.

### References

- [Source: docs/PRODUCT_OVERVIEW.md#Key Features — What's Already Built]
- [Source: docs/WHATS_BUILT.md#Backend Systems (What Powers the App Behind the Scenes)]
- [Source: docs/LITEAPI_FULL_FLOW_PLAN.md#Execution Plan]
- [Source: ZZZELLO_GAP_REPORT.md#Critical Gaps (What’s Missing vs ZZZello)]
- [Source: _bmad-output/planning-artifacts/research/technical-travel-webapp-parity-zzzello-liteapi-research-2026-03-04.md#Executive Summary]
- [Source: src/server/liteapi.ts]
- [Source: src/app/api/booking/prebook/route.ts]
- [Source: src/app/api/booking/book/route.ts]
- [Source: src/app/api/bookings/[bookingId]/cancel/route.ts]
- [Source: src/app/api/webhooks/liteapi/route.ts]
- [Source: src/app/api/support/liteapi/route.ts]
- [Source: src/server/admin/reconciliation-report.ts]
- [Source: src/app/api/admin/reconciliation/route.ts]
- [Source: src/app/api/admin/support/sla/route.ts]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story generated via BMAD `create-story` workflow in YOLO-style automation due missing sprint-status.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story key provided by user: `zzzello-liteapi-only-booking`.
- Epic/story defaults applied: `1.1` (no sprint-status or explicit numeric story key provided).

### File List

- _bmad-output/implementation-artifacts/zzzello-liteapi-only-booking.md
