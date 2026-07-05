"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "@/app/actions";

// Permanent account deletion, gated by typing your handle. Required in-app for
// the App Store (guideline 5.1.1); good hygiene everywhere else.
export function DeleteAccountForm({ handle }: { handle: string }) {
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const data = new FormData();
    data.set("confirm", confirm);
    startTransition(async () => {
      const result = await deleteAccount(data);
      if (result && !result.ok && result.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="font-serif text-[13px] leading-[1.55] text-foreground/70">
        Deleting your account removes your profile, every log, and your follows
        — permanently. There is no undo. Type{" "}
        <strong className="font-structural text-foreground">@{handle}</strong>{" "}
        to confirm.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={handle}
          autoComplete="off"
          className="w-40 rounded-none border border-foreground bg-[#fbf7ee] px-3 py-2 font-structural text-sm text-foreground outline-none placeholder:text-foreground/35 focus:border-accent"
        />
        <button
          type="submit"
          disabled={isPending || confirm.trim().toLowerCase() !== handle}
          className="rounded-none bg-foreground px-4 py-2 font-structural text-xs font-bold uppercase tracking-[0.12em] text-background transition-opacity hover:opacity-85 disabled:opacity-30"
        >
          {isPending ? "Deleting" : "Delete account"}
        </button>
      </div>
      {error && (
        <p className="font-structural text-xs font-bold uppercase tracking-wide text-accent">
          {error}
        </p>
      )}
    </form>
  );
}
