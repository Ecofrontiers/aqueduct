# Aqueduct — Demo Spec (build contract) — v2

> v1 locked 2026-07-02 via 15-question spec session with Pat; v2 same day after 11 more
> questions + the 6-report research cycle (`docs/research/01`–`06`). This is the contract the
> build is verified against. Deviations require Pat's sign-off, not silent judgment calls.
> The name is **Aqueduct**. Never "Farmgate" — anywhere, including code, comments, and commits.

## 1. The product (one paragraph)

**Canonical definition (Pat, updated 2026-07-03 to name the finance layer explicitly):**
"Aqueduct is a generalized peer-to-peer logistics and finance layer for smallholder
farmers: agents aggregate, verify, and price commodity lots, and intents match and
settle them."


Aqueduct is an **open financial + logistics layer for smallholder commodities**: an
aggregation + certification + intent/solver network over the platforms where smallholder
production already lives. It is NOT a farmer-facing app and NOT a regen-ag project —
regen/sustainability is one certification type inside the cert layer (already wired in the
Atlas base). The unit of analysis is the **layer and its swarm**, not a single farmer.
Base: fork of Regen Atlas interface (`atlas/`, READ) + SlabClaw Routes (`routes/`, WRITE).
License MIT. Repo: `~/Desktop/1_projects/aqueduct/`.

## 2. The demo, defined by the locked answers

