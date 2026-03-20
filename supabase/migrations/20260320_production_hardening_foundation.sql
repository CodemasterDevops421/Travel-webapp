alter table public.bookings
  add column if not exists supplier_status text,
  add column if not exists reconciliation_status text,
  add column if not exists reconciliation_issue_type text,
  add column if not exists reconciliation_issue_at timestamptz,
  add column if not exists row_version bigint not null default 0;

alter table public.bookings
  alter column payment_status set default 'not_started';

alter table public.bookings
  drop constraint if exists bookings_status_canonical_chk;

alter table public.bookings
  add constraint bookings_status_canonical_chk
  check (
    status in (
      'draft',
      'prebooked',
      'payment_pending',
      'payment_authorized',
      'booking_requested',
      'booking_confirmed',
      'booking_failed',
      'cancelled',
      'refund_pending',
      'refunded'
    )
  );

alter table public.bookings
  drop constraint if exists bookings_payment_status_canonical_chk;

alter table public.bookings
  add constraint bookings_payment_status_canonical_chk
  check (
    payment_status is null or payment_status in (
      'not_started',
      'checkout_created',
      'pending',
      'authorized',
      'captured',
      'failed',
      'refunded',
      'chargeback_review'
    )
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_supplier_status_canonical_chk'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_supplier_status_canonical_chk
      check (
        supplier_status is null or supplier_status in (
          'not_sent',
          'requesting',
          'confirmed',
          'failed',
          'cancelled'
        )
      );
  end if;
end;
$$;

update public.bookings
set
  status = case status
    when 'pending' then 'payment_pending'
    when 'confirmed' then 'booking_confirmed'
    when 'failed' then 'booking_failed'
    else status
  end,
  payment_status = case payment_status
    when null then 'not_started'
    when 'payment_authorized' then 'authorized'
    else payment_status
  end,
  supplier_status = coalesce(
    supplier_status,
    case
      when metadata ->> 'supplierLifecycleState' in ('not_sent', 'requesting', 'confirmed', 'failed', 'cancelled')
        then metadata ->> 'supplierLifecycleState'
      when metadata ->> 'supplierStatus' is not null
        and lower(metadata ->> 'supplierStatus') like '%confirm%'
        then 'confirmed'
      when metadata ->> 'supplierStatus' is not null
        and lower(metadata ->> 'supplierStatus') like '%fail%'
        then 'failed'
      when metadata ->> 'supplierStatus' is not null
        and lower(metadata ->> 'supplierStatus') like '%request%'
        then 'requesting'
      else 'not_sent'
    end
  )
where true;

create table if not exists public.processed_webhook_events (
  source text not null,
  event_id text not null,
  status text not null default 'processing',
  locked_at timestamptz null,
  processed_at timestamptz null,
  created_at timestamptz not null default now(),
  primary key (source, event_id)
);

create table if not exists public.booking_finalize_idempotency (
  transaction_id text primary key,
  response_json jsonb null,
  locked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.booking_outbox_events (
  id uuid primary key,
  aggregate_type text not null,
  aggregate_id text not null,
  event_type text not null,
  idempotency_key text not null unique,
  payload_json jsonb not null,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  available_at timestamptz not null default now(),
  locked_at timestamptz null,
  lock_token text null,
  locked_by text null,
  last_error text null,
  processed_at timestamptz null,
  created_at timestamptz not null default now(),
  check (status in ('pending', 'processing', 'processed', 'dead_letter'))
);

create index if not exists booking_outbox_events_status_available_idx
  on public.booking_outbox_events(status, available_at);

create index if not exists booking_outbox_events_processing_idx
  on public.booking_outbox_events(status, locked_at)
  where status = 'processing';

create unique index if not exists payment_logs_provider_event_external_unique_idx
  on public.payment_logs(provider, event_type, external_payment_id)
  where external_payment_id is not null;

create or replace function public.enforce_booking_lifecycle_transition()
returns trigger as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if old.status = new.status then
    return new;
  end if;

  if old.status = 'draft' and new.status in ('prebooked', 'payment_pending', 'booking_failed', 'cancelled') then
    return new;
  end if;

  if old.status = 'prebooked' and new.status in ('payment_pending', 'booking_failed', 'cancelled') then
    return new;
  end if;

  if old.status = 'payment_pending' and new.status in ('payment_authorized', 'booking_failed', 'cancelled') then
    return new;
  end if;

  if old.status = 'payment_authorized' and new.status in ('booking_requested', 'booking_failed', 'refund_pending', 'cancelled') then
    return new;
  end if;

  if old.status = 'booking_requested' and new.status in ('booking_confirmed', 'booking_failed', 'refund_pending', 'cancelled') then
    return new;
  end if;

  if old.status = 'booking_confirmed' and new.status in ('refund_pending', 'refunded', 'cancelled') then
    return new;
  end if;

  if old.status = 'booking_failed' and new.status = 'refund_pending' then
    return new;
  end if;

  if old.status = 'cancelled' and new.status in ('refund_pending', 'refunded') then
    return new;
  end if;

  if old.status = 'refund_pending' and new.status = 'refunded' then
    return new;
  end if;

  if old.status = 'refunded' then
    raise exception 'booking status % is terminal and cannot transition to %', old.status, new.status;
  end if;

  raise exception 'invalid booking status transition: % -> %', old.status, new.status;
end;
$$ language plpgsql;
