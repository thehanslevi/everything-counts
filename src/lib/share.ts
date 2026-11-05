import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const SITE = "https://everything-counts.vercel.app";

// Share links name who sent them: /work/<id>?from=<handle>&s=<signature>.
// A log made from one says "sent by @handle" in public, so the name has to
// be real. The signature ties the handle to the work, and only this server
// can make one, for the signed-in person asking; a link with a missing or
// wrong signature still opens the piece, it just doesn't attribute.
//
// The key is derived from PUSH_SECRET rather than adding a second secret to
// configure. Where that isn't set (local dev, previews) a fixed key keeps
// the flow testable; those signatures prove nothing, and nothing relies on
// them outside production.
const KEY = createHmac("sha256", process.env.PUSH_SECRET ?? "dev-only-share-key")
  .update("share-link-v1")
  .digest();

export function shareSig(workId: string, handle: string): string {
  return createHmac("sha256", KEY)
    .update(`${workId}:${handle}`)
    .digest("base64url")
    .slice(0, 16);
}

export function shareSigValid(
  workId: string,
  handle: string,
  sig: string | undefined | null,
): boolean {
  if (!sig) return false;
  const want = Buffer.from(shareSig(workId, handle));
  const got = Buffer.from(sig);
  return got.length === want.length && timingSafeEqual(got, want);
}

export function shareUrl(workId: string, handle: string): string {
  return `${SITE}/work/${workId}?from=${handle}&s=${shareSig(workId, handle)}`;
}