| Decision | Locked answer |
|---|---|
| Money shot | **An intent filled on the map** — publish → solvers compete → fill → onchain settle, watched live on the Atlas map |
| Front door | **Atlas map first** — the aggregated ecosystem is the opening screen; lots/entities/certs/intents visible |
| Interactivity | **Fully on-rails** — a guided tour; every click advances a scripted sequence with real components underneath. Zero live-demo breakage risk |
| Legibility | **Cold from URL** — the tour narrates itself with on-screen captions; assume the judge has seen nothing else |
| Story | **The layer is the story** — smallholder ag broadly, not regen-ag; macro (logistics + open financial layer), not single-farmer |
| Crop scope | **One deep + map breadth** — one lot walked end to end; the map shows multi-commodity aggregation (sim lots labeled) |
| Anchor lot | **Chiapas coffee via EthicHub** — the deep-walk lot renders from real EthicHub data |
| Grade-from-photo | **DROPPED from demo** — cert layer relies on aggregated/imported attestations, not self-generated grades |
| First credential | **Real EthicHub data** — the anchor lot's credential is read from EthicHub's actual public surface |
| Cheap-Android / offline-first | **Out of scope** — not demoed, not faked |
| Swarm realness | **Hybrid** — scouts/aggregation read real platforms LIVE; the solver/buyer economy is SIMULATED and labeled |
| Application draft | **Gets rewritten** to this thesis after spec lock; the demo is the truth |
| Swarm meaning | **Farmer empowerment** — the judge watches agents compete and concludes "this machinery works for the producer." Rendered SUBTLY: no meters/tickers/preaching; spread + producer-share data sits quietly in lot detail panels; the explicit argument lives in the deck, not the UI |
| Card lineage | **Omitted entirely** — no SlabClaw/Charizard/collectibles reference anywhere (demo, application, repo UI). Team credibility = Regen Atlas + The Green Crypto Handbook + the Hedera diligence build. Scrub forked `routes/` of card-domain references; `api.slabclaw.com` appears nowhere |
| End of tour | **The ask, stated** — final screen renders Q5: what the grant funds, milestones, what compounds in the open |
| Visual identity | **SUPERSEDED 2026-07-02 (Pat: "you just built an app on top of the other app — there's no integration at all").** Original intent stands for STYLE (don't restyle Atlas's look); it was wrongly obeyed as STRUCTURE (overlay-only). Binding correction: **Aqueduct is a MODE of the app, not an overlay.** The demo build opens IN Aqueduct mode: the map IS the aggregation view (commodity lots, venues, storage nodes, intent arcs as first-class map content, Chiapas-framed), the feed is part of that view's layout, and the tour DRIVES app state (route, camera, panels) rather than floating over whatever page is showing. Atlas's own browse (bioregions/assets) stays functional and reachable but is not the front door; tour chrome never renders on non-Aqueduct pages; zero z-fighting with Atlas UI |
| Lineage framing | **Openly a fork/extension of Regen Atlas** (Pat, 2026-07-02) — the UI and application say so explicitly ("Aqueduct extends the open Regen Atlas"). Lineage is a feature: the base layer is already live, open (MIT), and ours — not something to disguise. regenatlas.xyz remains live as the standing proof |
| Map aesthetic (A1) | **Keep Atlas's current Mapbox style** — zero restyle risk, visual continuity with the cited live product |
| Swarm rendering (A2) | **Feed-first, map secondary** — the activity feed (terminal-log aesthetic) IS the swarm view; the map shows results. Honest to how agents actually work; consistent with the subtle mandate |
| Tour chrome (A3) | **Chaptered side rail** — persistent rail lists the beats (Aggregate → Verify → Price → Publish → Fill → Settle → Ask); click a chapter to play it; judge sees the whole arc upfront and can jump |
| Tour pacing | **Judge-clicked, ~8-10 steps** — each click advances one captioned beat (map → lot → certs → diligence → oracle → intent → solver race → settle → ask); ~3 min read fully |
| Incumbent stance | **Neutral rails they join** — venues (Algrano, GrainChain, AgriDex…) render as first-class nodes the layer aggregates and routes intents TO; Aqueduct adds no toll and replaces nobody |
| Rails lineage | **Domain-neutral citation — FINAL** (F5 revisited with the provenance-trail argument 2026-07-02; Pat kept it, risk accepted): "we deployed an intent-settlement registry (Base Sepolia) and closed a live USDC→marketplace buy rail"; zero collectibles language anywhere. Accepted risk: a reviewer tracing the deployer/fork lineage discovers the collectibles provenance — deemed survivable |
| Backstop solver | **Open reference solver** — a forkable, open-source backstop that wins ONLY when no other solver bids; code public, margin visible. Cold-start realism (research/04: no network ever bootstrapped without one) that reinforces neutrality instead of undercutting it |
| Sentient stack ties | **Offer, don't commit** — name the compatibility (diligence agents mirror ROMA's Verifier role; GRID publication is natural) without making either a milestone |
| Evidence home (Q37) | **Application + deck; demo stays product-pure** — research/02's five sentences live in Q2(a)/Q5 and the deck; tour captions carry no citations. ONE exception: the ask-screen may carry the RCT insight in a single line (matching without price-info-alone is the unlock) since it IS the thesis. *(Set on best judgment while Pat was AFK — consistent with Q18 "subtle"; re-openable.)* |
| Map composition | Every venue/platform node rendered is either a REAL read or a researched-real platform labeled TO-BUILD — **no fictional platform names ever**. Sim lots (map breadth) use plausible-but-fictional co-op names so no real producer beyond the attributed anchor is implied. *(My call under the figure-it-out mandate.)* |
| Lot card (A4) | **Atlas asset page, extended** — graft the lot fields (§5 canonical schema) into the existing Atlas asset-detail page; maximum reuse, truest to the fork framing |
| Feed register (A5) | **Delegated to design-research** — the pre-build design-research pass decides the feed line format against real references (flight radars, block explorers, terminal UIs, agent dashboards); hypothesis to validate: structured log with plain-language expand. Currency/unit display (EUR/kg vs bag equivalents) decided in the same pass |
| Scraping posture (F1) | **Read anything reachable** — if it renders, it's data (the house doctrine). Connectors read any publicly reachable surface; auth-gated surfaces are the only hard line |
| Moat (M1) | **Stated: "no moat, by design"** — the win condition is the standard existing, not owning it (coherent with grant track + funder's "Linux Foundation of AI" register). Practical answer under venture pressure: ops muscle (production scraper/agent operations, daily) + accumulated lot registry & join-confidence history — clones get code, not the running network. *(Best-judgment while Pat AFK; re-openable.)* |
| OPEN — M2/M3/M4 | First real user (month 2)? · Aqueduct's portfolio position (grant bid vs first-class direction)? · Kill criteria? — queued for Pat; the market attack treats M2 as a finding |
| ROMA mapping (Q36) | **Our domain names in the UI; the ROMA-role mapping is first-class in the ledger page + application.** Verified from github.com/sentient-agi/ROMA: loop = Atomizer→Planner→Executor→Aggregator, Verifier optional ("inspects the aggregate output against the original goal"). Mapping: scouts/oracles = Executors-with-tools ("Executors can be LLMs, APIs, or even other agents"); diligence agents = the Verifier concept; intent pipeline = Planner/Aggregator. HONESTY BOUNDARY: this is structural congruence with receipts — NEVER "built on ROMA" (the ROMA authors read the applications and provide the grant's engineering support); ROMA port stays an offer (Q26) |
| Sustainability answer | **REVISED per MARKET-ATTACK F2 (supersedes the services-not-tolls draft):** layer free + forkable; Ecofrontiers sustains on **lender/factor-facing services over the open registry** — duplicate-financing checks, attestation queries, diligence-agent reports, EUDR-readiness checks (the MonetaGo precedent: banks have paid for exactly this since 2018) — plus integration consulting. The backstop solver is a **cold-start mechanism, not a business** (it's bistable: zero revenue if the network works, middleman if it doesn't — and a two-person agency can't fill a T+90 physical export anyway). Never present solver margin as the revenue line |
| Repo timing | **Public at submission** — private during build; openness verifiable the moment a reviewer checks |
| Amount | **$50k, scoped honestly** — the layer build justifies it; >$50k would force the Investment track |
| Outreach | **None pre-submission — FINAL** (pre-mortem dissent surfaced once, Pat kept the call 2026-07-02). Attribution + initialing + source links carry legitimacy |
| Anchor render | **Real lot facts as published + source link; producer INITIALED ("N.O.P.") in our UI** — realness verifiable in one click, the person is not a demo prop |

## 3. The swarm (most important element — Pat's ranking)

Visible agent cast, in pipeline order (each carries its ROMA-role mapping in the ledger page — see §2 Q36):

1. **Scout/aggregator agents** — LIVE. Read real platform surfaces, pin entities/lots/certs to the map. *(ROMA: Executor-with-tools)*
2. **Diligence/verifier agents** — LIVE pattern (proven Hedera PASS/CAUTION loop). Independently re-verify certs/origin claims; flag gaps honestly. "EUDR-traceable" is never a badge: the agent visibly checks the concrete fields (plot geolocation, harvest window, legality evidence, Due Diligence Statement reference — mandatory for coffee/cocoa from 30 Dec 2026, research/01). *(ROMA: the Verifier concept — "inspects the aggregate output against the original goal")*
3. **Oracle/pricing agents** — LIVE tier minimum one real feed (ICE C-contract public quote + Mexican differential); maintain fair price per commodity; expose the spread.
4. **Solver agents (competing)** — SIM, labeled, calibrated to research/04's parameter table: 4-6 solvers with a power-law (top solver wins 40-50%, one noisy solver never wins, one visibly losing fill), winner margin 1-5% of lot value, bids clustered within 1-4%. Bids are **itemized landed-cost vectors** — freight / insurance / customs / certification / **financing** (physical capital-lock T+7…T+90 is THE structural difference from DeFi) — never price±random. Plus the **open reference (backstop) solver**: fills only when others decline, labeled as such — and its bid is **computed by the REAL Routes landed-cost engine at runtime** (pre-mortem edit: the race is 1 REAL + N SIM, so the climax contains a real computation, not only labels).
5. **Route/transport planners** — SIM, labeled. Cost the physical leg — and **documents ARE logistics** (research/01): route steps include the paperwork chain with lead times (wet mill → dry mill → licensed exporter → phytosanitary cert → ICO Certificate of Origin → Bill of Lading / Cash Against Documents).
6. **Buyer/demand agents** — SIM, labeled. Standing demand with criteria ("Chiapas, SCA 84+, EUDR-traceable, ≤$X landed") so fills are legible: the judge sees WHY it filled.
7. **Reputation/registrar (ERC-8004)** — ROADMAP node, rendered greyed in the swarm view, labeled to-build. Never a live actor.

Swarm dynamics on screen: agents as moving/acting entities on the map with an activity
feed (the Hermes dashboard pattern). The tour's climax is the full cascade: scout pins a
lot → diligence passes it → oracle prices it → intent published → solvers race → buyer
matched → settle receipt (Base Sepolia) → vault node accumulates it.

## 4. Connectors (delegated to build judgment — day-one feasibility spike)

Rule: **whatever reads clean in ≤1 day each ships as LIVE; everything else renders as a
labeled to-build connector.** Never surface a named platform as integrated unless the read
is real (Pat's standing rule: no unwired capability in UI).

- **EthicHub** — CONFIRMED FEASIBLE (research/03 verdict: YES; spike retrieved real data). Anchor lot: **shop lot 79 — Soconusco, Chiapas, Bourbon Honey, SCA 86, €17/kg, harvest 2025** at `greencoffee.ethichub.com` (22 live lots, 6-7 Chiapas; server-rendered, no auth; producer initialed in our UI per §2). Enrichment: lending API `app.ethichub.com/api/v1/projects` (688 projects, Chiapas communities) + Celo CreditLine contract (real USDC borrow/repay). Caveat to render honestly: no platform id joins shop lot ↔ loan project ↔ credit line — the join is by producer/community name and the credential card labels it as such. Connector recipe is in the report.
  **Pre-mortem hardening (anchor is a live shop listing that can sell out or change):** the scout takes a **timestamped snapshot** at each successful read and the demo renders snapshot+timestamp with a re-fetch attempt on load (live if reachable, labeled snapshot if not); designate **2 fallback Chiapas lots** from the same shop at build time.
- **Algrano** — confirmed by research/05 as the cleanest scrapeable coffee marketplace (grower, origin, price, volume on public pages; no official API). Priority 2.
- **Agrotoken** — onchain Algorand tokens + published grain indices, machine-readable by design (not smallholder-granular — label accordingly). Priority 3.
- **Beyco** — deprioritized (research/05); treat as labeled to-build connector.
- **Silvi / AgroforestDAO** — PRODUCTION-LAYER VENUES, not cert decoration (Pat's correction 2026-07-02: agroforestry IS smallholder commodity production — shade-grown coffee/cocoa grows inside the systems they finance/verify; today's planting is a future lot). They are **intent-fillable venues** (Q34): the demo's second intent type, "finance this planting/renovation," routes to them (SIM-labeled fill). Read adapter (EAS-on-Celo): STRETCH.
- **Regen Network / Toucan / Astral** — certification-layer *enrichment only* (badges/attestations decorating production lots), never counted as commodity sources.
- **Never render as live-integrated:** DeHaat, Climate FieldView, WFP Building Blocks, Dimitra, iFinca, Farmer Connect (closed-by-design or dormant per research/05) — to-build connector nodes at most.

**The gap sentence (research/05, use in application):** nobody runs an open, cross-platform
aggregation + certification + intent/solver layer over the venues where smallholder commodity
production already lives — incumbents own a single marketplace or perform one isolated function,
and every existing intent/solver network works exclusively on fungible crypto tokens, never on
physical, graded, origin-bound commodity lots.

## 5. Settlement & rails

- **Chain:** Base Sepolia — reuse the deployed IntentRegistry (publish → fill → verify → settle). Celo migration = roadmap (note: Celo is a Sentient GRID launch chain AND where EthicHub/Silvi live — say so in the application). Label TESTNET on every onchain element. Carry the Routes solver-auth lesson: the registry must not pay arbitrary `msg.sender` (research/04).
- **Intent types (two):** (1) **sell-this-lot** — the deep walk's spine, solvers bid landed-cost routes; (2) **finance-this-planting/renovation** — production financing routed to agroforestry venues (Silvi/AgroforestDAO), SIM fill, one tour beat. Two intents spanning the production lifecycle (finance the system → sell its harvest) IS the layer thesis in miniature.
- **Agent payments:** x402 flows rendered SIM in the swarm; the application cites the rail with the proven lineage (real $0.004 x402 Apify payment on our agentic wallet) — capability claimed with a receipt, not wired into the demo (Q35).
- **Settle realism (research/01, non-negotiable):** the onchain settle credits the **cooperative/exporter node**, with farmer pass-through rendered as a labeled downstream step — never an instant spot payment to a farmer's phone (Kenyan farmers litigated to BLOCK direct mobile payout; the co-op carries their credit stack). Getting this wrong reads as ignorance to anyone who knows the field.
- **Attestations:** EAS where a real attestation is minted; otherwise the credential renders from the platform read.
- **Tokenization ("to an extent"):** one vault node in the swarm view accumulating filled lots — SIM-labeled. No new contracts. Vaults depth = roadmap.
- **Storage node realness (B1):** research the actual Chiapas→port custody chain first (named beneficios/dry mills, port warehouses — the route the anchor lot would genuinely travel), rendered read-only + source-attributed; where a real facility can't be responsibly named, fall back to typed-but-unnamed at real locations ("dry mill — Tapachula region"). Never fictional names.
- **Open content-addressed lot ID (B2, my call under Pat's "frame realistically" mandate):** every aggregated lot gets a deterministic content-addressed identifier derived from the canonical schema — anyone can recompute and verify it; "the namespace is the algorithm, not us." Shown on the lot card. Application claims research/08 rung 1 (duplicate-financing prevention) as what the grant hardens; never claim "we are the registry."
- **Identity resolution is a HEADLINE capability (B3, my call):** one tour beat shows two real surfaces (EthicHub shop lot ↔ lending project) resolving into one entity with a visible join-confidence label. Application names cross-platform identity resolution as core shipped competence, domain-neutral per Q24.
- **Blend lineage:** the lot card carries composition when data exists — the anchor is a single-producer micro-lot (renders simply); one sim lot demonstrates a community blend (N deliveries → one lot) so the commingling reality is visible. Custody model (IP/Segregation/Mass-Balance) is a card field, not a lecture.
- **Cropster-import connector:** named in the roadmap (application, not demo) — co-op data enters the layer through the ERP co-ops already use (Cropster lot records carry External ID + ICO mark fields, research/07).
- **Canonical lot schema (research/07 — binding for the build):** the demo lot object carries: source provenance {platform, platform_lot_id, url, fetched_at} · identity_stage (cherry/parchment/green/export) · nullable ico_mark {mark, coffee_year} · producer + origin (nullable plot_geo) · harvest window · process/variety/quality · weight_state · blend-composition lineage · custody_model (IP/Segregation/Mass-Balance) · EUDR sub-object (nullable dds_ref) · **join_keys + join_confidence (deterministic | name_place_match | unmatched)**. The anchor lot renders "linked by producer/community, not by platform id" as a labeled confidence level — the absence of a universal lot ID is Aqueduct's PITCH, not its embarrassment (no universal join key exists: ICO marks are shipment-level and reset yearly; identity below IP custody is bookkeeping, not physics).
- **Storage facilities as first-class route nodes (Pat, 2026-07-02):** warehouses/dry mills/custody points render on the map as nodes in the route graph — they are where the FINANCIAL unlocks attach in Routes (custody → receipt → collateral/financing). The vault pattern ties to physical storage: a lot resting at a verified storage node is what a modernized warehouse receipt looks like — solving the two documented WRS failure modes (payout latency, identity loss on commingling, research/01-02) with transparent, lot-identity-preserving custody. Solver route bids already itemize storage as a cost line; the deck's unlock ladder features storage-based financing as a rung.
- **Prices:** ≥1 real tier (ICE C public + differential). Sim tiers labeled. **Day-one feasibility spike** (pre-mortem: this was never spiked, unlike EthicHub) — if no clean free ICE C source, named fallbacks in order: ICO composite indicator daily price (public), World Bank Pink Sheet monthly, then a labeled snapshot price with source+date. The real tier must exist in SOME honest form; an all-sim price stack fails the money shot.

## 6. Honesty mechanics (non-negotiable)

- Global banner: "Live reads + simulated economy — see the ledger."
- Per-element badges: `LIVE` / `SIM` / `TESTNET` / `TO-BUILD` on every lot, agent, price, and settlement.
- A **real-vs-sim ledger page** linked from the footer (the diligent judge's page), same spirit as FUSION-CONCEPT §4.2.
- The on-rails tour SAYS what is simulated as it shows it. Honesty is the differentiator, not the disclaimer.

## 7. Acceptance criteria (what "done" means)

1. A cold visitor at the URL, with zero context, understands within the tour what Aqueduct is and watches an intent get filled on the map.
2. At least one lot on the map renders from a **real EthicHub read** (verifiable in the ledger page with fetch timestamp + source URL), with snapshot fallback per §4.
3. The full swarm cascade (scout → diligence → oracle → intent → solver race → buyer match → settle) **replays cleanly on demand** without manual intervention (pre-mortem: "replays cleanly," not "runs live," is the honest zero-breakage bar for an on-rails tour).
4. The settle receipt is a real Base Sepolia tx the judge can open on the explorer.
5. Every synthetic element is visibly labeled; the ledger page enumerates all of them.
6. Zero occurrences of the string "farmgate"/"Farmgate" in app code, UI, README, or commit messages (`docs/research/` exempt — "farmgate price" is a legitimate ag-economics term there).
7. The repo builds and runs from a fresh clone with documented steps (openness screen).
8. **One tour beat maps the RFP's five middleman functions** (grade / origin record / buyer match / live pricing / farm-to-sale tracking) to layer components with status badges — the demo itself answers "you asked for five functions; here is where each lives in the layer," including grade honestly badged TO-BUILD/aggregated. The counter-argument to "you dropped the farmer app" must live IN the demo, not only in the deck (pre-mortem critical finding #1).
9. The diligence agent's EUDR check on the anchor lot renders **real gaps as PARTIAL/missing honestly** (the EthicHub lot lacks plot-geolocation + DDS fields) — a real check finding real gaps is MORE credible than a green badge; sim buyer criteria accordingly demand SCA+origin, with EUDR-readiness flagged, not required (fixes two pre-mortem contradictions).

## 8. Explicitly OUT of the demo

Grade-from-photo · cheap-Android/offline-first capture · farmer-facing mobile UX ·
real-money settlement · live satellite MRV · per-farmer ERC-8004 identity (roadmap node
only) · `npx aqueduct up` self-host (roadmap unless trivially cheap at the end) ·
multi-crop switcher ceremony.

## 9. Open items — Pat's, not the build's

- **Deadline** — Pat's call; spec is scope-tiered, not date-cut. MVP tier = criteria 1-7 with EthicHub-only live read; full tier adds connectors 2-3 and richer swarm choreography.
- **Amount** ($25k vs $50k) — re-derive in the application rewrite once demo scope is visible.
- **Demo URL / domain** — Pat owns; Vercel default URL acceptable for build/preview.
- **Repo org + public timing** — Pat owns; keep local until decided.
- **Outreach** (EthicHub/Silvi/Algrano — REACHOUT-LIST.md) — recommended before submission so aggregated platforms know; Pat approves any contact in his name.

## 9b. Build verification protocol (locked Q33)

**Two gates + final audit.** The build session works criteria-first and stops at each gate
for external verification (by the spec session, not self-graded):
- **Gate 1 — connectors + map render:** criterion 2 proven — real EthicHub read on the map,
  screenshot + ledger entry with fetch timestamp. No tour work before this passes.
- **Gate 2 — full cascade replay:** criteria 3, 4, 9 proven — the swarm cascade replays
  cleanly, the Base Sepolia tx is real, the EUDR check renders real gaps.
- **Final audit:** the spec session audits all 9 criteria cold — fresh clone, build from
  README, walk the tour as a judge — before Pat ever looks. Pre-mortem's MVP-first build
  order applies: realest material first (connector → oracle tier → settle), tour polish last.

## 10. After the demo: the application rewrite

The demo is the truth; `APPLICATION-DRAFT.md` gets rewritten to the layer thesis
(smallholder-commodity financial/logistics layer; swarm; aggregation; certification as a
layer that includes regen). Carry over what survives: grant-track congruence logic,
real-vs-to-build honesty contract, team proofs, GCH grounding. Drop: coffee-prompt-swap
framing, single-farmer walk as spine, cheap-Android claims. Q2(f) must describe exactly
what exists at the URL — no promissory language.

**Rewrite inputs from the research cycle (binding):**
- **Argumentation** from `research/02`: use the five strongest sentences (ECX limited price
  integration; eNAM's 5.5%/2% reality; WRS captured by large traders = the funder's fear
  observed in the wild; Peru SMS +13-14% WITH alternative buyer; India SMS null WITHOUT one
  → the intent/matching layer is the unlock, not the price feed). NEVER make the three
  banned claims (30-60% as extractable rent; price oracle raises incomes standalone;
  lot-collateral unlocks smallholder credit unconditionally).
- **Funder fit** from `research/06`: program is 8 days old — first-wave application while
  they need showcase grantees. Reviewers: Sachi Kamiya (ex-Polygon Ventures) + the
  ROMA/ODS technical panel; they read receipts, not polish. Make the RFP's "tool becoming
  the new middleman" paragraph the spine of Q2(e), answered structurally (MIT, forkable,
  neutral layer, open reference solver, no take-rate). Address the two belief misses
  honestly (cheapest-phone accessibility, on-device privacy → roadmap, with the argument
  that the open layer is what makes any farmer-facing app non-extractive). Keep onchain
  rails loud, domain-neutral (Q24). No Dobby/OML name-drops; ROMA/GRID compatibility
  offered, not committed (Q26). Structure Q5 around their four axes: technical merit,
  ecosystem impact, openness, long-term potential.
- **Positioning** from `research/05`: the gap sentence (§4) + neutral-rails stance (Q23).
- **Finance story** from `research/08` (C1: deck ladder + demo vault): rungs 1-2 (duplicate-financing prevention, EUDR-priced market access) go in application+deck as proven functions; rungs 3-6 (liquidation path, WRS-conditional, receivables, Agrotoken-style credit) deck/application with stated conditionality; rung 7 (vaults) demo SIM + deck roadmap; rungs 8-9 (prediction markets, "DeFi liquidity will flow") OMIT. Core deck line: every major RWA-ag blowup failed at offchain verification, never at the contract layer — the legibility layer is what makes a lot financeable ("what a gold bar already has").
- **Foundations** (D1): `2_resources/Ecology/regenerative-supply-chains-polycentrism-2026.pdf` (governance/supply-web framing) + `2_resources/Maps and GIS/ecospatial-competitor-landscape-2026-05.md` (Atlas-side positioning) are binding inputs to deck + application.
- **Deck** (E1): funder-mirror lead — slide 1 answers their "tool becoming the new middleman" sentence structurally in one diagram; deck organized as answers to the six beliefs + four axes; carries the evidence sentences (research/02), the empowerment argument (Q18), and the unlock ladder (research/08).
- **Field credibility** from `research/01`: two-tranche payments, document-chain logistics,
  EUDR concrete fields, warehouse-receipt failure modes as historical grounding.
- **Market-attack integrations** (`docs/MARKET-ATTACK.md`, all binding for rewrite + tour captions):
  - **F1 — anchor = ceiling, not proof:** the anchor lot ALREADY has all five functions solved
    (SCA grade, EU webshop, €17/kg ≈ 2× ICE C, EthicHub financing). Tour caption + Q2(b) state it
    straight: "the anchor shows what legibility looks like when it exists; the layer exists to
    extend it to the 688 lending-project communities whose lots never reach the shop." Never
    present the anchor as the beneficiary — he's the counterexample unless reframed.
  - **F3 — claim the precondition, not the network:** N=0 external participants, say so. Q5 names
    participant-#1 path per class: lenders via the registry (F2), venues/co-ops via the Cropster
    ERP import (the one adapter that gives them a REASON to be read), solvers explicitly deferred
    with the bootstrap-subsidy precedent. Note: 90% of specialty volume is existing-relationship
    commerce (research/05) — never imply spot liquidity.
  - **F4 — complement, not substitute:** explicit paragraph: why the layer is not fungible with
    funding any single venue (improves one silo) or any single app (rebuilds the middleman) —
    "fund EthicHub too; we're the layer they'd publish into." Say it before the panel thinks it.
  - **F6 — the exporter/co-op is a USER, not a target:** pitch the channel on EUDR/paperwork
    cost-saving (compliance is their 2026 nightmare); spread transparency stays as the system's
    integrity property, never the sales pitch to the channel.
  - **F7 — mechanism claim, not effect-size claim:** the RCTs prove the complement bundle moves
    income at the FARMER level; the layer claims to lower the cost of that bundle appearing
    anywhere new. Never let "+13-14%" sit adjacent to "aggregation layer."
  - **F8 — user-event milestones:** M1 = registry API public + first external query (named
    lender/factor pilot, or EthicHub itself); M2 = first non-anchor platform reading in via the
    ERP path; M3 = first externally-run self-host. CUT the "farmer-retained-value" gate (the
    specced system cannot measure it — settle credits the co-op). This is also the M2 answer.
  - **F9 — one verb:** the layer "PRICES market access" (EUDR-readiness legible, gap has a cost),
    never "provides" it — the plot-geo/DDS data is structurally unscrapeable; closing readiness
    is write-side roadmap through F6's channel.
  - **F10 — what compounds = the standard:** ask-screen + Q5 lead with the canonical lot schema +
    content-addressed lot ID + open registry as THE compounding deliverables; connectors and the
    solver are reference implementations around the standard. Upgrades the no-moat answer:
    "we authored the schema everyone joins on" — Linux-Foundation-shaped (M1 synergy).
  - **Code-market honesty:** the identity-resolution beat is labeled **cross-surface** (both
    surfaces are EthicHub's) and promoted to cross-platform only when Algrano lands; the
    certification cross-check is circular until connector #2 — the ledger says so.
