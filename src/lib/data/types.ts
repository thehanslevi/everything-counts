// Shared data types for the reading log.
//
// These types are owned by the data-access layer. The rest of the app imports
// them from here, never from a storage implementation, so the backing store can
// change (in-memory today, a real database later) without touching callers.

// In-category reading forms. Books as a completed unit are deliberately
// excluded (that is Goodreads' territory); a chapter stays, because reading one
// chapter is exactly the discrete, non-completion reading this product is for.
// This list is intentionally open-ended: later forms (e.g. "video essay",
// "podcast episode") drop in here with no data-model change.
export const FORMS = [
  "essay",
  "article",
  "chapter",
  "poem",
  "report",
  "short story",
  "other",
] as const;

export type Form = (typeof FORMS)[number];

// A person on the network. The current user plus the people they follow. Follow
// relationships are implied by the seed for now: everyone here is followed.
export interface User {
  id: string;
  name: string;
  handle: string; // without the leading @
  role: string; // one-line identity
}

// A log is one person recording one piece they have read.
export interface Log {
  id: string;
  userId: string; // who logged it
  shared: boolean; // public by default; the flag stays for a future private opt-out
  workId: string; // the piece this log resolves to (from its normalized canonical URL)
  url: string | null; // null when the piece was entered by hand (e.g. a book)
  title: string;
  author: string | null;
  source: string | null; // publication or site name
  image: string | null; // lead image URL
  form: Form;
  take: string | null; // optional short note on why it mattered
  rating: number | null; // optional, 1-5
  createdAt: string; // ISO timestamp
}

// A work: one piece, with every log made against it pooled together. The
// identity fields are drawn from the logs (canonical-URL clustering means
// different people may have logged slightly different metadata).
export interface Work {
  id: string; // workId
  title: string;
  author: string | null;
  source: string | null;
  form: Form;
  image: string | null;
  url: string | null; // a representative original URL, for linking out
  logs: Log[]; // newest first
}

// A feed entry: a shared log joined with the user who shared it, so the feed
// can attribute each card without a second lookup.
export interface FeedItem {
  log: Log;
  user: User;
}

// The shape a caller provides to create a log. The data layer fills in id and
// createdAt.
export interface NewLog {
  url?: string | null;
  title: string;
  author?: string | null;
  source?: string | null;
  image?: string | null;
  form: Form;
  take?: string | null;
  rating?: number | null;
}
