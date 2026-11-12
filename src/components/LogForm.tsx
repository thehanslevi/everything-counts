"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { checkAlreadyLogged, createLog } from "@/app/actions";
import { FORMS, type Form, type Log } from "@/lib/data/types";
import { coerceUrl, isHandWorkId } from "@/lib/data/url";
import { fold } from "@/lib/fold";
import type { PageDetails } from "@/lib/links";
import { retireClipboardLink } from "@/lib/native";
import { cleanQuery, sameness, type Suggestion } from "@/lib/suggest-core";
import { LoggedPanel } from "@/components/LoggedPanel";

const noSubscription = () => () => {};

const initialFields = {
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

// The top box takes a link or a title. It's a link when it reads as one: an
// address with a scheme, or one without a scheme that has a path or starts
// with www. ("thecut.com/article/...", "www.thecut.com"). Everything else,
// "attention.pdf" included, is a title to look up.
function linkIn(entry: string): string | null {
  const text = entry.trim();
  if (!text) return null;
  if (!/https?:\/\//i.test(text)) {
    if (/\s/.test(text)) return null;
    if (!/^www\./i.test(text) && !text.includes("/")) return null;
  }
  return coerceUrl(text);
}

// What the suggestion list holds for the current query. The record answers
// fast; the outside catalogs come after.
interface SuggestState {
  q: string;
  record: Suggestion[];
  elsewhere: Suggestion[];
  recordDone: boolean;
  elsewhereDone: boolean;
}

// A no-link piece already on the record, picked from the suggestions or
// arriving with "Log it": the work it pools into, and the folded title and
// author it was picked with. The work is sent only while the details still
// name that piece.
type Picked = { work: string; title: string; author: string } | null;

export function LogForm({
  initialUrl,
  prefill,
  autoFocus,
}: {
  initialUrl?: string;
  // What arrived with the page: details the reader's own browser read (the
  // "Log this" bookmark, a phone's share sheet), or, with no link, a piece
  // from the record to log again ("Log it" on a work page), with its work.
  prefill?: PageDetails & { form?: Form; work?: string };
  autoFocus?: boolean;
}) {
  const [entry, setEntry] = useState(initialUrl ?? prefill?.title ?? "");
  const [fields, setFields] = useState({
    ...initialFields,
    title: prefill?.title ?? "",
    author: prefill?.author ?? "",
    source: prefill?.source ?? "",
    image: prefill?.image ?? "",
    form:
      prefill?.form && (FORMS as readonly string[]).includes(prefill.form)
        ? prefill.form
        : initialFields.form,
  });
  const [picked, setPicked] = useState<Picked>(() =>
    !initialUrl && prefill?.work && prefill.title
      ? {
          work: prefill.work,
          title: fold(prefill.title),
          author: fold(prefill.author ?? ""),
        }
      : null,
  );
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);
  // The link the details on screen came from (or were last asked for).
  // Save won't pair a different link with them: it fetches that one first.
  const [fetchedFor, setFetchedFor] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  // A finished save: the log, the line for under it, the link to share.
  const [logged, setLogged] = useState<{
    log: Log;
    line: string | null;
    shareUrl: string | null;
  } | null>(null);
  // After "Log another", the cursor goes back to the top box.
  const [focusEntry, setFocusEntry] = useState(false);
  const [priorLog, setPriorLog] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Title search. `query` changes only when the reader types, so filling the
  // box from a pick or a link doesn't open the list again.
  const [query, setQuery] = useState("");
  const [suggest, setSuggest] = useState<SuggestState | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();

  // Every change of mind (a new link, a pick, typing in the box) bumps this.
  // A fetch or a check that comes back after one is ignored, so a slow page
  // can't land on top of whatever the reader chose since.
  const generation = useRef(0);

  const link = linkIn(entry);
  const typedTitle = link ? null : cleanQuery(query);

  // Feature-detected in the browser only: the server can't know, so it
  // renders without the button and the browser adds it after hydrating.
  const canReadClipboard = useSyncExternalStore(
    noSubscription,
    () => typeof navigator.clipboard?.readText === "function",
    () => false,
  );

  // What the box and the title field hold, for handlers set up once.
  const entryRef = useRef(entry);
  const titleRef = useRef(fields.title);
  // Which link the title, author, source and image on screen describe. A
  // different link starts those over; the same link keeps what's there.
  const detailsFor = useRef<string | null>(
    prefill && Object.keys(prefill).length > 0 ? (initialUrl ?? null) : null,
  );
  // Look the typed title up: the record first (fast), the outside catalogs
  // after (slower), each shown as it comes. A short pause between keys
  // before asking; anything still out when the query changes is dropped.
  // When answers arrive the highlight goes back to none, so Enter never
  // picks a row that slid in under the reader's finger.
  useEffect(() => {
    if (!typedTitle) return;
    const q = typedTitle;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSuggest({ q, record: [], elsewhere: [], recordDone: false, elsewhereDone: false });
      const ask = (scope: "record" | "elsewhere") =>
        fetch(`/api/suggest?scope=${scope}&q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        })
          .then((res) => (res.ok ? res.json() : { items: [] }))
          .then((data: { items?: Suggestion[] }) => data.items ?? [])
          .catch(() => [] as Suggestion[]);
      void ask("record").then((items) => {
        if (controller.signal.aborted) return;
        setActive(-1);
        setSuggest((prev) =>
          prev && prev.q === q ? { ...prev, record: items, recordDone: true } : prev,
        );
      });
      void ask("elsewhere").then((items) => {
        if (controller.signal.aborted) return;
        setActive(-1);
        setSuggest((prev) =>
          prev && prev.q === q ? { ...prev, elsewhere: items, elsewhereDone: true } : prev,
        );
      });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [typedTitle]);

  // Until the new query's answers arrive, the last ones stay up (less
  // flicker while typing); with nothing typed there is no list at all. The
  // record's pieces come first, and an outside catalog's copy of a piece
  // already on the record isn't shown twice.
  const current = typedTitle ? suggest : null;
  const recordItems = current?.record ?? [];
  const onRecord = new Set(recordItems.map((s) => sameness(s.title, s.author)));
  const elsewhereItems = (current?.elsewhere ?? []).filter(
    (s) => !onRecord.has(sameness(s.title, s.author)),
  );
  const pieces = [...recordItems, ...elsewhereItems];
  const typedIndex = typedTitle ? pieces.length : -1;
  const optionCount = pieces.length + (typedTitle ? 1 : 0);
  const showList = listOpen && Boolean(typedTitle);
  const searching = Boolean(current) && !(current!.recordDone && current!.elsewhereDone);

  // Keep the highlighted row in view as the arrow keys move through a list
  // taller than its box.
  useEffect(() => {
    if (!showList || active < 0) return;
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, showList, listId]);

  function update<K extends keyof typeof fields>(
    key: K,
    value: (typeof fields)[K],
  ) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  // A new direction: whatever was fetching or checking no longer counts.
  function changeCourse() {
    generation.current += 1;
    setFetching(false);
  }

  function onEntryChange(value: string) {
    changeCourse();
    setEntry(value);
    // The box held the pick; typing over it is a new search.
    setPicked(null);
    setPriorLog(null);
    setFetchError(null);
    if (linkIn(value)) {
      setListOpen(false);
    } else {
      setQuery(value);
      setListOpen(true);
      setActive(-1);
    }
  }

  // Fill the form from a suggestion. A piece with a link goes in the top
  // box as that link; one without keeps its title there and remembers the
  // work it belongs to.
  function pick(s: Suggestion) {
    changeCourse();
    const gen = generation.current;
    setListOpen(false);
    setQuery("");
    setActive(-1);
    setFetchError(null);
    setFetched(true);
    setFields((prev) => ({
      ...prev,
      title: s.title,
      author: s.author ?? "",
      source: s.source ?? "",
      image: s.image ?? "",
      form: s.form && (FORMS as readonly string[]).includes(s.form) ? s.form : prev.form,
    }));
    // In the form the box will show it in, so Save sees the same link.
    const url = s.url ? coerceUrl(s.url) : null;
    if (url) {
      setEntry(url);
      detailsFor.current = url;
      setFetchedFor(url);
      setPicked(null);
      setPriorLog(null);
      void checkAlreadyLogged(url).then(
        (date) => {
          if (gen === generation.current) setPriorLog(date);
        },
        () => {},
      );
    } else {
      setEntry(s.title);
      detailsFor.current = null;
      setFetchedFor(null);
      setPicked(
        s.workId && isHandWorkId(s.workId)
          ? { work: s.workId, title: fold(s.title), author: fold(s.author ?? "") }
          : null,
      );
      setPriorLog(s.mineAt);
    }
  }

  // Nothing in the lists fits: the typed words become the title, and the
  // rest is filled in by hand.
  function takeTyped() {
    changeCourse();
    const title = entry.trim();
    setListOpen(false);
    setQuery("");
    setActive(-1);
    setFetchError(null);
    setFetched(true);
    detailsFor.current = null;
    setFetchedFor(null);
    setPicked(null);
    setPriorLog(null);
    setFields((prev) => ({
      ...prev,
      title,
      author: "",
      source: "",
      image: "",
    }));
  }

  function choose(index: number) {
    if (index === typedIndex) takeTyped();
    else if (pieces[index]) pick(pieces[index]);
  }

  function onEntryKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      // Enter in the top box never saves: it fetches a link, picks, or uses
      // what was just typed. With nothing being searched (after a pick, or
      // a piece that arrived with "Log it") it only puts the keyboard away.
      e.preventDefault();
      if (link) void fetchMetadata(entry);
      else if (showList && active >= 0) choose(active);
      else if (query.trim()) takeTyped();
      else e.currentTarget.blur();
      return;
    }
    if (e.key === "ArrowDown" && !showList && typedTitle) {
      e.preventDefault();
      setListOpen(true);
      return;
    }
    if (!showList || optionCount === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % optionCount);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? optionCount - 1 : i - 1));
    } else if (e.key === "Escape") {
      setListOpen(false);
    }
  }

  async function fetchMetadata(rawUrl: string) {
    changeCourse();
    const gen = generation.current;
    setFetchError(null);
    setLogged(null);
    setPriorLog(null);
    setListOpen(false);
    if (!rawUrl.trim()) {
      setFetchError("Paste a link first.");
      return;
    }
    // "thecut.com/article/..." and "Read this: https://..." both become a
    // real URL here; the box shows the fixed-up version.
    const url = coerceUrl(rawUrl);
    if (!url) {
      setFetchError("That doesn't look like a link.");
      return;
    }
    const sameLink = detailsFor.current === url;
    detailsFor.current = url;
    const hadTitle = sameLink && titleRef.current.trim() !== "";
    setEntry(url);
    setFetchedFor(url);
    setPicked(null);
    // A different link: the details on screen belong to something else, so
    // they go now, not when the page answers. A Save in between then asks
    // for a title instead of filing this link under another piece.
    if (!sameLink) {
      setFields((prev) => ({ ...prev, title: "", author: "", source: "", image: "" }));
    }
    setFetching(true);
    // Advisory, in parallel with the metadata fetch: have you logged this
    // URL before? Warns; never blocks — rereads are real reading.
    void checkAlreadyLogged(url).then(
      (date) => {
        if (gen === generation.current) setPriorLog(date);
      },
      () => {},
    );
    try {
      const res = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (gen !== generation.current) return;
      if (!res.ok) {
        setFetchError(data.error ?? "Could not read that page.");
        return;
      }
      // Fill what came back; keep anything already there where it didn't.
      // When the page couldn't be read, what came back is a guess from the
      // address, so anything the reader's browser sent or they typed wins.
      const guess = Boolean(data.fromLink);
      const pickField = (got: string | null, had: string) =>
        guess ? had || got || "" : (got ?? had);
      setFields((prev) => ({
        ...prev,
        title: pickField(data.title, prev.title),
        author: pickField(data.author, prev.author),
        source: pickField(data.source, prev.source),
        image: pickField(data.image, prev.image),
        // Best-guess form from the URL, still overridable in the dropdown.
        form: (FORMS as readonly string[]).includes(data.form)
          ? (data.form as Form)
          : prev.form,
      }));
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
      if (gen === generation.current) {
        setFetchError("Could not reach the metadata service.");
      }
    } finally {
      if (gen === generation.current) setFetching(false);
    }
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
      void retireClipboardLink();
      void fetchMetadata(url);
    } catch {
      setFetchError("Couldn't read the clipboard. Paste into the box.");
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    // A link typed into the box but never fetched: fetch it instead of
    // saving it next to details that came from somewhere else.
    if (link && link !== fetchedFor) {
      void fetchMetadata(link);
      return;
    }
    // The link is whatever the box holds now (a picked piece's link is put
    // there); an emptied or retyped box saves none. A no-link piece's work
    // goes along only while the title and author still name it.
    const url = link ?? "";
    const samePiece =
      picked !== null &&
      fold(fields.title) === picked.title &&
      (!picked.author || fold(fields.author) === picked.author);
    const data = new FormData();
    data.set("url", url);
    data.set("work", !url && samePiece ? picked.work : "");
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
      setEntry("");
      setQuery("");
      setFields(initialFields);
      setPicked(null);
      detailsFor.current = null;
      setFetchedFor(null);
      setFetched(false);
      setFetchError(null);
      setPriorLog(null);
    });
  }

  // The latest box text, title and fetch for the handlers below, which are
  // set up once. Declared first so they're current before the others run.
  const fetchRef = useRef(fetchMetadata);
  useEffect(() => {
    entryRef.current = entry;
    titleRef.current = fields.title;
    fetchRef.current = fetchMetadata;
  });

  // Share-sheet landing pad: when a link arrives with the page (the iOS
  // share extension, the bookmarklet), fetch its details at once so the
  // form is filled the moment the app opens.
  const autoFetched = useRef(false);
  useEffect(() => {
    if (initialUrl && !autoFetched.current) {
      autoFetched.current = true;
      void fetchRef.current(initialUrl);
    }
  }, [initialUrl]);

  // Paste-to-log: paste a link anywhere on the page (not into a field) while
  // the top box is empty, and the form takes it and fetches.
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
      if (!url || entryRef.current.trim()) return;
      e.preventDefault();
      void retireClipboardLink();
      void fetchRef.current(url);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  // Saved: the card takes the form's place until they ask for it back.
  if (logged) {
    return (
      <LoggedPanel
        log={logged.log}
        line={logged.line}
        shareUrl={logged.shareUrl}
        onAnother={() => {
          setLogged(null);
          setFocusEntry(true);
        }}
      />
    );
  }

  const showDetails = fetched || fields.title.length > 0;

  const groupLabel =
    "border-b border-foreground/20 bg-foreground/5 px-3 py-1 font-structural text-[0.6rem] font-bold uppercase tracking-[0.18em] text-foreground/55";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="entry"
          className="font-structural text-xs font-bold uppercase tracking-[0.12em] text-foreground"
        >
          Link or title
        </label>
        <div className="relative">
          <div className="flex gap-2">
            <input
              id="entry"
              // type="text", not "url": a title goes here too, and the
              // browser's own validation would reject "thecut.com/...".
              type="text"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint={link ? "go" : "search"}
              autoFocus={autoFocus || focusEntry}
              value={entry}
              onChange={(e) => onEntryChange(e.target.value)}
              onKeyDown={onEntryKeyDown}
              onPaste={(e) => {
                // A pasted link is fetched straight away, replacing
                // whatever was in the box.
                const text = e.clipboardData.getData("text");
                const url = /https?:\/\//i.test(text) ? coerceUrl(text) : null;
                if (!url) return;
                e.preventDefault();
                void retireClipboardLink();
                void fetchMetadata(url);
              }}
              onFocus={() => {
                if (typedTitle) setListOpen(true);
              }}
              onBlur={() => setListOpen(false)}
              role="combobox"
              aria-expanded={showList}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={
                showList && active >= 0 ? `${listId}-${active}` : undefined
              }
              className={inputClass}
            />
            {link && (
              <button
                type="button"
                onClick={() => void fetchMetadata(entry)}
                disabled={fetching}
                className={`whitespace-nowrap ${buttonClass}`}
              >
                {fetching ? "Fetching" : "Fetch details"}
              </button>
            )}
          </div>

          {showList && (
            <div
              id={listId}
              role="listbox"
              aria-label="Pieces that match"
              // Clicks land before the box loses focus.
              onMouseDown={(e) => e.preventDefault()}
              className="absolute inset-x-0 top-full z-20 mt-1 max-h-[22rem] overflow-y-auto border-2 border-foreground bg-paper shadow-[4px_4px_0_var(--foreground)]"
            >
              {recordItems.length > 0 && (
                <div role="group" aria-labelledby={`${listId}-record`}>
                  <p id={`${listId}-record`} className={groupLabel}>
                    Logged here
                  </p>
                  {recordItems.map((s, i) => (
                    <Option
                      key={s.key}
                      id={`${listId}-${i}`}
                      active={active === i}
                      onChoose={() => choose(i)}
                      onHover={() => setActive(i)}
                    >
                      <SuggestionRow s={s} />
                    </Option>
                  ))}
                </div>
              )}
              {elsewhereItems.length > 0 && (
                <div role="group" aria-labelledby={`${listId}-elsewhere`}>
                  <p id={`${listId}-elsewhere`} className={groupLabel}>
                    Elsewhere
                  </p>
                  {elsewhereItems.map((s, i) => {
                    const index = recordItems.length + i;
                    return (
                      <Option
                        key={s.key}
                        id={`${listId}-${index}`}
                        active={active === index}
                        onChoose={() => choose(index)}
                        onHover={() => setActive(index)}
                      >
                        <SuggestionRow s={s} />
                      </Option>
                    );
                  })}
                </div>
              )}
              {typedTitle && (
                <Option
                  id={`${listId}-${typedIndex}`}
                  active={active === typedIndex}
                  onChoose={() => choose(typedIndex)}
                  onHover={() => setActive(typedIndex)}
                >
                  <span className="font-structural text-xs font-bold uppercase tracking-[0.1em] text-accent">
                    Use “{entry.trim()}” as the title
                  </span>
                </Option>
              )}
              {searching && (
                <p
                  aria-hidden
                  className="px-3 py-2 font-structural text-[0.6rem] font-bold uppercase tracking-[0.18em] text-foreground/45"
                >
                  Searching
                </p>
              )}
            </div>
          )}
          {/* What the list holds, for screen readers. */}
          <p aria-live="polite" className="sr-only">
            {showList
              ? searching
                ? "Searching"
                : `${pieces.length} ${pieces.length === 1 ? "match" : "matches"}`
              : ""}
          </p>
        </div>

        {canReadClipboard && !entry.trim() && !fetching && (
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
        {fetched && !fetching && !fetchError && link && link === fetchedFor && (
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

// One row of the list. Rows aren't in the tab order: focus stays in the box
// and the arrow keys move the highlight (aria-activedescendant).
function Option({
  id,
  active,
  onChoose,
  onHover,
  children,
}: {
  id: string;
  active: boolean;
  onChoose: () => void;
  onHover: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      id={id}
      role="option"
      tabIndex={-1}
      aria-selected={active}
      onClick={onChoose}
      onMouseEnter={onHover}
      className={`block w-full border-b border-foreground/15 px-3 py-2.5 text-left transition-colors ${
        active ? "bg-accent-2/10 shadow-[inset_4px_0_0_var(--accent-2)]" : ""
      }`}
    >
      {children}
    </button>
  );
}

// One suggestion: the title, who wrote it and where it ran, and either how
// many people here logged it or what kind of piece the catalog says it is.
function SuggestionRow({ s }: { s: Suggestion }) {
  const byline = [s.author, s.source].filter(Boolean).join(" · ");
  const tag =
    s.origin === "record"
      ? s.mineAt
        ? "You logged this"
        : `${s.readers} ${s.readers === 1 ? "reader" : "readers"}`
      : s.form;
  return (
    <span className="flex items-start justify-between gap-3">
      <span className="min-w-0">
        <span className="block font-serif text-[15px] font-semibold leading-snug text-foreground [overflow-wrap:anywhere]">
          {s.title}
        </span>
        {byline && (
          <span className="mt-0.5 block font-structural text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground/55 [overflow-wrap:anywhere]">
            {byline}
          </span>
        )}
      </span>
      {tag && (
        <span className="shrink-0 font-structural text-[0.6rem] font-bold uppercase tracking-[0.14em] text-accent-3">
          {tag}
        </span>
      )}
    </span>
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
