# Push notifications — setup runbook

All the code is built and merged. Push is **inert until you complete the steps
below** — the app, web deploy, and edge function all no-op safely without the
APNs secrets, so nothing is broken in the meantime.

What's already done (in the repo / live infra):

- `device_tokens` table + RLS (migration applied to Supabase).
- `send-push` edge function (`supabase/functions/send-push/`) — signs an APNs
  JWT from your `.p8` key and delivers alerts. **Written but not yet deployed.**
- Web: `PushRegistrar` registers the device on app open and stores the token;
  `registerDeviceToken` server action persists it.
- Triggers wired (best-effort, never block the action):
  - **New follower** → "@you started following you."
  - **Someone you follow logged** → "@handle logged something" + the title.
  - **Invite accepted** → "@handle joined from your invite."
- Native: AppDelegate forwards the APNs token to Capacitor; push plugin synced
  into the iOS project; `App.entitlements` (aps-environment) created and wired
  into both build configs.

---

## Your steps

### 1. Create an APNs Auth Key (.p8)

developer.apple.com → **Certificates, Identifiers & Profiles → Keys → +**

- Name it (e.g. "Everything Counts APNs"), check **Apple Push Notifications
  service (APNs)**, Continue → Register → **Download**.
- You can only download the `.p8` **once** — keep it safe.
- Note the **Key ID** (10 chars, in the filename `AuthKey_XXXXXXXXXX.p8`).
- Your **Team ID** is `MK967HUYK6`.

### 2. Enable Push on the App ID

developer.apple.com → **Identifiers → `com.everythingcounts.app`** → check
**Push Notifications** → Save.

(The bundle IDs were registered manually, so this must be toggled explicitly —
automatic signing won't add it for you.)

### 3. Set the edge function secrets (Supabase)

Dashboard → **Project Settings → Edge Functions → Secrets** (or CLI). Set:

| Secret | Value |
|---|---|
| `PUSH_SECRET` | a random string — generate with `openssl rand -hex 32` |
| `APNS_KEY` | the **full contents** of the `.p8` (paste incl. the BEGIN/END lines) |
| `APNS_KEY_ID` | the 10-char Key ID from step 1 |
| `APNS_TEAM_ID` | `MK967HUYK6` |
| `APNS_TOPIC` | `com.everythingcounts.app` *(optional — this is the default)* |
| `APNS_PRODUCTION` | `true` for TestFlight/App Store builds; `false` only for local Xcode device debug (sandbox APNs) |

CLI equivalent:
```bash
supabase secrets set --project-ref ioarvwzcdnzxfinfroer \
  PUSH_SECRET="$(openssl rand -hex 32)" \
  APNS_KEY="$(cat ~/Downloads/AuthKey_XXXXXXXXXX.p8)" \
  APNS_KEY_ID=XXXXXXXXXX APNS_TEAM_ID=MK967HUYK6 APNS_PRODUCTION=true
```
**Save the `PUSH_SECRET` value — you need the same one in step 5.**

### 4. Deploy the edge function

It uses custom shared-secret auth, so JWT verification stays off:
```bash
supabase functions deploy send-push --no-verify-jwt --project-ref ioarvwzcdnzxfinfroer
```
(Or tell me to deploy it — it was auto-blocked earlier as a production deploy.)

### 5. Set `PUSH_SECRET` in Vercel

The server actions read it to authenticate to the function. Same value as step 3.
```bash
vercel env add PUSH_SECRET production
# paste the same value; repeat for `preview` if you want push from previews
```
Then redeploy (any push to `main`, or `vercel --prod`) so it takes effect.
`NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` are already set.

### 6. Rebuild + upload the native app

Push needs a fresh build carrying the new entitlement. In Xcode confirm the App
target's **Signing & Capabilities** shows **Push Notifications** (Automatic
signing will regenerate the profile now that the App ID has the capability).
Then bump the build number and archive with the pipeline that worked before:

```bash
cd ios/App
# bump CURRENT_PROJECT_VERSION to 3
xcodebuild archive -allowProvisioningUpdates DEVELOPMENT_TEAM=MK967HUYK6 \
  -scheme App -archivePath output/App.xcarchive CURRENT_PROJECT_VERSION=3
xcodebuild -exportArchive -exportOptionsPlist output/ExportOptions.plist \
  -archivePath output/App.xcarchive -exportPath output
```
Upload → TestFlight.

### 7. Test the chain

1. Install the new TestFlight build; sign in; **allow** the notification prompt.
2. From a second account, **follow** your account → push arrives within seconds.
3. Log a piece from an account your first account follows → push arrives.

If nothing comes through: check the function logs
(`supabase functions logs send-push`) — `skipped: apns-not-configured` means a
secret is missing; an APNs 4xx body names the problem (`BadDeviceToken` usually
means an `APNS_PRODUCTION` mismatch with the build type).

---

## Notes

- **Delivery is best-effort by design.** A push failure never blocks a follow,
  a log, or onboarding.
- **Dead tokens self-prune:** Apple 410 / `Unregistered` responses delete the
  token row.
- **Volume:** at current scale every trigger is on. If a followed account gets
  many followers, the "logged something" fan-out is one APNs call per follower —
  batch it into the edge function later if it ever gets loud.
