# IMPLEMENTATION.md

## Purpose and scope

- **Change summary:** `{{ONE_SENTENCE_CHANGE_SUMMARY}}`
- **Modified paths:** `{{LIST_OF_FILES_OR_FOLDERS_CHANGED}}`
- **Feature area:** `{{SEARCH|RESULTS|DETAILS|PREBOOK|CHECKOUT|AUTH|CACHING|WEBHOOKS|SEO|UI}}`
- **Risk level:** `{{LOW|MEDIUM|HIGH}}`

### In-scope verification

- Functional correctness for affected feature area and adjacent user journeys.
- Regression checks for shared API routes, search flow, prebook/book, and state hydration boundaries.
- Build/runtime compatibility checks against Node 24 + Next.js App Router stack.
- Security, performance, and observability sanity checks suitable for release gating.

### Out-of-scope (unless explicitly changed)

- Full cross-browser matrix beyond Chromium smoke.
- Deep load/stress testing at production traffic levels.
- Infrastructure drift remediation unrelated to this change.

---

## Technical stack versions (as-of 2026-02-12)

> These are the **target verification versions** for this implementation record.

### Runtime / Tooling

- Node.js: **v24.x (Active LTS)**
- pnpm: **v10.29.3**

### Framework

- Next.js: **v16.1.6**
- React: **v19.2.x**

### UI / DX

- Tailwind CSS: **v4.1.18**
- TanStack Query (React Query): **v5.90.21**
- Zustand: **v5.0.11**
- Zod: **v4.3.6**
- React Hook Form: **v7.71.1**
- Framer Motion: **v12.34.0**
- shadcn/ui: **CLI-driven components** (pin via lockfile; blocks/CLI updates Feb 2026)
- Radix UI: **unified `radix-ui` package** (used via shadcn “new-york” stack)

### Data / Auth

