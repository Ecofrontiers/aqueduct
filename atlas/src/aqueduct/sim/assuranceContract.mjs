// Aqueduct — assurance (threshold-pledge) contracts: wrap a REAL finance intent's total
// in a dominant-assurance crowd-in. This is the one new finance primitive the /financing
// rebuild adds, and it is the most-defensible card in the ladder: nobody pays unless the
// full threshold assembles, so an early pledger carries no lone-backer risk. Tabarrok's
// dominant-assurance variant adds a sponsor-funded refund bonus, making early pledging a
// dominant strategy (paid ONLY in the refunded branch).
//
// Provenance discipline (FABLE-KICKOFF.md honesty contract):
//  - thresholdEur is REAL — it IS the finance intent's totalEur (the €1,120 worked example,
//    1,200 seedlings × €0.933, buildFinanceIntent).
//  - settlementTerms are REAL — carried straight from financeIntent.claim (EthicHub 9.9% APR
//    / 12mo facility, confidence "reported", cited to the 192,600→212,369.79 USDC cycle).
//  - The pledge fill is SIM — seeded, deterministic, drawn from the SAME policy-gated actor
//    list runCapitalFormationsMatch produces (no second roster; every pledger still cites its
//    reason). The fill lands deterministically BELOW threshold so the crowd-in reads as
//    visibly in motion ("assembling"), not as a hardcoded full bar.
//
// Deterministic, seed-disciplined: no Date.now / Math.random. Same PRNG family as
// tradeFinance.mjs:67-81 (a separate stream seeded from the intent id — economy output is
// untouched).

import { runCapitalFormationsMatch } from "./capitalFormations.mjs";

// mulberry32(hashStr()) — copied verbatim from tradeFinance.mjs:67-81 (separate stream).
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

/**
 * Wrap a finance intent's REAL total in a threshold-pledge (assurance) contract.
 *
 * @param {object} financeIntent  buildFinanceIntent(lot) — carries .id, .totalEur (REAL, €1,120),
 *   and .claim {aprPct, termMonths, confidence:"reported", source} (the EthicHub facility that
 *   activates once the pledge tips).
 * @param {object[]} lots  the lot population the pledgers are policy-gated against (same mixed
 *   real+SIM population the /financing page matches capital over).
 * @param {{refundBonusPct?: number}} [opts]  dominant-assurance sponsor bonus (default 0.05).
 * @returns {{
 *   thresholdEur: number,
 *   pledgedEur: number,
 *   progressPct: number,
 *   status: "assembling"|"tipped"|"refunded",
 *   contributorCount: number,
 *   pledges: Array<{handle:string, name:string, kind:string, amountEur:number,
 *                   citedStandardNames:string[], citedFailureModes:string[]}>,
 *   settlementTerms: {aprPct:number, termMonths:number, confidence:string, source:string},
 *   dominant: {refundBonusPct:number, bonusPerPledgeEur: Array<{handle:string, bonusEur:number}>},
 *   provenance: "SIM",
 * }}
 */
export function buildAssuranceContract(financeIntent, lots, opts = {}) {
  const refundBonusPct = opts.refundBonusPct ?? 0.05;

  // REAL — the threshold IS the finance intent's total (buildFinanceIntent: 1200 × 0.933 → 1120).
  const thresholdEur = financeIntent.totalEur;
  // REAL — the facility terms that activate on tip, carried straight from the intent's claim.
  const claim = financeIntent.claim ?? {};
  const settlementTerms = {
    aprPct: claim.aprPct,
    termMonths: claim.termMonths,
    confidence: claim.confidence,
    source: claim.source,
  };

  // Pledgers = the SAME policy-gated actors capitalFormations already matched against these
  // lots. No second roster: an actor that can't match a lot can't pledge to fund it either.
  const eligible = runCapitalFormationsMatch(lots).actors.filter((a) => a.matchedLotCount > 0);

  // A caller that passes an explicitly failed / empty roster gets the refunded branch — the
  // pledge never assembled, so (in the dominant variant) sponsor bonuses would be paid out.
  if (eligible.length === 0) {
    return {
      thresholdEur,
      pledgedEur: 0,
      progressPct: 0,
      status: "refunded",
      contributorCount: 0,
      pledges: [],
      settlementTerms,
      dominant: { refundBonusPct, bonusPerPledgeEur: [] },
      provenance: "SIM",
    };
  }

  // Seeded target ratio in [0.65, 0.80] — derived from a seeded CONSTANT (no RNG stream draw),
  // so the fill lands deterministically at a compelling, non-full ~65-80% of threshold. This is
  // what makes "assembling" honest: the bar is visibly in motion, it has not tipped.
  const seedHash = hashStr(financeIntent.id);
  const targetRatio = 0.65 + (seedHash % 16) / 100; // 0.65 … 0.80, deterministic
  const targetPledgedEur = Math.round(thresholdEur * targetRatio);

  // Distribute the target across pledgers by a seeded weight each (this is the only RNG use —
  // it shapes the crowd, not the total). The total is then reconciled exactly onto the first
  // pledge so Σ amounts === targetPledgedEur deterministically.
  const rnd = mulberry32(seedHash);
  const weights = eligible.map(() => 0.5 + rnd()); // strictly positive
  const sumW = weights.reduce((s, w) => s + w, 0);

  const pledges = eligible.map((a, i) => ({
    handle: a.handle,
    name: a.name,
    kind: a.kind,
    amountEur: Math.round((targetPledgedEur * weights[i]) / sumW),
    citedStandardNames: a.citedStandardNames,
    citedFailureModes: a.citedFailureModes,
  }));

  // Reconcile rounding drift onto the first pledge so the fill is exact (never > threshold in
  // the demo path, since targetRatio < 1).
  const rawSum = pledges.reduce((s, p) => s + p.amountEur, 0);
  pledges[0].amountEur += targetPledgedEur - rawSum;

  const pledgedEur = pledges.reduce((s, p) => s + p.amountEur, 0);
  const status = pledgedEur >= thresholdEur ? "tipped" : "assembling";

  return {
    thresholdEur,
    pledgedEur,
    progressPct: Math.round((pledgedEur / thresholdEur) * 1000) / 10,
    status,
    contributorCount: pledges.length,
    pledges,
    settlementTerms,
    // Tabarrok refund-plus-bonus — sponsor-funded, paid ONLY if the round refunds. Computed
    // per pledge so an early backer sees exactly what makes pledging dominant.
    dominant: {
      refundBonusPct,
      bonusPerPledgeEur: pledges.map((p) => ({
        handle: p.handle,
        bonusEur: Math.round(p.amountEur * refundBonusPct),
      })),
    },
    provenance: "SIM",
  };
}
