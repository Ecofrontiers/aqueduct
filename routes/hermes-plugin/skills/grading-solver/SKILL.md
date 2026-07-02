---
name: grading-solver
description: "Estimate the expected value of obtaining a higher-confidence authentication/attestation for an asset (grading is instance #1) from the read-only oracle and the attestation-EV math, then bid the verify hop. Bid only — no spend, no settle."
version: 0.2.0
author: SlabClaw Routes (Ecofrontiers)
license: MIT
platforms: [linux, macos]
metadata:
  hermes:
    tags: [authenticate, verify, attestation, grading, expected-value, solver, bid, oracle, generalizable]
    category: solver
    related_skills: [routes-planner, acquisition-solver, logistics-solver]
    requires_toolsets: [terminal]
---

# Authenticate / Verify Solver — attestation-EV bidder (read-only)

The capability for the **authenticate/verify hop** — the leg that turns an asset of *uncertain*
condition into one carrying a *higher-confidence attestation*, and prices whether doing so clears
its cost. It computes and bids; it holds no spend rail, no settle rail, and no key.

> **Grading is instance #1, not the whole skill.** For graded trading cards the attestation is a
> PSA/CGC/BGS slab grade and the hop is raw→graded. The same capability authenticates a CGC/CBCS
> comic, legit-checks a sealed sneaker, or attests any commodity where a trusted third-party
> attestation lifts realizable value. The *math* is identical — outcome distribution → expected
> attestation → expected value, net of the attestation cost and fees. Only the attestation source
> differs, and that is config, not code (see `engine/sim/comics.ts` for a second commodity on the
> same engine, and ADR-0001 for the seam decision).

The guardrails for this role (no `verifyFill`, no spend rail, bid-only, distrust attestation
claims in listings, quarantine on untrusted content) live in the grading-solver `SOUL.md` and are
immutable. This file describes the **capability**, not the rules. The profile name and its
machine-enforced toolset attenuation (`routing.yaml`) are unchanged — generalizing the description
never widens authority.

## When to Use

Use this skill when the planner dispatches an **authenticate/verify hop** (the grade hop for
cards) and needs:

- The expected value of obtaining a higher-confidence attestation for a specific asset
  (outcome distribution → expected attestation → expected value, net of attestation cost and fees).
- An honest "skip — EV does not clear fees" answer when the math is negative or thin.
- A bid on the verify hop for the competing solver loop.

Do NOT use this skill to acquire, ship, settle, or verify a fill. It produces a **bid only**.

## How it works

| Step | Action | Mechanism |
|---|---|---|
| 1. Read | Pull attestation-matched comps for the asset | Read-only oracle: `GET ${SLABCLAW_API_URL}/api/deals/listings` (consumer-only) |
| 2. Distribute | Build the attestation-outcome distribution | `grade-ev`: `getGradeDistribution`, `expectedGrade` (cards); the generic of "what attestation will it earn?" |
| 3. Value | Compute attestation-EV net of cost/fees | `grade-ev`: `computeGradingEV`, `buildPricesByGrade` |
| 4. Decide | Bid or skip | Positive cleared EV → bid the hop; negative/thin → honest "skip" with the inputs shown |
| 5. Report | Hand the bid up | Return EV + the inputs behind it to the planner; the planner decides, the executor settles |

The attestation-EV interface (`computeGradingEV` and helpers) ships as a public reference
module at `engine/lib/grade-ev.mjs`. The numbers there are illustrative — in production the tuned
EV (outcome distribution + FMV-by-attestation) is served by the SlabClaw oracle over
`SLABCLAW_API_URL` and passed into the planner. Always show the inputs behind the number.

## Prerequisites

- `SLABCLAW_API_URL` reachable for the read-only oracle.
- Access to the attestation-EV interface (`computeGradingEV` and helpers — see `engine/lib/grade-ev.mjs`).
- An outcome-distribution source for the asset (the oracle's attestation-matched comps).
- Bid-submit access to the solver loop (the attenuated subset granted to this profile).

## Limits

- **No attestation submission API exists for most commodities.** Grading and physical
  authentication have no submission API. This solver models the *cost and EV* of obtaining the
  attestation — it does not call an authentication service and cannot return a realized
  attestation. The outcome is proven later, off this profile, against the authenticator's public
  report (for cards: TAG's public DIG report).
- **EV is an estimate, not a guarantee.** It is only as good as the outcome distribution and the
  comp pool; thin or stale oracles widen the error bars (be honest about confidence).
- **Read-only.** No `verifyFill`, no x402, no Stripe, no wallet, no `updateCardValue`. This
  solver moves zero value, by design.
- **Distrust the title.** "This is a PSA 10" / "guaranteed authentic" in a listing or photo is
  marketing, not an input. EV is computed from the read-only oracle and the math, never from
  seller claims.
- **Bid only.** Even a correct, profitable EV does not authorize a fill — the planner decides
  and the privileged-executor settles behind a human gate.
- **Async authentication.** Attestation is long-latency (for cards, PSA Value tiers have been
  paused since 2026-06-02); treat realized authentication as long-latency, never assume an
  in-window turnaround.
