# Khatabook: what to fix in our version

Sample: **176 reviews** after de-duplication (178 rows collected), collected 10 Nov 2026.

| source | rows | how |
| --- | --- | --- |
| App Store (India) | 113 | Apple's official customer-reviews RSS feed, app id 1488204139, 500 most recent (8 Oct to 8 Nov 2026). I kept every review rated 1 to 4 stars and every 5-star review of 6 words or more. That dropped 387 short 5-star reviews like "Awesome". |
| Google Play (India) | 63 | Read in the browser, "Most relevant" then "Newest". I kept 63 of the 99 shown and dropped one-to-three-word 5-star reviews. Each row links to its own review ID. Some long reviews are cut off where Play's list cuts them, so the quote is a verbatim prefix. |
| Trustpilot | 1 | khatabook.com has 1 review in total (Dec 2022, 1 star). |
| Hacker News | 1 | Algolia API. One relevant comment, from an accounting professional (2021). It describes the product's scope, not one shop's experience. |
| Reddit | 0 | **Not reached.** Reddit's API returned 403 to unauthenticated requests, and reddit.com is blocked in the browser pane. Nothing from r/india or r/IndianStartups is in this sample. |

**Read the numbers with this in mind.** Most of Khatabook's users like it. 453 of the 500 recent App Store reviews are 5 stars, and the Play listing shows 452,401 five-star against 43,685 one-star reviews. The complaints below come from a minority, and every theme is small in absolute terms (3 to 15 reviews). Most of the evidence is from Google Play. A theme marked **thin** has fewer than 3 reviews or only one source. Treat this as direction, not proof.

App Store links all point to the app's reviews page, because Apple's feed has no per-review URL. The review ID is in the `ref` column of `reviews.csv`.

---

## 1. What they hate

