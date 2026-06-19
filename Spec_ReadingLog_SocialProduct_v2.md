# Reading Log Social Product — Spec v2

A followable, honest record of the reading and consuming that counts nowhere else, and why. Working name TBD. This is a product spec, not a build plan. It captures the thesis, the audience, the core object, the feature set, the data model, and the deliberate non-features. It carries the decisions made across the builds-hub sessions that produced it.

Changes from v1: the product's job widened from selective signaling to an honest record that also signals. The category was sharpened. Books are excluded on purpose. Multimedia is in the thesis but sequenced after text. The profile gained a metric and a texture view. Social comparison was reinstated as a deliberate, motivating feature rather than a risk to suppress. The anchor metric is left as a named open question with the reasoning attached.

## The category: content that counts nowhere else

The product is for the reading and consuming that has no home and registers nowhere as something a person did and thought about. The essay, the longform article, the policy report, the preprint, the poem, the chapter, and later the video essay and the podcast episode. The defining trait is homelessness, not format: this is the content that existing tools do not let a person record and be seen recording.

Books are excluded on purpose. Goodreads already owns the book. Including books would blur what the product is for and make it read as a Goodreads competitor, which it is not. The exclusion is a positioning and culture decision, chosen for clarity, accepted as a deliberate trade against completeness. A person who reads books and essays will have their book reading live elsewhere, the way a Letterboxd user's television viewing lives elsewhere, and the clarity is worth the partial picture.

The boundary rule that follows: the unit is the discrete piece, not the completed work. A chapter counts, because reading one chapter is exactly the discrete, non-completion reading the product exists for, whether or not the book is finished. The completed book as a unit is out, because that is the Goodreads behavior. The test for any form is whether it has a home already, not whether it is text.

Multimedia (video essays, podcast episodes) is part of the thesis but sequenced after text. The logging mechanic is identical across forms (paste a URL, fetch metadata, add a take), so multimedia is cheap to add later and adds mostly noise if rushed in at launch. Text-first launch lets the seed community form a legible culture before the feed becomes heterogeneous. Multimedia is the proven second expansion, not a launch form.

## One-sentence pitch

The place where the reading and watching and listening that counts nowhere else finally counts, where it is reflected back to you honestly and beautifully, and where what the people you trust are paying attention to, and why, becomes a followable record instead of disappearing into a feed.

## The job the product does

The product does two jobs at once, and the central design achievement is reconciling them rather than choosing between them.

First, the personal-record job. A person reads a lot, but often not books, and the existing tools and the cultural script tell them they do not read. The product gives them an honest, comprehensive record that reflects their reading back as substantial and real, so they can re-identify as someone who reads. This is the emotional core.

Second, the signaling-and-discovery job. People curate and share what they read to express how they think, and they follow people whose attention they trust to find what to read next. This is the social engine.

These jobs are in tension. A comprehensive record pulls toward capturing everything. A social feed pulls toward curation, because an unfiltered firehose of everything a person reads is noise to followers. The product resolves the tension by leaning on a tight network rather than on a curation step: logs are public by default (the Letterboxd-diary model), so the record and the feed are the same set, and the feed stays signal because the people in it are few and trusted, not because each log was individually chosen for broadcast. The signal is who-read-what among people whose attention you trust. A private opt-out is a planned later release valve, not a launch-time curation mechanic.

## What counts, and what equal footing means

Within the category, no form is second-class. This is the anti-Goodreads thesis, narrowed. Goodreads makes the book the only unit that counts, so a month of heavy essay, article, and poetry reading registers as zero, and the reader is told they did not read. The shame is not "I read a small amount," it is "the thing I did does not count at all." The fix is to make every in-category form count the same way and display with the same dignity: an essay, a poem, a chapter, a longread, a report, a short story, and later a video essay or a podcast episode, all logged the same way and shown with equal weight.

The product is not comprehensive in the sense of recording everything a person reads, because books are deliberately out (see the category section). It is honest within its category: of the reading that counts nowhere else, none is privileged over any other.

Capture stays deliberate. A person logs the things they actually read, on the order of five to fifteen discrete pieces a week, by hand. The deliberate act of logging is what encodes "I read this, and it counted," and that encoding is the emotional payload. The product does not run passive or automatic capture at launch. Deliberate logging is a feature, not a limitation, and holding that line is what keeps the product from sliding into the read-later category and becoming a guilt repository of things opened and abandoned.

