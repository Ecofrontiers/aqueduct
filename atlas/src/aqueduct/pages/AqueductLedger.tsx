import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Header from "../../Header";
import Footer from "../../Footer";
import { StatusPill, ProvenanceChip, type Status } from "../components/Chips";
import { SIM_SOLVER_ROSTER } from "../sim/solverRoster.mjs";
import { REGISTRAR_NODE, TO_BUILD_PLATFORM_NODES, AGROFORESTRY_VENUES } from "../sim/venues.mjs";
import { getEconomy } from "../sim/economy.mjs";

interface LedgerEntry {
  ts: string;
  provenance: string;
  agent: string;
  platform: string;
  url: string;
  verb: string;
  detail: string;
  status: Status;
}
interface LedgerFile {
  generated_at: string;
  anchor_fallback_switch: { ts: string; note: string } | null;
  entries: LedgerEntry[];
}

type Tab = "summary" | "live" | "sim" | "testnet" | "raw";

/**
 * The real-vs-sim ledger — the diligent judge's page (DEMO-SPEC.md §6,
 * DESIGN-BRIEF.md §8). Gate 1: the "Live reads" tab is populated with the
 * EthicHub connector's actual run this session. Sim actors/lots and
 * Testnet tx tabs are Gate 2 (swarm cascade + settlement) — present but
 * honestly thin, per Blockscout's "empty tab explains why" convention.
 */
