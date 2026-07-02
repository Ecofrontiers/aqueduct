---
name: comics-authenticate-solver
description: "SECOND-COMMODITY proof skill — bid the authenticate/verify hop for graded comics (CGC/CBCS key issues) on the SAME engine as cards. Estimate attestation-EV from the read-only oracle, then bid. Bid only — no spend, no settle."
version: 0.1.0
author: SlabClaw Routes (Ecofrontiers)
license: MIT
platforms: [linux, macos]
metadata:
  hermes:
    tags: [authenticate, verify, attestation, comics, cgc, cbcs, expected-value, solver, bid, generalizable, second-commodity]
    category: solver
    related_skills: [routes-planner, grading-solver, acquisition-solver, logistics-solver]
    requires_toolsets: [terminal]
---

# Comics Authenticate Solver — the second-commodity proof (read-only)

This skill exists to **prove THROUGHLINE B** (generalizable): the desk is not card-specific. It
is the comics instantiation of the generic authenticate/verify hop — the same capability as
`grading-solver`, retargeted from PSA/CGC/BGS card grades to **CGC/CBCS comic-book grades** (the
0.5–10.0 comic scale). It runs on the **identical** `AcquisitionDeskOrchestrator`; only the
injected adapters + a commodity config differ.

> **Same engine, different commodity.** The runnable proof lives at
> `engine/sim/comics.ts` + `engine/sim/run-comics.ts`:
> `node --experimental-strip-types engine/sim/run-comics.ts` runs the unmodified orchestrator
> over hundreds of synthetic graded comics and prints dispositions + P&L. The seam decision is
> recorded in `engine/sim/ADR-0001-commodity-agnostic-seams.md`.

The guardrails for this role are **inherited verbatim from the grading-solver `SOUL.md`** and the
machine-enforced `routing.yaml` attenuation — this skill adds NO authority. It is dispatched under
the SAME attenuated `grading-solver` profile (the verify-hop profile); it does not introduce a new
toolset, a new spend rail, or a new key. Generalizing to a second commodity never widens authority.

## When to Use

Use this skill when the planner dispatches an **authenticate/verify hop for a comic** and needs:

- The expected value of obtaining (or confirming) a CGC/CBCS attestation for a specific comic
  (grade-outcome distribution → expected attestation → expected value, net of cost and fees).
- An honest "skip — EV does not clear fees" answer when the math is negative or thin.
- A bid on the verify hop for the competing solver loop.

Do NOT use this skill to acquire, ship, settle, or verify a fill. It produces a **bid only**.

## How it works (identical shape to grading-solver — only the attestation differs)

| Step | Action | Mechanism |
|---|---|---|
| 1. Read | Pull attestation-matched comps for the comic | Read-only oracle (`ComicsOracleAdapter` in the sim; GoCollect-style sold comps in production) |
| 2. Distribute | Build the grade-outcome distribution | `grade-ev` (the generic attestation-EV math — same module the card hop uses) |
| 3. Value | Compute attestation-EV net of cost/fees | `grade-ev`: `computeGradingEV`, `buildPricesByGrade` |
| 4. Decide | Bid or skip | Positive cleared EV → bid; negative/thin → honest "skip" with the inputs shown |
| 5. Report | Hand the bid up | Return EV + inputs to the planner; the planner decides, the executor settles |

## What is the SAME as the card hop (the seam that makes this work)

- The RING-2 interfaces (`DealsAdapter` / `OracleAdapter` / `MarketplaceAdapter`).
- The orchestrator's oracle-as-suspect gate, grade-match gate, BUY/SKIP brain slot, routes-plan,
  best-net-exit, the D11 cap firebreak, the re-route lifecycle (ship-in → vault mint), and P&L.
- The three PayGuard invariants (the orchestrator's shared cap/firebreak path — verified to hold
  on the comics run: no over-cap commit, no solver-side `verifyFill`, irreversible hops gated).

## Limits

- **Same as grading-solver, on comics.** No attestation submission API; EV is an estimate, not a
  guarantee; read-only (no `verifyFill` / x402 / Stripe / wallet); distrust "guaranteed CGC 9.8"
  title claims; bid only; authentication is async/long-latency.
- **The sim is SYNTHETIC (P7).** `engine/sim/comics.ts` settles in MockUSDC
  (`mockusdc:comic:…`) and never touches a network, a chain, or real funds. It proves the engine
  is commodity-agnostic — it is not a live comics desk.
