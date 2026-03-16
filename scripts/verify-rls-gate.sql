-- Production/staging verification for booking integrity + RLS rollout.
-- Usage examples:
--   psql "$SUPABASE_DB_URL" -f scripts/verify-rls-gate.sql
--   supabase db remote commit --db-url "$SUPABASE_DB_URL" < scripts/verify-rls-gate.sql

\pset pager off

\echo '=== Migration Gate: transaction_id integrity ==='
select
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bookings'
      and column_name = 'transaction_id'
  ) as bookings_has_transaction_id;

select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'bookings'
  and indexname in (
    'bookings_transaction_id_unique_idx',
    'bookings_transaction_id_idx'
  )
order by indexname;

\echo '=== RLS Enabled Tables ==='
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

\echo '=== Installed Policies ==='
select
  tablename,
  policyname,
  cmd,
  permissive,
  roles
from pg_policies
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
order by tablename, policyname;

\echo '=== Admin Safety Checks ==='
select count(*) as active_admin_count
from public.admin_users
where is_active = true;

\echo '=== Booking Ownership Coverage ==='
select
  count(*) as total_bookings,
  count(*) filter (where user_id is not null) as bookings_with_user_id,
  count(*) filter (
    where lower(coalesce(metadata #>> '{holder,email}', '')) <> ''
  ) as bookings_with_holder_email,
  count(*) filter (
    where user_id is null
      and lower(coalesce(metadata #>> '{holder,email}', '')) = ''
  ) as bookings_without_owner_link
from public.bookings;

\echo '=== Payment Log Ownership Joinability ==='
select
  count(*) as total_payment_logs,
  count(*) filter (where booking_id is not null) as payment_logs_with_booking_id,
  count(*) filter (where booking_id is null) as payment_logs_without_booking_id
from public.payment_logs;

\echo '=== Search Log Ownership Coverage ==='
select
  count(*) as total_search_logs,
  count(*) filter (where user_id is not null) as search_logs_with_user_id,
  count(*) filter (where user_id is null) as search_logs_without_user_id
from public.search_logs;
