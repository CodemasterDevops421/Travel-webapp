# Platform Status

This document is the current engineering-status summary for the live codebase.

It exists to answer three questions quickly:
- what this platform does today,
- what runtime decisions are already locked,
- what still remains before full production rollout.

## Current Product Shape

Hostel Stays is a hotel booking web application with:
- destination and vibe-based hotel discovery,
- hotel detail pages with room and rate selection,
- LiteAPI-first checkout and booking finalization,
- secure booking confirmation/cancellation views,
- admin/reporting and launch-readiness surfaces.

## Locked Runtime Decisions

### Payment and booking architecture

- Launch profile is `LiteAPI-first`.
- `PAYMENT_PROVIDER=liteapi` is the intended launch default.
- Stripe remains a mode-gated fallback only for `stripe` or `hybrid` modes.
- Supplier calls and booking lifecycle operations are server-side only.

### Canonical booking lifecycle

Top-level lifecycle states remain:
- `pending`
- `payment_authorized`
- `confirmed`
- `failed`
- `refunded`

Cancellation/refund-in-progress is represented through metadata and response fields, not a new top-level booking state.

Important UI/API fields:
- `status`
- `paymentStatus`
- `invoiceStatus`
- `cancellationOutcome`
- `refundPending`
- `refundManagedBy`
- `refundId`

### Persistence and deployment safety

- Production should run with `STRICT_PERSISTENCE_MODE=true`.
- Booking-critical persistence must fail closed in production instead of silently degrading.
- LiteAPI webhook and email proof are post-deploy checks and require a public deployment URL.

## Current Status Label

- Launch Hardening Implemented — Awaiting Environment Validation

## Track A Status: Launch Hardening

Track A has already been implemented in code.

### Completed

- LiteAPI-only launch posture enforced in runtime behavior and docs.
- Targeted test failures resolved and full suite stabilized.
- Cancellation/refund transitional metadata contract normalized.
- Booking confirmation and cancellation UI updated to render refund/cancellation-in-progress state clearly.
- Go-live docs updated to split pre-deploy and post-deploy proof gates honestly.

### Verified locally

- `npm test` passes
- `npm run build` passes

### Still requires deployed verification

- target-environment migration/RPC verification
- deployed failure-proof artifact bundle
- readiness and alert validation against persisted telemetry
- live LiteAPI webhook proof
- live email delivery proof
- production environment validation on a public deployment target

## Track B Status: Conversion UX

Track B has been implemented in UI code and is architecture-safe.

### Completed

- fabricated listing strike-through pricing removed
- hardcoded listing trust pills removed where no truthful listing-level data exists
- fake hotel-detail urgency module removed
- hotel-detail sidebar reordered so cancellation clarity sits directly above the booking CTA
- recommended-offer treatment implemented in hotel-detail rate-selection state layer
- checkout presentation compressed without changing real step logic or LiteAPI flow
- confirmation page shifted toward actionable reassurance and operational clarity

### Track B principles now enforced

- no fabricated scarcity
- no fabricated comparison pricing
- no fake trust benefits when the data model does not support them
- no backend, payment, or lifecycle contract changes for conversion work

## Documentation Rules Going Forward

- `README.md` and `docs/README.md` are onboarding entrypoints.
- `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, and `.planning/STATE.md` remain planning source of truth.
- This file is the compact current-state summary for developers and AI agents.
- When runtime behavior changes, update this file instead of creating another overlapping “overview” or “what’s built” document.
