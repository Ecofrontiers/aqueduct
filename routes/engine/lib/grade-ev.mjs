/**
 * grade-ev.mjs — PUBLIC REFERENCE grade-EV module for the routes_plan planner.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * REFERENCE IMPLEMENTATION ONLY.
 *
 * This is a small, generic, self-contained reference that implements the grade-EV
 * interface the planner depends on (`getGradeDistribution`, `expectedGrade`,
 * `computeGradingEV`, `buildPricesByGrade`). The numbers here are illustrative,
 * publicly-known approximations (advertised grading fees, a plausible
 * condition→grade prior, and a simple decay-curve FMV interpolation).
 *
 * In production, the tuned grade-EV is served by the SlabClaw oracle over the
 * HTTP seam (`SLABCLAW_API_URL`); a deployment should fetch the live distribution
 * and FMV-by-grade from the oracle and pass them into the planner rather than
 * relying on this static reference. This module exists so the public engine
 * builds, typechecks, and runs standalone — with no dependency on any private
 * pricing model.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Interface (consumed by services/routes-plan.ts):
 *   getGradeDistribution(condition) -> { "10": p, "9": p, ... } | null
 *   expectedGrade(condition)        -> number | null   (probability-weighted grade)
 *   computeGradingEV({...})         -> { ev, cost, netEv, recommendation, breakdown }
 *   buildPricesByGrade(psa10, psa9) -> { 10: usd, 9: usd, ..., 1: usd } | null
 */

// Advertised grading fees (USD) — public, approximate. Tier/grader as published.
const GRADING_COSTS = {
  PSA: { economy: 25, regular: 33, express: 80, super: 200 },
  BGS: { economy: 30, regular: 50, express: 100 },
  CGC: { economy: 20, regular: 35, express: 70 },
};

const SHIPPING_COST = 14; // round-trip insured shipping estimate, USD

// Reference condition→grade priors. Three canonical raw tiers, each a plausible
// (illustrative) probability distribution over resulting numeric grades.
const CONDITION_GRADE_PROB = {
  "MT/GEM": { 10: 0.25, 9: 0.45, 8: 0.22, 7: 0.08 },
  "NM/MT": { 10: 0.08, 9: 0.32, 8: 0.4, 7: 0.2 },
  "EX/LP": { 9: 0.05, 8: 0.25, 7: 0.4, 6: 0.2, 5: 0.1 },
};

const CONDITION_RANK = { "MT/GEM": 3, "NM/MT": 2, "EX/LP": 1 };

/**
 * Normalize a raw condition string to one of the three canonical tiers.
 * Returns null for conditions below EX/LP (out of scope for the reference).
 */
export function normalizeCondition(rawCondition) {
  if (!rawCondition) return null;
  const s = String(rawCondition).trim();
  const upper = s.toUpperCase().replace(/[^A-Z0-9/ -]/g, "");

  if (CONDITION_GRADE_PROB[upper]) return upper;

  if (/gem\s*mint/i.test(s)) return "MT/GEM";
  // Near Mint first (it contains "mint") so standalone "Mint" isn't swallowed.
  if (/near\s*mint/i.test(s) || /nm[\s/-]*m/i.test(s) || upper === "NM" || upper === "NM/MT") return "NM/MT";
  if (/\bmint\b/i.test(s) || upper === "MT" || upper === "M" || upper === "MT/GEM") return "MT/GEM";
  if (/excellent/i.test(s) || upper === "EX" || /light/i.test(s) || upper === "LP" || upper === "EX/LP") return "EX/LP";
  if (/very\s*good|moderate|heav|damage|poor/i.test(s)) return null;
  return null;
}

/**
 * Grade probability distribution for a condition.
 * @returns {Record<string, number>|null} e.g. { "10": 0.08, "9": 0.32, ... }
 */
