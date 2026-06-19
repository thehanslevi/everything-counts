# Running Log — Reading Log Product

A session-by-session record of decisions and state for the reading-log product (working name TBD). Newest session at top. Companion files: Spec_ReadingLog_SocialProduct_v2.md (product spec) and BuildBrief_ReadingLog_FirstBuild.md (Claude Code build instructions).

---

## Session 4 — Phase 3 shipped, then a thesis correction on the take

### Build progress

**Phase 3 complete and live.** The feed shipped: a /feed route with brutalist tab nav between "Your record" (/) and "Feed" (/feed), 22 cards from 8 users (7 followed + the current user mixed in), reverse chronological, reusing LogCard with an attribution banner. Data model gained a User type and userId + shared on Log; data layer gained getFeed() and getUser(). Verified live.

### Thesis correction: the take is demoted

**The problem.** The Phase 3 seed takes were obviously LLM-written — "quietly" overused, constructions like "the part worth stealing" and "why legibility destroys the thing it measures." LLM voice, not human voice.

**The deeper realization.** The founder doesn't write reviews on Goodreads; she logs what she read and moves on. If the person the product is modeled on doesn't write takes, then "the take is the engine of the feed" was wrong. This overturns a load-bearing spec decision (the take had been the unit of currency, the visual hero of the card, the thing that promoted a log into the feed).

**The correction (broad version, chosen deliberately):**
- The take is demoted from engine to optional minor feature. Most logs have no take, and that is the norm. When present, the take is a small secondary element, not the card's center.
- The unit of signal is who-read-what. "Four people you follow read this" is the discovery moment. The card is built around the piece and the person, not the take.
- Logs are public by default (Letterboxd-diary model). Logging a piece is the act of sharing it; no separate share step, no take required. The record and the feed are the same set of logs. Rationale: any per-log share decision is friction, and friction kills the logging habit. Matches how people actually behave.
- A private opt-out (mark a log private to keep it off the feed) is deferred but architected to be a small later change (a flag on the log, a filter in getFeed). Build auto-share now.

**Cost acknowledged and recorded in the spec.** Demoting the take removes a hedge: when the take was the engine, commentary could make a thin feed interesting. Now the feed is only as good as the network in it, with no commentary layer on top. This concentrates the central risk onto seeding the right network. The network is now the whole game on the social side. The decision is still correct (it matches real logging behavior), but the stakes on the network went up.

**Spec updated this session:** atomic-object section (take demoted, public-by-default added), job-reconciliation section, wedge consequence, card and feed surfaces, central-risk section.

### Next actions

1. Claude Code cleanup: strip the LLM-voice takes from the seed (most logs bare, at most one or two genuinely human-sounding takes or none), make logs public-by-default, rebuild the card around piece-and-person with the take as a small optional element.
2. Then Phase 4: work pages (canonical-URL clustering, pooled logs per piece).
3. Revisit exact red and font once lived-with.
4. Hub-level, still open: master-map update and seven-test filter run — worth doing once the loop is complete.

---

## Session 3 — Phase 2 profile shipped, then re-skinned to a design system

### Build progress

**Phase 2 complete and live.** The profile renders the current user's logged pieces as a chronological record of cards, newest first, all forms equal weight, no book option anywhere. The book form and the book-by-hand path were removed first (thesis cleanup from Session 2). A reusable LogCard component was built (it will be reused by the feed and work pages in later phases). Everything still routes through the data-access layer.

**Design system established (Swiss-brutalist).** The original Phase 2 look was clean-but-generic ("beige," Goodreads-like). After looking at four restrained color directions (all too similar) and then three maximalist directions (Swiss-brutalist, pop-maximalist, retro-digital), the founder chose Swiss-brutalist. The principle that resolved the maximalism-vs-readability tension: loud in the frame, calm in the text. The structure shouts; the take and title stay readable.

