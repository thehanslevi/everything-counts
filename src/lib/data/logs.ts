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

// --- Follows -----------------------------------------------------------------

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
