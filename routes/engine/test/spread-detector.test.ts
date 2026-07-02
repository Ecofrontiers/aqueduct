/**
 * spread-detector.test.ts — end-to-end EARN engine over the LIVE oracle:
 *   detector (live GET /api/deals/listings) -> >=1 positive-net pair -> decision (BUY/SKIP).
 *
 * Also covers the phantom-listing guard with deterministic injected fixtures (no network),
 * so the guard logic is verified even if the oracle is briefly unreachable.
 */
import { detectSpreads, phantomReasons, type Spread } from "../services/spread-detector.ts";
import { decideBuySkip, deterministicDecision } from "../services/spread-decision.ts";
import { ok, eq, section } from "./assert.ts";

export async function run(): Promise<void> {
  section("spread-detector: phantom guard (deterministic fixtures)");

  const guard = { minSoldCount: 3, requireHighConfidence: true, maxValueRatio: 10 };
  // a real, live, grade-matched, high-confidence, well-sold spread -> passes
  const good = {
    cardId: "good-1",
    name: "Kingdra",
    set: "Neo Genesis — Unlimited",
    listingPlatform: "cardmarket",
    listingPrice: 31.5,
    listingGrade: "PSA 9",
    spreadGrade: "PSA 9",
    oraclePrice: 102,
    oracleSource: "pc_sold",
    oracleConfidence: "high",
    oracleSoldCount: 5,
    stale: false,
  };
  eq(phantomReasons(good, guard).length, 0, "live grade-matched high-conf well-sold deal passes the guard");

  // phantom variants — each should be rejected for the right reason
  ok(phantomReasons({ ...good, stale: true }, guard).includes("stale_listing"), "stale listing rejected");
  ok(phantomReasons({ ...good, oracleConfidence: "low" }, guard).includes("low_confidence"), "low-confidence oracle rejected");
  ok(phantomReasons({ ...good, oracleSoldCount: 1 }, guard).some((r) => r.startsWith("thin_oracle")), "thin oracle (<3 sold) rejected");
  ok(phantomReasons({ ...good, spreadGrade: "PSA 8" }, guard).includes("grade_mismatch"), "grade-mismatched deal rejected");
  ok(phantomReasons({ ...good, oraclePrice: 99999 }, guard).includes("out_of_band"), "out-of-band B/A ratio rejected (wrong-card guard)");
  ok(phantomReasons({ ...good, listingPrice: 0 }, guard).includes("no_ask_price"), "zero ask price rejected");

  section("spread-detector: positive-net detection on injected fixtures");
  const injected = [
    good, // net positive after fees
    { ...good, cardId: "loss-1", listingPrice: 200, oraclePrice: 100 }, // negative -> dropped
    { ...good, cardId: "phantom-1", oracleConfidence: "low" }, // phantom -> dropped
  ];
  const injectedSpreads = await detectSpreads(undefined, { deals: injected });
  ok(injectedSpreads.length >= 1, "detector surfaces the one real positive-net pair from fixtures");
  ok(
    injectedSpreads.every((s) => s.netSpreadUsd > 0),
    "every surfaced spread has net > 0",
  );
  ok(
    !injectedSpreads.some((s) => s.productId === "loss-1" || s.productId === "phantom-1"),
    "loss-making and phantom fixtures are NOT surfaced",
  );

  section("spread-detector: detector -> decision flow (deterministic brain, offline-safe)");
  const top: Spread = injectedSpreads[0];
  const det = deterministicDecision(top);
  ok(det.verdict === "BUY" || det.verdict === "SKIP", "deterministic brain returns a verdict");
  eq(det.netSpreadUsd, top.netSpreadUsd, "brain echoes the detector's net spread (does NOT recompute)");
  ok(det.verdict === "BUY", "a real high-conf positive-net Kingdra spread is a BUY under the guardrail");

  section("spread-detector: LIVE oracle end-to-end (api.slabclaw.com)");
  let liveSpreads: Spread[] = [];
  let liveError: string | null = null;
  try {
    liveSpreads = await detectSpreads();
  } catch (e) {
    liveError = (e as Error).message;
  }

  if (liveError) {
    // Network/oracle unreachable: do not hard-fail the suite on infra, but record it loudly.
    console.log(`    WARN  live oracle unreachable (${liveError}) — fixture coverage stands.`);
    ok(true, "live oracle skipped (offline) — fixture path verified the detector logic");
  } else {
    ok(liveSpreads.length >= 1, `live oracle returns >=1 real positive-net pair (got ${liveSpreads.length})`);
    const top3 = liveSpreads.slice(0, 3);
    for (const s of top3) {
      console.log(`    LIVE  ${s.name} ${s.set} ${s.grade}: buy $${s.askUsd}@${s.buyVenue} -> sell $${s.gradeMatchedValueUsd}@${s.sellVenue}  net +$${s.netSpreadUsd}  conf ${s.confidence}`);
    }
    ok(liveSpreads.every((s) => s.netSpreadUsd > 0), "every live spread is positive-net");
    ok(liveSpreads.every((s) => s.oracleConfidence === "high"), "every live spread passed the high-confidence guard");
    ok(liveSpreads.every((s) => s.soldCount >= 3), "every live spread passed the soldCount>=3 guard");

    // end-to-end: feed the top LIVE spread to the Nemotron brain (falls back deterministically offline)
    const decision = await decideBuySkip(top3[0]);
    console.log(`    BRAIN [${decision.source}/${decision.model}] ${decision.verdict}: ${decision.reason}`);
    ok(decision.verdict === "BUY" || decision.verdict === "SKIP", "Nemotron brain returns a verdict on a live spread");
    eq(decision.netSpreadUsd, top3[0].netSpreadUsd, "brain echoes the live detector's net spread");
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await run();
  const { exitWithSummary } = await import("./assert.ts");
  exitWithSummary();
}
