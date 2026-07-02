# Institutional policy as a swarm coordination layer

**Status: skunkworks, Phases 0-5 built and verified (2026-07-02).** Still not part of
`FABLE-KICKOFF.md`'s binding gate scope — pulling any of this into the gated demo is a separate
decision — but every mechanism below now exists in the sim layer, not just on paper, and every
verdict it produces is SIM/flag, never asserted LIVE.

**Implementation status:** `sim/failureModes.mjs` (50 catalog entries, not 26 — the README's
count is stale, verified against the actual `FAILURES[]` array), `sim/policy.mjs` (the engine),
`sim/policyConditions.mjs`, `sim/institutionPolicies.mjs` (solver-5 decline generalized,
solver-4 reprice added, Silvi + coop-exporter registered), `sim/policyStressTest.mjs` (Phase 4),
and a cascade B7 beat (Phase 5) are all in place and pass an end-to-end run against both the real
anchor lot and the full seeded synthetic economy. One real finding came out of running Phase 4
for real rather than assuming it would work: `economy.mjs` hardcoded `dds_ref: null` for every
synthetic lot, which made full EUDR confirmation structurally unreachable and flattened
solver-4/5's verdicts to 100% across all 1,250+ lots — fixed at the source (tied `dds_ref` to the
same `eudrReady` flag as the other legality field it documents); post-fix, solver-5 declines
~80% of the synthetic economy and solver-4 reprices the same ~80%, both varying lot-by-lot as
intended. Open items from the doc below (adversarial collusion visibility, no margin floor, no
"has this institution itself been vetted" check) remain open — Phase 4's adversarial archetypes
name them as engine gaps, not solved problems.

## Position

Aqueduct already has one institutional policy decision hardcoded into the sim: `@sim-solver-5`
declines the anchor route because "buyer EUDR-readiness is flagged but not confirmed"
(`solverRoster.mjs:97-113`). That single boolean — `declinesThisRoute: true` — is a real
governance judgment wearing the costume of a demo scripting choice. The claim of this document
is that generalizing it is not a stretch goal, it's the load-bearing feature the "sustainable
commodity investment platform" framing requires: institutions don't trade a commodity, they
trade a commodity *plus a risk opinion about the counterparty and the route*. Right now Aqueduct
computes the commodity leg (landed cost, five solver profiles, one real backstop) and asserts the
risk opinion by fiat, once, for one lot. The fix is to make the risk opinion a first-class,
citable, testable mechanism — the same way the landed-cost function is a first-class, shared,
auditable mechanism every solver bids through (`solverRoster.mjs:1-6`).

Two projects in the portfolio already solved adjacent versions of this problem. Neither should be
copied wholesale; both have a piece worth taking.

## What AGS actually is, and the one piece worth taking

Agent Governance Sandbox (`agent-governance-sandbox.vercel.app`, archived summary at
`frontiers-of-collaboration.tar.gz:agent-governance-sandbox-summary.md`) is a geoprospective
simulator: five Claude-backed agents, each a Camargue stakeholder (rice farmer, salt harvester,
flamingo conservationist, tourism operator, marine biologist), govern 100,000 hectares under four
governance configurations — Tragedy of the Commons, Ostrom's principles, a "Cybernetic DAO" with
quadratic voting and stake slashing, and a real-world PNRC preset. It runs a seven-phase loop per
round — **observe, decide, validate, apply, enforce, regenerate, detect** — tracks eight failure
modes as continuous severity (0–1) with cascade relationships rather than pass/fail, and overlays
replicator dynamics (evolutionary game theory) to check whether the agents' actual emergent
behavior matches the mathematical cooperation prediction for the governance config in force. It
also runs adversarial injection at fixed rates (chaotic agents 20%/round, free-riders 15%/round)
against a UCAN capability-scoped authorization layer, and persists every round as a Storacha/IPFS
CID with Lit Protocol MPC-sealed ballots — "one CID proves persistence, integrity, and
authorization" (summary, §Sponsor Integrations).

The consulting product built on top of it (`ecofrontiers-v2/consulting/pipeline/
ags-consulting-workflow.md`) sells this as a stress test: take a client's real governance
parameters, run them against the sandbox with adversarial agents injected, return a sealed report
against the AI Mechanism Atlas's failure-mode catalog.

**What transfers to Aqueduct:** the loop shape and the discipline of scoring against continuous,
cascading failure severity instead of a single pass/fail gate — and the idea that a policy isn't
trustworthy until it's been run against an adversarial agent trying to break it, not just against
the one lot it was written for.

