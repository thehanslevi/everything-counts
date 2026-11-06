import { createClient } from "@/lib/supabase/server";
import { workIdFor } from "./url";
import { slugify } from "@/lib/slug";
import type { AfterLogFacts } from "@/lib/afterlog";
import { pickDaily } from "@/lib/daily";
import {
  logFromRow,
  profileFromRow,
  type AppNotification,
  type FeedItem,
  type Log,
  type LogRow,
  type NewLog,
  type Profile,
  type ProfileRow,
  type Reply,
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
    .select("id, handle, name, bio, link, avatar_url")
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
    .select("id, handle, name, bio, link, avatar_url")
    .eq("handle", handle.toLowerCase())
    .maybeSingle();
  return data ? profileFromRow(data) : undefined;
}

// Everyone on the network, newest first. Powers the People page.
export async function getProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const blocked = await viewerBlockedIds();
  const { data } = await supabase
    .from("profiles")
    .select("id, handle, name, bio, link, avatar_url")
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []).map(profileFromRow).filter((p) => !blocked.has(p.id));
}

// Update the signed-in user's editable profile fields. Handle stays immutable
// (it is the identity). Passing avatarUrl clears or sets the photo; omitting it
// leaves the current avatar untouched.
export async function updateProfile(fields: {
  name: string;
  bio: string | null;
  link: string | null;
  avatarUrl?: string | null;
}): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in first.");

  const patch: Record<string, unknown> = {
    name: fields.name.trim(),
    bio: fields.bio?.trim() || null,
    link: fields.link?.trim() || null,
  };
  if (fields.avatarUrl !== undefined) patch.avatar_url = fields.avatarUrl;

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) throw new Error(error.message);
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
  const blocked = await viewerBlockedIds();
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
    if (blocked.has(row.user_id)) continue;
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
  const blocked = await viewerBlockedIds();
  const pattern = likePattern(q);
  const { data } = await supabase
    .from("profiles")
    .select("id, handle, name, bio, link, avatar_url")
    .or(`handle.ilike.${pattern},name.ilike.${pattern},bio.ilike.${pattern}`)
    .limit(20);
  return (data ?? []).map(profileFromRow).filter((p) => !blocked.has(p.id));
}

// File a report against a log or a user.
export async function reportContent(input: {
  targetLogId?: string;
  targetUserId?: string;
  reason: string;
}): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to report.");
  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_log_id: input.targetLogId ?? null,
    target_user_id: input.targetUserId ?? null,
    reason: input.reason.trim() || null,
  });
  if (error) throw new Error(error.message);
}

// Block / unblock a user.
export async function setBlocked(
  blockedId: string,
  blocked: boolean,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id === blockedId) return;
  if (blocked) {
    await supabase
      .from("blocks")
      .insert({ blocker_id: user.id, blocked_id: blockedId });
    // Blocking implies unfollowing.
    await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("followee_id", blockedId);
  } else {
    await supabase
      .from("blocks")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", blockedId);
  }
}

// --- Follows -----------------------------------------------------------------

// --- Blocking (UGC safety) ---------------------------------------------------

// The set of users the given viewer has blocked. Empty when signed out.
export async function getBlockedIds(viewerId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blocks")
    .select("blocked_id")
    .eq("blocker_id", viewerId);
  return new Set((data ?? []).map((b) => b.blocked_id));
}

export async function isBlocked(
  blockerId: string,
  blockedId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blocks")
    .select("blocker_id")
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId)
    .maybeSingle();
  return Boolean(data);
}

// The current viewer's blocked set, or empty when signed out. Used to filter
// blocked people out of every public surface.
async function viewerBlockedIds(): Promise<Set<string>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();
  return getBlockedIds(user.id);
}

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

// Follower / following counts for a profile.
export async function getFollowCounts(
  userId: string,
): Promise<{ followers: number; following: number }> {
  const supabase = await createClient();
  const [followers, following] = await Promise.all([
    supabase
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("followee_id", userId),
    supabase
      .from("follows")
      .select("followee_id", { count: "exact", head: true })
      .eq("follower_id", userId),
  ]);
  return { followers: followers.count ?? 0, following: following.count ?? 0 };
}

