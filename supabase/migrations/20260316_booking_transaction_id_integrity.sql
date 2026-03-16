alter table public.bookings
  add column if not exists transaction_id text;

update public.bookings
set transaction_id = metadata->>'transactionId'
where transaction_id is null
  and metadata ? 'transactionId';

create unique index if not exists bookings_transaction_id_unique_idx
  on public.bookings(transaction_id)
  where transaction_id is not null;

create index if not exists bookings_transaction_id_idx
  on public.bookings(transaction_id)
  where transaction_id is not null;
