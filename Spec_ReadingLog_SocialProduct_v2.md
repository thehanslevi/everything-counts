# Reading Log Social Product — Spec v2

A followable, honest record of everything a person reads, and why. Working name TBD. This is a product spec, not a build plan. It captures the thesis, the audience, the core object, the feature set, the data model, and the deliberate non-features. It carries the decisions made across the builds-hub sessions that produced it.

Changes from v1: the product's job widened from selective signaling to a comprehensive reading record that also signals. "Comprehensive" was redefined. The profile gained a metric and a texture view. Social comparison was reinstated as a deliberate, motivating feature rather than a risk to suppress. The anchor metric is left as a named open question with the reasoning attached.

## One-sentence pitch

The place where everything you read counts, where your reading life is reflected back to you honestly and beautifully, and where what the people you trust are reading, and why, becomes a followable record instead of disappearing into a feed.

## The job the product does

The product does two jobs at once, and the central design achievement is reconciling them rather than choosing between them.

First, the personal-record job. A person reads a lot, but often not books, and the existing tools and the cultural script tell them they do not read. The product gives them an honest, comprehensive record that reflects their reading back as substantial and real, so they can re-identify as someone who reads. This is the emotional core.

Second, the signaling-and-discovery job. People curate and share what they read to express how they think, and they follow people whose attention they trust to find what to read next. This is the social engine.

These jobs are in tension. A comprehensive record pulls toward capturing everything. A social feed pulls toward curation, because an unfiltered firehose of everything a person reads is noise to followers. The product resolves the tension by separating what you log from what you broadcast: capture can be comprehensive, the feed stays curated, and the same log action feeds both. A log lives on your personal record by default; adding a take, or explicitly sharing, promotes it into the social feed.

## What "comprehensive" means

Comprehensive does not mean capture everything automatically. It means no reading is second-class.

This is the anti-Goodreads thesis. Goodreads makes the book the only unit that counts, so a month of heavy essay, article, and poetry reading registers as zero, and the reader is told they did not read. The shame is not "I read a small amount," it is "the thing I did does not count at all." The fix is not to hide volume. The fix is to make volume honest about what reading actually is. An essay counts. A poem counts. A chapter counts. A longread, a report, a short story all count, logged the same way and displayed with the same dignity as a book.

Capture stays deliberate. A person logs the things they actually read, on the order of five to fifteen discrete pieces a week, by hand. The deliberate act of logging is what encodes "I read this, and it counted," and that encoding is the emotional payload. The product does not run passive or automatic capture at launch. Deliberate logging is a feature, not a limitation, and holding that line is what keeps the product from sliding into the read-later category and becoming a guilt repository of things opened and abandoned.

## The audience wedge

Launch into the cross-sector and changemaker network: people in philanthropy, impact investing, policy, social enterprise, higher-education innovation, and AI-adjacent nonprofit and governance work. These people read constantly and already broadcast what they read, but they do it in Slack, on LinkedIn, and in newsletters, where it is ephemeral and tied to an algorithmic feed.

This wedge has two consequences that shape the product.

The corpus is identifier-friendly. This audience reads reports, working papers, preprints, policy pieces, and academic-adjacent longreads. Much of this content carries DOIs or lives in open-access repositories, which makes both the canonical-work model and the free-version feature stronger and easier than they would be for a general or literary audience.

The reading is instrumental, not performative. This audience shares a piece to make a point, not to perform taste. So the take matters more than the rating. "I read this" carries little signal in this crowd. "I read this and here is the one thing it changed" is the unit of currency. The social card is built around the take, not the star.

The wedge is a starting point, not a ceiling. Adjacent rings (literary and arts, broader thoughtful readers) can recognize themselves in the product later. They are not the launch audience, because seeding is hand to hand and density matters more than breadth at the start.

## The atomic object: the log

A log is one person recording one piece they have read. It has these parts.

A piece reference. The user pastes a URL or identifies a book. The system fetches title, author, source, and image from OpenGraph metadata, or from a book metadata source, and resolves the canonical work (see data model). The user can log any form of reading.

A form. Whether the piece is an essay, article, chapter, poem, report, short story, book, or other. The form is honored equally across the product. It also drives display texture (see profile) and informs the reading metric (see open question).

A take. A short free-form note answering, in effect, why this mattered or what it changed. On the social card the take is the visual hero. It is not required to log, but adding a take is what promotes a log into the social feed, and the launch community norm rewards it. This is the divergence from the Letterboxd template, which leads with a star rating.

A rating. Optional and visually minor. Present for people who want it, never the center of the card.

A free-version link, when available. Where a legitimate open-access copy exists, the log surfaces it (see free-version feature).

A timestamp. Logs are ordered chronologically on the personal record.

Logging is possible with just the piece reference and form. The take and the act of sharing are what move a log from private record into the public feed.

## Core surfaces

### The log card

The single repeating unit across the product. Shows source image, title, author, source, form, the take as the dominant text when present, an optional small rating, and the free-version link when present. Tapping the card opens the work page. The card must look finished and beautiful the instant it lands, because the aesthetic payoff is part of why deliberate logging feels good.

