import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Header from "../../Header";
import Footer from "../../Footer";
import { StatusPill, type Status } from "../components/Chips";

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

  useEffect(() => {
    fetch("/data/aqueduct/ledger.json")
      .then((r) => r.json())
      .then(setLedger)
      .catch(() => setLedger(null));
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
              {liveEntries.length} live-read events this run · 0 sim actors wired yet (Gate 2) · 0 testnet
              settlements yet (Gate 2).
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
          <p className="text-sm" style={{ color: "var(--aq-dim)" }}>
            No SIM solvers, buyers, routers, or synthetic lots are wired yet — that is Gate 2 (the full swarm
            cascade: oracle → intent → solver race → buyer match → settle). This tab is intentionally thin right
            now, not broken.
          </p>
        )}

        {tab === "testnet" && (
          <p className="text-sm" style={{ color: "var(--aq-dim)" }}>
            No Base Sepolia settlement has been produced yet — that is Gate 2. This tab will list every TESTNET tx
            with an explorer link.
          </p>
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
