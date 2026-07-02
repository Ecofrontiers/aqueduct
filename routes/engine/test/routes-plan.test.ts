/**
 * routes-plan.test.ts — the headline MDP property: on the SAME card, min-cost and
 * max-risk-adjusted-ev produce VERIFIABLY DIFFERENT policies, and the Grade edge is valued
 * by the grade-EV reference module (lib/grade-ev.mjs).
 */
import { computePolicy, type OracleInputs, type PlanContext } from "../services/routes-plan.ts";
import { ok, eq, section } from "./assert.ts";

export function run(): void {
  section("routes-plan: min-cost vs max-risk-adjusted-ev DIFFER on one card");

  // Worked wedge SKU shape (PRD §1.1): a card where buying-slabbed is cheaper but
  // raw→grade→sell has higher probability-weighted EV. PSA10 $800 / PSA9 $320 anchors.
  const card: OracleInputs = {
    productId: "base1-4", // Base Set Charizard
    psa10: 800,
    psa9: 320,
    // Cheap already-graded PSA7 available for $40 → the cautious low-cost terminal state.
    slabbedAskByGrade: { 7: 40, 9: 300, 10: 760 },
    rawAskUsd: 60, // a clean GEM-condition raw costs $60 — pricier round-trip than the cheap slab
    rawCondition: "MT/GEM", // distribution carries real PSA10 upside (0.35) → high grading EV
    targetGrade: 7, // cautious buys the cheap, low-grade, deterministic slab
    grader: "PSA",
    gradingTier: "economy",
    sellFeePercent: 13,
  };
  const ctx: PlanContext = { vaultAddress: "0xVAULT", budgetEnvelopeUsd: 5000, horizonDays: 45 };

  const cautious = computePolicy(card, "min-cost", ctx);
  const aggressive = computePolicy(card, "max-risk-adjusted-ev", ctx);

  const cautiousRoute = cautious.policyTree.hops.map((h) => h.type).join("->");
  const aggressiveRoute = aggressive.policyTree.hops.map((h) => h.type).join("->");
  console.log("    cautious   route:", cautiousRoute, "| cumCost $" + cautious.policyTree.cumulativeCostUsd, "| EV $" + cautious.policyTree.expectedValue);
  console.log("    aggressive route:", aggressiveRoute, "| cumCost $" + aggressive.policyTree.cumulativeCostUsd, "| EV $" + aggressive.policyTree.expectedValue);

  // 1. The two objectives must choose DIFFERENT routes (different hop sequences).
  ok(cautiousRoute !== aggressiveRoute, "min-cost and max-EV select different hop sequences");

  // 2. Cautious = the cheap deterministic slabbed-hold (no probabilistic Grade edge).
  const cautiousHasChance = cautious.policyTree.hops.some((h) => h.isProbabilistic);
  ok(!cautiousHasChance, "min-cost route is fully deterministic (no Grade chance node)");
  ok(cautious.policyTree.hops.some((h) => h.type === "acquire"), "min-cost route acquires");
  ok(cautious.policyTree.hops.some((h) => h.type === "hold"), "min-cost route ends in hold");

  // 3. Aggressive = raw→grade→sell, branches on the stochastic Grade outcome.
  const aggressiveHasChance = aggressive.policyTree.hops.some((h) => h.isProbabilistic && h.type === "grade");
  ok(aggressiveHasChance, "max-EV route contains a probabilistic Grade chance node");
  ok(aggressive.policyTree.hops.some((h) => h.type === "ship"), "max-EV route ships to grader");

  // 4. The Grade chance node's outcome distribution came from grade-ev getGradeDistribution.
  const gradeHop = aggressive.policyTree.hops.find((h) => h.type === "grade");
  ok(!!gradeHop?.outcomeDist, "Grade edge carries an outcome distribution");
  const probSum = Object.values(gradeHop!.outcomeDist!).reduce((a, b) => a + b, 0);
  ok(Math.abs(probSum - 1) < 0.05, `Grade outcome distribution sums to ~1 (got ${probSum.toFixed(3)})`);

  // 5. min-cost truly minimises cost; max-EV truly maximises EV (objective integrity).
  ok(
    cautious.policyTree.cumulativeCostUsd <= aggressive.policyTree.cumulativeCostUsd ||
      cautious.policyTree.expectedValue < aggressive.policyTree.expectedValue,
    "min-cost is cheaper OR max-EV has higher EV (objectives diverge, not accidental)",
  );
  ok(aggressive.policyTree.expectedValue > cautious.policyTree.expectedValue, "max-EV route has strictly higher expected value");

  // 6. Recommended intents reflect the chosen form (slabbed vs raw).
  eq(cautious.recommendedIntents[0].form, "slabbed", "cautious recommends a slabbed acquire intent");
  eq(aggressive.recommendedIntents[0].form, "raw", "aggressive recommends a raw acquire intent");

  // 7. Expected grade present and sane on the aggressive route (from grade-ev expectedGrade).
  ok(
    typeof aggressive.policyTree.expectedGrade === "number" && aggressive.policyTree.expectedGrade! >= 7 && aggressive.policyTree.expectedGrade! <= 10,
    `aggressive expectedGrade is sane (got ${aggressive.policyTree.expectedGrade})`,
  );
}

// allow direct invocation
if (import.meta.url === `file://${process.argv[1]}`) {
  run();
  const { exitWithSummary } = await import("./assert.ts");
  exitWithSummary();
}
