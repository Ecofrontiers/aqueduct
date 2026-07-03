# 12 — The value-chain thesis: REA as the actual data model, a swarm DSS as the category

Written 2026-07-03. This doc exists so the About page and future work can point at one
argument instead of re-deriving it. It also **supersedes** (does not delete — provenance
discipline) three specific claims in `11-glow-primitive-scoping.md`, marked § Corrections
below, based on a live probe run the same day (raw outputs archived in the session
scratchpad; key facts reproduced here with addresses).

## 1. The question this answers

"Did we really build this, or are we holding onto too much of the previous build?" The
audit answer was structural: the map still spoke base-Atlas's ontology. The deeper answer
is this doc: AqueductX's types were already an *unlabeled* REA model, and labeling it is
what turns "map the value chain" from a slogan into schema decisions — including one typed
object (the Claim) that was missing entirely and is now built.

## 2. REA/Valueflows mapping — what exists, what was missing

REA (Resource–Event–Agent; McCarthy 1982, operationalized by Valueflows and hREA on
Holochain, in the SENSORICA/Nondominium lineage) models any economy as Agents making
Commitments about Resources, fulfilled by
Economic Events, with **Claims** carrying deferred reciprocity.

| REA concept | AqueductX today | Status |
|---|---|---|
| **Economic Resource** | `AqueductAnyLot` (a lot: commodity, weight_kg) | Was outputs-only. Now inputs are typed too: `inputResource: {resourceType, quantity, unit}` on finance intents (seedlings, solar fractions) — `financeIntent.mjs`. |
| **Agent** | `AqueductActor` (coop/venue/solver/infrastructure) + hubs | Complete as-is. |
| **Commitment** | `AqueductIntent` (`sell-this-lot`, `finance-this-planting`, `finance-this-farm`) | Present; now explicitly documented as Commitments differing in which side is deferred. |
| **Economic Event** | `AqueductEvent` (now merged with `ledger.json`'s real per-event source URLs) | Present. Known gap, accepted: free-text `verb` (not Valueflows' controlled vocabulary), single `actor` (no provider/receiver split). |
| **Claim** | **Was missing entirely — now typed.** `claim: {principalEur, aprPct, termMonths}` / `{principalUsd, glwPerWeek, termWeeks}`, confidence-tagged | The load-bearing addition, §3. |

Out of scope, deliberately: renaming Aqueduct types to literal REA names (a naming
exercise touching 6+ files with no behavior change), and adopting hREA/Holochain as
runtime (a real technology decision, not a filter-bar pass).

## 3. The Claim is the whole point

A `sell-this-lot` intent is a near-spot reciprocal exchange: lot for capital, roughly
concurrent. A `finance-this-planting` intent is **not** — capital moves now, repayment
happens later, at a rate and term. REA calls the deferred half a Claim, and AqueductX's own
anchor data already contained a *redeemed* one: EthicHub Line 2's real repay cycle,
192,600 → 212,369.79 USDC. The typed claim uses EthicHub's real cited rate ceiling
(Heifer/EthicHub facility: **9.9%**, $420,000 — application Q2(b) research) with
`confidence: "reported"`, matching the confidence-tagging convention
(`commodity-landed-cost.mjs`: confirmed / reported / estimate). No invented numbers.

This is why the two intent kinds are the same species, not two ad hoc features: both are
reciprocal-exchange Commitments; they differ only in which side is immediate and which is
a Claim. The About page states this in one sentence; this doc is the derivation.

## 4. The category: a swarm decision-support system for agricultural trade finance

Pat's framing ("we're sort of a swarmDSS at the end of the day") holds up as the sharpest
category description, used as a spelled-out phrase, never an acronym: aggregate, verify,
price, and match are classic decision-support functions — performed here by a swarm of
small, single-purpose agents instead of one intermediary — feeding a human/institutional
capital-allocation decision, with settlement as the action taken. This is also the honest
differentiation from "another marketplace": marketplaces intermediate; a DSS informs a
decision someone else owns. The trade-finance precedent supports the modesty: platforms
that put a network-graph metaphor first (Marco Polo) went insolvent; the ones that survive
(C2FO, Taulia) present named rate tiers and decomposed risk fields. AqueductX's map is a
reading instrument, not the product's claim to intermediation.

