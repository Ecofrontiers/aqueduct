# ADR-0001 — Commodity-agnostic seams: cards are instance #1, not the engine

> Recorded by the GENERALIZE-SKILLS lane (Hermes-plugin + `engine/sim/` only).
> Scope of this ADR is limited to the two seams this lane is allowed to touch: the
> Hermes **skill/profile** layer and a NEW **`engine/sim/` second-commodity mock**.
> It does NOT modify the RING-2 adapter interfaces, `web/`, or `app/`.

## Status

Accepted (2026-06-24).

## Context

THROUGHLINE B requires the desk to be *generalizable*: graded Pokémon cards must be
**instance #1**, not the engine itself. The build already had three swap seams — the
`DealsAdapter` / `OracleAdapter` / `MarketplaceAdapter` RING-2 interfaces
(`engine/lib/adapters/index.ts`) — and the `AcquisitionDeskOrchestrator`
(`engine/services/orchestrator.ts`) already threads them by **constructor injection**
with zero contract dependency. So the *engine* was already commodity-agnostic in
principle. Two things were NOT yet generalized:

1. **The Hermes skill layer was card-named.** `grading-solver` is described purely as a
   *card grading* specialist (raw→graded, PSA/CGC/BGS, TAG DIG report). Grading is in
   fact one **instance** of a more general hop: *authenticate / verify an asset's
   condition-grade and price the EV of obtaining a higher-confidence attestation.* A
   sealed-sneaker desk authenticates legit-check; a graded-comic desk authenticates a
   CGC/CBCS slab. The capability is the same; only the attestation source differs.

2. **No second commodity had ever been run through the loop.** `engine/sim/synthetic.ts`
   proves the orchestrator at scale, but every fixture is a Pokémon card (NAMES =
   Charizard…, GRADERS = PSA/CGC/BGS, custody = `psa-vault`). A skeptic could argue the
   engine is card-shaped. We needed a *different* commodity, with its own
   Deals/Oracle/Marketplace config, plugged into the **same** orchestrator, to prove it.

## Decision

### D1 — Generalize the skill layer in place (capability, not rules)

`grading-solver` becomes a generic **authenticate/verify** solver. Its SKILL.md is
reframed around "price the EV of obtaining a higher-confidence attestation for an
asset" with grading named as instance #1. The asset-agnostic vocabulary
("asset / attestation / authenticator") replaces hardcoded "card / grade / grader"
where the word was needlessly specific. Planner + acquisition + logistics skill
descriptions are de-carded the same way where "card" was incidental.

**The three PayGuard invariants are unchanged.** The SOUL.md guardrails (no `verifyFill`,
no spend rail, bid-only, quarantine on untrusted content) and `routing.yaml`'s
machine-enforced `tools.include` / `exclude` allowlists are **byte-for-byte untouched in
force** — `grading-solver` still sees `compute_grading_ev`, `submit_fill`,
`get_active_intents` and is still hard-excluded from `verifyFill` / wallet / spend. The
generalization is descriptive (what shape of task activates the skill), never a widening
of authority.

### D2 — Prove generalizability with a second commodity under `engine/sim/`

A NEW mock commodity — **graded comics** (CGC/CBCS-slabbed key issues) — is added as
`engine/sim/comics.ts`: its own `ComicsDealsAdapter` / `ComicsOracleAdapter` /
`ComicsMarketplaceAdapter` implementing the **exact same RING-2 interfaces**, plus a
small commodity config (the asset vocabulary, the authenticator set, the venues). A
runnable script (`engine/sim/run-comics.ts`) constructs the **same**
`AcquisitionDeskOrchestrator` with the comics adapters injected and prints dispositions
+ P&L. No orchestrator code changes; the only delta from cards is the injected config.

This makes the seam claim *demonstrated*, not asserted: same engine, second commodity,
real traces + P&L out the other side.

## Alternatives considered

- **Rewrite the orchestrator to take a `CommodityConfig` parameter.** Rejected — the
  orchestrator is already commodity-agnostic via adapter injection; adding a config param
  would couple it to a commodity *taxonomy* it doesn't need. The adapters ARE the config.
  (Also out of this lane's edit scope — orchestrator.ts is owned elsewhere.)
- **Fork `grading-solver` into a separate `authenticate-solver` profile and deprecate the
  old one.** Rejected for this pass — it would change `routing.yaml`'s profile set and
  risk the attenuation invariants. Generalizing the existing profile's *description* while
  leaving its toolset allowlist identical keeps the three invariants provably intact. A
  future ADR can rename the profile if a non-grading authenticator ships.
- **Use the existing `synthetic.ts` with renamed strings.** Rejected — reusing the same
  file with cosmetic renames wouldn't prove a *different* commodity; it would prove
  cards-with-different-names. A genuinely separate adapter set (different venues, different
  authenticator, different oracle tiers) is the honest proof.

## Consequences

**Positive**
- The engine's commodity-agnosticism is now demonstrated end-to-end, not just argued.
- The skill layer reads as a *template* a cloner can retarget (swap the authenticator +
  the three adapters + the commodity config; keep Hermes + the invariants).
- The three PayGuard invariants are provably preserved (routing.yaml + SOULs untouched).

**Trade-offs / risks**
- `grading-solver`'s file/profile name still says "grading" even though it's now generic.
  Accepted: renaming touches `routing.yaml` and the profile dir, which would put the
  attenuation invariants at risk for a cosmetic gain. Tracked for a later ADR.
- The comics mock reuses card-shaped RING-2 fields (`cardId`, `listingGrade`,
  `psa-vault`) because the interfaces name them that way. This is honest: it shows the
  *existing* interface already carries a second commodity. A pure rename of the interface
  fields (`cardId`→`assetId`) is a RING-2 change owned by another lane; noted, not done.

## Validation criteria

- `node --experimental-strip-types engine/sim/run-comics.ts` runs the SAME
  `AcquisitionDeskOrchestrator` over the comics commodity and prints non-empty traces +
  a portfolio P&L, with at least one `acquired` and the cap firebreak holding.
- `grading-solver` `routing.yaml` stanza is unchanged (diff is empty for the
  `tools.include` / `exclude` blocks).
- The three invariants hold in the comics run: no solver-side `verifyFill`, no over-cap
  commit, irreversible hops still gated (the orchestrator's cap/firebreak path is shared).

## Related decisions

- RING-2 adapter contract: `engine/lib/adapters/index.ts` (the three swap seams).
- Existing scale proof (cards): `engine/sim/synthetic.ts`.
- PayGuard invariants: `hermes-plugin/profiles/routing.yaml`, `hermes-plugin/policy.yaml`.
