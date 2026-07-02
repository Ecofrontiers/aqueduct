import { useEffect, useState } from "react";
import { SIM_SOLVER_ROSTER } from "../sim/solverRoster.mjs";
import { getEconomy } from "../sim/economy.mjs";

export interface RealVsSimSummary {
  liveCount: number;
  simCount: number;
  testnetCount: number;
  simLots: number;
  loading: boolean;
}

/** Same counting logic as AqueductLedger.tsx's summary tab (SIM_SOLVER_ROSTER.length + 2
 *  sim actors, economy.meta.counts.lots for scale), factored out so the header notice and
 *  the full ledger page never quietly disagree on the numbers. */
export function useRealVsSimSummary(): RealVsSimSummary {
  const [liveCount, setLiveCount] = useState(0);
  const [testnetCount, setTestnetCount] = useState(0);
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
    ]).then(([ledger, settlePayload]) => {
      if (cancelled) return;
      setLiveCount(ledger?.entries?.length ?? 0);
      setTestnetCount(settlePayload ? 1 : 0);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const economy = getEconomy();

  return {
    liveCount,
    simCount: SIM_SOLVER_ROSTER.length + 2, // 5 solvers + 1 buyer + 1 finance-venue (AqueductLedger.tsx summary tab)
    testnetCount,
    simLots: economy.meta.counts.lots,
    loading,
  };
}
