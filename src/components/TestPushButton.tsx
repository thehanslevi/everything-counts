"use client";

import { useState, useTransition } from "react";
import { sendTestPush } from "@/app/actions";

// Founder-only: fire a push at your own phone and see what APNs said.
export function TestPushButton() {
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      const result = await sendTestPush();
      setIsError(!result.ok);
      setMessage(result.ok ? (result.message ?? "Sent.") : (result.error ?? "Failed."));
    });
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="border-2 border-foreground px-4 py-1.5 font-structural text-xs font-bold uppercase tracking-[0.12em] text-foreground transition-colors hover:bg-foreground hover:text-background disabled:opacity-40"
      >
        {isPending ? "Sending" : "Send a test notification"}
      </button>
      {message && (
        <span
          className={`font-structural text-[0.65rem] font-bold uppercase tracking-[0.12em] ${
            isError ? "text-accent" : "text-foreground/60"
          }`}
        >
          {message}
        </span>
      )}
    </div>
  );
}
