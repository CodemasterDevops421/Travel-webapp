# Go-Live Checklist

This checklist is strict and evidence-driven. Do not mark an item complete without attaching proof.

## 1) Code and Build Gate

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run test`
- [x] `npm run build`

Latest local evidence:
- Test suite: 36 files, 150 tests passed
- Build: success with non-blocking OpenTelemetry dynamic dependency warning

## 2) Live Webhook Proof (LiteAPI Primary)

Goal: prove deployed `/api/webhooks/liteapi` accepts valid signatures in real runtime.

Commands:

```bash
npm run verify:live:webhook:liteapi
```

Required env:
- `NEXT_PUBLIC_APP_URL`
- `LITEAPI_WEBHOOK_SECRET`

Evidence to capture:
- Command output showing `PASS`
- Timestamped log entry for `webhook.liteapi.received` and `webhook.liteapi.reconciled`
- HTTP response status/body from the command output

Stripe note:
- If `PAYMENT_PROVIDER=liteapi`, Stripe webhook proof is optional.
- If `PAYMENT_PROVIDER=stripe` or `hybrid`, also run `npm run verify:live:webhook`.

## 3) Live Email Delivery Proof (Resend)

Goal: prove provider acceptance and inbox delivery for booking lifecycle email path.

Commands:

```bash
npm run verify:live:email
```

Required env:
- `RESEND_API_KEY`
- `BOOKING_FROM_EMAIL`
- `GO_LIVE_TEST_EMAIL`

Evidence to capture:
- Command output showing `PASS`
- Provider message id from command output
- Inbox screenshot showing delivered message subject and timestamp
- Email headers proving SPF/DKIM/DMARC pass (if domain-authenticated)

## 4) Requirement Traceability Closure

Goal: requirement table reflects current verified state, not all `Pending`.

Actions:
- Update `.planning/REQUIREMENTS.md` Traceability table statuses per verification artifacts
- Link evidence artifacts:
  - `.planning/phases/01-platform-foundation-and-security/01-VERIFICATION.md`
  - `.planning/phases/06-auth-and-booking-security-gap-closure/06-VERIFICATION.md`
  - `.planning/phases/08-hotel-detail-content-intelligence-and-review-ux/08-VERIFICATION.md`

## 5) Final Verification Artifacts

Goal: produce a single go-live verification artifact with pass/fail by gate.

Artifact:
- `.planning/go-live/GO-LIVE-VERIFICATION.md`

Must include:
- Gate status matrix (code/build, webhook live, email live, requirements traceability)
- Evidence links and timestamps
- Remaining blockers and explicit owner
- Go/No-Go decision
