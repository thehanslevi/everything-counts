"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { replyToLog } from "@/app/actions";

// One line back on someone's log. Single field, single button; the server
// action notifies the log's owner and the page re-renders with the reply.
export function ReplyForm({ logId }: { logId: string }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const data = new FormData();
    data.set("logId", logId);
    data.set("body", body);
    startTransition(async () => {
      const result = await replyToLog(data);
      if (!result.ok) {
        setError(result.error ?? "Could not reply.");
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={500}
          placeholder="A line back"
          aria-label="Reply"
          className="w-full rounded-none border border-foreground bg-[#fbf7ee] px-3 py-2 font-serif text-[13px] text-foreground outline-none placeholder:text-foreground/35 focus:border-accent"
        />
        <button
          type="submit"
          disabled={isPending || !body.trim()}
          className="whitespace-nowrap rounded-none bg-accent px-4 py-2 font-structural text-[0.65rem] font-bold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-85 disabled:opacity-40"
        >
          {isPending ? "Sending" : "Reply"}
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