Design consequences already encoded (from the research pass):
- **Kiva's ask template** — a concrete single-sentence ask ("€1,120 helps [community]
  plant 1,200 shade-grown seedlings") with real computed numbers; risk decomposed into
  named fields, never one opaque score. Labeled an AqueductX-designed convention:
  EthicHub's real UI (Lending Pools → Credit Lines → Crowd Collateral) publishes no
  per-farmer dollar-ask card — this is our design choice, honestly owned.
- **Identity vs status, two decoupled channels** (LLNL/ONS Sankey practice): icon+color =
  stable identity, ring solid/dashed = transient status. Implemented in
  `AqueductNodeGlyph` + `NodeRing`.
- **Cluster below, individuate above** (FlightRadar24/MarineTraffic/Supercluster):
  institution markers aggregate to "N institutions" pills at world zoom, resolve to
  glyphs at street zoom.
- **Need as fill-boundary, settled as terminal treatment** (DonorsChoose/carbon
  registries): open = dashed ring on the same object, filled/settled = solid — never a
  separate marker type.

## 5. Glow: the same loop on solar — now a live-read second vertical

Decision 2026-07-03 (Pat, overriding doc 11's demo-exclusion): Glow renders as a full,
visible second vertical. The structural mapping is exact — farms = lots, GCA/GVE drone
audits = the certifier role (`GLOW-GCA` source in `standardsRegistry.mjs`), GLW delegation
= `finance-this-farm` (the direct analog of `finance-this-planting`), and a **Miner** — a
fractional claim on a farm's reward stream — is literally the structured receivable the
tokenizer race sims. The narrative: same loop, two commodities — one settled over oceans,
one over wires.

Probe-verified state (2026-07-03), which is also the honesty boundary:

| Channel | State | Chip |
|---|---|---|
| Farm data (124 farms, coords/panels/wattage) | `glow.org/api/audits` alive; schema drifted to nested `summary.*` (connector remapped) | LIVE → dated SNAPSHOT |
| Weekly output/payment (150 farms) | R2 archives fresh to week 135 (~2wk finalize lag, normal) | SNAPSHOT |
| GLW price | UniV2 GLW/USDG pool `0x6fa09ffc45f1ddc95c1bc192956717042f142c5d`: ≈$0.2825, ~$280k depth | LIVE/SNAPSHOT |
| GCC price | **No usable register today**: auction (real address `0x85fbB04DEBBDEa052a6422E74bFeA57B17e50A80`) drained to getPricePerUnit()=0; USDG/GCC pool ~$222 dust | SIM / TO-BUILD, stated verdict |
| Miner terms ($399 → ~43.6 GLW/wk × 89wk) | Observed listing 2026-07, auth-gated (not independently fetchable); instrument corroborated onchain: `OFFCHAIN_FRACTIONS 0x80EA852448c2807BeAe321deC7c603990209F7db` (live mainnet) | **reported**, cited |
| Delegation / Miner purchase (fills) | V2 app-mediated, unpublished addresses | SIM until Glow publishes |

The Miner enters `tokenizerRoster.mjs` as the fifth profile — the first with
observed-market terms rather than `estimate` archetypes, graded `reported`, never
`confirmed` (the listing sits behind auth). Rendering the GCC verdict plainly ("no usable
price register today") is not a weakness; it is the product's core discipline applied to a
partner protocol: real where it touches the world, labeled where it doesn't.

### § Corrections to doc 11 (superseded claims, kept inspectable there)
1. "GCC price… both readable onchain — LIVE, no proxy needed" → both registers exist but
   are **degenerate** (drained auction, dust pool); only GLW has a healthy pool.
2. Doc 11's CarbonCreditAuction address `0x85fbB04D8CD3d7c3A4Ee31d0a8B711F4385964e5` is a
   **corrupted transcription** (no code at address, fails checksum); real address above,
   resolved via `GCC.CARBON_CREDIT_AUCTION()`.
3. "Connector already exists — LIVE read" → the connector existed but was **silently
   broken** by the audits API's `summary.*` schema drift; every geo/system field parsed to
   0/undefined until the 2026-07-03 remap.

## 6. Civic precedent: LVGA/MyLugano — endogenous capital and conditional transfers, deployed

Added 2026-07-03 from Barisone, Bregy, Carbone, Gamba, Gorini, Guzzetti, Morini & Roio,
"Municipal Tokens as Urban Policy Tools: The Case of LVGA and the MyLugano App," P2PFISY
2026 (paper 28; authors include Dyne.org's Denis Roio). Lugano's city-issued LVGA token is
a live, FINMA-supervised instance of three mechanisms AqueductX currently renders as sim:

1. **Territorially bounded circulation = the capitalEndo ring, deployed.** LVGA pegs
   100:1 to CHF, users *cannot* redeem back to fiat, and value can only circulate inside
   the local merchant network; only merchants redeem, at reconciliation, giving the city
   float. Cashback-acquired money exhibits higher spend velocity (non-fungibility — people
   spend "earned locally" money sooner). This is precisely the economics behind the map's
   convention that endogenous credit *revolves at the coop and never crosses oceans*
   (rings, not arcs) — now citable as a deployed public-infrastructure design, not just a
   visual metaphor. It is also the template for a future coop-bounded credit instrument:
   members spend inside the coop network; the coop redeems outward at settlement.
2. **Conditional transfers = finance intents with policy verdicts, deployed.** Lugano's
   cultural voucher (CHF 200 in LVGA to residents turning 18; 650 beneficiaries, CHF 130k,
   2024–26) embeds an eligibility criterion plus merchant whitelisting directly in the
   token (ERC-2980, a transfer-constrained standard), and spent vouchers rejoin the normal
   circuit. Structurally identical to an AqueductX finance intent gated by
   `institutionPolicies.mjs`'s policy verdict: capital whose eligibility and usage
   constraints ride *in the instrument*, not in an enforcement bureaucracy.
3. **"A platform for those without a platform."** The paper's framing — a public
   coordination platform aligning fragmented local actors, explicitly positioned against
   privately-owned extractive platform rails — is the municipal twin of AqueductX's
   positioning for commodity corridors. Their §5 privacy stance feeds doc 13 directly:
   privacy-by-design strategies (minimize/separate/abstract, hide/dissociate,
   inform/control/verify) and the closing principle that institutional knowledge should be
   "limited, situated, and functional: sufficient to enable a right, a benefit, or a
   protective measure, but not such as to make the user's entire digital life more
   exposed, more linkable" — which, swapped from citizen to smallholder, is the exact
   privacy bar for EUDR geolocation and credit data.

## 7. What this thesis commits us to next (not silently implied as done)

- Valueflows' controlled action vocabulary on `AqueductEvent.verb` and a
  provider/receiver agent split — typed-events pass, future.
- A GCC register worth reading if Glow's auction refills or pool deepens — the connector
  exposes `getGccOracleState()` so the map can flip from verdict to price without a
  redesign.
- hREA/Holochain runtime adoption remains a separate, explicit technology decision.
- A third corridor, LandX agri-commodity trade finance, as the next vertical after coffee
  and solar (a Regen Atlas partner, not live today): the same aggregate/verify/price/
  publish/fill/settle loop over a third commodity class, TO-BUILD. Coffee and solar are the
  two that read live today; the loop is built to take a third.
- Answering doc 11's Q6–Q7 with Glow directly (Miner onchain transferability is now
  half-answered by OFFCHAIN_FRACTIONS; referral attribution remains open).
