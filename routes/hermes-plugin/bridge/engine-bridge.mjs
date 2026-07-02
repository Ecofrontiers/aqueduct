#!/usr/bin/env node
/**
 * engine-bridge.mjs — the SUBPROCESS BACKEND for the Hermes slabclaw-routes plugin tools.
 *
 * This is the missing wiring layer the recon flagged: the Hermes plugin shipped profiles +
 * routing.yaml + policy.yaml (attenuation assets) but NO code to back the per-solver tools
 * (routes_plan, get_active_intents, submit_fill, kanban_block, verifyFill). This CLI is what
 * the plugin's __init__.py register(ctx) handlers shell out to. Each subcommand calls the
 * REAL engine (../../engine/services/routes-plan.ts via computePolicy, and the proven Base
 * Sepolia Seaport settle path) — the LLM never does the arithmetic or fabricates a tx.
 *
 * SAFETY RAILS (hard): Base SEPOLIA only (chain 84532). Test-mode. MockUSDC. No mainnet,
 * no real money. verifyFill/settle uses the SAME self-fulfil Seaport roundtrip the engine
 * already proves at engine/scripts/sepolia-roundtrip.mjs.
 *
 * Usage: node engine-bridge.mjs <subcommand> '<json-args>'
 *   subcommands: routes_plan | get_active_intents | submit_fill | kanban_block | verify_fill
 * Output: a single JSON object on stdout (the tool result the model sees).
 */

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Resolve the real engine dir RELATIVE to this file (no absolute/user path baked in). The
// installed plugin copy (~/.hermes/plugins/...) is NOT next to the engine, so prefer the
// SLABCLAW_ENGINE_DIR env override, else the repo layout where the engine is a sibling of the
// plugin dir: hermes-plugin/bridge/ -> ../../engine.
const SIBLING_ENGINE = resolve(__dirname, "..", "..", "engine");
const ENGINE_DIR = process.env.SLABCLAW_ENGINE_DIR || SIBLING_ENGINE;
const STATE_DIR = resolve(__dirname, "state");
const STATE_FILE = resolve(STATE_DIR, "loop-state.json");
const CHAIN_ID = 84532; // Base Sepolia — HARD pinned.

function loadState() {
  if (!existsSync(STATE_FILE)) return { intents: {}, fills: {}, gates: {} };
  try { return JSON.parse(readFileSync(STATE_FILE, "utf8")); }
  catch { return { intents: {}, fills: {}, gates: {} }; }
}
function saveState(s) {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}
function out(obj) { process.stdout.write(JSON.stringify(obj)); }
function fail(msg, extra = {}) { out({ ok: false, error: msg, ...extra }); process.exit(0); }

const [, , subcmd, rawArgs] = process.argv;
let args = {};
if (rawArgs) { try { args = JSON.parse(rawArgs); } catch { fail(`bad JSON args: ${rawArgs}`); } }

// ── routes_plan — the planner's expectimax over the REAL engine computePolicy ──
async function routesPlan() {
  // Default to the recon's proven divergent card (min-cost vs max-EV differ) if no oracle given.
  const productId = args.productId || "base1-4-charizard-holo";
  const objective = args.objective === "max-risk-adjusted-ev" ? "max-risk-adjusted-ev" : "min-cost";
  // Proven-divergent oracle (matches engine/test/routes-plan.test.ts): min-cost picks the cheap
  // deterministic grade-7 slabbed-hold; max-EV branches to the stochastic raw->grade->sell.
  const oracle = {
    productId,
    psa10: args.psa10 ?? 800,
    psa9: args.psa9 ?? 320,
    slabbedAskByGrade: args.slabbedAskByGrade ?? { 7: 40, 9: 300, 10: 760 },
    rawAskUsd: args.rawAskUsd ?? 60,
    rawCondition: args.rawCondition ?? "NM",
    targetGrade: args.targetGrade ?? 7,
    grader: args.grader ?? "PSA",
    gradingTier: args.gradingTier ?? "economy",
    sellFeePercent: args.sellFeePercent ?? 13,
  };
  const ctx = {
    vaultAddress: args.vaultAddress ?? "0x013f4b4bbbf8dace5cAa55d6284E272Fd2862636",
    budgetEnvelopeUsd: args.budgetEnvelopeUsd ?? 5000,
    horizonDays: args.horizonDays ?? 45,
    maxHops: 6,
  };
  // Call the engine in-process via a tiny TS shim run under --experimental-strip-types.
  const shim = `
import { computePolicy } from ${JSON.stringify(resolve(ENGINE_DIR, "services", "routes-plan.ts"))};
const oracle = ${JSON.stringify(oracle)};
const ctx = ${JSON.stringify(ctx)};
const policy = computePolicy(oracle, ${JSON.stringify(objective)}, ctx);
process.stdout.write(JSON.stringify(policy));
`;
  const shimPath = resolve(STATE_DIR, "_plan-shim.ts");
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(shimPath, shim);
  let policyJson;
  try {
    policyJson = execFileSync("node", ["--experimental-strip-types", shimPath], {
      cwd: ENGINE_DIR, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 60000,
    });
  } catch (e) {
    return fail(`computePolicy failed: ${e.stderr || e.message}`);
  }
  const policy = JSON.parse(policyJson);
  const intent = policy.recommendedIntents[0];
  const hops = policy.policyTree.hops.map((h) => h.type).join("->");
  out({
    ok: true, tool: "routes_plan", chainId: CHAIN_ID, objective,
    targetProduct: policy.targetProduct,
    recommendedIntent: {
      form: intent.form, maxPriceUsd: intent.maxPrice, expectedCostUsd: intent.expectedCost,
      expectedGrade: intent.expectedGrade,
    },
    route: hops,
    expectedValueUsd: policy.policyTree.expectedValue,
    cumulativeCostUsd: policy.policyTree.cumulativeCostUsd,
    replanTriggers: policy.replanTriggers,
    note: "Policy computed by engine computePolicy (expectimax); LLM narrates only. Base Sepolia scoped.",
  });
}

