-- OTA core persistence schema
-- booking quotes, bookings, and booking funnel/event logs

create extension if not exists pgcrypto;

create table if not exists public.booking_quotes (
  id uuid primary key default gen_random_uuid(),
  hotel_id text not null,
  room_id text not null,
  check_in date not null,
  check_out date not null,
  guests jsonb not null,
  total_amount numeric(12,2) not null,
  currency text not null,
  price_signature text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists booking_quotes_hotel_id_idx on public.booking_quotes(hotel_id);
create index if not exists booking_quotes_expires_at_idx on public.booking_quotes(expires_at);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references public.booking_quotes(id) on delete set null,
  liteapi_booking_id text,
  status text not null,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists bookings_liteapi_booking_id_uidx
  on public.bookings(liteapi_booking_id)
  where liteapi_booking_id is not null;

create index if not exists bookings_status_idx on public.bookings(status);
create index if not exists bookings_metadata_gin_idx on public.bookings using gin(metadata);

create table if not exists public.booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  event_name text not null,
  funnel_step text,
  properties jsonb,
  correlation_id text,
  client_ip text,
  occurred_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists booking_events_event_name_idx on public.booking_events(event_name);
create index if not exists booking_events_occurred_at_idx on public.booking_events(occurred_at desc);
create index if not exists booking_events_booking_id_idx on public.booking_events(booking_id);

create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

create trigger trg_bookings_updated_at
  before update on public.bookings
  for each row
  execute function public.set_updated_at();
