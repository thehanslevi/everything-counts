# Shipping version 1.3 (build 5)

The app is a webview of the live site, so the web half of this round reaches
everyone as soon as it's deployed: the log form's link-or-title box with
suggestions, logging without a link, and the "Log from Safari" steps. This
build carries the two things only a native build can add:

- **A copied link, offered.** When the app opens or comes back with a link on
  the clipboard, a bar offers to log it. The app checks that a link is there
  without reading it (UIPasteboard `hasURLs` / `detectPatterns`), so iOS shows
  no paste banner; the link is read only when "Log it" is tapped, and iOS asks
  first. Each copied link is offered once.
- **A home screen widget.** Small: this month's count. Medium: the count and
  the newest piece from someone you follow. It reads the public
  `/api/widget?handle=&tz=` and refreshes about every 30 minutes and after
  every save.

Tested end to end in the Simulator (iPhone 17 Pro and Pro Max, iOS 26.5),
with a debug build pointed at a local copy of the site:

- With a link copied, opening the app peeked `hasLink: true` and showed no
  "pasted from" banner; the bar appeared.
- "Log it" brought up iOS's own paste prompt; after Allow Paste the app
  opened `/log?url=<the copied link>`.
- A link logged or turned down ("Not now") isn't offered again, across a
  relaunch; a new copy made while the app was in the background is offered
  when it comes back (the "foreground" event).
- The site handed the widget a handle; the widget fetched the live
  `/api/widget` and showed "NOVEMBER · 1 · piece" on the home screen. Signed
  out, the site clears it and the widget says "Open the app to see this month."

Native pieces: `ECNativePlugin.swift` (registered in `ViewController`), the
`Widget` extension target, App Group `group.com.everythingcounts.app` on the
app and the widget, privacy manifests (UserDefaults reasons CA92.1, 1C8F.1),
and `everythingcounts://open?path=/...` for widget taps. Version 1.3, build 5.
Archived and uploaded with the same pipeline as build 3 and 4
(`RELEASE_BUILD3.md`).

## Signing (first time for the widget)

The widget is a new target (`com.everythingcounts.app.widget`) and both it and
the app now use the App Group `group.com.everythingcounts.app`. Archiving with
`-allowProvisioningUpdates` registers both on the developer account, but only
while Xcode is signed in: Xcode > Settings > Accounts must list the Apple ID.
Without it the archive stops with "No Accounts" and "provisioning profile
doesn't include the App Groups capability".

## App Store Connect

1. Add version **1.3**, attach build 5 when it has processed.
2. What's New (draft below).
3. Screenshots: optional. The 1.2 ones still match the app.
4. **App Review Information.** The @hans review account is still there. Notes
   (draft below) should mention the widget and the clipboard offer.
5. Add for Review, then Submit.

### What's New (drafts, mine, pick or rewrite)

- A: Type a title to log a piece without a link. Add the widget to see this month's pieces.
- B: Log by title, with or without a link. The app now offers to log a link you've copied.
- C: Search titles as you log. A home screen widget shows this month's pieces.

### Review notes (draft, mine)

> New in 1.3: a home screen widget (small and medium) showing the signed-in
> reader's count for the month and the newest piece from someone they follow.
> Before the app has told it who is signed in, it says "Open the app to see
> this month."
> Add it from the home screen's widget gallery after signing in.
>
> When the app opens with a link on the clipboard, it shows a "Log it" bar. It
> only checks whether a link is there (UIPasteboard detectPatterns/hasURLs) and
> reads the clipboard after the reader taps "Log it".