## The audience wedge

Launch into the cross-sector and changemaker network: people in philanthropy, impact investing, policy, social enterprise, higher-education innovation, and AI-adjacent nonprofit and governance work. These people read constantly and already broadcast what they read, but they do it in Slack, on LinkedIn, and in newsletters, where it is ephemeral and tied to an algorithmic feed.

This wedge has two consequences that shape the product.

The corpus is identifier-friendly. This audience reads reports, working papers, preprints, policy pieces, and academic-adjacent longreads. Much of this content carries DOIs or lives in open-access repositories, which makes both the canonical-work model and the free-version feature stronger and easier than they would be for a general or literary audience.

The reading is instrumental, not performative. This audience reads to make decisions and arguments, and the fact that a trusted peer read a given report or essay is itself the signal, regardless of whether they comment. So the unit of currency is the log, not the take. "Four people you follow read this" is the discovery moment. A take, when someone bothers to write one, is a welcome bonus, not the point. The card is built around the piece and the person who read it, with the take as a small optional addition.

The wedge is a starting point, not a ceiling. Adjacent rings (literary and arts, broader thoughtful readers) can recognize themselves in the product later. They are not the launch audience, because seeding is hand to hand and density matters more than breadth at the start.

## The atomic object: the log

A log is one person recording one piece they have read. It has these parts.

A piece reference. The user pastes a URL or identifies a book. The system fetches title, author, source, and image from OpenGraph metadata, or from a book metadata source, and resolves the canonical work (see data model). The user can log any form of reading.

A form. Whether the piece is an essay, article, chapter, poem, report, short story, or other. Books as a completed unit are not a form (see the category section); a chapter is. The form is honored equally across the product. It also drives display texture (see profile) and informs the reading metric (see open question). The form field is built to accept later values (video essay, podcast episode) without a data-model change.

A take. An optional short note. Most logs do not have one, and that is the norm: a person logs a piece because they read it, not because they have a comment. When present, the take is a small secondary element on the card, not its center. The take does not gate sharing (see below) and is not the unit of signal. This is a correction from an earlier draft that treated the take as the engine of the feed; in practice the founder, like most people, logs what they read without reviewing it, so the signal is the log itself, not the commentary.

A rating. Optional and visually minor. Present for people who want it, never the center of the card.

A free-version link, when available. Where a legitimate open-access copy exists, the log surfaces it (see free-version feature).

A timestamp. Logs are ordered chronologically on the personal record.

A log is public by default. Logging a piece is the act of sharing it. The record and the feed draw from the same set of logs, with no separate share step and no take required. This is the Letterboxd-diary model: you log a piece because you read it, and the people who follow you see it. A private opt-out (mark a log private so it stays off the feed) is a planned later addition, deferred for now, architected to be a small change (a flag on the log, a filter in the feed query). The reason to keep public-by-default at the core is friction: any per-log share decision is friction, and friction is what kills a logging habit. The product matches how people actually behave, which is log and move on.

## Core surfaces

### The log card

The single repeating unit across the product. Shows source image, title, author, source, form, and (in the feed) who read it, with the take as a small optional element when present and an optional small rating. Most cards have no take, and that is normal. Tapping the card opens the work page. The card must look finished and beautiful the instant it lands, because the aesthetic payoff is part of why deliberate logging feels good.

### The profile (a person's reading record)

The artifact that does the emotional work. A chronological, aesthetically considered record of everything a person has logged, across all forms, none privileged over another. It must be more beautiful and easier to navigate than Goodreads or Letterboxd profiles.

The profile reflects a reading life back in two complementary ways.

Texture. The chronological record is designed so that the variety of forms is visible as you move through it. A poem reads differently from a chapter reads differently from a report. The point is that a person can see the richness and range of their reading, not just a list, without any number being involved. Texture has no failure state: a slow season simply shows a shorter, varied, still-elegant record.

