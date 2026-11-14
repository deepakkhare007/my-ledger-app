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

## Dev-only OTP bypass (testing with any phone number)

Local Supabase phone auth only works for the two numbers seeded in
`[auth.sms.test_otp]`. To test with any phone number instead of remembering
those two, set `DEV_OTP_BYPASS_CODE` in `.env.local` (e.g. `000000`) and
restart the dev server. Then on `/login`, typing *any* phone number and
that one fixed code signs you in — no real OTP involved.

- `src/lib/actions.ts`: `requestOtpAction` skips the real `signInWithOtp`
  call entirely when the bypass is active; `verifyOtpAction` checks the
  submitted code against `DEV_OTP_BYPASS_CODE` before ever calling the
  real `verifyOtp`.
- `signInViaDevBypass`: mints a session via a deterministic password
  (derived from the phone + the bypass code) instead of a real phone
  verification — tries signing in first (so a repeat login with the same
  number just works), and only creates the auth user on a genuinely new
  number. A number that already has a *real* account (e.g. a seeded
  test_otp number) gets a clear error instead of silently failing, since
  there's no bypass password to match against it.
- Double-guarded: hard-disabled whenever `NODE_ENV === "production"`, on
  top of simply never setting the env var outside `.env.local`.
- Deliberately avoids `admin.auth.admin.listUsers()` for an "update this
  user's password" fallback — confirmed by hand that this local Supabase
  CLI's `listUsers` endpoint returns a genuine 500 ("Database error
  finding users") regardless of input (`curl .../auth/v1/admin/users`
  reproduces it directly). Not something to fix in our code; just avoided.

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
   and that code. A provider type still has to be configured
   (`[auth.sms.twilio]`, fake credentials in `supabase/.env`, git-ignored)
   for GoTrue to accept phone sign-in requests at all — it just never
   actually calls Twilio for a number listed in `test_otp`. For any other
   phone number you want to sign in as locally, add it to
   `[auth.sms.test_otp]` too; there's no real SMS provider in local dev.
5. `npm run db:reset` re-applies migrations + seed from scratch (destructive
   to local data only). `npm run db:stop` stops the containers.
6. Razorpay/WhatsApp/MSG91 still need their own real test-mode accounts to
   exercise those flows end to end (see `.env.example`) — Docker Desktop
   only replaces the Supabase piece.

**Verified against this local stack** (not just typechecked): signed in
through the real phone+OTP flow end to end — request OTP, enter
`123456`, land on `/customers` with a `profiles` row and a default
"My Shop" `khata_books` row created by the `on_auth_user_created` trigger,
zero console/server errors on first load. Two framework issues surfaced and
were fixed during this check, unrelated to Supabase itself:
`cacheComponents` (a create-next-app default) conflicted with Supabase
auth-js's internal `Date.now()` expiry check in a way Next 16 flags as an
"unstable value" — turned off in `next.config.ts` since nothing in this
app is a public/cacheable static page anyway. Separately, `middleware.ts`
got migrated to `proxy.ts` via the official codemod (Next 16 deprecated
the old convention).

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

## Voice entry (speak a transaction instead of typing)

- `src/components/ledger/VoiceEntryFlow.tsx`: records speech client-side via
  the browser's Web Speech API (`SpeechRecognition`/`webkitSpeechRecognition`
  — Chrome/Chromium only, feature-detected so other browsers just don't see
  the mic button and keep the regular typed form). Hindi (`hi-IN`) or
  English (`en-IN`) based on the shopkeeper's language setting.
- `src/lib/voice.ts`: sends the transcript plus the book's own customer list
  to Claude (`claude-haiku-5-5`) via tool-use, forcing a fixed JSON shape
  out of free-form speech — handles word-order variation ("Ramesh ko 500
  diye" vs "500 rupaye Ramesh ko diye") that a keyword parser can't.
  Needs `ANTHROPIC_API_KEY`.
- `parseVoiceEntryAction` / `confirmVoiceTransactionAction`
  (`src/lib/actions.ts`): parse, then an editable confirm screen (customer
  match, type, amount, note — all changeable) before anything is saved, so
  a misheard name or amount doesn't silently create a wrong entry.
- Creating a new customer from the confirm screen reuses the same
  `nameSchema`/`createCustomer` path as the regular Add Customer form —
  no separate validation to keep in sync.

## Bill send (receipt copy via WhatsApp/SMS)

- `src/lib/bill.ts`: `sendBillNow` — same WhatsApp-then-SMS-fallback shape
  as `src/lib/reminders.ts`'s `sendReminderNow`, but for "here's what was
  just recorded" rather than "please pay what's outstanding."
- `src/lib/whatsapp.ts` `sendWhatsAppBill` / `src/lib/sms.ts` `sendSmsBill`:
  separate approved templates from the reminder ones —
  **`transaction_receipt`** needs creating and approving in Meta Business
  Manager (same process as `payment_reminder`), and `MSG91_BILL_TEMPLATE_ID`
  needs its own DLT-registered template, since the wording differs.
- `sendBillAction` (`src/lib/actions.ts`) + `SendBillButton.tsx`: manual,
  per-transaction — not fired automatically on every save, so a customer
  who never asked for receipts doesn't get one every time. Logs every
  attempt to the new `bill_sends` table (`supabase/migrations/0002_bill_sends.sql`)
  so the UI can show "Sent ✓" vs "Send bill" without guessing.
- **Known limitation, confirmed by hand (see `replica/bugs.md` BUG-003):**
  MSG91's flow API returns HTTP 200 `{"type":"success"}` even for bad
  credentials or a missing template — there's no synchronous way to tell
  a real send from a silently broken one. A "Sent ✓" via the SMS fallback
  only means the API accepted the call, not that it reached a phone.

## Integrations summary

| integration | official API | scopes/access needed | review/approval | rate limits |
| --- | --- | --- | --- | --- |
| Supabase Auth (phone) | Supabase JS/SSR | project anon + service-role keys | none (self-serve) | Supabase's own auth rate limits, plus our own 5-per-10-min on OTP requests |
| Razorpay | Payment Links API | API key pair + webhook secret | none for test mode; live mode needs KYC/business verification | Razorpay API limits; we rate-limit "request UPI link" to 10/customer/hour |
| WhatsApp Business Cloud API | Graph API | phone number ID + access token + app secret; two approved templates (`payment_reminder`, `transaction_receipt`) | Meta Business verification + template approval (**weeks**, start early) | tiered by sender reputation, starts ~250 conversations/day |
| MSG91 | Flow API | auth key + two template IDs (`MSG91_TEMPLATE_ID`, `MSG91_BILL_TEMPLATE_ID`) | DLT template registration (India SMS regulation) each | provider-side, not yet rate-limited on our side beyond the WhatsApp-channel limiter; **no synchronous delivery confirmation either, see BUG-003** |
| Anthropic | Messages API (tool use) | API key | none (self-serve) | we rate-limit voice parsing to 20/IP/10-min ourselves |

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
- Voice entry and bill send are built but unverified end-to-end: voice
  entry needs a real `ANTHROPIC_API_KEY` to test the NLU parsing at all
  (fails fast without one), and bill send's WhatsApp path needs the new
  `transaction_receipt` template approved in Meta Business Manager before
  it can do more than fall back to SMS every time
- Inventory stays deliberately out of scope for now, per the shop owner's
  own call — but `inventory_items` already exists unused in the schema and
  `transactions` has no FK to it, so adding stock tracking later doesn't
  require reworking the ledger (see architecture.md's "parts that bite")

Next: `/replica-test`.
