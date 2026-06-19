import { store } from "./store";
import { CURRENT_USER_ID } from "./seed";
import { workIdFor } from "./url";
import type { FeedItem, Log, NewLog, User, Work } from "./types";

// Data-access layer for logs and users.
//
// This is the seam the rest of the app talks to. Callers use these functions
// and never touch the store directly, so the backing store can be swapped for a
// real database later without changing any caller. The functions are async on
// purpose: a database implementation will be async, and writing callers against
// async signatures now means the swap requires no changes upstream.

function byNewestFirst(a: Log, b: Log): number {
  return b.createdAt.localeCompare(a.createdAt);
}

// Return the current user's own logs (shared or not), newest first. This is the
// personal record behind the profile.
export async function getLogs(): Promise<Log[]> {
  return store.logs
    .filter((log) => log.userId === CURRENT_USER_ID)
    .sort(byNewestFirst);
}

// Return a single log by id, or undefined if it does not exist.
export async function getLog(id: string): Promise<Log | undefined> {
  return store.logs.find((log) => log.id === id);
}

// Return a single user by id, or undefined.
export async function getUser(id: string): Promise<User | undefined> {
  return store.users.find((user) => user.id === id);
}

// Return all known users (the current user plus everyone they follow).
export async function getUsers(): Promise<User[]> {
  return [...store.users];
}

// Return the reverse-chronological feed: every shared log across the current
// user and the people they follow, each joined with the user who shared it.
// Not algorithmic — purely newest-first. Following is implied by the seed, so
// every shared log qualifies.
export async function getFeed(): Promise<FeedItem[]> {
  const usersById = new Map(store.users.map((user) => [user.id, user]));
  return store.logs
    .filter((log) => log.shared)
    .sort(byNewestFirst)
    .map((log) => ({ log, user: usersById.get(log.userId) }))
    .filter((item): item is FeedItem => item.user !== undefined);
}

// Resolve a work by id: its pooled logs (newest first) plus an identity drawn
// from them. Returns undefined if no log resolves to this work.
export async function getWork(workId: string): Promise<Work | undefined> {
  const logs = store.logs
    .filter((log) => log.workId === workId)
    .sort(byNewestFirst);

  if (logs.length === 0) return undefined;

  const newest = logs[0];
  // Prefer an image and a URL from whichever log captured one.
  const withImage = logs.find((log) => log.image);
  const withUrl = logs.find((log) => log.url);

  return {
    id: workId,
    title: newest.title,
    author: newest.author,
    source: newest.source,
    form: newest.form,
    image: withImage?.image ?? null,
    url: withUrl?.url ?? null,
    logs,
  };
}

// Create and persist a new log for the current user, returning the stored
// record. Logs are public by default (the Letterboxd-diary model): logging a
// piece is the act of sharing it, so it appears in the feed whether or not it
// carries a take. The `shared` flag stays on the model so a private opt-out can
// be added later as a filter in getFeed — that toggle is not built yet.
export async function addLog(input: NewLog): Promise<Log> {
  const id = crypto.randomUUID();
  const url = input.url?.trim() ? input.url.trim() : null;
  const log: Log = {
    id,
    userId: CURRENT_USER_ID,
    shared: true,
    workId: workIdFor(url, input.title),
    url,
    title: input.title.trim(),
    author: input.author?.trim() ? input.author.trim() : null,
    source: input.source?.trim() ? input.source.trim() : null,
    image: input.image?.trim() ? input.image.trim() : null,
    form: input.form,
    take: input.take?.trim() ? input.take.trim() : null,
    rating: input.rating ?? null,
    createdAt: new Date().toISOString(),
  };

  store.logs.push(log);
  return log;
}
