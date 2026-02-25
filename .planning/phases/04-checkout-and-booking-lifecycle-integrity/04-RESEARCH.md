# Phase 4: Checkout and Booking Lifecycle Integrity - Research

**Researched:** 2026-02-25
**Domain:** Stripe-backed checkout finalization, webhook-truth payment reconciliation, and booking lifecycle correctness
**Confidence:** MEDIUM-HIGH

## User Constraints

- No `CONTEXT.md` exists for this phase; research is constrained by roadmap, requirements, prior phase outputs, and current codebase patterns.
- Preserve secure backend boundaries and fail-closed patterns from earlier phases.
- Existing app already has booking/prebook routes, supplier integration, and auth/rate-limit/csrf foundations.
- Existing patterns emphasize additive, idempotent-safe changes and truthful degraded-state metadata.

## Summary

Phase 4 should be planned as a **correctness and reconciliation hardening phase** over the existing booking pipeline, not a rewrite. The codebase already has a prebook -> payment return -> finalize sequence, lock-based idempotency, webhook idempotency primitives, and persisted booking/payment fields. The major gap is that payment truth is currently coupled to LiteAPI flow and free-form statuses, while requirements demand Stripe-verified webhook authority and strict lifecycle transitions.

The planning center of gravity is a single source of truth model: user actions can initiate checkout, but only verified Stripe webhook events can advance payment state. This means the return page should become a pending/progress surface unless local state already reflects a webhook-confirmed outcome. Lifecycle transitions must be explicit and enforced (pending, payment_authorized, confirmed, failed, refunded) with guardrails at both application and database layers.

To satisfy BOOK-04..06 robustly, plan for idempotency across three boundaries: request boundary (client retries/double-submit), provider boundary (Stripe idempotency keys + event dedupe), and persistence boundary (unique constraints + transition checks). Side effects (confirmation/cancellation email, invoice status updates) should be outbox-driven off state transitions, never inline in synchronous request handlers.

**Primary recommendation:** Implement a webhook-authoritative booking state machine with strict transition guards, DB-backed idempotency keys, and async notification/invoice side effects.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BOOK-01 | Checkout follows a 3-step flow (guest details, payment, confirmation) with persisted progress | Keep existing 3-step UX (`booking-console.tsx`) but persist step/session server-side and render confirmation only from lifecycle-confirmed booking state |
| BOOK-02 | Stripe payments support sandbox testing and verified webhook handling for payment state updates | Use Stripe SDK webhook signature verification with raw body (`constructEvent`), Stripe CLI sandbox tests, event filtering, and idempotent event processing |
| BOOK-03 | Booking lifecycle transitions are enforced as `pending`, `payment_authorized`, `confirmed`, `failed`, `refunded` | Add explicit state machine in app + DB constraints/trigger checks; reject illegal transitions and preserve transition audit metadata |
| BOOK-04 | Booking finalization is idempotent and prevents duplicate confirmations on retries/concurrency | Reuse `booking-idempotency.ts` lock/cache pattern, add unique DB keys for payment intent/session IDs, and dedupe webhook events by event ID |
| BOOK-05 | Booking records persist `liteapi_booking_id`, confirmation code, payment status, totals, and commission amount | Existing `bookings` columns already support this; plan focuses on reliable population timing and reconciliation writes from webhook-truth state |
| BOOK-06 | Confirmation emails are sent with HTML templates and cancellation actions update booking/invoice state correctly | Add async notification/outbox pipeline, HTML templates, and cancellation/refund webhook mapping to booking + invoice-state fields |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router route handlers | `^15.5.12` (repo) | Checkout APIs, webhook endpoints, booking return reconciliation | Already the platform transport layer; supports raw body handling needed for webhook verification |
| Stripe Node SDK (`stripe`) | `^20.x` | Checkout session/payment intent creation, webhook signature verification, refund API integration | Official SDK path for signature verification and payment primitives |
| Stripe.js + React Stripe.js | `@stripe/stripe-js ^8.x`, `@stripe/react-stripe-js ^5.x` | PCI-safe client payment collection in checkout step 2 | Official client path; keeps card details off app server |
| Supabase Postgres | current project DB | Canonical lifecycle, payment logs, invoice state, and idempotency keys | Existing canonical persistence + additive migration pattern already established |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | `^3.24.1` (repo) | Validate webhook envelopes, transition requests, and side-effect payloads | Every untrusted boundary (webhooks, mutation endpoints, queue payloads) |
| Upstash Redis | `@upstash/redis ^1.35.3` (repo) | Webhook/event idempotency and short-lived finalize locks | Runtime dedupe and lock coordination across concurrent requests |
| React Email + Resend (or provider adapter) | React Email current, Resend current | HTML confirmation/cancellation templates + delivery API | BOOK-06 email delivery with template versioning and deterministic rendering |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Stripe Checkout/Elements + Stripe webhooks | Keep LiteAPI payment widget as payment authority | Lower implementation work, but does not satisfy explicit Stripe webhook-truth requirement cleanly |
| DB-enforced transition checks (trigger + constraints) | App-only transition guard | Simpler code path, but weaker integrity under race conditions/manual writes |
| Outbox-based async email/invoice updates | Inline send inside booking/webhook handler | Fewer moving parts initially, but higher timeout/retry risk and side-effect duplication |

