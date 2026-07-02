import React, { useMemo, useState } from "react";
import { ProvenanceChip, StatusPill, type Provenance, type Status } from "./Chips";

export interface FeedEventLike {
  id: string;
  parentId: string | null;
  chapter: string;
  beat: string;
  prov: Provenance;
  agent: string;
  verb: string;
  object: string;
  detail: string;
  valueText: string;
  status: Status;
  expand?: {
    headline: string;
    sections?: Array<{ label: string; value: string }>;
    sourceUrl?: string;
    fetchedAt?: string;
  };
}

const AGENT_HUES: Record<string, string> = {
  scout: "#7dc4e4",
  diligence: "#c792ea",
  oracle: "#ffcb6b",
  solver: "#f78c6c",
  intent: "#82aaff",
  settle: "#26a69a",
  buyer: "#c3e88d",
  venue: "#c3e88d",
  vault: "#89ddff",
};

function agentHue(agent: string): string {
  const key = Object.keys(AGENT_HUES).find((k) => agent.includes(k));
  return key ? AGENT_HUES[key] : "#d1d4dc";
}

/** One feed line — DESIGN-BRIEF.md §1.1 grammar, click-to-expand §1.2. */
function FeedLine({ event, depth, elapsedLabel }: { event: FeedEventLike; depth: number; elapsedLabel: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginLeft: depth * 14 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="aq-mono text-left w-full"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0.4rem",
          padding: "3px 6px",
          fontSize: "11px",
          borderLeft: depth > 0 ? "1px dashed var(--aq-border)" : "none",
          background: "transparent",
          cursor: "pointer",
          width: "100%",
        }}
      >
        <span style={{ color: "var(--aq-dim)" }}>{elapsedLabel}</span>
        <ProvenanceChip provenance={event.prov} />
        <span style={{ color: agentHue(event.agent), minWidth: 128 }}>{event.agent}</span>
        <span style={{ color: "var(--aq-text)" }}>{event.verb}</span>
        <span style={{ color: "var(--aq-dim)" }}>{event.object}</span>
        {event.detail && (
          <>
            <span style={{ color: "var(--aq-dim)" }}>—</span>
            <span style={{ color: "var(--aq-dim)" }}>{event.detail}</span>
          </>
        )}
        {event.valueText && event.valueText !== "—" && <span style={{ color: "var(--aq-text)", marginLeft: "auto" }}>{event.valueText}</span>}
        <StatusPill status={event.status} />
      </button>
      {open && event.expand && (
        <div className="aq-card-2 aq-mono" style={{ margin: "2px 0 6px 14px", padding: "8px 10px", fontSize: "11px" }}>
          <p style={{ color: "var(--aq-text)", marginBottom: 6 }}>{event.expand.headline}</p>
          {event.expand.sections?.map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, borderTop: "1px solid var(--aq-border)", padding: "3px 0" }}>
              <span style={{ color: "var(--aq-dim)" }}>{s.label}</span>
              <span style={{ color: "var(--aq-text)", textAlign: "right" }}>{s.value}</span>
            </div>
          ))}
          {event.expand.sourceUrl && (
            <a href={event.expand.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline block mt-2" style={{ color: "var(--aq-amber)" }}>
              source ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function elapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `T+${mm}:${ss}`;
}

/**
 * The swarm feed — DESIGN-BRIEF.md §1 (the swarm view; map shows results,
 * spec A2). Sticky header count microcopy (§1.3), filter bar, parent-linked
 * cascade indentation.
 */
export function SwarmFeed({ events, totalCount }: { events: FeedEventLike[]; totalCount: number }): React.ReactElement {
  const [filterAgent, setFilterAgent] = useState<string | null>(null);

  const depthOf = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) {
      if (!e.parentId) {
        map.set(e.id, 0);
      } else {
        map.set(e.id, (map.get(e.parentId) ?? 0) + 1);
      }
    }
    return map;
  }, [events]);

  const agents = useMemo(() => Array.from(new Set(events.map((e) => e.agent))), [events]);
  const visible = filterAgent ? events.filter((e) => e.agent === filterAgent) : events;

  return (
    <div className="aq-layer" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div className="aq-hairline" style={{ padding: "6px 8px", fontSize: "10px", color: "var(--aq-dim)", display: "flex", justifyContent: "space-between" }}>
        <span>
          Latest {visible.length} of {totalCount} events {events.length < totalCount ? `· ${totalCount - events.length} queued` : ""}
        </span>
        {filterAgent && (
          <button onClick={() => setFilterAgent(null)} className="underline">
            clear filter
          </button>
        )}
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", padding: "4px 8px", borderBottom: "1px solid var(--aq-border)" }}>
        {agents.map((a) => (
          <button key={a} onClick={() => setFilterAgent(a)} className="aq-chip" style={{ fontSize: "9px", color: agentHue(a), borderColor: agentHue(a) }}>
            {a}
          </button>
        ))}
      </div>
      <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
        {visible.length === 0 && <div className="aq-mono text-xs p-3" style={{ color: "var(--aq-dim)" }}>— no events match · clear filters</div>}
        {visible.map((e, i) => (
          <FeedLine key={e.id} event={e} depth={depthOf.get(e.id) ?? 0} elapsedLabel={elapsed(i * 2500)} />
        ))}
      </div>
    </div>
  );
}
