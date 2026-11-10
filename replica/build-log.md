# Build log

One line per screen touched. Status: `done` (every state from recon + DoD met),
`partial` (works, but a known gap — see note), `stub` (route exists, not built).

| screen | date | status | what's missing / what was harder than expected |
| --- | --- | --- | --- |
| Shell (routing, layout, tokens, seed data) | 2026-11-10 | done | All 17 recon screens have a route. Layout is a single top header ("My Shop" + "More") — recon didn't document a full nav IA beyond the "More" grouping implied by S09/S10/S11 all living behind Khatabook's own "More" menu, so I kept that pattern rather than inventing a bottom-tab bar. |
| S02 Khata (customer list) home | 2026-11-10 | done | Summary bar, search (client-side filter), empty state (no customers / no search match), customer rows with balance badges. Search is a simple substring filter over the already-loaded list — fine at this scale, would need a real query if the customer list ever got large. |
| S03 Add customer | 2026-11-10 | partial | Manual entry only (name + optional phone), with inline validation error. No contacts import — that needs a device-contacts permission flow this vertical slice doesn't touch. |
| S04 Customer ledger detail | 2026-11-10 | done | Balance badge, You Gave/You Got button pair, Remind link, transaction list, empty state, not-found handling for a bad id. Long names wrap (`break-words`) rather than truncate, since truncating a shop's own name felt worse than an extra line. |
| S05 Add transaction | 2026-11-10 | done | Amount (numeric keypad via `inputMode="decimal"`), note, date (defaults to today), optional payment mode. Validates amount > 0 and a date are present; shows the error inline instead of a thrown exception / Next.js error overlay. |
| S07 Payment reminder | 2026-11-10 | partial | Scheduling (date + WhatsApp/SMS choice) and the reminder list (pending/sent/paid, "Mark as paid") all work. The send itself is **simulated** — it marks the reminder "sent" immediately rather than calling the real WhatsApp Business Cloud API (or SMS fallback), since that needs Meta Business verification and approved templates per replica/architecture.md. This is the biggest gap in the four-step flow the user asked for; flagging it here rather than letting "it looks done" hide that the send is fake. |
| S01, S06, S08–S17 | 2026-11-10 | stub | Routes exist (`/login`, `/customers/[id]/report`, `/books`, `/business-card`, `/qr-code`, `/bank-account`, `/settings/app-lock`, `/settings/language`, `/inventory`, `/reports`, `/invoices/new`, `/parties/[id]`), each showing its screen ID and purpose from recon.md. None are built. S10/S11/Loan-Khata-adjacent screens are explicitly out of scope per recon anyway. |

## Harder than it looked

- **Next.js 16's "blocking prerender" diagnostic.** Every dynamic route
  (`/customers/[id]`, its `transactions/new` and `remind` children) read
  `params` and threw a console error about not being prerenderable until I
  added `export const instant = false` to each — a one-line fix once found,
  but the first attempt silently didn't take effect until a full dev-server
  restart with the `.next` cache cleared. Worth knowing for the next dynamic
  screen built (S06, S17, etc. will need the same line).
- **PressableCard vs. Link nesting.** The first cut of `CustomerList` wrapped
  the `PressableCard` primitive (a `<button>`) inside a `<Link>` (an `<a>`),
  which nests two interactive elements — invalid HTML and a real a11y
  problem (screen readers see a button inside a link). Fixed by styling the
  `Link` directly instead of composing it with the button-based primitive.
  Worth remembering for every other place a card is also a navigation link.
- **In-memory data layer resets on every dev-server restart.** Expected and
  documented (see `src/lib/store.ts`), but worth restating: this is purely a
  vertical-slice stand-in. `/replica-backend` replaces `src/lib/store.ts`
  with real Postgres-backed functions of the same shapes — no screen code
  should need to change.

## Verification done

- `npx tsc --noEmit` — clean.
- `npm run lint` — clean.
- `npm run build` — clean production build, all 23 routes compile (static or
  partial-prerender as expected for the dynamic ones).
- Manually clicked through the full requested flow in the browser pane: add
  customer → add a "You Gave" credit entry (balance updated correctly,
  ₹85 → ₹585) → schedule + send a WhatsApp reminder (simulated) → mark it
  paid. No console errors after the `instant` fix. Checked at both desktop
  and 375px mobile width.

## Next

`/replica-backend` — the data layer (`src/lib/store.ts`) is still fake, per
replica-architect's build order this comes before `/replica-test`.
