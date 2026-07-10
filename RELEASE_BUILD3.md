# Shipping version 1.1 (build 3)

v1.0 is approved and live. Because the app is a Capacitor webview of
everything-counts.vercel.app, **every web change is already in users' hands** —
the brand refresh, profiles, notifications, the social layer, all the copy.

This build exists only for the two things the webview can't update: the **app
icon/splash** and **push notifications**. Both are already committed to `main`;
version is bumped to 1.1 / build 3.

## 1. Enable Push on the App ID (one-time)

developer.apple.com → Identifiers → `com.everythingcounts.app` → check **Push
Notifications** → Save. (Skip if you already did this from PUSH_SETUP.md.)

## 2. Xcode: confirm signing

Open `ios/App/App.xcodeproj`, select the **App** target → **Signing &
Capabilities**. With automatic signing and Push enabled on the App ID, Xcode
regenerates the profile. Confirm **Push Notifications** shows in the
capabilities list (the `aps-environment` entitlement is already wired). If it
warns the profile lacks the capability, let it fix/regenerate.

## 3. Archive + upload build 3

Same pipeline as before; the version (1.1 / build 3) is baked into the project
now, so no CLI overrides needed:

```bash
cd ios/App
xcodebuild archive -allowProvisioningUpdates DEVELOPMENT_TEAM=MK967HUYK6 \
  -scheme App -archivePath output/App.xcarchive
xcodebuild -exportArchive -exportOptionsPlist output/ExportOptions.plist \
  -archivePath output/App.xcarchive -exportPath output
```

(If the first archive fails with a transient missing-profile error, retry once.)

## 4. App Store Connect

1. Create a new version **1.1** (the "+ Version" button on the app page).
2. Once build 3 finishes processing, attach it.
3. Fill **What's New** (draft below).
4. Encryption question is already answered (ITSAppUsesNonExemptEncryption=false).
5. Submit for review.

### What's New (draft)

> A bolder new look — a rising-sun seal and a louder, more colorful design.
> Richer profiles with your own seal (or a photo), a bio, and a link.
> Notifications when someone follows you or reads a piece you've read.
> Followers and following, a cleaner sign-up, and faster ways to log and share.

## 5. Push delivery secrets (separate, anytime)

The build ships the push *capability*. Actual delivery starts once the APNs key
and secrets are set — that's steps 1 and 3–5 of `PUSH_SETUP.md` (create the .p8
key, set Supabase + Vercel secrets, deploy send-push). Not required for review;
do it whenever.

## Review note

This version adds one new user-generated surface vs v1: **avatar photo upload**.
It's opt-in (default is the generated seal) and covered by the existing
report/block + account-deletion flows, same as the rest of the UGC. No new
review risk beyond what v1 already passed.
