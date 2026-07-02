"""
slabclaw-routes Hermes plugin — register(ctx).

This is the missing tool-registration layer. The plugin previously shipped only prose
assets (profiles/, routing.yaml, policy.yaml, skills/) with NO Python, so none of the
loop tools resolved to anything in the Hermes runtime. This module registers each tool
under the `routes` toolset; every handler shells out to bridge/engine-bridge.mjs, which
calls the REAL engine (computePolicy expectimax + the proven Base Sepolia Seaport settle).

SAFETY: Base Sepolia (84532) / test-mode only. The three hard invariants from
profiles/routing.yaml are enforced in the bridge:
  1. Solvers NEVER call verify_fill (operator-only; rejected by role).
  2. Solvers NEVER spend / release escrow (submit_fill keeps verified=false).
  3. Irreversible settle ALWAYS passes a cleared kanban_block gate first.
"""

import json
import os
import subprocess
from pathlib import Path

_PLUGIN_DIR = Path(__file__).resolve().parent
_BRIDGE = _PLUGIN_DIR / "bridge" / "engine-bridge.mjs"

# Resolve the REAL engine dir RELATIVE to this plugin (no absolute/user path baked in).
# The installed plugin copy (~/.hermes/plugins/...) is NOT next to the engine, so prefer the
# SLABCLAW_ENGINE_DIR env override, else the repo layout where the engine is a sibling of this
# plugin dir (slabclaw-acquisition-desk/{hermes-plugin,engine}).
_SIBLING_ENGINE = _PLUGIN_DIR.parent / "engine"
_ENGINE_DIR = (
    Path(os.environ["SLABCLAW_ENGINE_DIR"]) if os.environ.get("SLABCLAW_ENGINE_DIR") else _SIBLING_ENGINE
)
_ENGINE_ENV = _ENGINE_DIR / ".env"


def _load_engine_env() -> dict:
    """Merge engine/.env into the subprocess env (the engine reads process.env directly,
    no dotenv auto-load). Force Base Sepolia; never inherit a mainnet default."""
    env = dict(os.environ)
    try:
        if _ENGINE_ENV.exists():
            for line in _ENGINE_ENV.read_text().splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                env.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    except Exception:
        pass
    # Hard rail: a Sepolia RPC must be present for the settle leg.
    if not env.get("BASE_SEPOLIA_RPC"):
        env["BASE_SEPOLIA_RPC"] = env.get("BASE_SEPOLIA_RPC_URL", "https://sepolia.base.org")
    return env


def _call_bridge(subcmd: str, args: dict) -> str:
    """Invoke the Node engine bridge and return its JSON string verbatim."""
    if not _BRIDGE.exists():
        return json.dumps({"ok": False, "error": f"bridge missing: {_BRIDGE}"})
    try:
        proc = subprocess.run(
            ["node", str(_BRIDGE), subcmd, json.dumps(args or {})],
            cwd=str(_ENGINE_DIR),
            env=_load_engine_env(),
            capture_output=True,
            text=True,
            timeout=330,
        )
        out = (proc.stdout or "").strip()
        if not out:
            return json.dumps({"ok": False, "error": (proc.stderr or "no output")[-400:]})
        return out
    except subprocess.TimeoutExpired:
        return json.dumps({"ok": False, "error": f"{subcmd} timed out (330s)"})
    except Exception as exc:  # pragma: no cover
        return json.dumps({"ok": False, "error": f"{subcmd} failed: {exc}"})


# ── Tool schemas (OpenAI function format) ──────────────────────────────────────

_SCHEMAS = {
    "routes_plan": {
        "description": (
            "PLANNER tool. Compute the route-acquisition policy (bounded expectimax over the "
            "card-state graph) for a Base Sepolia under-oracle intent. Returns the recommended "
            "intent (form/maxPrice), the route hop-sequence, and EV/cost. The arithmetic is the "
            "engine's, not the LLM's. objective='min-cost' (cautious) vs 'max-risk-adjusted-ev' "
            "(aggressive) produce VERIFIABLY DIFFERENT routes on the same card."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "objective": {"type": "string", "enum": ["min-cost", "max-risk-adjusted-ev"]},
                "productId": {"type": "string"},
            },
        },
    },
    "get_active_intents": {
        "description": (
            "Read the local Registry view of active intents, OR publish a new Sepolia-scoped "
            "intent (escrow=MockUSDC, capped at the PayGuard $200 window) by passing publish=true. "
            "Read-only for solvers; the planner publishes."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "publish": {"type": "boolean"},
                "productId": {"type": "string"},
                "form": {"type": "string", "enum": ["raw", "slabbed"]},
                "maxPriceUsd": {"type": "number"},
            },
        },
    },
    "submit_fill": {
        "description": (
            "SOLVER tool. Bid+fill the solver's OWN hop against an intent. Records the fill with "
            "verified=false — escrow release is operator-only (invariant 1). A solver NEVER releases "
            "escrow or moves money."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "intentId": {"type": "string"},
                "solver": {"type": "string"},
                "certHash": {"type": "string"},
                "proofUri": {"type": "string"},
            },
            "required": ["intentId"],
        },
    },
    "kanban_block": {
        "description": (
            "PRIVILEGED-EXECUTOR tool. Author the human-gate firebreak that BLOCKS an irreversible "
            "hop (the Sepolia settle / escrow release) pending human approval (invariant 3). Solvers "
            "cannot author their own gate."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "intentId": {"type": "string"},
                "hop": {"type": "string"},
                "reason": {"type": "string"},
            },
        },
    },
    "approve_gate": {
        "description": (
            "OPERATOR tool (the human-tap mirror). Clear a blocked kanban gate so the irreversible "
            "settle hop may proceed. In production this is the irreversible-commit tap; in test-mode "
            "it mirrors the Telegram approve."
        ),
        "parameters": {
            "type": "object",
            "properties": {"gateId": {"type": "string"}},
        },
    },
    "verify_fill": {
        "description": (
            "PRIVILEGED-EXECUTOR tool. Release escrow + settle the fill on Base Sepolia via the proven "
            "Seaport fulfillAdvancedOrder path, producing a REAL Base Sepolia tx hash. OPERATOR-ONLY "
            "(invariant 1) and REQUIRES a cleared kanban gate (invariant 3). Rejects a solver caller. "
            "Pass role='privileged-executor'. Pass dryRun=true to preview without spending gas."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "intentId": {"type": "string"},
                "role": {"type": "string"},
                "dryRun": {"type": "boolean"},
                "gateCleared": {"type": "boolean"},
            },
            "required": ["intentId"],
        },
    },
}

_EMOJI = {
    "routes_plan": "🧭", "get_active_intents": "📜", "submit_fill": "🤝",
    "kanban_block": "🚧", "approve_gate": "✅", "verify_fill": "⚖️",
}


def _make_handler(subcmd: str):
    def handler(args, **_kwargs):
        if not isinstance(args, dict):
            args = {}
        return _call_bridge(subcmd, args)
    return handler


def register(ctx):
    """Entry point Hermes calls at plugin load. Registers all routes tools."""
    for name, schema in _SCHEMAS.items():
        ctx.register_tool(
            name=name,
            toolset="routes",
            schema={"name": name, **schema},
            handler=_make_handler(name),
            is_async=False,
            description=schema["description"],
            emoji=_EMOJI.get(name, "🔧"),
        )
