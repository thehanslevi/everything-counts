# Everything Counts — brand

The loud, dog-eared seal for the reading that counts nowhere else — a
Japanese-poster stamp of record for the essays, articles, and chapters that live
in your tabs, not on your shelf.

## The mark

A rising-sun **seal**: a vermilion disc of ragged prose, ringed by 20 tapered
rays, its top-right corner cut and turned down like a dog-eared page. The form
and the thesis are the same gesture — reading that counts nowhere else, now
stamped.

What each part carries:

- **Rising sun** → authority, record, "this counts." Not national/corporate —
  the color clash marks it as pop, not institutional.
- **Disc of text** → the thing itself. Subject (reading) and symbol (sun)
  collapsed into one shape.
- **Dog-eared corner** → the human hand. A perfect sun is official; a turned
  corner is intimate, used, a little punk. The tension between the two _is_ the
  brand.
- **Accent beams (magenta + blue)** → the Yokoo clash. A traditional asahi is
  monochrome red; breaking it is the tell that this is a pop object.

### Locked spec

- **Rays:** 20, evenly spaced. Mostly vermilion, with **magenta at top &
  bottom, blue at the sides** (4 accent beams). Tapered, narrower toward the hub.
- **Disc:** vermilion, sumi-ink ring (~4.5 weight at 200-unit scale).
- **Text:** 4 ink lines, left edges hugging the disc, ragged right, a short
  final line (paragraph end), top line clear of the fold. Ink weight ~3.2.
- **Dog-ear:** electric-blue underside, straight ink crease, top-right corner.
- **Field:** taxi-yellow, **full-bleed square** (iOS applies the rounded mask;
  the App Store rejects alpha/rounded source — never ship a rounded or
  transparent master).

### Palette (from `src/app/globals.css`)

| Role | Hex | Use |
|---|---|---|
| Field | `#f2c400` | taxi-yellow background — the brand's signature |
| Ink | `#171106` | sumi — rings, text, crease, structure |
| Vermilion | `#e0202a` | the sun, the majority of rays |
| Magenta | `#e5007e` | accent beams (top/bottom) |
| Blue | `#0053c0` | accent beams (sides) + the dog-ear |
| Paper | `#f7f1e3` | calm reading surfaces (in-app, not the mark) |

## Generating the assets

One vector master drives everything:

```bash
node scripts/make_icons.mjs        # SVG masters + source PNGs (alpha-free)
npx capacitor-assets generate --ios   # fan out to iOS AppIcon + Splash
```

`scripts/make_icons.mjs` is the source of truth for the geometry. Edit the mark
there, never the generated PNGs. Outputs: `assets/icon.svg`, `assets/splash.svg`,
the `assets/*.png` sources, `src/app/icon.png` + `apple-icon.png` (web favicon /
apple-touch), and — via capacitor-assets — the iOS `AppIcon.appiconset` (1024²,
no alpha) and `Splash.imageset`.

## Aesthetic strategy

A **maximalist, poster-first identity in a category defined by white space**
(Goodreads beige, Letterboxd calm, StoryGraph soft charts). Being the loud one
is the position, not just the look. A timid version loses to Goodreads; the
maximal version has no competitor.

**Hold (non-negotiable):**
1. Taxi-yellow + sumi ink + vermilion. This trio is the brand.
2. The sunburst seal as the master mark.
3. Loud > tasteful. When in doubt, more poster, less product.

**Stretch (build outward):**
1. **The seal as a system.** Same rays, swappable center — the page (default), a
   poem, an initial, a number (the year-in-review "stamp"). This is the
   transmedia engine: stickers, badges, per-form seals, a Riso print.
2. **Motion identity.** The dog-ear turning down = the signature micro-animation
   (app open, successful log, share-card reveal). One gesture, everywhere.
3. **Accent beams can encode later** (forms, weekly activity) — optionality, not
   obligation, and only once the core is bulletproof.
4. **Typography matches the mark's confidence** — heavy geometric gothic,
   stroked, tight (the existing Zen Kaku / stroked-COUNTS direction). The logo
   should never out-punch the wordmark beside it.

**Cultural read:** anti-minimalism / poster-core is ascendant with under-25s;
reading-as-identity is having a moment (but BookTok is _books_ — the un-served,
more online-native slice is essays/articles/"counts nowhere else"). A seal wants
to be stamped: the mark is built to become collectible and to animate.

**Guard the hierarchy.** The mark is dense (sunburst + accents + roundel + ring +
prose + fold). It works because the read order is disciplined: silhouette → sun →
corner → texture. The failure mode is noise, not ugliness. Every future addition
should subtract something.
