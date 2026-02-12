# IMPLEMENTATION.md

## Purpose and scope

- **Change summary:** `{{ONE_SENTENCE_CHANGE_SUMMARY}}`
- **Modified paths:** `{{LIST_OF_FILES_OR_FOLDERS_CHANGED}}`
- **Feature area:** `{{SEARCH|RESULTS|DETAILS|PREBOOK|CHECKOUT|AUTH|CACHING|WEBHOOKS|SEO|UI}}`
- **Risk level:** `{{LOW|MEDIUM|HIGH}}`

### In scope

- Functional correctness and regressions for impacted flows.
- Build/release reliability for Next.js App Router + RSC.
- Security/performance/observability release gates.

### Out of scope

- Full-scale load testing.
- Cross-browser certification beyond Chromium smoke unless requested.

---

## Technical stack versions (as-of 2026-02-12)

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

- Supabase JS: **v2.95.3** (**active path in repo architecture**)
- Prisma: **v7.4.0** (**optional path; not active unless introduced by change**)
- Redis (Upstash): configured via env vars

### Payments

- Stripe (Node SDK): **v20.3.1**
- `@stripe/stripe-js`: **v8.7.0**
- `@stripe/react-stripe-js`: **v5.6.0**

### Travel API

- LiteAPI Node SDK: **`liteapi-node-sdk`**
- Verify exact installed version from lockfile before release.

---

## Current repository delta vs target stack

Current repository package versions are below target verification matrix (e.g., Next 15.x / Tailwind 3.x / Zod 3.x at this snapshot). Release gate requires either:

1. Upgrade app dependencies to target versions and pass all checks, or
2. Document a temporary compatibility waiver with expiry and risk owner.

---

## Environment setup

### Runtime verification

```bash
node -v
pnpm -v
```

Expected:

- `node -v` => `v24.x`
- `pnpm -v` => `10.29.3`

### Package manager note

- Primary workflow: **pnpm**.
- Repo currently includes `package-lock.json`; use npm equivalents when needed.

---

## Required environment variables

Create `.env.local` with safe placeholders:

```dotenv
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# LiteAPI
LITEAPI_API_KEY=liteapi_sandbox_xxx
# Legacy express compatibility (optional):
LITEAPI_KEY=liteapi_sandbox_xxx
LITEAPI_ENV=sandbox
LITEAPI_BASE_URL=https://api.liteapi.travel/v3.0
LITEAPI_TIMEOUT_MS=8000

# Supabase (active)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx

# Optional Prisma / Neon
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require

# Optional Upstash
UPSTASH_REDIS_REST_URL=https://example.upstash.io
UPSTASH_REDIS_REST_TOKEN=upstash_token_xxx

# Optional Google places fallback
GOOGLE_PLACES_API_KEY=google_key_xxx

# Optional Stripe and webhooks
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
LITEAPI_WEBHOOK_SECRET=liteapi_webhook_secret_xxx

# Optional monitoring
SENTRY_DSN=
LOG_LEVEL=info

# Legacy express flow
SESSION_SECRET=replace_with_random_long_secret
```

---

## Local verification

```bash
npm ci
npm run lint
npx tsc --noEmit
npm test
```

Expected:

- lint/typecheck/test all pass.
- no runtime env parsing errors.

---

## Build verification

```bash
npm run build
npm run start
```

### Production smoke checklist

Against `http://localhost:3000`:

1. Home/search page renders.
2. Search returns hotels or explicit empty state.
3. Hotel details loads without crash.
4. Prebook flow succeeds in sandbox; `usePaymentSdk: true` path validated.
5. Checkout/confirmation handles both success and failure gracefully.

---

## Automated checks

### Lint

```bash
npm run lint
```

### Typecheck

```bash
npx tsc --noEmit
```

### Unit tests

```bash
npm test
```

### E2E (Playwright default)

```bash
npx playwright test
```

If Playwright is not installed in repo:

```bash
npx -y playwright test
```

---

## API verification strategy

### Deterministic mocked tests (required)

Mock LiteAPI/search-rates/prebook/book boundaries for:

- success + empty + timeout + upstream 4xx/5xx
- contract mapping for UI-safe payloads
- prebook response with `usePaymentSdk: true`

### Optional canary run (sandbox only)

- Search returns results for known city/date.
- Details endpoint resolves selected hotel.
- Prebook succeeds with `usePaymentSdk: true`.
- No real charge execution.

---

## Performance verification

### Lighthouse CLI

```bash
npx -y lighthouse http://localhost:3000 \
  --only-categories=performance,accessibility,best-practices,seo \
  --preset=desktop --quiet --chrome-flags="--headless" \
  --output=json --output-path=./artifacts/lighthouse.json
```

Release thresholds:

- Performance >= 80
- Accessibility >= 90
- Best Practices >= 90
- SEO >= 90

CWV sanity targets:

- LCP < 2.5s
- CLS < 0.1
- INP < 200ms

---

## Security verification

```bash
npm audit --omit=dev
curl -I http://localhost:3000
curl -I "http://localhost:3000/api/autocomplete?q=test"
```

Required header checks:

- `Content-Security-Policy`
- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `Referrer-Policy`

Secret scan:

```bash
rg -n "(AKIA[0-9A-Z]{16}|sk_live_[0-9a-zA-Z]{24,}|-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----|xox[baprs]-)" .
```

---

## Observability verification

- Structured logs present for search/details/prebook/book checkpoints.
- Error boundary renders safe user fallback and avoids secret leakage.
- Network retry behavior is bounded (no infinite retries).
- Sentry (if enabled) receives server/client exception events.

---

## Rollback plan

1. `git revert <commit_sha>` for faulty change.
2. Re-deploy previous successful artifact.
3. Disable feature flag (if available).
4. Confirm no destructive DB migration rollback hazards.

---

## Definition of Done

- [ ] Functional acceptance criteria met.
- [ ] `lint` + `typecheck` + `test` + `build` pass.
- [ ] Smoke flow passes for impacted feature.
- [ ] LiteAPI mock tests cover success/failure branches.
- [ ] Security checks pass (audit + headers + secret scan).
- [ ] Observability checks pass.
- [ ] **Coverage >= 80% lines (or approved waiver).**
- [ ] **API p95 < 200ms, DB p95 < 100ms in staging (or approved waiver).**
- [ ] Rollback procedure validated.

---

## CI-ready command bundle

```bash
set -Eeuo pipefail

node -v
npm -v

npm ci
npm run lint
npx tsc --noEmit
npm test
npm run build

npm run start &
APP_PID=$!
trap 'kill $APP_PID' EXIT
sleep 5

npx -y playwright test || true
npm audit --omit=dev

mkdir -p artifacts
npx -y lighthouse http://localhost:3000 \
  --only-categories=performance,accessibility,best-practices,seo \
  --preset=desktop --quiet --chrome-flags="--headless" \
  --output=json --output-path=./artifacts/lighthouse.json || true
```

---

## Repository-specific snapshot

- Current scripts: `dev`, `build`, `start`, `lint`, `test`, `test:watch`.
- No first-class `typecheck`/`e2e` scripts: use `npx tsc --noEmit` and `npx playwright test`.
- Active integrations in code: LiteAPI, Supabase, Upstash, Sentry.
