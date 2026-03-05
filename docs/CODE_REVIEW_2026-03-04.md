# Code Review Report (2026-03-04)

## Scope

- Repository-wide risk-focused review of booking lifecycle, search/property-preview filtering, admin operations, and test/type health.
- Validation commands executed:
  - `npm test` (41 files, 173 tests passed)
  - `npm run typecheck` (passed)

## Findings (Ordered by Severity)

### 1. High (Resolved): Multi-room finalization payload could fail server validation

- Evidence:
  - UI creates guest entries with empty names for non-first rows:
    - (fixed) now uses non-empty names for every occupancy
    - `src/features/booking/components/booking-console.tsx:401`
    - `src/features/booking/components/booking-console.tsx:402`
  - API requires every guest entry to have non-empty names:
    - `src/app/api/booking/book/route.ts:52`
    - `src/app/api/booking/book/route.ts:53`
- Impact:
  - For multi-room bookings, `/api/booking/book` can reject payload with `400` due invalid guest names.
  - This causes checkout finalization failures for valid user flows.
- Recommendation:
  - Either:
    1. Require full guest names per occupancy in UI before finalization, or
    2. Align API schema with LiteAPI contract if only holder details are needed for secondary occupancies.
  - Add a regression test for multi-room finalize payload acceptance.

### 2. Medium (Residual): Occupancy mapping semantics still require supplier contract confirmation

- Evidence:
  - UI now maps `occupancyNumber` by room index (`index + 1`) instead of adult count:
    - `src/features/booking/components/booking-console.tsx:400`
  - API accepts `occupancyNumber` as a required positive integer:
    - `src/app/api/booking/book/route.ts:51`
- Impact:
  - Mapping is now consistent with typical supplier expectations, but needs explicit LiteAPI contract verification to remove ambiguity.
- Recommendation:
  - Confirm LiteAPI `guests[].occupancyNumber` semantics and map accordingly (likely room index + 1).
  - Add contract tests covering 1-room and multi-room payloads.

### 3. Medium (Resolved): `minPrice` filter was sent by client but ignored by API route

- Evidence:
  - Client hook sends `minPrice`:
    - `src/features/search/hooks/use-property-preview.ts:24`
    - `src/features/search/hooks/use-property-preview.ts:70`
  - Property-preview route now parses and forwards `minPrice`:
    - `src/app/api/property-preview/route.ts:10`
- Impact:
  - Previously caused filter mismatch between UI and backend; now resolved.
- Recommendation:
  - Keep tests covering `minPrice` behavior to prevent regression.

### 4. Medium (Resolved): `page` and `limit` were sent by client but not consumed by API route

- Evidence:
  - Client hook sends pagination params:
    - `src/features/search/hooks/use-property-preview.ts:79`
    - `src/features/search/hooks/use-property-preview.ts:82`
  - Property-preview route now parses and forwards `page/limit`, and server logic paginates filtered results:
    - `src/app/api/property-preview/route.ts:10`
    - `src/server/liteapi.ts:1646`
- Impact:
  - Previously caused no-op pagination behavior; now resolved.
- Recommendation:
  - Add route-level tests for page/limit pagination behavior.

## Positive Checks

- Recently patched admin issues are correct and covered by passing tests:
  - Reconciliation expected commission precedence fix.
  - Default handling for missing `days` and `breachHours`.
- This review remediation patch passed:
  - `npm run typecheck`
  - `npm test`
- Booking/webhook/admin test suites are green.
- Type checks are green.

## Documentation Updates Needed Next

1. Update `docs/WHATS_BUILT.md` to explicitly mark current property-preview filter limitations (`minPrice`, paging pending).
2. Update `docs/LITEAPI_FULL_FLOW_PLAN.md` with a follow-up item for multi-room guest payload contract alignment.
3. Add a dedicated regression test plan entry for multi-room booking finalize.
