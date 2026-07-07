"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  addLog,
  deleteLog,
  reportContent,
  setBlocked,
  updateLog,
  updateProfile as saveProfile,
} from "@/lib/data/logs";
import { FORMS, type Form, type Log } from "@/lib/data/types";
import { notify, notifyNewLog } from "@/lib/push";

const SITE_URL = "https://everything-counts.vercel.app";
const FOUNDER_HANDLE = "hrlevinson";
const INVITE_COOKIE = "ec-invited-by";

export interface ActionResult {
  ok: boolean;
  error?: string;
  log?: Log;
}

// --- Logging -----------------------------------------------------------------

export async function createLog(formData: FormData): Promise<ActionResult> {
  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const formValue = (formData.get("form") as string | null) ?? "";
  const ratingRaw = (formData.get("rating") as string | null)?.trim() ?? "";

  if (!title) return { ok: false, error: "A title is required." };
  if (!FORMS.includes(formValue as Form)) {
    return { ok: false, error: "Pick a form for the piece." };
  }

  let rating: number | null = null;
  if (ratingRaw) {
    const parsed = Number(ratingRaw);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
      return { ok: false, error: "Rating must be between 1 and 5." };
    }
    rating = parsed;
  }

  try {
    const log = await addLog({
      url: (formData.get("url") as string | null) ?? null,
      title,
      author: (formData.get("author") as string | null) ?? null,
      source: (formData.get("source") as string | null) ?? null,
      image: (formData.get("image") as string | null) ?? null,
      form: formValue as Form,
      take: (formData.get("take") as string | null) ?? null,
      rating,
    });
    revalidatePath("/");
    revalidatePath("/feed");
    // Tell this user's followers a new piece landed. Best-effort.
    await notifyNewLog(log);
    return { ok: true, log };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not save the log.",
    };
  }
}

// Edit one of your logs (URL stays immutable — it is the work identity).
export async function editLog(formData: FormData): Promise<ActionResult> {
  const id = (formData.get("id") as string | null) ?? "";
  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const formValue = (formData.get("form") as string | null) ?? "";
  const ratingRaw = (formData.get("rating") as string | null)?.trim() ?? "";

  if (!id) return { ok: false, error: "Missing log id." };
  if (!title) return { ok: false, error: "A title is required." };
  if (!FORMS.includes(formValue as Form)) {
    return { ok: false, error: "Pick a form for the piece." };
  }
  let rating: number | null = null;
  if (ratingRaw) {
    const parsed = Number(ratingRaw);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
      return { ok: false, error: "Rating must be between 1 and 5." };
    }
    rating = parsed;
  }

  try {
    await updateLog(id, {
      title,
      author: (formData.get("author") as string | null) ?? null,
      source: (formData.get("source") as string | null) ?? null,
      image: (formData.get("image") as string | null) ?? null,
      form: formValue as Form,
      take: (formData.get("take") as string | null) ?? null,
      rating,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not save changes.",
    };
  }
  revalidatePath("/");
  revalidatePath("/feed");
  redirect("/");
}

// Delete one of your logs, permanently.
export async function removeLog(formData: FormData): Promise<ActionResult> {
  const id = (formData.get("id") as string | null) ?? "";
  if (!id) return { ok: false, error: "Missing log id." };
  try {
    await deleteLog(id);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not delete.",
    };
  }
  revalidatePath("/");
  revalidatePath("/feed");
  redirect("/");
}

// --- Auth --------------------------------------------------------------------

export async function signUp(formData: FormData): Promise<ActionResult> {
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const password = (formData.get("password") as string | null) ?? "";
  const inviteRef = (formData.get("ref") as string | null)?.trim().toLowerCase() ?? "";
  if (!email || password.length < 8) {
    return {
      ok: false,
      error: "Email and a password of at least 8 characters are required.",
    };
  }

  // Remember who invited this person across the confirm/onboard hop.
  if (inviteRef && /^[a-z0-9_]{2,24}$/.test(inviteRef)) {
    const cookieStore = await cookies();
    cookieStore.set(INVITE_COOKIE, inviteRef, {
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { ok: false, error: error.message };

  // With email confirmation enabled there is no session yet; the user lands
  // on /welcome after confirming and signing in.
  if (!data.session) {
    return {
      ok: false,
      error: "Check your email to confirm your account, then sign in.",
    };
  }
  redirect("/welcome");
}

export async function signIn(formData: FormData): Promise<ActionResult> {
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const password = (formData.get("password") as string | null) ?? "";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// Post-signup onboarding: claim a handle and name.
export async function createProfile(formData: FormData): Promise<ActionResult> {
  const handle = ((formData.get("handle") as string | null) ?? "")
    .trim()
    .toLowerCase();
  const name = (formData.get("name") as string | null)?.trim() ?? "";

  if (!/^[a-z0-9_]{2,24}$/.test(handle)) {
    return {
      ok: false,
      error: "Handles are 2-24 characters: letters, numbers, underscores.",
    };
  }
  if (!name) return { ok: false, error: "A name is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in first." };

  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    handle,
    name,
  });
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That handle is taken." };
    }
    return { ok: false, error: error.message };
  }

  // Seed the new person's graph so the feed is never dead air: follow the
  // founder, and follow whoever invited them (disclosed on the welcome page;
  // unfollow is one tap). Best-effort — failures never block onboarding.
  const cookieStore = await cookies();
  const inviteRef = cookieStore.get(INVITE_COOKIE)?.value;
  const followHandles = new Set(
    [FOUNDER_HANDLE, inviteRef].filter((h): h is string => Boolean(h)),
  );
  followHandles.delete(handle); // never self-follow
  if (followHandles.size > 0) {
    const { data: toFollow } = await supabase
      .from("profiles")
      .select("id, handle")
      .in("handle", [...followHandles]);
    for (const target of toFollow ?? []) {
      if (target.id !== user.id) {
        await supabase
          .from("follows")
          .insert({ follower_id: user.id, followee_id: target.id });
      }
    }
    // Reward the inviter: tell them their invite converted. Best-effort.
    if (inviteRef && inviteRef !== handle) {
      const inviter = (toFollow ?? []).find((p) => p.handle === inviteRef);
      if (inviter && inviter.id !== user.id) {
        await notify({
          recipientUserId: inviter.id,
          title: "Your invite was accepted",
          body: `@${handle} joined from your invite.`,
          url: `/u/${handle}`,
        });
      }
    }
  }
  cookieStore.delete(INVITE_COOKIE);

  redirect("/");
}

