create table if not exists public.blog_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (event_name in ('blog_list_view', 'blog_post_view', 'blog_search', 'blog_related_click', 'blog_cta_click')),
  slug text null,
  category text null,
  tag text null,
  position integer null check (position is null or position >= 0),
  referrer_path text not null,
  query text null,
  target_path text null,
  properties jsonb not null default '{}'::jsonb,
  correlation_id text not null,
  client_ip text not null default 'unknown',
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists blog_events_occurred_idx on public.blog_events(occurred_at desc);
create index if not exists blog_events_name_occurred_idx on public.blog_events(event_name, occurred_at desc);
create index if not exists blog_events_slug_idx on public.blog_events(slug);
create index if not exists blog_events_referrer_idx on public.blog_events(referrer_path);
