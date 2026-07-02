import React, { useEffect, useState } from "react";
import { useAqueductLots } from "../hooks/useAqueductLots";
import {
  useTourStore,
  selectActiveChapter,
  selectChapterStatus,
  setAnchorLot,
  dismissWelcome,
  playTour,
  replayTour,
  jumpToChapter,
  type ChapterKey,
} from "../state/tourStore";
import { TourRail } from "./TourRail";
import { SwarmFeed } from "./SwarmFeed";
import { BuyerDemandCard } from "./BuyerDemandCard";
import { FiveFunctionsTable } from "./FiveFunctionsTable";
import { AskScreen } from "./AskScreen";

const CAPTIONS: Record<ChapterKey, string> = {
  aggregate: "Watch scouts read EthicHub's public shop live and pin real lots to the map — the aggregation layer, in motion.",
  verify: "Two EthicHub surfaces resolve into one lot by producer and community, not a shared id — then a diligence agent checks the EUDR chain and shows the real gaps.",
  price: "An oracle prices the lot against a live ICE Coffee C quote plus a named, sourced origin differential — never a bare commodity number.",
  publish: "A sell-this-lot intent publishes; a second intent finances next season's planting at an agroforestry venue — the layer spans the whole production lifecycle.",
  fill: "Five simulated solvers and one open, real reference solver race with itemized landed-cost bids — the reference solver's live-computed bid wins this one.",
  settle: "The fill settles onchain to the cooperative/exporter node, never straight to a farmer's phone — with a labeled downstream pass-through step.",
  ask: "You asked for five middleman functions traditional platforms provide — here is where each lives in the layer, including the one we haven't built.",
};

/**
 * The swarm tour — additive overlay mounted alongside the untouched Atlas
 * map (DEMO-SPEC.md §2 "Visual identity"; DESIGN-BRIEF.md §4 tour chrome).
 * Positioned fixed so it is independent of Explore.tsx's existing grid.
 */
interface SettlePayload {
  status: string;
  registry_address: string;
  registry_live_verified: boolean;
  expected_env_var: string;
  broadcast_note: string;
  tx_hash: string | null;
  explorer_url: string | null;
}