### The profile (a person's reading record)

The artifact that does the emotional work. A chronological, aesthetically considered record of everything a person has logged, across all forms, none privileged over another. It must be more beautiful and easier to navigate than Goodreads or Letterboxd profiles.

The profile reflects a reading life back in two complementary ways.

Texture. The chronological record is designed so that the variety of forms is visible as you move through it. A poem reads differently from a chapter reads differently from a report. The point is that a person can see the richness and range of their reading, not just a list, without any number being involved. Texture has no failure state: a slow season simply shows a shorter, varied, still-elegant record.

Quantity. The profile also tracks how much has been read, through a form-neutral metric so that all reading contributes and no form is privileged. Showing quantity is a deliberate decision, reversed from an earlier draft. The reasoning: the guilt mechanism on Goodreads comes from the book being the only unit that counts, not from the existence of a number. Once every form counts, an honest measure of how much a person read is a truer and kinder mirror than Goodreads ever offered. Reading cadence naturally varies, slower seasons are a normal part of a reading life, and a metric that reflects them honestly is not an indictment. The specific anchor metric is an open question (see below).

Comparison is allowed and treated as motivating, not corrosive. Seeing your reading add up, and seeing what others read, can drive a person to read more and to read more widely. This is a feature, not a risk to suppress. The product should let people see their own quantity over time and compare with others in ways that encourage rather than shame.

### The feed

What the people you follow have chosen to share, in reverse chronological order. Not algorithmic. The feed is the discovery engine, and it is curated by what people promote into it (via a take or an explicit share), which is what keeps it signal rather than a firehose of every logged item. The feed's quality is a function of who is in the network, which is why seeding the right people is the product, not a launch tactic.

### The work page

Every piece logged by anyone resolves to one work page. The work page pools takes and ratings for that piece, shows who (among people you follow) logged it, and surfaces the free-version link. This is the convergence that turns parallel monologues into shared discovery. "Seven people you follow logged this" only exists because logs resolve to one work.

## The free-version feature

The product surfaces a link to a legitimate, freely available copy of a piece when one exists. It does this through open-access sources only: Unpaywall for scholarly DOIs, author-posted preprints (arXiv and similar), Project Gutenberg and archive.org for public-domain work, and publisher or author permalinks. The system stores the canonical URL a user pastes; it does not run a backend that scrapes, resolves to, or auto-discovers pirated or paywall-circumventing copies.

