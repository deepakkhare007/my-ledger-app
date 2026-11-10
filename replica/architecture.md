# Architecture: (unnamed yet) — a rebuild of Khatabook's ledger core, plus a Vyapar-style GST invoicing v2

Built from `replica/recon.md` (17 screens, 7 flows, 9 entities) and `replica/features.csv`
(31 rows). User constraints for this plan: Android/PWA-first, offline-first with sync,
Hindi + English only, cheap to host, Razorpay/UPI instead of Stripe, official WhatsApp
Business Cloud API for reminders.

## Stack

| layer | choice | why |
| --- | --- | --- |
| web app | Next.js (App Router) + TypeScript | one codebase serves both the installable Android PWA and desktop; API routes double as the backend, so there's no separate server to host |
| PWA layer | Serwist (actively-maintained Workbox wrapper) + web app manifest | installable "Add to Home Screen" on Android, app-shell caching so the shell loads with zero network; `next-pwa` is effectively unmaintained, Serwist is its replacement |
| offline storage | Dexie.js (IndexedDB) on the client, mirroring the server schema | every write (add customer, add transaction) lands here first, instantly, with no network round trip — this is the #1 fix-plan item from `fixes.md` (15 reviews on lag/sync) |
| sync | custom pull/push sync (below), not a hosted sync vendor (PowerSync, ElectricSQL) | those vendors are built for exactly this kind of app, but they add a recurring cost; a client-UUID outbox + last-write-wins is enough for one shopkeeper on 1-2 devices and keeps hosting at $0 |
| styling | Tailwind, tokens from replica-design (not yet run) | |
| database | Postgres on Supabase (free tier) | free tier covers Postgres + Auth (with phone/OTP) + Storage + Edge Functions + pg_cron in one bill — fewer vendors than stitching Neon + a separate auth provider + R2 |
| ORM | Drizzle | lightweight, typed, and its schema can be the single source of truth for both the server tables and the Dexie client schema (shared TS types) |
| auth | Supabase Auth, phone number + OTP | matches the recon's confirmed sign-in flow (S01); Supabase supports an SMS OTP provider (MSG91 is the cheapest India-first option to wire in) |
| payments | Razorpay Payment Links API (UPI/cards) | swapped in per your instruction; used only for the payment-*request* flow (F04 — generating a shareable UPI link), never for settlement/collection, which stays out of scope per recon |
| messaging | WhatsApp Business Cloud API (official Meta API) for reminders, SMS (MSG91) as fallback | your instruction; "official" matters because it needs Meta Business verification and approved templates, not a BSP middleman — covered under "parts that bite" below |
| jobs | Supabase Edge Functions on pg_cron | free-tier scheduled functions; avoids Inngest/Trigger.dev's recurring cost for what is just "check due reminders every 15 minutes" |
| files | Supabase Storage | bill photos, generated PDF statements/invoices |
| hosting | Vercel (free tier) for the app, Supabase (free tier) for everything else | $0 at low scale, the standard Next.js + Supabase pairing, nothing exotic |
| i18n | `next-intl`, Hindi + English only | Khatabook ships 11 languages (recon S13); you've scoped this down to 2, which also cuts the localization-content cost flagged as a risk in the recon's sizing |
| native wrapper (later, optional) | Capacitor around the same PWA | if you want a Play Store APK later without a rewrite — not needed for v1 since the PWA installs directly on Android |

## Schema

Tables: 9 (6 v1 ledger + 3 v2 invoicing). Access rules: **Postgres Row Level Security on
Supabase** — every table's policy walks up to `khata_books.owner_id = auth.uid()`, so a
compromised or buggy query can't leak another shopkeeper's book. See `replica/schema.sql`
for the full file; the key parts:

```sql
-- Every row a client creates offline carries its own id, generated client-side,
-- so a retried sync push is a no-op, not a duplicate.
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
  id uuid primary key default gen_random_uuid(),  -- client-generated; also the idempotency key for sync
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

-- v2: GST invoicing (modeled on Vyapar's own guide, see recon.md — not a Khatabook feature)

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
```

Full file: `replica/schema.sql`.

