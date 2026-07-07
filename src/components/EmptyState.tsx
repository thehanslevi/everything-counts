import type { ReactNode } from "react";
import { Mark } from "@/components/Mark";

// Poster-styled empty state: the seal, a loud line, and a calm explainer.
// Used wherever a list can come up empty (record, feed, search) so those
// screens read as a designed moment instead of a stray sentence.
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mt-8 flex flex-col items-center gap-5 border-[3px] border-foreground bg-paper px-6 py-14 text-center">
      <Mark className="block size-20 shrink-0" />
      <p className="font-structural text-xl font-black uppercase tracking-[-0.01em] text-foreground">
        {title}
      </p>
      {children && (
        <div className="max-w-sm font-serif text-[15px] leading-[1.6] text-foreground/70">
          {children}
        </div>
      )}
    </div>
  );
}
