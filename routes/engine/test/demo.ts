/**
 * demo.ts — the on-camera EARN path, end to end:
 *   1) DETECTOR: scan the LIVE cross-marketplace oracle for real positive-net spreads.
 *   2) BRAIN:    Nemotron buy/skip on the top spreads (NVIDIA load-bearing).
 *   3) PLANNER:  routes_plan shows min-cost vs max-EV diverging on one card.
 *
 * Run: npm run demo   (network required for the live oracle + Nemotron)
 */
import { detectSpreads } from "../services/spread-detector.ts";
import { decideBuySkip } from "../services/spread-decision.ts";
import { computePolicy, type OracleInputs } from "../services/routes-plan.ts";
import { dumpSafe } from "../services/env.ts";

console.log("=== EARN engine config (safe) ===");
console.log(dumpSafe());

console.log("\n=== 1) DETECTOR — live spreads over api.slabclaw.com/api/deals/listings ===");
const spreads = await detectSpreads();
console.log(`detected ${spreads.length} real positive-net, phantom-guarded spreads`);
// focus on cheaper, lower-risk targets (the demo books a small one in-window)
const demoPool = spreads.filter((s) => s.askUsd <= 200 && s.netSpreadUsd >= 10).slice(0, 5);
console.log(`\ntop ${demoPool.length} demo-scale candidates (ask <= $200, net >= $10):`);
for (const s of demoPool) {
  console.log(`  ${s.name} ${s.set} ${s.grade}: buy $${s.askUsd}@${s.buyVenue} -> sell $${s.gradeMatchedValueUsd}@${s.sellVenue}  net +$${s.netSpreadUsd}  (conf ${s.confidence}, ${s.soldCount} sold)`);
}

console.log("\n=== 2) BRAIN — Nemotron buy/skip ===");
const target = demoPool[0] ?? spreads[0];
const decision = await decideBuySkip(target);
console.log(`  spread: ${target.name} ${target.set} net +$${target.netSpreadUsd}`);
console.log(`  verdict: ${decision.verdict}  [${decision.source}/${decision.model}]`);
console.log(`  reason:  ${decision.reason}`);
console.log(`  flags:   ${decision.flags.join(", ")}`);

console.log("\n=== 3) PLANNER — min-cost vs max-EV on one card (the policy contrast) ===");
const card: OracleInputs = {
  productId: "base1-4",
  psa10: 800,
  psa9: 320,
  slabbedAskByGrade: { 7: 40, 9: 300, 10: 760 },
  rawAskUsd: 60,
  rawCondition: "MT/GEM",
  targetGrade: 7,
};
const ctx = { vaultAddress: "0xVAULT", budgetEnvelopeUsd: 5000, horizonDays: 45 };
const cautious = computePolicy(card, "min-cost", ctx);
const aggressive = computePolicy(card, "max-risk-adjusted-ev", ctx);
console.log(`  cautious  (min-cost): ${cautious.policyTree.hops.map((h) => h.type).join(" -> ")}  cumCost $${cautious.policyTree.cumulativeCostUsd}  EV $${cautious.policyTree.expectedValue}`);
console.log(`            ${cautious.policyTree.narrationSeed}`);
console.log(`  aggressive (max-EV): ${aggressive.policyTree.hops.map((h) => h.type).join(" -> ")}  cumCost $${aggressive.policyTree.cumulativeCostUsd}  EV $${aggressive.policyTree.expectedValue}`);
console.log(`            ${aggressive.policyTree.narrationSeed}`);
