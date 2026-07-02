# Aqueduct — Demo Spec (build contract)

> Locked 2026-07-02 via 15-question spec session with Pat. This is the contract the build
> is verified against. Deviations require Pat's sign-off, not silent judgment calls.
> The name is **Aqueduct**. Never "Farmgate" — anywhere, including code, comments, and commits.

## 1. The product (one paragraph)

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
| Visual identity | **Atlas base untouched; design effort spent ONLY on the new swarm/intent layer** (agents, bids, routes, settle events) — the new thing is what looks new |
| Tour pacing | **Judge-clicked, ~8-10 steps** — each click advances one captioned beat (map → lot → certs → diligence → oracle → intent → solver race → settle → ask); ~3 min read fully |

## 3. The swarm (most important element — Pat's ranking)

Visible agent cast, in pipeline order:

1. **Scout/aggregator agents** — LIVE. Read real platform surfaces, pin entities/lots/certs to the map.
2. **Diligence/verifier agents** — LIVE pattern (proven Hedera PASS/CAUTION loop). Independently re-verify certs/origin claims; flag gaps honestly.
3. **Oracle/pricing agents** — LIVE tier minimum one real feed (ICE C-contract public quote + Mexican differential); maintain fair price per commodity; expose the spread.
4. **Solver agents (competing)** — SIM, labeled. Multiple solvers see a published intent, compute landed-cost routes (Routes graph), bid; competition visible on the map before one wins.
5. **Route/transport planners** — SIM, labeled. Cost the physical leg; the winning bid is a landed-cost route, not just a price.
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

- **EthicHub** — REQUIRED (anchor lot). If its public surface won't yield lot-level data, escalate to Pat immediately — the anchor choice depends on it. (Feasibility spike report: `research/03-ethichub-feasibility.md`.)
- **Algrano** — confirmed by research/05 as the cleanest scrapeable coffee marketplace (grower, origin, price, volume on public pages; no official API). Priority 2.
- **Agrotoken** — onchain Algorand tokens + published grain indices, machine-readable by design (not smallholder-granular — label accordingly). Priority 3.
- **Beyco** — deprioritized (research/05); treat as labeled to-build connector.
- **Silvi / AgroforestDAO** — via new EAS-on-Celo adapter; STRETCH.
- **Regen Network / Toucan / Astral** — certification-layer *enrichment only* (badges/attestations decorating production lots), never counted as commodity sources.
- **Never render as live-integrated:** DeHaat, Climate FieldView, WFP Building Blocks, Dimitra, iFinca, Farmer Connect (closed-by-design or dormant per research/05) — to-build connector nodes at most.

**The gap sentence (research/05, use in application):** nobody runs an open, cross-platform
aggregation + certification + intent/solver layer over the venues where smallholder commodity
production already lives — incumbents own a single marketplace or perform one isolated function,
and every existing intent/solver network works exclusively on fungible crypto tokens, never on
physical, graded, origin-bound commodity lots.

## 5. Settlement & rails

- **Chain:** Base Sepolia — reuse the deployed IntentRegistry (publish → fill → verify → settle). Celo migration = roadmap. Label TESTNET on every onchain element.
- **Attestations:** EAS where a real attestation is minted; otherwise the credential renders from the platform read.
- **Tokenization ("to an extent"):** one vault node in the swarm view accumulating filled lots — SIM-labeled. No new contracts. Vaults depth = roadmap.
- **Prices:** ≥1 real tier (ICE C public + differential). Sim tiers labeled.

## 6. Honesty mechanics (non-negotiable)

- Global banner: "Live reads + simulated economy — see the ledger."
- Per-element badges: `LIVE` / `SIM` / `TESTNET` / `TO-BUILD` on every lot, agent, price, and settlement.
- A **real-vs-sim ledger page** linked from the footer (the diligent judge's page), same spirit as FUSION-CONCEPT §4.2.
- The on-rails tour SAYS what is simulated as it shows it. Honesty is the differentiator, not the disclaimer.

## 7. Acceptance criteria (what "done" means)

1. A cold visitor at the URL, with zero context, understands within the tour what Aqueduct is and watches an intent get filled on the map.
2. At least one lot on the map renders from a **real EthicHub read** (verifiable in the ledger page with fetch timestamp + source URL).
3. The full swarm cascade (scout → diligence → oracle → intent → solver race → buyer match → settle) plays end to end without manual intervention.
4. The settle receipt is a real Base Sepolia tx the judge can open on the explorer.
5. Every synthetic element is visibly labeled; the ledger page enumerates all of them.
6. Zero occurrences of the string "farmgate"/"Farmgate" anywhere in repo, UI, or docs.
7. The repo builds and runs from a fresh clone with documented steps (openness screen).

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

## 10. After the demo: the application rewrite

The demo is the truth; `APPLICATION-DRAFT.md` gets rewritten to the layer thesis
(smallholder-commodity financial/logistics layer; swarm; aggregation; certification as a
layer that includes regen). Carry over what survives: grant-track congruence logic,
real-vs-to-build honesty contract, team proofs, GCH grounding. Drop: coffee-prompt-swap
framing, single-farmer walk as spine, cheap-Android claims. Q2(f) must describe exactly
what exists at the URL — no promissory language.
