"use client";

import { useState, useTransition } from "react";
import { sendPiece } from "@/app/actions";
import type { Profile } from "@/lib/data/types";

// Hand this piece to one person. Collapsed to a single button until tapped;
// then a person picker and an optional line. Every send carries the piece —
// that's the whole design: there is no message without one.
export function SendPieceForm({
  people,
  workId,
  url,
  title,
}: {
  people: Profile[];
  workId: string;
  url: string | null;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [recipientId, setRecipientId] = useState(people[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (people.length === 0) return null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSentTo(null);
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
      setSentTo(who ? `@${who.handle}` : "them");
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
        {sentTo && (
          <span className="font-structural text-[0.65rem] font-bold uppercase tracking-[0.12em] text-foreground/60">
            Sent to {sentTo}.
          </span>
        )}
      </span>
    );
  }

  const inputClass =
    "w-full rounded-none border border-foreground bg-[#fbf7ee] px-3 py-2 font-structural text-sm text-foreground outline-none placeholder:text-foreground/35 focus:border-accent";

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-3 border-t-2 border-foreground pt-4"
    >
      <label className="flex flex-col gap-1.5">
        <span className="font-structural text-xs font-bold uppercase tracking-[0.12em] text-foreground">
          To
        </span>
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
        <span className="flex items-center gap-2 font-structural text-xs font-bold uppercase tracking-[0.12em] text-foreground">
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
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-none bg-accent px-5 py-2 font-structural text-xs font-bold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-85 disabled:opacity-40"
        >
          {isPending ? "Sending" : "Send"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="font-structural text-xs font-bold uppercase tracking-[0.12em] text-foreground/60 hover:text-foreground"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p className="font-structural text-xs font-bold uppercase tracking-wide text-accent">
          {error}
        </p>
      )}
    </form>
  );
}
