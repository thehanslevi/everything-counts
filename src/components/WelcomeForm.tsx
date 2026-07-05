"use client";

import { useState, useTransition } from "react";
import { createProfile } from "@/app/actions";

const inputClass =
  "w-full rounded-none border border-foreground bg-[#fbf7ee] px-3 py-2 font-structural text-sm text-foreground outline-none placeholder:text-foreground/35 focus:border-accent";

const labelClass =
  "flex items-center gap-2 font-structural text-xs font-bold uppercase tracking-[0.12em] text-foreground";

// Onboarding: claim a handle, set a name and optional one-line role.
export function WelcomeForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createProfile(data);
      if (result && !result.ok && result.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className={labelClass}>
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={60}
          placeholder="How you want to appear"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="handle" className={labelClass}>
          Handle
          <span className="font-normal lowercase tracking-normal text-foreground/40">
            letters, numbers, underscores
          </span>
        </label>
        <input
          id="handle"
          name="handle"
          type="text"
          required
          minLength={2}
          maxLength={24}
          pattern="[a-zA-Z0-9_]+"
          placeholder="yourname"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="role" className={labelClass}>
          One-line role
          <span className="font-normal lowercase tracking-normal text-foreground/40">
            optional
          </span>
        </label>
        <input
          id="role"
          name="role"
          type="text"
          maxLength={80}
          placeholder="e.g. Policy researcher, digital governance"
          className={inputClass}
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
        {isPending ? "Working" : "Start your record"}
      </button>
    </form>
  );
}
