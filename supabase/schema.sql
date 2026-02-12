create table if not exists public.profiles (
  id uuid primary key references auth.users(id),
  full_name text,
  loyalty_tier text default 'starter',
  created_at timestamptz default now()
);

create table if not exists public.booking_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  hotel_id text not null,
  room_id text not null,
  check_in date not null,
  check_out date not null,
  guests jsonb not null,
  total_amount integer not null,
  currency text not null,
  price_signature text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  liteapi_booking_id text unique,
  status text not null,
  quote_id uuid references public.booking_quotes(id),
  receipt_url text,
  metadata jsonb,
  created_at timestamptz default now()
);
