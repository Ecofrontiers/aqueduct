import React from "react";
import { ProvenanceChip, type Provenance } from "./Chips";

const ROWS: Array<{ fn: string; component: string; chip: Provenance; note?: string }> = [
  { fn: "grade", component: "aggregated/imported attestations (cert layer)", chip: "TO-BUILD", note: "aggregated, not self-generated" },
  { fn: "origin record", component: "scout reads + content-addressed lot ID", chip: "LIVE" },
  { fn: "buyer match", component: "intent/solver network + demand card", chip: "SIM" },
  { fn: "live pricing", component: "two-register oracle line", chip: "LIVE" },
  { fn: "farm-to-sale tracking", component: "route graph + custody/storage nodes", chip: "LIVE" },
];

/** Beat B9 — five-functions mapping (DESIGN-BRIEF.md §7.0, acceptance criterion 8). */
export function FiveFunctionsTable(): React.ReactElement {
  return (
    <div className="aq-layer aq-card" style={{ padding: 12 }}>
      <p className="text-xs mb-3" style={{ color: "var(--aq-text)" }}>
        You asked for five middleman functions — here is where each lives in the layer, including the one we haven't built.
      </p>
      <div className="aq-mono" style={{ fontSize: "11px" }}>
        {ROWS.map((r) => (
          <div key={r.fn} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "6px 2px", borderTop: "1px solid var(--aq-border)" }}>
            <span style={{ color: "var(--aq-dim)", width: 150 }}>{r.fn}</span>
            <span style={{ color: "var(--aq-text)", flex: 1 }}>{r.component}</span>
            <ProvenanceChip provenance={r.chip} />
          </div>
        ))}
      </div>
      {ROWS.filter((r) => r.note).map((r) => (
        <p key={r.fn} className="text-[10px] mt-2" style={{ color: "var(--aq-dim)" }}>
          {r.fn}: {r.note}
        </p>
      ))}
    </div>
  );
}