// Resolve a set of user ids to profiles, minus anyone the viewer has blocked.
async function profilesByIds(ids: string[]): Promise<Profile[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const blocked = await viewerBlockedIds();
  const { data } = await supabase
    .from("profiles")
    .select("id, handle, name, bio, link, avatar_url")
    .in("id", ids);
  return (data ?? []).map(profileFromRow).filter((p) => !blocked.has(p.id));
}

// The people who follow this user.
export async function getFollowers(userId: string): Promise<Profile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("followee_id", userId);
  return profilesByIds((data ?? []).map((f) => f.follower_id));
}

// The people this user follows.
export async function getFollowing(userId: string): Promise<Profile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("follows")
    .select("followee_id")
    .eq("follower_id", userId);
  return profilesByIds((data ?? []).map((f) => f.followee_id));
}

// --- Notifications -----------------------------------------------------------

type NotifRaw = {
  id: string;
  type: string;
  work_id: string | null;
  read: boolean;
  created_at: string;
  actor: ProfileRow | null;
  log: { title: string; work_id: string } | null;
  reply: { body: string } | null;
  send: { title: string; url: string | null; note: string | null } | null;
};

// Count of unread notifications, for the header bell badge.
export async function getUnreadNotificationCount(
  viewerId: string,
): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", viewerId)
    .eq("read", false);
  return count ?? 0;
}

// The viewer's notifications, newest first, with the actor and (for log
// notifications) the piece resolved. Blocked actors are filtered out.
export async function getNotifications(
  viewerId: string,
): Promise<AppNotification[]> {
  const supabase = await createClient();
  const blocked = await getBlockedIds(viewerId);
  const { data } = await supabase
    .from("notifications")
    .select(
      "id, type, work_id, read, created_at, actor:profiles!actor_id(id, handle, name, bio, link, avatar_url), log:logs(title, work_id), reply:replies!reply_id(body), send:sends!send_id(title, url, note)",
    )
    .eq("user_id", viewerId)
    .order("created_at", { ascending: false })
    .limit(50);

  return ((data ?? []) as unknown as NotifRaw[])
    .filter((n) => !n.actor || !blocked.has(n.actor.id))
    .map((n) => ({
      id: n.id,
      type: n.type,
      actor: n.actor ? profileFromRow(n.actor) : null,
      logTitle: n.log?.title ?? n.send?.title ?? null,
      body: n.reply?.body ?? n.send?.note ?? null,
      pieceUrl: n.send?.url ?? null,
      workId: n.work_id ?? n.log?.work_id ?? null,
      read: n.read,
      createdAt: n.created_at,
    }));
}

// --- Replies -----------------------------------------------------------------

type ReplyRow = {
  id: string;
  log_id: string;
  body: string;
  created_at: string;
  profiles: ProfileRow;
};

// Replies on a set of logs, oldest first, keyed by log id. Replies from
// people this viewer has blocked are dropped.
export async function getRepliesForLogs(
  logIds: string[],
): Promise<Map<string, Reply[]>> {
  const out = new Map<string, Reply[]>();
  if (logIds.length === 0) return out;
  const supabase = await createClient();
  const blocked = await viewerBlockedIds();
  const { data } = await supabase
    .from("replies")
    .select(
      "id, log_id, body, created_at, profiles(id, handle, name, bio, link, avatar_url)",
    )
    .in("log_id", logIds)
    .order("created_at", { ascending: true });

  for (const row of (data ?? []) as unknown as ReplyRow[]) {
    const user = profileFromRow(row.profiles);
    if (blocked.has(user.id)) continue;
    const list = out.get(row.log_id) ?? [];
    list.push({
      id: row.id,
      logId: row.log_id,
      user,
      body: row.body,
      createdAt: row.created_at,
    });
    out.set(row.log_id, list);
  }
  return out;
}