**What does not transfer:** the full crypto stack (Storacha + Lit MPC + UCAN DIDs), the five
independent stakeholder personas, and definitely the claim of a live AGS integration. Aqueduct's
own honesty-chip system (LIVE/SIM/SNAPSHOT/TESTNET/TO-BUILD) already does the job Storacha+Lit+UCAN
does for AGS — proving what's real — at a fraction of the build cost, and it's the system the
grant demo is gated on. Wiring in a second, unrelated provenance stack (from a different, live,
revenue-generating product) for a skunkworks feature would be exactly the "capability shown live
that isn't" failure this project has already been burned by once (`verify-outcome-not-spec.md`).
If a cryptographic policy-decision log is ever warranted, it should extend the existing chip
vocabulary, not import a second one.

## What the AI Mechanism Atlas actually is, and why it's the right policy library

`aidesignatlas.xyz` (source: `ai-mech-atlas/src/MechanismAtlas.jsx`) catalogs 33 coordination
mechanisms, 26 failure modes, 51 research gaps, and an L0–L5 autonomy taxonomy, all peer-reviewed-adjacent
(each entry cites institutional-economics literature — Williamson, Akerlof, Hurwicz, Ostrom,
Goodhart — not vibes). Every failure mode carries a severity, an `institutionalContext` field
tying it to a named economic mechanism, and a `where` field of observed real-world instances. It's
MIT-licensed and public, same posture as the rest of this stack.

Three entries map onto Aqueduct's existing solver race *without being forced*:

- **`thin-markets`** (High severity): "too few participants produce volatile prices and illiquid
  markets... often result from overly restrictive boundaries... or inadequate contribution
  requirements (allowing free-riding)." The anchor lot is already described in Aqueduct's own code
  comments as a "thin/partial lot" (`solverRoster.mjs:97-100`) — the sim independently arrived at
  the same diagnosis the atlas has a name and citation for, without citing it.
- **`adverse-selection`** (High severity): "Akerlof's 'market for lemons'... signaling mechanisms
  (staking, bonds, reputation) can address adverse selection — but only if signals are costly to
  fake." The backstop solver's design — "code public, margin visible" (`useAqueductEconomy.ts:93`)
  — is exactly this countermeasure, again arrived at independently.
