"use client";

import { useState, useTransition } from "react";
import { refreshCatalogNow } from "@/app/actions";

// Founder-only: fetch every publication's feed into the title catalog now,
// instead of waiting for the daily run.
export function RefreshCatalogButton() {
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      const result = await refreshCatalogNow();
      setIsError(!result.ok);
      setMessage(
        result.ok ? (result.message ?? "Done.") : (result.error ?? "Failed."),
      );
    });
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="border-2 border-foreground px-4 py-1.5 font-structural text-xs font-bold uppercase tracking-[0.12em] text-foreground transition-colors hover:bg-foreground hover:text-background disabled:opacity-40"
      >
        {isPending ? "Refreshing" : "Refresh the title catalog"}
      </button>
      {message && (
        <span
          className={`min-w-0 max-w-full font-structural text-[0.65rem] font-bold uppercase tracking-[0.12em] [overflow-wrap:anywhere] ${
            isError ? "text-accent" : "text-foreground/60"
          }`}
        >
          {message}
        </span>
      )}
    </div>
  );
}
