import { store } from "./store";
import type { Log, NewLog } from "./types";

// Data-access layer for logs.
//
// This is the seam the rest of the app talks to. Callers use these functions
// and never touch the store directly, so the backing store can be swapped for a
// real database later without changing any caller. The functions are async on
// purpose: a database implementation will be async, and writing callers against
// async signatures now means the swap requires no changes upstream.

// Return all logs for the current user, newest first.
export async function getLogs(): Promise<Log[]> {
  return [...store.logs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// Return a single log by id, or undefined if it does not exist.
export async function getLog(id: string): Promise<Log | undefined> {
  return store.logs.find((log) => log.id === id);
}

// Create and persist a new log, returning the stored record.
export async function addLog(input: NewLog): Promise<Log> {
  const log: Log = {
    id: crypto.randomUUID(),
    url: input.url?.trim() ? input.url.trim() : null,
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
