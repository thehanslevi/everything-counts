"use client";

import { useState, useTransition } from "react";
import { sendPiece } from "@/app/actions";
import type { Profile } from "@/lib/data/types";

const SITE = "https://everything-counts.vercel.app";

// Share this piece. Two ways out of one button:
//  - a link, for anyone: the phone's own share sheet (Messages, mail,
//    whatever they use), or the clipboard on a desktop. The link carries the
//    sharer's handle, so the piece arrives as "sent by" them and a newcomer
//    who signs up from it starts with that piece ready to log.
//  - a person already here: pick them, add a line, send. They get a push.
// Either way the piece is the message; there is no message without one.
export function SendPieceForm({
  people,
  workId,
  url,
  title,
  fromHandle,
}: {
  people: Profile[];
  workId: string;
  url: string | null;
  title: string;
  fromHandle: string;
}) {
  const [open, setOpen] = useState(false);
  const [recipientId, setRecipientId] = useState(people[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function shareLink() {
    setError(null);
    const link = `${SITE}/work/${workId}?from=${fromHandle}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url: link });
        setDone("Link sent.");
        setOpen(false);
        return;
      } catch (err) {
        // Closing the share sheet is not an error; anything else falls
        // through to copying.
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setDone("Link copied.");
      setOpen(false);
    } catch {
      setError("Couldn't copy the link.");
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setDone(null);
    const data = new FormData();
    data.set("recipientId", recipientId);
    data.set("workId", workId);
    data.set("url", url ?? "");
    data.set("title", title);
    data.set("note", note);
    startTransition(async () => {
      const result = await sendPiece(data);
      if (!result.ok) {
        setError(result.error ?? "Could not send that.");
        return;
      }
      const who = people.find((p) => p.id === recipientId);
      setDone(`Sent to ${who ? `@${who.handle}` : "them"}.`);
      setNote("");
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <span className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-structural text-xs font-bold uppercase tracking-[0.12em] text-accent hover:underline"
        >
          Share
        </button>
        {done && (
          <span className="font-structural text-[0.65rem] font-bold uppercase tracking-[0.12em] text-foreground/60">
            {done}
          </span>
        )}
      </span>
    );
  }

  const inputClass =
    "w-full rounded-none border border-foreground bg-[#fbf7ee] px-3 py-2 font-structural text-sm text-foreground outline-none placeholder:text-foreground/35 focus:border-accent";
  const labelClass =
    "font-structural text-xs font-bold uppercase tracking-[0.12em] text-foreground";

  return (
    <div className="flex w-full flex-col gap-4 border-t-2 border-foreground pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={shareLink}
          className="rounded-none bg-accent px-5 py-2 font-structural text-xs font-bold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-85"
        >
          Send a link
        </button>
        <span className="font-structural text-[0.65rem] font-bold uppercase tracking-[0.12em] text-foreground/50">
          To anyone
        </span>
      </div>

      {people.length > 0 && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 border-t border-foreground/30 pt-4"
        >
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>To</span>
            <select
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              className={inputClass}
            >
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (@{p.handle})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={`flex items-center gap-2 ${labelClass}`}>
              A line
              <span className="font-normal lowercase tracking-normal text-foreground/40">
                optional
              </span>
            </span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              placeholder="Why them, why this"
              className={`${inputClass} font-serif normal-case`}
            />
          </label>
          <div>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-none border-2 border-foreground px-5 py-2 font-structural text-xs font-bold uppercase tracking-[0.12em] text-foreground transition-colors hover:bg-foreground hover:text-background disabled:opacity-40"
            >
              {isPending ? "Sending" : "Send"}
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="font-structural text-xs font-bold uppercase tracking-[0.12em] text-foreground/60 hover:text-foreground"
        >
          Cancel
        </button>
        {error && (
          <p className="font-structural text-xs font-bold uppercase tracking-wide text-accent">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