The framing is access equity for legitimately free work, not paywall circumvention. For the cross-sector and changemaker corpus this is a natural and beloved behavior, because so much of what this audience reads has a legitimate open-access version (the preprint, the working-paper PDF, the author's posted copy). The product helps a reader reach the actual piece instead of a wall, using copies the rightsholder has already made free.

This scoping is a deliberate legal and ethical decision. A feature promising to find non-paywalled or downloadable copies of arbitrary content would read as a piracy-discovery engine, which converts a defensible user-generated-content platform into a target for contributory-liability claims. The open-access-only scope keeps the product's core promise legitimate while preserving the soul of the original idea, which was frictionless access to the real thing rather than a wall.

Sequencing note: the free-version feature is not load-bearing for the core loop, which is log, reflect, share, discover. It adds real engineering surface (open-access source integration, link-rot handling) and should be treated as a fast-follow rather than a launch requirement, even though it sparked the original idea.

## Data model decisions

### Logs point at a work, not a raw URL

Every log carries a work_id rather than embedding the pasted URL directly. This is the single most important architectural decision in the build, because it makes the difference between a feed of disconnected links and a network of shared works, and because it makes rich deduplication a later upgrade rather than a prerequisite.

### Launch: canonical-URL clustering

At launch, work_id is derived from the normalized canonical URL. The system strips tracking parameters, resolves the OpenGraph canonical URL, collapses query-string junk, and follows one redirect hop. Two people who log the same link land on the same work page. This delivers most of the discovery value (pooled takes, "who you follow read this," real work pages) at a fraction of the cost of full deduplication. Books resolve through a book metadata source rather than a URL.

The accepted imperfection: the same piece read at two different URLs (a Substack original and a Medium syndication, for example) will sometimes show as two work pages. This will occasionally feel broken. It is tolerated because it lets the product launch months earlier, keeps the engineering surface finishable, and lets real usage reveal which duplicate cases are common enough to be worth solving.

### Later: rich deduplication as a migration

Because logs already point at a work_id, richer matching is a migration, not a rebuild. The later layer adds DOI-based merging where DOIs exist (strong for this audience's corpus), then title-and-author fuzzy matching for the rest, with a human-in-the-loop merge prompt ("these might be the same piece; merge?") that uses the community to resolve ambiguous cases. The matching rules are learned from real duplicate pairs in the live product rather than guessed cold. Rich, edition-and-reprint-aware deduplication remains the destination; it is sequenced so it cannot sink the launch.

### Completion and the unit of reading

The metric depends on knowing what was actually read, not the full length of a piece someone only partly read. The cleanest approach is to make the log carry the true unit of reading: a chapter is a chapter, a poem is a poem, "this article" is the thing read. This keeps any quantity measure honest rather than flattering, and it is part of why the form field matters. Resolve alongside the anchor-metric question.

## Deliberate non-features

These are excluded on purpose. Each one pulls the product toward the crowded, capture-shaped, private-by-default read-later category where funded incumbents already compete and where products become, in the category's own words, guilt repositories.

No passive or automatic capture at launch. Logging is deliberate. Users will ask for an extension, a Kindle import, auto-capture of every tab. Each request is the product trying to slide toward complete capture, which produces a record indistinguishable from browsing history and reintroduces the abandoned-pile guilt the product exists to fix. Deliberate logging is the feature. Low-friction capture aids (share-sheet, extension, imports) are a later consideration only if they preserve deliberateness.

No read-later queue. The product logs what you have already read. It does not stash what you might read. This is a record-and-publishing product, not a saving product. This line keeps it out of the read-later bloodbath.

No highlight vault or spaced-repetition review. Those are the Readwise and Matter jobs, private-knowledge-system features rather than record-and-signal features.

No multimedia at launch. Podcasts and YouTube can carry signal and can reuse the logging mechanic, but adding them at launch dilutes the legibility the early community needs to know what the product is for. Defer; expand once the loop is proven.

No book-count challenge grid. The Goodreads annual-book-count grid privileges the book and rewards a single narrow form, which is the exact dynamic the product rejects. Any quantity celebration must be form-neutral.

No algorithmic feed. The feed is reverse-chronological from who you follow and what they share. Algorithmic ranking is a later, optional consideration and a values question, not a launch feature.

## Competitive position

The read-later category is crowded and consolidating, but every survivor is built for a different job. Readwise Reader, Instapaper, Raindrop, and Matter are capture-and-consume tools built around save-for-later queues, highlight engines, and private archives. Pocket shut down in 2025 and Omnivore in 2024. None of these is a comprehensive social reading record; sharing is a bolt-on where it exists at all.

Goodreads owns the reading record but only for books, which is precisely the gap this product fills. StoryGraph and Oku improve on Goodreads but remain book-centric. The broadcast-with-a-take behavior this audience already has lives on LinkedIn and Substack Notes, which offer no permanence, no work pages, no followable reading identity, and an algorithmic feed that buries everything within a day.

The white space is specific and open: nobody owns the honest, form-neutral reading record that also functions as a followable social graph of what thoughtful people read and why. The product takes the part of Goodreads and Letterboxd that works (a followable record of taste) and removes the constraint that books are the only thing that counts.

## The central risk

This is a cold-start, taste-graph social product, the single hardest consumer category to grow. The social half is empty and pointless until the right people are in it. The supply side (people worth following) is the product; the demand side shows up for them. Letterboxd, Pinterest, and Are.na all took years to find the loop.

The comprehensive personal-record half is less network-dependent and is a hedge: a person can get real value from their own honest reading record before any social graph exists, which gives the product a reason to exist for a single user on day one and a gentler cold-start than a pure social product. That is a meaningful argument for leading new users into the personal-record experience first and letting the social layer accrue.

What de-risks the social half: a founder with a real, dense, warm network in the launch wedge and a genuine reason to convene it. Seeding is hand to hand, sixty to one hundred fifty specific people contacted directly, not a launch post. Whether that convening happens is the live question for the social engine, though the personal-record value reduces the stakes of getting it perfect at launch.

## Open questions for the next pass

The anchor metric. Which form-neutral measure anchors the profile and makes all reading visibly add up. Candidates and tradeoffs:

- Estimated reading time (minutes, hours). Most intuitive, travels best to the reality that reading looks different for younger readers. Derived from word count where text is available; rougher for books, where it comes from page-count metadata and conversion assumptions.
- Word count. The most precise equalizer, but large numbers can feel abstract, and it under-credits dense, slow, short reading like poetry, where experience is not proportional to length.
- Pieces. Always accurate because the user logged it, and it equalizes a poem and a book as each "one thing read," but it can make a single book look small beside many short pieces.
- A blended unit (pieces plus time). Each metric covers the other's blind spot: pieces honors the act of reading regardless of length, time honors the investment. The satisfying sentence becomes "you read 14 things, about 9 hours." This is the current-leaning option, pending a decision on which sentence is most motivating for the target reader: "I read 14 things," "I read for 9 hours," or both.

The completion unit. The smallest honest unit a person logs, so any metric reflects what was actually read rather than the full length of a partly-read piece. Tied to the metric decision.

Naming and brand voice.

Whether ratings should exist at all at launch, or whether the take alone is cleaner.

The onboarding path that delivers value on day one. Likely the personal-record experience first, given the cold-start hedge above.

Capture surface. Web-first deliberate logging is sufficient and correct at launch. Share-sheet or extension aids are a later consideration, allowed only if they preserve deliberateness.

Whether the work page shows takes from everyone or only from people you follow, plus aggregate counts. A signal-versus-noise and trust question.
