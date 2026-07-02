/** Runs the full EARN-engine test suite. Exit 1 on any failure. */
import { run as runDetector } from "./spread-detector.test.ts";
import { run as runPlan } from "./routes-plan.test.ts";
import { run as runRouteCosts } from "./route-costs.test.ts";
import { run as runBeezie } from "./beezie-adapter.test.ts";
import { run as runCourtyard } from "./courtyard-adapter.test.ts";
import { run as runEbay } from "./ebay-adapter.test.ts";
import { run as runSeam } from "./adapter-seam.test.ts";
import { run as runOrchestrator } from "./orchestrator.test.ts";
import { run as runRoutesPnl } from "./routes-pnl.test.ts";
import { run as runCustodyStore } from "./custody-store.test.ts";
import { run as runSynthSim } from "./synth-sim.test.ts";
import { run as runVaultAccumulator } from "./vault-accumulator.test.ts";
import { run as runOracleEmitter } from "./oracle-emitter.test.ts";
import { exitWithSummary } from "./assert.ts";

console.log("SlabClaw EARN engine — test suite\n");

await runDetector();
runPlan();
await runRouteCosts();
await runBeezie();
await runCourtyard();
await runEbay();
await runSeam();
await runOrchestrator();
await runRoutesPnl();
await runCustodyStore();
await runSynthSim();
await runVaultAccumulator();
await runOracleEmitter();

exitWithSummary();
