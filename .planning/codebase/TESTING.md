# Testing Patterns

**Analysis Date:** 2026-02-23

## Test Framework

**Runner:**
- Vitest `^3.0.5` (`package.json`).
- Config: `vitest.config.ts` (Node environment, `tests/**/*.test.ts` include pattern, alias overrides for `@` and `server-only`).

**Assertion Library:**
- Vitest built-in `expect` API (`tests/*.test.ts`).

**Run Commands:**
```bash
npm test              # Run all tests once (vitest run)
npm run test:watch    # Watch mode
Not configured        # Coverage command (no coverage script in package.json)
```

## Test File Organization

**Location:**
- Use a dedicated top-level `tests/` directory (not co-located with source).

**Naming:**
- Use `<feature>.test.ts` naming (`tests/booking-routes.test.ts`, `tests/booking-repository.test.ts`, `tests/request.test.ts`).

**Structure:**
```text
tests/
  *.test.ts
  mocks/
    server-only.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('booking route handlers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv('NODE_ENV', 'test');
  });

  it('prebook route returns payment sdk payload and persists session', async () => {
    // arrange mocks
    // invoke route handler
    // assert status/body/calls
  });
});
```
Pattern source: `tests/booking-routes.test.ts`, `tests/booking-repository.test.ts`, `tests/analytics-route.test.ts`.

**Patterns:**
- Setup pattern: reset module cache and stubs per test via `beforeEach` (`tests/booking-store.test.ts`, `tests/bookings-auth.test.ts`).
- Teardown pattern: explicit cleanup using `vi.useRealTimers()` and `vi.unstubAllEnvs()` when timers/env mutation is involved (`tests/booking-store.test.ts`).
- Assertion pattern: assert HTTP status and response payload first, then side effects/calls (`tests/booking-routes.test.ts`, `tests/analytics-route.test.ts`).

## Mocking

**Framework:**
- Vitest mocks (`vi.mock`, `vi.doMock`, `vi.fn`, `vi.importActual`).

**Patterns:**
```typescript
vi.doMock('@/server/ratelimit', () => ({
  assertRateLimit: vi.fn().mockResolvedValue(undefined)
}));

const { POST } = await import('@/app/api/booking/prebook/route');
const res = await POST(req as never);

expect(res.status).toBe(200);
```
Pattern source: `tests/booking-routes.test.ts`, `tests/analytics-route.test.ts`.

**What to Mock:**
- External/service boundaries (`@/server/liteapi`, `@/server/supabase/admin`, `@/server/ratelimit`, webhook idempotency modules) as seen in `tests/booking-routes.test.ts` and `tests/booking-repository.test.ts`.
- Logging side effects (`@/server/logger`) when verifying operational behavior (`tests/analytics-route.test.ts`, `tests/booking-repository.test.ts`).

**What NOT to Mock:**
- Pure utility logic and deterministic helpers (`src/server/errors.ts`, `src/server/request.ts`, `src/shared/lib/cache-ttl.ts`) tested directly in `tests/errors.test.ts`, `tests/request.test.ts`, `tests/cache-ttl.test.ts`.

## Fixtures and Factories

**Test Data:**
```typescript
type BookingInput = {
  quoteId: string | null;
  liteApiBookingId: string | null;
  status: string;
  metadata: Record<string, unknown>;
};

function buildBookingInput(overrides: Partial<BookingInput> = {}): BookingInput {
  return {
    quoteId: 'quote-1',
    liteApiBookingId: 'lite-booking-1',
    status: 'pending',
    metadata: { transactionId: 'txn-1' },
    ...overrides
  };
}
```
Pattern source: `tests/booking-repository.test.ts`.

**Location:**
- Fixtures/factories are defined inline per test file.
- Shared test-only stubs live under `tests/mocks/` (`tests/mocks/server-only.ts`).

## Coverage

**Requirements:** None enforced.

**View Coverage:**
```bash
Not configured
```

## Test Types

**Unit Tests:**
- Core helpers and deterministic logic (`tests/errors.test.ts`, `tests/request.test.ts`, `tests/cache-ttl.test.ts`, `tests/booking-view-token.test.ts`, `tests/utils.test.ts`).

**Integration Tests:**
- Route-handler module tests with dependency mocks and real handler invocation (`tests/booking-routes.test.ts`, `tests/analytics-route.test.ts`, `tests/bookings-auth.test.ts`).
- Repository behavior tests with mocked Supabase client responses (`tests/booking-repository.test.ts`).

**E2E Tests:**
- Not used.

## Common Patterns

**Async Testing:**
```typescript
const { POST } = await import('@/app/api/analytics/funnel/route');
const res = await POST(req as never);
const body = await res.json();

expect(res.status).toBe(202);
expect(body.ok).toBe(true);
```
Pattern source: `tests/analytics-route.test.ts`.

**Error Testing:**
```typescript
expect(() => assertProductionReadiness()).toThrow(/Production configuration invalid/i);
expect(res.status).toBe(400);
expect(body.error).toMatch(/invalid request payload/i);
```
Pattern source: `tests/env.test.ts`, `tests/analytics-route.test.ts`, `tests/booking-routes.test.ts`.

---

*Testing analysis: 2026-02-23*
