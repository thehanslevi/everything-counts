"use client";

import { useState } from "react";
import { retireClipboardLink } from "@/lib/native";

// Copies the current page URL to the clipboard — a share affordance for work
// pages. Falls back silently if the clipboard API is unavailable.
export function CopyLinkButton({ label = "Copy link" }: { label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      // The app put this link there: the copy-to-log bar shouldn't offer it.
      void retireClipboardLink();
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // no-op
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="font-structural text-xs font-bold uppercase tracking-[0.12em] text-foreground/60 transition-colors hover:text-foreground"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