// One line back on someone's log. RLS enforces the rest (shared log, not
// your own, no block either way); this maps its refusals to plain words.
// Returns who should hear about it: the log's owner, and anyone else who
// already replied there (the new replier excepted).
export async function addReply(
  logId: string,
  body: string,
): Promise<{
  ownerId: string;
  coReplierIds: string[];
  workId: string;
  title: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to reply.");

  const [{ data: log }, { data: prior }] = await Promise.all([
    supabase
      .from("logs")
      .select("user_id, work_id, title")
      .eq("id", logId)
      .maybeSingle(),
    supabase.from("replies").select("user_id").eq("log_id", logId),
  ]);
  if (!log) throw new Error("That log is gone.");
  if (log.user_id === user.id) throw new Error("That's your own log.");

  const { error } = await supabase
    .from("replies")
    .insert({ log_id: logId, user_id: user.id, body: body.trim() });
  if (error) {
    if (error.code === "23505") throw new Error("You already replied to this one.");
    if (error.code === "42501") throw new Error("You can't reply to this log.");
    throw new Error(error.message);
  }

  const coReplierIds = [
    ...new Set(
      (prior ?? [])
        .map((r) => r.user_id)
        .filter((id) => id !== user.id && id !== log.user_id),
    ),
  ];
  return {
    ownerId: log.user_id,
    coReplierIds,
    workId: log.work_id,
    title: log.title,
  };
}

// Remove a reply: yours, or any on your own log. RLS decides which.
export async function deleteReply(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("replies").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// --- Sends -------------------------------------------------------------------

// People the signed-in user can send a piece to: anyone connected by a
// follow in either direction, minus blocks. Alphabetical by name.
export async function getSendablePeople(viewerId: string): Promise<Profile[]> {
  const supabase = await createClient();
  const [{ data: outbound }, { data: inbound }] = await Promise.all([
    supabase.from("follows").select("followee_id").eq("follower_id", viewerId),
    supabase.from("follows").select("follower_id").eq("followee_id", viewerId),
  ]);
  const ids = new Set<string>([
    ...(outbound ?? []).map((f) => f.followee_id),
    ...(inbound ?? []).map((f) => f.follower_id),
  ]);
  ids.delete(viewerId);
  const people = await profilesByIds([...ids]);
  return people.sort((a, b) => a.name.localeCompare(b.name));
}

// Hand a piece to one person. RLS enforces the connection and blocks.
export async function addSend(input: {
  recipientId: string;
  workId: string;
  url: string | null;
  title: string;
  note: string | null;
}): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to send a piece.");

  const { error } = await supabase.from("sends").insert({
    sender_id: user.id,
    recipient_id: input.recipientId,
    work_id: input.workId,
    url: input.url,
    title: input.title.trim(),
    note: input.note?.trim() || null,
  });
  if (error) {
    if (error.code === "42501") {
      throw new Error("You can send to people you follow, or who follow you.");
    }
    throw new Error(error.message);
  }
}

// Mark all of the signed-in user's notifications read.
export async function markNotificationsRead(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);
}

// --- Logs --------------------------------------------------------------------

// One user's shared logs, newest first (their public record).
// Resolve "sent by" on a list of logs, in place: one profile lookup for all
// of them. A sender this viewer has blocked is left off, like the rest of
// what that person does.
async function attachSenders(logs: Log[]): Promise<void> {
  const ids = [
    ...new Set(
      logs.map((log) => log.viaUserId).filter((id): id is string => Boolean(id)),
    ),
  ];
  if (ids.length === 0) return;
  const senders = new Map((await profilesByIds(ids)).map((p) => [p.id, p]));
  for (const log of logs) {
    const sender = log.viaUserId ? senders.get(log.viaUserId) : undefined;
    if (sender) log.sentBy = { handle: sender.handle, name: sender.name };
  }
}

export async function getLogsByUser(userId: string): Promise<Log[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  const logs = ((data ?? []) as LogRow[]).map(logFromRow);
  await attachSenders(logs);
  return logs;
}

// The reverse-chronological feed for a viewer: shared logs from the people
// they follow plus their own. Not algorithmic.
export async function getFeed(viewerId: string): Promise<FeedItem[]> {
  const supabase = await createClient();

  const { data: follows } = await supabase
    .from("follows")
    .select("followee_id")
    .eq("follower_id", viewerId);

  const blocked = await getBlockedIds(viewerId);
  const userIds = [viewerId, ...(follows ?? []).map((f) => f.followee_id)];

  const { data } = await supabase
    .from("logs")
    .select("*, profiles(id, handle, name, bio, link, avatar_url)")
    .in("user_id", userIds)
    .eq("shared", true)
    .order("created_at", { ascending: false })
    .limit(100);

  const items = ((data ?? []) as LogWithProfileRow[])
    .filter((row) => !blocked.has(row.user_id))
    .map((row) => ({ log: logFromRow(row), user: profileFromRow(row.profiles) }));
  await attachSenders(items.map((item) => item.log));
  return items;
}