- **`manipulation` / `fee-gaming`** (Critical/High): bid clustering within 1–4% of each other
  (`solverRoster.mjs` header comment) is a manipulation-resistance choice ("no bid as
  price±random," DESIGN-BRIEF §9.7) that the atlas would recognize as a direct countermeasure to
  algorithmic collusion.

The point isn't that Aqueduct needs new ideas from the atlas — three of its real design choices
already anticipate three cataloged failure modes. The point is that right now those choices are
implicit, uncited, and each one-off. Citing them turns "we made this up for the demo" into "this
route's solver profile is a documented response to a named, studied failure mode, here's the
citation" — which is a stronger sentence for a grant reviewer and a stronger sentence for an
institutional counterparty deciding whether to trust the layer.

## The synthesis: Governance Logics Triad as the policy schema

The piece that turns "cite a failure mode" into "gate a route" is the Hierarchy/Market/Network
triad from the Frontiers ideation work (`IDEAS-governance-logics.md`, credited to Timothy
Gieseke): every institution touching a route operates from a natural logic — Hierarchy
(authority/compliance), Market (price/incentive), or Network (trust/reputation) — and
misalignment between logics, not complexity, is what produces wicked failures. The doc's own
worked example is Aqueduct's exact shape:

| Aqueduct actor | Natural logic | What it optimizes |
|---|---|---|
| EUDR / regulator | Hierarchy | legal compliance, plot-level proof |
| Solvers (`solverRoster.mjs`) | Market | landed-cost margin, win rate |
| Cooperative/exporter node (`COOP_EXPORTER_NODE`) | Network | producer standing, community trust |
| Agroforestry lender (`AGROFORESTRY_VENUES`) | Market + Hierarchy | covenant compliance + return |
| Vault/registrar nodes | Hierarchy | audit trail, reputation record |

The ideation doc's proposed safeguard — score every recommendation against all three logics,
require review below a threshold — is the exact mechanism a route-level policy engine needs: not
a single accept/decline bit, but a three-axis score that determines eligibility *and* margin
adjustment.

## Architecture

A policy is `(institution, rule, effect)`, evaluated against the lot's existing schema fields —
no new lot data needed, `eudr`, `certs`, `quality.sca_score`, `origin` already carry what's
required (`useAqueductLots.ts:5-39`).

```
PolicyRule {
  id: string
  citesFailureMode: string        // FAILURES[].id from ai-mech-atlas, e.g. "thin-markets"
  logicScore: { hierarchy, market, network }  // -10..+10 each, per Governance Logics Triad
  condition: (lot) => boolean | number        // eligibility or continuous severity 0-1
  effect: { type: "decline" | "reprice" | "flag", marginAdjustmentBps?: number, note: string }
}

InstitutionPolicy {
  institutionId: string           // solver handle or venue handle
  logicWeights: { hierarchy, market, network }  // this institution's natural logic mix
  rules: PolicyRule[]
}
```

`@sim-solver-5`'s current hardcode becomes `rules[0]` on that solver's policy: citing
`adverse-selection` (not `thin-markets` — on closer read, the atlas's own institutionalContext
for adverse-selection is "signaling mechanisms [...] address it, but only if signals are
costly to fake and informative"; the EUDR fields solver-5 requires — plot geolocation, DDS
reference — are exactly that costly-to-fake signal, so declining until they're confirmed is
the atlas's own prescribed remedy, not just a generic "route is thin" observation), logic score
weighted Hierarchy-heavy, effect `decline` — same behavior, now generalizable to every other
solver and every other lot instead of one boolean on one profile.

**Where it plugs in**, without breaking the existing invariant that every solver bids through the
same deterministic landed-cost function (`solverRoster.mjs:1-6`):

- New `sim/policy.mjs`: `evaluatePolicy(lot, institutionPolicy) → { eligible, marginAdjustmentBps, logicScores, citedFailureMode, note }`.
- `runSolverRace` (`solverRoster.mjs:105-124`) calls it before `computeLandedCost` per solver —
  `declinesThisRoute` becomes a policy verdict instead of a static field, and every other solver
  gets the same treatment even when they don't decline (repricing, not just gating).
- `buildFinanceIntent` (`financeIntent.mjs`) and venue eligibility in `useAqueductEconomy.ts`
  get the same call for the financing-venue side — an agroforestry lender's covenant is a
  `PolicyRule` too.
- `cascade.mjs`'s "verify" chapter (B2/B3, already rendering EUDR PARTIAL honestly,
  `cascade.mjs:69-100`) gets a new beat: the policy verdict, rendered with the same PARTIAL/OK
  status vocabulary already in place — no new UI grammar needed, this is DESIGN-BRIEF's existing
  chip system applied one level deeper.

## The stress-test harness (borrowed shape, not borrowed stack)

Once policy is a function instead of a static flag, it can be tested the way AGS tests governance
configs — but scoped to Aqueduct's own honesty-chip vocabulary, not AGS's crypto stack:

1. **Adversarial injection** — the existing `@sim-solver-2` archetype ("noisy — bids, never wins")
   is already a free-rider analog. Formalize a small set of adversarial solver profiles (chaotic
   bidder, undercutter, collusion pair) and run the race against every SIM lot in the synthetic
   economy, not just the anchor.
2. **Continuous severity, not pass/fail** — score each run's outcome against the cited failure
   mode's severity (0–1), the AGS pattern, instead of a binary "policy worked." A route that
   *barely* clears the landed-cost ceiling under `thin-markets` conditions should show elevated
   severity even if a solver technically won.
3. **Loop-until-dry discovery** — run the race repeatedly across the synthetic lot population
   until no new policy-triggering pattern appears for N consecutive rounds, the standard
   discovery pattern for unknown-size problem spaces, applied here to find which lot/institution
   combinations the policy set doesn't yet cover.

This is deliberately a much smaller ask than AGS's seven-phase loop — Aqueduct's routes are
one-shot (aggregate → verify → price → match → settle), not a multi-round commons simulation, so
"observe/enforce/regenerate" don't have an Aqueduct analog yet. Borrow "decide → validate → apply
→ detect" now; revisit the rest only if Aqueduct grows a repeated-round mechanic (e.g., a vault
with ongoing exposure limits) that actually needs it.

## Grant-narrative fit (no locked text touched)

This strengthens two already-written, unlocked arguments without requiring an edit to Q2(c)
(LOCKED). Q2(a)'s thesis is that judgment — grading, vouching, matching — is the expensive part
AI now does cheaply (`APPLICATION-V2.md:13`); a cited, testable policy library is that thesis
applied to *institutional* judgment, not just lot judgment. Q2(e)'s "no toll, nobody owns it"
argument (`:51`) is stronger if the policies gating routes cite a public, MIT-licensed mechanism
atlas instead of being Ecofrontiers' private rules — same "namespace nobody owns" logic already
applied to the lot identifier scheme (`:49`), extended to the policy layer.

