# Conventions

## TypeScript and Imports
- Codebase is TypeScript-first; route and server modules are typed.
- Path alias `@/` is standard for imports (`vitest.config.ts`, many `src/*` files).
- `server-only` marker is used for server modules (`src/server/booking/repository.ts`, `src/server/env.ts`).

## Route Handler Conventions
- API handlers export HTTP verb functions (`export async function GET/POST`).
- Request validation usually uses Zod schemas at top-of-file.
- Shared helpers for request metadata and body parsing are reused (`src/server/request.ts`).
- Responses return JSON with explicit status codes and safe error messages.

## Error Handling Pattern
- Domain and validation errors map through `toHttpError` (`src/server/errors.ts`).
- Route handlers commonly follow `try/catch` + `toHttpError` + `NextResponse.json`.
- `HttpError` carries `status`, `code`, and safe messaging fields.

## Logging and Traceability
- Structured logging with Pino (`src/server/logger.ts`).
- Correlation IDs derived from request headers or generated (`src/server/request.ts`).
- Log payloads frequently include route/module identifiers and event metadata.

## Security Conventions
- Rate limiting is expected on mutation-like and webhook endpoints (`src/server/ratelimit.ts`).
- Same-origin checks are applied to sensitive mutation routes (`src/server/csrf.ts`).
- Secret-like supplier fields are stripped at response boundaries (`src/server/request.ts`).
- Middleware gates protected routes (`src/middleware.ts`).

## Data Persistence Style
- Repository wrappers isolate Supabase I/O from route handlers.
- Fail-closed behavior is controlled by `STRICT_PERSISTENCE_MODE` in production (`src/server/env.ts`).
- Non-prod fallback maps are accepted for resilience and tests (`src/server/booking/repository.ts`).
- Additive/idempotent migration strategy reflected in SQL (`supabase/migrations/*.sql`).

## Naming Style
- Files are generally kebab-case (`booking-store.ts`, `webhook-idempotency.ts`).
- Types and interfaces are PascalCase; helper funcs camelCase.
- Domain terminology is consistent: transactionId, prebookId, correlationId, paymentStatus.

## Test-Driven Conventions in Practice
- Tests isolate modules with `vi.doMock` and `vi.resetModules`.
- Environment is explicitly stubbed in tests (`vi.stubEnv`, process env assignments).
- Assertions emphasize externally observable behavior over internals.
