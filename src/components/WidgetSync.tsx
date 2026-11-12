"use client";

import { useEffect } from "react";
import { isNativeApp, setWidgetAccount } from "@/lib/native";

const SENT_KEY = "ec-widget-handle";

// In the iPhone app: tell the home screen widget whose count to show, and
// clear it on sign-out. Once per app launch and whenever it changes, not on
// every page. Remembered for the launch only (sessionStorage), so each launch
// sets it again and the widget can't drift from who is signed in.
export function WidgetSync({ handle }: { handle: string | null }) {
  useEffect(() => {
    if (!isNativeApp()) return;
    const value = handle ?? "";
    let sent: string | null = null;
    try {
      sent = sessionStorage.getItem(SENT_KEY);
    } catch {
      // no storage: send every time
    }
    if (sent === value) return;
    void setWidgetAccount(handle).then((ok) => {
      if (!ok) return;
      try {
        sessionStorage.setItem(SENT_KEY, value);
      } catch {
        // fine
      }
    });
  }, [handle]);
  return null;
}