## API

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| POST /api/auth/otp/request | sends a sign-in OTP to a phone number | anyone | `{phone_number}` | `{sent: true}` | S01 |
| POST /api/auth/otp/verify | verifies OTP, creates session + default khata book on first login | anyone with a valid OTP | `{phone_number, otp}` | `{session, khata_book_id}` | S01 |
| POST /api/sync/pull | returns every row changed since the client's last cursor, scoped to one khata book | signed-in owner of that book | `{khata_book_id, since: timestamptz}` | `{customers[], transactions[], reminders[], inventory_items[], parties[], invoices[], invoice_lines[], server_time}` | F01-F07 (the read side of every flow) |
| POST /api/sync/push | upserts a batch of client-generated rows; idempotent by row id | signed-in owner | `{khata_book_id, changes: {table: row[]}}` | `{accepted: id[], conflicts: {id, server_row}[]}` | F01-F07 (the write side) |
| POST /api/khata-books | creates an additional business/personal book | signed-in user | `{business_name, book_type}` | `{khata_book_id}` | F06 |
| GET /api/khata-books | lists the user's books for the switcher | signed-in user | — | `{khata_books[]}` | F06, S08 |
| POST /api/reminders/:id/send | dispatches one reminder now via WhatsApp (falls back to SMS) | signed-in owner | — | `{status}` | F03 |
| POST /api/payments/request-link | creates a Razorpay Payment Link for one customer's balance | signed-in owner | `{customer_id, amount_cents}` | `{short_url, razorpay_payment_link_id}` | F04 |
| POST /api/webhooks/razorpay | Razorpay → us: marks a reminder/transaction paid | Razorpay (signature-verified) | Razorpay payload | `200` | F04 |
| POST /api/webhooks/whatsapp | Meta → us: delivery/read status, and inbound replies (opt-out keywords) | Meta (signature-verified) | Meta payload | `200` | F03 |
| GET /api/customers/:id/report | generates a PDF statement for a date range, stores it, returns a signed URL | signed-in owner | `?from&to` | `{pdf_url}` | F05 |
| POST /api/invoices | creates a GST/non-GST invoice, computes tax type server-side | signed-in owner (v2) | `{party_id, invoice_type, lines[]}` | `{invoice_id, pdf_url}` | F07 |
| GET /api/invoices/:id/pdf | re-fetches a generated invoice PDF | signed-in owner (v2) | — | `{pdf_url}` | F07 |

Webhooks in: Razorpay (`payment.captured`, `payment.failed`), WhatsApp Cloud API (message
status callbacks, inbound messages).
Webhooks out: none — nothing here integrates outward into another product's calendar or
feed the way the original's loan/QR partners might.

Jobs (Supabase Edge Function + pg_cron):
- `reminder-dispatch` — every 15 min; finds `reminders` where `status = 'pending'` and
  `scheduled_for <= now()`, calls the WhatsApp send (or SMS fallback), updates status.
- `payment-link-expiry` — daily; expires stale Razorpay payment links past their validity
  window so a customer can't pay a months-old, outdated balance.
- `weekly-user-export` — optional, weekly; nothing *required* here since Supabase does
  infra-level backups, but a separate user-facing "download my data" export (the `fixes.md`
  "your data is yours" promise) is its own on-demand route, not a cron job — listed here
  only so it isn't forgotten during build order.

## The parts that bite

- **Offline conflict resolution.** Last-write-wins by `updated_at`, and every row's `id` is
  generated on the client, so a retried `sync/push` after a dropped connection is a no-op
  upsert, not a duplicate transaction. This is deliberately simple because the real-world
  conflict case — one shopkeeper, one or two devices, rarely editing the same row within the
  same minute — doesn't need a CRDT. If you ever add multi-staff editing of one book, revisit
  this; LWW silently drops the loser's edit.
- **Idempotency.** Both webhook endpoints (Razorpay, WhatsApp) must dedupe by the provider's
  own event/message id before acting — both providers redeliver on timeout. `sync/push` is
  idempotent by construction (client UUIDs), which also means a flaky mobile network can
  retry freely without an "are you sure" dialog.
- **Races.** Two devices on the same khata book adding a transaction at the same instant:
  harmless, both are separate rows with their own ids. The one real race is **invoice
  numbering** (v2) — never compute the next number with `max(invoice_number) + 1`, which
  loses under concurrent inserts; use a `khata_book`-scoped Postgres sequence or an advisory
  lock around the insert.
- **WhatsApp rate limits and approval.** The official Cloud API gates new senders into a
  messaging tier (starts around 250 conversations/day) that only expands with usage history,
  and template messages need Meta's category approval ("utility" for payment reminders, which
  is cheaper and doesn't need a 24-hour open session). Budget for an approval lead time
  before launch, and keep SMS as a real fallback, not a stub — this is the most likely thing
  to delay the F03 flow in practice.
