import React, { useState } from "react";
import { Pulse, CaretDown, CaretUp } from "@phosphor-icons/react";
import type { AqueductEvent } from "../hooks/useAqueductEconomy";
import { ProvenanceChip } from "./Chips";

function fmtTime(ts: number) {
  return new Date(ts).toISOString().slice(11, 16) + "Z";
}

/**
 * The live-marketplace pulse — a compact activity column docked in the map
 * view (feed register 3 of the FABLE-KICKOFF supersession §5). Real reads
 * carry LIVE/SNAPSHOT chips; the seeded economy's events carry SIM. The
 * full firehose stays on /ledger.
 */
export function ActivityPanel({ events }: { events: AqueductEvent[] }): React.ReactElement {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute top-12 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-cardBackground border border-gray-200 text-[11px] font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
      >
        <Pulse size={13} className="text-blue-600" />
        Activity
        <CaretDown size={11} className="text-gray-400" />
      </button>
    );
  }

  return (
    <div className="absolute top-12 right-4 z-10 w-[300px] max-h-[45%] flex flex-col bg-cardBackground border border-gray-200 shadow-md overflow-hidden">
      <button
        onClick={() => setOpen(false)}
        className="flex items-center justify-between px-3 h-8 border-b border-gray-100 shrink-0 hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-800">
          <Pulse size={13} className="text-blue-600" />
          Activity ({events.length})
        </span>
        <CaretUp size={11} className="text-gray-400" />
      </button>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {events.slice(0, 40).map((e, i) => (
          <div key={i} className="px-3 py-2 border-b border-gray-50">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-gray-400 aq-mono">{fmtTime(e.ts)}</span>
              <ProvenanceChip provenance={e.provenance} />
              <span className="text-[10px] font-semibold text-gray-700 aq-mono">{e.actor}</span>
            </div>
            <div className="text-[11px] text-gray-600 mt-0.5 leading-snug">{e.summary}</div>
          </div>
        ))}
        <div className="px-3 py-2 text-[10px] text-gray-400">
          Full stream on the <a href="/ledger" className="underline hover:text-gray-600">ledger</a>.
        </div>
      </div>
    </div>
  );
}
