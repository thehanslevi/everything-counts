# Shipping version 1.2 (build 4)

The app is a webview of the live site, so everything built on the web since
1.1 is already in people's hands. This build carries the three things only a
native build can change:

- **Share sheet reads the page.** Shared from Safari, the log form opens with
  the page's title, author, publication and picture already in it, paywalled
  sites included. Shared from another app, it still arrives with the link.
- **Pieces open inside the app.** "Open the piece" opens a sheet over the app
  with a close button, instead of sending the reader out to Safari.
- **A tap on save.** A short haptic when the saved card lands.

Version 1.2, build 4. Archived and uploaded from this Mac with the same
pipeline as build 3 (`RELEASE_BUILD3.md`).

## App Store Connect

1. On the app page, add version **1.2** (the ⊕ next to "iOS App" in the
   version sidebar).
2. When build 4 has finished processing, attach it.
3. Paste What's New (draft below).
4. Encryption is already answered (ITSAppUsesNonExemptEncryption = false).
5. **App Review Information.** The old reviewer account is gone. Apple asks
   for a sign-in for apps that need one, so before submitting, make a fresh
   account in the app, log two or three pieces with it, and put its email and
   password in the review notes yourself.
6. Submit for review.

### What's New (draft, yours to change)

> Share a page from Safari and the log form fills in with its title, author
> and picture. Pieces open inside the app and close with one tap. A tap you
> can feel when a log is saved.

## Review note

No new user-generated surface in this version. The share extension now reads
the shared page's own metadata (title, author, site name, lead image) and
nothing else; it runs only when the reader shares a page to the app.
