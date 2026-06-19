# Build Brief — Reading Log, First Demo Build

This brief is for Claude Code. It describes the first build of a reading-log product. The full product spec lives alongside this file (Spec_ReadingLog_SocialProduct_v2.md) and explains the why; read it for context, but build only what this brief scopes. When the brief and the spec disagree on scope, the brief wins, because the spec describes the eventual product and this brief describes only the first slice.

## What this build is for

This is a demo-first build. The goal is a deployed, good-looking, clickable web app that proves the core reading-log loop and looks like a real product when shown to someone. It is not yet a multi-user launch product. Prioritize, in this order: it deploys live to a real URL, it looks genuinely designed rather than boilerplate, the core loop works end to end, and the code is structured so a real database can be added later without a rewrite.

## Stack

- Next.js (App Router), TypeScript.
- Tailwind for styling.
- Deployed to Vercel from a GitHub repo (account: thehanslevi).
- No database yet. All data lives in a clean data-access layer backed by seed files and in-memory/local state. The rest of the app must talk to this data layer through functions (for example getLogs, addLog, getFeed, getWork), never directly to the storage, so that swapping in a real database (Supabase/Postgres) later is a contained change.
- One Next.js server route for fetching link metadata (title, author, source image) from a pasted URL, since browsers cannot fetch other sites' metadata directly.

## Scope: build these phases in order. Stop after each phase and confirm it works before starting the next.

### Phase 0: scaffold and deploy empty

Create the Next.js app, initialize the git repo, push to a new GitHub repo, and deploy to Vercel so a near-empty placeholder page is live at a real URL. Do not build features yet. The point is to prove the GitHub-to-Vercel pipeline works before any feature code exists, so later failures are never ambiguous between code and deployment. Confirm the live URL loads before moving on.

### Phase 1: log a piece

A user can paste a URL. The server route fetches title, author, source name, and lead image from the page's OpenGraph metadata. The user picks a form (essay, article, chapter, poem, report, short story, book, other), optionally adds a short take and an optional rating, and saves. The saved log is stored through the data layer. Books can be entered manually (title and author) without a URL.

### Phase 2: the profile (personal record)

A chronological view of everything the current user has logged, newest first. Each entry renders as a beautiful card: source image, title, author, source, form, the take when present, an optional small rating. All forms are displayed with equal weight; books are not privileged over anything else. This screen carries the emotional weight of the product, so it must look considered and be pleasant to scroll. No counts or metrics in this build; chronological texture only.

### Phase 3: a populated feed

A feed showing logs shared by a few seeded fictional users ("people you follow"), newest first. Seed with realistic-looking data (plausible names, real-ish article titles and sources, varied forms, real takes) so the feed looks alive and full. Not algorithmic, just reverse chronological. The current user's own shared logs appear here too.

### Phase 4: work pages

Each logged piece resolves to a work page via its normalized canonical URL (strip tracking parameters, collapse query junk). When more than one user has logged the same piece, the work page pools their takes and ratings and shows who logged it. This is what makes "several people read this" possible.

## Explicitly out of scope for this build

Do not build any of these, even though the spec describes them, because they belong to later builds:

- Real user accounts, login, or auth. This is effectively single-user plus seeded fictional users.
- A real database. Seed and in-memory only, behind the data layer.
- The free-version / open-access link feature (Unpaywall and similar).
- Rich deduplication across editions and reprints. Canonical-URL clustering only.
- Any reading metric or quantity counter.
- Multimedia (podcasts, video).
- An algorithmic feed.

## Design direction

Better looking and easier to navigate than Goodreads and Letterboxd. Editorial and calm, generous whitespace, strong typography, the logged piece as a beautiful object. Restrained and considered, not a busy social-media feed. Use a coherent type scale and a small, intentional color palette. Avoid default-framework look.

## Working agreement

- Work one phase at a time. After each phase, commit to git, push, and confirm the live deploy reflects the change. Tell me the live URL each time it changes.
- Keep the data-access layer clean and documented, because it is the seam a real database plugs into later.
- When a decision is ambiguous and would be expensive to reverse, ask me rather than guessing.
- Match the product spec's voice in any user-facing copy: flat declarative sentences, no em dashes doing structural work, plain language.
