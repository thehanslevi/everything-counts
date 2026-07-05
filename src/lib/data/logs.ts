import { createClient } from "@/lib/supabase/server";
import { workIdFor } from "./url";
import {
  logFromRow,
  profileFromRow,
  type FeedItem,
  type Log,
  type LogRow,
  type NewLog,
  type Profile,
  type ProfileRow,
  type Work,
} from "./types";

// Data-access layer. This is the seam the rest of the app talks to; it is the
// only module that knows the storage is Supabase. RLS enforces write access
// (you can only write your own rows); reads are public by product design.

type LogWithProfileRow = LogRow & { profiles: ProfileRow };

// --- Session / profiles ------------------------------------------------------

// The signed-in user's profile, or null when signed out or not yet onboarded.
// The second flag distinguishes "no session" from "session but no profile yet"
// (a freshly signed-up user who still needs to pick a handle).
export async function getSessionProfile(): Promise<{
  profile: Profile | null;
  hasSession: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { profile: null, hasSession: false };

  const { data } = await supabase
    .from("profiles")
    .select("id, handle, name, role")
    .eq("id", user.id)
    .maybeSingle();

  return { profile: data ? profileFromRow(data) : null, hasSession: true };
}

export async function getProfileByHandle(
  handle: string,
): Promise<Profile | undefined> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, handle, name, role")
    .eq("handle", handle.toLowerCase())
    .maybeSingle();
  return data ? profileFromRow(data) : undefined;
}

// Everyone on the network, newest first. Powers the People page.
export async function getProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, handle, name, role")
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []).map(profileFromRow);
}

// --- Search ------------------------------------------------------------------

// Escape %/_ so a query is matched literally inside ilike patterns.
function likePattern(q: string): string {
  return `%${q.replace(/[%_\\]/g, "\\$&")}%`;
}

// Search shared logs by title, author, or source, grouped into works (one
// entry per work, newest log wins, with the number of distinct loggers).
export async function searchWorks(
  q: string,
): Promise<{ log: Log; loggerCount: number }[]> {
  const supabase = await createClient();
  const pattern = likePattern(q);
  const { data } = await supabase
    .from("logs")
    .select("*")
    .eq("shared", true)
    .or(`title.ilike.${pattern},author.ilike.${pattern},source.ilike.${pattern}`)
    .order("created_at", { ascending: false })
    .limit(100);

  const byWork = new Map<string, { log: Log; loggers: Set<string> }>();
  for (const row of (data ?? []) as LogRow[]) {
    const log = logFromRow(row);
    const entry = byWork.get(log.workId);
    if (entry) {
      entry.loggers.add(log.userId);
    } else {
      byWork.set(log.workId, { log, loggers: new Set([log.userId]) });
    }
  }
  return [...byWork.values()].map(({ log, loggers }) => ({
    log,
    loggerCount: loggers.size,
  }));
}

// Search people by handle, name, or role.
export async function searchProfiles(q: string): Promise<Profile[]> {
  const supabase = await createClient();
  const pattern = likePattern(q);
  const { data } = await supabase
    .from("profiles")
    .select("id, handle, name, role")
    .or(`handle.ilike.${pattern},name.ilike.${pattern},role.ilike.${pattern}`)
    .limit(20);
  return (data ?? []).map(profileFromRow);
}

// --- Follows -----------------------------------------------------------------

// Everyone the given user follows, as a set of ids.
export async function getFolloweeIds(followerId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("follows")
    .select("followee_id")
    .eq("follower_id", followerId);
  return new Set((data ?? []).map((f) => f.followee_id));
}

export async function isFollowing(
  followerId: string,
  followeeId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("followee_id", followeeId)
    .maybeSingle();
  return Boolean(data);
}

// --- Logs --------------------------------------------------------------------

// One user's shared logs, newest first (their public record).
export async function getLogsByUser(userId: string): Promise<Log[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return ((data ?? []) as LogRow[]).map(logFromRow);
}

// The reverse-chronological feed for a viewer: shared logs from the people
// they follow plus their own. Not algorithmic.
export async function getFeed(viewerId: string): Promise<FeedItem[]> {
  const supabase = await createClient();

  const { data: follows } = await supabase
    .from("follows")
    .select("followee_id")
    .eq("follower_id", viewerId);

  const userIds = [viewerId, ...(follows ?? []).map((f) => f.followee_id)];

  const { data } = await supabase
    .from("logs")
    .select("*, profiles(id, handle, name, role)")
    .in("user_id", userIds)
    .eq("shared", true)
    .order("created_at", { ascending: false })
    .limit(100);

  return ((data ?? []) as LogWithProfileRow[]).map((row) => ({
    log: logFromRow(row),
    user: profileFromRow(row.profiles),
  }));
}

// Recent shared logs across the whole network, for the signed-out landing.
export async function getRecentActivity(limit = 20): Promise<FeedItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("logs")
    .select("*, profiles(id, handle, name, role)")
    .eq("shared", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data ?? []) as LogWithProfileRow[]).map((row) => ({
    log: logFromRow(row),
    user: profileFromRow(row.profiles),
  }));
}

// Resolve a work: its pooled logs (newest first, with loggers) plus an
// identity drawn from them.
export async function getWork(
  workId: string,
): Promise<(Work & { loggers: Map<string, Profile> }) | undefined> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("logs")
    .select("*, profiles(id, handle, name, role)")
    .eq("work_id", workId)
    .eq("shared", true)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as LogWithProfileRow[];
  if (rows.length === 0) return undefined;

  const logs = rows.map(logFromRow);
  const loggers = new Map(
    rows.map((row) => [row.user_id, profileFromRow(row.profiles)]),
  );
  const newest = logs[0];
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
    loggers,
  };
}

// A single log, only if it belongs to the signed-in user (for editing).
export async function getOwnLog(id: string): Promise<Log | undefined> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return undefined;
  const { data } = await supabase
    .from("logs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  return data ? logFromRow(data as LogRow) : undefined;
}

// Update the editable fields of one of the signed-in user's logs. The URL is
// deliberately immutable — it is the work identity; metadata is not.
export async function updateLog(
  id: string,
  fields: Pick<NewLog, "title" | "author" | "source" | "image" | "form" | "take" | "rating">,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("logs")
    .update({
      title: fields.title.trim(),
      author: fields.author?.trim() || null,
      source: fields.source?.trim() || null,
      image: fields.image?.trim() || null,
      form: fields.form,
      take: fields.take?.trim() || null,
      rating: fields.rating ?? null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// Delete one of the signed-in user's logs. RLS scopes the delete to own rows.
export async function deleteLog(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("logs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// Create a log for the signed-in user. Public by default; RLS rejects the
// insert if there is no session.
export async function addLog(input: NewLog): Promise<Log> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to log a piece.");

  const url = input.url?.trim() ? input.url.trim() : null;

  const { data, error } = await supabase
    .from("logs")
    .insert({
      user_id: user.id,
      shared: true,
      work_id: workIdFor(url, input.title),
      url,
      title: input.title.trim(),
      author: input.author?.trim() || null,
      source: input.source?.trim() || null,
      image: input.image?.trim() || null,
      form: input.form,
      take: input.take?.trim() || null,
      rating: input.rating ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return logFromRow(data as LogRow);
}
