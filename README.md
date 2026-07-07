<p align="center">
  <img src="assets/logo.png" width="120" alt="Everything Counts logo: a rising sun whose disc is a dog-eared page of text">
</p>

# Everything Counts

Built by Hannah Levinson • [hrlevinson.com](https://hrlevinson.com)

A place to log the reading that never counts anywhere else: the essays, articles, reports, poems, and chapters you read closely but that never land on a Goodreads shelf. Log a piece, keep a record of it, and see what the people you follow are reading.

**Live:** https://everything-counts.vercel.app/ · iOS app in App Store review (a native shell around the same site that logs straight from the share sheet).

Sign up, claim a handle, log what you read, follow people. Everyone on it has a real account and nothing is seeded; it runs on Postgres (Supabase) with row-level security behind a thin data-access layer.

## The idea

Most of what people read now isn't books. It's a long essay someone linked, a chapter of a PDF, a Substack post, a report skimmed before a meeting. That reading vanishes. No shelf, no record, nothing to show it counted. This is where it counts.

Two rules shape the whole thing.

Books are out. Goodreads already owns the finished book, and the finished book is a clumsy unit anyway. Here the unit is the discrete piece. A chapter counts. A finished book doesn't.

Logging is the point; reviewing is optional. You don't owe anyone a take. Most logs are just the fact of having read something, and that fact is the signal the app is built on: who read what, rather than who had an opinion about it. When you do want to add a line, it stays small and quiet.

A few smaller choices follow from those two. Logs go public the moment you save them, so logging a piece shares it and there's no separate share step (a private option is planned). When several people log the same piece, their logs collect on one work page, "four people you follow read this." Your profile keeps a running count of what you've read and a rough sense of the hours behind it.

## Design

Loud on purpose. Everything Counts wears a Japanese-poster identity in a category that otherwise runs on beige and white space. Taxi-yellow field, sumi-ink black, and three clashing accents (vermilion, magenta, electric blue) in the mode of Tadanori Yokoo.

The logo is a rising-sun seal: a vermilion disc of ragged text, ringed by radiating beams, its top corner turned down like a dog-eared page. The sun is the record; the folded corner is the reader's hand. The full spec, palette, and the thinking behind it live in [BRAND.md](BRAND.md).

## Stack

- Next.js (App Router), TypeScript, Tailwind, on Vercel.
- Supabase for Postgres and Auth, with row-level security: you write only your own rows, and reads are public by design.
- A data-access layer (`getLogsByUser`, `getFeed`, `getWork`) is the only part of the app that knows the storage is Supabase, so a different backend stays a swap rather than a rewrite.
- One server route reads OpenGraph metadata from a pasted URL to fill in title, author, source, and image.
- iOS is a Capacitor shell around the live site, with a native share extension for logging from anywhere.

## Not built yet

The private-log toggle (the flag already exists in the schema), reprint and edition deduplication, multimedia like video essays and podcasts, and any kind of ranked or algorithmic feed. Each was left out on purpose, with room in the architecture to add it later.
