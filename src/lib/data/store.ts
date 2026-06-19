import type { Log, User } from "./types";
import { CURRENT_USER, seedLogs, seedUsers } from "./seed";

// In-memory backing store for the data-access layer.
//
// This is the ONLY module that holds reading-log state, and nothing outside the
// data layer imports it. When a real database is added later, this file is the
// single thing that gets replaced; the data-access functions in logs.ts keep
// the same signatures, so callers never change.
//
// State is parked on globalThis so it survives module re-evaluation during dev
// hot-reload and is reused within a warm server instance. Note: this is process
// memory, so it does not persist across serverless cold starts or deploys. That
// is the accepted limitation of the in-memory phase; swapping in a database is a
// contained change behind logs.ts.

interface ReadingLogStore {
  logs: Log[];
  users: User[];
}

const globalForStore = globalThis as unknown as {
  __readingLogStore?: ReadingLogStore;
};

export const store: ReadingLogStore =
  globalForStore.__readingLogStore ??
  (globalForStore.__readingLogStore = {
    // Copy the seeds so we never mutate the seed modules' arrays.
    logs: [...seedLogs],
    users: [CURRENT_USER, ...seedUsers],
  });
