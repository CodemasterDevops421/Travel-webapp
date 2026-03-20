# Booking Lifecycle

## Sources of truth
- Stripe owns payment truth.
- Provider finalization/callback owns booking truth.
- The app route orchestrates but does not invent terminal truth.

## Booking states
- `draft`
- `prebooked`
- `payment_pending`
- `payment_authorized`
- `booking_requested`
- `booking_confirmed`
- `booking_failed`
- `cancelled`
- `refund_pending`
- `refunded`

## Payment states
- `not_started`
- `checkout_created`
- `pending`
- `authorized`
- `captured`
- `failed`
- `refunded`
- `chargeback_review`

## Supplier states
- `not_sent`
- `requesting`
- `confirmed`
- `failed`
- `cancelled`

## Operational rules
- Finalize may move a booking only to `booking_requested`.
- Stripe webhooks may advance payment truth but must not promote a booking to `booking_confirmed`.
- Provider confirmation is required before `booking_confirmed`.
- `booking_requested` is the only allowed “awaiting supplier truth” state.
- Compensating flows must surface explicit states such as `refund_pending` instead of hiding exceptions in metadata.