- Supabase JS: **v2.95.3** (**active in this repository architecture**) 
- Prisma: **v7.4.0** (**documented option, not active in current code path unless introduced by this change**)
- Redis (Upstash): via environment configuration (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`)

### Payments

- Stripe (Node SDK): **v20.3.1**
- `@stripe/stripe-js`: **v8.7.0**
- `@stripe/react-stripe-js`: **v5.6.0**

### Travel API

- LiteAPI Node SDK: **`liteapi-node-sdk`**
- Verification requirement: **confirm exact installed version from lockfile during validation**

---

## Environment setup

### OS assumptions

- Linux/macOS shell environment for local verification.
- `git`, `node`, and package manager available in `PATH`.
- No external system dependencies required beyond Node runtime for standard build/test flow.

### Runtime verification

```bash
node -v
pnpm -v
```

Expected:

- `node -v` returns `v24.x`.
- `pnpm -v` returns `10.29.3`.

### Package manager detection note

- Primary workflow below uses **pnpm** per engineering standard.
- If repository lockfile is npm/yarn-based, either:
  - enable pnpm with a regenerated `pnpm-lock.yaml`, or
  - run equivalent npm/yarn commands for immediate compatibility.

---

## Required environment variables

Create `.env.local` (or deployment secret set) with safe placeholders:

```dotenv
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# LiteAPI
LITEAPI_API_KEY=liteapi_sandbox_xxx
LITEAPI_ENV=sandbox
# Optional if supported by current implementation
LITEAPI_BASE_URL=https://api.liteapi.travel/v3.0
LITEAPI_TIMEOUT_MS=8000

# Stripe (if checkout/payment path is enabled)
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Supabase (active in current repo architecture)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=sb_publishable_xxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx

# Prisma/Neon (optional architecture path)
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require

# Upstash Redis (optional cache/rate-limit backend)
UPSTASH_REDIS_REST_URL=https://example.upstash.io
UPSTASH_REDIS_REST_TOKEN=upstash_token_xxx

# Webhooks (if used)
LITEAPI_WEBHOOK_SECRET=liteapi_webhook_secret_xxx
```

Notes:

- Keep server-only secrets out of `NEXT_PUBLIC_*`.
- Use secret manager in CI/CD (GitHub Actions secrets, Vault, SSM, etc.).

---

## Local verification workflow (developer machine)

### 1) Install dependencies

```bash
pnpm install --frozen-lockfile
```

If lockfile mismatch/non-pnpm repository state:

```bash
npm ci
```

### 2) Static checks

```bash
pnpm lint
pnpm exec tsc --noEmit
```

Expected:

- Zero lint errors in changed scope.
- TypeScript strict compile passes.

### 3) Unit/integration tests

```bash
pnpm test
```

Expected:

- Existing test suite passes.
- Any new tests for changed logic pass deterministically.

### 4) Development smoke run

```bash
pnpm dev
```

Manual checks:

- Homepage loads without hydration/runtime console errors.
- Affected feature path (`{{FEATURE_AREA_ROUTE_HINT}}`) behaves as intended.
- Error states (invalid input, upstream API timeout) render controlled UI fallback.

---

## Build verification

### Production build

```bash
pnpm build
```

Expected:

- Build completes with no type or route compilation failures.
- No server action serialization errors.

### Serve production artifact

```bash
pnpm start
```

### Production smoke checklist

Run against `http://localhost:3000`:

1. Load landing/search page.
2. Execute hotel search with valid city/dates/occupancy.
3. Open a hotel details page from results.
4. Select an offer and trigger prebook.
5. Confirm prebook path includes `usePaymentSdk: true` behavior (no real charge in test mode).
6. Validate checkout UI transitions and final confirmation/error handling.
7. Validate rate-limit and retry UX for forced API failure path.

Expected outcomes:

- Search returns meaningful results (or explicit empty-state).
- Details and rates are consistent for selected property.
- Prebook succeeds in sandbox/test mode.
- Any failure path is user-safe, logged, and non-crashing.

---

## Automated checks

### Lint

```bash
pnpm lint
```

### Typecheck

```bash
pnpm exec tsc --noEmit
```

### Unit tests (Vitest)

```bash
pnpm test
```

### E2E tests (Playwright default)

If repository has E2E script:

```bash
pnpm e2e
```

Fallback if script not present:

```bash
pnpm exec playwright test
```

If Playwright not installed yet:

```bash
pnpm dlx playwright test
```

---

## API verification strategy

### Deterministic mocked tests (required)

- Mock `liteapi-node-sdk` and/or HTTP layer for:
  - search success/empty/error,
  - hotel details success/error,
  - rates success/error,
  - prebook response with payment SDK-enabled payload,
  - book success/failure and idempotency behavior.
- Assert normalized response contracts and UI-safe error mapping.

### Optional canary live run (non-blocking)

> Execute only in sandbox with throwaway test data.

1. Search endpoint returns at least one result for known city/date.
2. Hotel details endpoint resolves for selected hotel.
3. Prebook call succeeds with `usePaymentSdk: true` and returns checkout-usable payload.
4. Do **not** finalize real charge; validate test-mode tokenization/intent path only.

---

## Performance verification

### Lighthouse (CLI)

```bash
pnpm dlx lighthouse http://localhost:3000 \
  --only-categories=performance,accessibility,best-practices,seo \
  --preset=desktop \
  --quiet --chrome-flags="--headless" \
  --output=json --output-path=./artifacts/lighthouse.json
```

Suggested release thresholds:

- Performance: `>= 80`
- Accessibility: `>= 90`
- Best Practices: `>= 90`
- SEO: `>= 90`

### Core Web Vitals sanity targets

- LCP: `< 2.5s`
- CLS: `< 0.1`
- INP: `< 200ms`

---

## Security verification

### Dependency audit

```bash
pnpm audit --prod
```

Gate policy:

- No unresolved `critical` vulnerabilities in runtime deps.
- Any accepted risk must be documented with expiry date.

### Header sanity checks

Verify response headers for app and API routes:

- `Content-Security-Policy`
- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`

Quick check:

```bash
curl -I http://localhost:3000
curl -I http://localhost:3000/api/autocomplete?q=test
```

### Secret scanning

If gitleaks is available:

```bash
gitleaks detect --source . --no-git --verbose
```

Fallback grep rules:

```bash
rg -n "(AKIA[0-9A-Z]{16}|sk_live_[0-9a-zA-Z]{24,}|-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----|xox[baprs]-)" .
```

---

## Observability verification

- Confirm structured logging for key flow checkpoints:
  - search start/end,
  - details fetch,
  - prebook request/response status,
  - booking submission status,
  - upstream error classification.
- Validate user-visible error boundaries:
  - React/Next error boundaries show safe fallback without leaking internals.
- Verify network error handling:
  - retry/backoff behavior for transient failures,
  - no infinite retry loops,
  - actionable error telemetry emitted.

---

## Rollback plan

1. **Code rollback:**
   - `git revert <commit_sha>` for the change commit(s), or rollback deployment artifact to previous image.
2. **Runtime rollback:**
   - redeploy last known good release.
3. **Feature-flag rollback (if available):**
   - disable affected feature path while preserving baseline booking/search.
4. **Data safety:**
   - avoid destructive schema changes without backward-compatible migration path.

---

## Definition of Done (DoD)

- [ ] Change fulfills product requirement and acceptance criteria.
- [ ] Lint/typecheck/tests/build pass on CI.
- [ ] Production smoke flow passes for affected area.
- [ ] LiteAPI mocked tests cover success + failure paths.
- [ ] Optional live canary validates search → details → prebook (`usePaymentSdk: true`).
- [ ] Security checks complete (audit + header sanity + secret scan).
- [ ] Observability confirms logs + error boundaries + retry behavior.
- [ ] Rollback steps verified and documented.

---

## CI-ready command bundle

```bash
set -euo pipefail

# 0) Runtime checks (target versions)
node -v
pnpm -v

# 1) Install
pnpm install --frozen-lockfile

# 2) Static checks
pnpm lint
pnpm exec tsc --noEmit

# 3) Unit tests
pnpm test

# 4) Build
pnpm build

# 5) Start app for smoke/e2e
pnpm start &
APP_PID=$!
trap 'kill $APP_PID' EXIT
sleep 5

# 6) E2E (prefer package script if available)
if pnpm run | rg -q "^\s*e2e\b"; then
  pnpm e2e
else
  pnpm exec playwright test || pnpm dlx playwright test
fi

# 7) Security audit
pnpm audit --prod

# 8) Optional lighthouse artifact
mkdir -p artifacts
pnpm dlx lighthouse http://localhost:3000 \
  --only-categories=performance,accessibility,best-practices,seo \
  --preset=desktop --quiet --chrome-flags="--headless" \
  --output=json --output-path=./artifacts/lighthouse.json
```

---

## Repository-specific detection snapshot (for this repo revision)

- Package manager lockfile currently present: `package-lock.json`.
- Existing scripts detected: `dev`, `build`, `start`, `lint`, `test`, `test:watch`.
- No dedicated `typecheck`/`e2e` scripts currently defined; use `pnpm exec tsc --noEmit` and Playwright fallback commands above.
- Active integrations observed in codebase: LiteAPI, Supabase, Upstash Redis/rate-limit, Sentry.
