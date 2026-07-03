// Aqueduct — tokenizer solvers: the same race pattern as solverRoster.mjs (deterministic,
// shared cost function, policy-gated), applied to a different question. Solvers compete on
// LANDED COST to move a physical commodity lot. Tokenizer solvers compete on STRUCTURING
// TERMS to turn an investable asset/actor — one with a real financial-instrument flag
// (prefinancing/pretoken/yield_bearing) or a real treasury — into a tradable instrument.
// Same engine (sim/policy.mjs's evaluatePolicy), same "declared cost profile, never
// price±random" discipline, new domain.
//
// Archetypes are modeled on real RWA tokenization platforms researched this session
// (docs/research/09's competitive-landscape thread: Centrifuge, Maple Finance, Goldfinch,
// Ondo — see that doc's "RWA private-credit tokenization" section for the sourcing).
// Fee/yield figures are NOT confirmed platform terms — real terms vary by deal and
// require direct engagement with each platform — every profile carries "estimate"
// confidence honestly, the same discipline commodity-landed-cost.mjs uses for its own
// unconfirmed figures. This is a SIM roster illustrating the mechanism, not a live quote.

import { getGlwPriceSnapshot, getMinerTerms } from "../connectors/glow.mjs";
import { evaluatePolicy } from "./policy.mjs";

/** @typedef {'confirmed'|'reported'|'estimate'} Confidence */

/**
 * @typedef {Object} TokenizerProfile
 * @property {string} label
 * @property {number} structuringFeePct - one-time structuring/origination fee, fraction of instrument value
 * @property {number} custodyFeePct - annualized custody/servicing fee, fraction of instrument value
 * @property {number} listingDays - typical time from intake to tradable instrument
 * @property {number} minInstrumentValueEur - minimum deal size this archetype will structure
 * @property {Confidence} confidence
 * @property {string} source
 */

export const TOKENIZER_ARCHETYPES = [
  {
    handle: "@sim-tokenizer-pool",
    name: "Structured-credit pool archetype",
    realWorldAnalog: "Centrifuge — onchain finance, tokenization infrastructure for credit/structured finance",
    profile: {
      label: "sim-tokenizer-pool",
      structuringFeePct: 0.015,
      custodyFeePct: 0.008,
      listingDays: 21,
      minInstrumentValueEur: 50000,
      confidence: "estimate",
      source: "docs/research/09 RWA-landscape thread — archetype only, not Centrifuge's actual quoted terms",
    },
  },
  {
    handle: "@sim-tokenizer-institutional",
    name: "Overcollateralized institutional credit archetype",
    realWorldAnalog: "Maple Finance — institutional private credit, overcollateralized pools",
    profile: {
      label: "sim-tokenizer-institutional",
      structuringFeePct: 0.02,
      custodyFeePct: 0.01,
      listingDays: 14,
      minInstrumentValueEur: 250000,
      confidence: "estimate",
      source: "docs/research/09 RWA-landscape thread — archetype only, not Maple's actual quoted terms",
    },
  },
  {
    handle: "@sim-tokenizer-emerging",
    name: "Reputation-based emerging-market archetype",
    realWorldAnalog: "Goldfinch — unsecured/reputation-based credit for underserved markets",
    profile: {
      label: "sim-tokenizer-emerging",
      structuringFeePct: 0.025,
      custodyFeePct: 0.012,
      listingDays: 30,
      minInstrumentValueEur: 10000,
      confidence: "estimate",
      source: "docs/research/09 RWA-landscape thread — archetype only, not Goldfinch's actual quoted terms",
    },
  },
  {
    handle: "@sim-tokenizer-cash-equivalent",
    name: "Treasury/cash-equivalent archetype",
    realWorldAnalog: "Ondo Finance — tokenized Treasuries and cash-equivalent instruments",
    profile: {
      label: "sim-tokenizer-cash-equivalent",
      structuringFeePct: 0.005,
      custodyFeePct: 0.004,
      listingDays: 7,
      minInstrumentValueEur: 100000,
      confidence: "estimate",
      source: "docs/research/09 RWA-landscape thread — archetype only, not Ondo's actual quoted terms",
    },
  },
];

/**
 * The FIFTH profile, and the first with observed-market terms rather than an `estimate`
 * archetype: a Glow "Miner" — a fractional claim on a specific solar farm's GLW reward
 * stream, priced in USDC, paid out over ~89 protocol weeks. Unlike the four archetypes above
 * (which are structuring SERVICES quoting a fee to turn some instrument into a tradable one),
 * the Miner is an already-listed, already-structured instrument — so it doesn't bid a
 * structuring cost on the pool total; it bids ITS OWN real economics. Its yield is computed
 * live from two dated snapshots (getMinerTerms + getGlwPriceSnapshot), never a hardcoded
 * product, so if either snapshot is refreshed the math tracks.
 *
 * Confidence is "reported", NOT "confirmed": the app.glow.org listing that quotes these terms
 * is auth-gated and was not independently fetchable — it's corroborated only by the live
 * mainnet OFFCHAIN_FRACTIONS contract that represents Miner positions. Because it carries no
 * structuring fee, it is deliberately excluded from the lowest-structuring-cost `winner` sort
 * (cost: null → filtered out below) rather than allowed to spuriously "win" a race it isn't
 * running in. It renders alongside the four as the real-terms reference point.
 */
