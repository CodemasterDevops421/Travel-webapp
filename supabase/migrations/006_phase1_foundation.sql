-- Phase 1 foundation: canonical persistence for platform/security baseline

alter table public.bookings
  add column if not exists hotel_id text,
  add column if not exists room_id text,
  add column if not exists check_in date,
  add column if not exists check_out date,
  add column if not exists total_amount numeric,
  add column if not exists commission_amount numeric,
  add column if not exists payment_status text default 'pending',
  add column if not exists confirmation_code text;

create index if not exists bookings_user_created_idx on public.bookings(user_id, created_at desc);
create index if not exists bookings_status_created_idx on public.bookings(status, created_at desc);
create index if not exists bookings_liteapi_booking_id_idx on public.bookings(liteapi_booking_id);

create table if not exists public.search_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  correlation_id text not null,
  query_text text,
  destination text,
  check_in date,
  check_out date,
  guests jsonb,
  filters jsonb,
  result_count integer,
  degraded boolean default false,
  metadata jsonb,
  created_at timestamptz default now()
);

create index if not exists search_logs_created_idx on public.search_logs(created_at desc);
create index if not exists search_logs_user_created_idx on public.search_logs(user_id, created_at desc);

create table if not exists public.payment_logs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  provider text not null default 'stripe',
  external_payment_id text,
  event_type text not null,
  status text not null,
  amount numeric,
  currency text,
  metadata jsonb,
  created_at timestamptz default now()
);

create index if not exists payment_logs_booking_created_idx on public.payment_logs(booking_id, created_at desc);
create index if not exists payment_logs_status_created_idx on public.payment_logs(status, created_at desc);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.commission_tracking (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  gross_booking_value numeric not null,
  commission_percent numeric not null,
  commission_amount numeric not null,
  currency text not null,
  created_at timestamptz default now(),
  unique(booking_id)
);

create index if not exists commission_tracking_created_idx on public.commission_tracking(created_at desc);

create table if not exists public.reviews_cache (
  hotel_id text primary key,
  payload jsonb not null,
  source text default 'liteapi',
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists reviews_cache_expires_idx on public.reviews_cache(expires_at);
