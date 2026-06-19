// Shared data types for the reading log.
//
// These types are owned by the data-access layer. The rest of the app imports
// them from here, never from a storage implementation, so the backing store can
// change (in-memory today, a real database later) without touching callers.

export const FORMS = [
  "essay",
  "article",
  "chapter",
  "poem",
  "report",
  "short story",
  "book",
  "other",
] as const;

export type Form = (typeof FORMS)[number];

// A log is one person recording one piece they have read.
export interface Log {
  id: string;
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
