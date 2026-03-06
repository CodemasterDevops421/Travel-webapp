-- Phase 3: DB-side aggregation + indexing for admin reports

create or replace function public.fn_admin_reconciliation_summary(period_start_iso timestamptz)
returns table (
  confirmed_count bigint,
  reconciled_count bigint,
  pending_count bigint,
  mismatch_count bigint,
  open_issue_count bigint,
  resolved_issue_count bigint,
  gross_confirmed_amount numeric,
  expected_commission_amount numeric,
  recorded_commission_amount numeric,
  variance_amount numeric,
  coverage_percent numeric
)
language sql
stable
as $$
with base as (
  select
    b.id,
    b.total_amount,
    b.commission_amount,
    b.currency,
    b.metadata,
    ct.booking_id as tracking_booking_id,
    ct.gross_booking_value,
    ct.commission_amount as tracking_commission_amount,
    ct.currency as tracking_currency
  from public.bookings b
  left join public.commission_tracking ct
    on ct.booking_id = b.id
  where b.created_at >= period_start_iso
    and b.status in ('confirmed', 'refunded')
),
normalized as (
  select
    id,
    coalesce(total_amount, 0)::numeric as booking_total,
    commission_amount as booking_commission_amount,
    currency as booking_currency,
    metadata,
    tracking_booking_id is not null as has_tracking,
    coalesce(gross_booking_value, 0)::numeric as tracking_gross_booking_value,
    coalesce(tracking_commission_amount, 0)::numeric as tracking_commission_amount,
    tracking_currency,
    case
      when coalesce(metadata ->> 'commissionAmount', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
        then (metadata ->> 'commissionAmount')::numeric
      else null
    end as metadata_commission_amount,
    case
      when coalesce(metadata ->> 'commissionPercent', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
        then (metadata ->> 'commissionPercent')::numeric
      else null
    end as metadata_commission_percent,
    case
      when lower(coalesce(metadata #>> '{reconciliation,resolved}', '')) in ('true', 'false')
        then (metadata #>> '{reconciliation,resolved}')::boolean
      else false
    end as issue_resolved
  from base
),
calc as (
  select
    id,
    has_tracking,
    issue_resolved,
    booking_total,
    coalesce(
      booking_commission_amount,
      case
        when metadata_commission_percent is not null
          then booking_total * (metadata_commission_percent / 100.0)
        else null
      end,
      tracking_commission_amount,
      0
    )::numeric as expected_commission_amount,
    tracking_commission_amount::numeric as recorded_commission_amount,
    (
      has_tracking
      and (
        (
          booking_currency is not null
          and tracking_currency is not null
          and booking_currency <> tracking_currency
        )
        or abs(round(tracking_gross_booking_value::numeric, 2) - round(booking_total::numeric, 2)) > 0.01
        or abs(
          round(tracking_commission_amount::numeric, 2) - round(
            coalesce(
              booking_commission_amount,
              case
                when metadata_commission_percent is not null
                  then booking_total * (metadata_commission_percent / 100.0)
                else null
              end,
              tracking_commission_amount,
              0
            )::numeric,
            2
          )
        ) > 0.01
      )
    ) as has_mismatch
  from normalized
)
select
  count(*) as confirmed_count,
  count(*) filter (where has_tracking) as reconciled_count,
  count(*) - count(*) filter (where has_tracking) as pending_count,
  count(*) filter (where has_mismatch) as mismatch_count,
  count(*) filter (
    where (not has_tracking or has_mismatch)
      and issue_resolved = false
  ) as open_issue_count,
  count(*) filter (
    where (not has_tracking or has_mismatch)
      and issue_resolved = true
  ) as resolved_issue_count,
  round(coalesce(sum(booking_total), 0), 2) as gross_confirmed_amount,
  round(coalesce(sum(expected_commission_amount), 0), 2) as expected_commission_amount,
  round(coalesce(sum(recorded_commission_amount), 0), 2) as recorded_commission_amount,
  round(
    coalesce(sum(expected_commission_amount), 0) - coalesce(sum(recorded_commission_amount), 0),
    2
  ) as variance_amount,
  case
    when count(*) = 0 then 100::numeric
    else round((count(*) filter (where has_tracking))::numeric * 100.0 / count(*)::numeric, 1)
  end as coverage_percent
from calc;
$$;

create or replace function public.fn_admin_support_operations_summary(
  period_start_iso timestamptz,
  breach_hours_input integer default 24
)
returns table (
  total_cases bigint,
  open_cases bigint,
  breached_cases bigint,
  high_priority_open_cases bigint,
  assigned_cases bigint,
  unresolved_forwarding_failures bigint
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
    end as support_requested_at,
    case
      when lower(coalesce(b.metadata ->> 'supportState', '')) in ('new', 'in_progress', 'awaiting_supplier', 'resolved', 'closed')
        then lower(b.metadata ->> 'supportState')
      else 'new'
    end as support_state,
    case
      when lower(coalesce(b.metadata ->> 'supportPriority', '')) in ('low', 'medium', 'high', 'urgent')
        then lower(b.metadata ->> 'supportPriority')
      else 'medium'
    end as support_priority,
    lower(coalesce(b.metadata ->> 'supportForwarded', 'false')) in ('true', 't', '1') as support_forwarded,
    nullif(trim(coalesce(b.metadata ->> 'supportForwardError', '')), '') as support_forward_error,
    nullif(trim(coalesce(b.metadata ->> 'supportAssignedTo', '')), '') as support_assigned_to
  from public.bookings b
  where b.created_at >= period_start_iso
),
cases as (
  select
    support_requested_at,
    support_state,
    support_priority,
    support_forwarded,
    support_forward_error,
    support_assigned_to,
    extract(epoch from (timezone('utc', now()) - support_requested_at)) / 3600.0 as age_hours
  from scoped
  where support_requested_at is not null
),
calc as (
  select
    *,
    support_state not in ('resolved', 'closed') as is_open,
    (
      support_state not in ('resolved', 'closed')
      and (extract(epoch from (timezone('utc', now()) - support_requested_at)) / 3600.0) > greatest(1, coalesce(breach_hours_input, 24))
    ) as is_breached
  from cases
)
select
  count(*) as total_cases,
  count(*) filter (where is_open) as open_cases,
  count(*) filter (where is_breached) as breached_cases,
  count(*) filter (where is_open and support_priority in ('high', 'urgent')) as high_priority_open_cases,
  count(*) filter (where support_assigned_to is not null) as assigned_cases,
  count(*) filter (where is_open and support_forward_error is not null and support_forwarded = false) as unresolved_forwarding_failures
from calc;
$$;

create index if not exists bookings_created_at_idx
  on public.bookings(created_at desc);

create index if not exists bookings_status_created_at_idx
  on public.bookings(status, created_at desc);

create index if not exists commission_tracking_booking_id_updated_at_idx
  on public.commission_tracking(booking_id, updated_at desc);
