"use client";

import { useEffect } from "react";

// Remembers whose share link brought this visitor to this piece, so that if
// they log it (now, or after creating an account) the log records who sent
// it and the sender hears back. A plain first-party cookie, a week long;
// it is an attribution hint, nothing more.
export function ViaMarker({
  workId,
  handle,
}: {
  workId: string;
  handle: string;
}) {
  useEffect(() => {
    const value = encodeURIComponent(`${workId}:${handle}`);
    document.cookie = `ec-via=${value}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
  }, [workId, handle]);
  return null;
}
