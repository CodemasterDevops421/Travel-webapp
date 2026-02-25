# Phase 04 User Setup

Status: Incomplete

## Stripe

Why needed: Checkout session creation and verified webhook authority.

### Environment Variables

| Variable | Where to get it |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe Dashboard -> Developers -> API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard -> Developers -> Webhooks endpoint secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard -> Developers -> API keys |

### Dashboard Configuration Checklist

- Create a Stripe webhook endpoint for `/api/webhooks/stripe`.
- Subscribe at minimum to: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`.
- Copy the endpoint signing secret into `STRIPE_WEBHOOK_SECRET`.

### Local Verification Commands

- `npm run test -- tests/stripe-webhook-route.test.ts tests/booking-finalize-idempotency.test.ts`
- `stripe trigger payment_intent.succeeded` (after Stripe CLI auth and webhook forwarding are configured)
