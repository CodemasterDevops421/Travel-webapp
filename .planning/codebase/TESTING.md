# Testing Map

## Test Framework and Runner
- Test runner: Vitest (`vitest.config.ts`).
- Environment: `node` test environment.
- Discovery pattern: `tests/**/*.test.ts` and `tests/**/*.test.tsx`.
- Timeout baseline: 15 seconds per test.

## Core Libraries
- `vitest` for runner and assertions.
- `@testing-library/react` and `@testing-library/user-event` for UI flows.
- `@testing-library/jest-dom` for DOM-oriented assertions.
- `jsdom` available in dependencies for browser-like contexts where needed.

## Test Directory Layout
- Main test suite folder: `tests/`.
- High-value suites include:
  - booking lifecycle and idempotency (`tests/booking-*.test.ts*`)
  - API security and route regressions (`tests/api-security-regression.test.ts`)
  - auth and permissions (`tests/auth/`, `tests/bookings-auth.test.ts`)
  - admin route/ops checks (`tests/admin/`, `tests/ops-health-routes.test.ts`)
- Support fixtures/mocks:
  - `tests/mocks/`
  - `tests/helpers/`.

## What Is Covered (Observed)
- Booking end-to-end business flow components and route behavior.
- Rate limiting/cache behavior (`tests/cache-ttl.test.ts`).
- SEO/blog indexing behavior (`tests/blog-seo.test.ts`, `tests/sitemap.test.ts`).
- Webhook and external integration boundaries (`tests/stripe-webhook-route.test.ts`).
- Search and URL state behavior (`tests/search-results-url-state.test.ts`).

## Testing Conventions
- Test names focus on user-visible outcome or API behavior.
- Most tests appear integration-style over tiny isolated unit tests.
- Domain-focused file naming keeps intent explicit.
- API routes are tested directly with request/response assertions.

## Tooling Integration
- Script entry points in `package.json`:
  - `npm run test`
  - `npm run test:watch`
- Typecheck/lint are separate quality gates (`typecheck`, `lint` scripts).

## Coverage and Gaps Signals
- Strong coverage signals in booking, auth, and security-related routes.
- No explicit coverage threshold tooling found in visible config.
- Load/perf scripts are separate from unit/integration tests (`load/`, `scripts/perf-*`).
