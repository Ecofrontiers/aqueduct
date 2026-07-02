---
name: routes-planner
description: "Plan an asset's movement as a conditional MDP policy (routes_plan) — graded cards are instance #1 — seed intents, and dispatch heterogeneous solvers to bid each hop."
version: 0.1.0
author: SlabClaw Routes (Ecofrontiers)
license: MIT
platforms: [linux, macos]
metadata:
  hermes:
    tags: [planner, mdp, expectimax, routes, intent, kanban, orchestration, generalizable, slabclaw]
    category: orchestration
    related_skills: [acquisition-solver, grading-solver, logistics-solver]
    requires_toolsets: [terminal]
---

# Routes Planner — conditional asset-movement policy

The orchestrator capability for SlabClaw Routes. Given an acquire intent, it computes a
**conditional movement policy** over the asset-state MDP (a bounded in-process expectimax,
not a shortest path), publishes the resulting intents to the local Registry, and dispatches
the right solver to bid each hop. It plans and decides; it never settles.

> **Graded cards are instance #1.** The MDP is over an *asset's* state (source → authenticate →
> custody → exit); the card branches (grade≥9 → Vault / =8 → Relist / ≤7 → crack & sell raw) are
> one commodity's instantiation. A second commodity (graded comics) runs the identical engine —
> only the injected adapters + a commodity config differ (`engine/sim/comics.ts`, ADR-0001).

The guardrails for this role (no signer key, no `verifyFill`, human-gate before any
irreversible hop, quarantine on untrusted content) live in the planner `SOUL.md` and are
immutable. This file describes the **capability**, not the rules.

## When to Use

Use this skill when you need to:

- Turn a `BUY` spread from the spread-detector into an executable route.
- Compute the **landed** ceiling for an intent (oracle value minus the chosen branch's landed
  cost), so an intent never publishes at a naked listing price.
- Build the route as a Kanban DAG and dispatch one solver per hop by `--description` match.
- Re-plan / re-route after a solver returns "skip," a gate is rejected, or a grade resolves.

Do NOT use this skill to fill a hop, move value, or verify a fill — those are the solver and
privileged-executor roles. The planner produces a plan + intents + dispatch, nothing more.

## How it works

| Step | Action | Mechanism |
|---|---|---|
| 1. Detect | Read `BUY` spreads from the cross-marketplace oracle | `GET ${SLABCLAW_API_URL}/api/deals/listings` → `spread-detector.ts` (consumer-only; never the marketplace API) |
| 2. Plan | `routes_plan(intent)` → conditional policy | In-process TS bounded expectimax over the card-state MDP (`services/routes-planner.ts`); branches on grade≥9 → Vault / =8 → Relist / ≤7 → crack & sell raw |
| 3. Price | Subtract chosen branch landed cost from oracle value | Intent publishes at the **landed ceiling**, not the listing price |
| 4. Seed | Stage acquire + paired sell-leg intents | Handed to the privileged-executor to publish via `Registry7683Adapter` (the planner does not publish/escrow itself) |
| 5. Dispatch | One solver per hop, attenuated | `kanban_create(parents=[...])` builds the route DAG; route each hop to the solver whose `--description` matches the hop type |
| 6. Gate | Stage irreversible hops behind the human gate | `kanban_block(reason)` before any Vault / Tokenize / Redeem / out-of-envelope spend |
| 7. Re-plan | Re-weight branch probabilities after each hop result | Render live branch odds on the board; re-route on skip/reject |

Routing rule: run **≥3 heterogeneous solver models** (a distinct model per solver role) to
avoid diversity collapse — single-model "diversity prompting" recovers only ~50–55% of the
strategy space; distinct models recover ~74%.

## Prerequisites

- `SLABCLAW_API_URL` reachable (the live oracle DETECTOR feeding the spread-detector).
- The 6 FLOOR contracts deployed and wired in order; **the
  `Registry7683Adapter` `Open` event must fire** or the solver loop never starts — confirm it
  before planning a loop.
- `NVIDIA_API_KEY` for the Nemotron buy/skip brain (reasoning model
  `nvidia/nemotron-3-super-120b-a12b` at NVIDIA NIM, OpenAI-compatible `/chat/completions`,
  Bearer auth). Env is loaded by first-token parse of the routes env file; never print secrets.
- Kanban available (the route DAG and the demo command center are the same board).
- Solver profiles installed (`planner`, `acquisition-solver`, `grading-solver`,
  `logistics-solver`, `privileged-executor`) so dispatch can attenuate per hop.

## Limits

- **Plans against the local Registry only.** Intents read from a third-party feed are not
  authoritative; the planner never treats an external price/grade as the intent of record.
- **No settlement, ever.** The planner holds no signer/owner/operator key and cannot call
  `verifyFill` / `submitFill` / x402 / Stripe. If the plan needs value to move, it stages a
  hop and stops at the human gate.
- **Grading is modeled, not called.** No grader submission API exists anywhere; `routes_plan`
  models grading cost/latency and the outcome is proven later against TAG's public DIG report.
- **Async grading by design.** PSA Value tiers have been paused since 2026-06-02; the planner
  must treat grading as async (the demo uses an already-graded TAG slab to avoid turnaround).
- **Expectimax is bounded.** The policy is a depth/branch-bounded approximation, not a global
  optimum — it prefers the boring correct route over the clever one.
- **Dispatch is advisory until escrow is live.** A dispatched hop is not "in flight" until the
  privileged-executor publishes the intent and the adapter `Open` event fires.