**Installation:**
```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js resend @react-email/components
```

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── app/
│   ├── booking/page.tsx                         # Step UX shell
│   ├── booking/return/page.tsx                  # Post-payment status surface
│   ├── api/checkout/session/route.ts            # Create Stripe checkout/payment session
│   ├── api/booking/finalize/route.ts            # Idempotent finalize request boundary
│   ├── api/webhooks/stripe/route.ts             # Stripe webhook verification + enqueue
│   └── api/bookings/[bookingId]/cancel/route.ts # Cancel/refund initiation boundary
├── server/
│   ├── payments/stripe.ts                       # Stripe client + typed helpers
│   ├── booking/lifecycle.ts                     # State machine + transition guards
│   ├── booking/repository.ts                    # Canonical persistence and lookup
│   ├── booking-idempotency.ts                   # Existing lock/cache dedupe
│   ├── webhook-idempotency.ts                   # Existing event dedupe primitives
│   └── notifications/email.ts                   # Outbox consumer + provider adapter
└── emails/
    ├── booking-confirmation.tsx                 # HTML template
    └── booking-cancellation.tsx                 # HTML template
```

### Pattern 1: Webhook-Authoritative Payment Truth
**What:** Only verified Stripe webhook events are allowed to mutate `payment_status` and lifecycle state.
**When to use:** Every payment success/failure/refund transition.
**Example:**
```typescript
// Source: https://raw.githubusercontent.com/stripe/stripe-node/master/examples/webhook-signing/nextjs/app/api/webhooks/route.ts
const sig = headers().get('stripe-signature');
const event = stripe.webhooks.constructEvent(await request.text(), sig!, process.env.STRIPE_WEBHOOK_SECRET!);
```

### Pattern 2: Idempotent Finalization Across Request + Provider + DB
**What:** Combine transaction locks, Stripe idempotency keys, and unique DB keys.
**When to use:** `finalize` endpoint, webhook event processing, refund/cancel operations.
**Example:**
```typescript
// Source: https://docs.stripe.com/api/idempotent_requests
await stripe.paymentIntents.create(payload, { idempotencyKey: bookingAttemptKey });
```

### Pattern 3: Explicit Lifecycle State Machine
**What:** Central transition map enforces legal moves only.
**When to use:** Any booking status update from APIs, webhooks, or admin repair tools.
**Example:**
```typescript
const allowed: Record<string, string[]> = {
  pending: ['payment_authorized', 'failed'],
  payment_authorized: ['confirmed', 'failed', 'refunded'],
  confirmed: ['refunded'],
  failed: [],
  refunded: []
};
```

### Pattern 4: Fast-Ack Webhook + Async Side Effects
**What:** Verify signature, dedupe, persist transition, return `2xx`; process email/invoice tasks asynchronously.
**When to use:** Stripe webhook handler.
**Example:**
```typescript
// Source: https://docs.stripe.com/webhooks
// Persist minimal transition atomically, enqueue side effects, then return 200 quickly.
return NextResponse.json({ received: true }, { status: 200 });
```

### Anti-Patterns to Avoid
- **Client-authoritative confirmation:** do not treat return URL completion as payment truth.
- **Free-form booking status strings:** avoid uncontrolled statuses that bypass lifecycle invariants.
- **Webhook inline side effects:** do not send emails/update multiple external systems before webhook ack.
- **Idempotency in one layer only:** lock-only or key-only solutions are insufficient under retries + concurrency.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stripe signature parsing | Custom HMAC parser for `Stripe-Signature` | `stripe.webhooks.constructEvent` | Official parser handles canonicalization and signature format edge cases |
| Payment retry safety | Homegrown retry token semantics only | Stripe idempotency keys + DB unique keys + existing lock module | Duplicate prevention needs provider + DB + app coordination |
| Email HTML compatibility | Manual table/inline CSS builder | React Email components + provider SDK | Cross-client rendering and template maintainability are deceptively hard |
| Lifecycle integrity | Ad-hoc `if/else` updates in routes | Central lifecycle service + DB constraint/trigger checks | Prevents hidden illegal transitions and drift across endpoints |

**Key insight:** Reliability comes from layered correctness (webhook verification, transition enforcement, idempotency, async side effects), not any single safeguard.

## Common Pitfalls

### Pitfall 1: Treating Redirect Return as Success
**What goes wrong:** User sees confirmation before webhook-confirmed payment.
**Why it happens:** Return-page logic finalizes on client redirect timing.
**How to avoid:** Render `processing` until booking row reflects webhook-authorized state.
**Warning signs:** Confirmed pages with missing Stripe event records.

### Pitfall 2: Invalid State Jumps During Retries
**What goes wrong:** Booking moves directly from `pending` to `refunded` or oscillates between states.
**Why it happens:** No centralized transition map or DB guard.
**How to avoid:** Enforce allowed transitions in one service and backstop with DB checks.
**Warning signs:** Status history contains impossible sequences.

### Pitfall 3: Duplicate Bookings on Concurrent Submit/Webhook Replays
**What goes wrong:** Multiple local bookings map to one payment or one supplier booking.
**Why it happens:** Missing unique keys for provider IDs and incomplete dedupe.
**How to avoid:** Unique indexes (`stripe_payment_intent_id`, `stripe_checkout_session_id`, `liteapi_booking_id`) plus event-id dedupe.
**Warning signs:** Same `payment_intent` appears in multiple booking rows.

### Pitfall 4: Webhook Timeouts Causing Replays
**What goes wrong:** Stripe retries events, producing duplicate side effects.
**Why it happens:** Heavy synchronous work before `2xx` response.
**How to avoid:** Persist minimal state + queue side effects, ack quickly.
**Warning signs:** Many repeated deliveries for same event ID.

### Pitfall 5: Email/Invoice Divergence from Real Lifecycle
**What goes wrong:** Confirmation email sent for failed payment or canceled booking still marked invoiced.
**Why it happens:** Side effects triggered from client path, not lifecycle transitions.
**How to avoid:** Emit side effects from transition events only (`confirmed`, `refunded`, `failed`).
**Warning signs:** Message content or invoice status disagrees with booking/payment logs.

## Code Examples

Verified patterns from official/current sources:

### Stripe Webhook Verification in Next.js Route Handler
```typescript
// Source: https://raw.githubusercontent.com/stripe/stripe-node/master/examples/webhook-signing/nextjs/app/api/webhooks/route.ts
const stripeSignature = (await headers()).get('stripe-signature');
const event = stripe.webhooks.constructEvent(
  await req.text(),
  stripeSignature as string,
  process.env.STRIPE_WEBHOOK_SECRET as string
);
```

### Existing Finalize Lock Pattern (Reuse)
```typescript
// Source: src/app/api/booking/book/route.ts
const cachedResult = await getFinalizedBookingResult(payload.transactionId);
if (cachedResult) return NextResponse.json(cachedResult);

