# LiteAPI Full Booking Flow Plan

## Goal
Make LiteAPI the primary owner of booking lifecycle operations (payment SDK flow, booking finalization, cancellation/refund reconciliation, support routing, and commission via LiteAPI margin) while keeping Stripe optional only in fallback modes.

## Scope Boundaries
- In scope: backend/API flow ownership, webhook reconciliation, env/readiness policy, support handoff data, tests, rollout strategy.
- Out of scope (this phase): redesign of checkout UI, new CRM/ticketing platform integration, schema overhauls unrelated to booking lifecycle.

## Locked Decisions
- Payment primary path is LiteAPI SDK (`usePaymentSdk: true`) + `TRANSACTION_ID` booking confirmation.
- Lifecycle source of truth is LiteAPI + LiteAPI webhooks.
- Stripe remains optional fallback only (mode-based), not hard-required for production.
- Commission logic moves from local markup ownership to LiteAPI margin/additionalMarkup usage.

## Execution Plan

### Plan 01 - Mode Strategy + Readiness Policy
**Objective:** Add explicit provider mode and stop forcing Stripe when LiteAPI mode is active.

**Files**
- `src/server/env.ts`
- `.env.example`
- `README.md`

**Actions**
- Add `PAYMENT_PROVIDER` enum (`liteapi | hybrid | stripe`) with default `liteapi`.
- Make Stripe env checks conditional (required only in `stripe` or `hybrid`).
- Keep LiteAPI key/webhook checks strict in production.
- Document Windows git-path workaround + provider mode env matrix in docs/readme.

**Verify**
- `npm run typecheck`
- Start app with `PAYMENT_PROVIDER=liteapi` and no Stripe keys in `.env.local`; readiness must pass.
- Start app with `PAYMENT_PROVIDER=stripe` and missing Stripe keys; readiness must fail with clear message.

**Done**
- App can run production-readiness checks in LiteAPI mode without Stripe vars.
- Stripe mode still enforces Stripe credentials.

---

### Plan 02 - Commission Ownership Migration
**Objective:** Use LiteAPI margin in rate requests; local quote stays for integrity/signing only.

**Files**
- `src/server/liteapi.ts`
- `src/app/api/hotels/rates/route.ts`
- `src/server/settings/repository.ts`
- `src/server/pricing.ts`
- `src/app/api/booking/prebook/route.ts`

**Actions**
- Extend `getHotelRates` request payload to include LiteAPI margin/additionalMarkup when configured.
- Feed commission percent from app settings into rates call as LiteAPI margin.
- Remove local quote markup multiplication from prebook path (use exact supplier price in signed quote).
- Keep signature/tamper protection intact.

**Verify**
- `npm run typecheck`
- `npm run test -- booking`
- Trigger rates API and inspect request payload in server logs/trace for margin field.

**Done**
- Rates/prebook totals are sourced from LiteAPI pricing strategy.
- Signed quotes remain valid and verifiable.

---

### Plan 03 - Checkout Canonicalization (LiteAPI Primary)
**Objective:** Ensure checkout path is LiteAPI-first and Stripe session endpoint is mode-gated.

**Files**
- `src/app/api/checkout/session/route.ts`
- `src/features/booking/components/booking-console.tsx`
- `src/app/booking/return/booking-return-client.tsx`
- `src/app/api/booking/book/route.ts`

**Actions**
- In LiteAPI mode, disable Stripe session endpoint with explicit 410/feature-disabled response.
- Keep SDK launch + return/finalize loop as canonical path.
- Harden replay safety and stale session handling on return flow.

**Verify**
- `npm run typecheck`
- In LiteAPI mode: `/api/checkout/session` returns disabled response.
- Full sandbox flow: prebook -> LiteAPI payment widget -> return -> `/api/booking/book` success.

**Done**
- Standard checkout no longer depends on Stripe endpoint.
- Booking can finalize end-to-end through LiteAPI SDK path.