// Recent shared logs across the whole network, for the signed-out landing.
export async function getRecentActivity(limit = 20): Promise<FeedItem[]> {
  const supabase = await createClient();
  const blocked = await viewerBlockedIds();
  const { data } = await supabase
    .from("logs")
    .select("*, profiles(id, handle, name, bio, link, avatar_url)")
    .eq("shared", true)
    .order("created_at", { ascending: false })
    .limit(limit + blocked.size);

  const items = ((data ?? []) as LogWithProfileRow[])
    .filter((row) => !blocked.has(row.user_id))
    .slice(0, limit)
    .map((row) => ({ log: logFromRow(row), user: profileFromRow(row.profiles) }));
  await attachSenders(items.map((item) => item.log));
  return items;
}

// One piece from everyone's shared record that this reader hasn't logged,
// for the top of the feed on a day with nothing new in it (see daily.ts).
// `avoidWorkIds` are pieces already at the top of their screen. Reads two
// light columns across the record; wants a narrower query once the table
// is large.
export async function getDailyPiece(
  viewerId: string,
  day: number,
  avoidWorkIds: string[] = [],
): Promise<FeedItem | null> {
  const supabase = await createClient();
  const [others, own, followed, blocked] = await Promise.all([
    supabase
      .from("logs")
      .select("id, work_id, user_id")
      .eq("shared", true)
      .neq("user_id", viewerId)
      .order("created_at", { ascending: false })
      .limit(3000),
    supabase.from("logs").select("work_id").eq("user_id", viewerId).limit(5000),
    getFolloweeIds(viewerId),
    getBlockedIds(viewerId),
  ]);

  const logged = new Set(
    ((own.data ?? []) as { work_id: string }[]).map((row) => row.work_id),
  );
  const avoid = new Set(avoidWorkIds);

  // One log to stand for each piece: from someone the reader follows when
  // there is one, otherwise the newest.
  const standIn = new Map<string, { id: string; followed: boolean }>();
  for (const row of (others.data ?? []) as {
    id: string;
    work_id: string;
    user_id: string;
  }[]) {
    if (blocked.has(row.user_id) || logged.has(row.work_id)) continue;
    const isFollowed = followed.has(row.user_id);
    const current = standIn.get(row.work_id);
    if (!current || (isFollowed && !current.followed)) {
      standIn.set(row.work_id, { id: row.id, followed: isFollowed });
    }
  }

  // Leave out what they can already see, unless that is all there is.
  const all = [...standIn.keys()];
  const unseen = all.filter((workId) => !avoid.has(workId));
  const workId = pickDaily(unseen.length > 0 ? unseen : all, day);
  const chosen = workId ? standIn.get(workId) : undefined;
  if (!chosen) return null;

  const { data } = await supabase
    .from("logs")
    .select("*, profiles(id, handle, name, bio, link, avatar_url)")
    .eq("id", chosen.id)
    .maybeSingle();
  if (!data) return null;
  const row = data as LogWithProfileRow;
  const log = logFromRow(row);
  await attachSenders([log]);
  return { log, user: profileFromRow(row.profiles) };
}

// Resolve a work: its pooled logs (newest first, with loggers) plus an
// identity drawn from them.
export async function getWork(
  workId: string,
): Promise<(Work & { loggers: Map<string, Profile> }) | undefined> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("logs")
    .select("*, profiles(id, handle, name, bio, link, avatar_url)")
    .eq("work_id", workId)
    .eq("shared", true)
    .order("created_at", { ascending: false });

  const blocked = await viewerBlockedIds();
  const rows = ((data ?? []) as LogWithProfileRow[]).filter(
    (row) => !blocked.has(row.user_id),
  );
  if (rows.length === 0) return undefined;

  const logs = rows.map(logFromRow);
  await attachSenders(logs);
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

// When (if ever) the signed-in user already logged this URL's work — powers
// the "you logged this before" warning in the log form. Uses the same
// canonical work id as saving, so it matches exactly what a save would pool.
export async function ownLogDateForUrl(url: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !url.trim()) return null;

  const { data } = await supabase
    .from("logs")
    .select("created_at")
    .eq("user_id", user.id)
    .eq("work_id", workIdFor(url, ""))
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.created_at ?? null;
}

