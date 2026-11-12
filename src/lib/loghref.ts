// Where "Log it" goes for a piece already on the record. A piece with a link
// opens the log form with that link (its details are fetched there); one
// without carries its details and its work, so the new log pools with it.
export function logItHref(piece: {
  url: string | null;
  title: string;
  author: string | null;
  source: string | null;
  form: string;
  workId: string;
}): string {
  if (piece.url) return `/log?url=${encodeURIComponent(piece.url)}`;
  const params = new URLSearchParams({ title: piece.title });
  if (piece.author) params.set("author", piece.author);
  if (piece.source) params.set("source", piece.source);
  params.set("form", piece.form);
  params.set("work", piece.workId);
  return `/log?${params}`;
}
