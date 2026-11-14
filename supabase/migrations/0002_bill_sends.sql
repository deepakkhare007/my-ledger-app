-- Bill-send log: one row per "Send bill" tap on a transaction (manual, not
-- automatic — see replica/architecture.md). Separate from `reminders`
-- because a reminder asks the customer to pay something outstanding, while
-- a bill is a receipt of what was just recorded; they can both exist for
-- the same transaction and shouldn't share one status column.

create table public.bill_sends (
  id uuid primary key default gen_random_uuid(),
  khata_book_id uuid not null references public.khata_books(id) on delete cascade, -- denormalized for RLS, same reasoning as transactions/reminders
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'sms')),
  status text not null check (status in ('sent', 'failed')),
  error text,
  provider_message_id text,
  created_at timestamptz not null default now()
);
create index on public.bill_sends (transaction_id);
create index on public.bill_sends (khata_book_id);

alter table public.bill_sends enable row level security;

create policy "bill_sends: via owned book" on public.bill_sends
  for all using (public.owns_khata_book(khata_book_id))
  with check (public.owns_khata_book(khata_book_id));
