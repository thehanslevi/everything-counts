"use client";

import { useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { formColor } from "@/components/LogCard";
import {
  NO_FILTERS,
  isFiltering,
  matches,
  offered,
  readFilters,
  withFilters,
  type RecordEntry,
  type RecordFacets,
  type RecordFilters,
} from "@/lib/record";

// A record you can go back through: search it, and narrow it by form, year
// and publication. The cards arrive drawn by the server; this only decides
// which of them show. Each control appears once the record gives it
// something to choose between, and none of them do until the record is
// longer than a screen or so.
const SHOWS_FROM = 5;

const chip =
  "border-2 border-foreground px-3 py-2 font-structural text-[0.7rem] font-bold uppercase tracking-[0.14em] transition-colors";
const chipOff = "bg-paper text-foreground hover:bg-foreground hover:text-background";

export function RecordBrowser({
  entries,
  facets,
  own,
}: {
  entries: (RecordEntry & { node: ReactNode })[];
  facets: RecordFacets;
  own: boolean; // the reader's own record, or someone else's
}) {
  const params = useSearchParams();
  const [chosen, setChosen] = useState<RecordFilters>(() =>
    readFilters(params, facets),
  );

  const canFilter = entries.length >= SHOWS_FROM;
  // The record can change under a filter (an edit, a delete); a choice it no
  // longer offers stops applying.
  const filters = canFilter ? offered(chosen, facets) : NO_FILTERS;
  const filtering = isFiltering(filters);
  const shown = filtering
    ? entries.filter((entry) => matches(entry, filters))
    : entries;

  // Keep the choice in the address too, without a trip to the server, so it
  // is still there after opening a piece and coming back.
  function apply(next: RecordFilters) {
    setChosen(next);
    try {
      window.history.replaceState(
        null,
        "",
        window.location.pathname +
          withFilters(window.location.search, next) +
          window.location.hash,
      );
    } catch {
      // Safari refuses after 100 changes in 30 seconds. The list has already
      // changed; the address catches up on the next one.
    }
  }

  return (
    <>
      {canFilter && (
        <div className="mt-6 flex flex-col gap-3">
          <input
            type="search"
            value={chosen.q}
            onChange={(e) => apply({ ...filters, q: e.target.value })}
            placeholder={own ? "Search your record" : "Search this record"}
            aria-label={own ? "Search your record" : "Search this record"}
            autoComplete="off"
            className="w-full rounded-none border-2 border-foreground bg-paper px-3 py-2 font-structural text-sm text-foreground outline-none placeholder:text-foreground/40 focus:border-accent"
          />

          {facets.forms.length > 1 && (
            <div role="group" aria-label="Form" className="flex flex-wrap gap-2">
              {facets.forms.map(({ form, count }) => {
                const on = filters.form === form;
                return (
                  <button
                    key={form}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      apply({ ...filters, form: on ? null : form })
                    }
                    className={`${chip} ${on ? `${formColor(form)} text-white` : chipOff}`}
                  >
                    {form}
                    <span className="ml-2 opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {(facets.years.length > 1 || facets.pubs.length > 1) && (
            <div className="flex flex-wrap items-stretch gap-2">
              {facets.years.length > 1 && (
                <div role="group" aria-label="Year" className="flex flex-wrap gap-2">
                  {facets.years.map(({ year, count }) => {
                    const on = filters.year === year;
                    return (
                      <button
                        key={year}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          apply({ ...filters, year: on ? null : year })
                        }
                        className={`${chip} ${on ? "bg-foreground text-background" : chipOff}`}
                      >
                        {year}
                        <span className="ml-2 opacity-60">{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {facets.pubs.length > 1 && (
                <select
                  aria-label="Publication"
                  value={filters.pub ?? ""}
                  onChange={(e) =>
                    apply({ ...filters, pub: e.target.value || null })
                  }
                  className={`min-w-0 max-w-full rounded-none border-2 border-foreground px-3 py-2 font-structural text-xs font-bold uppercase tracking-[0.1em] outline-none focus:border-accent ${
                    filters.pub
                      ? "bg-foreground text-background"
                      : "bg-paper text-foreground"
                  }`}
                >
                  <option value="">Every publication</option>
                  {facets.pubs.map(({ key, name, count }) => (
                    <option key={key} value={key}>
                      {name} ({count})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {filtering && (
            <p
              role="status"
              className="flex items-center justify-between gap-4 font-structural text-xs font-bold uppercase tracking-[0.14em] text-foreground"
            >
              <span>
                {shown.length} of {entries.length}
              </span>
              <button
                type="button"
                onClick={() => apply(NO_FILTERS)}
                className="uppercase tracking-[0.14em] underline decoration-foreground/40 underline-offset-2 hover:text-accent"
              >
                Clear
              </button>
            </p>
          )}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="mt-8 border-[3px] border-foreground bg-paper px-6 py-10 text-center font-structural text-xl font-black uppercase tracking-[-0.01em] text-foreground">
          Nothing matches
        </p>
      ) : (
        <ol className="mt-10 flex flex-col gap-12">
          {shown.map((entry, i) => (
            <li
              key={entry.id}
              className={i % 2 === 0 ? "-rotate-[0.6deg]" : "rotate-[0.6deg]"}
            >
              {entry.node}
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
