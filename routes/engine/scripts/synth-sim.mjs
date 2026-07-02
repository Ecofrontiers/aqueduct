/**
 * synth-sim.mjs — run the SYNTHETIC-SCALE simulation (the pre-mainnet gate, D8).
 *
 *   node --experimental-strip-types engine/scripts/synth-sim.mjs [N] [seed]
 *   npm run sim                 # 300 cards, seed 42
 *   npm run sim -- 1000 7       # 1000 cards, seed 7
 *
 * Runs the REAL orchestrator over N synthetic cards on MockUSDC (zero-network) and validates the
 * cap firebreak, window budget, P&L distinctness, and the re-route lifecycle AT SCALE. Exit 0 only
 * when every invariant passes — this is the gate that must be green before any real-money run.
 */
import { runSimulation, renderReport } from "../sim/synthetic.ts";

const n = Number(process.argv[2]) || 300;
const seed = Number(process.argv[3]) || 42;

const r = await runSimulation({ n, seed });
console.log(renderReport(r));

// Determinism check — a second run with the same seed must produce an identical summary.
const r2 = await runSimulation({ n, seed });
const same = JSON.stringify({ d: r.dispositions, p: r.portfolio, o: r.reroutesOpened, s: r.reroutesResumed }) === JSON.stringify({ d: r2.dispositions, p: r2.portfolio, o: r2.reroutesOpened, s: r2.reroutesResumed });
console.log(`  determinism: ${same ? "✓ identical on re-run (same seed)" : "✗ non-deterministic"}`);

process.exit(r.ok && same ? 0 : 1);