export function AqueductTourOverlay(): React.ReactElement | null {
  const { anchor, loading } = useAqueductLots({ liveRefetch: false });
  const s = useTourStore();
  const [settlePayload, setSettlePayload] = useState<SettlePayload | null>(null);

  useEffect(() => {
    if (anchor) setAnchorLot(anchor);
  }, [anchor]);

  useEffect(() => {
    fetch("/data/aqueduct/settle-payload.json")
      .then((r) => (r.ok ? r.json() : null))
      .then(setSettlePayload)
      .catch(() => setSettlePayload(null));
  }, []);

  if (loading || !anchor) return null;

  const activeChapter = selectActiveChapter(s);
  const chapterStatus = selectChapterStatus(s);
  const events = s.cascade?.events ?? [];
  const revealed = events.slice(0, s.revealCount);
  const totalCount = events.length;

  const settleActive = activeChapter === "settle";
  const winningBid = s.cascade?.winner?.bid;
  const buyerMatch = s.cascade?.buyerMatch;

  return (
    <div className="aq-layer" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 2000 }}>
      {/* Honesty banner — DESIGN-BRIEF §4.9. Offset below the untouched
          Atlas header bar (~40px) rather than covering/being covered by it —
          Atlas base itself is never edited to make room. */}
      <div
        className="aq-mono"
        style={{
          pointerEvents: "auto",
          position: "absolute",
          top: 44,
          left: 0,
          right: 0,
          fontSize: "10px",
          color: "var(--aq-dim)",
          background: "rgba(19,23,34,0.92)",
          borderBottom: "1px solid var(--aq-border)",
          padding: "4px 12px",
          textAlign: "center",
        }}
      >
        Live reads + simulated economy —{" "}
        <a href="/ledger" style={{ color: "var(--aq-amber)", textDecoration: "underline" }}>
          see the ledger
        </a>
        {s.cascadeError && <span style={{ color: "var(--aq-down)", marginLeft: 8 }}>cascade error: {s.cascadeError}</span>}
      </div>

      {/* Welcome modal */}
      {!s.welcomeDismissed && (
        <div style={{ pointerEvents: "auto", position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="aq-card" style={{ maxWidth: 420, padding: 20 }}>
            <h2 style={{ color: "var(--aq-text)", fontSize: 16, marginBottom: 8 }}>Aqueduct</h2>
            <p style={{ color: "var(--aq-text)", fontSize: 13, lineHeight: 1.5, marginBottom: 6 }}>
              An open financial + logistics layer for smallholder commodities. You'll watch scouts read a real coffee lot, a diligence
              agent check it, an oracle price it, and solvers race to fill it — live onchain.
            </p>
            <p style={{ color: "var(--aq-dim)", fontSize: 12, marginBottom: 14 }}>Live reads + simulated economy — see the ledger.</p>
            <button
              onClick={() => {
                dismissWelcome();
              }}
              className="aq-chip"
              style={{ padding: "8px 16px", cursor: "pointer", background: "var(--aq-panel-2)" }}
            >
              Start the tour
            </button>
          </div>
        </div>
      )}

      {/* Rail */}
      {s.welcomeDismissed && (
        <div style={{ pointerEvents: "auto", position: "absolute", top: 84, left: 12 }}>
          <TourRail status={chapterStatus} onSelect={(key) => jumpToChapter(key)} />
        </div>
      )}

      {/* Docked panel: caption + feed (or five-functions / ask) */}
      {s.welcomeDismissed && (
        <div
          style={{
            pointerEvents: "auto",
            position: "absolute",
            top: 84,
            right: 12,
            bottom: 12,
            width: 380,
            maxWidth: "calc(100vw - 24px)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div className="aq-card" style={{ padding: 10 }}>
            <p style={{ color: "var(--aq-text)", fontSize: 12, lineHeight: 1.4, marginBottom: 8 }}>{CAPTIONS[activeChapter]}</p>
            {!s.started && (
              <button onClick={() => playTour()} className="aq-chip" style={{ padding: "5px 12px", cursor: "pointer" }}>
                Start the cascade
              </button>
            )}
            {s.started && (
              <button onClick={() => replayTour()} className="aq-chip" style={{ padding: "5px 12px", cursor: "pointer" }}>
                Replay
              </button>
            )}
          </div>

          {activeChapter === "fill" && buyerMatch && (
            <BuyerDemandCard handle={buyerMatch.buyer.handle} rows={buyerMatch.rows} matched={buyerMatch.matched} />
          )}

          {activeChapter === "settle" && settlePayload && (
            <div className="aq-card-2 aq-mono" style={{ padding: 10, fontSize: 11 }}>
              <div style={{ color: "var(--aq-dim)", marginBottom: 4 }}>Base Sepolia settle — {settlePayload.registry_live_verified ? "registry verified live" : "registry unverified"}</div>
              {settlePayload.tx_hash && settlePayload.explorer_url ? (
                <a href={settlePayload.explorer_url} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--aq-up)" }}>
                  view settlement tx ↗
                </a>
              ) : (
                <div style={{ color: "var(--aq-amber)" }}>
                  awaiting broadcast — {settlePayload.expected_env_var} not present in this repo (by design)
                </div>
              )}
            </div>
          )}

          {activeChapter === "ask" ? (
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              <FiveFunctionsTable />
              <AskScreen onReplay={() => replayTour()} lotsAggregated={3} settleTxHref={settlePayload?.explorer_url ?? null} />
            </div>
          ) : (
            <div className="aq-card" style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
              <SwarmFeed events={revealed} totalCount={totalCount} />
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div
        className="aq-mono"
        style={{
          pointerEvents: "auto",
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          fontSize: "10px",
          color: "var(--aq-dim)",
          background: "rgba(19,23,34,0.92)",
          borderTop: "1px solid var(--aq-border)",
          padding: "4px 12px",
          textAlign: "center",
        }}
      >
        <a href="/ledger" style={{ color: "var(--aq-dim)" }}>
          Real-vs-sim ledger
        </a>{" "}
        · Aqueduct extends the open Regen Atlas ·{" "}
        <a href="https://github.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--aq-dim)" }}>
          repo
        </a>
      </div>
    </div>
  );
}