## Guardrails

- Nothing here ships as LIVE. A policy verdict is SIM until an institution's actual stated
  covenant is read from a real document — same discipline as EUDR fields today.
- Do not wire in AGS's crypto stack (Storacha/Lit/UCAN). If policy-decision provenance needs to be
  auditable, extend the existing chip system; don't import a second one for a skunkworks feature.
- Do not claim "we integrated the AI Mechanism Atlas" — cite specific `FAILURES[]` entries by id,
  the way research docs here cite arXiv papers. A citation is not an integration.
- This is additive to the sim layer only. It does not touch `FABLE-KICKOFF.md`'s gate scope unless
  and until Pat decides to pull a phase into the binding plan.

## Implementation plan

**Phase 0 — extraction (no runtime change).** Pull `FAILURES[]`, `MECHS[]` from
`ai-mech-atlas/src/MechanismAtlas.jsx` into a small local reference (`sim/failureModes.mjs`, data
only, MIT attribution kept) so `citesFailureMode` can resolve to real text instead of a string
that only means something to someone who's read the atlas separately.

**Phase 1 — generalize the one hardcode.** Write `sim/policy.mjs` with the schema above.
Reimplement `@sim-solver-5`'s decline as `rules[0]` on its policy object. No visible behavior
change; this is a refactor with a regression check (same lot still produces the same decline).

**Phase 2 — extend to reprice, not just decline.** Give the other four SIM solvers policy
objects too (even empty ones initially), then add one repricing rule — e.g., a solver whose
Hierarchy weight is high should widen `marginBps` (not decline) on EUDR-partial lots. Verify the
solver race still produces the documented win-concentration calibration (research/04 table) with
policy active — policy must not silently break the existing calibration contract.

**Phase 3 — venue-side policy.** Same schema applied to `AGROFORESTRY_VENUES` and
`COOP_EXPORTER_NODE` eligibility in `useAqueductEconomy.ts` — a lender's covenant as a
`PolicyRule`, not a hardcoded eligibility check.

**Phase 4 — stress harness.** Formalize 2-3 adversarial solver archetypes, run against the full
SIM lot population (once that generator exists per the earlier synthetic-economy plan), log
severity per cited failure mode. This is the first point where a Workflow-orchestrated multi-agent
run (adversarial injection, per-lot verdicts) would actually earn its cost — not before Phase 1-3
exist to stress-test.

**Phase 5 — cascade UI beat.** Render the policy verdict as a new beat in the "verify" chapter,
same chip vocabulary, cited failure mode visible on expand — only after Phases 1-3 are real, so
there's something true to show.

Each phase is independently shippable and independently skippable — this is explicitly not an
all-or-nothing skunkworks bet.

## Open questions

1. Does a repricing policy (Phase 2) change the documented win-concentration calibration
   (research/04's "top solver ~45%") enough to need recalibration, or does it stay within noise?
2. Governance Logics Triad scoring (Hierarchy/Market/Network, -10..+10) is a judgment call per
   rule — who assigns those weights, and does that assignment itself need a citation/source the
   way `profile.source` fields already do in `solverRoster.mjs`?
3. Is there a real institutional counterparty (a lender, EthicHub itself) whose actual stated
   policy could replace one SIM policy with a LIVE one before the grant deadline — turning this
   from a skunkworks pattern into an anchor-lot capability, the same way the EUDR fields went from
   spec to real read?

## Sources

**Local corpus**: `solverRoster.mjs`, `venues.mjs`, `cascade.mjs`, `useAqueductEconomy.ts`,
`useAqueductLots.ts` (this repo); `frontiers-of-collaboration.tar.gz:
agent-governance-sandbox-summary.md`, `IDEAS-governance-logics.md` (archived,
`3_archives/frontiers-of-collaboration.tar.gz`); `ecofrontiers-v2/consulting/pipeline/
ags-consulting-workflow.md`; `ai-mech-atlas/src/MechanismAtlas.jsx` (`FAILURES[]`, ids
`thin-markets`, `adverse-selection`, `manipulation`, `fee-gaming`, `pref-manipulation`),
`ai-mech-atlas/README.md`, `ai-mech-atlas/DATA_AGENTS_TAXONOMY.md`.

**Cited within the atlas** (secondary, via `institutionalContext` fields): Williamson,
transaction cost economics; Akerlof, "market for lemons"; Hurwicz, mechanism design; Ostrom,
commons governance principles; Goodhart's Law.
