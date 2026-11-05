"use client";

import { useState } from "react";

// Save or send the poster. On a phone this hands the image file to the
// system share sheet (Photos, Messages, a story). Where files can't be
// shared, it downloads instead.
export function CardActions({
  src,
  filename,
  title,
}: {
  src: string;
  filename: string;
  title: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleShare() {
    setError(null);
    setBusy(true);
    try {
      const blob = await (await fetch(src)).blob();
      const file = new File([blob], filename, { type: "image/png" });
      if (
        typeof navigator.share === "function" &&
        navigator.canShare?.({ files: [file] })
      ) {
        await navigator.share({ files: [file], title });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      // Closing the share sheet is not a failure.
      if (!(err instanceof Error && err.name === "AbortError")) {
        setError("Couldn't share it. Press and hold the image to save.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={handleShare}
        disabled={busy}
        className="rounded-none bg-accent px-6 py-2.5 font-structural text-xs font-bold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-85 disabled:opacity-40"
      >
        {busy ? "Working" : "Save or share"}
      </button>
      {error && (
        <p className="font-structural text-xs font-bold uppercase tracking-wide text-accent">
          {error}
        </p>
      )}
    </div>
  );
}
