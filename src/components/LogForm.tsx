"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { checkAlreadyLogged, createLog } from "@/app/actions";
import { FORMS, type Form, type Log } from "@/lib/data/types";
import { coerceUrl } from "@/lib/data/url";
import type { PageDetails } from "@/lib/links";
import { LoggedPanel } from "@/components/LoggedPanel";

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

export function LogForm({
  initialUrl,
  prefill,
  autoFocus,
}: {
  initialUrl?: string;
  // What the reader's own browser read from the page (the "Log this"
  // bookmark, a phone's share sheet). Shown at once, and kept wherever our
  // own fetch of the page comes back with less.
  prefill?: PageDetails;
  autoFocus?: boolean;
}) {
  const [fields, setFields] = useState({
    ...initialFields,
    url: initialUrl ?? "",
    title: prefill?.title ?? "",
    author: prefill?.author ?? "",
    source: prefill?.source ?? "",
    image: prefill?.image ?? "",
  });
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // A finished save: the log, the line for under it, the link to share.
  const [logged, setLogged] = useState<{
    log: Log;
    line: string | null;
    shareUrl: string | null;
  } | null>(null);
  // After "Log another", the cursor goes back to the link field.
  const [focusUrl, setFocusUrl] = useState(false);
  const [priorLog, setPriorLog] = useState<string | null>(null);
  const [canReadClipboard, setCanReadClipboard] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Feature-detect after mount: the server can't know, and rendering the
  // button on the server would mismatch on hydration.
  useEffect(() => {
    setCanReadClipboard(
      typeof navigator !== "undefined" &&
        typeof navigator.clipboard?.readText === "function",
    );
  }, []);

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

  // Paste-to-log: paste a URL anywhere on the page (not into a field) while
  // the link box is empty, and the form takes it and fetches. Zero-friction
  // path for "I have the link on my clipboard already".
  const urlRef = useRef(fields.url);
  urlRef.current = fields.url;
  const titleRef = useRef(fields.title);
  titleRef.current = fields.title;
  // Which link the title, author, source and image on screen describe. A
  // different link starts those over; the same link keeps what's there.
  const detailsFor = useRef<string | null>(
    prefill && Object.keys(prefill).length > 0 ? (initialUrl ?? null) : null,
  );
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)
      ) {
        return;
      }
      // Global paste is the one place that insists on an explicit scheme:
      // without it, any pasted "notes.txt" would be mistaken for a link.
      const text = e.clipboardData?.getData("text") ?? "";
      const url = /https?:\/\//i.test(text) ? coerceUrl(text) : null;
      if (!url || urlRef.current.trim()) return;
      e.preventDefault();
      void fetchMetadata(url);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update<K extends keyof typeof fields>(
    key: K,
    value: (typeof fields)[K],
  ) {
    if (key === "url") setPriorLog(null);
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function fetchMetadata(rawUrl: string) {
    setFetchError(null);
    setLogged(null);
    setPriorLog(null);
    if (!rawUrl.trim()) {
      setFetchError("Paste a link first.");
      return;
    }
    // "thecut.com/article/..." and "Read this: https://..." both become a
    // real URL here; the field shows the fixed-up version.
    const url = coerceUrl(rawUrl);
    if (!url) {
      setFetchError("That doesn't look like a link.");
      return;
    }
    const sameLink = detailsFor.current === url;
    detailsFor.current = url;
    const hadTitle = sameLink && titleRef.current.trim() !== "";
    setFields((prev) => ({ ...prev, url }));
    setFetching(true);
    // Advisory, in parallel with the metadata fetch: have you logged this
    // URL before? Warns; never blocks — rereads are real reading.
    void checkAlreadyLogged(url).then(
      (date) => setPriorLog(date),
      () => {},
    );
    try {
      const res = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok) {
        setFetchError(data.error ?? "Could not read that page.");
        return;
      }
      // Fill what came back; keep anything already there where it didn't.
      // When the page couldn't be read, what came back is a guess from the
      // address, so anything the reader's browser sent or they typed wins.
      const guess = Boolean(data.fromLink);
      const pick = (got: string | null, had: string) =>
        guess ? had || got || "" : (got ?? had);
      setFields((prev) => {
        const had = sameLink
          ? prev
          : { ...prev, title: "", author: "", source: "", image: "" };
        return {
          ...had,
          title: pick(data.title, had.title),
          author: pick(data.author, had.author),
          source: pick(data.source, had.source),
          image: pick(data.image, had.image),
          // Best-guess form from the URL, still overridable in the dropdown.
          form: (FORMS as readonly string[]).includes(data.form)
            ? (data.form as Form)
            : had.form,
        };
      });
      // Fetched either way: a page that won't talk to us still opens the
      // fields, so a paywall is a title to check, not a wall.
      setFetched(true);
      if (data.error && !hadTitle) {
        setFetchError(
          data.title
            ? `${data.error} The title is a guess from the link, so check it.`
            : `${data.error} Add the title and save.`,
        );
      }
    } catch {
      setFetchError("Could not reach the metadata service.");
    } finally {
      setFetching(false);
    }
  }

  function handleFetch() {
    void fetchMetadata(fields.url);
  }

  // Clipboard-to-log. Reading the clipboard needs a user gesture (and, in some
  // browsers, a permission tap), so this is a button rather than something
  // that happens on load. Only rendered where the API exists.
  async function fromClipboard() {
    setFetchError(null);
    try {
      const url = coerceUrl(await navigator.clipboard.readText());
      if (!url) {
        setFetchError("No link on the clipboard.");
        return;
      }
      void fetchMetadata(url);
    } catch {
      setFetchError("Couldn't read the clipboard. Paste into the field.");
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const data = new FormData();
    data.set("url", coerceUrl(fields.url) ?? fields.url.trim());
    data.set("title", fields.title);
    data.set("author", fields.author);
    data.set("source", fields.source);
    data.set("image", fields.image);
    data.set("form", fields.form);
    data.set("take", fields.take);
    data.set("rating", fields.rating);
    // So "this month" means the reader's month, not the server's.
    data.set("tzOffset", String(new Date().getTimezoneOffset()));

    startTransition(async () => {
      const result = await createLog(data);
      if (!result.ok || !result.log) {
        setFormError(result.error ?? "Could not save the log.");
        return;
      }
      setLogged({
        log: result.log,
        line: result.after?.line ?? null,
        shareUrl: result.after?.shareUrl ?? null,
      });
      setFields(initialFields);
      detailsFor.current = null;
      setFetched(false);
      setFetchError(null);
      setPriorLog(null);
    });
  }

  // Saved: the card takes the form's place until they ask for it back.
  if (logged) {
    return (
      <LoggedPanel
        log={logged.log}
        line={logged.line}
        shareUrl={logged.shareUrl}
        onAnother={() => {
          setLogged(null);
          setFocusUrl(true);
        }}
      />
    );
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
            // type="text", not "url": the browser's own validation would
            // reject "thecut.com/..." on Save, and coerceUrl handles it.
            type="text"
            inputMode="url"
            autoComplete="off"
            autoFocus={autoFocus || focusUrl}
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
        {canReadClipboard && !fields.url.trim() && !fetching && (
          <button
            type="button"
            onClick={fromClipboard}
            className="self-start border-2 border-foreground px-3 py-1.5 font-structural text-[0.65rem] font-bold uppercase tracking-[0.12em] text-foreground transition-colors hover:bg-foreground hover:text-background"
          >
            Paste from clipboard
          </button>
        )}
        {fetchError && (
          <p className="font-structural text-xs font-bold uppercase tracking-wide text-accent">
            {fetchError}
          </p>
        )}
        {fetched && !fetchError && (
          <p className="font-structural text-xs uppercase tracking-wide text-foreground/50">
            Pulled what we could. Edit before saving.
          </p>
        )}
        {priorLog && (
          <p className="border-l-4 border-accent-2 bg-[#fbf7ee] px-3 py-2 font-structural text-xs font-bold uppercase tracking-[0.08em] text-foreground">
            You logged this on{" "}
            {new Date(priorLog).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            . Saving again adds a second entry.
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
              placeholder="A line, if you have one."
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

          {/* On phones the details section runs past the fold, so Save pins
              just above the bottom tab bar (whose height the body already
              reserves) instead of hiding at the end of the scroll. */}
          <div className="max-sm:sticky max-sm:bottom-[calc(4.75rem+env(safe-area-inset-bottom))] max-sm:z-10 max-sm:bg-paper max-sm:py-2">
            <button
              type="submit"
              disabled={isPending}
              className={`${buttonClass} px-6`}
            >
              {isPending ? "Saving" : "Save to your log"}
            </button>
          </div>
        </div>
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
