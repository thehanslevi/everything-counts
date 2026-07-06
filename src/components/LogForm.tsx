"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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

// Shared input styling: hairline ink border, square corners, vermilion on focus.
const inputClass =
  "w-full rounded-none border border-foreground bg-[#fbf7ee] px-3 py-2 font-structural text-sm text-foreground outline-none placeholder:text-foreground/35 focus:border-accent";

// Primary button: vermilion block, square, paper text.
const buttonClass =
  "rounded-none bg-accent px-5 py-2.5 font-structural text-xs font-bold uppercase tracking-[0.12em] text-white transition-transform hover:opacity-85 active:scale-95 disabled:opacity-40";

export function LogForm({ initialUrl }: { initialUrl?: string }) {
  const [fields, setFields] = useState({
    ...initialFields,
    url: initialUrl ?? "",
  });
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Share-sheet landing pad: when a URL arrives via ?logurl= (from the iOS
  // share extension or a bookmarklet), fetch its metadata immediately so the
  // form is pre-filled the moment the app opens.
  const autoFetched = useRef(false);
  useEffect(() => {
    if (initialUrl && !autoFetched.current) {
      autoFetched.current = true;
      void fetchMetadata(initialUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUrl]);

  function update<K extends keyof typeof fields>(
    key: K,
    value: (typeof fields)[K],
  ) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function fetchMetadata(rawUrl: string) {
    setFetchError(null);
    setSaved(null);
    if (!rawUrl.trim()) {
      setFetchError("Paste a link first.");
      return;
    }
    setFetching(true);
    try {
      const res = await fetch(
        `/api/metadata?url=${encodeURIComponent(rawUrl.trim())}`,
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
        // Best-guess form from the URL, still overridable in the dropdown.
        form: (FORMS as readonly string[]).includes(data.form)
          ? (data.form as Form)
          : prev.form,
      }));
      setFetched(true);
    } catch {
      setFetchError("Could not reach the metadata service.");
    } finally {
      setFetching(false);
    }
  }

  function handleFetch() {
    void fetchMetadata(fields.url);
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
        <label
          htmlFor="url"
          className="font-structural text-xs font-bold uppercase tracking-[0.12em] text-foreground"
        >
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
            className={inputClass}
          />
          <button
            type="button"
            onClick={handleFetch}
            disabled={fetching}
            className={`whitespace-nowrap ${buttonClass}`}
          >
            {fetching ? "Fetching" : "Fetch details"}
          </button>
        </div>
        {fetchError && (
          <p className="font-structural text-xs font-bold uppercase tracking-wide text-accent">
            {fetchError}
          </p>
        )}
        {fetched && !fetchError && (
          <p className="font-structural text-xs uppercase tracking-wide text-foreground/50">
            Pulled what we could. Edit anything below before saving.
          </p>
        )}
      </div>

      {showDetails && (
        <div className="flex flex-col gap-5 border-t border-foreground pt-5">
          {fields.image && (
            // Preview of the fetched lead image. Plain img: the source host is
            // arbitrary and not configured for next/image.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fields.image}
              alt=""
              className="h-40 w-full border border-foreground object-cover"
            />
          )}

          <Field label="Title" htmlFor="title">
            <input
              id="title"
              type="text"
              value={fields.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Piece title"
              className={inputClass}
            />
          </Field>

          <Field label="Author" htmlFor="author">
            <input
              id="author"
              type="text"
              value={fields.author}
              onChange={(e) => update("author", e.target.value)}
              placeholder="Author"
              className={inputClass}
            />
          </Field>

          <Field label="Source" htmlFor="source">
            <input
              id="source"
              type="text"
              value={fields.source}
              onChange={(e) => update("source", e.target.value)}
              placeholder="Publication or site"
              className={inputClass}
            />
          </Field>

          <Field label="Form" htmlFor="form">
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
          </Field>

          <Field label="Your take" htmlFor="take" hint="Optional">
            <textarea
              id="take"
              rows={3}
              value={fields.take}
              onChange={(e) => update("take", e.target.value)}
              placeholder="What did this change, or why did it matter?"
              className={`${inputClass} resize-none font-serif normal-case`}
            />
          </Field>

          <Field label="Rating" htmlFor="rating" hint="Optional">
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
          </Field>

          {formError && (
            <p className="font-structural text-xs font-bold uppercase tracking-wide text-accent">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className={`self-start ${buttonClass} px-6`}
          >
            {isPending ? "Saving" : "Save to your log"}
          </button>
        </div>
      )}

      {saved && (
        <p className="flex items-center gap-2 border border-foreground bg-[#f7f1e3] px-4 py-3 font-structural text-xs font-bold uppercase tracking-[0.08em] text-foreground">
          <span className="inline-block size-2 shrink-0 rounded-full bg-accent" />
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
        className="flex items-center gap-2 font-structural text-xs font-bold uppercase tracking-[0.12em] text-foreground"
      >
        {label}
        {hint && (
          <span className="font-normal lowercase tracking-normal text-foreground/40">
            {hint}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}
