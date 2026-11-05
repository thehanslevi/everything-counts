// URL slugs for the places and people reading comes from: "The Stacks
// Reader" -> "the-stacks-reader", "Slavoj Žižek" -> "slavoj-zizek". Folds
// case, accents, and punctuation, so the same publication typed two ways
// lands on one page.
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// An author field worth a page: a name. Sites put all sorts of things in
// their author metadata (a profile URL, an @handle); those don't get one.
function isNameLike(value: string): boolean {
  const v = value.trim();
  return (
    v.length >= 2 &&
    v.length <= 80 &&
    !/^(https?:\/\/|www\.|@)/i.test(v) &&
    /\p{L}/u.test(v)
  );
}

export function sourceHref(source: string | null): string | null {
  const slug = source ? slugify(source) : "";
  return slug ? `/source/${slug}` : null;
}

export function authorHref(author: string | null): string | null {
  if (!author || !isNameLike(author)) return null;
  const slug = slugify(author);
  return slug ? `/author/${slug}` : null;
}
