// commodity-landed-cost.mjs — the REAL Routes landed-cost engine, adapted for
// physical commodity export lots (Aqueduct DEMO-SPEC.md §3 item 4, §5).
//
// LINEAGE. Minimally adapted from routes/engine/services/route-costs.ts — this
// monorepo's pre-existing "route-cost oracle" pattern: deterministic
// arithmetic, itemized cost vectors, per-line confidence tags (confirmed /
// reported / estimate), never price±random, never delegated to an LLM
// (routes/CLAUDE.md rule 5). This file generalizes that pattern from its
// prior collectibles-marketplace venue policies to a physical commodity
// export route (origin dry mill -> licensed exporter -> port -> destination).
// No collectibles/marketplace/grading references — scrubbed per
// DEMO-SPEC.md §2 "Card lineage: omitted entirely."
//
// WHY THIS IS "REAL." This module performs an actual computation at call time
// from the caller's real inputs (the anchor lot's live/snapshot FOB price) —
// it is not a hardcoded label. DEMO-SPEC §3 item 4 requires the swarm's
// open reference/backstop solver's bid to be "computed by the REAL Routes
// landed-cost engine from routes/ at runtime," not merely narrated. Every
// SIM solver in the swarm ALSO calls this same deterministic function with
// its own declared cost profile (§ "solver profiles" below) — the ECONOMY
// (which solvers exist, whether they compete) is simulated per DEMO-SPEC §6,
// but the arithmetic is one real, shared, auditable function.
//
// Isomorphic: no Node-only APIs, runs in the browser bundle or a Node script.

/** @typedef {'confirmed'|'reported'|'estimate'} Confidence */

/**
 * @typedef {Object} CostProfile
 * @property {string} label - human label for this cost line's rate-setter (a solver or the reference engine)
 * @property {number} freightPct - freight & import handling, fraction of FOB value
 * @property {number} customsPct - customs/import admin, fraction of FOB value
 * @property {number} certPct - certification/QA admin, fraction of FOB value
 * @property {number} financingAprPct - annualized cost of capital-lock, fraction (e.g. 0.13 = 13% APR)
 * @property {number} tenorDays - days capital is locked between acquisition and buyer settlement
 * @property {number} marginBps - the solver's own disclosed margin, in basis points of FOB
 * @property {Confidence} confidence
 * @property {string} source
 */

/** The physical document chain a green-coffee export route travels (DEMO-SPEC §3.5:
 *  "documents ARE logistics"). Lead times are typical ranges for a Chiapas Soconusco
 *  micro-lot exporting to an EU port, grounded in docs/research/01 — rendered as
 *  ESTIMATE (no single lot's actual dated chain was observed for this build).
 */
export const DOCUMENT_CHAIN = [
  { step: "wet mill", node: "beneficio húmedo — Soconusco region", leadDays: 1, confidence: "estimate" },
  { step: "dry mill", node: "beneficio seco — Tapachula region", leadDays: 5, confidence: "estimate" },
  { step: "licensed exporter", node: "exportadora — Tapachula/Puerto Chiapas", leadDays: 3, confidence: "estimate" },
  { step: "phytosanitary certificate", node: "SENASICA export inspection", leadDays: 2, confidence: "estimate" },
  { step: "ICO Certificate of Origin", node: "ICO-member exporter registry", leadDays: 2, confidence: "estimate" },
  { step: "Bill of Lading / CAD", node: "carrier — Puerto Chiapas/Manzanillo -> Hamburg", leadDays: 32, confidence: "estimate" },
];

export const TOTAL_ROUTE_DAYS = DOCUMENT_CHAIN.reduce((sum, s) => sum + s.leadDays, 0);

