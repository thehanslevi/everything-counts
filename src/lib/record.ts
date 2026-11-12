// Going back through a record: narrow it by form, year and publication, and
// search inside it. Pure, shared by the server (which describes each log)
// and the browser (which does the narrowing), so both agree on what matches.

import { FORMS, type Form, type Log } from "@/lib/data/types";
import { slugify } from "@/lib/slug";
import { yearIn } from "@/lib/dates";
import { fold } from "@/lib/fold";

// What the browser needs to know about a log to filter it. The card itself
// is drawn on the server and handed over alongside.
export interface RecordEntry {
  id: string;
  form: Form;
  year: number; // in the reader's zone, the same day the card prints
  pub: string | null; // the publication, folded the way source pages fold it
  text: string; // everything searchable, folded
}

export interface RecordFilters {
  q: string;
  form: Form | null;
  year: number | null;
  pub: string | null;
}

export const NO_FILTERS: RecordFilters = {
  q: "",
  form: null,
  year: null,
  pub: null,
};

export interface RecordFacets {
  forms: { form: Form; count: number }[]; // in the app's usual order
  years: { year: number; count: number }[]; // newest first
  pubs: { key: string; name: string; count: number }[]; // most-read first
}

// Lowercase, accents off, apostrophes out, other punctuation to spaces, so
// "zizek" finds "Žižek's" and "dont" finds "Don't".
export { fold };

export function entryFor(log: Log, timeZone?: string): RecordEntry {
  return {
    id: log.id,
    form: log.form,
    year: yearIn(log.createdAt, timeZone),
    pub: (log.source && slugify(log.source)) || null,
    text: fold(
      [log.title, log.author, log.source, log.take, log.form]
        .filter(Boolean)
        .join(" "),
    ),
  };
}

// The choices a record offers. A publication typed two ways counts once,
// under the spelling used most.
export function facetsOf(logs: Log[], timeZone?: string): RecordFacets {
  const forms = new Map<Form, number>();
  const years = new Map<number, number>();
  const pubs = new Map<string, { names: Map<string, number>; count: number }>();

  for (const log of logs) {
    const entry = entryFor(log, timeZone);
    forms.set(entry.form, (forms.get(entry.form) ?? 0) + 1);
    if (entry.year) years.set(entry.year, (years.get(entry.year) ?? 0) + 1);
    if (entry.pub && log.source) {
      const pub = pubs.get(entry.pub) ?? { names: new Map(), count: 0 };
      const name = log.source.trim();
      pub.names.set(name, (pub.names.get(name) ?? 0) + 1);
      pub.count += 1;
      pubs.set(entry.pub, pub);
    }
  }

  return {
    forms: FORMS.filter((form) => forms.has(form)).map((form) => ({
      form,
      count: forms.get(form) ?? 0,
    })),
    years: [...years.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([year, count]) => ({ year, count })),
    pubs: [...pubs.entries()]
      .map(([key, { names, count }]) => ({
        key,
        name: [...names.entries()].sort((a, b) => b[1] - a[1])[0][0],
        count,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  };
}

// Every word typed has to appear somewhere in the log: title, author,
// publication, take or form.
export function matches(entry: RecordEntry, filters: RecordFilters): boolean {
  if (filters.form && entry.form !== filters.form) return false;
  if (filters.year && entry.year !== filters.year) return false;
  if (filters.pub && entry.pub !== filters.pub) return false;
  const words = fold(filters.q).split(" ").filter(Boolean);
  return words.every((word) => entry.text.includes(word));
}

export function isFiltering(filters: RecordFilters): boolean {
  return Boolean(
    filters.q.trim() || filters.form || filters.year || filters.pub,
  );
}

// The same filters, minus any value this record doesn't offer (a form with
// no logs left in it, a year from someone else's link).
export function offered(
  filters: RecordFilters,
  facets: RecordFacets,
): RecordFilters {
  return {
    q: filters.q.slice(0, 100),
    form: facets.forms.some((f) => f.form === filters.form)
      ? filters.form
      : null,
    year: facets.years.some((y) => y.year === filters.year)
      ? filters.year
      : null,
    pub: facets.pubs.some((p) => p.key === filters.pub) ? filters.pub : null,
  };
}

// Filters ride in the address (?q=&form=&year=&pub=) so a filtered record
// survives opening a piece and coming back, and can be sent as a link.
export function readFilters(
  params: { get(name: string): string | null },
  facets: RecordFacets,
): RecordFilters {
  return offered(
    {
      q: params.get("q") ?? "",
      form: params.get("form") as Form | null,
      year: Number(params.get("year")) || null,
      pub: params.get("pub"),
    },
    facets,
  );
}

// The same address with these filters in it, other parameters left alone.
export function withFilters(search: string, filters: RecordFilters): string {
  const params = new URLSearchParams(search);
  const set = (name: string, value: string | null) => {
    if (value) params.set(name, value);
    else params.delete(name);
  };
  set("q", filters.q.trim() || null);
  set("form", filters.form);
  set("year", filters.year ? String(filters.year) : null);
  set("pub", filters.pub);
  const out = params.toString();
  return out ? `?${out}` : "";
}
