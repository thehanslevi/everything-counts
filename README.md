<p align="center">
  <img src="assets/logo.png" width="120" alt="Everything Counts logo: a rising sun whose disc is a dog-eared page of text">
</p>

# Everything Counts

Built by Hannah Levinson • [hrlevinson.com](https://hrlevinson.com)

A place to log reading that doesn't count on Goodreads: articles, blogs, chapters, essays, newsletters, papers, poems, reports.

[everything-counts.vercel.app](https://everything-counts.vercel.app/) · [Download on the App Store](https://apps.apple.com/app/id6787774280)

## Stack

- Next.js (App Router), TypeScript, Tailwind, on Vercel.
- Supabase for Postgres and Auth, with row-level security: you write only your own rows, and reads are public by design.
- A data-access layer (`getLogsByUser`, `getFeed`, `getWork`) is the only part of the app that knows the storage is Supabase, so a different backend stays a swap rather than a rewrite.
- One server route reads OpenGraph metadata from a pasted URL to fill in title, author, source, and image.
- iOS is a Capacitor shell around the live site, with a native share extension for logging from anywhere.

## Not built yet

Private-log toggle (the flag already exists in the schema), reprint and edition deduplication, multimedia (i.e. video essays).
