# Coding Conventions

**Analysis Date:** 2026-02-23

## Naming Patterns

**Files:**
- Use kebab-case for most source files, especially features and server modules (for example `src/server/booking-view-token.ts`, `src/features/search/components/hero-search-bar.tsx`, `src/features/search/stores/search-ui-store.ts`).
- Use framework-reserved lowercase names for App Router files (`src/app/page.tsx`, `src/app/layout.tsx`, `src/app/api/booking/book/route.ts`).
- Use `.test.ts` naming in `tests/` for test files (`tests/booking-routes.test.ts`, `tests/env.test.ts`).

**Functions:**
- Use camelCase for function names and hooks (`src/server/request.ts`, `src/server/pricing.ts`, `src/features/search/hooks/use-autocomplete.ts`).
- Use PascalCase for React component functions (`src/components/ui/button.tsx`, `src/features/booking/components/booking-console.tsx`).

**Variables:**
- Use camelCase for local variables and parameters (`src/app/api/booking/book/route.ts`, `src/server/booking/repository.ts`).
- Use UPPER_SNAKE_CASE for constants (`src/shared/lib/cache-ttl.ts`, `src/features/booking/components/booking-console.tsx`).

**Types:**
- Use PascalCase for type aliases and interfaces (`src/server/booking/repository.ts`, `src/features/search/hooks/use-autocomplete.ts`, `src/components/ui/button.tsx`).

## Code Style

**Formatting:**
- Tool used: Not detected (`.prettierrc*` not present; no Biome config detected).
- Use TypeScript strict mode from `tsconfig.json` (`"strict": true`) and keep code type-safe.
- Keep semicolons enabled and single-quote imports/strings to match existing files (`src/server/errors.ts`, `src/app/page.tsx`).
- Indentation is inconsistent across modules (2-space in `src/app/page.tsx`, 4-space blocks in `src/features/search/components/hero-search-bar.tsx`); prefer matching the surrounding file style when editing.

**Linting:**
- Tool used: ESLint via Next (`.eslintrc.json` extends `next/core-web-vitals`).
- Run lint with `npm run lint` from `package.json` and keep code compliant with Next.js Core Web Vitals rules.

## Import Organization

**Order:**
1. Platform/runtime imports (`node:*`, `react`, `next/*`, third-party packages).
2. Internal project imports via `@/` alias.
3. Type-only imports are commonly inlined with `type` modifiers (`src/server/request.ts`, `src/app/page.tsx`).

**Path Aliases:**
- Use `@/*` alias mapped to `src/*` via `tsconfig.json` and mirrored in tests via `vitest.config.ts`.

## Error Handling

**Patterns:**
- Use `HttpError` and `toHttpError` for API-safe status/message conversion (`src/server/errors.ts`).
- Wrap route handlers in `try/catch` and return `NextResponse.json({ error }, { status })` (`src/app/api/booking/prebook/route.ts`, `src/app/api/booking/book/route.ts`).
- Use fail-closed guards in production paths (`assertProductionReadiness` in `src/server/env.ts`, strict persistence checks in `src/server/booking/repository.ts`).

## Logging

**Framework:** pino (`src/server/logger.ts`)

**Patterns:**
- Log structured objects with context keys (`correlationId`, `transactionId`, `route`) plus a message string (`src/app/api/booking/book/route.ts`, `src/app/api/booking/prebook/route.ts`).
- Use `logger.warn` for recoverable failures and fallback paths; `logger.error` for persistent failures (`src/server/booking/repository.ts`).
- Avoid `console.*` in production code; one debug `console.log` exists in `src/features/search/components/hero-search-bar.tsx` and should be treated as an exception.

## Comments

**When to Comment:**
- Use concise comments for non-obvious behavior, fallback rationale, or guard intent (`src/server/liteapi.ts`, `src/shared/hooks/use-wishlist.ts`, `src/middleware.ts`).
- Keep JSX section labels brief in large components (`src/app/page.tsx`, `src/features/search/components/hero-search-bar.tsx`).

**JSDoc/TSDoc:**
- Not used as a standard pattern in `src/`; prefer expressive naming and lightweight inline comments.

## Function Design

**Size:**
- Utility/server helpers stay small and focused (`src/server/request.ts`, `src/shared/lib/utils.ts`).
- Route handlers and UI container components can be large when orchestrating flows (`src/app/api/booking/book/route.ts`, `src/features/search/components/hero-search-bar.tsx`); preserve clear guard clauses and early returns.

**Parameters:**
- Prefer typed object parameters for multi-field inputs (`src/server/pricing.ts`, `src/server/booking/repository.ts`).
- Validate external input with Zod schemas at route boundaries (`src/app/api/booking/prebook/route.ts`, `src/app/api/booking/book/route.ts`).

**Return Values:**
- Return explicit primitives/unions for success/fallback states (`Promise<string | null>` in `src/server/booking/repository.ts`, `boolean` in token verification helpers at `src/server/booking-view-token.ts`).

## Module Design

**Exports:**
- Prefer named exports for reusable modules, hooks, and helpers (`src/server/errors.ts`, `src/shared/lib/preferences.ts`, `src/features/search/hooks/use-autocomplete.ts`).
- Use default exports for Next.js page/layout conventions (`src/app/page.tsx`, `src/app/layout.tsx`, `src/app/booking/return/page.tsx`).

**Barrel Files:**
- Not used in `src/`; import directly from concrete module paths.

---

*Convention analysis: 2026-02-23*
