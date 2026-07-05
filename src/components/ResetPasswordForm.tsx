"use client";

import { useState, useTransition } from "react";
import { updatePassword } from "@/app/actions";

// New-password form, shown after the reset link has been exchanged for a
// session.
export function ResetPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updatePassword(data);
      if (result && !result.ok && result.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="password"
          className="font-structural text-xs font-bold uppercase tracking-[0.12em] text-foreground"
        >
          New password
          <span className="ml-2 font-normal lowercase tracking-normal text-foreground/40">
            at least 8 characters
          </span>
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-none border border-foreground bg-[#fbf7ee] px-3 py-2 font-structural text-sm text-foreground outline-none placeholder:text-foreground/35 focus:border-accent"
        />
      </div>

      {error && (
        <p className="font-structural text-xs font-bold uppercase tracking-wide text-accent">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="self-start bg-accent px-6 py-2.5 font-structural text-xs font-bold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-85 disabled:opacity-40"
      >
        {isPending ? "Working" : "Set new password"}
      </button>
    </form>
  );
}
