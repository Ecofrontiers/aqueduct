import type React from "react";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import Footer from "../../Footer";
import Header from "../../Header";
import { ProvenanceChip, type Status } from "../components/Chips";
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

interface FeedRow {
  ts: number;
  provenance: string;
  agent: string;
  summary: string;
  url?: string;
}

/**
 * The ledger — a single chronological activity feed, real reads and the seeded
 * economy's events interleaved, newest first. Every row is labeled
 * (LIVE/SIM/SNAPSHOT/TESTNET) — this page is where a visitor verifies that
 * label rather than taking the map's word for it. No tabs, no raw-JSON dump:
 * the feed itself is the honesty check.
 */
export default function AqueductLedger(): React.ReactElement {
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

  const economy = getEconomy();

  const feed: FeedRow[] = [
    ...(ledger?.entries ?? []).map((e) => ({
      ts: Date.parse(e.ts),
      provenance: e.provenance,
      agent: e.agent,
      summary: `${e.verb} ${e.detail}`,
      url: e.url,
    })),
    ...(economy.events as Array<{ ts: number; actor: string; verb: string; summary: string; provenance: string }>).map(
      (e) => ({ ts: e.ts, provenance: e.provenance, agent: e.actor, summary: e.summary }),
    ),
  ].sort((a, b) => b.ts - a.ts);

  return (
    <>
      <Helmet>
        <title>Ledger · Aqueduct</title>
      </Helmet>
      <Header />
      <div className="aq-layer main-container pt-[80px] px-6 pb-20 max-w-3xl mx-auto">
        <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--aq-text)" }}>
          Ledger
        </h1>
        <p className="text-xs mb-5" style={{ color: "var(--aq-dim)" }}>
          Every real read and every seeded-economy event, one feed, newest first. Each row carries its own label — that
          label is the thing to verify, not this page's word for it.
        </p>

        {settlePayload && (
          <div className="aq-card-2 p-3 aq-mono text-xs space-y-1 mb-4">
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--aq-text)" }}>
                sell-this-lot intent settle — {String(settlePayload.lot_id)}
              </span>
              <ProvenanceChip provenance="TESTNET" />
            </div>
            <div style={{ color: settlePayload.tx_hash ? "var(--aq-up)" : "var(--aq-amber)" }}>
              {settlePayload.tx_hash ? (
                <a
                  href={String(settlePayload.explorer_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  settled — view tx ↗
                </a>
              ) : (
                <>
                  awaiting broadcast — expects env var {String(settlePayload.expected_env_var)} (not present in this
                  repo, by design)
                </>
              )}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          {feed.map((row, i) => (
            <div key={i} className="aq-card-2 px-3 py-2 aq-mono text-xs">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <span>
                  <span style={{ color: "var(--aq-dim)" }}>{new Date(row.ts).toISOString().slice(11, 19)}Z</span>
                  {" · "}
                  <ProvenanceChip provenance={row.provenance as "LIVE" | "SNAPSHOT" | "SIM" | "TESTNET" | "TO-BUILD"} />{" "}
                  <span style={{ color: "var(--aq-amber)" }}>{row.agent}</span>{" "}
                  <span style={{ color: "var(--aq-text)" }}>{row.summary}</span>
                </span>
              </div>
              {row.url && (
                <a
                  href={row.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline block mt-1"
                  style={{ color: "var(--aq-dim)" }}
                >
                  source ↗
                </a>
              )}
            </div>
          ))}
          {feed.length === 0 && (
            <p className="text-sm" style={{ color: "var(--aq-dim)" }}>
              — no events yet — run the scout script
            </p>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
