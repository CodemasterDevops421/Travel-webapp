-- Phase 4 plan 01: booking lifecycle and idempotency backstops

alter table public.bookings
  add column if not exists stripe_payment_intent_id text,
  add column if not exists stripe_checkout_session_id text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_status_canonical_chk'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_status_canonical_chk
      check (status in ('pending', 'payment_authorized', 'confirmed', 'failed', 'refunded'));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_payment_status_canonical_chk'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_payment_status_canonical_chk
      check (payment_status is null or payment_status in ('pending', 'authorized', 'captured', 'failed', 'refunded'));
  end if;
end;
$$;

create unique index if not exists bookings_liteapi_booking_id_unique_idx
  on public.bookings(liteapi_booking_id)
  where liteapi_booking_id is not null;

create unique index if not exists bookings_stripe_payment_intent_id_unique_idx
  on public.bookings(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create unique index if not exists bookings_stripe_checkout_session_id_unique_idx
  on public.bookings(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create or replace function public.enforce_booking_lifecycle_transition()
returns trigger as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if old.status = new.status then
    return new;
  end if;

  if old.status = 'pending' and new.status in ('payment_authorized', 'failed') then
    return new;
  end if;

  if old.status = 'payment_authorized' and new.status in ('confirmed', 'failed', 'refunded') then
    return new;
  end if;

  if old.status = 'confirmed' and new.status = 'refunded' then
    return new;
  end if;

  if old.status in ('failed', 'refunded') then
    raise exception 'booking status % is terminal and cannot transition to %', old.status, new.status;
  end if;

  raise exception 'invalid booking status transition: % -> %', old.status, new.status;
end;
$$ language plpgsql;

drop trigger if exists trg_bookings_lifecycle_guard on public.bookings;
create trigger trg_bookings_lifecycle_guard
  before update of status on public.bookings
  for each row
  execute function public.enforce_booking_lifecycle_transition();