Quantity. The profile also tracks how much has been read, through a form-neutral metric so that all reading contributes and no form is privileged. Showing quantity is a deliberate decision, reversed from an earlier draft. The reasoning: the guilt mechanism on Goodreads comes from the book being the only unit that counts, not from the existence of a number. Once every form counts, an honest measure of how much a person read is a truer and kinder mirror than Goodreads ever offered. Reading cadence naturally varies, slower seasons are a normal part of a reading life, and a metric that reflects them honestly is not an indictment. The specific anchor metric is an open question (see below).

Comparison is allowed and treated as motivating, not corrosive. Seeing your reading add up, and seeing what others read, can drive a person to read more and to read more widely. This is a feature, not a risk to suppress. The product should let people see their own quantity over time and compare with others in ways that encourage rather than shame.

### The feed

What the people you follow have logged, in reverse chronological order. Not algorithmic. The feed is the discovery engine. Because logs are public by default, the feed is simply the logging activity of the people you follow, and its signal comes from who is in the network rather than from a per-log curation step. The feed's quality is therefore almost entirely a function of who is in the network, which is why seeding the right people is the product, not a launch tactic.

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

Multimedia is sequenced, not excluded. Video essays and podcast episodes are part of the category and the thesis, but they are not a launch form. They reuse the identical logging mechanic (paste a URL, fetch metadata, add a take), so they are cheap to add later and add mostly noise if rushed in at launch, where a heterogeneous feed would blur what the product is for before its culture has formed. Text-first launch, multimedia as the proven second expansion. The build stays form-agnostic so the expansion needs no rewrite.

No completed-book logging and no book-count grid. Books as a unit are out of the category on purpose (see the category section). There is therefore no annual-book-count grid, which privileged the book and rewarded a single narrow form anyway. Any quantity celebration is form-neutral across the in-category forms.

No algorithmic feed. The feed is reverse-chronological from who you follow and what they share. Algorithmic ranking is a later, optional consideration and a values question, not a launch feature.

## Competitive position

The read-later category is crowded and consolidating, but every survivor is built for a different job. Readwise Reader, Instapaper, Raindrop, and Matter are capture-and-consume tools built around save-for-later queues, highlight engines, and private archives. Pocket shut down in 2025 and Omnivore in 2024. None of these is a comprehensive social reading record; sharing is a bolt-on where it exists at all.

Goodreads owns the book and is welcome to it. This product does not compete for the book; it deliberately cedes that ground and takes everything else. StoryGraph and Oku improve on Goodreads but remain book-centric, so they do not touch the category either. The broadcast-with-a-take behavior this audience already has lives on LinkedIn and Substack Notes, which offer no permanence, no work pages, no followable reading identity, and an algorithmic feed that buries everything within a day.

The white space is specific and open: nobody owns the honest, form-neutral record of the non-book reading (and later watching and listening) that counts nowhere else, functioning as a followable social graph of what thoughtful people pay attention to and why. The product takes the part of Goodreads and Letterboxd that works, a followable record of taste, and points it at the content that has no home.

## The central risk

This is a cold-start, taste-graph social product, the single hardest consumer category to grow. The social half is empty and pointless until the right people are in it. The supply side (people worth following) is the product; the demand side shows up for them. Letterboxd, Pinterest, and Are.na all took years to find the loop.

The comprehensive personal-record half is less network-dependent and is a hedge: a person can get real value from their own honest reading record before any social graph exists, which gives the product a reason to exist for a single user on day one and a gentler cold-start than a pure social product. That is a meaningful argument for leading new users into the personal-record experience first and letting the social layer accrue.

What de-risks the social half: a founder with a real, dense, warm network in the launch wedge and a genuine reason to convene it. Seeding is hand to hand, sixty to one hundred fifty specific people contacted directly, not a launch post. Whether that convening happens is the live question for the social engine, though the personal-record value reduces the stakes of getting it perfect at launch.

This risk is now more concentrated than in an earlier draft. The take, when it was the engine of the feed, was also a hedge: commentary could make a feed interesting even if the network was thin. Demoting the take to an optional minor feature removes that hedge. With logs public by default and bare, the feed is only as interesting as the people in it, with no commentary layer to add value on top. A bare-log feed from a thin or uninteresting network is dead air; a bare-log feed from people whose attention you trust is exactly the product. So the decision to demote the take, which is correct because it matches how people actually log, raises the stakes on seeding the right network. The network is now the whole game on the social side.

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
