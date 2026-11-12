"use client";

import { useSyncExternalStore } from "react";
import { isNativeApp } from "@/lib/native";
import { Bookmarklet } from "@/components/Bookmarklet";

const APP_STORE_URL = "https://apps.apple.com/app/id6787774280";

type Where = "app" | "ios-web" | "other";

function whereNow(): Where {
  const ua = navigator.userAgent;
  const iPad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  if (isNativeApp()) return "app";
  return /iPhone|iPad|iPod/.test(ua) || iPad ? "ios-web" : "other";
}

// How to log from outside the app, for whatever the reader is holding.
// In the iPhone app: where Safari's share sheet keeps Everything Counts
// (iOS puts a new app at the end of the row, and in iOS 26 Share itself
// moved into the ••• menu). In Safari on an iPhone or iPad without the app:
// the app is what adds it to the share sheet. Elsewhere: the bookmark.
// Decided after mount, since the server can't tell.
export function LogElsewhere() {
  const where = useSyncExternalStore<Where | null>(
    () => () => {},
    whereNow,
    () => null,
  );

  if (where === null) return null;
  if (where === "other") return <Bookmarklet />;

  if (where === "ios-web") {
    return (
      <section className="mt-10 border-[3px] border-foreground bg-paper p-5 sm:p-6">
        <h3 className="font-structural text-xs font-bold uppercase tracking-[0.2em] text-foreground/60">
          Log from Safari
        </h3>
        <p className="mt-3 font-serif text-[15px] leading-[1.6] text-foreground/75">
          The iPhone app adds Everything Counts to Safari&apos;s share
          sheet.
        </p>
        <a
          href={APP_STORE_URL}
          className="mt-4 inline-block bg-accent px-5 py-2.5 font-structural text-xs font-bold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-85"
        >
          Get the app
        </a>
      </section>
    );
  }

  return (
    <section className="mt-10 border-[3px] border-foreground bg-paper">
      <h3 className="border-b-[3px] border-foreground px-5 py-3 font-structural text-xs font-bold uppercase tracking-[0.2em] text-foreground">
        Log from Safari
      </h3>
      <div className="p-5 sm:p-6">
        <ShareRow />
        <ol className="mt-6 flex flex-col gap-4">
          <Step n={1}>
            Open the piece in Safari and tap Share. In iOS 26 it&apos;s in the
            ••• menu.
          </Step>
          <Step n={2}>
            Tap Everything Counts in the row of apps. If it isn&apos;t there,
            tap More at the end of the row.
          </Step>
          <Step n={3}>
            The log form opens with the title and picture filled in. Tap Save.
          </Step>
        </ol>
      </div>
    </section>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center bg-foreground font-structural text-xs font-black text-background">
        {n}
      </span>
      <span className="pt-0.5 font-serif text-[15px] leading-[1.55] text-foreground/80">
        {children}
      </span>
    </li>
  );
}

// A sketch of the share sheet's row of apps, with ours marked: what to look
// for, not a picture of any one phone.
function ShareRow() {
  return (
    <div
      aria-hidden
      className="flex items-start justify-center gap-4 rounded-[1.75rem] bg-[#ece7dc] px-4 pb-3 pt-4 sm:gap-6"
    >
      <Tile label="Messages">
        <span className="block size-full rounded-[22%] bg-foreground/15" />
      </Tile>
      <Tile label="Notes">
        <span className="block size-full rounded-[22%] bg-foreground/15" />
      </Tile>
      <Tile label="Everything Counts" marked>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/apple-icon.png"
          alt=""
          className="block size-full rounded-[22%] ring-[3px] ring-accent ring-offset-2 ring-offset-[#ece7dc]"
        />
      </Tile>
      <Tile label="More">
        <span className="flex size-full items-center justify-center gap-1 rounded-[22%] bg-white">
          <span className="size-1.5 rounded-full bg-foreground/50" />
          <span className="size-1.5 rounded-full bg-foreground/50" />
          <span className="size-1.5 rounded-full bg-foreground/50" />
        </span>
      </Tile>
    </div>
  );
}

function Tile({
  label,
  marked,
  children,
}: {
  label: string;
  marked?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className="flex w-14 flex-col items-center gap-1.5 sm:w-16">
      <span className="block size-12 sm:size-14">{children}</span>
      <span
        className={`text-center text-[0.6rem] leading-tight ${
          marked ? "font-bold text-foreground" : "text-foreground/55"
        }`}
      >
        {label}
      </span>
    </span>
  );
}