// What the readers of one work also logged — discovery through overlap.
// Grouped by work (newest log carries the identity), ranked by how many of
// this work's readers logged it, then by recency. Derived entirely from
// public shared logs; blocked users are filtered like everywhere else.
export async function getAlsoRead(
  workId: string,
  limit = 6,
): Promise<{ log: Log; readerCount: number }[]> {
  const supabase = await createClient();
  const blocked = await viewerBlockedIds();

  const { data: readers } = await supabase
    .from("logs")
    .select("user_id")
    .eq("work_id", workId)
    .eq("shared", true);
  const readerIds = [...new Set((readers ?? []).map((r) => r.user_id))].filter(
    (id) => !blocked.has(id),
  );
  if (readerIds.length === 0) return [];

  const { data } = await supabase
    .from("logs")
    .select("*")
    .in("user_id", readerIds)
    .neq("work_id", workId)
    .eq("shared", true)
    .order("created_at", { ascending: false })
    .limit(80);

  const byWork = new Map<string, { log: Log; readers: Set<string> }>();
  for (const row of (data ?? []) as LogRow[]) {
    const log = logFromRow(row);
    const entry = byWork.get(log.workId);
    if (entry) {
      entry.readers.add(log.userId);
    } else {
      byWork.set(log.workId, { log, readers: new Set([log.userId]) });
    }
  }
  return [...byWork.values()]
    .map(({ log, readers: r }) => ({ log, readerCount: r.size }))
    .sort(
      (a, b) =>
        b.readerCount - a.readerCount ||
        b.log.createdAt.localeCompare(a.log.createdAt),
    )
    .slice(0, limit);
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
      via_user_id: input.viaUserId ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return logFromRow(data as LogRow);
}

// What the record can say about a log the moment it is saved: who else
// logged the piece, and where it falls in the reader's own reading. Feeds
// the one line shown under the saved card (see afterLogLine).
export async function getAfterLogFacts(
  log: Log,
  monthStart: Date,
): Promise<AfterLogFacts> {
  const supabase = await createClient();
  const [own, others, followed, blocked] = await Promise.all([
    supabase
      .from("logs")
      .select("source, created_at")
      .eq("user_id", log.userId)
      .limit(5000),
    supabase
      .from("logs")
      .select("user_id, profiles(handle)")
      .eq("work_id", log.workId)
      .eq("shared", true)
      .neq("user_id", log.userId)
      .order("created_at", { ascending: false })
      .limit(200),
    getFolloweeIds(log.userId),
    viewerBlockedIds(),
  ]);

  const mine = (own.data ?? []) as { source: string | null; created_at: string }[];
  const sourceSlug = log.source ? slugify(log.source) : "";
  const monthStartTime = monthStart.getTime();

  // One entry per other reader, people the reader follows first.
  const seen = new Set<string>();
  const readers: { handle: string; followed: boolean }[] = [];
  for (const row of (others.data ?? []) as unknown as {
    user_id: string;
    profiles: { handle: string } | null;
  }[]) {
    if (!row.profiles || blocked.has(row.user_id) || seen.has(row.user_id)) {
      continue;
    }
    seen.add(row.user_id);
    readers.push({
      handle: row.profiles.handle,
      followed: followed.has(row.user_id),
    });
  }
  readers.sort((a, b) => Number(b.followed) - Number(a.followed));

  return {
    alsoReadBy: readers.map((r) => r.handle),
    // The new log is in `mine` already; max() covers a read that raced it.
    total: Math.max(mine.length, 1),
    thisMonth: mine.filter(
      (row) => new Date(row.created_at).getTime() >= monthStartTime,
    ).length,
    fromSource: sourceSlug
      ? mine.filter((row) => row.source && slugify(row.source) === sourceSlug)
          .length
      : 0,
  };
}

// Who handed the signed-in user this piece, if anyone: the person whose
// share link they arrived by (a handle hint from the link), else the member
// who most recently used Share to send it to them. Attribution only.
export async function findSenderFor(
  workId: string,
  hintHandle: string | null,
): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  if (hintHandle) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("handle", hintHandle)
      .maybeSingle();
    if (data && data.id !== user.id) return data.id;
  }

  const { data: send } = await supabase
    .from("sends")
    .select("sender_id")
    .eq("recipient_id", user.id)
    .eq("work_id", workId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return send?.sender_id ?? null;
}

