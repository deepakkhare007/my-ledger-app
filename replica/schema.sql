-- Schema for the Khatabook-core clone (see replica/architecture.md for the why).
-- Target: Postgres on Supabase. Access control: Row Level Security, policies keyed
-- off khata_books.owner_id = auth.uid() (write once these tables exist; not included
-- here since policy wording depends on the final Supabase Auth setup in replica-backend).

create extension if not exists pgcrypto;

create table users (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null unique,
  display_name text,
  language text not null default 'hi' check (language in ('hi', 'en')),
  pin_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table khata_books (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  business_name text not null,
  book_type text not null default 'business' check (book_type in ('business', 'personal')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on khata_books (owner_id);

create table customers (
  id uuid primary key default gen_random_uuid(),  -- client-generated when created offline
  khata_book_id uuid not null references khata_books(id) on delete cascade,
  name text not null,
  phone_number text,
  photo_url text,
  gstin text,               -- v2
  state text,                -- v2
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on customers (khata_book_id);

create table transactions (
  id uuid primary key default gen_random_uuid(),  -- client-generated; also the sync idempotency key
  khata_book_id uuid not null references khata_books(id) on delete cascade,  -- denormalized for RLS + query without a join
  customer_id uuid not null references customers(id) on delete cascade,
  type text not null check (type in ('you_gave', 'you_got')),
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'INR',
  payment_mode text check (payment_mode in ('cash', 'upi', 'bank', 'other')),
  note text,
  photo_url text,
  transaction_date date not null,
  client_created_at timestamptz not null,  -- when the shopkeeper actually tapped Save, offline or not
  created_at timestamptz not null default now(),  -- when the server first saw it
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on transactions (customer_id, transaction_date);
create index on transactions (khata_book_id);

create table reminders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  scheduled_for timestamptz not null,
  channel text not null check (channel in ('whatsapp', 'sms', 'upi_link')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'paid')),
  razorpay_payment_link_id text,
  whatsapp_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on reminders (status, scheduled_for);

create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  khata_book_id uuid not null references khata_books(id) on delete cascade,
  name text not null,
  unit text not null default 'pcs',
  quantity_on_hand numeric not null default 0,
  low_stock_threshold numeric,
  default_gst_rate numeric,  -- v2
  hsn_code text,              -- v2
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on inventory_items (khata_book_id);

-- v2: GST invoicing (modeled on Vyapar's own public guide, see recon.md — not a Khatabook feature)

create table parties (
  id uuid primary key default gen_random_uuid(),
  khata_book_id uuid not null references khata_books(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  gstin text,
  state text not null,
  is_gst_registered boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on parties (khata_book_id);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  khata_book_id uuid not null references khata_books(id) on delete cascade,
  party_id uuid not null references parties(id) on delete restrict,  -- never silently orphan a tax document
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
create index on invoices (khata_book_id, invoice_date);

-- Invoice numbering: never `select max(invoice_number) + 1` under concurrent inserts.
-- Use a per-khata-book sequence (created lazily in application code, e.g. one Postgres
-- sequence named 'invoice_seq_' || khata_book_id, or a `select ... for update` on a
-- small `invoice_counters` row) when replica-backend wires up invoice creation.

create table invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  inventory_item_id uuid references inventory_items(id) on delete set null,
  description text not null,
  hsn_sac_code text,
  quantity numeric not null,
  unit_price_cents bigint not null,
  gst_rate numeric not null default 0,
  discount_cents bigint not null default 0,
  line_total_cents bigint not null
);
create index on invoice_lines (invoice_id);
