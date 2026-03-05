alter table public.blog_events
  add column if not exists cta_variant text null check (cta_variant is null or cta_variant in ('control', 'variant_a', 'variant_b')),
  add column if not exists cta_intent text null check (cta_intent is null or cta_intent in ('book_now', 'explore_hotels', 'discover_destination'));

create index if not exists blog_events_cta_variant_idx on public.blog_events(cta_variant);
create index if not exists blog_events_cta_intent_idx on public.blog_events(cta_intent);
