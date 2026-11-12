"use client";

import { useEffect } from "react";
import { isNativeApp, setWidgetAccount } from "@/lib/native";

const SENT_KEY = "ec-widget-handle";

// In the iPhone app: tell the home screen widget whose count to show, and
// clear it on sign-out. Only when it changes, so the widget isn't asked to
// refetch on every page.
export function WidgetSync({ handle }: { handle: string | null }) {
  useEffect(() => {
    if (!isNativeApp()) return;
    const value = handle ?? "";
    let sent: string | null = null;
    try {
      sent = localStorage.getItem(SENT_KEY);
    } catch {
      // no storage: send every time
    }
    if (sent === value) return;
    void setWidgetAccount(handle).then((ok) => {
      if (!ok) return;
      try {
        localStorage.setItem(SENT_KEY, value);
      } catch {
        // fine
      }
    });
  }, [handle]);
  return null;
}
