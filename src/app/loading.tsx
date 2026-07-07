import { Mark } from "@/components/Mark";

// Instant navigation feedback. Next shows this the moment a link is tapped,
// while the target server component fetches — so a tap never lands on a frozen
// old screen. Poster-shaped so it reads as the page arriving, not a spinner.
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl animate-pulse px-5 py-12 sm:px-6 sm:py-16">
      {/* Masthead skeleton */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="h-9 w-52 bg-foreground/15 sm:h-14 sm:w-80" />
          <div className="h-9 w-36 bg-foreground/15 sm:h-14 sm:w-56" />
        </div>
        <Mark className="block size-16 shrink-0 sm:size-24" />
      </div>
      <div className="mt-6 h-8 w-full bg-foreground/15" />

      {/* Card skeletons */}
      <div className="mt-16 flex flex-col gap-10">
        {[0, 1].map((i) => (
          <div key={i} className="border-[3px] border-foreground/20 bg-paper">
            <div className="h-10 border-b-[3px] border-foreground/20 bg-foreground/10" />
            <div className="flex flex-col gap-3 p-6">
              <div className="h-7 w-4/5 bg-foreground/15" />
              <div className="h-7 w-3/5 bg-foreground/15" />
              <div className="mt-2 h-4 w-2/5 bg-foreground/10" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
