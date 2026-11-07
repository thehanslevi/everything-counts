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
