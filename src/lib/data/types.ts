// Shared data types for Everything Counts.
//
// These types are owned by the data-access layer. The rest of the app imports
// them from here, never from a storage implementation.

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

// A person on the network.
export interface Profile {
  id: string;
  handle: string;
  name: string;
  bio: string | null; // a short self-description
  link: string | null; // one outbound link
  avatarUrl: string | null; // uploaded photo; null falls back to a generated seal
}

// An in-app notification, resolved for display.
export interface AppNotification {
  id: string;
  type: "follow" | "log" | string;
  actor: Profile | null;
  logTitle: string | null;
  workId: string | null;
  read: boolean;
  createdAt: string;
}

// A log is one person recording one piece they have read. Public by default:
// logging a piece is the act of sharing it. The `shared` flag exists for a
// future private opt-out.
export interface Log {
  id: string;
  userId: string;
  shared: boolean;
  workId: string; // the piece this log resolves to (normalized canonical URL)
  url: string | null;
  title: string;
  author: string | null;
  source: string | null;
  image: string | null;
  form: Form;
  take: string | null;
  rating: number | null;
  createdAt: string; // ISO timestamp
}

// The shape a caller provides to create a log. The data layer fills in id,
// userId, workId, and createdAt.
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

// A feed entry: a shared log joined with the person who logged it.
export interface FeedItem {
  log: Log;
  user: Profile;
}

// A work: one piece, with every log made against it pooled together.
export interface Work {
  id: string;
  title: string;
  author: string | null;
  source: string | null;
  form: Form;
  image: string | null;
  url: string | null;
  logs: Log[]; // newest first
}

// --- Row mapping -----------------------------------------------------------

// Database rows are snake_case; these helpers convert them once, at the data
// layer boundary, so nothing above it knows about the database shape.

export interface LogRow {
  id: string;
  user_id: string;
  shared: boolean;
  work_id: string;
  url: string | null;
  title: string;
  author: string | null;
  source: string | null;
  image: string | null;
  form: string;
  take: string | null;
  rating: number | null;
  created_at: string;
}

export interface ProfileRow {
  id: string;
  handle: string;
  name: string;
  bio: string | null;
  link: string | null;
  avatar_url: string | null;
}

export function logFromRow(row: LogRow): Log {
  return {
    id: row.id,
    userId: row.user_id,
    shared: row.shared,
    workId: row.work_id,
    url: row.url,
    title: row.title,
    author: row.author,
    source: row.source,
    image: row.image,
    form: row.form as Form,
    take: row.take,
    rating: row.rating,
    createdAt: row.created_at,
  };
}

export function profileFromRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    handle: row.handle,
    name: row.name,
    bio: row.bio,
    link: row.link,
    avatarUrl: row.avatar_url,
  };
}
