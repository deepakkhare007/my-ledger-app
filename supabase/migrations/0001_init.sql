-- Initial schema + RLS for the Khatabook-core ledger clone.
-- Adapted from replica/schema.sql: the standalone "users" table is replaced
-- by a "profiles" table keyed 1:1 to Supabase's own auth.users, since
-- Supabase Auth (phone + OTP) already owns identity and phone_number.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles: one row per Supabase auth user, created by the trigger below.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  language text not null default 'hi' check (language in ('hi', 'en')),
  pin_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.khata_books (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  business_name text not null,
  book_type text not null default 'business' check (book_type in ('business', 'personal')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on public.khata_books (owner_id);

create table public.customers (
  id uuid primary key default gen_random_uuid(), -- client-generated when created offline
  khata_book_id uuid not null references public.khata_books(id) on delete cascade,
  name text not null,
  phone_number text,
  photo_url text,
  gstin text, -- v2
  state text, -- v2
  -- Set by the WhatsApp webhook when this number replies STOP/UNSUBSCRIBE.
  -- Checked before every WhatsApp send — see src/lib/reminders.ts and
  -- replica/architecture.md's "no-loan, no-unwanted-calls" constraint.
  whatsapp_opt_out boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on public.customers (khata_book_id);
create index on public.customers (phone_number);

create table public.transactions (
  id uuid primary key default gen_random_uuid(), -- client-generated; also the sync idempotency key
  khata_book_id uuid not null references public.khata_books(id) on delete cascade, -- denormalized for RLS + query without a join
  customer_id uuid not null references public.customers(id) on delete cascade,
  type text not null check (type in ('you_gave', 'you_got')),
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'INR',
  payment_mode text check (payment_mode in ('cash', 'upi', 'bank', 'other')),
  note text,
  photo_url text,
  transaction_date date not null,
  client_created_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on public.transactions (customer_id, transaction_date);
create index on public.transactions (khata_book_id);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  khata_book_id uuid not null references public.khata_books(id) on delete cascade, -- denormalized for RLS, same reasoning as transactions
  customer_id uuid not null references public.customers(id) on delete cascade,
  scheduled_for timestamptz not null,
  channel text not null check (channel in ('whatsapp', 'sms', 'upi_link')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'paid')),
  razorpay_payment_link_id text,
  whatsapp_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.reminders (status, scheduled_for);
create index on public.reminders (khata_book_id);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  khata_book_id uuid not null references public.khata_books(id) on delete cascade,
  name text not null,
  unit text not null default 'pcs',
  quantity_on_hand numeric not null default 0,
  low_stock_threshold numeric,
  default_gst_rate numeric, -- v2
  hsn_code text, -- v2
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on public.inventory_items (khata_book_id);

-- v2: GST invoicing (modeled on Vyapar's own public guide, see recon.md)

create table public.parties (
  id uuid primary key default gen_random_uuid(),
  khata_book_id uuid not null references public.khata_books(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  gstin text,
  state text not null,
  is_gst_registered boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.parties (khata_book_id);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  khata_book_id uuid not null references public.khata_books(id) on delete cascade,
  party_id uuid not null references public.parties(id) on delete restrict,
  invoice_type text not null check (invoice_type in ('tax_invoice', 'bill_of_supply')),
  invoice_number text not null,
  invoice_date date not null,
  place_of_supply text not null,
  subtotal_cents bigint not null,
  discount_cents bigint not null default 0,
  additional_charges_cents bigint not null default 0,
  cgst_cents bigint not null default 0,
  sgst_cents bigint not null default 0,
  igst_cents bigint not null default 0,
  total_cents bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (khata_book_id, invoice_number)
);
create index on public.invoices (khata_book_id, invoice_date);

-- Per-khata-book invoice number sequence. One Postgres sequence can't be
-- created per-row dynamically in a migration, so a small counter table plus
-- `select ... for update` in application code (see src/lib/invoices.ts, v2)
-- avoids the `max(invoice_number) + 1` race replica/architecture.md warns about.
create table public.invoice_counters (
  khata_book_id uuid primary key references public.khata_books(id) on delete cascade,
  next_number integer not null default 1
);

create table public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  description text not null,
  hsn_sac_code text,
  quantity numeric not null,
  unit_price_cents bigint not null,
  gst_rate numeric not null default 0,
  discount_cents bigint not null default 0,
  line_total_cents bigint not null
);
create index on public.invoice_lines (invoice_id);

-- ---------------------------------------------------------------------------
-- New-user bootstrap: a profile row plus a default khata book, the moment
-- someone first completes phone+OTP sign-in. Keeps "create default book on
-- first login" out of application code and race-free.
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.khata_books (owner_id, business_name)
    values (new.id, 'My Shop');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security. One helper per ownership shape (per skill guidance:
-- "one function that answers can this user do this to this record"),
-- SECURITY DEFINER so it can read khata_books regardless of the caller's own
-- RLS visibility, STABLE so Postgres can cache it within a statement.
-- ---------------------------------------------------------------------------
create function public.owns_khata_book(book_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.khata_books
    where id = book_id and owner_id = auth.uid()
  );
$$;

create function public.owns_invoice(target_invoice_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.invoices
    where id = target_invoice_id and public.owns_khata_book(khata_book_id)
  );
$$;

alter table public.profiles enable row level security;
alter table public.khata_books enable row level security;
alter table public.customers enable row level security;
alter table public.transactions enable row level security;
alter table public.reminders enable row level security;
alter table public.inventory_items enable row level security;
alter table public.parties enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_counters enable row level security;
alter table public.invoice_lines enable row level security;

create policy "profiles: self only" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "khata_books: owner only" on public.khata_books
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "customers: via owned book" on public.customers
  for all using (public.owns_khata_book(khata_book_id))
  with check (public.owns_khata_book(khata_book_id));

create policy "transactions: via owned book" on public.transactions
  for all using (public.owns_khata_book(khata_book_id))
  with check (public.owns_khata_book(khata_book_id));

create policy "reminders: via owned book" on public.reminders
  for all using (public.owns_khata_book(khata_book_id))
  with check (public.owns_khata_book(khata_book_id));

create policy "inventory_items: via owned book" on public.inventory_items
  for all using (public.owns_khata_book(khata_book_id))
  with check (public.owns_khata_book(khata_book_id));

create policy "parties: via owned book" on public.parties
  for all using (public.owns_khata_book(khata_book_id))
  with check (public.owns_khata_book(khata_book_id));

create policy "invoices: via owned book" on public.invoices
  for all using (public.owns_khata_book(khata_book_id))
  with check (public.owns_khata_book(khata_book_id));

create policy "invoice_counters: via owned book" on public.invoice_counters
  for all using (public.owns_khata_book(khata_book_id))
  with check (public.owns_khata_book(khata_book_id));

create policy "invoice_lines: via owned invoice" on public.invoice_lines
  for all using (public.owns_invoice(invoice_id))
  with check (public.owns_invoice(invoice_id));

-- Webhook handlers (Razorpay, WhatsApp) and the reminder-dispatch job run
-- with the service-role key, which bypasses RLS entirely by design — see
-- src/lib/supabase/admin.ts. No separate "service" policies are needed.
