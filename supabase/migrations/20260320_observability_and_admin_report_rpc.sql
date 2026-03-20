create table if not exists public.ops_telemetry_events (
  id uuid primary key,
  category text not null,
  metric text not null,
  value double precision not null,
  unit text null,
  status text not null default 'info',
  dimensions jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists ops_telemetry_events_category_metric_observed_at_idx
  on public.ops_telemetry_events(category, metric, observed_at desc);

create or replace function public.fn_admin_support_sla_summary(
  period_start_iso timestamptz,
  breach_hours_input integer default 24
)
returns table (
  total_cases bigint,
  open_cases bigint,
  forwarded_cases bigint,
  forwarding_failures bigint,
  breach_count bigint,
  average_age_hours numeric
)
language sql
stable
as $$
with scoped as (
  select
    b.metadata,
    case
      when coalesce(b.metadata ->> 'supportRequestedAt', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
        then (b.metadata ->> 'supportRequestedAt')::timestamptz
      else null
    end as support_requested_at
  from public.bookings b
  where b.created_at >= period_start_iso
),
cases as (
  select
    support_requested_at,
    lower(coalesce(metadata ->> 'supportForwarded', 'false')) in ('true', 't', '1') as support_forwarded,
    nullif(trim(coalesce(metadata ->> 'supportForwardError', '')), '') as support_forward_error,
    extract(epoch from (timezone('utc', now()) - support_requested_at)) / 3600.0 as age_hours
  from scoped
  where support_requested_at is not null
)
select
  count(*) as total_cases,
  count(*) filter (where support_forwarded = false) as open_cases,
  count(*) filter (where support_forwarded = true) as forwarded_cases,
  count(*) filter (where support_forward_error is not null) as forwarding_failures,
  count(*) filter (where age_hours > greatest(1, coalesce(breach_hours_input, 24)) and support_forwarded = false) as breach_count,
  round(coalesce(avg(age_hours), 0)::numeric, 1) as average_age_hours
from cases;
$$;

create or replace function public.fn_admin_support_operations_case_page(
  period_start_iso timestamptz,
  breach_hours_input integer default 24,
  page_offset integer default 0,
  page_limit integer default 50
)
returns table (
  booking_id uuid,
  booking_status text,
  state text,
  priority text,
  assigned_to text,
  support_request_id text,
  support_requested_at timestamptz,
  updated_at timestamptz,
  age_hours numeric,
  sla_breach boolean,
  support_forwarded boolean,
  last_error text,
  resolution_note text
)
language sql
stable
as $$
with scoped as (
  select
    b.id as booking_id,
    b.status as booking_status,
    b.metadata,
    case
      when coalesce(b.metadata ->> 'supportRequestedAt', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
        then (b.metadata ->> 'supportRequestedAt')::timestamptz
      else null
    end as support_requested_at
  from public.bookings b
  where b.created_at >= period_start_iso
)
select
  booking_id,
  booking_status,
  case
    when lower(coalesce(metadata ->> 'supportState', '')) in ('new', 'in_progress', 'awaiting_supplier', 'resolved', 'closed')
      then lower(metadata ->> 'supportState')
    else 'new'
  end as state,
  case
    when lower(coalesce(metadata ->> 'supportPriority', '')) in ('low', 'medium', 'high', 'urgent')
      then lower(metadata ->> 'supportPriority')
    else 'medium'
  end as priority,
  nullif(trim(coalesce(metadata ->> 'supportAssignedTo', '')), '') as assigned_to,
  nullif(trim(coalesce(metadata ->> 'lastSupportRequestId', '')), '') as support_request_id,
  support_requested_at,
  coalesce(
    case
      when coalesce(metadata ->> 'supportUpdatedAt', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
        then (metadata ->> 'supportUpdatedAt')::timestamptz
      else null
    end,
    support_requested_at
  ) as updated_at,
  round((extract(epoch from (timezone('utc', now()) - support_requested_at)) / 3600.0)::numeric, 1) as age_hours,
  (
    extract(epoch from (timezone('utc', now()) - support_requested_at)) / 3600.0 > greatest(1, coalesce(breach_hours_input, 24))
    and lower(coalesce(metadata ->> 'supportState', 'new')) not in ('resolved', 'closed')
  ) as sla_breach,
  lower(coalesce(metadata ->> 'supportForwarded', 'false')) in ('true', 't', '1') as support_forwarded,
  nullif(trim(coalesce(metadata ->> 'supportForwardError', '')), '') as last_error,
  nullif(trim(coalesce(metadata ->> 'supportResolutionNote', '')), '') as resolution_note
from scoped
where support_requested_at is not null
order by support_requested_at desc
offset greatest(page_offset, 0)
limit greatest(page_limit, 1);
$$;

create or replace function public.fn_admin_support_operations_case_count(
  period_start_iso timestamptz
)
returns table (total_count bigint)
language sql
stable
as $$
select count(*)::bigint as total_count
from public.bookings b
where b.created_at >= period_start_iso
  and coalesce(b.metadata ->> 'supportRequestedAt', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T';
$$;

create or replace function public.fn_admin_support_sla_case_page(
  period_start_iso timestamptz,
  breach_hours_input integer default 24,
  page_offset integer default 0,
  page_limit integer default 50
)
returns table (
  booking_id uuid,
  booking_status text,
  support_requested_at timestamptz,
  support_forwarded boolean,
  support_forward_error text,
  support_request_id text,
  age_hours numeric,
  breach boolean
)
language sql
stable
as $$
with scoped as (
  select
    b.id as booking_id,
    b.status as booking_status,
    b.metadata,
    case
      when coalesce(b.metadata ->> 'supportRequestedAt', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
        then (b.metadata ->> 'supportRequestedAt')::timestamptz
      else null
    end as support_requested_at
  from public.bookings b
  where b.created_at >= period_start_iso
)
select
  booking_id,
  booking_status,
  support_requested_at,
  lower(coalesce(metadata ->> 'supportForwarded', 'false')) in ('true', 't', '1') as support_forwarded,
  nullif(trim(coalesce(metadata ->> 'supportForwardError', '')), '') as support_forward_error,
  nullif(trim(coalesce(metadata ->> 'lastSupportRequestId', '')), '') as support_request_id,
  round((extract(epoch from (timezone('utc', now()) - support_requested_at)) / 3600.0)::numeric, 1) as age_hours,
  (
    extract(epoch from (timezone('utc', now()) - support_requested_at)) / 3600.0 > greatest(1, coalesce(breach_hours_input, 24))
    and lower(coalesce(metadata ->> 'supportForwarded', 'false')) not in ('true', 't', '1')
  ) as breach
from scoped
where support_requested_at is not null
order by support_requested_at desc
offset greatest(page_offset, 0)
limit greatest(page_limit, 1);
$$;

create or replace function public.fn_admin_support_sla_case_count(
  period_start_iso timestamptz
)
returns table (total_count bigint)
language sql
stable
as $$
select count(*)::bigint as total_count
from public.bookings b
where b.created_at >= period_start_iso
  and coalesce(b.metadata ->> 'supportRequestedAt', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T';
$$;

create or replace function public.fn_admin_settlement_ledger_page(
  period_start_iso timestamptz,
  page_offset integer default 0,
  page_limit integer default 50
)
returns table (
  booking_id uuid,
  booking_status text,
  payment_status text,
  gross_amount numeric,
  commission_amount numeric,
  currency text,
  tracking_present boolean,
  payment_log_present boolean,
  settlement_status text,
  issue text,
  created_at timestamptz
)
language sql
stable
as $$
with commission_latest as (
  select distinct on (ct.booking_id)
    ct.booking_id,
    ct.gross_booking_value,
    ct.currency
  from public.commission_tracking ct
  order by ct.booking_id, ct.updated_at desc
),
payment_latest as (
  select distinct on (pl.booking_id)
    pl.booking_id
  from public.payment_logs pl
  where pl.booking_id is not null
  order by pl.booking_id, pl.created_at desc
)
select
  b.id as booking_id,
  b.status as booking_status,
  b.payment_status,
  coalesce(b.total_amount, 0)::numeric as gross_amount,
  coalesce(b.commission_amount, 0)::numeric as commission_amount,
  coalesce(nullif(trim(b.currency), ''), 'USD') as currency,
  cl.booking_id is not null as tracking_present,
  pl.booking_id is not null as payment_log_present,
  case
    when cl.booking_id is null then 'awaiting_tracking'
    when pl.booking_id is null and b.status in ('confirmed', 'booking_confirmed', 'payment_authorized') then 'awaiting_payment'
    when cl.currency is not null and b.currency is not null and b.currency <> cl.currency then 'exception'
    when abs(round(coalesce(cl.gross_booking_value, 0)::numeric, 2) - round(coalesce(b.total_amount, 0)::numeric, 2)) > 0.01 then 'exception'
    else 'settled'
  end as settlement_status,
  case
    when cl.booking_id is null then 'Missing commission tracking row'
    when pl.booking_id is null and b.status in ('confirmed', 'booking_confirmed', 'payment_authorized')
      then format('Missing payment log for %s booking', b.status)
    when cl.currency is not null and b.currency is not null and b.currency <> cl.currency
      then format('Currency mismatch %s/%s', b.currency, cl.currency)
    when abs(round(coalesce(cl.gross_booking_value, 0)::numeric, 2) - round(coalesce(b.total_amount, 0)::numeric, 2)) > 0.01
      then 'Gross amount mismatch between booking and tracking'
    else null
  end as issue,
  b.created_at
from public.bookings b
left join commission_latest cl on cl.booking_id = b.id
left join payment_latest pl on pl.booking_id = b.id
where b.created_at >= period_start_iso
  and b.status in ('confirmed', 'booking_confirmed', 'payment_authorized', 'refunded')
order by b.created_at desc
offset greatest(page_offset, 0)
limit greatest(page_limit, 1);
$$;

create or replace function public.fn_admin_settlement_ledger_count(
  period_start_iso timestamptz
)
returns table (total_count bigint)
language sql
stable
as $$
select count(*)::bigint as total_count
from public.bookings b
where b.created_at >= period_start_iso
  and b.status in ('confirmed', 'booking_confirmed', 'payment_authorized', 'refunded');
$$;
