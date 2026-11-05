"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { togglePin } from "@/app/actions";

// Add one of your own logs to your favorites (up to four, shown at the top
// of your profile), or take it back out.
export function PinButton({
  logId,
  pinned,
}: {
  logId: string;
  pinned: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    setError(null);
    const data = new FormData();
    data.set("logId", logId);
    data.set("pinned", String(!pinned));
    startTransition(async () => {
      const result = await togglePin(data);
      if (!result.ok) {
        setError(result.error ?? "Couldn't change that.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <span className="inline-flex items-center gap-3">
      {error && (
        <span className="font-structural text-[0.65rem] font-bold uppercase tracking-[0.1em] text-accent">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="font-structural text-[0.65rem] font-bold uppercase tracking-[0.14em] text-foreground/40 hover:text-accent disabled:opacity-40"
      >
        {pinned ? "Unfavorite" : "Favorite"}
      </button>
    </span>
  );
}