export default function AqueductLedger(): React.ReactElement {
  const [tab, setTab] = useState<Tab>("live");
  const [ledger, setLedger] = useState<LedgerFile | null>(null);
  const [settlePayload, setSettlePayload] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("/data/aqueduct/ledger.json")
      .then((r) => r.json())
      .then(setLedger)
      .catch(() => setLedger(null));
    fetch("/data/aqueduct/settle-payload.json")
      .then((r) => (r.ok ? r.json() : null))
      .then(setSettlePayload)
      .catch(() => setSettlePayload(null));
  }, []);

  const liveEntries = ledger?.entries ?? [];

  return (
    <>
      <Helmet>
        <title>Real-vs-sim ledger · Aqueduct</title>
      </Helmet>
      <Header />
      <div className="aq-layer main-container pt-[80px] px-6 pb-20 max-w-4xl mx-auto">
        <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--aq-text)" }}>
          Real-vs-sim ledger
        </h1>
        <p className="text-xs mb-5" style={{ color: "var(--aq-dim)" }}>
          Live reads + simulated economy — every element on the map/lot pages is labeled; this page is where you
          verify it. <Link to="/" className="underline">Back to the map</Link>
        </p>

        <div className="flex gap-1 mb-4 aq-hairline pb-2 flex-wrap">
          {(["summary", "live", "sim", "testnet", "raw"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="aq-chip"
              style={{
                cursor: "pointer",
                borderColor: tab === t ? "var(--aq-amber)" : undefined,
                color: tab === t ? "var(--aq-amber)" : undefined,
              }}
            >
              {t === "live" ? "Live reads" : t === "sim" ? "Sim actors & lots" : t === "testnet" ? "Testnet txs" : t}
            </button>
          ))}
        </div>

        {tab === "summary" && (
          <div className="text-sm space-y-2" style={{ color: "var(--aq-text)" }}>
            <p>
              Generated {ledger ? new Date(ledger.generated_at).toISOString() : "—"} by the EthicHub connector
              (<code className="aq-mono text-xs">scripts/scout-ethichub.mjs</code>).
            </p>
            <p style={{ color: "var(--aq-dim)" }}>
              {liveEntries.length} live-read events this run · {SIM_SOLVER_ROSTER.length + 2} sim actors wired
              (5 solvers + 1 buyer + 1 finance-venue) · {settlePayload ? "1" : "0"} testnet settle payload prepared
              ({settlePayload?.status === "awaiting_broadcast" ? "awaiting broadcast" : String(settlePayload?.status ?? "—")}).
            </p>
            {ledger?.anchor_fallback_switch && (
              <p style={{ color: "var(--aq-amber)" }}>⚠ {ledger.anchor_fallback_switch.note}</p>
            )}
          </div>
        )}

        {tab === "live" && (
          <div className="space-y-2">
            {liveEntries.length === 0 && <p style={{ color: "var(--aq-dim)" }}>— no events yet — run the scout script</p>}
            {liveEntries.map((e, i) => (
              <div key={i} className="aq-card-2 p-3 aq-mono text-xs">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <span>
                    <span style={{ color: "var(--aq-dim)" }}>{e.ts.slice(11, 19)}Z</span>{" · "}
                    <span className="aq-chip">{e.provenance}</span>{" "}
                    <span style={{ color: "var(--aq-amber)" }}>{e.agent}</span>{" "}
                    <span style={{ color: "var(--aq-text)" }}>{e.verb}</span> —{" "}
                    <span style={{ color: "var(--aq-dim)" }}>{e.detail}</span>
                  </span>
                  <StatusPill status={e.status} />
                </div>
                <a href={e.url} target="_blank" rel="noopener noreferrer" className="underline block mt-1" style={{ color: "var(--aq-dim)" }}>
                  source ↗
                </a>
              </div>
            ))}
          </div>
        )}

        {tab === "sim" && (
          <div className="space-y-3">
            <p className="text-xs" style={{ color: "var(--aq-dim)" }}>
              Every SIM agent below bids/fills through the shared, deterministic landed-cost function
              (routes/engine/services/commodity-landed-cost.mjs) with its own declared cost profile — never
              price±random. Calibration ranges are docs/research/04's solver-intent-economics table.
            </p>
            {(() => {
              const meta = getEconomy().meta;
              return (
                <div className="aq-card-2 p-3 text-xs">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold" style={{ color: "var(--aq-text)" }}>
                      Seeded synthetic economy
                    </span>
                    <ProvenanceChip provenance="SIM" />
                  </div>
                  <div className="aq-mono" style={{ color: "var(--aq-text)" }}>
                    {meta.counts.lots.toLocaleString()} lots · {meta.counts.intents.toLocaleString()} intents ·{" "}
                    {meta.counts.routes.toLocaleString()} routes · {meta.counts.flows} flow lanes ·{" "}
                    {meta.counts.solvers} solvers · {meta.counts.coops} coops
                  </div>
                  <div style={{ color: "var(--aq-dim)" }}>
                    seed {meta.seed} — {meta.generated_basis}. Coffee: {meta.calibration.coffee}. Cacao/honey:
                    coarse calibration, labeled. Solver market: {meta.calibration.solvers}.
                  </div>
                </div>
              );
            })()}
            {SIM_SOLVER_ROSTER.map((s) => (
              <div key={s.handle} className="aq-card-2 p-3 aq-mono text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span style={{ color: "var(--aq-amber)" }}>{s.handle}</span>
                  <ProvenanceChip provenance="SIM" />
                </div>
                <div style={{ color: "var(--aq-text)" }}>{s.role} — network-wide win rate ~{s.networkWinRatePct}%</div>
                <div style={{ color: "var(--aq-dim)" }}>{s.note}</div>
                {s.lastDocumentedFill && (
                  <div style={{ color: "var(--aq-down)" }}>
                    last documented fill: {s.lastDocumentedFill.marginPct}% margin — {s.lastDocumentedFill.note}
                  </div>
                )}
                <div style={{ color: "var(--aq-dim)" }}>ROMA mapping: Executor-with-tools (solver role)</div>
              </div>
            ))}
            <div className="aq-card-2 p-3 aq-mono text-xs">
              <div className="flex items-center justify-between gap-2">
                <span style={{ color: "var(--aq-amber)" }}>@solver-backstop</span>
                <ProvenanceChip provenance="LIVE" />
              </div>
              <div style={{ color: "var(--aq-text)" }}>open reference (backstop) — fills only when SIM solvers decline/fail to clear the buyer ceiling</div>
              <div style={{ color: "var(--aq-dim)" }}>bid computed live by routes/engine/services/commodity-landed-cost.mjs — code public, margin visible (2%)</div>
              <div style={{ color: "var(--aq-dim)" }}>ROMA mapping: Executor-with-tools; cold-start pattern per Across "Nessus" (research/04 §3)</div>
            </div>
            <div className="aq-card-2 p-3 aq-mono text-xs">
              <div className="flex items-center justify-between gap-2">
                <span style={{ color: "var(--aq-amber)" }}>@sim-buyer-eu</span>
                <ProvenanceChip provenance="SIM" />
              </div>
              <div style={{ color: "var(--aq-text)" }}>standing demand — Chiapas, SCA 84+, EUDR-readiness flagged (not required), landed ≤ 1.15x FOB</div>
              <div style={{ color: "var(--aq-dim)" }}>ROMA mapping: consumer-side Aggregator input</div>
            </div>
            {AGROFORESTRY_VENUES.map((v) => (
              <div key={v.handle} className="aq-card-2 p-3 aq-mono text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span style={{ color: "var(--aq-amber)" }}>{v.handle}</span>
                  <ProvenanceChip provenance="SIM" />
                </div>
                <div style={{ color: "var(--aq-text)" }}>{v.name} — {v.kind}</div>
                <div style={{ color: "var(--aq-dim)" }}>{v.note}; read adapter status: {v.status}</div>
              </div>
            ))}
            <div className="aq-card-2 p-3 aq-mono text-xs">
              <div className="flex items-center justify-between gap-2">
                <span style={{ color: "var(--aq-dim)" }}>{REGISTRAR_NODE.name}</span>
                <ProvenanceChip provenance="TO-BUILD" />
              </div>
              <div style={{ color: "var(--aq-dim)" }}>{REGISTRAR_NODE.note}</div>
            </div>

            <p className="text-xs mt-4 mb-1" style={{ color: "var(--aq-dim)" }}>
              Synthetic lots (map breadth, acceptance criterion 5 — enumerated here):
            </p>
            <div className="aq-card-2 p-3 aq-mono text-xs">
              <div style={{ color: "var(--aq-text)" }}>Fictional co-op lots rendered on the map for aggregation breadth are NOT built into this session's data file yet — the anchor + 2 designated Chiapas fallback lots (Gate 1, real EthicHub reads) are the only lots currently wired. No fictional lot is rendered.</div>
            </div>

            <p className="text-xs mt-4 mb-1" style={{ color: "var(--aq-dim)" }}>
              x402 agent payments (SIM — capability claimed with a receipt, not wired live, spec §5 Q35):
            </p>
            <div className="aq-card-2 p-3 aq-mono text-xs" style={{ color: "var(--aq-dim)" }}>
              @solver-backstop paid data fee via x402 — 1 call · $0.0040 USDC · SIM (real analog: $0.004 Apify scrape on the operator's agentic wallet, routes/research/apify-x402-agentic-data-rail.md)
            </div>

            <p className="text-xs mt-4 mb-1" style={{ color: "var(--aq-dim)" }}>
              Circular-cert-check caveat: the identity-resolution beat is labeled cross-surface (both surfaces are
              EthicHub's), never cross-platform, until a second connector (Algrano) lands.
            </p>

            <p className="text-xs mb-1" style={{ color: "var(--aq-dim)" }}>Never-live-integrated platform nodes (map breadth, TO-BUILD):</p>
            <div className="flex flex-wrap gap-2">
              {TO_BUILD_PLATFORM_NODES.map((p) => (
                <span key={p.name} className="aq-chip" title={p.note}>{p.name}</span>
              ))}
            </div>
          </div>
        )}

        {tab === "testnet" && (
          <div className="space-y-2">
            {settlePayload ? (
              <div className="aq-card-2 p-3 aq-mono text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span style={{ color: "var(--aq-text)" }}>sell-this-lot intent settle — {String(settlePayload.lot_id)}</span>
                  <ProvenanceChip provenance="TESTNET" />
                </div>
                <div style={{ color: "var(--aq-dim)" }}>registry: {String(settlePayload.registry_address)} (Base Sepolia, chainId {String(settlePayload.chain_id)})</div>
                <div style={{ color: "var(--aq-dim)" }}>registry live verified: {String(settlePayload.registry_live_verified)} · owner {String(settlePayload.registry_owner)}</div>
                <div style={{ color: settlePayload.tx_hash ? "var(--aq-up)" : "var(--aq-amber)" }}>
                  {settlePayload.tx_hash ? (
                    <a href={String(settlePayload.explorer_url)} target="_blank" rel="noopener noreferrer" className="underline">
                      settled — view tx ↗
                    </a>
                  ) : (
                    <>awaiting broadcast — expects env var {String(settlePayload.expected_env_var)} (not present in this repo, by design)</>
                  )}
                </div>
                <div style={{ color: "var(--aq-dim)" }}>{String(settlePayload.broadcast_note)}</div>
                <details>
                  <summary className="cursor-pointer" style={{ color: "var(--aq-dim)" }}>calldata</summary>
                  <pre className="text-[10px] overflow-x-auto mt-1">{String(settlePayload.calldata)}</pre>
                </details>
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--aq-dim)" }}>
                No settle payload found — run <code className="aq-mono">node scripts/prepare-settle-tx.mjs</code> from{" "}
                <code className="aq-mono">atlas/</code>.
              </p>
            )}
          </div>
        )}

        {tab === "raw" && (
          <pre className="text-[10px] overflow-x-auto aq-card-2 p-3 rounded" style={{ color: "var(--aq-dim)" }}>
            {JSON.stringify(ledger, null, 2)}
          </pre>
        )}
      </div>
      <Footer />
    </>
  );
}
