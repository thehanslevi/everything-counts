"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createLog } from "@/app/actions";
import { FORMS, type Form } from "@/lib/data/types";

// Backfill tool: paste a list of links (one per line) and log them all in one
// pass. For each URL it pulls metadata the same way the single-log form does,
// then saves. Sequential and best-effort — a page that can't be read is marked
// and skipped, never blocking the rest. Meant for seeding a record fast.

type Status = "pending" | "working" | "done" | "error";
type Row = { url: string; status: Status; note?: string };

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const dotClass: Record<Status, string> = {
  pending: "bg-foreground/20",
  working: "bg-accent-3 animate-pulse",
  done: "bg-accent",
  error: "bg-accent-2",
};

export function BulkImport() {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const router = useRouter();

  async function run() {
    const urls = Array.from(
      new Set(
        text
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    );
    if (urls.length === 0) return;

    setRunning(true);
    setRows(urls.map((url) => ({ url, status: "pending" })));
    const mark = (i: number, status: Status, note?: string) =>
      setRows((r) => r.map((x, idx) => (idx === i ? { ...x, status, note } : x)));

    let anyOk = false;
    for (let i = 0; i < urls.length; i++) {
      mark(i, "working");
      try {
        const res = await fetch(
          `/api/metadata?url=${encodeURIComponent(urls[i])}`,
        );
        const m = res.ok ? await res.json() : {};
        const title = (m.title && String(m.title).trim()) || hostnameOf(urls[i]);
        const form: Form = (FORMS as readonly string[]).includes(m.form)
          ? (m.form as Form)
          : "article";

        const fd = new FormData();
        fd.set("url", urls[i]);
        fd.set("title", title);
        fd.set("author", m.author ?? "");
        fd.set("source", m.source ?? "");
        fd.set("image", m.image ?? "");
        fd.set("form", form);
        fd.set("take", "");
        fd.set("rating", "");

        const result = await createLog(fd);
        if (result.ok) {
          anyOk = true;
          mark(i, "done", title);
        } else {
          mark(i, "error", result.error ?? "Could not save");
        }
      } catch {
        mark(i, "error", "Could not reach the page");
      }
    }

    setRunning(false);
    if (anyOk) {
      setText("");
      router.refresh();
    }
  }

  const doneCount = rows.filter((r) => r.status === "done").length;

  return (
    <div className="flex flex-col gap-4">
      <p className="font-serif text-[14px] leading-[1.55] text-foreground/70">
        Paste links, one per line. We&apos;ll pull the details and log each one —
        a fast way to backfill what you&apos;ve already read.
      </p>
      <textarea
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={running}
        placeholder={"https://…\nhttps://…"}
        className="w-full resize-none rounded-none border border-foreground bg-[#fbf7ee] px-3 py-2 font-mono text-[13px] text-foreground outline-none placeholder:text-foreground/35 focus:border-accent disabled:opacity-60"
      />
      <button
        type="button"
        onClick={run}
        disabled={running || text.trim().length === 0}
        className="self-start rounded-none bg-accent px-6 py-2.5 font-structural text-xs font-bold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-85 disabled:opacity-40"
      >
        {running ? "Importing…" : "Import these links"}
      </button>

      {rows.length > 0 && (
        <ol className="flex flex-col gap-1.5 border-t border-foreground/25 pt-4">
          {rows.map((r, i) => (
            <li key={i} className="flex items-baseline gap-2.5 text-[13px]">
              <span
                className={`mt-1 size-2 shrink-0 rounded-full ${dotClass[r.status]}`}
              />
              <span className="min-w-0 flex-1 truncate font-mono text-foreground/70">
                {r.status === "done" ? r.note : hostnameOf(r.url)}
              </span>
              {r.status === "error" && (
                <span className="shrink-0 font-structural text-[0.6rem] font-bold uppercase tracking-wide text-accent-2">
                  {r.note}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
      {!running && doneCount > 0 && (
        <p className="font-structural text-xs font-bold uppercase tracking-wide text-foreground">
          Logged {doneCount} {doneCount === 1 ? "piece" : "pieces"}. They&apos;re
          in your record below.
        </p>
      )}
    </div>
  );
}