// --- Sources and authors -------------------------------------------------------

// Everything logged here from one publication, or by one author: the pieces
// (most-read first), and the people who read them.
export interface Catalog {
  name: string; // as people most often wrote it
  works: { log: Log; readerCount: number }[];
  readers: { profile: Profile; pieces: number }[];
}

export async function getCatalog(
  field: "source" | "author",
  slug: string,
): Promise<Catalog | undefined> {
  const supabase = await createClient();
  const blocked = await viewerBlockedIds();

  // Which logs carry this source or author. A slug folds case, accents and
  // punctuation, which SQL can't compare on directly, so match in code over
  // two light columns. Wants a stored slug column once the table is large.
  const { data: candidates } = await supabase
    .from("logs")
    .select(`id, ${field}`)
    .eq("shared", true)
    .not(field, "is", null)
    .order("created_at", { ascending: false })
    .limit(5000);
  const ids = ((candidates ?? []) as unknown as Record<string, string>[])
    .filter((row) => slugify(row[field]) === slug)
    .map((row) => row.id)
    .slice(0, 150);
  if (ids.length === 0) return undefined;

  const { data } = await supabase
    .from("logs")
    .select("*, profiles(id, handle, name, bio, link, avatar_url)")
    .in("id", ids)
    .order("created_at", { ascending: false });
  const rows = ((data ?? []) as LogWithProfileRow[]).filter(
    (row) => !blocked.has(row.user_id),
  );
  if (rows.length === 0) return undefined;

  const names = new Map<string, number>();
  const byWork = new Map<string, { log: Log; readers: Set<string> }>();
  const byReader = new Map<string, { profile: Profile; works: Set<string> }>();
  for (const row of rows) {
    const log = logFromRow(row);
    const name = (field === "source" ? log.source : log.author)?.trim();
    if (name) names.set(name, (names.get(name) ?? 0) + 1);

    const work = byWork.get(log.workId);
    if (work) work.readers.add(log.userId);
    else byWork.set(log.workId, { log, readers: new Set([log.userId]) });

    const reader = byReader.get(log.userId);
    if (reader) reader.works.add(log.workId);
    else {
      byReader.set(log.userId, {
        profile: profileFromRow(row.profiles),
        works: new Set([log.workId]),
      });
    }
  }

  return {
    name: [...names.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? slug,
    works: [...byWork.values()]
      .map(({ log, readers }) => ({ log, readerCount: readers.size }))
      .sort(
        (a, b) =>
          b.readerCount - a.readerCount ||
          b.log.createdAt.localeCompare(a.log.createdAt),
      ),
    readers: [...byReader.values()]
      .map(({ profile, works }) => ({ profile, pieces: works.size }))
      .sort(
        (a, b) =>
          b.pieces - a.pieces || a.profile.name.localeCompare(b.profile.name),
      ),
  };
}

// --- Favorites -----------------------------------------------------------------

// Add one of your own logs to your favorites, or take it out. Four at most:
// the point is choosing.
export async function setPinned(logId: string, pinned: boolean): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in first.");

  if (pinned) {
    const { count } = await supabase
      .from("logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .not("pinned_at", "is", null);
    if ((count ?? 0) >= 4) {
      throw new Error("Four is the limit. Unfavorite one first.");
    }
  }

  const { error } = await supabase
    .from("logs")
    .update({ pinned_at: pinned ? new Date().toISOString() : null })
    .eq("id", logId)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
}

// --- Weekly email --------------------------------------------------------------

// Whether the signed-in person gets the weekly email. On unless they turned
// it off (a missing row means on, same as the table's default).
export async function getWeeklyEmail(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("email_prefs")
    .select("weekly")
    .eq("user_id", user.id)
    .maybeSingle();
  return data?.weekly ?? true;
}

export async function setWeeklyEmail(on: boolean): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in first.");
  const { error } = await supabase
    .from("email_prefs")
    .update({ weekly: on, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
}

// Turn the weekly email off for whoever holds this token (from the link in
// an email). Works signed out; can only ever turn it off. Says nothing
// about whether the token was real.
export async function unsubscribeByToken(token: string): Promise<void> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return;
  }
  const supabase = await createClient();
  await supabase.rpc("unsubscribe_weekly", { p_token: token });
}
