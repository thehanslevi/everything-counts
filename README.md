<p align="center">
  <img src="assets/logo.png" width="120" alt="Everything Counts logo: a rising sun whose disc is a dog-eared page of text">
</p>

# Everything Counts

Built by Hannah Levinson • [hrlevinson.com](https://hrlevinson.com)

A place to log reading that doesn't count anywhere else: articles, blogs, chapters, newsletters, papers, poems, reports, and more. A reminder that the number of books read or on a DNC shelf don't adequately represent a reading life. A way to express yourself as a reader that goes beyond Goodreads.

**Live:** https://everything-counts.vercel.app/ · iOS app in App Store review (a native shell around the same site that logs straight from the share sheet).

Sign up, record what you read, connect with other readers who identify beyond-the-book. Every user has a real account and nothing is seeded; the app runs on Postgres (Supabase) with row-level security behind a thin data-access layer.

## The idea

Reading is so much more than books: It's longform prose, sometimes just an edited chapter via a PDF, a Substack post, or a report skimmed for a meeting. This is where it counts.

Two rules:

Books are out. Here a unit is any other discrete piece of writing. 

A few smaller choices follow from those two. Logs go public the moment you save them, so logging a piece shares it and there's no separate share step (a private option is planned). When several people log the same piece, their logs collect on one work page, "four people you follow read this." Your profile keeps a running count of what you've read and a rough sense of the hours behind it.

## Design

Everything Counts draws on Japanese avant-garde poster art aesthetics for its taxi-yellow field, sumi-ink black, and three clashing accents (vermilion, magenta, electric blue - see the work of Tadanori Yokoo).

The logo is a rising-sun seal: a vermilion disc ringed by radiating beams, ragged text, and a top corner turned down like a dog-eared page. Full spec, palette, and thinking live in [BRAND.md](BRAND.md).

## Stack

- Next.js (App Router), TypeScript, Tailwind, on Vercel.
- Supabase for Postgres and Auth, with row-level security: you write only your own rows, and reads are public by design.
- A data-access layer (`getLogsByUser`, `getFeed`, `getWork`) is the only part of the app that knows the storage is Supabase, so a different backend stays a swap rather than a rewrite.
- One server route reads OpenGraph metadata from a pasted URL to fill in title, author, source, and image.
- iOS is a Capacitor shell around the live site, with a native share extension for logging from anywhere.

## Not built yet

Private-log toggle (the flag already exists in the schema), reprint and edition deduplication, multimedia (i.e. video essays).
