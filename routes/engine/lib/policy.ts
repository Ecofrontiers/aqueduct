/**
 * policy.ts — read the D11 spend-cap firebreak from `hermes-plugin/policy.yaml`.
 *
 * The orchestrator threads the per-card cap into `MarketplaceAdapter.acquire`'s `maxUsd`
 * (the engine guard already block-or-commits before staging; this WIRES the real policy
 * value in). The window cap is the rolling envelope across the whole demo budget.
 *
 * D11 (FINAL-SPEC): the agent SELF-APPROVES any in-cap spend with NO per-spend human tap —
 * the cap is the ONLY firebreak. This module surfaces:
 *   - perCardCapUsd  : hard ceiling for a single acquisition's landed cost (the acquire() cap).
 *   - windowCapUsd   : rolling per-window envelope (the budget guardrail).
 *   - windowHours    : the window length.
 *   - selfApprove    : D11 — true means in-cap spends commit with no operator stamp.
 *   - mode           : 'test' | 'live' — gates the trust line.
 *
 * ── PARSER posture (honesty) ────────────────────────────────────────────────────────
 * We do NOT vendor a YAML dependency. This is a MINIMAL, TARGETED parser that reads the
 * exact nested keys the engine needs from our own first-party policy.yaml (a flat
 * indentation-scoped key walk). It is deliberately NOT a general YAML implementation — it
 * resolves only `spend_policy.caps.per_card.amount_usd`, `spend_policy.caps.window.cap_usd`
 * / `window_hours`, `spend_policy.approval.self_approve`, and `spend_policy.mode`. If a
 * required cap is absent, `loadSpendPolicy` returns it as `undefined` so the orchestrator
 * can FAIL CLOSED (it never invents a cap).
 */
import { readFileSync, existsSync } from "node:fs";

/** The resolved spend policy the orchestrator enforces (D11). */
export interface SpendPolicy {
  /** Per-card landed-cost ceiling (USD) — threaded into acquire()'s `maxUsd`. undefined ⇒ no cap (fail-closed). */
  perCardCapUsd?: number;
  /** Rolling per-window budget envelope (USD). undefined ⇒ unbounded window (still gated by perCard). */
  windowCapUsd?: number;
  /** Window length in hours (default 24 when absent). */
  windowHours: number;
  /** D11 self-approval flag — true ⇒ in-cap spends commit with NO per-spend tap. */
  selfApprove: boolean;
  /** 'test' | 'live' — gates the trust line. */
  mode: string;
  /** Provenance: the file the policy was read from (or '(defaults)' when no file). */
  source: string;
  /** Honesty label (P7): whether a real policy.yaml was parsed or defaults were used. */
  resolved: "policy.yaml" | "defaults";
}

/** Default policy.yaml location: <repo>/hermes-plugin/policy.yaml relative to engine/lib/. */
const DEFAULT_POLICY_PATH = new URL("../../hermes-plugin/policy.yaml", import.meta.url).pathname;

/**
 * Minimal indentation-scoped YAML key walk. Returns the scalar at a dotted key path
 * (e.g. "spend_policy.caps.per_card.amount_usd") or undefined if any segment is missing.
 *
 * Handles ONLY the subset our first-party policy.yaml uses: 2-space-indented nested maps
 * with `key: value` scalars. Comments (`#...`), blank lines, and list items (`- ...`) are
 * skipped. Inline ` #` comments are stripped from a value. Quotes are trimmed.
 */
export function readYamlScalar(yaml: string, dottedKey: string): string | undefined {
  const wantPath = dottedKey.split(".");
  const lines = yaml.split("\n");
  // Track the current key at each indentation depth (depth = indent/2).
  const stack: string[] = [];

  for (const rawLine of lines) {
    // strip a full-line or inline comment, but only a ` #` (preserve '#' inside a value/url)
    let line = rawLine.replace(/\t/g, "  ");
    if (line.trim() === "" || line.trim().startsWith("#")) continue;
    if (line.trim().startsWith("- ")) continue; // list item — not a map key

    const indent = line.length - line.trimStart().length;
    const depth = Math.floor(indent / 2);
    const content = line.trim();
    const colon = content.indexOf(":");
    if (colon < 0) continue;

    const key = content.slice(0, colon).trim();
    let value = content.slice(colon + 1);
    const hashIdx = value.indexOf(" #");
    if (hashIdx >= 0) value = value.slice(0, hashIdx);
    value = value.trim().replace(/^["']|["']$/g, "");

    // unwind the stack to this depth, then set the key at this depth
    stack.length = depth;
    stack[depth] = key;

    // Build the full path at this node and compare to the wanted path.
    if (value !== "" && stack.length === wantPath.length && stack.every((k, idx) => k === wantPath[idx])) {
      return value;
    }
  }
  return undefined;
}

function toNumber(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function toBool(v: string | undefined): boolean | undefined {
  if (v === undefined) return undefined;
  const s = v.toLowerCase();
  if (s === "true") return true;
  if (s === "false") return false;
  return undefined;
}

/**
 * Load + parse the D11 spend policy from policy.yaml. When the file is absent (a cloner
 * who hasn't wired a policy yet), returns conservative defaults with `resolved: 'defaults'`
 * and NO perCardCap (so the orchestrator fails closed — it never invents a spend ceiling).
 */
export function loadSpendPolicy(path: string = DEFAULT_POLICY_PATH): SpendPolicy {
  if (!existsSync(path)) {
    return {
      perCardCapUsd: undefined, // no policy file ⇒ no cap ⇒ orchestrator fails closed
      windowCapUsd: undefined,
      windowHours: 24,
      selfApprove: false,
      mode: "test",
      source: "(defaults)",
      resolved: "defaults",
    };
  }
  const yaml = readFileSync(path, "utf-8");
  return {
    perCardCapUsd: toNumber(readYamlScalar(yaml, "spend_policy.caps.per_card.amount_usd")),
    windowCapUsd: toNumber(readYamlScalar(yaml, "spend_policy.caps.window.cap_usd")),
    windowHours: toNumber(readYamlScalar(yaml, "spend_policy.caps.window.window_hours")) ?? 24,
    selfApprove: toBool(readYamlScalar(yaml, "spend_policy.approval.self_approve")) ?? false,
    mode: readYamlScalar(yaml, "spend_policy.mode") ?? "test",
    source: path,
    resolved: "policy.yaml",
  };
}
