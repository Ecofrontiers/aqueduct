// Aqueduct — Phase 4 stress harness (docs/research/09-institutional-policy-swarm-
// coordination.md). Runs the real institutional policy engine (sim/policy.mjs +
// institutionPolicies.mjs) against the full seeded synthetic-economy lot population
// (sim/economy.mjs's getEconomy().lots — 1,250+ lots across 20 origin regions, count
// grows with economy.mjs's own ORIGIN_REGIONS table, don't hardcode it here), not just
// the single anchor lot the cascade demo shows.
//
// Additive: this module never touches economy.mjs's win-share lottery or its inline
// landed-cost formula — that's a separate, legitimate design (market-scale statistical
// shape) this harness doesn't own. It answers a different question — "if the policy layer
// actually gated this population, what would it do" — computed for real, not assumed. The
// first real run of this harness DID surface one economy.mjs data bug worth fixing at the
// source rather than working around here: dds_ref was hardcoded null for every lot, which
// made full EUDR confirmation structurally unreachable and flattened solver-4/5's verdicts
// to 100% on every lot. Fixed at economy.mjs's own eudr field (see its inline comment) —
// this file reports what the engine finds, it doesn't paper over what it finds.
//
// Loop-until-dry discipline: this is a single deterministic pass, not a search, because
// the population itself (economy.mjs) is already deterministic and finite — there's no
// unknown-size discovery problem here, just "run the real function over the real data and
// report what it found." No silent caps: every institution and every triggered failure
// mode is reported, not a top-N sample.

import { resolveFailureMode } from "./failureModes.mjs";
import { SOLVER_POLICIES } from "./institutionPolicies.mjs";
import { evaluatePolicy } from "./policy.mjs";

/** Archetypes NOT registered in SOLVER_POLICIES/SIM_SOLVER_ROSTER — these exist only to
 *  probe the policy ENGINE for gaps, not to be bid into any real race. Each one names a
 *  failure mode the current engine cannot yet defend against, and says why, rather than
 *  silently assuming the engine is complete because it has five declared rules. */
export const ADVERSARIAL_ARCHETYPES = [
  {
    id: "@adversarial-collusion-pair",
    citesFailureMode: "manipulation",
    finding:
      "PolicyRule.condition receives only the lot, never other institutions' bids or verdicts — a colluding pair (two solvers coordinating on price outside the lot's own data) is structurally invisible to every rule declared today. Closing this needs a condition signature that can see the current race's other bids, not a new rule under the current one.",
  },
  {
    id: "@adversarial-undercutter",
    citesFailureMode: "fee-gaming",
    finding:
      "No InstitutionPolicy declares a margin floor. A solver that always bids marginBps near zero regardless of the lot's actual risk profile passes every current rule (none of them gate on the solver's OWN bid, only on the lot's fields) and would win every race it enters. This is a real gap, not a hypothetical — nothing in institutionPolicies.mjs constrains a bidder's own price.",
  },
  {
    id: "@adversarial-free-rider",
    citesFailureMode: "thin-markets",
    finding:
      "A solver that only bids on routes every policy-bearing peer has already declined (picking off the residual after solver-5 exits) contributes no verified signal of its own and faces no rule requiring one. The engine has no notion of 'has this institution itself been vetted,' only 'does this lot clear this institution's bar.'",
  },
];

/**
 * Run every SOLVER_POLICIES-bearing institution against every lot in `lots`. Pure,
 * deterministic — same input, same output, no RNG (lots already come from economy.mjs's
 * seeded generator, itself deterministic).
 * @param {object[]} lots - AqueductLotSnapshot-shaped objects (real or SIM)
 * @returns {object} stress-test report
 */
export function runPolicyStressTest(lots) {
  const institutionIds = Object.keys(SOLVER_POLICIES).filter((id) => SOLVER_POLICIES[id].rules.length > 0);

  const perInstitution = {};
  const severityByFailureMode = {};
  let reviewPairCount = 0;

  for (const institutionId of institutionIds) {
    const policy = SOLVER_POLICIES[institutionId];
    let declineCount = 0;
    let repriceCount = 0;
    let totalMarginAdjustment = 0;

    for (const lot of lots) {
      const verdict = evaluatePolicy(lot, policy);
      if (verdict.requiresReview) reviewPairCount++;
      if (verdict.triggeredRules.length === 0) continue;

      if (!verdict.eligible) declineCount++;
      if (verdict.marginAdjustmentBps > 0) {
        repriceCount++;
        totalMarginAdjustment += verdict.marginAdjustmentBps;
      }
      for (const fm of verdict.citedFailureModes) {
        severityByFailureMode[fm] = (severityByFailureMode[fm] ?? 0) + 1;
      }
    }

    perInstitution[institutionId] = {
      totalLots: lots.length,
      declineRatePct: pct(declineCount, lots.length),
      repriceRatePct: pct(repriceCount, lots.length),
      avgMarginAdjustmentBps: repriceCount > 0 ? Math.round(totalMarginAdjustment / repriceCount) : 0,
    };
  }

  const failureModeFindings = Object.entries(severityByFailureMode)
    .map(([id, triggerCount]) => {
      const entry = resolveFailureMode(id);
      return { id, name: entry.name, sev: entry.sev, triggerCount, triggerRatePct: pct(triggerCount, lots.length) };
    })
    .sort((a, b) => b.triggerCount - a.triggerCount);

  return {
    totalLots: lots.length,
    perInstitution,
    failureModeFindings,
    // Count of (institution, lot) verdict pairs flagged for review, NOT a lot count —
    // one lot can trigger review from multiple institutions.
    reviewPairCount,
    adversarialFindings: ADVERSARIAL_ARCHETYPES.map((a) => ({
      id: a.id,
      citesFailureMode: a.citesFailureMode,
      name: resolveFailureMode(a.citesFailureMode).name,
      finding: a.finding,
    })),
  };
}

function pct(n, total) {
  return total > 0 ? Math.round((n / total) * 1000) / 10 : 0;
}
