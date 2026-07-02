/**
 * run-comics.ts — run the SECOND-COMMODITY loop and print dispositions + P&L (ADR-0001, D2).
 *
 *   node --experimental-strip-types engine/sim/run-comics.ts [N] [seed]
 *
 * Proves THROUGHLINE B (generalizable): the UNMODIFIED `AcquisitionDeskOrchestrator` runs over
 * a completely different commodity — graded comics (CGC/CBCS key issues) — using ONLY swapped
 * adapters + a commodity config. Same engine in, comic dispositions + P&L out. Zero network.
 *
 * Exit 0 only when every shared invariant passes AND the loop produced acquisitions for the
 * comics commodity — the gate that proves the engine is not card-specific.
 */
import { runComicsLoop, renderComicsReport } from "./comics.ts";

const n = Number(process.argv[2]) || 200;
const seed = Number(process.argv[3]) || 24;

const r = await runComicsLoop({ n, seed });
console.log(renderComicsReport(r));

// Determinism check — a second run with the same seed must produce an identical summary.
const r2 = await runComicsLoop({ n, seed });
const same =
  JSON.stringify({ d: r.dispositions, p: r.portfolio, o: r.reroutesOpened, s: r.reroutesResumed }) ===
  JSON.stringify({ d: r2.dispositions, p: r2.portfolio, o: r2.reroutesOpened, s: r2.reroutesResumed });
console.log(`  determinism: ${same ? "✓ identical on re-run (same seed)" : "✗ non-deterministic"}`);

process.exit(r.ok && same ? 0 : 1);
