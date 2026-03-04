# Testing

## Test Stack
- Runner: Vitest (`package.json`, `vitest.config.ts`).
- Environment: `node` test environment (`vitest.config.ts`).
- Test glob: `tests/**/*.test.ts`.

## Test Organization
- Route-level behavior tests in files like `tests/stripe-webhook-route.test.ts` and `tests/review-snippets-route.test.ts`.
- Repository and lifecycle coverage in `tests/booking-repository.test.ts`, `tests/booking-lifecycle.test.ts`.
- Security-focused coverage in `tests/security/csrf.test.ts`, `tests/security/ratelimit.test.ts`, and `tests/api-security-regression.test.ts`.
- Auth-specific tests under `tests/auth/`.

## Common Test Patterns
- Use `beforeEach` for module reset and env stubbing (`vi.resetModules`, `vi.clearAllMocks`).
- Mock server dependencies with `vi.doMock` before importing route/module under test.
- Construct lightweight request objects (`Request`, `NextRequest`, or typed stubs) per endpoint needs.
- Assert on status codes, JSON payloads, redirect targets, and side-effect calls.

## Mocking Strategy
- Integration boundaries are mocked (Supabase, Redis, Stripe, LiteAPI).
- Helper modules centralize repeated mock setup (e.g., `tests/helpers/security-route-mocks`).
- Tests validate idempotency and replay behavior by controlling mocked return sequences.

## Quality Focus Areas Covered
- Webhook signature handling and duplicate-event behavior (`tests/stripe-webhook-route.test.ts`).
- Booking persistence fallback and lifecycle transition guards (`tests/booking-repository.test.ts`).
- Secret redaction and degraded supplier-mode responses (`tests/api-security-regression.test.ts`).
- OAuth callback fail-closed behavior (`tests/auth/oauth/callback.test.ts`).

## Current Gaps and Opportunities
- No explicit coverage report tooling configured in scripts.
- Limited end-to-end browser coverage; most tests are unit/integration at module-route level.
- Admin stats route currently appears less deeply tested than booking/security paths.

## Practical Commands
- Run full suite: `npm run test`.
- Run focused suite example: `npm run test -- tests/stripe-webhook-route.test.ts`.
- Run multi-file targeted verification: `npm run test -- tests/booking-repository.test.ts tests/stripe-webhook-route.test.ts tests/review-snippets-route.test.ts`.
