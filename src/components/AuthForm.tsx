"use client";

import { useState, useTransition } from "react";
import { requestPasswordReset, signIn, signUp } from "@/app/actions";

const inputClass =
  "w-full rounded-none border border-foreground bg-[#fbf7ee] px-3 py-2 font-structural text-sm text-foreground outline-none placeholder:text-foreground/35 focus:border-accent";

const labelClass =
  "font-structural text-xs font-bold uppercase tracking-[0.12em] text-foreground";

type Mode = "signin" | "signup" | "forgot";

// Sign in / create account / forgot password, one panel. `inviteRef` is the
// handle of whoever shared their invite link; it rides along signup so the
// new person starts by following their inviter.
export function AuthForm({ inviteRef }: { inviteRef?: string }) {
  const [mode, setMode] = useState<Mode>(inviteRef ? "signup" : "signin");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const data = new FormData(e.currentTarget);

    startTransition(async () => {
      const action =
        mode === "signin"
          ? signIn
          : mode === "signup"
            ? signUp
            : requestPasswordReset;
      const result = await action(data);
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

  const tabClass = (m: Mode) =>
    `px-4 py-2 font-structural text-sm font-bold uppercase tracking-[0.14em] transition-colors ${
      mode === m
        ? "bg-foreground text-background"
        : "text-foreground hover:bg-foreground/10"
    }`;

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => switchMode("signin")} className={tabClass("signin")}>
          Sign in
        </button>
        <button type="button" onClick={() => switchMode("signup")} className={tabClass("signup")}>
          Create account
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
        {mode === "signup" && inviteRef && (
          <input type="hidden" name="ref" value={inviteRef} />
        )}

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

        {mode !== "forgot" && (
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
        )}

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

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={isPending}
            className="bg-accent px-6 py-2.5 font-structural text-xs font-bold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-85 disabled:opacity-40"
          >
            {isPending
              ? "Working"
              : mode === "signin"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : "Send reset link"}
          </button>
          {mode === "signin" && (
            <button
              type="button"
              onClick={() => switchMode("forgot")}
              className="font-structural text-xs font-bold uppercase tracking-[0.1em] text-foreground/50 hover:text-foreground"
            >
              Forgot password?
            </button>
          )}
          {mode === "forgot" && (
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className="font-structural text-xs font-bold uppercase tracking-[0.1em] text-foreground/50 hover:text-foreground"
            >
              Back to sign in
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