lockAcquired = await acquireFinalizeBookingLock(payload.transactionId);
if (!lockAcquired) throw new HttpError(409, 'Booking finalization already in progress');
```

### Existing Webhook Event Dedupe Primitive (Reuse)
```typescript
// Source: src/server/webhook-idempotency.ts
const result = await redis.set(`webhook:event:${eventId}`, '1', { nx: true, ex: ttlSeconds });
return result === 'OK';
```

### Email Send via Provider SDK
```typescript
// Source: https://resend.com/docs/send-with-nodejs
const { data, error } = await resend.emails.send({
  from: 'Hostel Stays <bookings@example.com>',
  to: [customerEmail],
  subject: 'Booking confirmed',
  html: renderedHtml
});
```

## State of the Art

| Old/Current in Repo | Current Approach | When Changed | Impact |
|---------------------|------------------|--------------|--------|
| LiteAPI webhook route as primary async reconciliation | Add dedicated Stripe webhook route for payment truth | Phase 4 start | Aligns with BOOK-02 and enables verified payment-state authority |
| Free-form `status` values in bookings | Strict lifecycle enum + transition guards (`pending`, `payment_authorized`, `confirmed`, `failed`, `refunded`) | Phase 4 schema update | Prevents invalid lifecycle drift |
| Confirmation mostly tied to return/finalize path | Confirmation gated by webhook-confirmed state | Phase 4 checkout hardening | Eliminates false-positive confirmations |
| Side effects inline or absent | Outbox-driven email/invoice updates from lifecycle transitions | Phase 4 BOOK-06 tasks | Ensures communication/invoice consistency under retries |

**Deprecated/outdated for this phase:**
- Treating any client-return completion as authoritative success.
- Updating payment state from non-webhook routes.

## Open Questions

1. **Stripe integration mode vs existing LiteAPI payment widget**
   - What we know: Requirements mandate Stripe payment/webhook truth, while current checkout uses LiteAPI payment wrapper and transaction IDs.
   - What's unclear: Whether Phase 4 should replace payment UI with direct Stripe flow or treat LiteAPI as supplier booking while Stripe is new payment authority.
   - Recommendation: Plan an early architecture spike task and lock one authority model before implementation tasks.

2. **Invoice persistence shape for BOOK-06**
   - What we know: No dedicated invoice table currently exists; `payment_logs` and booking columns are available.
   - What's unclear: Whether to model invoice state as booking columns or add canonical invoice table now.
   - Recommendation: Prefer additive invoice table only if reporting/operations needs are immediate; otherwise use explicit `invoice_status` fields plus payment logs in Phase 4.

3. **State-transition enforcement locus**
   - What we know: App-layer guards are straightforward; DB trigger provides stronger integrity.
   - What's unclear: Whether team prefers strict DB trigger in Phase 4 or phased hardening (app first, DB second).
   - Recommendation: Implement both in-phase if feasible; at minimum, add DB check constraints and unique indexes now.

## Sources

### Primary (HIGH confidence)
- `C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/.planning/ROADMAP.md` - Phase 4 goal, dependencies, success criteria.
- `C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/.planning/REQUIREMENTS.md` - BOOK-01..BOOK-06 requirement definitions.
- `C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/.planning/STATE.md` - sequencing decisions and prior phase constraints.
- `C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/src/app/api/booking/prebook/route.ts` - current checkout prebook boundary.
- `C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/src/app/api/booking/book/route.ts` - current finalize + idempotency behavior.
- `C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/src/app/api/webhooks/liteapi/route.ts` - current webhook verification + dedupe flow.
- `C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/src/server/booking/repository.ts` - booking persistence/update contract and fields.
- `C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/src/server/booking-idempotency.ts` - finalize lock/cache implementation.
- `C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/src/server/webhook-idempotency.ts` - event dedupe primitive.
- `C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/src/features/booking/components/booking-console.tsx` - existing 3-step checkout UX.
- `C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/src/app/booking/return/booking-return-client.tsx` - current return/finalize behavior.
- `C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/supabase/migrations/20260217_ota_core.sql` - booking schema baseline + unique index on `liteapi_booking_id`.
- `C:/Users/Lenovo/Downloads/travelapp/Travel-webapp/supabase/migrations/006_phase1_foundation.sql` - payment logs and booking/payment columns.
- https://docs.stripe.com/webhooks - signature verification, retries, ordering, duplicate-event guidance, fast `2xx` requirement.
- https://docs.stripe.com/webhooks/signature - common verification failures and raw-body requirements.
- https://docs.stripe.com/api/idempotent_requests - provider idempotency behavior and key semantics.
- https://docs.stripe.com/payments/paymentintents/lifecycle - payment lifecycle states and fulfillment boundary.
- https://docs.stripe.com/api/events/types - canonical payment/refund event types (`payment_intent.succeeded`, `payment_intent.payment_failed`, `refund.*`, etc.).
- https://docs.stripe.com/refunds - refund flow and refund-related events.
- https://raw.githubusercontent.com/stripe/stripe-node/master/examples/webhook-signing/nextjs/app/api/webhooks/route.ts - official Next.js App Router webhook-signing example.
- https://nextjs.org/docs/app/api-reference/file-conventions/route - route handler request body/raw text handling.
- https://www.postgresql.org/docs/current/ddl-constraints.html - constraints semantics and limits.
- https://www.postgresql.org/docs/current/indexes-unique.html - unique index enforcement behavior.
- https://supabase.com/docs/guides/database/postgres/triggers - trigger model for transition enforcement.

### Secondary (MEDIUM confidence)
- https://docs.stripe.com/payments/quickstart-checkout-sessions?client=react - modern Stripe checkout-session guidance and test cards.
- https://resend.com/docs/send-with-nodejs - provider-side email send API pattern.
- https://react.email/docs/introduction - template component strategy and provider integrations.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM-HIGH - strong official Stripe/Next/Postgres sources; exact package versions depend on lockfile policy at implementation time.
- Architecture: HIGH - grounded in current repo booking/webhook/idempotency patterns plus official webhook and DB integrity guidance.
- Pitfalls: HIGH - directly supported by Stripe retry/order/duplicate docs and observable current code gaps.

**Research date:** 2026-02-25
**Valid until:** 2026-03-18
