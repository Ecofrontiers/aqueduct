// Aqueduct — institutional policy engine. Generalizes the one hardcoded institutional
// judgment already in the sim (@sim-solver-5's declinesThisRoute) into a reusable
// (institution, rule, effect) mechanism, evaluated against the lot's own schema fields.
// See docs/research/09-institutional-policy-swarm-coordination.md for the position this
// exists to support, and sim/failureModes.mjs for the citation catalog
// PolicyRule.citesFailureMode resolves against.
//
// A policy verdict is SIM until an institution's actual stated covenant is read from a
// real document — same honesty-chip discipline as the EUDR fields (never LIVE by default,
// see docs/research/09 §Guardrails).
//
// Governance-logics scoring (hierarchy/market/network) follows the Hierarchy/Market/Network
// triad (Gieseke, archived Frontiers ideation, cited in docs/research/09): every triggered
// rule is scored on all three axes; the worst (minimum) axis across triggered rules
// determines requiresReview — "recommendations with any logic score below threshold
// require human review."

import { FAILURE_MODE_IDS, resolveFailureMode } from "./failureModes.mjs";
import { resolveStandard } from "./standardsRegistry.mjs";

/** Any single logic axis below this on a triggered rule flags the verdict for review,
 *  independent of eligibility/margin effect — the Governance Logics Triad safeguard. */
export const REQUIRES_REVIEW_THRESHOLD = 3;

/** Logic axes are scored -10..+10; a clean (untriggered) verdict reads as maximally
 *  aligned on all three, matching "no logic score below threshold" as the default. */
const CLEAN_LOGIC_SCORE = { hierarchy: 10, market: 10, network: 10 };

/**
 * @typedef {{hierarchy: number, market: number, network: number}} LogicScore
 * @typedef {{source: string, code: string}} StandardCitation
 *
 * @typedef {{
 *   id: string,
 *   citesFailureMode: string,
 *   citesStandards?: StandardCitation[],
 *   logicScore: LogicScore,
 *   condition: (lot: object) => number,
 *   effect: { type: "decline"|"reprice"|"flag", marginAdjustmentBps?: number, note: string },
 * }} PolicyRule
 *
 * @typedef {{
 *   institutionId: string,
 *   logicWeights: LogicScore,
 *   rules: PolicyRule[],
 * }} InstitutionPolicy
 *
 * @typedef {{
 *   institutionId: string,
 *   eligible: boolean,
 *   marginAdjustmentBps: number,
 *   logicScores: LogicScore,
 *   requiresReview: boolean,
 *   citedFailureModes: string[],
 *   citedStandards: StandardCitation[],
 *   triggeredRules: Array<{id: string, citesFailureMode: string, citesStandards: StandardCitation[], effectType: string, severity: number, note: string}>,
 *   note: string,
 * }} PolicyVerdict
 */

function validateRule(rule) {
  if (!FAILURE_MODE_IDS.includes(rule.citesFailureMode)) {
    throw new Error(
      `sim/policy.mjs: PolicyRule "${rule.id}" cites unknown failure mode "${rule.citesFailureMode}" — check failureModes.mjs, do not invent an id.`,
    );
  }
  for (const citation of rule.citesStandards ?? []) {
    resolveStandard(citation); // throws on an unresolvable citation — fail loud, not silent
  }
}

/**
 * Evaluate one institution's policy against one lot. Pure function — same lot + policy
 * always produces the same verdict, the same "replays cleanly, no RNG" discipline as
 * sim/cascade.mjs's buildCascade.
 * @param {object} lot - AqueductLotSnapshot
 * @param {InstitutionPolicy} institutionPolicy
 * @returns {PolicyVerdict}
 */
export function evaluatePolicy(lot, institutionPolicy) {
  const triggeredRules = [];
  let eligible = true;
  let marginAdjustmentBps = 0;
  const logicScores = { ...CLEAN_LOGIC_SCORE };

  for (const rule of institutionPolicy.rules) {
    validateRule(rule);
    const severity = rule.condition(lot);
    if (!(severity > 0)) continue; // rule not triggered on this lot

    triggeredRules.push({
      id: rule.id,
      citesFailureMode: rule.citesFailureMode,
      citesStandards: rule.citesStandards ?? [],
      effectType: rule.effect.type,
      severity,
      note: rule.effect.note,
    });

    logicScores.hierarchy = Math.min(logicScores.hierarchy, rule.logicScore.hierarchy);
    logicScores.market = Math.min(logicScores.market, rule.logicScore.market);
    logicScores.network = Math.min(logicScores.network, rule.logicScore.network);

    if (rule.effect.type === "decline") {
      eligible = false;
    } else if (rule.effect.type === "reprice") {
      marginAdjustmentBps += Math.round(severity * (rule.effect.marginAdjustmentBps ?? 0));
    }
    // "flag" changes no eligibility/margin — visibility only (cascade UI beat, Phase 5).
  }

  const requiresReview =
    logicScores.hierarchy < REQUIRES_REVIEW_THRESHOLD ||
    logicScores.market < REQUIRES_REVIEW_THRESHOLD ||
    logicScores.network < REQUIRES_REVIEW_THRESHOLD;

  const citedFailureModes = [...new Set(triggeredRules.map((r) => r.citesFailureMode))];
  const citedStandards = dedupeCitations(triggeredRules.flatMap((r) => r.citesStandards));

  const note =
    triggeredRules.length === 0
      ? `${institutionPolicy.institutionId}: no policy rule triggered — clean route`
      : triggeredRules.map((r) => r.note).join("; ");

  return {
    institutionId: institutionPolicy.institutionId,
    eligible,
    marginAdjustmentBps,
    logicScores,
    requiresReview,
    citedFailureModes,
    citedStandards,
    triggeredRules,
    note,
  };
}

function dedupeCitations(citations) {
  const seen = new Set();
  const out = [];
  for (const c of citations) {
    const key = `${c.source}:${c.code}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

/** Resolve a verdict's cited failure modes to their full catalog entries, for display
 *  (cascade UI, Phase 5). Citing a failure mode id is not the same as claiming the atlas
 *  is "integrated" — this is the boundary where a citation id becomes human-readable text,
 *  resolved on demand, not baked into the verdict itself. */
export function explainVerdict(verdict) {
  return verdict.citedFailureModes.map(resolveFailureMode);
}

/** Resolve a verdict's cited external standards (e.g. GIIN/IRIS+ metrics) to their real
 *  entries, same on-demand-resolution discipline as explainVerdict. */
export function explainStandards(verdict) {
  return verdict.citedStandards.map(resolveStandard);
}
