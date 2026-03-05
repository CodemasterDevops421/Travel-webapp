# Code Conventions Map

## TypeScript and Module Conventions
- Strict TypeScript is enabled (`"strict": true` in `tsconfig.json`).
- Path alias `@/*` maps to `src/*`.
- Server-only modules explicitly declare `import 'server-only'` where applicable.
- ESM-style imports are standard across app/server files.

## Validation and Contract Style
- Request/input validation is schema-driven with `zod`.
- Route handlers parse and validate payloads early.
- Domain functions accept typed objects rather than loose dictionaries.
- Sanitization helpers are used before persistence/logging (see `src/server/request.ts` usage).

## Error Handling Pattern
- Centralized HTTP error conversion via `HttpError` / `toHttpError` (`src/server/errors.ts`).
- Handlers consistently:
  - wrap logic in `try/catch`
  - log context
  - return safe client-facing errors.
- Fallback and guard patterns are explicit for transient service failures.

## Security and Access Control Conventions
- Middleware-based route gating for protected routes (`src/middleware.ts`).
- Same-origin enforcement for mutating routes (`src/server/csrf.ts`).
- Rate limiting with route-specific buckets (`src/server/ratelimit.ts`).
- Security headers applied both via middleware and Next config.

## Naming and File Patterns
- Route files: `route.ts`.
- Domain naming by bounded context:
  - `booking-*`, `*-repository.ts`, `*-idempotency.ts`.
- Feature code grouped by intent:
  - `components/`, `hooks/`, `stores/`, `lib/`.

## Logging and Observability Style
- Structured logging with consistent context objects.
- Event-style helper logging appears in booking flows.
- Correlation/request IDs are propagated when present.

## Lint and Formatting Baseline
- ESLint inherits `next/core-web-vitals` (`.eslintrc.json`).
- No custom local lint rule set observed beyond Next defaults.
- Style consistency comes mainly from TypeScript + code review practices.

## Configuration Conventions
- Environment variables are validated and normalized in `src/server/env.ts`.
- Production readiness assertions enforce required secrets and provider-specific keys.
- Runtime mode switching (liteapi/hybrid/stripe) is centralized in env helpers.
