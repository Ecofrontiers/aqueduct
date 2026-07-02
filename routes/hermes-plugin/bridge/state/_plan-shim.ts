// GENERATED AT RUNTIME — do not edit or rely on this committed copy.
// engine-bridge.mjs `routes_plan` regenerates this shim on each run, resolving the engine
// path relative to the plugin dir (../../engine) or $SLABCLAW_ENGINE_DIR. The committed copy
// is a placeholder only; the real import path is filled in at run time.
import { computePolicy } from "../../../engine/services/routes-plan.ts";
const oracle = {};
const ctx = {};
const policy = computePolicy(oracle as never, "min-cost", ctx as never);
process.stdout.write(JSON.stringify(policy));
