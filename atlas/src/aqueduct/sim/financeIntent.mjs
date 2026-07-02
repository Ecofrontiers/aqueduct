// Aqueduct — second intent type: finance-this-planting/renovation
// (DEMO-SPEC.md §5 "Intent types (two)", §3 item 5 tour beat B6). Production
// financing routed to an agroforestry venue node (Silvi), SIM fill. The
// lifecycle thesis in miniature: finance the system -> sell its harvest.
//
// Institutional policy (docs/research/09-institutional-policy-swarm-coordination.md,
// Phase 3): the venue's covenant is evaluated the same way a solver's is, via
// sim/policy.mjs against VENUE_POLICIES — see institutionPolicies.mjs for why this is a
// "flag," not a decline/reprice, with only one venue to route to.

import { VENUE_POLICIES } from "./institutionPolicies.mjs";
import { evaluatePolicy } from "./policy.mjs";
import { AGROFORESTRY_VENUES } from "./venues.mjs";

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
  };
}
