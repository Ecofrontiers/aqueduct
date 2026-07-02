import React from "react";
import { CHAPTERS, type ChapterKey } from "../state/tourStore";

/**
 * Chaptered side rail — checklist-launcher, not a stepper (DESIGN-BRIEF.md
 * §4.2). All 7 chapters visible upfront; judge can jump.
 */
export function TourRail({
  status,
  onSelect,
}: {
  status: Record<string, "done" | "active" | "upcoming">;
  onSelect: (key: ChapterKey) => void;
}): React.ReactElement {
  const doneCount = CHAPTERS.filter((c) => status[c.key] === "done").length;
  return (
    <div className="aq-layer aq-card" style={{ width: 168, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
      <div className="aq-mono" style={{ fontSize: "9px", color: "var(--aq-dim)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Aqueduct tour
      </div>
      <div style={{ height: 2, background: "var(--aq-border)", borderRadius: 2, marginBottom: 6 }}>
        <div style={{ height: 2, width: `${(doneCount / CHAPTERS.length) * 100}%`, background: "var(--aq-amber)", borderRadius: 2 }} />
      </div>
      {CHAPTERS.map((c, i) => {
        const st = status[c.key] ?? "upcoming";
        return (
          <button
            key={c.key}
            onClick={() => onSelect(c.key)}
            className="aq-mono text-left"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 6px",
              fontSize: "11px",
              borderRadius: 5,
              cursor: "pointer",
              background: st === "active" ? "rgba(255,183,0,0.08)" : "transparent",
              color: st === "done" ? "var(--aq-up)" : st === "active" ? "var(--aq-amber)" : "var(--aq-dim)",
              animation: st === "active" ? "aq-pulse 1.8s ease-in-out infinite" : undefined,
            }}
          >
            <span style={{ width: 14, textAlign: "center" }}>{st === "done" ? "✓" : i + 1}</span>
            <span>{c.label}</span>
          </button>
        );
      })}
      <style>{`@keyframes aq-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }`}</style>
    </div>
  );
}
