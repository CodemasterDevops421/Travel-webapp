# Architecture Research

**Domain:** Hotel booking web app production hardening (Next.js + Supabase + LiteAPI)
**Researched:** 2026-02-23
**Confidence:** MEDIUM

## Standard Architecture

### System Overview

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                           Edge + Web Layer                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│  Next.js App Router UI                                                      │
│   ├─ Search/Quote pages                                                     │
│   ├─ Checkout/Finalize page                                                 │
│   └─ Admin ops console                                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                         Trusted Server Layer                                │
├──────────────────────────────────────────────────────────────────────────────┤
│  API routes / server actions                                                │
│   ├─ Quote validation + signature checks                                    │
│   ├─ Booking Finalization Orchestrator (idempotent)                         │
│   ├─ Webhook Intake + Reconciliation Worker                                 │
│   ├─ Admin Control APIs (RBAC + audit)                                      │
│   └─ Observability hooks (logs/metrics/traces)                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                      Integration + Async Layer                              │
├──────────────────────────────────────────────────────────────────────────────┤
│  LiteAPI adapter      Redis (locks/idempotency/cache/rate limits)           │
│  Job queue/cron       Dead-letter + replay                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                             Data Layer                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│  Supabase Postgres                                                           │
│   ├─ bookings, booking_attempts, quote_tokens, payments                     │
│   ├─ webhook_events, reconciliation_runs, outbox_events                     │
│   ├─ admin_actions_audit, incidents                                          │
│   └─ RLS policies + service-role-only writes for privileged paths            │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Booking Finalization Orchestrator | Owns secure transition from signed quote to confirmed booking; enforces idempotency and state machine | Next.js server route/service module with DB transaction + Redis lock |
| Webhook Intake | Authenticates provider webhooks, stores raw events, acknowledges quickly | Dedicated API route writing immutable `webhook_events` rows |
| Reconciliation Worker | Resolves eventual consistency gaps between local booking state and provider state | Scheduled worker (cron/queue consumer) with retry and dead-letter |
| Admin Control Plane | Manual overrides, replay, cancellation/refund actions with strict authorization and auditability | Protected server routes + admin UI + audit trail tables |
| Observability Pipeline | Correlates requests/events and exposes health SLO signals | Structured logs + metrics + traces with booking correlation IDs |

## Recommended Project Structure

```text
app/
├── (public)/
│   ├── hotels/[id]/
│   └── checkout/
├── api/
│   ├── booking/finalize/route.ts          # secure finalization entrypoint
│   ├── webhooks/liteapi/route.ts          # webhook intake only
│   ├── admin/bookings/[id]/route.ts       # admin actions
│   └── internal/reconcile/route.ts        # cron-triggered reconciliation
└── admin/
    └── bookings/[id]/page.tsx             # operator tooling

src/
├── modules/
│   ├── booking/
│   │   ├── finalize.ts                    # orchestration + state transitions
│   │   ├── validator.ts                   # signed quote checks
│   │   └── idempotency.ts                 # keys, dedupe semantics
│   ├── webhooks/
│   │   ├── liteapi-handler.ts             # signature + schema validation
│   │   └── reconcile.ts                   # state repair workflow
│   ├── admin/
│   │   ├── actions.ts                     # approve, retry, cancel, replay
│   │   └── authorization.ts               # role checks and policy guards
│   └── observability/
│       ├── logger.ts
│       ├── metrics.ts
│       └── tracing.ts
├── lib/
│   ├── supabase/
│   ├── redis/
│   └── liteapi/
└── db/
    ├── migrations/
    └── sql/
```

### Structure Rationale

- **`app/api/*`:** keep transport-only concerns (auth, parsing, status codes), push business logic into modules.
- **`src/modules/*`:** isolate hardening domains (finalization, webhooks, admin, observability) so milestone work lands in clear boundaries.
- **`db/migrations`:** schema and policy evolution first-class, required for safe rollout and rollback.

## Architectural Patterns

### Pattern 1: Transactional Finalization + Idempotency Key

**What:** One booking finalization attempt per client-intent key, with explicit booking state machine (`pending_finalization -> provider_pending -> confirmed/failed`).
**When to use:** Every call that can charge money or confirm inventory.
**Trade-offs:** Slightly more schema and logic complexity; dramatically fewer duplicate charges/ghost bookings.

**Example:**
```typescript
// Pseudocode
await withIdempotency(idempotencyKey, async () => {
  await db.tx(async (trx) => {
    const quote = await validateSignedQuote(input.quoteToken, trx);
    const booking = await upsertBookingAttempt(quote, trx);
    const providerResult = await liteApi.createBooking(booking.payload);
    await persistTransition(booking.id, providerResult, trx);
  });
});
```

### Pattern 2: Inbox + Reconciler for Webhooks

**What:** Webhook route only verifies and stores raw events; reconciliation worker performs side effects idempotently.
**When to use:** External provider events with retries/out-of-order delivery.
**Trade-offs:** Requires queue/worker; removes race conditions and request-time fragility.