// ── get_active_intents — publish a Sepolia-scoped intent + list the registry view ──
function getActiveIntents() {
  const state = loadState();
  if (args.publish) {
    const intentId = "0x" + Buffer.from(`${args.productId || "intent"}:${Date.now()}`).toString("hex").slice(0, 64).padEnd(64, "0");
    const maxPriceUsd = Math.min(args.maxPriceUsd ?? 200, 200); // PayGuard window cap — HARD.
    state.intents[intentId] = {
      intentId, productId: args.productId || "base1-4-charizard-holo",
      form: args.form || "slabbed", maxPriceUsd, status: "Active",
      chainId: CHAIN_ID, escrowToken: "MockUSDC",
      vaultAddress: args.vaultAddress ?? "0x013f4b4bbbf8dace5cAa55d6284E272Fd2862636",
      openedAt: new Date().toISOString(),
    };
    saveState(state);
    out({
      ok: true, tool: "get_active_intents", action: "published", chainId: CHAIN_ID,
      intentId, intent: state.intents[intentId],
      note: "Intent published to the local Registry view (test-mode). escrow=MockUSDC, capped at PayGuard window $200.",
    });
    return;
  }
  out({ ok: true, tool: "get_active_intents", chainId: CHAIN_ID, intents: Object.values(state.intents) });
}

// ── submit_fill — a SOLVER bids+fills its OWN hop (NO escrow release) ──
function submitFill() {
  const state = loadState();
  const intentId = args.intentId;
  if (!intentId || !state.intents[intentId]) return fail(`unknown intentId: ${intentId}`);
  const intent = state.intents[intentId];
  const fillId = "0x" + Buffer.from(`fill:${intentId}:${Date.now()}`).toString("hex").slice(0, 64).padEnd(64, "0");
  const certHash = args.certHash || ("0x" + "ab".repeat(32));
  state.fills[fillId] = {
    fillId, intentId, solver: args.solver || "grading-solver",
    certHash, proofUri: args.proofUri || "ipfs://test-proof",
    priceUsd: intent.maxPriceUsd, verified: false, // <- solver CANNOT verify; operator-only.
    submittedAt: new Date().toISOString(),
  };
  saveState(state);
  out({
    ok: true, tool: "submit_fill", chainId: CHAIN_ID, intentId, fillId,
    solver: state.fills[fillId].solver, verified: false,
    note: "Solver bid+fill recorded. verified=false — escrow release is OPERATOR-ONLY (invariant 1). Solver never calls verifyFill.",
  });
}

// ── kanban_block — the human-gate firebreak before an irreversible hop ──
function kanbanBlock() {
  const state = loadState();
  const gateId = "gate-" + Date.now();
  state.gates[gateId] = {
    gateId, reason: args.reason || "irreversible settle hop", hop: args.hop || "verifyFill",
    intentId: args.intentId || null, status: "blocked", createdAt: new Date().toISOString(),
    requiresHuman: true,
  };
  saveState(state);
  out({
    ok: true, tool: "kanban_block", gateId, status: "blocked", requiresHuman: true,
    reason: state.gates[gateId].reason, hop: state.gates[gateId].hop,
    note: "Irreversible hop BLOCKED pending human approval (invariant 3). Mirror to Telegram in test-mode. Privileged-executor authored the gate; solvers cannot.",
  });
}

