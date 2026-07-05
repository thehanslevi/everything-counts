"use client";

import { useState, useTransition } from "react";
import { signIn, signUp } from "@/app/actions";

const inputClass =
  "w-full rounded-none border border-foreground bg-[#fbf7ee] px-3 py-2 font-structural text-sm text-foreground outline-none placeholder:text-foreground/35 focus:border-accent";

const labelClass =
  "font-structural text-xs font-bold uppercase tracking-[0.12em] text-foreground";

// Sign in / sign up, one panel with a mode toggle.
export function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const data = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await (mode === "signin" ? signIn(data) : signUp(data));
      // On success these actions redirect; reaching here means a message.
      if (result && !result.ok && result.error) {
        if (result.error.startsWith("Check your email")) {
          setNotice(result.error);
        } else {
          setError(result.error);
        }
      }
    });
  }

  return (
    <div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`px-4 py-2 font-structural text-sm font-bold uppercase tracking-[0.14em] transition-colors ${
            mode === "signin"
              ? "bg-foreground text-background"
              : "text-foreground hover:bg-foreground/10"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`px-4 py-2 font-structural text-sm font-bold uppercase tracking-[0.14em] transition-colors ${
            mode === "signup"
              ? "bg-foreground text-background"
              : "text-foreground hover:bg-foreground/10"
          }`}
        >
          Create account
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="password" className={labelClass}>
            Password
            {mode === "signup" && (
              <span className="ml-2 font-normal lowercase tracking-normal text-foreground/40">
                at least 8 characters
              </span>
            )}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className={inputClass}
          />
        </div>

        {error && (
          <p className="font-structural text-xs font-bold uppercase tracking-wide text-accent">
            {error}
          </p>
        )}
        {notice && (
          <p className="border border-foreground bg-[#fbf7ee] px-3 py-2 font-structural text-xs font-bold uppercase tracking-wide text-foreground">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="self-start bg-accent px-6 py-2.5 font-structural text-xs font-bold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-85 disabled:opacity-40"
        >
          {isPending
            ? "Working"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>
    </div>
  );
}
