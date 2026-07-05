"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addLog } from "@/lib/data/logs";
import { FORMS, type Form, type Log } from "@/lib/data/types";

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
    return { ok: true, log };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not save the log.",
    };
  }
}

// --- Auth --------------------------------------------------------------------

export async function signUp(formData: FormData): Promise<ActionResult> {
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const password = (formData.get("password") as string | null) ?? "";
  if (!email || password.length < 8) {
    return {
      ok: false,
      error: "Email and a password of at least 8 characters are required.",
    };
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
  const role = (formData.get("role") as string | null)?.trim() ?? "";

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
    role: role || null,
  });
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That handle is taken." };
    }
    return { ok: false, error: error.message };
  }
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
  }

  revalidatePath("/feed");
  revalidatePath("/people");
}
