import type React from "react";
import { Link } from "react-router-dom";

/** The ask — final tour beat. Atlas light styling; the prose walks, nothing is sold. */
export function AskScreen({
  onReplay,
  lotsAggregated,
  settleTxHref,
}: {
  onReplay: () => void;
  lotsAggregated: number;
  settleTxHref: string | null;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-1.5">
        <StatCard
          title="What $50k funds"
          lines={["Registry API hardening", "Cropster ERP import adapter", "2nd + 3rd connector (Algrano, Agrotoken)"]}
        />
        <StatCard
          title="Milestones"
          lines={[
            "M1 · registry API public + first external query",
            "M2 · first non-anchor platform via ERP import",
            "M3 · first external self-host",
          ]}
        />
        <StatCard
          title="What compounds in the open"
          lines={[
            "Canonical lot schema",
            "Content-addressed lot ID",
            "Open registry — connectors + solver are reference implementations",
          ]}
        />
      </div>

      <div className="flex gap-4 flex-wrap">
        <Kpi value={String(lotsAggregated)} unit="lots aggregated" />
        <Kpi value="1" unit="platform read live" />
        <Kpi value="€6.63 floor" unit="vs €17.00 asking — the specialty premium made legible" />
        <Kpi value={settleTxHref ? "1" : "0"} unit="real settle tx" />
      </div>

      <p className="text-[11px] text-gray-400 leading-relaxed border-t border-gray-100 pt-2">
        The RCT record: matching without price-info-alone is the unlock — an intent/solver layer, not a price feed, is
        what moved outcomes when it existed (docs/research/02).
      </p>

      <div className="flex gap-2">
        <button
          onClick={onReplay}
          className="px-3 py-1.5 text-[11px] font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Replay the fill
        </button>
        <Link
          to="/"
          className="px-3 py-1.5 text-[11px] font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          Back to the map
        </Link>
      </div>
    </div>
  );
}

function StatCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="bg-gray-50 px-3 py-2">
      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">{title}</div>
      {lines.map((l, i) => (
        <div key={i} className="text-[11px] text-gray-700 mb-0.5">
          {l}
        </div>
      ))}
    </div>
  );
}

function Kpi({ value, unit }: { value: string; unit: string }) {
  return (
    <div className="min-w-0">
      <div className="text-base font-bold text-gray-900 aq-mono">{value}</div>
      <div className="text-[10px] text-gray-400">{unit}</div>
    </div>
  );
}
