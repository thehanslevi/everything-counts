"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "@/app/actions";
import { Avatar } from "@/components/Avatar";
import type { Profile } from "@/lib/data/types";

const item =
  "block w-full px-4 py-2.5 text-left font-structural text-xs font-bold uppercase tracking-[0.1em] text-foreground transition-colors hover:bg-foreground hover:text-background";

// The avatar-triggered profile dropdown in the masthead: your profile,
// notifications, account, and sign out. Closes on outside click / Escape.
export function ProfileMenu({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Your account menu"
        className="flex items-center gap-2 transition-opacity hover:opacity-80"
      >
        <Avatar profile={profile} className="size-8" />
        <span className="hidden font-structural text-xs font-bold uppercase tracking-[0.1em] text-foreground sm:inline">
          @{profile.handle}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-52 border-[3px] border-foreground bg-paper shadow-[5px_5px_0_0_var(--foreground)]"
        >
          <Link
            href={`/u/${profile.handle}`}
            role="menuitem"
            onClick={() => setOpen(false)}
            className={`${item} border-b border-foreground/20`}
          >
            Your profile
          </Link>
          <Link
            href="/notifications"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={`${item} border-b border-foreground/20`}
          >
            Notifications
          </Link>
          <Link
            href="/people"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={`${item} border-b border-foreground/20`}
          >
            Find people
          </Link>
          <form action={signOut}>
            <button type="submit" role="menuitem" className={item}>
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