Design spec as built:
- Palette: white base, near-black (#000) structure and type, one electric accent red #FF3B00. Accent used deliberately (form-tag banner, masthead "LOG" and "NEWEST FIRST", rating marks), not as a wash.
- Borders: 3px hard black, square corners (0 radius), no shadows or gradients.
- Structural font: Space Grotesk (bold 700, uppercase, tight tracking) for titles, masthead, form tags, bylines, dates. Loaded via next/font.
- Calm zone: the take stays Newsreader serif, 15px, line-height 1.55, normal weight, near-black, not uppercase. Readability of the take is non-negotiable and was preserved.
- Lead image full-bleeds to the card's black border.
- Page reads as a composed magazine spread; the log form was reframed to match.
- Iteration seam: the red lives in --accent and the type stacks in --stack-structural / --stack-serif in src/app/globals.css :root. Both are single-variable swaps.

**Status: "good enough for now," not final.** The look is a clear improvement and the direction is right. The exact red and the font are explicitly still open to iteration; the variable setup makes both cheap to change later.

**One real bug caught and fixed:** @theme inline does not emit runtime CSS variables, so the structural font initially fell back silently to the default (the exact failure mode that makes LLM-built apps look generic). Fixed by defining the type stacks as real :root variables. Verified Space Grotesk renders and the accent ships as rgb(255,59,0).

**Not yet done by the founder:** a real long-scroll look on an actual device (especially phone). The preview screenshot tool only reliably captured the top of the page, so the thirty-card scroll experience — where a loud system most risks visual fatigue — has not been eyeballed yet. Worth doing.

### Next actions

1. Phase 3 in Claude Code: the populated feed (seeded fictional "people you follow," reverse chronological, reusing LogCard).
2. Then Phase 4: work pages.
3. Revisit the exact red and font once the founder has lived with the look.

---

## Session 2 — Phase 0 and 1 shipped, category sharpened

### Build progress

**Phase 0 complete and live.** Empty Next.js (App Router) + TypeScript + Tailwind scaffold deployed. GitHub→Vercel pipeline proven: every push to main auto-deploys. Repo is private at github.com/thehanslevi/reading-log. Live at https://reading-log-tau.vercel.app/.

**Phase 1 complete and live.** The logging flow works end to end: paste a URL, a server route (/api/metadata) fetches OpenGraph title/author/source/image, user picks a form, adds optional take and optional rating, saves through the data-access layer (getLogs, getLog, addLog over an in-memory store seeded from a file). The data layer is the clean seam for a real database later. Verified in a real browser, both the link path and the (now-being-removed) book-by-hand path, and confirmed live on Vercel including the serverless metadata fetch.

**Known limitation, by design:** the in-memory store does not persist across Vercel serverless cold starts. Seed logs always show; saved logs may not survive a cold start. This is the accepted Phase-1 limitation; fixing it means adding the real database, which is out of scope until later and is a contained change behind the data layer.

**Note:** Claude Code is keeping its own project memory across sessions (URLs, the in-memory gotcha). This running log remains the authoritative record.

### Category decision (changes the thesis)

**Books are excluded on purpose.** The product is not a Goodreads replacement and will not compete for the book. Goodreads already serves books well. The category is reframed from "everything you read" to "the reading and consuming that counts nowhere else" — the homeless-content thesis. The defining trait is homelessness, not format. This is a positioning and culture decision (Letterboxd-style purity), chosen for legibility, accepted as a deliberate trade against completeness. Cost acknowledged: a person who reads books and essays will have a split record, with the book part living elsewhere.

**Boundary rule: the unit is the discrete piece, not the completed work.** A chapter is in (discrete non-completion reading, exactly the point), whether or not the book is finished. The completed-book-as-a-unit is out (that is the Goodreads behavior). "chapter" stays in the form list; "book" comes out.

**Multimedia is in the thesis but sequenced after text.** Video essays and podcast episodes are part of the category (they are homeless content too) and reuse the identical logging mechanic, so they are cheap to add later and add mostly noise if rushed in at launch. Text-first launch lets the seed community form a legible culture before the feed goes heterogeneous. Build stays form-agnostic so multimedia drops in without a rewrite. This reverses the earlier "no multimedia, defer indefinitely" framing: it is now a planned second expansion, not a maybe.

**Spec updated this session** to reflect all of the above: new category section, "what counts" replaces "what comprehensive means," form list updated, multimedia reframed as sequenced, competitive position rewritten to sit alongside Goodreads rather than fill its gap.

### Next actions

1. Redirect Phase 2 (the profile) in Claude Code: remove the book form and the book-by-hand path, keep chapter, build form-agnostic for later multimedia.
2. Proceed with Phase 2 (profile), then Phase 3 (feed), then Phase 4 (work pages).
3. Carry the open questions below into a later pass.

---

## Session 1 — spec, reframe, and first-build setup

### What got decided

**The product.** A followable, honest record of everything a person reads, and why. Two jobs reconciled: a comprehensive personal reading record (the emotional core) and a signaling-and-discovery social layer (the engine). Capture is comprehensive, the feed is curated; the same log feeds both, and adding a take or sharing promotes a log into the feed.

**The job, settled in stages.** Started as signaling plus discovery (a literary Letterboxd for written ideas). Then widened: the real motivation is that people who read a lot but not books should be able to see their reading reflected back and re-identify as readers. This pulled the personal-record job back in as the core.

**"Comprehensive" was redefined.** It does not mean capture everything automatically. It means no reading is second-class. The anti-Goodreads thesis: Goodreads makes the book the only unit that counts, so heavy article and essay reading registers as zero. The fix is to make all forms count equally, not to hide volume. Capture stays deliberate (log what stuck, roughly 5 to 15 pieces a week, by hand). No passive capture at launch.

**The metric reversal.** An earlier draft argued for hiding quantity to avoid Goodreads-style guilt. This was overturned in discussion. The guilt comes from the book being the only unit, not from numbers existing. Once all forms count, an honest measure of how much someone read is a truer and kinder mirror. Reading cadence varies; a metric that reflects a slow season honestly is not an indictment. Social comparison reinstated as motivating, not corrosive. The specific anchor metric is left open (see open questions).

**The wedge.** Cross-sector and changemaker network, chosen over literary/arts because that is where the founder's network density and convening pull is strongest. Consequences: the corpus is identifier-friendly (reports, preprints, policy pieces, often with DOIs or open-access copies), and the reading is instrumental, so the take matters more than the rating. Card built around the take, not the star. Wedge is a starting point, not a ceiling. Note carried forward: the comprehensive-record reframe may have widened the product's appeal beyond the original tight-wedge logic; worth revisiting whether the wedge still fits.

**The atomic log.** Piece reference plus form, with optional take and optional rating. Logging needs only the piece and form. The take and explicit sharing are what move a log from private record into the public feed. Norms, not requirements, push toward takes.

**The free-version feature.** Surface a legitimately free copy when one exists, via open-access sources only (Unpaywall, author preprints, Project Gutenberg, archive.org, publisher permalinks). Store the canonical URL; do not scrape or resolve to pirated copies. Framed as access equity, not paywall circumvention. This is a deliberate legal decision: a "find the non-paywalled copy of anything" feature reads as a piracy-discovery engine and invites contributory-liability exposure. The open-access scope keeps it defensible and is especially natural for the changemaker corpus. Sequencing: not load-bearing for the core loop; a fast-follow, not a launch requirement.

**Data model.** Logs point at a work_id, not a raw URL. At launch, work_id derives from the normalized canonical URL (loose clustering). Rich deduplication across editions and reprints stays the destination but is sequenced as a later migration, learned from real duplicate pairs, using DOIs where they exist plus title-author fuzzy matching with a human-in-the-loop merge. The work_id indirection is what makes that a migration rather than a rebuild.

**Deliberate non-features.** No passive capture, no read-later queue, no highlight vault, no multimedia at launch, no book-count challenge grid, no algorithmic feed. The discipline: this is a publishing-and-record product, not a saving product, which keeps it out of the crowded read-later category.

### Competitive scan (verdict: crowded adjacent, open actual position)

Read-later category is crowded and consolidating (Pocket shut down 2025, Omnivore 2024; survivors are Readwise Reader, Instapaper, Raindrop, Matter). But all are capture-and-consume tools built for the private-archive job, not social signaling and discovery. Goodreads owns the reading record but only for books; StoryGraph and Oku improve on it but stay book-centric. Broadcast-with-a-take behavior lives on LinkedIn and Substack Notes with no permanence, no work pages, no followable reading identity. White space: nobody owns the honest, form-neutral reading record that doubles as a followable social graph of what thoughtful people read and why.

### Build decisions

**First build is demo-first.** Confirmed the build's primary purpose right now is a credible proof point (for the job search and network), with learning second. This reranked priorities toward: deployed at a real URL, looks designed, clickable loop, single-user with seeded fictional users to make the social layer look alive. A "real but minimal" multi-user app was rejected because a ten-person follow graph cannot test the social loop anyway, so the accounts-and-hosting cost buys little now.

**Stack.** Next.js (App Router) plus TypeScript plus Tailwind, deployed to Vercel from GitHub. No database yet; a clean data-access layer backed by seed and in-memory state, architected so Supabase/Postgres plugs in later without a rewrite. One Next.js server route for URL metadata fetching (browsers cannot fetch other sites' metadata directly). Hybrid chosen over full Supabase-now because demo speed matters more than launch-readiness at this stage; would flip to full database if real users were weeks away.

**Build sequencing.** Phased, deploy-first. Phase 0 scaffolds and deploys an empty app to prove the GitHub-to-Vercel pipeline before any feature code, so later failures are never ambiguous between code and plumbing. Then Phase 1 logging, Phase 2 profile, Phase 3 populated feed, Phase 4 work pages. One phase at a time, confirm the live deploy after each.

### Environment setup (completed this session)

Confirmed on the founder's Mac: Node 24.14.1, git, GitHub CLI authenticated (account thehanslevi), Vercel account linked to GitHub. Claude Code installed via the native installer (version 2.1.181); resolved a PATH issue by adding ~/.local/bin to ~/.zshrc. Project folder: ~/Projects/reading-log. Note: Claude Code runs in the computer's Terminal, not in the Claude chat app, and requires a paid plan, confirmed at first browser login.

### Open questions carried forward

- **Anchor metric.** Form-neutral measure for the profile. Candidates: estimated reading time (intuitive, rough for books), word count (precise equalizer, under-credits short dense reading like poetry), pieces (always accurate, makes a book look small beside many short pieces), or a blend of pieces plus time (current lean; "you read 14 things, about 9 hours"). Decision depends on which sentence is most motivating for the target reader.
- **Completion unit.** The smallest honest unit a person logs, so any metric reflects what was actually read, not a partly-read piece's full length. Tied to the metric decision.
- Naming and brand voice.
- Whether ratings should exist at launch or whether the take alone is cleaner for this audience.
- Onboarding path to a non-empty day-one experience; likely lead with the personal-record experience given it works without a network.
- Capture surface: web-first deliberate logging is right for launch; share-sheet or extension only later, and only if it preserves deliberateness.
- Whether the work page shows takes from everyone or only people you follow, plus aggregate counts.
- Whether the comprehensive-record reframe has widened appeal beyond the cross-sector wedge, and whether the wedge still fits.

### Still open at the hub level (not done this session)

- Master map (Build_Exploration_Asymmetric_Scale_Log) update: log this candidate with its crowded-adjacent-but-open verdict and the note that it has earned a spec.
- Seven-test filter run on this product for a go/no-go read on spinning it into its own project.

### Next actions

1. Move Spec v2 and the Build Brief into ~/Projects/reading-log.
2. Run `claude` in that folder, confirm the browser login and plan access.
3. Instruct Claude Code to read both files and execute Phase 0 only, then report the live URL.
4. Proceed phase by phase, confirming the deploy after each.
