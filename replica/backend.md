# Backend

Reads `replica/architecture.md`. Writes migrations and server code under
`src/lib/`, `supabase/`, `src/app/api/`. This file is the checklist and
setup guide — re-read it before `/replica-deploy`.

## Stack actually wired up

- **Database + Auth + Storage**: Supabase. **Local development runs it
  self-hosted in Docker Desktop** via the Supabase CLI (`npm run db:start`),
  not a hosted project — see "Local setup" below. Production hosting
  (hosted Supabase vs. self-hosting the same Docker stack on your own
  server) is still an open decision for `/replica-deploy`; nothing here
  assumes one or the other, since the client code just points at whatever
  `NEXT_PUBLIC_SUPABASE_URL` says.
- **Payments**: Razorpay Payment Links (test mode keys until `/replica-deploy`).
- **Messaging**: WhatsApp Business Cloud API (official Meta API) with SMS
  (MSG91) as a fallback.
- **Jobs**: a Supabase Edge Function (`supabase/functions/reminder-dispatch`)
  on pg_cron, per architecture.md.

## Local setup (Docker Desktop)

1. Have Docker Desktop running.
2. `npm run db:start` — pulls and starts Postgres, GoTrue (auth), Storage,
   Realtime, and Studio as containers (first run downloads images, can take
   a few minutes). Applies every file in `supabase/migrations/` and then
   `supabase/seed.sql`.
3. The command's own output prints your local `API URL`, `anon key`, and
   `service_role key` — copy those into `.env.local` (see `.env.example`
   for the variable names). These are fixed, well-known local-dev values
   (not secrets) that the CLI regenerates identically every `db:start`.
4. Phone sign-in needs no real SMS provider locally: `supabase/config.toml`
   sets a fixed test OTP (`123456`) for the seeded phone number
   (`+910000000001`) under `[auth.sms.test_otp]`. Sign in with that number
   and that code. For a different phone number, Studio's own Auth panel
   (`http://127.0.1:54323`, the port from `supabase status`) can read the
   real OTP from the local email/SMS test inbox... actually SMS has no test
   inbox the way email does — add more `[auth.sms.test_otp]` entries for
   any other numbers you want to sign in as locally.
5. `npm run db:reset` re-applies migrations + seed from scratch (destructive
   to local data only). `npm run db:stop` stops the containers.
6. Razorpay/WhatsApp/MSG91 still need their own real test-mode accounts to
   exercise those flows end to end (see `.env.example`) — Docker Desktop
   only replaces the Supabase piece.

## Auth

- Phone + OTP via Supabase Auth (`src/components/ledger/LoginForm.tsx`,
  `src/lib/actions.ts`: `requestOtpAction`, `verifyOtpAction`). No
  email/password or OAuth — the original (Khatabook) and this clone's scope
  are both phone-first.
- Sessions: http-only cookies via `@supabase/ssr`, refreshed on every
  request by `src/middleware.ts`. Sign-out: `signOutAction`.
