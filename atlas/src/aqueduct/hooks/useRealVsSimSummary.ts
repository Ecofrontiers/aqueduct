import { useEffect, useState } from "react";
import { getEconomy } from "../sim/economy.mjs";
import { SIM_SOLVER_ROSTER } from "../sim/solverRoster.mjs";

/** /data/aqueduct/settle-payload.json's shape — the sell-this-lot intent prepared
 *  against the deployed IntentRegistry on Base Sepolia. Only the fields the dev-mode
 *  bar renders are typed strictly; the rest of the payload (chain, calldata, args) is
 *  real but unused here. */
export interface SettlePayload {
  lot_id: string;
  tx_hash: string | null;
  explorer_url: string | null;
  expected_env_var: string;
  [key: string]: unknown;
}

export interface RealVsSimSummary {
  liveCount: number;
  simCount: number;
  testnetCount: number;
  simLots: number;
  settlePayload: SettlePayload | null;
  loading: boolean;
}

/** Same counting logic the old ledger page's summary tab used (SIM_SOLVER_ROSTER.length + 2
 *  sim actors, economy.meta.counts.lots for scale) — kept here so the header notice never
 *  quietly disagrees with itself now that the ledger page is gone. Also the sole fetch of
 *  settle-payload.json for the header's expanded dev bar (RealVsSimNotice.tsx), which used
 *  to be rendered on /ledger (AqueductLedger.tsx:85-111). */
export function useRealVsSimSummary(): RealVsSimSummary {
  const [liveCount, setLiveCount] = useState(0);
  const [testnetCount, setTestnetCount] = useState(0);
  const [settlePayload, setSettlePayload] = useState<SettlePayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/data/aqueduct/ledger.json")
        .then((r) => r.json())
        .catch(() => null),
      fetch("/data/aqueduct/settle-payload.json")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]).then(([ledger, payload]) => {
      if (cancelled) return;
      setLiveCount(ledger?.entries?.length ?? 0);
      setTestnetCount(payload ? 1 : 0);
      setSettlePayload(payload ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const economy = getEconomy();

  return {
    liveCount,
    simCount: SIM_SOLVER_ROSTER.length + 2, // 5 solvers + 1 buyer + 1 finance-venue
    testnetCount,
    simLots: economy.meta.counts.lots,
    settlePayload,
    loading,
  };
}