export function buildMinerBid() {
  const terms = getMinerTerms();
  const price = getGlwPriceSnapshot();
  const grossGlw = terms.glwPerWeek * terms.termWeeks;
  const grossUsd = grossGlw * price.usdPerGlw;
  const netMultiple = grossUsd / terms.principalUsd;
  return {
    handle: "@glow-miner",
    name: "Glow Miner (solar fraction)",
    status: "BID",
    instrument: true, // an already-structured, listed instrument, not a structuring service
    confidence: terms.confidence, // "reported" — listing not independently fetchable
    cost: null, // no structuring fee → excluded from the structuring-cost winner sort
    yield: {
      principalUsd: terms.principalUsd,
      glwPerWeek: terms.glwPerWeek,
      termWeeks: terms.termWeeks,
      usdPerGlw: price.usdPerGlw,
      grossGlw: Math.round(grossGlw * 100) / 100,
      grossUsd: Math.round(grossUsd * 100) / 100,
      netMultiple: Math.round(netMultiple * 1000) / 1000,
    },
    note: `${terms.source} — corroborated by ${terms.corroboration}`,
    source: terms.source,
    corroboration: terms.corroboration,
    provenance: "SNAPSHOT",
    observedAt: terms.observedAt,
    fetched_at: terms.fetched_at,
    priceMethod: price.method,
  };
}

/**
 * All-in structuring cost for one tokenizer profile, deterministic — mirrors
 * computeLandedCost's shape (lines, total, confidence) so it's rendered with the same UI
 * grammar, not a bespoke one.
 * @param {{ instrumentValueEur: number, profile: TokenizerProfile }} args
 */
export function computeTokenizationCost({ instrumentValueEur, profile }) {
  if (!(instrumentValueEur > 0)) throw new Error("computeTokenizationCost: instrumentValueEur must be > 0");
  const structuring = instrumentValueEur * profile.structuringFeePct;
  const custodyYear1 = instrumentValueEur * profile.custodyFeePct;
  const allInYear1 = structuring + custodyYear1;

  return {
    profileLabel: profile.label,
    instrumentValueEur,
    structuringFeeEur: Math.round(structuring * 100) / 100,
    custodyFeeYear1Eur: Math.round(custodyYear1 * 100) / 100,
    allInYear1Eur: Math.round(allInYear1 * 100) / 100,
    allInYear1Pct: Math.round((allInYear1 / instrumentValueEur) * 10000) / 100,
    listingDays: profile.listingDays,
    lines: [
      {
        label: "Structuring fee (one-time)",
        eurAmount: Math.round(structuring * 100) / 100,
        confidence: profile.confidence,
        source: profile.source,
      },
      {
        label: "Custody/servicing (year 1)",
        eurAmount: Math.round(custodyYear1 * 100) / 100,
        confidence: profile.confidence,
        source: profile.source,
      },
    ],
  };
}

/**
 * Run the tokenizer race for one investable entity (asset or org). Each archetype first
 * clears its own minimum-deal-size policy (evaluatePolicy, same engine the solver race
 * uses — a genuine PolicyRule, not a bespoke if-check), then bids its all-in structuring
 * cost. Lowest all-in cost that clears the minimum wins — same "lowest real cost wins"
 * shape as the solver race, applied to structuring instead of logistics.
 * @param {{ instrumentValueEur: number, policies?: Record<string, import("./policy.mjs").InstitutionPolicy> }} args
 */
export function runTokenizerRace({ instrumentValueEur, policies = {} }) {
  const bids = [];
  for (const archetype of TOKENIZER_ARCHETYPES) {
    if (instrumentValueEur < archetype.profile.minInstrumentValueEur) {
      bids.push({
        handle: archetype.handle,
        name: archetype.name,
        status: "DECLINED",
        cost: null,
        note: `below minimum deal size (€${archetype.profile.minInstrumentValueEur.toLocaleString()})`,
      });
      continue;
    }
    const policy = policies[archetype.handle];
    if (policy) {
      // Policy gating is opt-in per call site (e.g. jurisdiction/asset-class rules a
      // caller declares) — reuses the exact same evaluatePolicy() the solver race does,
      // against a lot-shaped object the caller constructs for this instrument.
      const verdict = evaluatePolicy({ instrumentValueEur }, policy);
      if (!verdict.eligible) {
        bids.push({
          handle: archetype.handle,
          name: archetype.name,
          status: "DECLINED",
          cost: null,
          note: verdict.note,
        });
        continue;
      }
    }
    const cost = computeTokenizationCost({ instrumentValueEur, profile: archetype.profile });
    bids.push({ handle: archetype.handle, name: archetype.name, status: "BID", cost, note: archetype.realWorldAnalog });
  }

  // The Glow Miner is a real, already-listed instrument (observed-market terms) — it rides in
  // the bids list as the real-terms reference point, but with cost:null it's excluded from the
  // structuring-cost winner sort below (it isn't a structuring service competing on fees).
  bids.push(buildMinerBid());

  const competing = bids.filter((b) => b.status === "BID" && b.cost);
  competing.sort((a, b) => a.cost.allInYear1Eur - b.cost.allInYear1Eur);
  const winner = competing[0] ?? null;

  return { bids, winner };
}