- Roles/teams: none — one owner per khata book, no team sharing in scope
  (recon.md doesn't describe one).
- Account deletion: `deleteAccountAction` calls the Supabase admin API
  (`auth.admin.deleteUser`), which cascades through `profiles` ->
  `khata_books` -> everything else via the `on delete cascade` foreign keys
  in `supabase/migrations/0001_init.sql`. Two-step confirm in the UI
  (`DeleteAccountButton.tsx`) since it's irreversible.

## Database

- Migration: `supabase/migrations/0001_init.sql` — full schema from
  `architecture.md`/`schema.sql`, adapted so `profiles` is keyed 1:1 to
  Supabase's own `auth.users` (phone/identity already lives there).
- Access rules: **Row Level Security on every table.** One helper function,
  `owns_khata_book(book_id)`, answers "can this user touch this record" for
  every table that hangs off a khata book; `owns_invoice` extends it for
  `invoice_lines` (which only has an `invoice_id`, not a `khata_book_id`
  directly). Not yet tested against a second real user — do this once you
  have two real accounts: sign in as user B, confirm every list/detail
  query for user A's data returns zero rows.
- Seed script: `supabase/seed.sql` — one fake local user
  (`+910000000001`, reserved test-range number) with two fictional shop
  customers and a few transactions. Local/dev only; never run against a
  hosted project.
- Backups: Supabase's hosted free tier includes automatic daily backups
  (~7 day retention) — **verify this is actually enabled** in
  Dashboard > Database > Backups once you create a hosted project; Pro adds
  point-in-time recovery. Self-hosted Docker Desktop has none by default —
  it's local dev data, not meant to be durable. Separately, and not
  dependent on infra backups: `GET /api/account/export` gives every user
  their own on-demand full JSON export, free, no plan gate (ties to
  `fixes.md`'s "your data is yours" fix-plan item) — this is the backup a
  real shopkeeper can actually trust, infra backups are a second layer on
  top.

## Payments (Razorpay, not Stripe)

- `src/lib/razorpay.ts`: `createPaymentLink` (UPI/card Payment Link for one
  customer's outstanding balance — a payment *request*, never settlement
  we hold, per architecture.md's scope note).
- Webhook: `src/app/api/webhooks/razorpay/route.ts` — verifies the
  `X-Razorpay-Signature` HMAC against the raw body, handles
  `payment_link.paid`, marks the matching reminder `paid`. Idempotent by
  construction (re-marking an already-paid reminder is a no-op; no
  side-effecting action re-fires on a retried webhook).
- Test mode: `RAZORPAY_KEY_ID` starting `rzp_test_` until `/replica-deploy`
  switches to live keys.
- No card forms anywhere — Razorpay's own hosted Payment Link page handles
  all of that.

## Messaging (WhatsApp Business Cloud API + SMS fallback)

- `src/lib/whatsapp.ts`: sends an approved **utility**-category template
  (`payment_reminder` — create and get this approved in Meta Business
  Manager; utility templates don't need the 24-hour open-session window a
  free-form message would).
- `src/lib/sms.ts`: MSG91 fallback, used automatically when WhatsApp send
  fails or the customer has opted out.
- `src/lib/reminders.ts`: the shared send-with-fallback logic, used by both
  the user-triggered "send now" action and the cron job.
- Webhook: `src/app/api/webhooks/whatsapp/route.ts` — GET handles Meta's
  one-time verification handshake; POST verifies `X-Hub-Signature-256`,
  handles delivery-failure status callbacks, and **the opt-out check**:
  an inbound STOP/UNSUBSCRIBE reply sets `customers.whatsapp_opt_out`,
  checked before every future send. This was built day one per
  architecture.md's explicit call-out, not deferred.
- Cron: `supabase/functions/reminder-dispatch` (Deno Edge Function,
  standalone — can't import the Next.js server-only modules above since
  it's a different runtime). Schedule with `pg_cron` + `net.http_post` per
  the comment at the top of that file.
- **New-sender approval and rate limits are the real risk here, not the
  code**: Meta gates new WhatsApp senders into a messaging tier that only
  expands with usage history, and template approval has its own lead time.
  Start that process in Meta Business Manager well before you need it live.

## Integrations summary

| integration | official API | scopes/access needed | review/approval | rate limits |
| --- | --- | --- | --- | --- |
| Supabase Auth (phone) | Supabase JS/SSR | project anon + service-role keys | none (self-serve) | Supabase's own auth rate limits, plus our own 5-per-10-min on OTP requests |
| Razorpay | Payment Links API | API key pair + webhook secret | none for test mode; live mode needs KYC/business verification | Razorpay API limits; we rate-limit "request UPI link" to 10/customer/hour |
| WhatsApp Business Cloud API | Graph API | phone number ID + access token + app secret | Meta Business verification + template approval (**weeks**, start early) | tiered by sender reputation, starts ~250 conversations/day |
| MSG91 | Flow API | auth key + template ID | DLT template registration (India SMS regulation) | provider-side, not yet rate-limited on our side beyond the WhatsApp-channel limiter |

## Security checklist

- [x] secrets only in env vars (`.env.local`, git-ignored); `.env.example`
      names every variable, no values
- [x] input validated on the server with zod on every mutating action
      (`createCustomerAction`, `addTransactionAction`,
      `scheduleAndSendReminderAction`, `requestUpiPaymentAction`,
      `requestOtpAction`/`verifyOtpAction`)
- [x] authorisation checked on every read and write — RLS on every table
      (`supabase/migrations/0001_init.sql`), plus `requireUser()` as a
      second check in every Server Action
  - [ ] **not yet tested with a second real user** — do this against the
        local Docker stack once you have two phone numbers to sign in as
        (add a second `[auth.sms.test_otp]` entry)
- [x] rate limits on auth (OTP request + verify) and on anything that sends
      a WhatsApp/SMS message or creates a payment link — **in-memory only**,
      per-server-instance (see `src/lib/rate-limit.ts`'s own comment); add
      Upstash Redis before horizontally scaling past one instance
- [x] webhooks verify signatures (Razorpay HMAC-SHA256, WhatsApp
      HMAC-SHA256) using `timingSafeEqual`, with a length check first so a
      mismatched-length signature can't throw instead of just failing
- [ ] uploads: size/type limits, separate domain/bucket — **not built**;
      bill-photo attachment (a "must" in features.csv) isn't implemented
      yet, so there's no upload path to secure yet either
- [x] no user data in URLs or logs — reminder/customer ids are UUIDs in
      paths (not PII), no phone numbers or amounts appear in any `console.*`
      call
- [x] dependencies audited (`npm audit`) — 8 moderate findings, all in the
      `eslint-config-next` -> `typescript-eslint` -> `minimatch` dev-only
      lint chain (a ReDoS in a linter, never shipped to users); fixing
      means downgrading `eslint-config-next` to a breaking version, so this
      is **accepted, not fixed**, re-check on the next `eslint-config-next`
      upgrade
- [ ] privacy policy lists every processor (Supabase, Razorpay, Meta/
      WhatsApp, MSG91) — **not written**; that's a `/replica-launch` task,
      not a backend one, but listed here so it isn't forgotten

## What's still open after this pass

- Bill-photo attachment (needs Supabase Storage wiring + the upload
  checklist items above)
- PDF customer statements (S06), app lock PIN (S12), multiple khata books
  (S08) — still stubs, unchanged from replica-build
- RLS cross-user test (see checklist above)
- GST invoicing (v2) backend: the `invoice_counters` table exists in the
  migration for the race-free numbering scheme architecture.md calls for,
  but no server code reads/writes it yet — that's scoped to v2, deliberately
  deferred

Next: `/replica-test`.
