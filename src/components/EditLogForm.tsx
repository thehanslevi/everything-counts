"use client";

import { useState, useTransition } from "react";
import { editLog, removeLog } from "@/app/actions";
import { FORMS, type Form, type Log } from "@/lib/data/types";

const inputClass =
  "w-full rounded-none border border-foreground bg-[#fbf7ee] px-3 py-2 font-structural text-sm text-foreground outline-none placeholder:text-foreground/35 focus:border-accent";

const labelClass =
  "flex items-center gap-2 font-structural text-xs font-bold uppercase tracking-[0.12em] text-foreground";

// Edit an existing log's metadata, take, and rating. The URL is immutable —
// it is the work identity. Includes delete with a confirm step.
export function EditLogForm({ log }: { log: Log }) {
  const [fields, setFields] = useState({
    title: log.title,
    author: log.author ?? "",
    source: log.source ?? "",
    image: log.image ?? "",
    form: log.form as Form,
    take: log.take ?? "",
    rating: log.rating != null ? String(log.rating) : "",
  });
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  function update<K extends keyof typeof fields>(
    key: K,
    value: (typeof fields)[K],
  ) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const data = new FormData();
    data.set("id", log.id);
    for (const [k, v] of Object.entries(fields)) data.set(k, v);
    startTransition(async () => {
      const result = await editLog(data);
      if (result && !result.ok && result.error) setError(result.error);
    });
  }

  function handleDelete() {
    setError(null);
    const data = new FormData();
    data.set("id", log.id);
    startTransition(async () => {
      const result = await removeLog(data);
      if (result && !result.ok && result.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {log.url && (
        <p className="font-structural text-[0.65rem] font-medium uppercase tracking-[0.12em] text-foreground/50 break-all">
          {log.url}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="title" className={labelClass}>
          Title
        </label>
        <input
          id="title"
          type="text"
          value={fields.title}
          onChange={(e) => update("title", e.target.value)}
          required
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="author" className={labelClass}>
          Author
        </label>
        <input
          id="author"
          type="text"
          value={fields.author}
          onChange={(e) => update("author", e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="source" className={labelClass}>
          Source
        </label>
        <input
          id="source"
          type="text"
          value={fields.source}
          onChange={(e) => update("source", e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="form" className={labelClass}>
          Form
        </label>
        <select
          id="form"
          value={fields.form}
          onChange={(e) => update("form", e.target.value as Form)}
          className={inputClass}
        >
          {FORMS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="take" className={labelClass}>
          Your take
          <span className="font-normal lowercase tracking-normal text-foreground/40">
            optional
          </span>
        </label>
        <textarea
          id="take"
          rows={3}
          value={fields.take}
          onChange={(e) => update("take", e.target.value)}
          className={`${inputClass} resize-none font-serif normal-case`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="rating" className={labelClass}>
          Rating
          <span className="font-normal lowercase tracking-normal text-foreground/40">
            optional
          </span>
        </label>
        <select
          id="rating"
          value={fields.rating}
          onChange={(e) => update("rating", e.target.value)}
          className={`${inputClass} w-32`}
        >
          <option value="">No rating</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {"●".repeat(n)}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="font-structural text-xs font-bold uppercase tracking-wide text-accent">
          {error}
        </p>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="bg-accent px-6 py-2.5 font-structural text-xs font-bold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-85 disabled:opacity-40"
        >
          {isPending ? "Working" : "Save changes"}
        </button>

        {confirmingDelete ? (
          <span className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="bg-foreground px-4 py-2.5 font-structural text-xs font-bold uppercase tracking-[0.12em] text-background transition-opacity hover:opacity-85 disabled:opacity-40"
            >
              Yes, delete forever
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="font-structural text-xs font-bold uppercase tracking-[0.1em] text-foreground/50 hover:text-foreground"
            >
              Keep it
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="font-structural text-xs font-bold uppercase tracking-[0.1em] text-foreground/50 hover:text-accent"
          >
            Delete log
          </button>
        )}
      </div>
    </form>
  );
}
