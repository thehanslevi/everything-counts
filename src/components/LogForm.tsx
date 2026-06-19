"use client";

import { useState, useTransition } from "react";
import { createLog } from "@/app/actions";
import { FORMS, type Form } from "@/lib/data/types";

const initialFields = {
  url: "",
  title: "",
  author: "",
  source: "",
  image: "",
  form: "article" as Form,
  take: "",
  rating: "" as string, // "" means no rating
};

export function LogForm() {
  const [fields, setFields] = useState(initialFields);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function update<K extends keyof typeof fields>(
    key: K,
    value: (typeof fields)[K],
  ) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleFetch() {
    setFetchError(null);
    setSaved(null);
    if (!fields.url.trim()) {
      setFetchError("Paste a link first.");
      return;
    }
    setFetching(true);
    try {
      const res = await fetch(
        `/api/metadata?url=${encodeURIComponent(fields.url.trim())}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setFetchError(data.error ?? "Could not read that page.");
        return;
      }
      setFields((prev) => ({
        ...prev,
        title: data.title ?? "",
        author: data.author ?? "",
        source: data.source ?? "",
        image: data.image ?? "",
      }));
      setFetched(true);
    } catch {
      setFetchError("Could not reach the metadata service.");
    } finally {
      setFetching(false);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setSaved(null);

    const data = new FormData();
    data.set("url", fields.url.trim());
    data.set("title", fields.title);
    data.set("author", fields.author);
    data.set("source", fields.source);
    data.set("image", fields.image);
    data.set("form", fields.form);
    data.set("take", fields.take);
    data.set("rating", fields.rating);

    startTransition(async () => {
      const result = await createLog(data);
      if (!result.ok) {
        setFormError(result.error ?? "Could not save the log.");
        return;
      }
      setSaved(result.log?.title ?? fields.title);
      setFields(initialFields);
      setFetched(false);
    });
  }

  const showDetails = fetched || fields.title.length > 0;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="url" className="text-sm font-medium text-stone-700">
          Link
        </label>
        <div className="flex gap-2">
          <input
            id="url"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://..."
            value={fields.url}
            onChange={(e) => update("url", e.target.value)}
            className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none placeholder:text-stone-400 focus:border-stone-500"
          />
          <button
            type="button"
            onClick={handleFetch}
            disabled={fetching}
            className="whitespace-nowrap rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition-colors hover:bg-stone-700 disabled:opacity-50"
          >
            {fetching ? "Fetching..." : "Fetch details"}
          </button>
        </div>
        {fetchError && <p className="text-sm text-red-600">{fetchError}</p>}
        {fetched && !fetchError && (
          <p className="text-sm text-stone-500">
            Pulled what we could. Edit anything below before saving.
          </p>
        )}
      </div>

      {showDetails && (
        <div className="flex flex-col gap-5 border-t border-stone-200 pt-5">
          {fields.image && (
            // Preview of the fetched lead image. Plain img: the source host is
            // arbitrary and not configured for next/image.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fields.image}
              alt=""
              className="h-40 w-full rounded-lg object-cover"
            />
          )}

          <Field label="Title" htmlFor="title">
            <input
              id="title"
              type="text"
              value={fields.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Piece title"
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none placeholder:text-stone-400 focus:border-stone-500"
            />
          </Field>

          <Field label="Author" htmlFor="author">
            <input
              id="author"
              type="text"
              value={fields.author}
              onChange={(e) => update("author", e.target.value)}
              placeholder="Author"
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none placeholder:text-stone-400 focus:border-stone-500"
            />
          </Field>

          <Field label="Source" htmlFor="source">
            <input
              id="source"
              type="text"
              value={fields.source}
              onChange={(e) => update("source", e.target.value)}
              placeholder="Publication or site"
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none placeholder:text-stone-400 focus:border-stone-500"
            />
          </Field>

          <Field label="Form" htmlFor="form">
            <select
              id="form"
              value={fields.form}
              onChange={(e) => update("form", e.target.value as Form)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-stone-500"
            >
              {FORMS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Your take" htmlFor="take" hint="Optional">
            <textarea
              id="take"
              rows={3}
              value={fields.take}
              onChange={(e) => update("take", e.target.value)}
              placeholder="What did this change, or why did it matter?"
              className="resize-none rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none placeholder:text-stone-400 focus:border-stone-500"
            />
          </Field>

          <Field label="Rating" htmlFor="rating" hint="Optional">
            <select
              id="rating"
              value={fields.rating}
              onChange={(e) => update("rating", e.target.value)}
              className="w-32 rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-stone-500"
            >
              <option value="">No rating</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {"★".repeat(n)}
                </option>
              ))}
            </select>
          </Field>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <button
            type="submit"
            disabled={isPending}
            className="self-start rounded-lg bg-stone-900 px-6 py-2.5 text-sm font-medium text-stone-50 transition-colors hover:bg-stone-700 disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save to your log"}
          </button>
        </div>
      )}

      {saved && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Logged “{saved}.” It is in your record below.
        </p>
      )}
    </form>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-2 text-sm font-medium text-stone-700"
      >
        {label}
        {hint && <span className="font-normal text-stone-400">{hint}</span>}
      </label>
      {children}
    </div>
  );
}
