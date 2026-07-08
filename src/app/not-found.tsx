import Link from "next/link";
import { Mark } from "@/components/Mark";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center gap-6 px-5 py-16 text-center">
      <Mark className="block size-24" />
      <h1 className="font-structural text-4xl font-black uppercase leading-[0.95] tracking-[-0.02em] text-foreground sm:text-5xl">
        Page not found
      </h1>
      <p className="font-serif text-[15px] leading-[1.6] text-foreground/70">
        That page isn&apos;t here. It may have moved, or never existed.
      </p>
      <Link
        href="/"
        className="bg-accent px-6 py-2.5 font-structural text-xs font-bold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-85"
      >
        Back home
      </Link>
    </main>
  );
}
