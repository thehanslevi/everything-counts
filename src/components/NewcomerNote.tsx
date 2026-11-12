"use client";

import { useState, useTransition } from "react";
import { sendNoteToNewcomers } from "@/app/actions";

// Founder-only: write one note to the people who signed up and haven't
// logged anything, and push it to their phones. Two taps to send, so it
// can't go by accident.
export function NewcomerNote({ count }: { count: number }) {
  const [text, setText] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  if (count === 0) return null;

  function send() {
    setResult(null);
    startTransition(async () => {
      const r = await sendNoteToNewcomers(text);
      setConfirming(false);
      setResult({ ok: r.ok, text: r.ok ? (r.message ?? "Sent.") : (r.error ?? "Failed.") });
      if (r.ok) setText("");
    });
  }

  return (
    <div className="mt-6 border-2 border-foreground bg-paper p-4">
      <p className="font-structural text-xs font-bold uppercase tracking-[0.12em] text-foreground">
        {count} {count === 1 ? "person has" : "people have"} signed up without
        logging anything
      </p>
      <textarea
        rows={3}
        maxLength={240}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setConfirming(false);
        }}
        placeholder="A note to their phones. Tapping it opens the first-log page."
        className="mt-3 w-full resize-none rounded-none border border-foreground bg-[#fbf7ee] px-3 py-2 font-serif text-[15px] text-foreground outline-none placeholder:text-foreground/35 focus:border-accent"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {confirming ? (
          <>
            <button
              type="button"
              onClick={send}
              disabled={isPending}
              className="bg-accent px-4 py-1.5 font-structural text-xs font-bold uppercase tracking-[0.12em] text-white disabled:opacity-40"
            >
              {isPending ? "Sending" : `Yes, send to ${count}`}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="font-structural text-xs font-bold uppercase tracking-[0.12em] text-foreground/60"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={!text.trim()}
            className="border-2 border-foreground px-4 py-1.5 font-structural text-xs font-bold uppercase tracking-[0.12em] text-foreground transition-colors hover:bg-foreground hover:text-background disabled:opacity-40"
          >
            Send
          </button>
        )}
        <span className="font-structural text-[0.65rem] font-bold uppercase tracking-[0.12em] text-foreground/45">
          {text.length}/240
        </span>
      </div>
      {result && (
        <p
          className={`mt-2 font-structural text-[0.65rem] font-bold uppercase tracking-[0.12em] ${
            result.ok ? "text-foreground/60" : "text-accent"
          }`}
        >
          {result.text}
        </p>
      )}
    </div>
  );
}