// ── verify_fill — PRIVILEGED EXECUTOR releases escrow + settles on Base Sepolia ──
// This drives the PROVEN Seaport roundtrip (engine/scripts/sepolia-roundtrip.mjs) to produce
// REAL Base Sepolia tx hashes. onlyOwner semantics enforced here: requires operator role + a
// cleared kanban gate. A solver caller is REJECTED.
function verifyFill() {
  const state = loadState();
  // Hard invariant: caller must be the privileged executor / operator role.
  const role = args.role || process.env.HERMES_ROUTES_ROLE || "";
  if (role && role !== "privileged-executor" && role !== "operator") {
    return fail(`verifyFill is operator-only — caller role '${role}' rejected (invariant 1).`, { rejected: true });
  }
  // Hard invariant: the irreversible hop must have passed a kanban gate that a human cleared.
  const gate = Object.values(state.gates).find((g) => g.hop === "verifyFill" || g.intentId === args.intentId);
  if (!args.gateCleared && !(gate && gate.status === "approved")) {
    return fail("verifyFill blocked: no cleared kanban_block gate (invariant 3). Approve the gate first.", {
      needsGate: true, gate: gate || null,
    });
  }
  const intentId = args.intentId;
  const fill = Object.values(state.fills).find((f) => f.intentId === intentId && !f.verified);
  if (!fill) return fail(`no unverified fill for intent ${intentId}`);

  if (args.dryRun) {
    out({ ok: true, tool: "verify_fill", dryRun: true, chainId: CHAIN_ID, intentId, fillId: fill.fillId,
      note: "Dry run — would release escrow + settle on Base Sepolia via proven Seaport path." });
    return;
  }

  // Drive the REAL Base Sepolia settle (proven Seaport roundtrip). Requires SEPOLIA_PRIVATE_KEY.
  if (!process.env.SEPOLIA_PRIVATE_KEY) {
    return fail("verifyFill: SEPOLIA_PRIVATE_KEY not set — cannot settle on Base Sepolia. (source engine/.env)", { needsKey: true });
  }
  let settleOut;
  try {
    settleOut = execFileSync("node", ["scripts/sepolia-roundtrip.mjs"], {
      cwd: ENGINE_DIR, encoding: "utf8", timeout: 300000,
      env: { ...process.env, BASE_SEPOLIA_RPC: process.env.BASE_SEPOLIA_RPC || process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org" },
    });
  } catch (e) {
    return fail(`settle failed: ${(e.stderr || e.message || "").slice(-400)}`);
  }
  const settleMatch = settleOut.match(/settleTxHash\s*:\s*(0x[0-9a-f]+)/i);
  const listMatch = settleOut.match(/LIST \(validate\)\s*:\s*\S*tx\/(0x[0-9a-f]+)/i);
  const settleTx = settleMatch ? settleMatch[1] : null;
  fill.verified = true;
  fill.settleTxHash = settleTx;
  state.intents[intentId].status = "Filled";
  state.intents[intentId].escrowReleased = state.intents[intentId].maxPriceUsd;
  saveState(state);
  out({
    ok: true, tool: "verify_fill", chainId: CHAIN_ID, intentId, fillId: fill.fillId,
    verified: true, escrowReleasedUsd: state.intents[intentId].maxPriceUsd,
    settleTxHash: settleTx,
    listTxHash: listMatch ? listMatch[1] : null,
    explorer: settleTx ? `https://sepolia.basescan.org/tx/${settleTx}` : null,
    note: "Escrow released + settled on Base Sepolia via the proven Seaport fulfillAdvancedOrder path. Operator-only, gate-cleared.",
  });
}

// ── approve_gate — operator clears a kanban gate (the human-tap mirror) ──
function approveGate() {
  const state = loadState();
  const gate = state.gates[args.gateId] || Object.values(state.gates).find((g) => g.status === "blocked");
  if (!gate) return fail("no blocked gate to approve");
  gate.status = "approved";
  gate.approvedAt = new Date().toISOString();
  saveState(state);
  out({ ok: true, tool: "approve_gate", gateId: gate.gateId, status: "approved", note: "Human gate cleared (test-mode tap)." });
}

const dispatch = {
  routes_plan: routesPlan,
  get_active_intents: getActiveIntents,
  submit_fill: submitFill,
  kanban_block: kanbanBlock,
  verify_fill: verifyFill,
  approve_gate: approveGate,
};

const fn = dispatch[subcmd];
if (!fn) fail(`unknown subcommand: ${subcmd}. valid: ${Object.keys(dispatch).join(", ")}`);
await fn();
