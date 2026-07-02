import React from "react";

interface BuyerRow {
  key: string;
  label: string;
  want: string;
  got: string;
  pass: boolean;
  partial?: boolean;
}

/** Buyer demand card — DESIGN-BRIEF.md §6.1: the ONE place matching is explained. */
export function BuyerDemandCard({
  handle,
  rows,
  matched,
}: {
  handle: string;
  rows: BuyerRow[];
  matched: boolean;
}): React.ReactElement {
  return (
    <div className="aq-layer aq-card-2 aq-mono" style={{ padding: "10px 12px", fontSize: "11px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ color: "var(--aq-amber)" }}>
          {handle} <span className="aq-chip">SIM</span>
        </span>
        <span style={{ color: "var(--aq-dim)" }}>standing demand</span>
      </div>
      {rows.map((r) => (
        <div key={r.key} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderTop: "1px solid var(--aq-border)" }}>
          <span style={{ color: "var(--aq-dim)" }}>{r.label}</span>
          <span style={{ color: r.partial ? "var(--aq-amber)" : r.pass ? "var(--aq-up)" : "var(--aq-down)" }}>
            {r.partial ? "▨" : r.pass ? "✓" : "✗"} {r.got}
          </span>
        </div>
      ))}
      <div className="aq-hairline" style={{ marginTop: 8, paddingTop: 6, textAlign: "right", color: matched ? "var(--aq-up)" : "var(--aq-down)" }}>
        {matched ? "FILLED" : "no match this pass"}
      </div>
    </div>
  );
}
