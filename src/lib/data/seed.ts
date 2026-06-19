import type { Log } from "./types";

// Seed data for the current user's reading log.
//
// This stands in for rows that would live in a database. It exists so the
// profile has a real, varied record to render on a cold start. Every entry is
// in-category (no books as a completed unit) and URL-based, with a mix of forms
// so the profile's chronological texture is visible. Phase 3 will add seeded
// logs from other (fictional) users; this file is only the current user's own
// history.

export const seedLogs: Log[] = [
  {
    id: "seed-1",
    url: "https://www.newyorker.com/magazine/2023/02/13/the-uncanny-valley-of-attention",
    title: "The Uncanny Valley of Attention",
    author: "Jia Tolentino",
    source: "The New Yorker",
    image:
      "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=900&q=80",
    form: "essay",
    take: "The point about attention as a finite, spendable resource reframed how I think about my reading habits.",
    rating: 4,
    createdAt: "2026-06-16T09:20:00.000Z",
  },
  {
    id: "seed-2",
    url: "https://www.brookings.edu/articles/the-quiet-infrastructure-of-trust",
    title: "The Quiet Infrastructure of Trust",
    author: "Anya Bernstein",
    source: "Brookings",
    image: null,
    form: "report",
    take: "Made me rethink which institutions actually carry civic trust, versus which ones just claim to.",
    rating: null,
    createdAt: "2026-06-14T15:05:00.000Z",
  },
  {
    id: "seed-3",
    url: "https://www.poetryfoundation.org/poems/44272/the-peace-of-wild-things",
    title: "The Peace of Wild Things",
    author: "Wendell Berry",
    source: "Poetry Foundation",
    image: null,
    form: "poem",
    take: "I keep returning to the line about resting in the grace of the world. Read it twice in one sitting.",
    rating: 5,
    createdAt: "2026-06-13T21:40:00.000Z",
  },
  {
    id: "seed-4",
    url: "https://www.theatlantic.com/technology/archive/2024/03/the-end-of-the-open-web",
    title: "The Slow Erosion of the Open Web",
    author: "Charlie Warzel",
    source: "The Atlantic",
    image:
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=900&q=80",
    form: "article",
    take: null,
    rating: 3,
    createdAt: "2026-06-11T08:15:00.000Z",
  },
  {
    id: "seed-5",
    url: "https://arxiv.org/abs/2403.05530",
    title: "On the Limits of Scale: A Working Paper",
    author: "L. Okonkwo, R. Mehta",
    source: "arXiv",
    image: null,
    form: "report",
    take: "The section on diminishing returns is the clearest articulation I've found of where the field actually is.",
    rating: 4,
    createdAt: "2026-06-09T19:00:00.000Z",
  },
  {
    id: "seed-6",
    url: "https://www.newyorker.com/magazine/2024/01/08/the-swimmers-short-story",
    title: "The Swimmers",
    author: "Julie Otsuka",
    source: "The New Yorker",
    image: null,
    form: "short story",
    take: "A whole life compressed into the geometry of a lap pool. Devastating in the last page.",
    rating: 5,
    createdAt: "2026-06-07T22:30:00.000Z",
  },
  {
    id: "seed-7",
    url: "https://press.princeton.edu/books/seeing-like-a-state/chapter-3",
    title: "Authoritarian High Modernism (Chapter 3)",
    author: "James C. Scott",
    source: "Princeton University Press",
    image: null,
    form: "chapter",
    take: "Just this chapter, not the whole book. The critique of legibility is doing a lot of work in my thinking lately.",
    rating: null,
    createdAt: "2026-06-04T11:10:00.000Z",
  },
];