- **The no-loan, no-unwanted-calls promise is an architectural constraint, not just
  marketing.** `fixes.md`'s #1 recommended angle is "a khata that only keeps your khata."
  That means: no SMS/contacts-read permission beyond what a reminder flow needs, a one-tap
  WhatsApp opt-out handled in the `webhooks/whatsapp` inbound handler on day one (not
  "later"), and never building the Loan Khata / outbound-sales-call surface the recon marked
  out of scope. Worth stating here because it's easy to accidentally reintroduce via a
  "growth" feature later.
- **Rate limits / file size.** Compress bill photos client-side before upload (cap ~1MB);
  Supabase Storage's free tier has a total-size ceiling worth watching as photo volume grows.
- **Search.** Customer search by name is a simple indexed `ILIKE` — no need for a search
  engine at this scale.
- **Realtime.** Not required for a solo shopkeeper, but a cheap win: Supabase Realtime can
  push a "this book changed" signal to a second device so it pulls sooner, instead of polling
  on a timer.
- **Email deliverability.** Not used anywhere in this design — there's no email login or
  email-based flow, so there's no vendor to pick here, which is one fewer moving part.
- **Multi-tenancy.** Enforced entirely by RLS keyed off `khata_books.owner_id`; no
  cross-tenant sharing exists in v1.
- **Data protection / deletion.** India's DPDP Act (2023) is the relevant law here, not
  GDPR. Ship a real "export everything" and "delete my khata book" flow from the start — this
  is also the `fixes.md` fix-plan item that directly answers Khatabook's reviewed complaint
  about paywalled export.

## Build order

1. **Vertical slice.** Phone+OTP sign-in (S01) → default khata book auto-created on first
   login → customer list (S02, empty state) → add customer (S03) → customer ledger (S04) →
   add a transaction (S05), written to Dexie first and synced in the background.
   Tables: `users`, `khata_books`, `customers`, `transactions`. Routes: `auth/otp/request`,
   `auth/otp/verify`, `sync/pull`, `sync/push`. This alone proves the offline-first stack
   end to end — the hardest part of the whole build, done first on purpose.

2. **Must-haves** (from `features.csv`): photo attachment on a transaction; WhatsApp/SMS
   reminder with the opt-out handler (S07, F03); PDF customer statement, kept free (S06, F05);
   app-lock PIN (S12, client-side only — no server round trip needed); harden the offline
   sync from step 1 (retry queue, conflict surfacing in the UI). Tables: `reminders`. Routes:
   `reminders/:id/send`, `webhooks/whatsapp`, `customers/:id/report`.

3. **Should-haves**: multiple khata books and the switcher (S08, F06); Razorpay payment-
   request link (F04); payment-mode field per transaction; bill-level tracking fields;
   business card generator (S09); inventory list with low-stock alerts (S14). Tables:
   `inventory_items`. Routes: `khata-books` (POST/GET), `payments/request-link`,
   `webhooks/razorpay`.

4. **Could-haves**: Hindi/English toggle (S13, 2 languages only per your scope, not
   Khatabook's 11); profit/loss and cash-vs-online report (S15, and get the math right —
   reviewers flag Khatabook's own P&L as wrong in `fixes.md`); exclude-from-totals flag;
   move a customer between books.

5. **v2 — GST invoicing**, kept a separate phase as the recon recommends: party profiles
   with GSTIN+state (S17); invoice creation with the CGST+SGST-vs-IGST logic (S16, F07);
   invoice numbering via a scoped sequence (not `max()+1`); PDF/share. Tables: `parties`,
   `invoices`, `invoice_lines`. Routes: `invoices` (POST), `invoices/:id/pdf`.

6. **Fixes from replica-entrepreneur** (already run — see `fixes.md`), folded in above
   rather than listed separately: the no-loan/no-calls promise is steps 1-2 (architecture,
   not a feature to add later); offline-first is step 1 itself; "never block reading the
   ledger" means update prompts are a soft banner, never a login gate, in every step's UI
   work; payment mode and bill-level tracking are in step 3; free export/backup is in step 2;
   same-day Android/iOS/desktop parity falls out of the PWA choice for free, with no separate
   iOS codebase to fall behind.

Next step: `/replica-design`.