// Edit your own profile: name, bio, one link, and optionally the avatar. The
// avatarUrl field is tri-state: omitted = leave as-is, "" = clear back to the
// generated seal, a URL = set the photo (already uploaded to Storage client-
// side). The handle is not editable — it is the identity.
export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const bio = (formData.get("bio") as string | null) ?? null;
  const linkRaw = (formData.get("link") as string | null)?.trim() ?? "";
  if (!name) return { ok: false, error: "A name is required." };

  let link: string | null = null;
  if (linkRaw) {
    link = /^https?:\/\//i.test(linkRaw) ? linkRaw : `https://${linkRaw}`;
  }

  const hasAvatar = formData.has("avatarUrl");
  const avatarUrl = hasAvatar
    ? (formData.get("avatarUrl") as string | null) || null
    : undefined;

  try {
    await saveProfile({ name, bio, link, ...(hasAvatar ? { avatarUrl } : {}) });
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Could not save your profile.",
    };
  }

  revalidatePath("/");
  const handle = (formData.get("handle") as string | null)?.trim().toLowerCase();
  if (handle) revalidatePath(`/u/${handle}`);
  return { ok: true };
}

// --- Password reset ------------------------------------------------------------

// Send the reset email. The link lands on /reset with a recovery code.
export async function requestPasswordReset(
  formData: FormData,
): Promise<ActionResult> {
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  if (!email) return { ok: false, error: "Enter your email." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/reset`,
  });
  if (error) return { ok: false, error: error.message };
  return {
    ok: false,
    error: "Check your email for a reset link.",
  };
}

// Set the new password (the /reset page has already exchanged the code for a
// session by the time this runs).
export async function updatePassword(
  formData: FormData,
): Promise<ActionResult> {
  const password = (formData.get("password") as string | null) ?? "";
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: error.message };
  redirect("/");
}

// Permanently delete the signed-in user's account and everything they logged.
// Required in-app by App Store guideline 5.1.1. The database function is a
// security-definer RPC that deletes exactly the calling auth user; the delete
// cascades to their profile, logs, and follows.
export async function deleteAccount(formData: FormData): Promise<ActionResult> {
  const confirmation = ((formData.get("confirm") as string | null) ?? "")
    .trim()
    .toLowerCase();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in first." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("handle")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || confirmation !== profile.handle) {
    return { ok: false, error: "Type your handle exactly to confirm." };
  }

  const { error } = await supabase.rpc("delete_account");
  if (error) return { ok: false, error: error.message };

  await supabase.auth.signOut();
  redirect("/");
}

// --- UGC safety (report / block) ---------------------------------------------

export async function toggleBlock(formData: FormData): Promise<void> {
  const userId = (formData.get("userId") as string | null) ?? "";
  const blocked = formData.get("blocked") === "true";
  if (!userId) return;
  await setBlocked(userId, !blocked);
  revalidatePath("/feed");
  revalidatePath("/people");
  revalidatePath(`/u`);
}

export async function submitReport(formData: FormData): Promise<ActionResult> {
  const targetUserId = (formData.get("targetUserId") as string | null) || undefined;
  const targetLogId = (formData.get("targetLogId") as string | null) || undefined;
  const reason = (formData.get("reason") as string | null) ?? "";
  if (!targetUserId && !targetLogId) {
    return { ok: false, error: "Nothing to report." };
  }
  try {
    await reportContent({ targetUserId, targetLogId, reason });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not send report.",
    };
  }
  return { ok: true };
}

// --- Follows -----------------------------------------------------------------

export async function toggleFollow(formData: FormData): Promise<void> {
  const followeeId = (formData.get("followeeId") as string | null) ?? "";
  const currentlyFollowing = formData.get("following") === "true";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !followeeId || followeeId === user.id) return;

  if (currentlyFollowing) {
    await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("followee_id", followeeId);
  } else {
    await supabase
      .from("follows")
      .insert({ follower_id: user.id, followee_id: followeeId });
    // Tell the followee they have a new follower. Best-effort.
    const { data: me } = await supabase
      .from("profiles")
      .select("handle")
      .eq("id", user.id)
      .maybeSingle();
    if (me) {
      await notify({
        recipientUserId: followeeId,
        title: "New follower",
        body: `@${me.handle} started following you.`,
        url: `/u/${me.handle}`,
      });
    }
  }

  revalidatePath("/feed");
  revalidatePath("/people");
}

// --- Push notifications ------------------------------------------------------

// Store (or refresh) an APNs device token for the signed-in user. Called from
// the native shell after push registration (see PushRegistrar). Silent no-op
// when signed out — the token is picked up on a later app open.
export async function registerDeviceToken(
  token: string,
  platform = "ios",
): Promise<void> {
  if (!token) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("device_tokens").upsert(
    {
      token,
      user_id: user.id,
      platform,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "token" },
  );
}
