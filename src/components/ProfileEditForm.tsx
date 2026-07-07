"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/actions";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";
import type { Profile } from "@/lib/data/types";

const inputClass =
  "w-full rounded-none border border-foreground bg-[#fbf7ee] px-3 py-2 font-structural text-sm text-foreground outline-none placeholder:text-foreground/35 focus:border-accent";
const labelClass =
  "flex items-center gap-2 font-structural text-xs font-bold uppercase tracking-[0.12em] text-foreground";

// Edit your own profile: photo (or fall back to the generated seal), name,
// bio, and one link. The photo uploads straight to Supabase Storage from the
// browser under your own uid folder; the resulting URL is saved on submit.
export function ProfileEditForm({
  profile,
  onDone,
}: {
  profile: Profile;
  onDone?: () => void;
}) {
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [link, setLink] = useState(profile.link ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2 MB.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const supabase = createBrowserSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Sign in again to upload.");
        return;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) {
        setError(upErr.message);
        return;
      }
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    } catch {
      setError("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("name", name);
    fd.set("bio", bio);
    fd.set("link", link);
    fd.set("handle", profile.handle);
    fd.set("avatarUrl", avatarUrl ?? "");
    startTransition(async () => {
      const result = await updateProfile(fd);
      if (result && !result.ok) {
        setError(result.error ?? "Could not save your profile.");
        return;
      }
      router.refresh();
      onDone?.();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <Avatar
          profile={{ handle: profile.handle, name, avatarUrl }}
          className="size-16"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded-none border border-foreground bg-paper px-3 py-1.5 font-structural text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground transition-colors hover:bg-foreground hover:text-background disabled:opacity-40"
          >
            {uploading ? "Uploading…" : avatarUrl ? "Change photo" : "Upload photo"}
          </button>
          {avatarUrl && (
            <button
              type="button"
              onClick={() => setAvatarUrl(null)}
              className="rounded-none border border-foreground px-3 py-1.5 font-structural text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground/60 transition-colors hover:text-foreground"
            >
              Use my seal
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onFile}
            className="hidden"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="edit-name" className={labelClass}>
          Name
        </label>
        <input
          id="edit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={60}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="edit-bio" className={labelClass}>
          Bio
          <span className="font-normal lowercase tracking-normal text-foreground/40">
            optional
          </span>
        </label>
        <textarea
          id="edit-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          maxLength={280}
          placeholder="Who you are, what you read."
          className={`${inputClass} resize-none font-serif normal-case`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="edit-link" className={labelClass}>
          Link
          <span className="font-normal lowercase tracking-normal text-foreground/40">
            optional
          </span>
        </label>
        <input
          id="edit-link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          maxLength={200}
          placeholder="your-site.com"
          className={inputClass}
        />
      </div>

      {error && (
        <p className="font-structural text-xs font-bold uppercase tracking-wide text-accent">
          {error}
        </p>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending || uploading}
          className="self-start rounded-none bg-accent px-6 py-2.5 font-structural text-xs font-bold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-85 disabled:opacity-40"
        >
          {isPending ? "Saving…" : "Save profile"}
        </button>
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="font-structural text-xs font-bold uppercase tracking-[0.1em] text-foreground/50 hover:text-foreground"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
