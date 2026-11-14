Here's the full runbook. I checked what each skill reads and writes so that each step's output feeds the next.

## Step 0: Setup (once)

```bash
# install the pack (pick one)
/plugin marketplace add Jakeschincariol/replica-skill
/plugin install replica-skill@replica-skill
#   or: cp -r replica-skill/replica-* ~/.claude/skills/

python3 --version     # needs 3.8 or newer
```

If you install it as a plugin, the commands start with a prefix: `/replica-skill:replica-recon` and so on. I've written the short names below.

Each project gets its own `replica/` folder, and every step writes its output there. That means you can run `/clear`, or start a new session, between steps without losing anything. The next skill reads the files, not the chat history.

---

## Phase 1: Research both apps before building anything

Use a separate folder for each app, because each one gets its own `reviews.csv`:

```bash
mkdir -p ~/replica-research/khatabook ~/replica-research/vyapar
cd ~/replica-research/khatabook && claude
```

**Step 1.** Run `replica-entrepreneur` on Khatabook:
```
/replica-entrepreneur Khatabook (digital udhaar ledger for Indian shopkeepers).
Read public reviews from Google Play, App Store, Reddit (r/india, r/IndianStartups)
and Trustpilot. Aim for 150+ reviews with links. Focus on small kirana and retail owners.
```
You get:
- `replica/reviews.csv`, with one review per row, each with its link
- `replica/feedback.md`, the complaints ranked by how often they come up
- `replica/fixes.md`, a fix plan plus a positioning angle

**Step 2.** Do the same for Vyapar, in its own folder:
```
cd ~/replica-research/vyapar && claude
/replica-entrepreneur Vyapar (GST billing, invoicing and inventory app for Indian SMEs).
Same sources, 150+ linked reviews. Focus on GST invoicing, inventory, multi-device sync and pricing complaints.
```

**Step 3.** Compare the two in either folder:
```
Read ~/replica-research/khatabook/replica/fixes.md and ~/replica-research/vyapar/replica/fixes.md.
Which complaints overlap? Which gap is biggest for an SME tool I could sell under Ghost AI?
Recommend one scope.
```

What to check: any theme marked "thin" (fewer than 3 reviews, or only one source) is a weak signal. Don't build around it.

If Play Store pages won't load, export the reviews yourself in the format `source,url,date,rating,text` into `replica/reviews.csv`. Then ask Claude to run `reviews.py` on that file.

**Scope tip:** Khatabook's core (customers, credit and payment entries, reminders, reports) is a few weeks of work. Full Vyapar is much bigger: GST e-invoicing, e-way bills, inventory and accounting. A realistic plan is a Khatabook-style ledger first, then Vyapar-style GST invoices in version 2.

---

## Phase 2: The full build (one project folder)

```bash
mkdir ~/my-ledger-app && cd ~/my-ledger-app && git init && claude
```
Copy `replica/reviews.csv` and `replica/fixes.md` from your research folder into `~/my-ledger-app/replica/`. The later steps can then reuse them.

**Step 4. Map the app with `/replica-recon`**
```
/replica-recon Khatabook — I want to build my own version: a digital ledger for Indian
shopkeepers, plus simple GST invoices from Vyapar as a v2 scope. Use the Play Store listing,
help centre, YouTube walkthroughs, and my own account.
```
It asks a few scoping questions first. It then writes `replica/recon.md` (screens, user flows, data model) and `replica/features.csv`, a table that marks each feature must, should or could.

Save screenshots from your own Khatabook and Vyapar accounts into `replica/screens/`, named `S01.png`, `S02.png` and so on. They're for reference only and never get shipped.

Check before moving on: is the list of must-haves short enough for a first version?

**Step 5. Plan the stack with `/replica-architect`**
```
/replica-architect Android-first, offline-first with sync, Hindi + English, cheap to host.
Use Razorpay/UPI instead of Stripe, and the official WhatsApp Business Cloud API for reminders.
```
It writes `replica/architecture.md` and `replica/schema.sql`.

Check: offline sync and how payment entries are stored are the two decisions that are hard to change later. Read those sections carefully.

**Step 6. Design system with `/replica-design`**
```
/replica-design
```
It writes the colours, fonts and spacing to `replica/design/tokens.json`, plus `components.md`. It also runs the contrast check for you (`python3 contrast.py replica/design/tokens.json`).

**Step 7. Build with `/replica-build`**
```
/replica-build Start with the app shell, then the core flow end to end:
add customer → add credit entry → send WhatsApp reminder → mark paid.
```
Then continue screen by screen:
```
/replica-build screen S07
```
It ticks off the `clone` column in `features.csv` as it goes and keeps a log in `replica/build-log.md`. You can run this step over many sessions.

**Step 8. Backend with `/replica-backend`**
```
/replica-backend Phone OTP login, database migrations and access rules, Razorpay payment links,
WhatsApp reminders via the official Cloud API, daily backup.
```
It writes the server code, `.env.example` and a security checklist in `replica/backend.md`. You add your own API keys.

**Step 9. Test with `/replica-test`**
```
/replica-test Include edge cases: offline entry then sync, two devices editing the same customer,
duplicate payment taps, Hindi text, large ledgers (5,000+ entries).
```
It writes `replica/test-plan.md`, `replica/bugs.md` and Playwright tests in `e2e/`. Keep going until no S1 or S2 bugs are left open.

**Step 10. Compare with the original using `/replica-diff`**
```
/replica-diff
```
It runs these for you:
```bash
python3 parity.py replica/features.csv
python3 imgdiff.py replica/screens/S07.png replica/clone-screens/S07.png --out replica/diffs/S07.png
```
You get `replica/parity.md` with a score and the top five things to build next. If any must-have is missing, it will tell you the app isn't ready to ship.

**Step 11. Turn complaints into features with `/replica-entrepreneur`**
You already did the research in Phase 1, so just run:
```
/replica-entrepreneur Use the existing replica/reviews.csv and fixes.md. Add the fixes to features.csv.
```
Then go back to Step 7 and build the top fixes.

**Step 12. Name and rebrand with `/replica-brand`**
```
/replica-brand Indian SME audience, Hindi-friendly name, .in and .com domains.
Avoid "Khatabook, Vyapar, Khata" in names.
```
It writes `replica/brand.md` and `brand.json`, then runs the sweep for leftovers of the original:
```bash
python3 sweep.py . --avoid "Khatabook,Vyapar" --domains khatabook.com,vyaparapp.in
```
This has to come back clean (exit code 0). Run the trademark checks it lists on the IP India search before you commit to a name.

**Step 13. Launch materials with `/replica-launch`**
```
/replica-launch Pricing in INR, free tier plus a yearly plan. Play Store listing first.
```
It writes the landing page, pricing and `listing.json` into `replica/launch/`, and checks the listing with `listing.py`.

**Step 14. Go live with `/replica-deploy`**
```
/replica-deploy
```
It first runs a check of tests, parity, the sweep and the listing, and stops if any of them fail. It then gives you DNS records for your domain, switches Razorpay to live mode and sets up the Play Store build. It only ships when you say go.

---

## Shortcuts

| Goal | Run |
|---|---|
| Is this idea worth it? | Steps 1–3 only |
| A prototype to show people | Steps 4 → 5 → 6 → 7 (core flow only) |
| Ready to sell | All 14 |

Two warnings. First, all 14 steps are weeks of sessions, not one sitting. Second, Phase 1 alone often answers the real question. If the review gaps are thin, stop there.

I can turn this into a doc you can tick off as you go, if that would help.