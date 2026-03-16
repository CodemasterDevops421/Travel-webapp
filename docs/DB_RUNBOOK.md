# Database Runbook

This project uses Supabase/PostgreSQL as the canonical database.

## Migrations

Current migrations in repo:

- `supabase/migrations/006_phase1_foundation.sql`
- `supabase/migrations/20260217_ota_core.sql`
- `supabase/migrations/20260225_booking_lifecycle_guards.sql`
- `supabase/migrations/20260304_admin_report_phase3.sql`
- `supabase/migrations/20260316_booking_transaction_id_integrity.sql`
- `supabase/migrations/20260316_enable_rls_and_access_policies.sql`

Apply schema:

```bash
supabase db push
```

If you need to inspect local status:

```bash
supabase migration list
```

## RLS Rollout Steps

These steps are required for `supabase/migrations/20260316_enable_rls_and_access_policies.sql`.

1. Preflight before applying:
   - confirm at least one active admin exists in `public.admin_users`
   - confirm booking rows have `user_id` populated where expected
   - confirm legacy owner fallback data exists where needed: `metadata->holder->email`
   - confirm service-role server paths are the only write paths for admin/reporting/ops tables

2. Run migration in staging first:

```bash
supabase db push
```

Optional verification script:

```bash
psql "$SUPABASE_DB_URL" -f scripts/verify-rls-gate.sql
```

3. Validate policy footprint immediately after migration:

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'bookings',
    'booking_quotes',
    'booking_events',
    'payment_logs',
    'commission_tracking',
    'admin_users',
    'reviews_cache',
    'search_logs'
  )
order by tablename;

select policyname, tablename, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in (
    'bookings',
    'payment_logs',
    'commission_tracking',
    'admin_users',
    'search_logs'
  )
order by tablename, policyname;
```

You can run the same checks via `scripts/verify-rls-gate.sql` if you want one reusable artifact.

4. Staging verification must prove:
   - normal authenticated user can only read own booking data
   - admin can read admin/reporting data
   - unauthenticated access is denied
   - booking/payment/admin APIs still pass smoke checks

5. Production rollout order:
   - apply migration
   - run booking/auth/admin smoke tests immediately
   - verify admin dashboard loads
   - verify booking status, booking detail, cancel, and support handoff still work for owner session
   - verify no unexpected `42501` / permission-denied errors in logs

## RLS Rollback Steps

Use rollback only if policies break production access unexpectedly.

1. Keep the app on service-role-backed paths while diagnosing.
2. Capture failing query/table names from logs before changing policies.
3. Emergency rollback SQL:

```sql
alter table public.bookings disable row level security;
alter table public.booking_quotes disable row level security;
alter table public.booking_events disable row level security;
alter table public.payment_logs disable row level security;
alter table public.commission_tracking disable row level security;
alter table public.admin_users disable row level security;
alter table public.reviews_cache disable row level security;
alter table public.search_logs disable row level security;
```

4. After rollback:
   - rerun booking and admin smoke tests
   - document which policy or ownership assumption failed
   - create a corrective migration instead of editing production tables manually without a follow-up migration

## Core Tables To Expect

- `booking_quotes`
- `bookings`
- `booking_events`
- `commission_tracking`
- `payment_logs`
- `reviews_cache`
- `analytics_events`
- admin/reporting tables introduced by later migrations

## Health Checks

Run simple presence checks:

```sql
select count(*) from booking_quotes;
select count(*) from bookings;
select count(*) from booking_events;
```

Optional runtime tables used by later phases:

```sql
select count(*) from commission_tracking;
select count(*) from payment_logs;
select count(*) from reviews_cache;
```

## Production Rules

- `STRICT_PERSISTENCE_MODE=true` in production.
- Missing schema or unavailable durable persistence must fail closed for booking-critical flows.
- In-memory fallback is only acceptable for local/test behavior, not production.

## Retention Guidance

- `booking_events`: keep hot for 180 days, archive older rows if needed.
- `booking_quotes`: purge expired quotes older than 30 days.
- Admin/reporting tables should follow the reporting retention policy defined by operators.

## Incident Notes

- If migrations are missing, do not treat the deployment as healthy.
- If Supabase connectivity is degraded, booking-critical flows should not silently downgrade in production.
- If RLS rollout causes `permission denied for table` errors, treat the deploy as degraded and execute the RLS rollback steps above.
