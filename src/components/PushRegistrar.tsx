"use client";

import { useEffect } from "react";
import { registerDeviceToken } from "@/app/actions";

// Registers this device for push when running inside the native iOS shell.
// On the web this is inert — Capacitor.isNativePlatform() is false, so nothing
// loads or prompts. Everything is dynamically imported so the push plugin
// never ends up in the web bundle's critical path.
//
// The APNs token is handed to a server action, which stores it against the
// signed-in user. If no one is signed in yet the token is dropped and picked
// up on a later app open (register() re-fires "registration" each launch).
export function PushRegistrar() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;

      const { PushNotifications } = await import(
        "@capacitor/push-notifications"
      );

      let perm = await PushNotifications.checkPermissions();
      if (
        perm.receive === "prompt" ||
        perm.receive === "prompt-with-rationale"
      ) {
        perm = await PushNotifications.requestPermissions();
      }
      if (perm.receive !== "granted" || cancelled) return;

      // APNs device token arrives here after register() succeeds.
      await PushNotifications.addListener("registration", (token) => {
        if (!cancelled) void registerDeviceToken(token.value, "ios");
      });

      await PushNotifications.addListener("registrationError", (err) => {
        console.error("push registration error", err);
      });

      // Tapping a notification routes the webview to its in-app path.
      await PushNotifications.addListener(
        "pushNotificationActionPerformed",
        (action) => {
          const url = action.notification.data?.url;
          if (typeof url === "string" && url.startsWith("/")) {
            window.location.assign(url);
          }
        },
      );

      await PushNotifications.register();
    })();

    return () => {
      cancelled = true;
      void import("@capacitor/push-notifications").then(
        ({ PushNotifications }) => PushNotifications.removeAllListeners(),
      );
    };
  }, []);

  return null;
}