---

### Plan 04 - Cancellation + Refund Ownership
**Objective:** Cancellation handled by LiteAPI first; refunds reconciled by lifecycle events.

**Files**
- `src/app/api/bookings/[bookingId]/cancel/route.ts`
- `src/server/liteapi.ts`
- `src/server/booking/repository.ts`

**Actions**
- Call LiteAPI cancellation endpoint as canonical cancel action.
- In LiteAPI mode, do not require Stripe refund artifacts to process cancellation.
- Persist cancellation intent and set lifecycle outcome to await webhook reconciliation.
- Keep Stripe refund path only for `hybrid/stripe` modes.

**Verify**
- `npm run typecheck`
- Cancel a confirmed booking in LiteAPI mode without Stripe metadata; API should succeed and mark pending reconciliation.

**Done**
- Cancellation is not blocked by missing Stripe IDs in LiteAPI mode.
- Lifecycle state remains consistent until webhook final status arrives.

---

### Plan 05 - Webhook Mapping and Idempotency Hardening
**Objective:** Make LiteAPI webhook events fully drive lifecycle transitions safely.

**Files**
- `src/app/api/webhooks/liteapi/route.ts`
- `src/server/booking/lifecycle.ts`
- `src/server/booking/repository.ts`
- `src/server/webhook-idempotency.ts`

**Actions**
- Add explicit event-type/status mapping table for LiteAPI booking/cancel/refund events.
- Normalize supplier statuses to canonical local lifecycle states.
- Enforce transition guards and idempotent replay handling.

**Verify**
- `npm run test -- webhook`
- Replay identical LiteAPI webhook payload twice; second attempt must be deduped.
- Inject out-of-order events; invalid transitions must be rejected and logged.

**Done**
- Webhook processing is deterministic, idempotent, and transition-safe.

---

### Plan 06 - Support Handoff (24/7 Ops Ready)
**Objective:** Route support cases to LiteAPI operations with complete context package.

**Files**
- `src/app/api/support/liteapi/route.ts` (new)
- `src/app/bookings/[bookingId]/page.tsx`
- `src/server/booking/repository.ts`

**Actions**
- Add support handoff endpoint that packages `bookingId`, `liteapiBookingId`, `transactionId`, `clientReference`, status timeline.
- Add booking page action/button to trigger support handoff payload generation.
- Persist support request metadata on booking record.

**Verify**
- `npm run typecheck`
- Trigger handoff from booking page and confirm payload contains required identifiers.

**Done**
- Support requests are consistently package-complete for LiteAPI/Nuitee handoff.

---

### Plan 07 - Test + Rollout
**Objective:** Prove reliability and deploy with low risk.

**Files**
- `tests/booking-flow/*.test.ts` (existing/new)
- `tests/webhooks/*.test.ts` (existing/new)
- `docs/NEXT_PHASE_ROADMAP.md`

**Actions**
- Add tests for end-to-end happy path and failure/retry paths.
- Add test coverage for cancellation/refund lifecycle under LiteAPI mode.
- Define rollout gates: sandbox only -> hybrid shadow -> liteapi primary.

**Verify**
- `npm run test`
- `npm run typecheck`
- `npm run build`

**Done**
- All CI checks pass.
- Rollout checklist is documented and executable.

## Dependency Order
1. Plan 01
2. Plan 02
3. Plan 03 + Plan 05
4. Plan 04
5. Plan 06
6. Plan 07

## Risk Controls
- Keep Stripe code paths behind mode gates instead of immediate deletion.
- Use webhook idempotency and transition validation as hard safety rails.
- Preserve signed checkout session and quote signatures to prevent tampering.

## Approval Gates
- Gate A (after Plan 01-02): approve env + commission model behavior.
- Gate B (after Plan 03-05): approve LiteAPI-only booking and lifecycle behavior.
- Gate C (after Plan 06-07): approve support handoff and rollout readiness.
