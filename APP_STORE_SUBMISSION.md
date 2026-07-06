# App Store submission kit — Everything Counts

Everything below is ready to paste into App Store Connect. Build 2 is already
uploaded.

**Screenshots** are in `/screenshots`, five each at both accepted sizes with no
alpha channel (App Store Connect rejects transparency):
- `screenshots/iphone-6.9/` — 1320×2868 (upload these; it's the slot ASC leads with)
- `screenshots/iphone-6.7/` — 1290×2796 (use if ASC shows a 6.7" slot instead)

Regenerate anytime with `node scripts/make_screenshots.mjs`.

---

## App Review Information (THE most important part — paste verbatim)

**Sign-in required:** Yes. **Demo account:**

- **Username:** `appreview@everythingcounts.app`
- **Password:** `ReadEverything2026`

**Notes:**

> This account has a populated reading record and follows another user, so the
> feed, profiles, and work pages are all populated for review.
>
> NATIVE FUNCTIONALITY (beyond the website):
> • Share Extension — in Safari or any app, tap Share → "Log to Everything
>   Counts" to log the current page directly into the app. This is the app's
>   core native feature and the reason it exists on iOS.
> • Native bottom tab navigation and pull-to-refresh.
>
> USER-GENERATED CONTENT (Guideline 1.2): every profile has a ••• menu to
> REPORT that person or any of their logs, and to BLOCK them. Blocked users are
> hidden across the feed, search, and all discovery surfaces. Community-conduct
> terms and a contact method are published at
> https://everything-counts.vercel.app/privacy
>
> ACCOUNT DELETION (Guideline 5.1.1): available in-app on the user's own
> profile page, under "Account" — type your handle to confirm, permanent delete.

---

## Listing text

**Name:** Everything Counts: Reading Log

**Subtitle (≤30):** Log the reading that counts

**Promotional text (≤170):**
> The essay, the article, the report, the poem, the chapter — everything you
> read counts here. Log it, watch your record add up, follow what people you
> trust read.

**Description:**
> Everything Counts is a reading log for everything that isn't a book — the
> essay, the article, the report, the poem, the chapter, the longread. The
> reading that counts nowhere else counts here.
>
> Log a piece by pasting a link, or straight from Safari's share sheet. Title,
> author, and source are pulled in automatically. Pick a form, add a take if
> you have one (most of the time you won't, and that's fine), and it's on your
> record.
>
> Your record is a full picture of your reading. A form-neutral count shows how
> much you've read without privileging any one kind of reading.
>
> Follow people whose attention you trust and see what they're reading — a
> reverse-chronological feed, no algorithm. When several people log the same
> piece, it pools onto one page, so discovery happens through the people you
> trust instead of a ranking.
>
> No books (Goodreads has those). No read-later pile. No ads, no trackers, no
> algorithm.
>
> Everything Counts is free.

**Keywords (≤100):**
`reading,log,essays,articles,longreads,journal,tracker,poetry,readlist,record,follow,feed,notes`

**Support URL:** https://everything-counts.vercel.app/support
**Marketing URL:** https://everything-counts.vercel.app
**Privacy Policy URL:** https://everything-counts.vercel.app/privacy

**Category:** Primary = Social Networking · Secondary = Books

**Price:** Free

---

## App Privacy (the "nutrition label" — Data collection questionnaire)

Answer "Yes, we collect data," then declare exactly:

- **Contact Info → Email Address:** Linked to identity · Purpose: App
  Functionality · NOT used for tracking.
- **User Content → Other User Content** (logs, takes, ratings): Linked ·
  App Functionality · Not tracking.
- **Identifiers → User ID:** Linked · App Functionality · Not tracking.

Everything else: **No.** No data used to track. No third-party advertising.

---

## Age rating questionnaire

- **User-Generated Content:** Yes → note there are moderation controls
  (reporting + blocking). Expect this to land around 17+ (Apple defaults social
  UGC apps high); that's fine.
- Everything else (violence, sexual content, gambling, etc.): **None.**
- Unrestricted web access: **No** (the app loads only everything-counts).

---

## Export compliance

Already answered by the build (`ITSAppUsesNonExemptEncryption = false`, in
build 2). No prompt should appear.

---

## Step-by-step

1. App Store Connect → My Apps → your app.
2. **App Information:** set category, Privacy Policy URL, Support URL.
3. **Pricing:** Free.
4. Create the **1.0 version** → paste Subtitle, Promotional text, Description,
   Keywords; upload the five screenshots from `screenshots/iphone-6.9/`.
5. **App Privacy:** fill the data questionnaire above.
6. **Age rating:** fill the questionnaire above.
7. **Build:** attach build 2.
8. **App Review Information:** paste the demo account + notes (top of this
   doc). This is the box that prevents a login-wall rejection.
9. **Submit for Review.**

Optional external TestFlight (public link for the linktr.ee) is a separate
flow: TestFlight tab → create an External group → add build 2 → fill Test
Information (below) → submit for Beta App Review → enable Public Link.

### TestFlight "Test Information" fields

**Beta App Description:**
> Everything Counts is a reading log for everything that isn't a book —
> essays, articles, reports, poems, chapters, longreads. Paste a link, or
> share one from Safari, and it lands on your record. Pick a form, add a take
> if you want, and it's logged. Follow people and their reading shows up in
> your feed. When more than one person logs the same piece, it pools onto one
> page.
>
> This is an early beta. Expect rough edges and changes between builds.

**What to Test:**
> - Log a few pieces, including from Safari's share sheet: Share → Log to
>   Everything Counts.
> - Move between the tabs and pull down to refresh.
> - Follow someone and check your feed.
> - Edit or delete one of your logs.
> - Tell me anything that felt slow, confusing, or broken.

**Feedback email:** (your email)

---

## Known rejection risks, and how this kit answers them

- **4.2 "just a website":** the review notes point the reviewer at the share
  extension, and screenshot #2 shows it.
- **1.2 UGC moderation:** report + block are built, verified, and cited.
- **5.1.1 account deletion:** built and cited.
- **Login wall:** demo account provided.
