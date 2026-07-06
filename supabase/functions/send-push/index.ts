// send-push: deliver an APNs push to every device a user has registered.
//
// This is a trusted server-to-server endpoint, not a public one. It is called
// only from the Next.js server actions (see src/lib/push.ts), which pass a
// shared secret in the `x-push-secret` header. Because auth is custom, the
// function is deployed with verify_jwt = false.
//
// It reads recipient device tokens with the service role (bypassing RLS),
// signs a short-lived APNs provider JWT (ES256) from the .p8 auth key, and
// POSTs an alert to Apple. Tokens Apple rejects as dead are pruned.
//
// Every secret is optional at deploy time: with no APNs key configured the
// function returns ok:{skipped} so callers never break before Apple is set up.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const PUSH_SECRET = Deno.env.get("PUSH_SECRET");
const APNS_KEY = Deno.env.get("APNS_KEY"); // contents of the AuthKey_XXXX.p8 file
const APNS_KEY_ID = Deno.env.get("APNS_KEY_ID");
const APNS_TEAM_ID = Deno.env.get("APNS_TEAM_ID");
const APNS_TOPIC = Deno.env.get("APNS_TOPIC") ?? "com.everythingcounts.app";
const APNS_PRODUCTION = (Deno.env.get("APNS_PRODUCTION") ?? "true") !== "false";
const APNS_HOST = APNS_PRODUCTION
  ? "api.push.apple.com"
  : "api.sandbox.push.apple.com";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlStr(str: string): string {
  return b64url(enc.encode(str));
}

// Strip the PEM armor and decode the base64 body to raw DER bytes.
function pemToDer(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/, "")
    .replace(/-----END [^-]+-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const der = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) der[i] = bin.charCodeAt(i);
  return der;
}

// A fresh APNs provider token. Cheap to mint; regenerated per invocation given
// the current volume (Apple allows one refresh per 20 minutes, not required).
async function apnsJwt(): Promise<string> {
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(APNS_KEY!),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const header = b64urlStr(JSON.stringify({ alg: "ES256", kid: APNS_KEY_ID }));
  const payload = b64urlStr(
    JSON.stringify({ iss: APNS_TEAM_ID, iat: Math.floor(Date.now() / 1000) }),
  );
  const signingInput = `${header}.${payload}`;
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    enc.encode(signingInput),
  );
  return `${signingInput}.${b64url(new Uint8Array(sig))}`;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);

  // Custom auth: only our server actions know the shared secret.
  if (!PUSH_SECRET || req.headers.get("x-push-secret") !== PUSH_SECRET) {
    return json({ error: "unauthorized" }, 401);
  }

  // Before Apple is configured, accept and no-op so callers never fail.
  if (!APNS_KEY || !APNS_KEY_ID || !APNS_TEAM_ID) {
    return json({ ok: true, skipped: "apns-not-configured" });
  }

  let payloadIn: {
    recipientUserId?: string;
    title?: string;
    body?: string;
    url?: string;
  };
  try {
    payloadIn = await req.json();
  } catch {
    return json({ error: "bad-json" }, 400);
  }
  const { recipientUserId, title, body, url } = payloadIn;
  if (!recipientUserId || !title) return json({ error: "bad-request" }, 400);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: tokens } = await supabase
    .from("device_tokens")
    .select("token")
    .eq("user_id", recipientUserId);

  if (!tokens || tokens.length === 0) return json({ ok: true, sent: 0 });

  const jwt = await apnsJwt();
  const apnsBody = JSON.stringify({
    aps: { alert: { title, body: body ?? "" }, sound: "default" },
    url: url ?? null,
  });

  let sent = 0;
  const stale: string[] = [];
  await Promise.all(
    tokens.map(async ({ token }) => {
      const res = await fetch(`https://${APNS_HOST}/3/device/${token}`, {
        method: "POST",
        headers: {
          authorization: `bearer ${jwt}`,
          "apns-topic": APNS_TOPIC,
          "apns-push-type": "alert",
          "apns-priority": "10",
        },
        body: apnsBody,
      });
      if (res.status === 200) {
        sent++;
        return;
      }
      const txt = await res.text();
      // 410 Gone, or a body naming a dead token, means prune it.
      if (
        res.status === 410 ||
        txt.includes("BadDeviceToken") ||
        txt.includes("Unregistered")
      ) {
        stale.push(token);
      }
      console.error("APNs error", res.status, txt);
    }),
  );

  if (stale.length) {
    await supabase.from("device_tokens").delete().in("token", stale);
  }

  return json({ ok: true, sent, pruned: stale.length });
});
