// Aqueduct — finance intents: "finance the system -> sell its harvest," applied to two
// verticals (DEMO-SPEC.md §5 "Intent types (two)", §3 item 5 tour beat B6; scope revision
// 2026-07-03 promoting Glow solar to a full second vertical, doc 11's structural mapping).
//
//  - finance-this-planting: production financing routed to an agroforestry venue node
//    (Silvi), SIM fill.
//  - finance-this-farm: Glow solar delegation/Miner-fraction financing on a real audited
//    farm, SIM fill (V2 write path is app-mediated — Glow hasn't published onchain
//    delegation/Miner-purchase addresses yet, so the FILL side stays SIM even though the
//    farm READ and the Miner-terms READ are both real; see GLOW_FARM_SNAPSHOT below).
//
// REA/Valueflows note (Architecture G): a finance-* intent is a Commitment that resolves
// into a Claim — capital moves now, in exchange for a promise of future repayment
// (Valueflows action vocabulary: this is a `raise` commitment settling a debt-instrument
// Claim, not a `transfer`/reciprocal-exchange pair). `sell-this-lot`, by contrast, is a
// spot reciprocal EconomicEvent (give goods <-> take payment) with no future obligation —
// it never produces a Claim. docs/research/12-value-chain-and-swarm-thesis.md's REA
// mapping table names this Claim as the row the base ontology was missing.

import { VENUE_POLICIES } from "./institutionPolicies.mjs";
import { evaluatePolicy } from "./policy.mjs";
import { AGROFORESTRY_VENUES } from "./venues.mjs";

/** @typedef {'confirmed'|'reported'|'estimate'} Confidence */

/**
 * @typedef {Object} IntentInputResource
 * @property {string} resourceType - e.g. "seedling" | "solar-fraction" — structurally
 *   parallel to how a lot types its own resource (commodity/weight_kg), so a finance
 *   intent's "what is being financed" reads with the same grammar as a lot's "what is
 *   being sold."
 * @property {number} quantity
 * @property {string} unit
 */

/**
 * @typedef {Object} EthicHubClaim
 * @property {number} principalEur
 * @property {number} aprPct
 * @property {number} termMonths
 * @property {Confidence} confidence
 * @property {string} source
 */

/**
 * @typedef {Object} GlowClaim
 * @property {number} principalUsd
 * @property {number} glwPerWeek
 * @property {number} termWeeks
 * @property {Confidence} confidence
 * @property {string} source
 */

/** The two finance intents' Claims deliberately do NOT share one shape — EUR/APR/months
 *  (a conventional amortizing credit line) vs. USD/token-stream/weeks (a GLW emission
 *  delegation) are different financial instruments with different real terms. Typing the
 *  union honestly (two named shapes) beats forcing both into one generic
 *  {principal, rate, term} record that would misrepresent either. */
/** @typedef {EthicHubClaim|GlowClaim} FinanceClaim */

/**
 * Build the finance-intent object for the anchor lot's origin community.
 * SIM fill — deterministic given the lot, no RNG.
 */
export function buildFinanceIntent(lot) {
  const venue = AGROFORESTRY_VENUES[0];
  const community = lot?.origin?.community || lot?.origin?.locality_raw || "the anchor lot's community";
  const seedlings = 1200;
  const eurPerSeedling = 0.933; // -> €1,120 total, matching DESIGN-BRIEF §1.1 worked example
  const totalEur = Math.round(seedlings * eurPerSeedling);

  const venuePolicy = VENUE_POLICIES[venue.handle];
  const policyVerdict = venuePolicy ? evaluatePolicy(lot, venuePolicy) : null;

  return {
    intentType: "finance-this-planting",
    id: "aq:i-05",
    community,
    venue,
    seedlings,
    totalEur,
    note: "shade-grown coffee/cocoa agroforestry renovation — today's planting is a future lot (spec §4 Silvi correction)",
    policyVerdict,
    // Additive REA/Valueflows typed fields (Architecture G, WP4) — seedlings/totalEur
    // above are kept as-is (useAqueductEconomy.ts reads them directly); these are a
    // second, typed lens over the same numbers.
    inputResource: /** @type {IntentInputResource} */ ({
      resourceType: "seedling",
      quantity: seedlings,
      unit: "seedling",
    }),
    claim: /** @type {EthicHubClaim} */ ({
      principalEur: totalEur,
      aprPct: 9.9,
      termMonths: 12,
      confidence: "reported",
      source:
        "Heifer/EthicHub credit line rate ceiling (application Q2(d) research); EthicHub Line 2 real repay cycle 192,600→212,369.79 USDC",
    }),
  };
}

