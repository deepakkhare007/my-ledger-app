# Bugs

Both found by the automated e2e/axe pass while writing the suite (not by
guessing — see `replica/test-plan.md` for which case caught each one), and
both fixed in `ccb4f2d` before this phase closed. Nothing is open.

### BUG-001: Balance badge fails WCAG AA contrast (4.02:1, needs 4.5:1)

- Severity: S3 (visibly wrong — the colour is still distinguishable to
  most sighted users, but fails the formal accessibility threshold with
  no workaround for someone it does affect)
- Flow / case: F01-H1 (axe scan)
- Screen: S02 (customer row), S04 (ledger header) — anywhere `BalanceBadge`/`Badge` renders
- Build: `a28664c` (replica-backend)  Browser: Chromium (Playwright), desktop

Steps
1. Sign in, open or create a customer, record a "You Gave" transaction
2. Run an axe accessibility scan on the resulting page

Expected: 0 contrast violations
Actual: `color-contrast` violation, 4.02:1 — `text-success` (`#17804f`) on a
10%-opacity `bg-success` tint (`~#dfeae7`), below the 4.5:1 AA minimum for
normal text
Evidence: `e2e/f01-add-transaction.spec.ts` "F01-H1" (axe assertion),
first failing run's diff (see git history of that test); the component
was `src/components/ui/Badge.tsx`
Suspected cause: the soft colour-tinted background sits closer to the
text's own hue than a neutral background would, which *lowers* contrast
as the tint gets stronger — the opposite of the intuition that a
same-colour background "reinforces" the text's colour
Status: fixed in `ccb4f2d` — Badge now uses a solid background + on-accent
(white) text for every colour variant; `python3 contrast.py
replica/design/tokens.json` confirms 0 failures across all pairs,
including the new on-accent-on-danger/success/warning combinations

### BUG-002: Non-numeric transaction amount shows a raw library error

- Severity: S3 (visibly wrong — the form correctly rejects the input and
  loses no data, but the message shown is confusing/unhelpful wording a
  shopkeeper wouldn't understand)
- Flow / case: F01-N1
- Screen: S05 (add transaction)
- Build: `a28664c` (replica-backend)  Browser: Chromium (Playwright), desktop

Steps
1. Open "You Gave" / "You Got" on any customer
2. Type a non-numeric value (e.g. "abc") into the Amount field
3. Tap Save

Expected: "Enter an amount greater than zero" (the same message shown for
an empty or zero amount)
Actual: "Invalid input: expected number, received NaN" — zod's own
coercion-failure message, surfaced before the `.positive()` check (which
carries the friendly custom message) ever runs
Evidence: `e2e/f01-add-transaction.spec.ts` "F01-N1" (first failing run);
screenshot captured during triage,
`test-results/f01-add-transaction-F01-lo-4eb57--numeric-amount-is-rejected-chromium/test-failed-1.png`
(local only, not committed)
Suspected cause: `z.coerce.number().positive(msg)` type-checks the
coercion result before running the `.positive()` refinement, so a
non-numeric string fails at the type-check stage with zod's default
message instead
Status: fixed in `ccb4f2d` — validates the raw string with a single
`.refine()` instead of `z.coerce.number()`, so every bad input (empty,
zero, negative, non-numeric) produces the one friendly message

## To check (not reproduced, just flagged)

- Nothing currently. If real Razorpay/WhatsApp/MSG91 test-mode credentials
  are added later, re-run F03/F04's manual cases (see test-plan.md) — those
  paths are entirely unverified beyond "the placeholder-credential failure
  is handled gracefully."