export function getGradeDistribution(condition) {
  const key = normalizeCondition(condition);
  if (!key) return null;
  const dist = CONDITION_GRADE_PROB[key];
  if (!dist) return null;
  // Return string-keyed (the planner iterates Object.entries and parseInt's the key).
  const out = {};
  for (const [g, p] of Object.entries(dist)) out[String(g)] = p;
  return out;
}

/** Probability-weighted (expected) numeric grade for a condition. */
export function expectedGrade(condition) {
  const dist = getGradeDistribution(condition);
  if (!dist) return null;
  let sum = 0;
  let weight = 0;
  for (const [grade, prob] of Object.entries(dist)) {
    sum += parseInt(grade, 10) * prob;
    weight += prob;
  }
  if (weight === 0) return null;
  return Math.round((sum / weight) * 10) / 10;
}

/**
 * Tight distribution around a user-predicted grade.
 */
function predictedGradeDistribution(grade) {
  const g = Math.round(grade);
  const dist = {};
  dist[String(g)] = 0.65;
  if (g < 10) dist[String(g + 1)] = 0.15;
  if (g > 1) dist[String(g - 1)] = 0.15;
  if (g > 2) dist[String(g - 2)] = 0.05;
  if (g === 10) { dist["10"] = 0.8; dist["9"] = 0.15; dist["8"] = 0.05; }
  if (g === 1) { dist["1"] = 0.8; dist["2"] = 0.15; dist["3"] = 0.05; }
  return dist;
}

/**
 * Expected value of grading a raw card.
 * @param {object} opts
 * @param {string} opts.condition
 * @param {number|null} opts.predictedGrade
 * @param {Record<number, number>} opts.pricesByGrade  FMV per grade
 * @param {string} [opts.grader="PSA"]
 * @param {string} [opts.tier="economy"]
 * @returns {{ ev: number|null, cost: number, netEv: number|null, recommendation: string, breakdown: Array }}
 */
export function computeGradingEV(opts) {
  const { condition, predictedGrade, pricesByGrade, grader = "PSA", tier = "economy" } = opts;

  const gradingCost = GRADING_COSTS[grader]?.[tier] ?? 50;
  const totalCost = gradingCost + SHIPPING_COST;

  const dist = predictedGrade ? predictedGradeDistribution(predictedGrade) : getGradeDistribution(condition);

  if (!dist || !pricesByGrade) {
    return { ev: null, cost: totalCost, netEv: null, recommendation: "unknown", breakdown: [] };
  }

  let grossEv = 0;
  const breakdown = [];
  for (const [grade, prob] of Object.entries(dist)) {
    const fmv = pricesByGrade[parseInt(grade, 10)] || 0;
    grossEv += fmv * prob;
    breakdown.push({ grade: parseInt(grade, 10), probability: prob, fmv, contribution: fmv * prob });
  }

  const netEv = grossEv - totalCost;
  const recommendation = netEv > 50 ? "submit" : netEv > 0 ? "borderline" : "skip";

  return {
    ev: Math.round(grossEv * 100) / 100,
    cost: totalCost,
    netEv: Math.round(netEv * 100) / 100,
    recommendation,
    breakdown: breakdown.sort((a, b) => b.grade - a.grade),
  };
}

/**
 * Build an FMV-by-grade map from PSA 10/9 anchor prices.
 * Interpolates grades 8..1 with the 10/9 ratio as a decay curve.
 * @returns {Record<number, number>|null}
 */
export function buildPricesByGrade(psa10, psa9) {
  if (!psa10 && !psa9) return null;
  const prices = {};
  if (psa10) prices[10] = psa10;
  if (psa9) prices[9] = psa9;

  if (psa10 && psa9 && psa9 > 0) {
    const decay = psa9 / psa10;
    for (let g = 8; g >= 1; g--) {
      prices[g] = Math.round(psa9 * Math.pow(decay, 9 - g) * 100) / 100;
    }
  } else if (psa9) {
    for (let g = 8; g >= 1; g--) {
      prices[g] = Math.round(psa9 * Math.pow(0.5, 9 - g) * 100) / 100;
    }
  }
  return prices;
}

export { CONDITION_RANK };
