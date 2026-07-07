import { markSvg } from "@/lib/mark";

// The rising-sun page seal, inline. Transparent by default so it reads on the
// taxi-yellow field. Size it with className (e.g. "size-16"); the SVG fills it.
export function Mark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={className}
      dangerouslySetInnerHTML={{ __html: markSvg() }}
    />
  );
}
