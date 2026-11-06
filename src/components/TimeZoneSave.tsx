"use client";

import { useEffect } from "react";
import { rememberTimeZone } from "@/app/actions";

// Keeps the signed-in person's saved time zone (for the weekly email) equal
// to the one their device is set to. The header passes what is saved; when
// the device says something else, this sends the new one. Renders nothing.
export function TimeZoneSave({ saved }: { saved: string | null }) {
  useEffect(() => {
    let zone = "";
    try {
      zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    } catch {
      return;
    }
    if (!zone || zone === saved) return;
    void rememberTimeZone(zone);
  }, [saved]);

  return null;
}
