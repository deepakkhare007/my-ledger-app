# Parity report — Ledger (working title) vs Khatabook (v1 scope)

Build: `674ea20` (replica-test)  Date: 2026-11-14
Matrix: `replica/features.csv` (36 rows; 7 invoicing rows re-marked `skip` in
this pass — they're v2 scope per `replica/architecture.md`, not evaluated
against a v1 shippability bar)

## Overall score: 50 / 100 (features only — no layout score, see below)

```
python3 parity.py replica/features.csv
```

**features 50.0** (17 counted, must-haves 5 of 10 done)
**Not shippable yet: 5 must-have features are not done.**

### By area, weakest first

| area | score | features |
| --- | --- | --- |
| reports | 0.0 | 2 |
| security | 0.0 | 1 |
| marketing | 0.0 | 1 |
| inventory | 0.0 | 1 |
| localization | 0.0 | 1 |
| data | 50.0 | 1 |
| ledger | 61.8 | 6 |
| onboarding | 75.0 | 2 |
| reminders | 100.0 | 1 |
| payments | 100.0 | 1 |

## Layout diff: not run

`replica/screens/` is intentionally empty — per the ToS decision made at
`/replica-recon` (public sources only, skip the user's own account; see
`replica/recon.md` line 32), no screenshots of the original were captured.
`replica/clone-screens/` has 5 of the clone's own screens (S02–S05, S07) from
the build phase, but there is nothing of the original to diff them against.
Skipping this rather than approximating it from memory — comparing against a
half-remembered layout would just produce a fake number. If the user is
willing to screenshot the original's public pages/listing themselves at
1440×900 and 390×844, drop them in `replica/screens/` and re-run
`imgdiff.py`.

## Missing, in build order

| priority | area | feature | clone status |
| --- | --- | --- | --- |
| must | ledger | Attach a photo to a transaction (bill photo) | no |
| must | reports | Shareable PDF customer statement | no (S06 stub) |
| must | security | App lock (PIN) | no (S12 stub) |
| must | ledger | Add a customer (manual or from phone contacts) | partial — manual only, no contacts import |
| must | onboarding | Create a khata (business) book | partial — default book auto-created, no explicit create-another-book UI |
| should | inventory | Inventory / stock list with low-stock alerts | no |
| should | ledger | Multiple khata books (switch business/personal) | no (S08 stub) |
| should | marketing | Business card generator | no |
| should | data | CSV/PDF export and full data backup/restore (free) | partial — JSON export + account deletion built, no CSV/PDF format or restore |
| could | localization | Multi-language UI (11 languages) | no |
| could | reports | Profit/loss and cash-vs-online report | no |

**Left out on purpose:** QR-code in-person collection, bank account linking,
Loan Khata (all three require a licensed-aggregator/NBFC partnership — not a
UI clone), Pagarkhata staff/payroll (separate product), and the 7 invoicing
rows (v2 scope, see above).

**Built that the original doesn't have:** offline-first entry (not built
yet either — see Notes), payment-mode field on transactions, bill-level
tracking (not built), WhatsApp opt-out handling (built), doubtful/bad-debt
flag (not built), move-customer-between-books (not built). Of these, only
**payment-mode field** and **WhatsApp opt-out handling** are actually done;
the rest are still on the roadmap under their own names.

## Behaviour diff (from `replica/recon.md`'s flows, walked against the built app)

| flow | original does | clone does | fix or keep |
| --- | --- | --- | --- |
| F01 credit sale | 3 taps: customer → You Gave → Save | 3 taps: customer → You Gave → Save | keep — parity on clicks |
| F02 add customer | 5 taps: new customer → save → first transaction | same shape, same click count (verified in `e2e/f02-add-customer.spec.ts`) | keep |
| F03 reminder | 3 taps; reviewers want a payment-mode field here (fixes.md) | 3 taps, **plus** the payment-mode field reviewers asked for, **plus** real opt-out handling (STOP keyword) the original doesn't have | better than original — keep |
| F04 UPI request + reconcile | reviewers' #1 complaint: payments made outside the app are never reconciled (fixes.md) | Razorpay webhook marks the reminder `paid` automatically on `payment_link.paid`, no manual step | better than original — keep, this is the differentiator |
| F05 month-end statement | 4 taps, PDF gated behind paywall | not built | build next — and keep it free per the plan in fixes.md |
| F06 two businesses on one phone | 3 taps via a book switcher | not built (single default book only) | build next |

## Verdict: **not shippable**

5 must-have features are not done (bill photo, PDF statement, app lock,
contacts import, explicit multi-book creation), and the feature score (50)
is well under the 80 bar even before counting must-haves. No open S1/S2 bugs
(see `replica/bugs.md`) — the gap here is scope, not quality.

## Top 5 to build next

1. **Shareable PDF customer statement** (S06) — must-have, currently a stub; also the fix for reviewers' paywall complaint (keep it free, per `fixes.md`).
2. **App lock (PIN)** (S12) — must-have, currently a stub; pure client-side feature, cheap to add.
3. **Attach a photo to a transaction** (bill photo) — must-have; needs Supabase Storage (already provisioned) + an upload field on `NewTransactionForm`.
4. **Explicit "create another khata book" UI + switcher** (S08) — closes both the onboarding must-have (partial → done) and the should-have "multiple khata books" row in one build; the schema already supports multiple books per user.
5. **Contacts import on "Add customer"** (S03) — closes the last ledger must-have; browser Contact Picker API on supporting devices, manual entry stays as the fallback it already is.

Next: `/replica-build` for the gaps above.
