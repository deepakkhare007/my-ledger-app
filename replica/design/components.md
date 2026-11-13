# Component specs

From the screen/component list in `replica/recon.md`. No screenshots exist for this app
(see `tokens.json`'s `_about`), so these specs are built from the screens, flows, and states
the recon documented, not traced from a design. Primitives (Button, Input, Card, Badge) are
built in code at `/design` (see "Primitives built" below); the domain components below reuse
those primitives and are specced here for replica-build to assemble.

```
Button
  variants  primary, secondary, ghost, danger
  sizes     sm 44px, md 48px, lg 56px   -- see tokens.json "touch": never below 44px
  states    default, hover, active, focus-visible (2px ring, accent), disabled, loading
  tokens    bg accent (primary) / transparent (ghost) / danger (danger), text on-accent,
            radius md, font sm/600 (sm size) or base/600 (md/lg)
  a11y      real <button>, visible focus ring, loading keeps the label for screen readers
            (a visually-hidden "loading" suffix, not an icon-only swap)
  used on   S01, S03, S04, S05, S07, S08, S09, S16

Input (text / numeric)
  variants  text, numeric (amount), phone
  sizes     md 48px tall (single line)
  states    default, focus, filled, error (red border + inline message), disabled
  tokens    bg bg, border border-input, radius sm, text text, placeholder text-muted
  a11y      a real <label> always visible above the field (never placeholder-as-label,
            which disappears exactly when a shopkeeper needs to confirm what they're
            filling in); numeric inputs use inputmode="decimal" so the Android keyboard
            opens in numeric mode (direct fix for the "5-6 seconds to open keyboard"
            complaint in fixes.md isn't a component problem, but the right inputmode at
            least avoids extra taps to switch keyboards)
  used on   S03, S05, S07, S10, S11, S16, S17

Card
  variants  default, pressable (whole card is a tap target, e.g. a customer row)
  states    default, pressed, selected
  tokens    bg surface, border border, radius lg, shadow card
  a11y      pressable card is a real <button> or <a>, not a div with onClick
  used on   S02, S04, S14 (as item rows)

Badge / balance pill
  variants  outflow (you-gave), inflow (you-got), low-stock, out-of-stock, neutral
  states    default
  tokens    solid background + on-accent (white) text, not a colour-tinted background with
            colour-on-colour text — outflow/out-of-stock: bg danger; inflow: bg success;
            low-stock: bg warning; neutral: bg border, text text-muted. (A tinted-background
            version failed an axe WCAG AA contrast check in e2e/f01-add-transaction.spec.ts —
            4.02:1 against the needed 4.5:1 — because the tint sits closer to the text's own
            hue, lowering contrast further; solid + white text reuses the already-verified
            on-accent/accent pattern instead.)
  a11y      colour is never the only signal — every balance pill also carries the word
            "you'll give" / "you'll get" (or the Hindi equivalent) in text, not just red/green,
            for colour-blind users and because at a glance in bright light, hue reads slower
            than a word does
  used on   S02 (customer row balance), S04 (ledger header), S14 (low-stock badge)

Customer row
  variants  with photo, without photo (initials avatar)
  states    default, pressed, has-unsynced-change (small dot, see "offline indicator" below)
  tokens    Card (pressable) + Badge (balance pill) composed together
  a11y      the whole row is one tap target to open S04; balance pill text is read by
            screen readers as "Ramesh, you'll get two hundred forty rupees", not just a
            number
  used on   S02

Transaction entry row ("You Gave" / "You Got" list item)
  variants  you-gave, you-got, with photo attachment, pending-sync
  states    default, pending-sync (greyed amount + small sync icon), error (red dot, tap
            to see why it failed to sync)
  tokens    Badge (outflow/inflow) for the amount, text-muted for the date/note line
  a11y      pending-sync state must still read the amount at full contrast — a logged
            entry is money a shopkeeper is counting on, never grey it out so far it's
            hard to read while unsynced
  used on   S04

"You Gave" / "You Got" button pair
  variants  the two-button toggle on S04/S05
  states    default, one-selected (the other dims to secondary), disabled (no customer open)
  tokens    Button (primary when selected, secondary when not) in a row, each danger/success
            tinted respectively so the colour-coding starts at the moment of entry, not just
            on the summary later
  a11y      implemented as a radio group (two real buttons with aria-pressed), not two
            separate unrelated buttons, so screen readers announce it as a single choice
  used on   S04, S05

Date picker
  variants  calendar grid, quick-picks (next week / next month / custom)
  states    default, selected, today, disabled (past dates for a reminder)
  tokens    Card for the popover, accent for the selected day, radius sm per day cell
  a11y      full keyboard arrow-key navigation inside the grid; quick-picks are real
            buttons before the grid, not icons
  used on   S05 (transaction date), S07 (reminder schedule)

Share sheet
  variants  WhatsApp, SMS, Email, Download — rendered as a row of labelled buttons, not
            icon-only (several reviewers in fixes.md struggled to find basic features, so
            every share option gets a visible label here)
  states    default, sending, sent, failed (per channel)
  tokens    Button (ghost, sm) per channel, with the channel's own icon from an open set
            (Lucide/Phosphor/Tabler) — never the WhatsApp/SMS/Google wordmarks, only a
            generic chat/message/mail icon plus the text label
  a11y      each button's accessible name states the channel and the action, e.g.
            "Send via WhatsApp", not "WhatsApp"
  used on   S06, S07, S09

PIN entry
  variants  set (first time), verify (every unlock)
  sizes     4 digit cells, each 56px square (comfortably above the 44px minimum since this
            is the one input users must get exactly right under light pressure)
  states    default, filled (per digit), error (shake + red border, clears after a beat),
            locked-out (after N failed attempts — exact N is a replica-backend decision,
            not a design one)
  tokens    border border-input default, border accent on filled, border danger on error
  a11y      a native numeric keypad, not a custom on-screen keypad grabbing focus away from
            the OS one — screen readers must be able to read "PIN entry, digit 2 of 4"
  used on   S01 (if used for login — more likely OTP, see Input/phone), S12

Business/book switcher dropdown
  variants  collapsed (shows current book name + chevron), expanded (list + "Create new")
  states    default, open, one book (hides the switcher chevron entirely, no dropdown
            needed for the common single-book case)
  tokens    Card (pop shadow) for the expanded panel
  a11y      a real <button aria-haspopup="listbox"> triggering a listbox, full keyboard
            support (arrow keys, Enter, Escape)
  used on   S02, S08

Low-stock badge
  variants  below-threshold (warning), out-of-stock (danger)
  states    default
  tokens    Badge (warning / danger variants)
  used on   S14

GSTIN / state field pair (v2)
  variants  unverified, verified
  states    empty, filled, verifying (spinner), verified (check icon + green border),
            error (invalid GSTIN checksum/format)
  tokens    Input (text) × 2 + a small Badge-style "Verified" chip once confirmed
  a11y      the verified state is announced via aria-live, since it updates after an async
            check, not just on blur
  used on   S16, S17

Item line row (v2)
  variants  with HSN/SAC code, without (non-GST sale)
  states    default, GST-rate-missing (warning badge inline, must be resolved before save)
  tokens    Card (plain) row with Input fields inline for qty/rate/discount
  used on   S16

Tax-type indicator (v2)
  variants  CGST+SGST (local), IGST (inter-state), exempt / Bill of Supply
  states    auto-computed (default — most invoices), manually overridden (rare, flagged
            with a small "edited" tag so it's auditable later)
  tokens    Badge (neutral variant, text-only — this is informational, not a
            success/danger signal)
  used on   S16

Offline / sync indicator
  variants  synced (small check, low emphasis), syncing (spinner), offline-queued (small
            dot), sync-error (red dot, tappable for detail)
  states    see variants
  tokens    text-muted for synced/syncing (deliberately quiet — per fixes.md, this app's
            whole pitch is that sync problems shouldn't be the user's problem to watch),
            danger dot only when something actually needs the user's attention
  a11y      state changes are polite aria-live, not assertive — this should never interrupt
            someone mid-entry
  used on   S02 (header), S04, any row from Customer row / Transaction entry row
```

## Primitives built

Button, Input, Card and Badge are implemented in code at `/design` in the Next.js app
(`src/app/design/page.tsx`), composed from Tailwind utility classes mapped to the tokens
above (`tailwind.config` theme extension + `src/app/tokens.css`) — not raw hex anywhere in
component code. Screenshot taken from that route serves as this design system's check,
alongside the zero-failure contrast report.
