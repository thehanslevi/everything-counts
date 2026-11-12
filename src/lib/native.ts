// The iOS shell, when the page is running inside it. Capacitor puts a global
// on the window there; on the plain web it is absent and every call here
// does nothing. The plugins are loaded only when needed, so the web bundle
// never carries them.

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const shell = (
    window as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean };
    }
  ).Capacitor;
  return Boolean(shell?.isNativePlatform?.());
}

// A short confirming tap under the thumb, the moment a save lands.
export async function savedHaptic(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    // A phone without haptics, or the plugin missing: nothing to feel.
  }
}

// A page from outside the app, opened in a sheet over it with a Done button
// (SFSafariViewController), instead of sending the reader out to Safari.
// Resolves false when there is no sheet to open it in.
export async function openInApp(url: string): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url, toolbarColor: "#f2c400" });
    return true;
  } catch {
    return false;
  }
}

// --- ECNative: the app's own plugin (iPhone build 5 and later) ---------------
// Older builds don't have it; every call here then does nothing and
// reports "not available", so the web can ship before the app does.

interface ECNativePlugin {
  peekClipboard(): Promise<{ hasLink: boolean; changeCount: number }>;
  readClipboardLink(): Promise<{ url: string | null }>;
  setWidgetAccount(options: { handle: string | null }): Promise<void>;
  reloadWidgets(): Promise<void>;
  addListener(
    event: "foreground",
    callback: () => void,
  ): Promise<{ remove: () => Promise<void> }>;
}

// Held in a box: Capacitor's plugin object answers to every property name,
// "then" included, so a promise must never resolve to it directly (await
// would try to call it as a thenable and hang).
let ecNative: Promise<{ plugin: ECNativePlugin } | null> | null = null;

function native(): Promise<{ plugin: ECNativePlugin } | null> {
  if (!isNativeApp()) return Promise.resolve(null);
  // Registered on the native side at launch (ViewController), which also
  // hands the page its description. On a build without it, calls reject as
  // unimplemented and the wrappers below catch.
  ecNative ??= import("@capacitor/core")
    .then(({ registerPlugin }) => ({
      plugin: registerPlugin<ECNativePlugin>("ECNative"),
    }))
    .catch(() => null);
  return ecNative;
}

// Is there a link on the clipboard? Asked without reading it, so iOS shows
// no paste prompt. Null when the app can't tell (older build, the web).
export async function peekClipboard(): Promise<{
  hasLink: boolean;
  changeCount: number;
} | null> {
  try {
    return (await (await native())?.plugin.peekClipboard()) ?? null;
  } catch {
    return null;
  }
}

// Read the copied link. Only ever called from a tap; iOS asks first.
export async function readClipboardLink(): Promise<string | null> {
  try {
    return (await (await native())?.plugin.readClipboardLink())?.url ?? null;
  } catch {
    return null;
  }
}

// Run `callback` each time the app comes back to the front. Returns a
// function that stops it.
export function onAppForeground(callback: () => void): () => void {
  let stop: (() => void) | null = null;
  let stopped = false;
  void native().then(async (box) => {
    if (!box || stopped) return;
    try {
      const handle = await box.plugin.addListener("foreground", callback);
      if (stopped) void handle.remove();
      else stop = () => void handle.remove();
    } catch {
      // no events from this build
    }
  });
  return () => {
    stopped = true;
    stop?.();
  };
}

// Tell the home screen widget whose count to show (null when signed out).
// True when the app took it; false on the web or a build without a widget.
export async function setWidgetAccount(handle: string | null): Promise<boolean> {
  try {
    const box = await native();
    if (!box) return false;
    await box.plugin.setWidgetAccount({ handle });
    return true;
  } catch {
    return false;
  }
}

// Ask the widget to fetch again (after a save).
export async function reloadWidgets(): Promise<void> {
  try {
    await (await native())?.plugin.reloadWidgets();
  } catch {
    // older build: no widget
  }
}

// --- Which copied link has already been dealt with ----------------------------
// The clipboard's change count identifies one copy. Once a copied link has
// been logged, turned down, or taken into the log form some other way (or
// was put there by the app itself), the copy-to-log bar stops offering it.

const CLIPBOARD_SEEN_KEY = "ec-clipboard-seen";
export const CLIPBOARD_RETIRED = "ec-clipboard-retired";

export function clipboardSeen(): string | null {
  try {
    return localStorage.getItem(CLIPBOARD_SEEN_KEY);
  } catch {
    return null;
  }
}

export function markClipboardSeen(changeCount: number): void {
  try {
    localStorage.setItem(CLIPBOARD_SEEN_KEY, String(changeCount));
  } catch {
    // private mode: the offer may come back once, which is harmless
  }
}

// Whatever is on the clipboard now has been dealt with: don't offer it.
// A no-op on the web and on app builds without the plugin.
export async function retireClipboardLink(): Promise<void> {
  const peek = await peekClipboard();
  if (!peek) return;
  markClipboardSeen(peek.changeCount);
  window.dispatchEvent(new Event(CLIPBOARD_RETIRED));
}
