// Aqueduct — synthetic capital roster: buyers, grants, and funds, matched against lots by
// the SAME (institution, rule, condition, effect) engine as solverRoster.mjs/
// institutionPolicies.mjs (sim/policy.mjs). "Matching of conditions" is the mechanic
// throughout this sim layer, not a separate thing invented for financing — a buyer's
// quality floor and a solver's EUDR-signal requirement are both PolicyRules, evaluated
// the same way, explained the same way (citations, logic scores).
//
// This roster is ADDITIONAL to buyerAgent.mjs's SIM_BUYER (the single standing-demand
// buyer the real anchor-lot cascade tour matches against) — that one stays untouched, it's
// load-bearing for the existing tour. This roster is for the aggregate financing view
// across the full synthetic economy (sim/capitalFormations.mjs), never the anchor lot's
// own cascade.
//
// Names are generic descriptors, never fictional real-sounding brand names — same
// discipline as venues.mjs's COOP_EXPORTER_NODE and SIM_SOLVER_ROSTER handles
// (FABLE-KICKOFF.md "Never: ... fictional platform names").

import { lotHasCertifier } from "../connectors/certifiers.mjs";
import { commodityNotIn, eudrUnverifiedFraction, qualityBelow, weightBelowKg } from "./policyConditions.mjs";

/** @typedef {{
 *   handle: string,
 *   name: string,
 *   kind: "buyer" | "grant" | "fund",
 *   capitalEur: number,
 *   note: string,
 * } & import("./policy.mjs").InstitutionPolicy} CapitalActor */

