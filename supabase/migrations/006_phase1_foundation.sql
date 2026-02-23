-- Phase 1 foundation: canonical persistence for platform/security baseline

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  loyalty_tier text not null default 'starter',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles
  add column if not exists full_name text,
  add column if not exists loyalty_tier text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table public.profiles
  alter column loyalty_tier set default 'starter',
  alter column created_at set default timezone('utc', now()),
  alter column updated_at set default timezone('utc', now());

update public.profiles
set loyalty_tier = coalesce(nullif(loyalty_tier, ''), 'starter')
where loyalty_tier is null or loyalty_tier = '';

update public.profiles
set created_at = timezone('utc', now())
where created_at is null;

update public.profiles
set updated_at = timezone('utc', now())
where updated_at is null;

alter table public.profiles
  alter column loyalty_tier set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

create index if not exists profiles_loyalty_tier_idx on public.profiles(loyalty_tier);
create index if not exists profiles_created_at_idx on public.profiles(created_at desc);

create table if not exists public.saved_hotels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hotel_id text not null,
  hotel_name text,
  hotel_image text,
  star_rating integer,
  city text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(user_id, hotel_id)
);

alter table public.saved_hotels
  add column if not exists hotel_name text,
  add column if not exists hotel_image text,
  add column if not exists star_rating integer,
  add column if not exists city text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table public.saved_hotels
  alter column created_at set default timezone('utc', now()),
  alter column updated_at set default timezone('utc', now());

update public.saved_hotels
set created_at = timezone('utc', now())
where created_at is null;

update public.saved_hotels
set updated_at = timezone('utc', now())
where updated_at is null;

alter table public.saved_hotels
  alter column created_at set not null,
  alter column updated_at set not null;

create index if not exists saved_hotels_user_created_idx on public.saved_hotels(user_id, created_at desc);
create index if not exists saved_hotels_hotel_idx on public.saved_hotels(hotel_id);

alter table public.booking_quotes
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists correlation_id text,
  add column if not exists created_at timestamptz;

alter table public.booking_quotes
  alter column created_at set default timezone('utc', now());

update public.booking_quotes
set created_at = timezone('utc', now())
where created_at is null;

alter table public.booking_quotes
  alter column created_at set not null;

create index if not exists booking_quotes_user_created_idx on public.booking_quotes(user_id, created_at desc);
create index if not exists booking_quotes_correlation_id_idx on public.booking_quotes(correlation_id);

create table if not exists public.search_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  correlation_id text not null,
  query_text text,
  destination text,
  check_in date,
  check_out date,
  guests jsonb,
  filters jsonb,
  result_count integer,
  degraded boolean not null default false,
  booking_quote_id uuid references public.booking_quotes(id) on delete set null,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.search_logs
  add column if not exists booking_quote_id uuid references public.booking_quotes(id) on delete set null,
  add column if not exists created_at timestamptz,
  add column if not exists degraded boolean;

alter table public.search_logs
  alter column created_at set default timezone('utc', now()),
  alter column degraded set default false;

update public.search_logs
set created_at = timezone('utc', now())
where created_at is null;

update public.search_logs
set degraded = false
where degraded is null;

alter table public.search_logs
  alter column created_at set not null,
  alter column degraded set not null;

create index if not exists search_logs_created_idx on public.search_logs(created_at desc);
create index if not exists search_logs_user_created_idx on public.search_logs(user_id, created_at desc);
create index if not exists search_logs_correlation_id_idx on public.search_logs(correlation_id);
create index if not exists search_logs_booking_quote_idx on public.search_logs(booking_quote_id);

alter table public.bookings
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists hotel_id text,
  add column if not exists room_id text,
  add column if not exists check_in date,
  add column if not exists check_out date,
  add column if not exists total_amount numeric,
  add column if not exists currency text,
  add column if not exists commission_amount numeric,
  add column if not exists payment_status text,
  add column if not exists confirmation_code text,
  add column if not exists correlation_id text,
  add column if not exists search_log_id uuid references public.search_logs(id) on delete set null,
  add column if not exists latest_payment_log_id uuid;

alter table public.bookings
  alter column payment_status set default 'pending';

update public.bookings
set payment_status = 'pending'
where payment_status is null;

create index if not exists bookings_user_created_idx on public.bookings(user_id, created_at desc);
create index if not exists bookings_status_created_idx on public.bookings(status, created_at desc);
create index if not exists bookings_liteapi_booking_id_idx on public.bookings(liteapi_booking_id);
create index if not exists bookings_quote_id_idx on public.bookings(quote_id);
create index if not exists bookings_payment_status_idx on public.bookings(payment_status);
create index if not exists bookings_search_log_id_idx on public.bookings(search_log_id);
create index if not exists bookings_correlation_id_idx on public.bookings(correlation_id);

