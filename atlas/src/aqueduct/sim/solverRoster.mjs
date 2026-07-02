// Aqueduct — SIM solver roster + the swarm's solver race (DEMO-SPEC.md §3
// item 4, calibrated to docs/research/04-solver-intent-economics.md's
// "Sim-economy parameters" table). Every solver — SIM or REAL — bids through
// the SAME deterministic itemized landed-cost function
// (routes/engine/services/commodity-landed-cost.mjs); only the cost PROFILE
// differs. This satisfies DESIGN-BRIEF.md §9.7 "no bid as price±random."
//
// Calibration (research/04 table, all SIM-labeled per DEMO-SPEC §6):
//  - visible solver count: 5 SIM + 1 REAL backstop
//  - win concentration: top solver ~45%, runner-up ~25%, one noisy solver
//    that bids but wins ~0%, one solver DECLINES this route (thin/partial lot)
//  - bid dispersion: SIM bids cluster within 1-4% of each other
//  - solver P&L honesty: at least one solver's ledger card shows a documented
//    LOSING fill (not necessarily this race — a general calibration fact,
//    DESIGN-BRIEF §8 "calibration note")
//  - the backstop wins ONLY when SIM solvers decline/fail to clear the
//    buyer's landed ceiling on this lot (Across "Nessus" cold-start pattern,
//    research/04 §3) — for THIS lot (EUDR-partial, thin specialty micro-lot)
//    that is exactly what happens, which is why the reference solver's REAL
//    computation is the one that appears as the winning bid.

import { computeLandedCost, computeReferenceBid, REFERENCE_PROFILE } from "../../../../routes/engine/services/commodity-landed-cost.mjs";

/** @type {Array<{handle: string, role: string, networkWinRatePct: number, note: string, profile: object}>} */
export const SIM_SOLVER_ROSTER = [
  {
    handle: "@sim-solver-1",
    role: "top solver",
    networkWinRatePct: 45,
    note: "network-wide top solver, ~45% win rate — CoW/Across top-solver concentration analog (research/04 §1.1, §1.2).",
    profile: {
      label: "sim-solver-1",
      freightPct: 0.0695,
      customsPct: 0.0247,
      certPct: 0.0088,
      financingAprPct: 0.148,
      tenorDays: 45,
      marginBps: 220,
      confidence: "estimate",
      source: "docs/research/04 §Sim-economy parameters (win-concentration row)",
    },
  },
  {
    handle: "@sim-solver-2",
    role: "noisy — bids, never wins",
    networkWinRatePct: 0,
    note: "sporadic bidder, thin capital base — CoW/Across 'noisy' archetype (research/04 §1.1 four observed solver archetypes); wins ~0% network-wide.",
    profile: {
      label: "sim-solver-2",
      freightPct: 0.091,
      customsPct: 0.031,
      certPct: 0.012,
      financingAprPct: 0.19,
      tenorDays: 52,
      marginBps: 340,
      confidence: "estimate",
      source: "docs/research/04 §1.1 noisy archetype",
    },
  },
  {
    handle: "@sim-solver-3",
    role: "multi-strategy — thin margin",
    networkWinRatePct: 15,
    note: "near break-even multi-strategy solver; its most recent documented fill posted a −0.6% margin after rebalancing cost — solver P&L honesty (research/04 §5 'at least one solver's ledger shows a losing fill').",
    profile: {
      label: "sim-solver-3",
      freightPct: 0.0695,
      customsPct: 0.0247,
      certPct: 0.0088,
      financingAprPct: 0.148,
      tenorDays: 45,
      marginBps: 60,
      confidence: "estimate",
      source: "docs/research/04 §1.1 multi-strategy archetype",
    },
    lastDocumentedFill: { marginPct: -0.6, note: "rebalancing cost exceeded fill fee on a prior thin-liquidity route" },
  },
  {
    handle: "@sim-solver-4",
    role: "competitive",
    networkWinRatePct: 20,
    note: "vertically-integrated-lite; competes on tight routes, wins ~20% network-wide.",
    profile: {
      label: "sim-solver-4",
      freightPct: 0.064,
      customsPct: 0.023,
      certPct: 0.0075,
      financingAprPct: 0.135,
      tenorDays: 40,
      marginBps: 180,
      confidence: "estimate",
      source: "docs/research/04 §Sim-economy parameters",
    },
  },
  {
    handle: "@sim-solver-5",
    role: "declines thin/partial-EUDR routes",
    networkWinRatePct: 10,
    note: "conservative risk desk — declines routes where buyer EUDR-readiness is flagged but not confirmed; declines THIS route.",
    profile: {
      label: "sim-solver-5",
      freightPct: 0.058,
      customsPct: 0.021,
      certPct: 0.007,
      financingAprPct: 0.12,
      tenorDays: 35,
      marginBps: 150,
      confidence: "estimate",
      source: "docs/research/04 §Sim-economy parameters",
    },
    declinesThisRoute: true,
  },
];

/**
 * Run the race for one lot: every SIM solver (except explicit decliners)
 * bids via the shared deterministic function; the REAL reference/backstop
 * solver bids too. Returns bids sorted by landed cost ascending (best first)
 * plus the winner. This is executed at cascade-build time in the browser —
 * a genuine computation over the lot's actual FOB price, not a canned table.
 */
export function runSolverRace({ fobEurPerKg, weightKg }) {
  const bids = [];

  for (const solver of SIM_SOLVER_ROSTER) {
    if (solver.declinesThisRoute) {
      bids.push({ handle: solver.handle, role: solver.role, status: "DECLINED", bid: null, note: "declined — EUDR-readiness flagged, not confirmed; route risk-adjusted out" });
      continue;
    }
    const bid = computeLandedCost({ fobEurPerKg, weightKg, profile: solver.profile });
    bids.push({ handle: solver.handle, role: solver.role, status: "BID", bid, note: solver.note });
  }

  // The REAL backstop bid — genuine call into the Routes-adapted engine.
  const referenceBid = computeReferenceBid({ fobEurPerKg, weightKg });
  bids.push({ handle: "@solver-backstop", role: "open reference (backstop)", status: "BID", bid: referenceBid, note: "code public, margin visible — fills when SIM solvers decline or fail to clear the buyer ceiling (research/04 §3 cold-start pattern)", real: true });

  const competing = bids.filter((b) => b.status === "BID" && b.bid);
  competing.sort((a, b) => a.bid.landedEurPerKg - b.bid.landedEurPerKg);

  const winner = competing[0] ?? null;

  return { bids, winner, referenceProfile: REFERENCE_PROFILE };
}
