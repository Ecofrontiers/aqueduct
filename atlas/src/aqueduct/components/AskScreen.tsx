import React from "react";
import { Link } from "react-router-dom";

/** Ask screen — beat B10, DESIGN-BRIEF.md §7.1. */
export function AskScreen({ onReplay, lotsAggregated, settleTxHref }: { onReplay: () => void; lotsAggregated: number; settleTxHref: string | null }): React.ReactElement {
  return (
    <div className="aq-layer aq-card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <StatCard title="What $50k funds" lines={["Registry API hardening", "Cropster ERP import adapter", "2nd + 3rd connector (Algrano, Agrotoken)"]} />
        <StatCard
          title="Milestones"
          lines={["M1 · registry API public + first external query", "M2 · first non-anchor platform via ERP import", "M3 · first external self-host"]}
        />
        <StatCard title="What compounds in the open" lines={["Canonical lot schema", "Content-addressed lot ID", "Open registry — connectors + solver are reference implementations"]} />
      </div>

      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
        <Kpi value={String(lotsAggregated)} unit="lots aggregated" />
        <Kpi value="1" unit="platform read live" />
        <Kpi value="€6.63→€17.00" unit="spread surfaced (fair FOB vs asking)" />
        <Kpi value={settleTxHref ? "1" : "0"} unit="real settle tx" />
      </div>

      <div className="aq-hairline" style={{ paddingTop: 10, fontSize: "11px", color: "var(--aq-dim)" }}>
        The RCT record: matching without price-info-alone is the unlock — an intent/solver layer, not a price feed, is what moved outcomes when it existed (docs/research/02).
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button onClick={onReplay} className="aq-chip" style={{ padding: "6px 12px", cursor: "pointer" }}>
          Replay the fill
        </button>
        <Link to="/ledger" className="aq-chip" style={{ padding: "6px 12px", textDecoration: "none" }}>
          Read the real-vs-sim ledger
        </Link>
      </div>
    </div>
  );
}

function StatCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="aq-card-2" style={{ padding: 10 }}>
      <div className="aq-mono" style={{ fontSize: "10px", color: "var(--aq-amber)", marginBottom: 6, textTransform: "uppercase" }}>
        {title}
      </div>
      {lines.map((l, i) => (
        <div key={i} className="text-[11px]" style={{ color: "var(--aq-text)", marginBottom: 3 }}>
          {l}
        </div>
      ))}
    </div>
  );
}

function Kpi({ value, unit }: { value: string; unit: string }) {
  return (
    <div>
      <div className="aq-mono" style={{ fontSize: "20px", color: "var(--aq-text)" }}>
        {value}
      </div>
      <div style={{ fontSize: "10px", color: "var(--aq-dim)" }}>{unit}</div>
    </div>
  );
}
