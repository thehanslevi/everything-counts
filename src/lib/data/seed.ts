import type { Log } from "./types";

// Seed data for the current user's reading log.
//
// This stands in for rows that would live in a database. It exists so the data
// layer has something to return on a cold start and so the logging round-trip
// is visible against a non-empty record. Phase 3 will add seeded logs from
// other (fictional) users; this file is only the current user's own history.

export const seedLogs: Log[] = [
  {
    id: "seed-1",
    url: "https://www.newyorker.com/magazine/2023/02/13/the-uncanny-valley",
    title: "The Uncanny Valley of Attention",
    author: "Jia Tolentino",
    source: "The New Yorker",
    image: null,
    form: "essay",
    take: "The point about attention as a finite, spendable resource reframed how I think about my reading habits.",
    rating: 4,
    createdAt: "2026-06-15T09:20:00.000Z",
  },
  {
    id: "seed-2",
    url: null,
    title: "The Overstory",
    author: "Richard Powers",
    source: null,
    image: null,
    form: "book",
    take: null,
    rating: 5,
    createdAt: "2026-06-12T18:45:00.000Z",
  },
];
