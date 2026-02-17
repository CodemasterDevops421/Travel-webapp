# DB Runbook (Supabase)

## Apply schema
```bash
supabase db push
```

If using SQL editor, run:
- `supabase/migrations/20260217_ota_core.sql`

## Required tables
- `booking_quotes`
- `bookings`
- `booking_events`

## Required indexes
- `booking_quotes_hotel_id_idx`
- `booking_quotes_expires_at_idx`
- `bookings_liteapi_booking_id_uidx`
- `bookings_status_idx`
- `bookings_metadata_gin_idx`
- `booking_events_event_name_idx`
- `booking_events_occurred_at_idx`
- `booking_events_booking_id_idx`

## Retention guidance
- `booking_events`: keep 180 days hot; archive older rows to object storage.
- `booking_quotes`: purge expired quotes older than 30 days.

## Health checks
```sql
select count(*) from booking_quotes;
select count(*) from bookings;
select count(*) from booking_events;
```

## Incident fallback
- If schema is missing or migrations failed, booking APIs can degrade to local fallback in non-production only.
- In production, set `STRICT_PERSISTENCE_MODE=true` and fail deployment if migrations are missing.
