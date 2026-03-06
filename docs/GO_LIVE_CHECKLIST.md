# Go-Live Checklist

This checklist is strict and evidence-driven. Do not mark an item complete without attaching proof.

## 1) Code and Build Gate

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run test`
- [x] `npm run build`

Latest local evidence:
- Test suite: 50 files, 207 tests passed
- Build: success with non-blocking OpenTelemetry dynamic dependency warning

## 2) Pre-Deploy Runtime Gate

Goal: prove the production configuration is valid before a public deployment is attempted.

Required checks:
- `PAYMENT_PROVIDER=liteapi`
- `STRICT_PERSISTENCE_MODE=true`
- `LITEAPI_ENV=production`
- real LiteAPI production credentials and webhook secret configured
- durable backing services configured for booking/session/idempotency persistence

Evidence to capture:
- command output or deployment logs showing production config validation passes
- confirmation that the target deployment URL is publicly reachable

## 3) Live Webhook Proof (LiteAPI Primary, Post-Deploy)

Goal: prove deployed `/api/webhooks/liteapi` accepts valid signatures in real runtime.

Commands:

```bash
npm run verify:live:webhook:liteapi
```

Required env:
- `NEXT_PUBLIC_APP_URL`
- `LITEAPI_WEBHOOK_SECRET`

Precondition:
- the app is already deployed to a public URL reachable by the verification script and external webhook senders

Evidence to capture:
- Command output showing `PASS`
- Timestamped log entry for `webhook.liteapi.received` and `webhook.liteapi.reconciled`
- HTTP response status/body from the command output

Stripe note:
- If `PAYMENT_PROVIDER=liteapi`, Stripe webhook proof is optional.
- If `PAYMENT_PROVIDER=stripe` or `hybrid`, also run `npm run verify:live:webhook`.

## 4) Live Email Delivery Proof (Resend, Post-Deploy)

Goal: prove provider acceptance and inbox delivery for booking lifecycle email path.

Commands:

```bash
npm run verify:live:email
```

Required env:
- `RESEND_API_KEY`
- `BOOKING_FROM_EMAIL`
- `GO_LIVE_TEST_EMAIL`

Precondition:
- the app is already deployed to a public URL and configured with the same production email environment intended for launch

Evidence to capture:
- Command output showing `PASS`
- Provider message id from command output
- Inbox screenshot showing delivered message subject and timestamp
- Email headers proving SPF/DKIM/DMARC pass (if domain-authenticated)

## 5) Requirement Traceability Closure

Goal: requirement table reflects current verified state, not all `Pending`.

Actions:
- Update `.planning/REQUIREMENTS.md` Traceability table statuses per verification artifacts
- Link evidence artifacts:
  - `.planning/phases/01-platform-foundation-and-security/01-VERIFICATION.md`
  - `.planning/phases/06-auth-and-booking-security-gap-closure/06-VERIFICATION.md`
  - `.planning/phases/08-hotel-detail-content-intelligence-and-review-ux/08-VERIFICATION.md`

## 6) Final Verification Artifacts

Goal: produce a single go-live verification artifact with pass/fail by gate.

Artifact:
- `.planning/go-live/GO-LIVE-VERIFICATION.md`

Must include:
- Gate status matrix (code/build, webhook live, email live, requirements traceability)
- Evidence links and timestamps
- Remaining blockers and explicit owner
- Go/No-Go decision
