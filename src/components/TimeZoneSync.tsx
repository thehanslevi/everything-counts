"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Tells the server which time zone this device is set to, so dates come out
// in it. The zone is kept in a cookie (read by getTimeZone on the server).
// When the cookie is missing or the device has moved to another zone, it is
// written and the page is redrawn once with the right dates. Renders
// nothing.
const COOKIE = "tz";
const YEAR = 60 * 60 * 24 * 365;

function readCookie(): string | null {
  const found = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${COOKIE}=`));
  return found ? found.slice(COOKIE.length + 1) : null;
}

export function TimeZoneSync() {
  const router = useRouter();

  useEffect(() => {
    let zone = "";
    try {
      zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    } catch {
      return;
    }
    // Zone names are letters, digits and / _ + - only, all safe in a cookie.
    if (!/^[A-Za-z0-9/_+-]{1,64}$/.test(zone)) return;
    if (readCookie() === zone) return;

    document.cookie = `${COOKIE}=${zone}; path=/; max-age=${YEAR}; samesite=lax`;
    // Where cookies are refused the server can't learn the zone; redrawing
    // would change nothing, on every page.
    if (readCookie() === zone) router.refresh();
  }, [router]);

  return null;
}