create table if not exists public.payment_logs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  provider text not null default 'stripe',
  external_payment_id text,
  event_type text not null,
  status text not null,
  amount numeric,
  currency text,
  correlation_id text,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.payment_logs
  add column if not exists correlation_id text,
  add column if not exists created_at timestamptz;

alter table public.payment_logs
  alter column created_at set default timezone('utc', now());

update public.payment_logs
set created_at = timezone('utc', now())
where created_at is null;

alter table public.payment_logs
  alter column created_at set not null;

create index if not exists payment_logs_booking_created_idx on public.payment_logs(booking_id, created_at desc);
create index if not exists payment_logs_status_created_idx on public.payment_logs(status, created_at desc);
create index if not exists payment_logs_external_payment_id_idx on public.payment_logs(external_payment_id);
create index if not exists payment_logs_correlation_id_idx on public.payment_logs(correlation_id);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.admin_users
  add column if not exists role text,
  add column if not exists is_active boolean,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table public.admin_users
  alter column role set default 'admin',
  alter column is_active set default true,
  alter column created_at set default timezone('utc', now()),
  alter column updated_at set default timezone('utc', now());

update public.admin_users
set role = coalesce(nullif(role, ''), 'admin')
where role is null or role = '';

update public.admin_users
set is_active = true
where is_active is null;

update public.admin_users
set created_at = timezone('utc', now())
where created_at is null;

update public.admin_users
set updated_at = timezone('utc', now())
where updated_at is null;

alter table public.admin_users
  alter column role set not null,
  alter column is_active set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

create index if not exists admin_users_role_idx on public.admin_users(role);
create index if not exists admin_users_active_idx on public.admin_users(is_active);

create table if not exists public.commission_tracking (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  payment_log_id uuid references public.payment_logs(id) on delete set null,
  gross_booking_value numeric not null,
  commission_percent numeric not null,
  commission_amount numeric not null,
  currency text not null,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(booking_id)
);

alter table public.commission_tracking
  add column if not exists payment_log_id uuid references public.payment_logs(id) on delete set null,
  add column if not exists metadata jsonb,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table public.commission_tracking
  alter column created_at set default timezone('utc', now()),
  alter column updated_at set default timezone('utc', now());

update public.commission_tracking
set created_at = timezone('utc', now())
where created_at is null;

update public.commission_tracking
set updated_at = timezone('utc', now())
where updated_at is null;

alter table public.commission_tracking
  alter column created_at set not null,
  alter column updated_at set not null;

create index if not exists commission_tracking_created_idx on public.commission_tracking(created_at desc);
create index if not exists commission_tracking_payment_log_idx on public.commission_tracking(payment_log_id);

create table if not exists public.reviews_cache (
  hotel_id text primary key,
  payload jsonb not null,
  source text not null default 'liteapi',
  fetched_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.reviews_cache
  add column if not exists source text,
  add column if not exists fetched_at timestamptz,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table public.reviews_cache
  alter column source set default 'liteapi',
  alter column fetched_at set default timezone('utc', now()),
  alter column created_at set default timezone('utc', now()),
  alter column updated_at set default timezone('utc', now());

update public.reviews_cache
set source = coalesce(nullif(source, ''), 'liteapi')
where source is null or source = '';

update public.reviews_cache
set fetched_at = timezone('utc', now())
where fetched_at is null;

update public.reviews_cache
set created_at = timezone('utc', now())
where created_at is null;

update public.reviews_cache
set updated_at = timezone('utc', now())
where updated_at is null;

alter table public.reviews_cache
  alter column source set not null,
  alter column fetched_at set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

create index if not exists reviews_cache_expires_idx on public.reviews_cache(expires_at);
create index if not exists reviews_cache_fetched_idx on public.reviews_cache(fetched_at desc);

create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

drop trigger if exists trg_saved_hotels_updated_at on public.saved_hotels;
create trigger trg_saved_hotels_updated_at
  before update on public.saved_hotels
  for each row
  execute function public.set_updated_at();

drop trigger if exists trg_admin_users_updated_at on public.admin_users;
create trigger trg_admin_users_updated_at
  before update on public.admin_users
  for each row
  execute function public.set_updated_at();

drop trigger if exists trg_commission_tracking_updated_at on public.commission_tracking;
create trigger trg_commission_tracking_updated_at
  before update on public.commission_tracking
  for each row
  execute function public.set_updated_at();

drop trigger if exists trg_reviews_cache_updated_at on public.reviews_cache;
create trigger trg_reviews_cache_updated_at
  before update on public.reviews_cache
  for each row
  execute function public.set_updated_at();

alter table public.bookings
  drop constraint if exists bookings_latest_payment_log_id_fkey;

alter table public.bookings
  add constraint bookings_latest_payment_log_id_fkey
  foreign key (latest_payment_log_id) references public.payment_logs(id) on delete set null;
