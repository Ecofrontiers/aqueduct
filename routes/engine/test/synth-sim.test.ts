/**
 * synth-sim.test.ts — CI regression for the SYNTHETIC-SCALE simulation (the pre-mainnet gate, D8).
 *
 * Runs the real orchestrator over 100s of synthetic cards on MockUSDC and asserts EVERY invariant
 * holds at scale: the cap firebreak, the window budget, P&L distinctness, the re-route lifecycle,
 * determinism, and completeness. This is the gate that must stay green before any real-money run.
 */
import { runSimulation } from "../sim/synthetic.ts";
import { ok, eq, section } from "./assert.ts";

export async function run(): Promise<void> {
  section("synth-sim: 250 cards on MockUSDC — every invariant holds at scale");
  const r = await runSimulation({ n: 250, seed: 1 });
  ok(r.n === 250 && r.pass1, "ran 250 synthetic candidates");
  for (const inv of r.invariants) ok(inv.ok, `invariant ${inv.name}: ${inv.detail}`);
  ok(r.ok, "ALL invariants pass (the pre-mainnet gate is green)");

  section("synth-sim: the loop actually exercises every path (no degenerate all-skip run)");
  ok((r.dispositions["acquired"] ?? 0) > 0, "some cards were ACQUIRED (in-cap buys)");
  ok((r.dispositions["blocked-over-cap"] ?? 0) > 0, "some cards were BLOCKED over-cap (the firebreak fired)");
  ok((r.dispositions["skipped-suspect-oracle"] ?? 0) > 0, "some cards were SKIPPED as suspect (thin/stale oracle)");
  ok((r.dispositions["relisted"] ?? 0) > 0, "some re-routed cards RESUMED to a live exit");
  ok(r.reroutesOpened > 0 && r.reroutesResumed === r.reroutesOpened, "every re-route leg opened was resumed on arrival");
  ok(r.portfolio.realizedUsd > 0 && r.portfolio.unrealizedUsd > 0, "both realized AND unrealized P&L are exercised");

  section("synth-sim: determinism — same seed ⇒ identical result");
  const r2 = await runSimulation({ n: 250, seed: 1 });
  eq(JSON.stringify(r.dispositions), JSON.stringify(r2.dispositions), "dispositions identical on re-run");
  eq(r.portfolio.navUsd, r2.portfolio.navUsd, "NAV identical on re-run");

  section("synth-sim: a tight window cap makes the WINDOW firebreak fire (never breached)");
  const tight = await runSimulation({ n: 250, seed: 1, perCardCapUsd: 500, windowCapUsd: 4000 });
  ok((tight.dispositions["blocked-window-budget"] ?? 0) > 0, "tight window cap blocks late buys (window firebreak)");
  ok(tight.pass1.windowSpentUsd <= 4000, `window spend $${tight.pass1.windowSpentUsd} never breaches the $4000 cap`);
  ok(tight.ok, "all invariants still pass under the tight window cap");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await run();
  const { exitWithSummary } = await import("./assert.ts");
  exitWithSummary();
}
