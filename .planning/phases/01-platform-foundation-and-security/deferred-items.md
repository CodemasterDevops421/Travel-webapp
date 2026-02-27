## Deferred Items

- `tests/booking-routes.test.ts` currently has a pre-existing failure in `book route fails closed in production when booking persistence is unavailable` due CSRF same-origin enforcement returning `403` before persistence-path assertions. Not introduced by this task; deferred for plan 01-03/01-04 security test alignment.