// --- finance-this-farm (Glow solar) ---------------------------------------------------

/** Parse Glow's `"26.53305° N, 81.57948° W"`-style coordinate string into signed
 *  {lng, lat} numbers. Pure string math, no Date.now/Math.random — safe to run once at
 *  module load (seeded-economy determinism, seed 20260702). */
function parseGlowCoordinates(raw) {
  const matches = [...raw.matchAll(/(\d+(?:\.\d+)?)\s*°\s*([NSEW])/g)];
  let lat = null;
  let lng = null;
  for (const [, numStr, hemi] of matches) {
    const num = Number(numStr);
    if (hemi === "N") lat = num;
    else if (hemi === "S") lat = -num;
    else if (hemi === "E") lng = num;
    else if (hemi === "W") lng = -num;
  }
  if (lat === null || lng === null) {
    throw new Error(`financeIntent.mjs: could not parse Glow coordinates "${raw}"`);
  }
  return { lng, lat };
}

/** Dated snapshot of one real Glow-audited farm — glow.org/api/audits, fetched
 *  2026-07-03. Same discipline as the EthicHub snapshot pattern (connectors/ethichub.mjs,
 *  SIM_LOT_DEFAULTS in useAqueductEconomy.ts): a live probe's response embedded as a
 *  constant, never re-fetched inside a sim file. Picked from the live probe's 124
 *  audits for clean data (address.coordinates, solarPanels.quantity,
 *  carbonFootprintAndProduction.systemWattageOutput all present). */
export const GLOW_FARM_SNAPSHOT = {
  glowId: "ef3d9f99-80de-498b-a3b8-462bb2457ec2",
  farmName: "Farm 1200",
  shortId: 1200,
  location: "FL 33974, USA",
  coordinatesRaw: "26.53305° N, 81.57948° W",
  coordinates: parseGlowCoordinates("26.53305° N, 81.57948° W"),
  solarPanels: {
    quantity: 13,
    brandAndModel: "HIS-T440NF(BK) by Hyundai Solar",
  },
  systemWattageOutput: "5.72 kW-DC",
  source: {
    platform: "glow.org",
    url: "https://glow.org/api/audits",
    fetched_at: "2026-07-03",
  },
};

/**
 * Build the finance-this-farm intent — Glow's structural analog to
 * finance-this-planting. Glow's model is farm-centric (no separate community vs. venue
 * institution the way EthicHub/Silvi split them), so the farm itself plays both roles:
 * it's the "community" being financed AND the "venue" the map/rail render it at.
 *
 * READ honesty: the farm audit (GLOW_FARM_SNAPSHOT) is a real, dated LIVE read from
 * glow.org/api/audits. The Miner terms below (principalUsd/glwPerWeek/termWeeks) are a
 * real observed listing, cited with its own source/confidence. The FILL is SIM — Glow's
 * V2 write path (delegation, Miner purchase) is app-mediated with no published onchain
 * addresses yet, so this intent can be rendered and reasoned about but never actually
 * settled by this codebase.
 *
 * SIM fill — deterministic, no lot argument (this vertical isn't anchored to a coffee
 * lot), no RNG.
 */
export function buildGlowFarmFinanceIntent() {
  const farm = GLOW_FARM_SNAPSHOT;

  return {
    intentType: "finance-this-farm",
    id: "aq:i-06",
    farmName: farm.farmName,
    farm,
    coordinates: farm.coordinates,
    note: "V2 write path is app-mediated — Glow has not published onchain delegation/Miner-purchase addresses yet, so fill is SIM even though the farm audit and Miner-terms reads are both real",
    // Typed REA/Valueflows fields — same additive convention as buildFinanceIntent's.
    inputResource: /** @type {IntentInputResource} */ ({
      resourceType: "solar-fraction",
      quantity: 1,
      unit: "miner-fraction",
    }),
    claim: /** @type {GlowClaim} */ ({
      principalUsd: 399,
      glwPerWeek: 43.6,
      termWeeks: 89,
      confidence: "reported",
      source:
        "app.glow.org Miner listing, observed 2026-07 (auth-gated, not independently fetchable); instrument corroborated onchain: OFFCHAIN_FRACTIONS 0x80EA852448c2807BeAe321deC7c603990209F7db (live mainnet contract)",
    }),
  };
}
