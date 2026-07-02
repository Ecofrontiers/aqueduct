// Aqueduct — declared institutional policies, one InstitutionPolicy per solver/venue
// handle. Data only, same separation as SIM_SOLVER_ROSTER (bidding profile) vs this file
// (risk/compliance profile) — a solver's willingness to bid and its price for bidding are
// two different institutional facts, kept in two files on purpose.
//
// Phase 1 (docs/research/09): @sim-solver-5 carries the generalized form of the
// declinesThisRoute hardcode it used to carry directly in solverRoster.mjs — decline,
// full stop. Phase 2 adds @sim-solver-4's repricing rule: the same underlying signal gap
// (EUDR unverified), handled by charging a risk premium instead of refusing to bid.
// Decline is the degenerate case of repricing to infinity — showing both side by side is
// the point, not an oversight that solver-5 still just declines. Solvers 1-3 keep empty
// rule sets; nothing forces every institution to have an opinion on every risk.

import { eudrUnverifiedFraction } from "./policyConditions.mjs";

/** @type {Record<string, import("./policy.mjs").InstitutionPolicy>} */
export const SOLVER_POLICIES = {
  "@sim-solver-1": {
    institutionId: "@sim-solver-1",
    logicWeights: { hierarchy: 2, market: 9, network: 3 },
    rules: [],
  },
  "@sim-solver-2": {
    institutionId: "@sim-solver-2",
    logicWeights: { hierarchy: 1, market: 8, network: 2 },
    rules: [],
  },
  "@sim-solver-3": {
    institutionId: "@sim-solver-3",
    logicWeights: { hierarchy: 3, market: 8, network: 4 },
    rules: [],
  },
  "@sim-solver-4": {
    institutionId: "@sim-solver-4",
    logicWeights: { hierarchy: 4, market: 9, network: 5 },
    rules: [
      {
        id: "solver4-eudr-risk-premium",
        citesFailureMode: "adverse-selection",
        // Same signal gap solver-5 declines on, priced instead of refused — a
        // vertically-integrated-lite desk sophisticated enough to carry the risk at a
        // fair premium rather than exit the route entirely. No axis below
        // REQUIRES_REVIEW_THRESHOLD: absorbing a risk into the price is routine
        // risk-adjusted trading, not the market-structure event a decline is (contrast
        // solver-5's logicScore.market: -2 above).
        logicScore: { hierarchy: 5, market: 4, network: 5 },
        condition: eudrUnverifiedFraction,
        effect: {
          type: "reprice",
          marginAdjustmentBps: 80,
          note: "vertically-integrated-lite — prices EUDR-unconfirmed routes at a risk premium instead of declining them",
        },
      },
    ],
  },
  "@sim-solver-5": {
    institutionId: "@sim-solver-5",
    logicWeights: { hierarchy: 8, market: 5, network: 3 },
    rules: [
      {
        id: "solver5-eudr-signal-required",
        citesFailureMode: "adverse-selection",
        // Declining leaves margin on the table (Market cost) to avoid pricing an
        // unverifiable legality claim (Hierarchy win); the cooperative/producer side is
        // protected from being matched to a route that later fails EUDR enforcement
        // (mild Network win). Market score of -2 is intentionally below
        // REQUIRES_REVIEW_THRESHOLD: a solver declining a route is exactly the kind of
        // policy-driven market-structure change (it can hand the fill to the backstop,
        // see solverRoster.mjs "backstop wins ONLY when SIM solvers decline") that should
        // surface for review, not pass silently.
        logicScore: { hierarchy: 8, market: -2, network: 1 },
        condition: eudrUnverifiedFraction,
        effect: {
          type: "decline",
          note: "conservative risk desk — declines routes where buyer EUDR-readiness is flagged but not confirmed",
        },
      },
    ],
  },
  "@solver-backstop": {
    institutionId: "@solver-backstop",
    // Balanced across all three logics on purpose — "code public, margin visible" is a
    // transparency posture that serves Hierarchy (auditable), Market (open reference
    // price), and Network (nobody's shut out) equally; it has no rules because its whole
    // institutional role is to be the policy-free fallback that always fills.
    logicWeights: { hierarchy: 6, market: 6, network: 6 },
    rules: [],
  },
};

// Phase 3 (docs/research/09): the same schema applied to venue-side institutions — "a
// lender's covenant as a PolicyRule, not a hardcoded eligibility check." Only one venue
// exists per intent type today (financeIntent.mjs always picks AGROFORESTRY_VENUES[0]),
// so there's no alternate-venue routing to gate — the honest use of the schema here is
// "flag," not "decline": the same underlying signal gap solvers price or refuse gets
// surfaced on the financing side too, without inventing an eligibility branch this build
// doesn't actually have anywhere to route to.
/** @type {Record<string, import("./policy.mjs").InstitutionPolicy>} */
export const VENUE_POLICIES = {
  "@sim-venue-silvi": {
    institutionId: "@sim-venue-silvi",
    // Market + Hierarchy per docs/research/09's Governance Logics Triad table
    // (agroforestry lender row) — a financing covenant reads compliance signals the same
    // way a solver's risk desk does.
    logicWeights: { hierarchy: 6, market: 5, network: 7 },
    rules: [
      {
        id: "silvi-eudr-signal-visibility",
        citesFailureMode: "adverse-selection",
        // Real, externally-verified citations (connectors/giin.mjs, individually fetched
        // and confirmed against iris.thegiin.org — not invented): PI6372 is literally
        // "Client Individuals: Smallholder," the metric a real agroforestry lender would
        // report against for exactly this financing intent; PI5160 "Average Loan Size
        // Disbursed" is the metric this intent's €1,120 figure would be measured under.
        // This is what makes the flag a regulatory-grade citation, not just an internal
        // failure-mode reference — a real GIIN-aligned covenant, not an invented one.
        citesStandards: [
          { source: "GIIN-IRIS+", code: "PI6372" },
          { source: "GIIN-IRIS+", code: "PI5160" },
        ],
        // Reuses the exact same condition solver-4/solver-5 gate on — financing a new
        // planting for a community whose current lot isn't EUDR-confirmed is the same
        // signal-quality problem, one step upstream. Flag, not decline/reprice: with one
        // venue and no alternate route, gating would just mean "never finance," which
        // isn't what a real covenant does — it asks for the missing signal.
        logicScore: { hierarchy: 6, market: 5, network: 7 },
        condition: eudrUnverifiedFraction,
        effect: {
          type: "flag",
          note: "financing intent routed to Silvi without full origin verification on the anchor lot — a real covenant would request the missing EUDR signal before releasing funds, not block on it",
        },
      },
    ],
  },
  // @coop-exporter-soconusco: registered with the schema (Phase 3's actual ask — every
  // venue gets an InstitutionPolicy) but deliberately left with an empty rule set. The
  // real risk at this step is pass-through integrity (does settlement credit actually
  // reach the producer, not just the intermediary) — no entry in sim/failureModes.mjs
  // honestly names that mechanism yet. An empty rule set here is a documented gap, not
  // an oversight: forcing a citation that doesn't fit would be exactly the "citation
  // isn't integration" discipline this file exists to prevent violating.
  "@coop-exporter-soconusco": {
    institutionId: "@coop-exporter-soconusco",
    // Network-heavy per docs/research/09's table (cooperative/exporter row: producer
    // standing, community trust) — settlement credits this node precisely because it
    // carries Network-logic legitimacy a solver or lender doesn't have.
    logicWeights: { hierarchy: 4, market: 3, network: 9 },
    rules: [],
  },
};
