"use client";

import { useState } from "react";

// Your personal invite link: whoever signs up through it starts by following
// you. Hand-to-hand seeding, made one tap.
export function InviteLink({ handle }: { handle: string }) {
  const [copied, setCopied] = useState(false);
  const url = `https://everything-counts.vercel.app/signin?ref=${handle}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — the input below is selectable by hand.
    }
  }

  return (
    <div className="border-[3px] border-foreground bg-paper p-4">
      <p className="font-structural text-xs font-bold uppercase tracking-[0.2em] text-foreground">
        <span className="mr-2 inline-block size-2 rounded-full bg-accent align-middle" />
        Your invite link
      </p>
      <p className="mt-1 font-serif text-[13px] leading-[1.5] text-foreground/70">
        People who join through it automatically follow you.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-none border border-foreground bg-[#fbf7ee] px-3 py-2 font-structural text-xs text-foreground outline-none"
        />
        <button
          type="button"
          onClick={copy}
          className="whitespace-nowrap bg-accent px-4 py-2 font-structural text-xs font-bold uppercase tracking-[0.1em] text-white transition-opacity hover:opacity-85"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
