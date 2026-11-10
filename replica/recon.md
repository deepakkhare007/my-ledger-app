# Recon map: Khatabook (Android, with iOS notes) + Vyapar GST invoicing (v2 reference)

Scope: a digital ledger (udhaar/khata) app for Indian shopkeepers — per-customer credit/debit
entries, payment reminders, backup, reports — as the v1 core loop. Simple GST invoice
generation (modeled on Vyapar's flow, not Khatabook's own) is an explicit v2/stretch scope,
not part of the v1 build.
For: the user's own product, aimed at Indian shopkeepers (kirana, mobile/electronics, medical,
garments, bakery/juice, jewellery, paan/chai) — a sellable product, not just personal use.
Date: 2026-11-10

Clean-room note: built entirely from public sources (App Store/Play listings, official
Khatabook blog posts, Vyapar's own guide, and third-party trackers/reviews). The user's own
Khatabook account was explicitly excluded from this recon — Khatabook's and most fintech
apps' terms restrict using an account to build a competing product, so no screenshots or
flows were captured from it. This recon therefore has gaps (exact current screen layouts,
exact current pricing tiers) that a public-only scan can't close — noted inline below.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | App Store listing (Khatabook) | https://apps.apple.com/in/app/khatabook-vyapar-app/id1488204139 | description, named features, version history, privacy labels |
| 2 | Khatabook official blog — app features | https://khatabook.com/blog/khatabook-app-features | 2020, step-by-step flows for most core screens |
| 3 | Khatabook official blog — what is digital khata | https://khatabook.com/blog/what-is-digital-khata | 2020, concept + feature list, overlaps with #2 |
| 4 | Khatabook help center — Loan Khata section | https://khatabook.com/help/en-us/section/YNL1PRAAACcA-Q0O/ | confirms Loan Khata is a lending product, no in-app entry point documented — treated as out of scope |
| 5 | Pagarkhata (Khatabook's staff app) listing + press coverage | https://business-standard.com/article/companies/khatabook-rolls-out-app-for-micro-entrepreneurs-to-manage-staff-payments-120120200056_1.html | confirms staff attendance/payroll is a **separate** Khatabook product, not a tab in the main ledger app |
| 6 | Vyapar — GST invoice guide (official) | https://vyaparapp.in/guides/how-to-create-tax-gst-invoices-in-vyapar-app | step-by-step GST invoice flow and field list — used for the v2 scope, since Khatabook's own GST invoicing isn't documented publicly in the same depth |
| 7 | Third-party app trackers (appgoblin, mwm.ai, similarweb) | e.g. https://appgoblin.info/apps/com.vaibhavkalpe.android.khatabook | corroborating feature lists: inventory/low-stock alerts, QR/UPI collection, GST & non-GST invoicing mentioned on the main Android listing |
| 8 | User reviews (already mined) | see `replica/feedback.md`, `replica/fixes.md` in this project | 176 reviews, already scored by theme — used here only to corroborate which screens/flows actually get used and complained about, not re-quoted |
| 9 | Pricing — third-party aggregators (G2, Spotsaas, SoftwareSuggest) | https://www.g2.com/products/khatabook/pricing | **gap**: Khatabook does not publicly disclose current plan names/prices; aggregators disagree. Confirmed only that a free tier + paid "Premium/Plus" tier exists (also corroborated by review complaints about new paywalls in fixes.md) |

No screenshots were captured into `replica/screens/` — per the ToS decision above, nothing
was read from the user's own account, and public listing pages returned no captioned/alt-text
screenshots (see source #1 report). `replica/screens/` is left empty; if the user later
decides to review the app themselves (outside this skill) they can drop reference images
there by hand.

## Core loop

A shopkeeper opens the app, picks (or adds) a customer, and logs one line — "you gave" or
"you got," cash or on credit — in under two taps; the app keeps a running balance per
customer and reminds them to collect it.

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Onboarding / phone sign-in | app open (first run) | authenticate shopkeeper by phone number | phone input, OTP input | empty, loading, error (bad OTP) |
| S02 | Khata (customer list) home | default landing screen | list every customer with running balance, total you'll-get / you'll-give at top | customer list rows, search, FAB "add customer", top summary bar | empty (no customers yet), filled, loading sync |
| S03 | Add customer | FAB on S02, or "+ Add customer" | create a new customer, optionally import from phone contacts | name field, phone field, contacts-import button, save button | empty, filled, error (duplicate name) |
| S04 | Customer ledger detail | tap a customer row on S02 | show that customer's full transaction history and running balance | transaction list, balance header, "You Gave"/"You Got" buttons, photo-attach icon | empty (no transactions), filled, error |
| S05 | Add transaction | tap You Gave / You Got on S04, or FAB "Add first transaction" | record one credit or debit line | amount field, date field, note field, photo attach, save | empty, filled, error (non-numeric amount) |
| S06 | Customer report (PDF) | "Report" on S04 | generate a shareable PDF statement for one customer | date-range picker, share sheet, download button | loading (generating), filled, error (share failed) |
| S07 | Payment reminder / request | "set date" or payment icon on S04 | schedule or send a reminder, or request payment via UPI link | date picker (next week/month/custom), WhatsApp/SMS share buttons, UPI request button | empty, filled (link generated), error (no phone number on file) |
| S08 | Multiple khata books switcher | dropdown near business name on S02 | switch between or create additional business/personal books | book list, "Create new Khatabook" button, business-name field | empty (only one book), filled |
| S09 | Business card | More > Business card | generate a shareable digital business card | 11 design templates, name/phone/services fields, share/download | empty (not created), filled |
| S10 | QR code setup | More > QR code | request a physical QR code for in-person UPI/card collection | business name, mobile, PIN code, state, city, address fields, "Verify" | empty, filled (pending mail), error (incomplete address) |
| S11 | Bank account linking | More > Payment history > add bank account | link a bank account to receive UPI payments directly | account holder name, IFSC, account number, "Verify" | empty, filled, error (invalid IFSC) |
| S12 | Settings — App lock | Settings > App lock | protect the whole app with a 4-digit PIN | PIN entry, toggle | off, on |
| S13 | Settings — Language | Settings > Language | switch the app's display language (11 languages) | language list | — |
| S14 | Inventory / stock list | main nav (per App Store + third-party listings; not confirmed by an official walkthrough — **gap**, no step-by-step source found) | track item-wise stock with low-stock alerts | item list, quantity, low-stock badge, item-wise export | empty, filled, low-stock warning |
| S15 | Reports / profit summary | main nav tab (per reviews in fixes.md — users complain about P&L accuracy here) | aggregate profit/loss, cash-vs-online summary | date-range filter, totals card, export | empty, filled |
| S16 | GST/non-GST invoice create (**v2 scope, modeled on Vyapar, not Khatabook**) | "+ Add Sale" equivalent | create a tax or non-tax invoice for a customer/party | party picker (with GSTIN+state), item table (HSN/SAC, qty, rate, GST%, discount), tax-type indicator (CGST+SGST vs IGST), totals, print/share | empty, filled, error (missing GSTIN on B2B party) |
| S17 | Party (B2B customer) profile (**v2**) | Parties tab | hold a customer's GSTIN + state for invoice tax-type logic | GSTIN field, state field, verify/update button | empty, filled, error (invalid GSTIN format) |

## Flows

```
F01 Shopkeeper logs a quick credit sale at the counter
    S02 -> S04 (existing customer) -> S05 (You Gave) -> back to S04
    happy path clicks: 3 (tap customer, tap "You Gave", tap Save)
    edge: customer is new (adds S03 first, +2 clicks); amount typo requires re-entry;
          offline entry (per fixes.md, reviewers want this to never block the save)

F02 Shopkeeper adds a brand-new customer and records the opening balance
    S02 -> S03 (add customer) -> S04 -> S05 (first transaction)
    happy path clicks: 5
    edge: duplicate name collision; importing from contacts skips manual name entry

F03 Shopkeeper reminds a customer to pay
    S02 -> S04 -> S07 (set date + channel)
    happy path clicks: 3
    edge: no phone number on file (blocks WhatsApp/SMS path, only UPI link still works);
          per fixes.md, several reviewers want a payment-mode field here too

F04 Shopkeeper requests payment via UPI and reconciles it
    S02 -> S04 -> S07 (payment icon) -> UPI app handoff -> back to S04 (balance updates)
    happy path clicks: 4 + external UPI app
    edge: UPI payment made outside the app and never marked paid (a complaint in fixes.md —
          "no reconciliation"); payment link expiring too soon (reviewer complaint)

F05 Shopkeeper closes the month and shares a statement
    S02 -> S04 -> S06 (report) -> share/download
    happy path clicks: 4
    edge: PDF export gated behind paid tier (per fixes.md paywall complaints); date-range
          picker with no data in range

F06 Shopkeeper runs two businesses on one phone
    S02 -> S08 (switcher) -> create new khata -> S02 (new book, empty)
    happy path clicks: 3
    edge: moving a customer between books is a named, unmet request in fixes.md

F07 (v2) Shopkeeper creates a GST invoice for a registered customer
    S17 (verify party GSTIN/state) -> S16 (add sale, pick party, add items with HSN/GST%)
    -> tax type auto-selected (CGST+SGST vs IGST by state match) -> review totals -> print/share
    happy path clicks: ~8 (per Vyapar's own guide — the longest flow in this app by design)
    edge: party has no GSTIN saved (falls back to non-GST "Bill of Supply"); item has no
          GST% preset (must be set before the line totals correctly); inter-state sale
          (IGST) vs local (CGST+SGST) — state-match logic is the one tricky rule here
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Customer row | with/without photo, balance in red (you'll give) or green (you'll get) | default, unread/updated, selected | S02 |
| Balance summary bar | total-you'll-get, total-you'll-give | default, zero-state | S02 |
| Transaction entry row | You Gave (debit), You Got (credit), with/without photo attachment | default, pending-sync, error | S04 |
| "You Gave" / "You Got" button pair | two-color toggle buttons | default, pressed, disabled (no customer selected) | S04, S05 |
| Amount keypad/input | numeric, with currency prefix | empty, filled, error (non-numeric, zero) | S05 |
| Date picker | calendar, quick-picks (next week/month) | default, selected | S05, S07 |
| Share sheet | WhatsApp, SMS, Email, Download | default | S06, S07, S09 |
| PIN entry | 4-digit grid | empty, filled, error (wrong PIN), locked-out after N attempts (guess) | S01, S12 |
| Business/book switcher dropdown | list + "create new" row | collapsed, expanded | S02, S08 |
| Low-stock badge | warning chip on item row | hidden (above threshold), shown (below threshold) | S14 |
| GSTIN/state field pair (v2) | verified / unverified | empty, filled, verified, error (bad GSTIN format) | S16, S17 |
| Item line row (v2) | with/without HSN, with/without discount | default, GST-rate-missing warning | S16 |
| Tax-type indicator (v2) | CGST+SGST (local) / IGST (inter-state) / exempt | auto-computed, override (guess) | S16 |

## Inferred data model

```
User        id, phone_number, display_name, pin_hash (nullable), language, created_at
            evidence: S01 (phone sign-in), S12 (app lock), S13 (language)
            confidence: medium (auth mechanism inferred — phone+OTP is the only sign-in
            evidence found; no password/email flow seen in any source)

KhataBook   id, user_id (owner), business_name, type (business | personal), created_at
            evidence: S08 ("Create New Khatabook", "Business name" field), blog #2
            confidence: high

Customer    id, khatabook_id, name, phone_number (nullable), photo (nullable),
            running_balance (derived or cached), gstin (nullable, v2), state (nullable, v2),
            created_at
            evidence: S03 (add customer form), S17 (v2 party profile)
            confidence: high for base fields; gstin/state confidence medium (Vyapar's
            model, not confirmed for Khatabook itself)

Transaction id, customer_id, type (you_gave | you_got), amount, note (nullable),
            photo_url (nullable), transaction_date, payment_mode (nullable — requested
            feature per fixes.md, not confirmed to exist today), created_at, synced_at
            evidence: S05 (add transaction flow, blog #2), fixes.md theme "payment mode"
            confidence: high for core fields; payment_mode is a planned addition (user
            request), not an observed Khatabook field — flagged as a fix-plan item already

Reminder    id, customer_id, scheduled_for, channel (whatsapp | sms | upi_link),
            status (pending | sent | paid)
            evidence: S07, blog #2 ("set date", "send via Whatsapp or SMS")
            confidence: medium (status field is inferred; Khatabook's own reconciliation
            is a known gap per fixes.md — "no reconciliation" complaint)

InventoryItem id, khatabook_id, name, unit, quantity_on_hand, low_stock_threshold,
            default_gst_rate (nullable, v2), hsn_code (nullable, v2)
            evidence: S14 (gap — no official walkthrough found, only listing/third-party
            mentions of "low stock alerts" and "item-wise export")
            confidence: guess (existence is well corroborated; exact fields are not)

Party       id, khatabook_id, customer_id (nullable, may reuse Customer), gstin, state,
            is_gst_registered
            evidence: S17, Vyapar guide step 6 ("Verify the customer... confirm the GSTIN
            and State")
            confidence: medium (this is Vyapar's model, adopted as the v2 reference design;
            Khatabook's own GST invoicing data model was not found in public sources)

Invoice     id, party_id, khatabook_id, invoice_type (tax_invoice | bill_of_supply),
            invoice_number, invoice_date, place_of_supply, cgst_amount, sgst_amount,
            igst_amount, subtotal, discount, additional_charges, total
            evidence: Vyapar guide steps 6-13 (tax-type logic, header switch, totals review)
            confidence: medium — numbering/sequencing rules were explicitly not documented
            in the Vyapar guide either (noted as a gap by the source fetch); treat invoice_number
            as "needs its own design decision" in replica-architect, not a confirmed external rule

InvoiceLine id, invoice_id, inventory_item_id (nullable), description, hsn_sac_code,
            quantity, unit_price, gst_rate, discount, line_total
            evidence: Vyapar guide step 9 (HSN/SAC, Discount, GST as item-table columns)
            confidence: medium
```

Relationships: User 1-n KhataBook, KhataBook 1-n Customer, Customer 1-n Transaction,
Customer 1-n Reminder, KhataBook 1-n InventoryItem, KhataBook 1-n Party (v2),
Party 1-n Invoice (v2), Invoice 1-n InvoiceLine (v2), InventoryItem 1-n InvoiceLine (v2, optional).

## Feature matrix

See `features.csv`. Must: 11, should: 7, could: 6, skip: 3.

## Out of scope (cannot or should not be cloned)

- **Loan Khata (in-app lending).** Confirmed via Khatabook's own help center as a lending
  product ("we help you get loans... from RBI-registered NBFC partners"). Requires an NBFC
  partnership and regulatory licensing to offer legally in India — not something a clone can
  or should build. `skip`.
- **Pagarkhata (staff attendance/payroll).** Confirmed via press coverage to be a *separate*
  Khatabook app/product, not a tab inside the main ledger — and user reviews mined in
  fixes.md already flag staff features as a minor, thin-evidence ask (4 reviews). Treat as a
  possible later release, not part of this clone's v1 or v2. `skip` for now.
- **Physical QR code fulfillment (S10) and bank-grade UPI settlement (S11).** These require
  becoming (or partnering with) a licensed payment aggregator/PSP and mailing physical
  hardware — regulated territory, not a UI clone. The *reminder-via-UPI-deep-link* flow (F04,
  opening the customer's own UPI app) is cloneable; actually becoming a collection/settlement
  party is not. `skip` the settlement side, `should` the deep-link reminder.
- **Khatabook's own user base/network effects and its brand/trademark** — "Khatabook,"
  "khata book" wording, and its logo/trade dress are the original's own; per
  `fixes.md`'s positioning section, do not reuse the name. (Not a feature row, a standing
  constraint for `/replica-brand`.)
- **Exact current pricing tiers and paywall thresholds.** Public sources disagree and
  Khatabook doesn't disclose current plan details (see source #9). The fix-plan in
  `fixes.md` already recommends a stance (unlimited entries/export free) rather than copying
  Khatabook's gating — so this isn't being cloned, it's being deliberately done differently.

## Size

Screens 17 (14 v1 + 3 v2-only), flows 7 (6 v1 + 1 v2). Entities 9 (6 v1 + 3 v2-leaning:
Party/Invoice/InvoiceLine).

Hard parts:
- **Offline-first sync** (F01, F05 edges) — already identified as the #2 fix-plan item in
  fixes.md (15 reviews on lag/sync). This is the single hardest and highest-value piece:
  local-first writes, background sync, "synced" indicator, reminders sent only post-sync.
- **UPI payment reconciliation** (F04) — matching an externally-made UPI payment back to a
  specific pending transaction without becoming a payment aggregator yourself; Khatabook's
  own users complain this doesn't work well today, which is an opportunity, not just a risk.
- **GST tax-type logic** (F07, v2) — CGST+SGST vs IGST based on state match, HSN/GST-rate
  presets per item, tax-invoice vs bill-of-supply headers. Vyapar's own public guide doesn't
  even cover invoice numbering, so this will need its own design pass in replica-architect
  rather than a straight copy.
- **Multi-language support** (S13) — 11 languages named by Khatabook; not hard technically,
  but a real localization-content cost if matched in full for v1.

Size: **M** for the v1 ledger core (S01-S13, S15, F01-F06) — a few weeks, dominated by the
offline-sync work. **+M** again if the GST invoicing v2 scope (S14, S16-S17, F07) is pulled
into the same release instead of a true v2; recommend keeping it a separate phase as scoped.
