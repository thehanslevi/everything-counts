"use client";

import { useState, useTransition } from "react";
import { sendNoteToNewcomers, sendTestNoteEmail } from "@/app/actions";

// Founder-only: write one note to the people who signed up and haven't
// logged anything. It goes to their phones (those with notifications on)
// and their inboxes. "Email me a test" sends the email to your own inbox
// first. The real send takes two taps, so it can't go by accident.
//
// The button labels, placeholder and pending text here are drafts (mine,
// not yet approved), like the result messages in src/lib/note.ts.
export function NewcomerNote({ count }: { count: number }) {
  const [text, setText] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isTesting, startTest] = useTransition();
  const busy = isPending || isTesting;

  if (count === 0) return null;

  function send() {
    setResult(null);
    startTransition(async () => {
      const r = await sendNoteToNewcomers(text);
      setConfirming(false);
      // Partial: the push went but some or all of the email didn't. The
      // note stays in the box and the outcome shows as a warning. (Sending
      // again pushes to the phones again; "Email me a test" first catches
      // an email function that isn't ready.)
      const done = r.ok && !r.partial;
      setResult({ ok: done, text: r.ok ? (r.message ?? "Sent.") : (r.error ?? "Failed.") });
      if (done) setText("");
    });
  }

  function test() {
    setResult(null);
    startTest(async () => {
      const r = await sendTestNoteEmail(text);
      setResult({ ok: r.ok, text: r.ok ? (r.message ?? "Sent.") : (r.error ?? "Failed.") });
    });
  }

  return (
    <div className="mt-6 border-2 border-foreground bg-paper p-4">
      <p className="font-structural text-xs font-bold uppercase tracking-[0.12em] text-foreground">
        {count} {count === 1 ? "person has" : "people have"} signed up without
        logging anything
      </p>
      <textarea
        rows={6}
        maxLength={5000}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setConfirming(false);
        }}
        placeholder="A note to their phones and inboxes. Opening it takes them to the first-log page."
        className="mt-3 w-full resize-none rounded-none border border-foreground bg-[#fbf7ee] px-3 py-2 font-serif text-[15px] text-foreground outline-none placeholder:text-foreground/35 focus:border-accent"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {confirming ? (
          <>
            <button
              type="button"
              onClick={send}
              disabled={busy}
              className="bg-accent px-4 py-1.5 font-structural text-xs font-bold uppercase tracking-[0.12em] text-white disabled:opacity-40"
            >
              {isPending ? "Sending" : `Yes, send to ${count}`}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={isPending}
              className="font-structural text-xs font-bold uppercase tracking-[0.12em] text-foreground/60 disabled:opacity-40"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={test}
              disabled={!text.trim() || busy}
              className="border-2 border-foreground px-4 py-1.5 font-structural text-xs font-bold uppercase tracking-[0.12em] text-foreground transition-colors hover:bg-foreground hover:text-background disabled:opacity-40"
            >
              {isTesting ? "Sending" : "Email me a test"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={!text.trim() || busy}
              className="border-2 border-foreground px-4 py-1.5 font-structural text-xs font-bold uppercase tracking-[0.12em] text-foreground transition-colors hover:bg-foreground hover:text-background disabled:opacity-40"
            >
              Send
            </button>
          </>
        )}
        <span className="font-structural text-[0.65rem] font-bold uppercase tracking-[0.12em] text-foreground/45">
          {text.length}
        </span>
      </div>
      {result && (
        <p
          className={`mt-2 min-w-0 max-w-full font-structural text-[0.65rem] font-bold uppercase tracking-[0.12em] [overflow-wrap:anywhere] ${
            result.ok ? "text-foreground/60" : "text-accent"
          }`}
        >
          {result.text}
        </p>
      )}
    </div>
  );
}
