# Repository Guidelines

## Project Structure & Module Organization
`src/app/` contains Next.js App Router pages, layouts, and API routes. `src/components/` holds shared UI and homepage sections, while `src/features/` groups feature-specific code such as `search`, `hotels`, `booking`, `wishlist`, and `ai`. Server-only logic lives in `src/server/`, shared hooks and utilities in `src/shared/`, email templates in `src/emails/`, and static assets in `public/`. Tests live under `tests/`, Supabase SQL and migrations under `supabase/`, and operational or planning docs under `docs/` and `.planning/`.

## Build, Test, and Development Commands
- `npm run dev` starts the local Next.js server.
- `npm run build` creates the production bundle.
- `npm run start` runs the built app for smoke testing.
- `npm run lint` runs the Next.js ESLint rules.
- `npm run typecheck` runs Next type generation and `tsc --noEmit`.
- `npm run test` runs the full Vitest suite once.
- `npm run test:watch` runs Vitest in watch mode.
- `npm run perf:proof` or `npm run perf:admin:staged` runs performance verification scripts when touching admin reporting paths.

## Coding Style & Naming Conventions
Use TypeScript throughout and follow the existing 2-space indentation and semicolon style. Prefer named exports for shared modules unless the route contract requires a default export. Use `PascalCase` for React components, `camelCase` for functions and variables, and `kebab-case` for test files and route segment folders. Keep feature logic close to its feature module, and reuse shared UI primitives from `src/components/ui/` before creating new variants.

## Testing Guidelines
Vitest is the primary test runner, with Testing Library used for React UI coverage. Add tests in `tests/` using `*.test.ts` or `*.test.tsx`; mirror the feature or route being covered, for example `tests/homepage-card-link-behavior.test.tsx`. Run focused checks with `npm test -- tests/<file>.test.ts`. Cover route handlers, user-visible UI states, and regressions for search, booking, and admin flows.

## Commit & Pull Request Guidelines
Recent history follows Conventional Commit style with scoped subjects, for example `fix(build): ...` or `fix(02.3): ...`. Write commits in the imperative mood and keep scopes specific to the subsystem or phase. PRs should include a short summary, linked issue or planning artifact when available, test evidence (`npm run test`, `npm run typecheck`, etc.), and screenshots for homepage, search, hotel detail, or booking UI changes.

## Security & Configuration Tips
Keep secrets in `.env.local` and use `.env.example` as the reference template. Validate changes affecting LiteAPI, Stripe, Supabase, Upstash, or Sentry with the relevant environment variables present before merging.
