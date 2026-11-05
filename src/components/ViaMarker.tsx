"use client";

import { useEffect } from "react";

// Remembers whose share link brought this visitor to this piece, so that if
// they log it (now, or after creating an account) the log records who sent
// it and the sender hears back. A plain first-party cookie, a week long.
// The signature comes from the share link and is checked on the server when
// the log is saved; this component only carries it.
export function ViaMarker({
  workId,
  handle,
  sig,
}: {
  workId: string;
  handle: string;
  sig: string;
}) {
  useEffect(() => {
    const value = encodeURIComponent(`${workId}:${handle}:${sig}`);
    document.cookie = `ec-via=${value}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
  }, [workId, handle, sig]);
  return null;
}
