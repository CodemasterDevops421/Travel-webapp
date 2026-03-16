create or replace function public.is_active_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = check_user_id
      and au.is_active = true
  );
$$;

grant execute on function public.is_active_admin(uuid) to authenticated;

alter table public.bookings enable row level security;
alter table public.booking_quotes enable row level security;
alter table public.booking_events enable row level security;
alter table public.payment_logs enable row level security;
alter table public.commission_tracking enable row level security;
alter table public.admin_users enable row level security;
alter table public.reviews_cache enable row level security;
alter table public.search_logs enable row level security;

drop policy if exists bookings_select_owner_or_admin on public.bookings;
create policy bookings_select_owner_or_admin
on public.bookings
for select
to authenticated
using (
  public.is_active_admin(auth.uid())
  or user_id = auth.uid()
  or lower(coalesce(metadata #>> '{holder,email}', '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists bookings_admin_write on public.bookings;
create policy bookings_admin_write
on public.bookings
for all
to authenticated
using (public.is_active_admin(auth.uid()))
with check (public.is_active_admin(auth.uid()));

drop policy if exists booking_quotes_admin_only on public.booking_quotes;
create policy booking_quotes_admin_only
on public.booking_quotes
for all
to authenticated
using (public.is_active_admin(auth.uid()))
with check (public.is_active_admin(auth.uid()));

drop policy if exists booking_events_admin_only on public.booking_events;
create policy booking_events_admin_only
on public.booking_events
for all
to authenticated
using (public.is_active_admin(auth.uid()))
with check (public.is_active_admin(auth.uid()));

drop policy if exists payment_logs_select_owner_or_admin on public.payment_logs;
create policy payment_logs_select_owner_or_admin
on public.payment_logs
for select
to authenticated
using (
  public.is_active_admin(auth.uid())
  or exists (
    select 1
    from public.bookings b
    where b.id = payment_logs.booking_id
      and (
        b.user_id = auth.uid()
        or lower(coalesce(b.metadata #>> '{holder,email}', '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
);

drop policy if exists payment_logs_admin_write on public.payment_logs;
create policy payment_logs_admin_write
on public.payment_logs
for all
to authenticated
using (public.is_active_admin(auth.uid()))
with check (public.is_active_admin(auth.uid()));

drop policy if exists commission_tracking_admin_only on public.commission_tracking;
create policy commission_tracking_admin_only
on public.commission_tracking
for all
to authenticated
using (public.is_active_admin(auth.uid()))
with check (public.is_active_admin(auth.uid()));

drop policy if exists admin_users_self_or_admin_select on public.admin_users;
create policy admin_users_self_or_admin_select
on public.admin_users
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_active_admin(auth.uid())
);

drop policy if exists admin_users_admin_write on public.admin_users;
create policy admin_users_admin_write
on public.admin_users
for all
to authenticated
using (public.is_active_admin(auth.uid()))
with check (public.is_active_admin(auth.uid()));

drop policy if exists reviews_cache_admin_only on public.reviews_cache;
create policy reviews_cache_admin_only
on public.reviews_cache
for all
to authenticated
using (public.is_active_admin(auth.uid()))
with check (public.is_active_admin(auth.uid()));

drop policy if exists search_logs_select_owner_or_admin on public.search_logs;
create policy search_logs_select_owner_or_admin
on public.search_logs
for select
to authenticated
using (
  public.is_active_admin(auth.uid())
  or user_id = auth.uid()
);

drop policy if exists search_logs_admin_write on public.search_logs;
create policy search_logs_admin_write
on public.search_logs
for all
to authenticated
using (public.is_active_admin(auth.uid()))
with check (public.is_active_admin(auth.uid()));