1. **The app is slow, hangs or closes itself while entering at the counter.** 10 reviews, 2 sources (+5 more on sync lag, below).
   - "almost a month now the app has become extremely slow and keeps hanging. While entering shop transactions, it often freezes and automatically closes by itself." ([Play, 1★](https://play.google.com/store/apps/details?id=com.vaibhavkalpe.android.khatabook&reviewId=fb6ad856-7e7a-4d66-ba43-2abbe3d810fc))
   - "its take 5-6 second to open keyboard in this app" ([App Store, 3★](https://apps.apple.com/in/app/khatabook-vyapar-app/id1488204139?see-all=reviews))
2. **Unwanted loan and sales calls, plus a loan product people regret.** 7 reviews about calls (2 sources) and 4 about the loan itself (Play only, thin), 11 in all.
   - "Stop calling my number so often. I’m tired of blocking and  getting calls from different numbers." ([App Store, 1★](https://apps.apple.com/in/app/khatabook-vyapar-app/id1488204139?see-all=reviews))
   - "There is not even an option to opt out of these sales calls." ([Play, 1★](https://play.google.com/store/apps/details?id=com.vaibhavkalpe.android.khatabook&reviewId=1ee97713-d2c7-4c94-885b-c8e409cf4d86))
   - "Auto-debit was attempted 5–6 times daily even after manual payments" ([Play, 1★](https://play.google.com/store/apps/details?id=com.vaibhavkalpe.android.khatabook&reviewId=130021ec-e6aa-4a4b-9026-2b9035a02e4b))
3. **A fake "new update available" screen blocks the ledger.** 6 reviews, Play only (thin on sources, but 6 independent reports with the same symptom).
   - "it asks for update even when on the latest version and it kinda blocks you post login and you'll not be able to see any transactions." ([Play, 1★](https://play.google.com/store/apps/details?id=com.vaibhavkalpe.android.khatabook&reviewId=81e3cbef-788b-41f2-b99f-e50f48db93f4))
4. **The iPhone app lags behind Android.** 6 reviews, App Store only (thin): staff feature missing, slower.
   - "Staff icon is missing for iOS please solve it" ([App Store, 1★](https://apps.apple.com/in/app/khatabook-vyapar-app/id1488204139?see-all=reviews))
   - "My experience was better on the android than on iPhone." ([App Store, 1★](https://apps.apple.com/in/app/khatabook-vyapar-app/id1488204139?see-all=reviews))
5. **Basics that used to be free are now paywalled.** 5 reviews, Play only (thin). Goes to `/replica-launch`.
   - "you can't add more than 3 transaction n you can't take screenshot." ([Play, 1★](https://play.google.com/store/apps/details?id=com.vaibhavkalpe.android.khatabook&reviewId=48487004-44b2-42f2-a915-6644a7a6b7b5))
   - "no option to export entrys without paid subscription." ([Play, 1★](https://play.google.com/store/apps/details?id=com.vaibhavkalpe.android.khatabook&reviewId=a30988a6-091b-4aef-b96b-4f3aab956200))
6. **Entries don't save or sync instantly, and the app won't open offline.** 5 reviews, Play only (thin).
   - "Entries do not backup instantly. SMS goes to customer with old data." ([Play, 1★](https://play.google.com/store/apps/details?id=com.vaibhavkalpe.android.khatabook&reviewId=460a6250-2b59-4bec-a257-e18a7f65b37c))
   - "The app does not open without internet." ([Play, 2★](https://play.google.com/store/apps/details?id=com.vaibhavkalpe.android.khatabook&reviewId=13714dbe-da0f-4123-8a7a-b6b6952216d9))
7. **The app demands SMS, location and SIM permissions before it will open.** 3 reviews, Play only (thin, but all 1★ and angry).
   - "if I do not allow it then I am not able to access the application and now I am unable to see all my transactions in it." ([Play, 1★](https://play.google.com/store/apps/details?id=com.vaibhavkalpe.android.khatabook&reviewId=7d1e0da2-3b11-4e93-9ea5-9cc7fa036217))
8. **Features were removed: QR collection and the CashBook app.** 5 reviews, 2 sources.
   - "They removed the QR code feature, making digital collection impossible." ([Play, 1★](https://play.google.com/store/apps/details?id=com.vaibhavkalpe.android.khatabook&reviewId=67816699-b9d5-44f3-badf-f1200f90293a))
9. **Support doesn't resolve problems.** 4 reviews, 2 sources.
   - "when I call or msg to khatabook support, received only one message \"please wait more\"." ([Trustpilot, 1★](https://www.trustpilot.com/review/www.khatabook.com))

## 2. What is missing

1. **Payment mode on every entry (Cash / UPI / Bank) and a cash-vs-online report.** 5 reviews, Play only (thin on sources). These come from happy users, so the ranker scores the theme low, but it is the most consistent named request in the sample.
   - "please add a Payment Mode option (Cash/Online/UPI/Bank Transfer) while entering transactions. Also, when downloading or sharing transaction reports in PDF format, please include a separate column showing the payment mode." ([Play, 4★](https://play.google.com/store/apps/details?id=com.vaibhavkalpe.android.khatabook&reviewId=881ae68b-d19c-4243-9ffc-2128863853b6))
2. **Bill-level tracking.** 7 reviews, 2 sources: bill number, whether a bill is settled, days overdue, pinned parties, accurate profit after discounts.
   - "don't get a bill no entry section for a party or supplier. so I can't find the particular bill no is settled or not." ([Play, 1★](https://play.google.com/store/apps/details?id=com.vaibhavkalpe.android.khatabook&reviewId=2493bf99-df13-4018-ade7-5a7cbab925b8))
   - "the overdue date of all the bills that we add can be shown" ([Play, 4★](https://play.google.com/store/apps/details?id=com.vaibhavkalpe.android.khatabook&reviewId=9c153b02-3df7-4fcf-b2a5-42de227bc40f))
3. **Control over the data.** 6 reviews, 2 sources: export or import, clear a settled customer's history, move a customer between books, exclude a bad debt from totals without deleting it.
   - "give an option other than delete for a transaction to exclude it from total sum." ([Play, 4★](https://play.google.com/store/apps/details?id=com.vaibhavkalpe.android.khatabook&reviewId=587d61a7-a693-4899-8b53-c688c2c7b99c))
   - "puri history dilit karneka option do" ([App Store, 5★](https://apps.apple.com/in/app/khatabook-vyapar-app/id1488204139?see-all=reviews))
4. **Inventory and billing details.** 7 reviews, 2 sources: half-kg units, barcode billing, picking inventory items on a customer entry.
5. **Staff attendance and salary.** 4 reviews, 2 sources: auto-attendance, editing salary and back-dated entries, missing on iOS.
6. **Interest calculation for people who lend.** 2 reviews, 2 sources (thin).

## 3. What is unsolved (positioning)

- **The shopkeeper who wants only a khata, not a lender.** Calls, loan prompts and SMS-reading permissions together make up 14 reviews across 2 sources. Khatabook pays for itself through lending, and its own reviewers say that is what pushes them away. A ledger that never sells loans is a clear stance that is hard for Khatabook to copy.
- **The counter-speed user with patchy internet.** Lag, hangs, "does not open without internet" and late backups make up 15 reviews across 2 sources. A kirana counter needs a two-second entry, not a network round trip.
- **The simple user left behind by a growing product.** People ask to bring back CashBook and complain about the "messy interface instead of a clean, step-by-step process". This is thin (about 3 reviews), but it points the same way as the two above.

---

## 4. Fix plan

Ranked by evidence × how cheap it is to fix.

| # | build or change | size | skill | evidence |
| --- | --- | --- | --- | --- |
| 1 | **No-loan, no-calls, minimal-permission promise.** No SMS, SIM or location permission. Contacts are optional, asked for only when adding a customer. No lending upsell anywhere. Marketing contact is opt-in, with a one-tap opt-out in Settings. | S | replica-backend (permissions, consent), replica-brand (the promise) | calls 7 + loans 4 + permissions 3 = 14 reviews, 2 sources |
| 2 | **Offline-first ledger.** A local database on the phone, so entries save instantly with no network. Sync runs in the background with a visible "synced" tick, and reminder SMS/WhatsApp messages are sent only after sync, so customers never get old balances. Target: app open to entry saved in under 2 s on a low-end Android. | L | replica-architect (sync model), replica-backend | performance 10 + sync 5 = 15 reviews, 2 sources |
| 3 | **Never block reading the ledger.** Updates show as a soft banner, checked against the store's live version. A forced update is only for a security fix, and even then the ledger stays readable. | S | replica-build | 6 reviews, 1 source |
| 4 | **Payment mode on every entry and expense** (Cash / UPI / Bank / Other), with a cash-vs-online summary and a column for it in PDF statements. | S | replica-build | 5 reviews, 1 source (thin on sources, consistent) |
| 5 | **Bill-level tracking.** Optional bill number and due date per entry, a settled/unsettled state, days overdue, pinned parties, and a "doubtful" flag that keeps an entry but leaves it out of totals. | M | replica-architect (schema), replica-build | bills 7 + exclude-from-total, 2 sources |
| 6 | **Your data is yours.** Free CSV/PDF export, a full backup file, import, clearing a settled customer's history, and moving customers between books. | M | replica-backend | 6 reviews, 2 sources; the "export behind paywall" complaint |
| 7 | **The same features on iOS and Android from day one.** One cross-platform codebase, so staff and other features ship on both at once. | M | replica-architect | 6 reviews, 1 source (thin) |

Pricing ("199 is too much", entry caps) goes to **`/replica-launch`**: unlimited entries free, never charge for the basic ledger.

Not in the plan yet: QR collection with auto-reconciliation (6 reviews, 2 sources, counting the 2022 Trustpilot payment complaint, but it needs a payments partner and carries settlement risk, size L) and staff attendance (worth a later release).

---

## 5. The angle

**A. Recommended**
> For kirana and retail owners who are tired of loan calls and an app that wants to read their SMS, **[our app]** is a khata that only keeps your khata: no loans, no sales calls, no SMS access, ever.
> Evidence: sales calls + loan push + permissions, 14 reviews across 2 sources.

**B.**
> For shopkeepers who lose customers at the counter waiting for a laggy app, **[our app]** saves every entry in under two seconds, even with no internet.
> Evidence: performance + sync, 15 reviews across 2 sources.

**C.** (thin)
> For small shops who were promised a free ledger and then hit a paywall, **[our app]** keeps unlimited entries and export free forever.
> Evidence: paywall, 5 reviews, 1 source (thin).

**I recommend A, with B as the proof point.** A is the one promise Khatabook's business model stops it from matching. B is what people will feel in the first minute, and fix #2 delivers it. Do not use "Khatabook" or "khata book" in our app name, ads or store listing. "Khata" on its own is a generic word, but check it with a trademark search in `/replica-brand`. A comparison page is a question for an Indian lawyer.

Reviewers' words are research only. Do not put them on the landing page.
