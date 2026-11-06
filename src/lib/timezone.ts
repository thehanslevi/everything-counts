import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";
import { FALLBACK_ZONE, isTimeZone } from "@/lib/dates";

// The time zone to show this reader's dates in.
//
// A reader's device knows its zone and the server doesn't, so the browser
// leaves it in a cookie (TimeZoneSync, in the root layout) and every later
// page arrives already right. On a first visit there is no cookie yet: the
// zone is guessed from where the request came from, and the page is redrawn
// once the device has said otherwise.

export const TZ_COOKIE = "tz";

// The zone the device reported, or null when it hasn't yet. Use this where
// a guess would be worse than a fixed answer (an image a crawler also
// fetches).
export const getDeviceTimeZone = cache(async (): Promise<string | null> => {
  const value = (await cookies()).get(TZ_COOKIE)?.value;
  return isTimeZone(value) ? value : null;
});

export const getTimeZone = cache(async (): Promise<string> => {
  const fromDevice = await getDeviceTimeZone();
  if (fromDevice) return fromDevice;
  // Vercel's estimate from the visitor's address.
  const guess = (await headers()).get("x-vercel-ip-timezone");
  return isTimeZone(guess) ? guess : FALLBACK_ZONE;
});
