import Link from "next/link";
import type { Log } from "@/lib/data/types";
import { entryFor, facetsOf } from "@/lib/record";
import { LogCard } from "@/components/LogCard";
import { PinButton } from "@/components/PinButton";
import { RecordBrowser } from "@/components/RecordBrowser";

// One person's record, newest first, with the controls for going back
// through it. Home and the profile page both show it. The cards are drawn
// here; RecordBrowser gets each one with the few facts it filters on.
// Expects at least one log: an empty record is the page's to word.
// `timeZone` is the reader's, for the dates on the cards and the year filter.
export function RecordList({
  logs,
  own,
  timeZone,
}: {
  logs: Log[];
  own: boolean;
  timeZone: string;
}) {
  return (
    <RecordBrowser
      // A different person's record starts with nothing chosen.
      key={logs[0]?.userId}
      own={own}
      facets={facetsOf(logs, timeZone)}
      entries={logs.map((log) => ({
        ...entryFor(log, timeZone),
        node: (
          <>
            <LogCard log={log} timeZone={timeZone} />
            {own && (
              <div className="mt-1 flex items-center justify-end gap-5">
                <PinButton logId={log.id} pinned={Boolean(log.pinnedAt)} />
                <Link
                  href={`/log/${log.id}/edit`}
                  className="font-structural text-[0.65rem] font-bold uppercase tracking-[0.14em] text-foreground/40 hover:text-accent"
                >
                  Edit
                </Link>
              </div>
            )}
          </>
        ),
      }))}
    />
  );
}
