import { markSvg } from "@/lib/mark";

// A person's avatar. If they uploaded a photo, show it; otherwise render their
// deterministic generated seal (unique per handle). Square, brutalist frame to
// match the poster. Size with className (e.g. "size-12").
export function Avatar({
  profile,
  className,
}: {
  profile: { handle: string; name: string; avatarUrl: string | null };
  className?: string;
}) {
  const base = "shrink-0 border-2 border-foreground bg-paper";
  if (profile.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={profile.avatarUrl}
        alt={profile.name}
        loading="lazy"
        className={`${base} object-cover ${className ?? ""}`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`${base} block overflow-hidden ${className ?? ""}`}
      dangerouslySetInnerHTML={{
        __html: markSvg({ field: true, seed: profile.handle }),
      }}
    />
  );
}
