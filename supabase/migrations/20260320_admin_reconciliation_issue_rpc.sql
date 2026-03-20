create or replace function public.fn_admin_reconciliation_issue_page(
  period_start_iso timestamptz,
  include_resolved boolean default false,
  page_offset integer default 0,
  page_limit integer default 50
)
returns table (
  booking_id uuid,
  issue_type text,
  detail text,
  created_at timestamptz,
  reconciliation jsonb
)
language sql
stable
as $$
with commission_latest as (
  select distinct on (ct.booking_id)
    ct.booking_id,
    ct.gross_booking_value,
    ct.commission_amount,
    ct.currency
  from public.commission_tracking ct
  order by ct.booking_id, ct.updated_at desc
),
base as (
  select
    b.id as booking_id,
    b.created_at,
    b.total_amount,
    b.commission_amount,
    b.currency,
    b.metadata,
    cl.booking_id as tracking_booking_id,
    cl.gross_booking_value,
    cl.commission_amount as tracking_commission_amount,
    cl.currency as tracking_currency,
    case
      when lower(coalesce(b.metadata #>> '{reconciliation,resolved}', '')) in ('true', 'false')
        then (b.metadata #>> '{reconciliation,resolved}')::boolean
      else false
    end as reconciliation_resolved,
    case
      when coalesce(b.metadata ->> 'commissionAmount', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
        then (b.metadata ->> 'commissionAmount')::numeric
      else null
    end as metadata_commission_amount,
    case
      when coalesce(b.metadata ->> 'commissionPercent', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
        then (b.metadata ->> 'commissionPercent')::numeric
      else null
    end as metadata_commission_percent
  from public.bookings b
  left join commission_latest cl
    on cl.booking_id = b.id
  where b.created_at >= period_start_iso
    and b.status in ('confirmed', 'booking_confirmed', 'refunded')
),
issues as (
  select
    booking_id,
    created_at,
    metadata -> 'reconciliation' as reconciliation,
    case
      when tracking_booking_id is null then 'missing_tracking'
      when currency is not null and tracking_currency is not null and currency <> tracking_currency then 'currency_mismatch'
      when abs(round(coalesce(gross_booking_value, 0)::numeric, 2) - round(coalesce(total_amount, 0)::numeric, 2)) > 0.01
        or abs(
          round(coalesce(tracking_commission_amount, 0)::numeric, 2) - round(
            coalesce(
              commission_amount,
              metadata_commission_amount,
              case
                when metadata_commission_percent is not null
                  then coalesce(total_amount, 0)::numeric * (metadata_commission_percent / 100.0)
                else null
              end,
              coalesce(tracking_commission_amount, 0)::numeric
            )::numeric,
            2
          )
        ) > 0.01 then 'amount_mismatch'
      else null
    end as issue_type,
    case
      when tracking_booking_id is null then 'No commission_tracking row found for booking'
      when currency is not null and tracking_currency is not null and currency <> tracking_currency
        then format('Booking currency %s differs from tracking currency %s', currency, tracking_currency)
      when abs(round(coalesce(gross_booking_value, 0)::numeric, 2) - round(coalesce(total_amount, 0)::numeric, 2)) > 0.01
        or abs(
          round(coalesce(tracking_commission_amount, 0)::numeric, 2) - round(
            coalesce(
              commission_amount,
              metadata_commission_amount,
              case
                when metadata_commission_percent is not null
                  then coalesce(total_amount, 0)::numeric * (metadata_commission_percent / 100.0)
                else null
              end,
              coalesce(tracking_commission_amount, 0)::numeric
            )::numeric,
            2
          )
        ) > 0.01
        then format(
          'Gross/commission mismatch (booking=%s, tracking=%s)',
          round(coalesce(total_amount, 0)::numeric, 2),
          round(coalesce(gross_booking_value, 0)::numeric, 2)
        )
      else null
    end as detail,
    reconciliation_resolved
  from base
)
select
  booking_id,
  issue_type,
  detail,
  created_at,
  reconciliation
from issues
where issue_type is not null
  and (include_resolved or reconciliation_resolved = false)
order by created_at desc
offset greatest(page_offset, 0)
limit greatest(page_limit, 1);
$$;

create or replace function public.fn_admin_reconciliation_issue_count(
  period_start_iso timestamptz,
  include_resolved boolean default false
)
returns table (
  total_count bigint
)
language sql
stable
as $$
with commission_latest as (
  select distinct on (ct.booking_id)
    ct.booking_id,
    ct.gross_booking_value,
    ct.commission_amount,
    ct.currency
  from public.commission_tracking ct
  order by ct.booking_id, ct.updated_at desc
),
issues as (
  select
    case
      when lower(coalesce(b.metadata #>> '{reconciliation,resolved}', '')) in ('true', 'false')
        then (b.metadata #>> '{reconciliation,resolved}')::boolean
      else false
    end as reconciliation_resolved,
    case
      when cl.booking_id is null then true
      when b.currency is not null and cl.currency is not null and b.currency <> cl.currency then true
      when abs(round(coalesce(cl.gross_booking_value, 0)::numeric, 2) - round(coalesce(b.total_amount, 0)::numeric, 2)) > 0.01
        or abs(
          round(coalesce(cl.commission_amount, 0)::numeric, 2) - round(
            coalesce(
              b.commission_amount,
              case
                when coalesce(b.metadata ->> 'commissionAmount', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
                  then (b.metadata ->> 'commissionAmount')::numeric
                else null
              end,
              case
                when coalesce(b.metadata ->> 'commissionPercent', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
                  then coalesce(b.total_amount, 0)::numeric * (((b.metadata ->> 'commissionPercent')::numeric) / 100.0)
                else null
              end,
              coalesce(cl.commission_amount, 0)::numeric
            )::numeric,
            2
          )
        ) > 0.01 then true
      else false
    end as has_issue
  from public.bookings b
  left join commission_latest cl
    on cl.booking_id = b.id
  where b.created_at >= period_start_iso
    and b.status in ('confirmed', 'booking_confirmed', 'refunded')
)
select count(*)::bigint as total_count
from issues
where has_issue
  and (include_resolved or reconciliation_resolved = false);
$$;

