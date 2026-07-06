"use client";

import { useState, useTransition } from "react";
import { submitReport, toggleBlock } from "@/app/actions";

// Report / block controls for another person's profile. Required for the App
// Store (guideline 1.2): a way to report content and block abusive users.
export function SafetyMenu({
  targetUserId,
  name,
  blocked,
}: {
  targetUserId: string;
  name: string;
  blocked: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function block() {
    const data = new FormData();
    data.set("userId", targetUserId);
    data.set("blocked", String(blocked));
    startTransition(async () => {
      await toggleBlock(data);
    });
  }

  function sendReport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData();
    data.set("targetUserId", targetUserId);
    data.set("reason", reason);
    startTransition(async () => {
      await submitReport(data);
      setReported(true);
      setReporting(false);
      setReason("");
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Safety options"
        className="border-2 border-foreground px-3 py-1.5 font-structural text-xs font-bold uppercase tracking-[0.12em] text-foreground transition-colors hover:border-accent hover:text-accent"
      >
        •••
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-56 border-[3px] border-foreground bg-paper p-3">
          {reported ? (
            <p className="font-structural text-xs font-bold uppercase tracking-wide text-foreground">
              Thanks — reported. We review flags and act on them.
            </p>
          ) : reporting ? (
            <form onSubmit={sendReport} className="flex flex-col gap-2">
              <label className="font-structural text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground">
                Report {name}
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="What's wrong?"
                className="w-full resize-none rounded-none border border-foreground bg-[#fbf7ee] px-2 py-1.5 font-serif text-[13px] text-foreground outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={isPending}
                className="bg-accent px-3 py-1.5 font-structural text-[0.65rem] font-bold uppercase tracking-[0.1em] text-white disabled:opacity-40"
              >
                Send report
              </button>
            </form>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setReporting(true)}
                className="text-left font-structural text-xs font-bold uppercase tracking-[0.1em] text-foreground hover:text-accent"
              >
                Report
              </button>
              <button
                type="button"
                onClick={block}
                disabled={isPending}
                className="text-left font-structural text-xs font-bold uppercase tracking-[0.1em] text-foreground hover:text-accent disabled:opacity-40"
              >
                {blocked ? "Unblock" : "Block"} {name}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
