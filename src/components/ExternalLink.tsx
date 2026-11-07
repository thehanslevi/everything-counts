"use client";

import type { MouseEvent, ReactNode } from "react";
import { isNativeApp, openInApp } from "@/lib/native";

// A link to a page outside the app: the piece itself, someone's own site.
// On the web it opens in a new tab. Inside the iOS app it opens in a sheet
// over the app with a Done button, so the reader comes straight back.
export function ExternalLink({
  href,
  className,
  rel = "noopener noreferrer",
  children,
}: {
  href: string;
  className?: string;
  rel?: string;
  children: ReactNode;
}) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!isNativeApp()) return;
    event.preventDefault();
    void openInApp(href).then((opened) => {
      // No sheet after all: let the system have it, as before.
      if (!opened) window.open(href, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <a
      href={href}
      target="_blank"
      rel={rel}
      className={className}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
