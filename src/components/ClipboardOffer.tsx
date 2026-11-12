"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CLIPBOARD_RETIRED,
  clipboardSeen,
  isNativeApp,
  markClipboardSeen,
  onAppForeground,
  peekClipboard,
  readClipboardLink,
} from "@/lib/native";

// In the iPhone app: when the app opens (or comes back) with a link on the
// clipboard, offer to log it. The app can tell a link is there without
// reading it, so nothing is read and iOS shows no prompt until "Log it" is
// tapped. Each copied link is offered once: logging it or saying no to it
// both retire it, by the clipboard's change count.
export function ClipboardOffer() {
  const pathname = usePathname();
  const router = useRouter();
  const [offer, setOffer] = useState<number | null>(null);

  useEffect(() => {
    if (!isNativeApp()) return;
    let alive = true;
    async function check() {
      const peek = await peekClipboard();
      if (!alive) return;
      if (!peek?.hasLink || String(peek.changeCount) === clipboardSeen()) {
        setOffer(null);
        return;
      }
      setOffer(peek.changeCount);
    }
    void check();
    const stop = onAppForeground(() => void check());
    // The log form took the link, or the app copied one itself.
    const onRetired = () => void check();
    window.addEventListener(CLIPBOARD_RETIRED, onRetired);
    return () => {
      alive = false;
      stop();
      window.removeEventListener(CLIPBOARD_RETIRED, onRetired);
    };
  }, []);

  // The log form has its own paste; onboarding has enough going on.
  const elsewhere = /^\/(log|welcome|signin|reset)(\/|$)/.test(pathname ?? "");
  if (offer === null || elsewhere) return null;

  async function logIt() {
    if (offer === null) return;
    markClipboardSeen(offer);
    setOffer(null);
    const url = await readClipboardLink();
    if (url) router.push(`/log?url=${encodeURIComponent(url)}`);
  }

  function notNow() {
    if (offer === null) return;
    markClipboardSeen(offer);
    setOffer(null);
  }

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 px-3 sm:bottom-6"
    >
      <div className="mx-auto flex max-w-xl items-center gap-3 border-[3px] border-foreground bg-foreground px-4 py-3 shadow-[5px_5px_0_var(--accent)]">
        <p className="min-w-0 flex-1 font-structural text-xs font-bold uppercase tracking-[0.12em] text-background">
          You copied a link
        </p>
        <button
          type="button"
          onClick={() => void logIt()}
          className="shrink-0 bg-accent px-4 py-2 font-structural text-xs font-bold uppercase tracking-[0.12em] text-white transition-transform active:scale-95"
        >
          Log it
        </button>
        <button
          type="button"
          onClick={notNow}
          className="shrink-0 px-1 py-2 font-structural text-xs font-bold uppercase tracking-[0.12em] text-background/70"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
