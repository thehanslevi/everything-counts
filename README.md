# Everything Counts

A reading log for everything that isn't a book — essays, articles, reports, poems, chapters. Log what you read, see your own record, and follow what other people are reading.

**Live demo:** https://everything-counts.vercel.app/

Demo-first prototype. Single-user with seeded sample data. Architected so a real database and accounts can be added without a rewrite.

<!--
  Screenshots: drop the two image files into the /docs folder at the paths
  referenced below. Rename the files (and these paths) to whatever you save
  them as — these names are placeholders, not actual files yet.
-->

![The record — your chronological reading log](docs/record.png)

![A work page — several people's logs pooled on one piece](docs/work-page.png)

## What it does

- Log a piece by pasting a URL. Title, author, source, and image are pulled from the page's metadata.
- Your logs form a chronological record (the profile).
- Logs are public by default, so they also appear in a feed for the people who follow you.
- When several people log the same piece, their logs pool on one work page ("four people you follow read this").

## Product decisions

- **No books.** Goodreads already does books. This is for the reading that isn't tracked anywhere. The unit is the discrete piece — a chapter counts, a finished book doesn't.
- **The log is the signal, not a review.** Written "takes" are optional and minor. Most people log what they read without reviewing it. Discovery is built on who read what, not on commentary.
- **Public by default.** Logging a piece shares it. No separate share step. A private option is planned but deferred.
- **Canonical-URL clustering, not full deduplication.** Logs resolve to a shared work by normalized URL. Cross-edition/reprint matching is a later migration; the data model points at a work ID rather than a raw URL so that stays a migration, not a rewrite.

## Stack

- Next.js (App Router), TypeScript, Tailwind, deployed on Vercel.
- A data-access layer (`getLogs`, `getFeed`, `getWork`) sits between the app and storage. Storage is seeded/in-memory for the demo; a real database plugs in behind that layer.
- One server route fetches link metadata (OpenGraph) from a pasted URL.
- Built and deployed in phases: empty deploy first, then logging, profile, feed, work pages.

## Out of scope (for now)

Real auth and accounts, a persistent database, rich deduplication, a reading metric, multimedia (video essays, podcasts), and an algorithmic feed. Each was left out deliberately; the architecture leaves room for them.

## Design

Swiss-brutalist: black rules, one accent color, large grotesque display type, square corners. Space Grotesk for structure, a serif for the reading itself.