### Pattern 3: Dual Control Admin Actions

**What:** High-risk admin operations (force confirm, manual refund, replay webhook) require role checks, reason codes, immutable audit records.
**When to use:** Any manual override affecting money, customer status, or provider sync.
**Trade-offs:** Slower operations for operators; significantly better compliance and incident forensics.

## Data Flow

### Request Flow (Secure Booking Finalization)

```text
User checkout submit
    -> POST /api/booking/finalize
    -> authenticate session + validate signed quote + validate idempotency key
    -> acquire short Redis lock on quote/order key
    -> DB transaction writes booking_attempt (pending)
    -> LiteAPI booking call
    -> persist provider response + transition booking state
    -> emit outbox event (booking.confirmed | booking.failed)
    -> return final status to client
```

### Webhook + Reconciliation Flow

```text
LiteAPI webhook
    -> POST /api/webhooks/liteapi
    -> verify signature + timestamp window
    -> insert webhook_events(raw, event_id, received_at, status='received')
    -> ack 2xx quickly

Worker/cron
    -> pick unprocessed events (or stale bookings)
    -> dedupe by provider_event_id
    -> apply idempotent state transition rules
    -> mark processed / dead-letter with reason
    -> raise alert on repeated failures
```

### Admin Control Flow

```text
Operator action from admin UI
    -> POST /api/admin/bookings/:id
    -> RBAC + policy guard + reason required
    -> execute bounded command (retry, cancel, replay, override)
    -> append admin_actions_audit row with actor + before/after snapshot
    -> optional notification to Slack/email incident channel
```

## Build Order and Dependency Sequencing

1. **Data model and state machine foundations**
   - Add booking lifecycle states, webhook inbox tables, admin audit tables, reconciliation metadata.
   - Define invariants and constraints first (unique idempotency key scope, provider booking ID uniqueness).

2. **Secure finalization path hardening**
   - Enforce signed quote validation, idempotency keys, Redis locks, and transactional writes.
   - Gate this before webhook work, because webhook processing needs stable canonical booking states.

3. **Webhook intake separation + event inbox**
   - Make webhook endpoint verify/store-only, no business side effects in request path.
   - Introduce schema validation and replay-safe dedupe keys.

4. **Reconciliation worker + retry policy**
   - Implement periodic reconciler, dead-letter queue, replay tooling.
   - Depends on steps 1-3 to have canonical states and raw event history.

5. **Admin control plane and runbooks**
   - Build operator endpoints/UI for retry/replay/manual correction with full audit.
   - Depends on reconciler primitives and explicit state machine transitions.

6. **Observability and resilience guardrails**
   - Add correlation IDs, structured logs, metrics (finalization success rate, webhook lag, reconciliation backlog), alerts, and SLO dashboards.
   - Apply load/chaos tests and timeout/circuit-breaker tuning last, once flows are stable.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| LiteAPI | Adapter layer with strict request/response schema and timeout budget | Never call provider directly from UI routes; use server module boundary |
| Supabase | Postgres as source of truth, service-role for privileged transitions | Keep RLS for user-facing reads; protect admin and webhook writes |
| Redis (optional but recommended) | Idempotency cache + short lock + rate-limit buckets | If unavailable, fallback to DB uniqueness + pessimistic transaction lock |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| API Route -> Booking Module | Function call with typed command object | Route should not contain booking state logic |
| Webhook Intake -> Reconciler | DB inbox rows / queue message | Async boundary is required for reliability |
| Admin UI -> Admin Module | Authenticated API commands | Every mutation must emit audit event |

## Anti-Patterns

### Anti-Pattern 1: Finalize Booking in Client-Controlled Flow

**What people do:** Trust client payload and call provider directly from broad API handlers.
**Why it's wrong:** Enables tampering/replay and creates duplicate booking/charge risk.
**Do this instead:** Server-only orchestration with signature verification, idempotency, and state machine transitions.

### Anti-Pattern 2: Treat Webhooks as Real-Time Truth

**What people do:** Apply business side effects directly in webhook request handler.
**Why it's wrong:** Out-of-order and duplicate events corrupt booking state.
**Do this instead:** Store-first webhook inbox and apply deterministic transitions in reconciler.

### Anti-Pattern 3: Manual Ops Without Audit Trail

**What people do:** Ad-hoc DB edits during incidents.
**Why it's wrong:** No accountability, no reproducibility, high compliance risk.
**Do this instead:** Explicit admin commands with RBAC, reason codes, and immutable audit logs.

## Quality Gate Check

- [x] Components clearly defined
- [x] Data flow explicit
- [x] Build-order implications noted

## Sources

- Internal project context provided: existing Next.js API routes, server modules, Supabase persistence, optional Redis, signed quote handling.
- Industry-standard payment/booking reliability patterns: idempotent command handling, inbox/outbox, reconciliation workers, audit-first admin controls.

---
*Architecture research for: hotel booking production hardening milestone*
*Researched: 2026-02-23*
