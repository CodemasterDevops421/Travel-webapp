# Database Runbook

This project uses Supabase/PostgreSQL as the canonical database.

## Migrations

Current migrations in repo:

- `supabase/migrations/006_phase1_foundation.sql`
- `supabase/migrations/20260217_ota_core.sql`
- `supabase/migrations/20260225_booking_lifecycle_guards.sql`
- `supabase/migrations/20260304_admin_report_phase3.sql`

Apply schema:

```bash
supabase db push
```

If you need to inspect local status:

```bash
supabase migration list
```

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