/** The open reference (backstop) solver's declared cost profile. This is the
 *  ONLY profile whose resulting bid is presented as the swarm's real
 *  computation (DEMO-SPEC §3 item 4) — code public, margin visible, no toll
 *  beyond the disclosed reference margin. Values are ESTIMATE: sourced from
 *  docs/research/04 §"Sim-economy parameters" ranges (freight/insurance,
 *  10-15% APR financing, 1-5% winner margin), not a live freight-forwarder
 *  quote (day-one feasibility spike scope).
 * @type {CostProfile}
 */
export const REFERENCE_PROFILE = {
  label: "solver-backstop (open reference)",
  freightPct: 0.052,
  customsPct: 0.021,
  certPct: 0.0068,
  financingAprPct: 0.12,
  tenorDays: 38,
  marginBps: 200, // 2% — DESK_FILL_FEE_BPS analog (route-costs.ts), disclosed not hidden
  confidence: "estimate",
  source: "docs/research/04-solver-intent-economics.md §Sim-economy parameters",
};

/**
 * Deterministic itemized landed-cost computation. No RNG, no LLM call — the
 * SAME inputs always produce the SAME outputs (routes/CLAUDE.md rule 5).
 * @param {{ fobEurPerKg: number, weightKg: number, profile: CostProfile }} args
 */
export function computeLandedCost({ fobEurPerKg, weightKg, profile }) {
  if (!(fobEurPerKg > 0)) throw new Error("computeLandedCost: fobEurPerKg must be > 0");
  const freight = fobEurPerKg * profile.freightPct;
  const customs = fobEurPerKg * profile.customsPct;
  const cert = fobEurPerKg * profile.certPct;
  const financing = fobEurPerKg * profile.financingAprPct * (profile.tenorDays / 365);
  const preMarginLanded = fobEurPerKg + freight + customs + cert + financing;
  const margin = fobEurPerKg * (profile.marginBps / 10000);
  const landedEurPerKg = preMarginLanded + margin;

  const lines = [
    { label: "FOB (producer ask)", eurPerKg: fobEurPerKg, confidence: "reported", source: "EthicHub shop listing (live/snapshot read)" },
    { label: "Freight & import", eurPerKg: freight, confidence: profile.confidence, source: profile.source },
    { label: "Customs", eurPerKg: customs, confidence: profile.confidence, source: profile.source + " — EU green-coffee (HS 0901.11) duty is widely reported near 0%; this line covers import VAT deferral + customs admin, not tariff" },
    { label: "Certification", eurPerKg: cert, confidence: profile.confidence, source: profile.source },
    { label: `Financing (T+${profile.tenorDays})`, eurPerKg: financing, confidence: profile.confidence, source: `${profile.source} — ${(profile.financingAprPct * 100).toFixed(1)}% APR x ${profile.tenorDays}d capital lock` },
  ];
  if (profile.marginBps > 0) {
    lines.push({ label: `${profile.label} margin`, eurPerKg: margin, confidence: "reported", source: "disclosed solver margin, basis points of FOB" });
  }

  return {
    profileLabel: profile.label,
    fobEurPerKg,
    weightKg,
    lotTotalEur: Math.round(landedEurPerKg * weightKg * 100) / 100,
    landedEurPerKg: Math.round(landedEurPerKg * 10000) / 10000,
    marginPct: Math.round((margin / fobEurPerKg) * 10000) / 100,
    tenorDays: profile.tenorDays,
    lines: lines.map((l) => ({ ...l, eurPerKg: Math.round(l.eurPerKg * 10000) / 10000 })),
    documentChain: DOCUMENT_CHAIN,
    totalRouteDays: TOTAL_ROUTE_DAYS,
    incoterm: "FCA Hamburg",
  };
}

/**
 * Convenience: the reference/backstop solver's bid for a given lot. This is
 * the call site the swarm cascade invokes at runtime (DEMO-SPEC §3 item 4).
 */
export function computeReferenceBid({ fobEurPerKg, weightKg }) {
  return computeLandedCost({ fobEurPerKg, weightKg, profile: REFERENCE_PROFILE });
}