/** @type {CapitalActor[]} */
export const CAPITAL_ROSTER = [
  {
    handle: "@sim-buyer-eu-1",
    name: "EU specialty roaster demand",
    kind: "buyer",
    capitalEur: 180000,
    note: "standing coffee demand, quality-graded — SIM analog of the anchor tour's single buyer, generalized to the full lot population",
    institutionId: "@sim-buyer-eu-1",
    logicWeights: { hierarchy: 3, market: 9, network: 4 },
    rules: [
      {
        id: "buyer-eu-1-quality-floor",
        citesFailureMode: "adverse-selection",
        logicScore: { hierarchy: 3, market: 8, network: 4 },
        condition: qualityBelow(84),
        effect: { type: "decline", note: "below SCA 84 quality floor" },
      },
      {
        id: "buyer-eu-1-commodity",
        citesFailureMode: "adverse-selection",
        logicScore: { hierarchy: 3, market: 8, network: 4 },
        condition: commodityNotIn(["coffee"]),
        effect: { type: "decline", note: "coffee-only demand" },
      },
    ],
  },
  {
    handle: "@sim-buyer-us-1",
    name: "US specialty importer demand",
    kind: "buyer",
    capitalEur: 240000,
    note: "higher quality bar, requires full EUDR confirmation before purchase — a real import-compliance posture, not just a preference",
    institutionId: "@sim-buyer-us-1",
    logicWeights: { hierarchy: 6, market: 8, network: 4 },
    rules: [
      {
        id: "buyer-us-1-quality-floor",
        citesFailureMode: "adverse-selection",
        logicScore: { hierarchy: 5, market: 7, network: 4 },
        condition: qualityBelow(86),
        effect: { type: "decline", note: "below SCA 86 quality floor" },
      },
      {
        id: "buyer-us-1-eudr-required",
        citesFailureMode: "adverse-selection",
        // Below REQUIRES_REVIEW_THRESHOLD on market: refusing a route over unconfirmed
        // legality is a real compliance decision, same posture as solver-5's decline.
        logicScore: { hierarchy: 8, market: 2, network: 3 },
        condition: eudrUnverifiedFraction,
        effect: {
          type: "decline",
          note: "requires full EUDR confirmation, not just flagged — a real import posture ahead of the 2026-12-30 mandatory date",
        },
      },
    ],
  },
  {
    handle: "@sim-grant-agroforestry-1",
    name: "Agroforestry renovation grant pool",
    kind: "grant",
    capitalEur: 480000,
    note: "coffee/cacao renovation financing, requires confirmed origin legality before disbursing — cites GIIN's own Agriculture impact-objective checklist",
    institutionId: "@sim-grant-agroforestry-1",
    logicWeights: { hierarchy: 7, market: 3, network: 8 },
    rules: [
      {
        id: "grant-agroforestry-1-commodity",
        citesFailureMode: "thin-markets",
        citesStandards: [{ source: "GIIN-IRIS+", code: "OD6247" }],
        logicScore: { hierarchy: 7, market: 3, network: 8 },
        condition: commodityNotIn(["coffee", "cacao"]),
        effect: { type: "decline", note: "agroforestry renovation grant scoped to coffee/cacao" },
      },
      {
        id: "grant-agroforestry-1-eudr-required",
        citesFailureMode: "adverse-selection",
        citesStandards: [{ source: "GIIN-IRIS+", code: "OD6247" }],
        logicScore: { hierarchy: 8, market: 4, network: 6 },
        condition: eudrUnverifiedFraction,
        effect: { type: "decline", note: "renovation financing requires confirmed origin legality, not just flagged" },
      },
      {
        id: "grant-agroforestry-1-certification-visibility",
        citesFailureMode: "info-asymmetry",
        citesStandards: [{ source: "CERTIFIER", code: "rainforest-alliance" }],
        // Flag, not decline: lot.certs is empty for every lot today (no real source
        // populates it — EthicHub doesn't publish it, the seeded economy doesn't invent
        // one). A real agroforestry/shade-grown covenant would ask for Rainforest
        // Alliance certification (the scheme that specifically covers agroforestry
        // practice), not auto-reject a lot that simply hasn't reported cert status yet —
        // same posture as Silvi's EUDR-visibility rule.
        logicScore: { hierarchy: 6, market: 4, network: 7 },
        condition: (lot) => (lotHasCertifier(lot, "rainforest-alliance") ? 0 : 1),
        effect: {
          type: "flag",
          note: "no Rainforest Alliance (or equivalent) certification on file — a real agroforestry covenant would request it before disbursing, not block on its absence today",
        },
      },
    ],
  },
  {
    handle: "@sim-grant-smallholder-finance-1",
    name: "Smallholder financial-health grant pool",
    kind: "grant",
    capitalEur: 320000,
    note: "sized for aggregated smallholder volume, not single micro-lots — cites GIIN's real smallholder-client metric",
    institutionId: "@sim-grant-smallholder-finance-1",
    logicWeights: { hierarchy: 5, market: 3, network: 9 },
    rules: [
      {
        id: "grant-smallholder-1-min-volume",
        citesFailureMode: "thin-markets",
        citesStandards: [{ source: "GIIN-IRIS+", code: "PI6372" }],
        logicScore: { hierarchy: 5, market: 3, network: 8 },
        condition: weightBelowKg(600),
        effect: { type: "decline", note: "below the pool's minimum aggregated volume (600kg)" },
      },
    ],
  },
  {
    handle: "@sim-fund-eco-capital-1",
    name: "Eco-capital rotating fund",
    kind: "fund",
    capitalEur: 750000,
    note: "broadest mandate, coffee/cacao/honey — cites the real average-loan-size metric its disbursements would be measured under",
    institutionId: "@sim-fund-eco-capital-1",
    logicWeights: { hierarchy: 5, market: 6, network: 6 },
    rules: [
      {
        id: "fund-eco-capital-1-quality-floor",
        citesFailureMode: "adverse-selection",
        citesStandards: [{ source: "GIIN-IRIS+", code: "PI5160" }],
        logicScore: { hierarchy: 4, market: 6, network: 6 },
        condition: qualityBelow(80),
        effect: { type: "decline", note: "below the fund's SCA 80 floor (non-coffee lots pass this rule)" },
      },
    ],
  },
  {
    handle: "@sim-fund-cacao-1",
    name: "Cacao-focused eco-capital fund",
    kind: "fund",
    capitalEur: 210000,
    note: "commodity-restricted fund, smaller pool — shows capital isn't uniformly coffee-shaped",
    institutionId: "@sim-fund-cacao-1",
    logicWeights: { hierarchy: 4, market: 6, network: 6 },
    rules: [
      {
        id: "fund-cacao-1-commodity",
        citesFailureMode: "thin-markets",
        logicScore: { hierarchy: 4, market: 6, network: 6 },
        condition: commodityNotIn(["cacao"]),
        effect: { type: "decline", note: "cacao-only fund" },
      },
    ],
  },
];
