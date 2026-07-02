# Aqueduct

**The aqueduct price, finally legible.** An open, cheap-Android trust layer that grades a smallholder's coffee lot from a photo, binds it to a farmer-owned origin record a distant buyer can re-verify by CID, prices it against the live market, and matches it to a buyer with an onchain settlement receipt — the shipped Aqueduct engine (grade / oracle / match / settle) retargeted from a $5,000 Charizard to a $5 coffee lot, with Regen Atlas supplying the geospatial origin credential, and the whole trust layer self-hostable so no operator (including us) can become the new middleman.

> Synthesis verdict (Critic): this is **Aqueduct** (Direction 1's legible single-farmer walk and economically-precise name) grafted with **OpenMandi's** self-hostable rails as the *structural* anti-middleman proof, **Steward's** farmer-owned credential + ERC-8004 loyalty framing (labeled to-build), and **Rootstock's** regen-origin credential kept as an explicitly *secondary* attestation. Fair price is primary; everything else is grafted in service of it. Chosen because it is the thinnest honest retarget of shipped code, the most viscerally legible demo, and the tightest fit to Sentient's own words.

---

## 0. Why this synthesis, and what was grafted from where

Four directions were proposed and scored. As the product/design lead I am not picking one — I am synthesizing the load-bearing edge of each and discarding the rest.

| Direction | Score | Its single best idea (KEPT) | What I discarded |
|---|---|---|---|
| **Aqueduct** | 87 | The name and the demo. "Aqueduct price" is the exact economic term for *what the farmer actually receives at the farm before middlemen* — it IS Sentient's verbatim ask ("a tool that pays a farmer what their crop is truly worth"). A single farmer + single coffee lot is the most legible possible walk. | Nothing — this is the spine. |
| **OpenMandi** | 86 | `npx aqueduct up` / docker-compose self-hosting. This converts the anti-middleman promise into a **mechanical** property: the Trustless Manifesto's principle 2 ("if inclusion requires an intermediary users cannot realistically replace, it is not trustless") passes because the co-op can actually fork and run its own node. | The "rails/SDK-first" framing — it's less legible to a judge than a farmer holding a phone. Kept as the *second* reveal, not the lead. |
| **Rootstock** | 88 | The regen-origin credential as a **second** attestation that hits Sentient's *other* half ("the infrastructure that makes it trustworthy"), and unlocks a premium previously gated behind ~$50K / 1,200-ha-minimum MRV. | Leading with regen. It dilutes "pays her what her crop is worth." Demoted to a clearly-secondary access-enabler, framed as an attestation not an offset. |
| **Steward** | 85 | The farmer-**owned** ERC-8004 agent, "loyal to her not us" — a direct rhyme with Sentient's own Dobby "Loyal AI" model owned by ~700k people. | Making the per-farmer agent the headline. ERC-8004 per-farmer identity is *planned*, not deployed. Kept as the ownership/loyalty framing and labeled to-build. |

**The one-sentence bid:** we did not build the trust layer for this grant — we **shipped** it (grade → identity → oracle → match → settle, live at api.slabclaw.com over a DB-verified 5,776-product universe) and are retargeting the node labels from graded cards to a coffee lot. Four of the five middleman functions are orchestrator-invariant code that does not change; only the price *sources*, the vision *prompt*, and a cheap-phone *front door* are new.

---

## 1. The problem, and why now (Q2a)

A smallholder carries her coffee to the one buyer she can reach and takes the price she is given, because she has no way to prove it is worth more. This is not one statistic, it is three, sourced carefully to survive a named technical panel's diligence:

- **Scale of the forgotten.** Farms under 2 ha produce ~28-31% of global crop production and 30-34% of the food *supply* on ~24% of agricultural land (Ricciardi et al. 2018 / Our World in Data; FAO "around a third"). We deliberately do **not** use the debunked "70-80%" claim.
- **The loss.** Physical post-harvest loss for perishables runs 40-50% (FAO); post-harvest loss cuts the income of ~470M smallholders by up to 15%. On top of that sits **information-asymmetry rent** — the middleman's margin the farmer "never knows" (Stigler 1961). We present these as two distinct things, never as one universal "30-60%."
- **Why price feeds alone fail.** RCTs (Nakasone/Peru; Reuters Market Light across 100 Maharashtra villages; J-PAL/ATAI synthesis) converge: price information *alone* does not raise farmer incomes. The binding constraints are the *other* middleman jobs — credible **grading**, **vouching** a distant buyer believes, and **matching** to that buyer. This is exactly Sentient's five-function framing, and it is why an app that only shows a price loses while a grade + provenance + match engine wins.

**Why now:** the middleman's grading/vouching/pricing is precisely the *subjective-verification* work models can now do (the Coasean/verification-gap thesis: as transaction costs fall, trust becomes the scarce, rent-bearing asset). Digital MRV already collapses per-lot verification from "100-150 projects/year" to "ten per day per officer" (SustainCERT 2022, cited in *The Green Crypto Handbook* Ch1), erasing the project-size minimums that excluded a $5 lot. The trust layer is finally automatable — and Sentient's own thesis is that **open is the only version where the rent does not simply re-monopolize.**

---

## 2. Who this helps (Q2b)

Smallholder coffee producers and their cooperatives, starting with one region (Kenya) and one crop. Coffee is the deliberate first vertical because it satisfies all four requirements for an honest oracle retarget:

1. **An existing public grade standard to anchor to** — SCA green-coffee grading + Kenya's AA/AB screen-size and defect-count rules. Aqueduct anchors the grade the way SlabClaw anchors to PSA: to a public reference, never a self-invented score.
2. **A field-realistic reference dataset** — the Coffee Beans Dataset (450 images across 9 grades, PMC11978365).
3. **A documented rent to remove** — green coffee "is mostly priced by centralized futures exchanges in the USA and UK" (*Green Crypto Handbook* Ch6), a financialization that "risks mispricing assets and centralizing revenues."
4. **An in-book smallholder precedent** — EthicHub's staked-ETHIX micro-loans for "regenerative coffee farmers" (Ch5).

The delivery model is designed for the poorest, not against them: offline-first assisted capture, low-bandwidth queued upload, local-language, and **co-op-mediated** — matching how Farmerline (voice, 6 languages) and Digital Green actually reach farmers. A smartphone-only flow would exclude the exact users Sentient prioritizes (SSA mobile-internet penetration ~27%). This is Belief #3, answered by design, not by slide.

---

## 3. In one line, what we are building (Q2c)

**Aqueduct: an open, self-hostable, cheap-phone trust layer that grades a smallholder's crop from a photo, gives her a portable origin record a distant buyer can verify without trusting anyone, prices it against the live market, and matches it to that buyer onchain — so the aqueduct price is finally hers to see and to keep.**

---

## 4. Architecture — the fusion, module by module

Aqueduct is the **orchestrator that never changes**; Regen Atlas plugs into exactly **one seam**. Node labels swap per vertical (an explicit shipped design property, and a deliberate rhyme with Sentient's own ROMA planner → executor → aggregator → verifier shape). Everything below is verified in the codebase.

### 4.1 Data flow (one coffee lot, end to end)

```
  [ Farmer / co-op officer, cheap Android, offline-first ]
                     │  assisted-capture photo of green-bean sample + farm GPS
                     ▼
  (1) GRADE ─────────────────────────────────────────────  REAL (engine) · prompt = TO-BUILD
      slab-vision-ocr.mjs  →  vision-client.mjs (provider-abstracted, CF proxy)
      capture → strict-JSON.   Swap ONLY the prompt: PSA-label read → SCA/Kenya
      AA-AB rubric (screen size, defect count, colour/quaker flags).
      confidenceFor() gives a green/yellow/red chip DECOUPLED from the grade.
                     │  structured grade + confidence
                     ▼
  (2) ORIGIN RECORD ─────────────────────────────────────  SEAM: Asset-1 ↔ Asset-2
      resolve-graded-identity.mjs already keys identity off an AUTHORITATIVE
      third-party credential, not the seller's editable claim.
      Swap the credential SOURCE: slab-label read → Regen Atlas geospatial
      farm-origin credential:
        • PostGIS anchoring to 1 of 185 One Earth bioregions   (REAL, shipped)
        • RADS provenance object on Filecoin (Synapse SDK)      (REAL, Calibration testnet)
          → attestor identity + geographic origin + grade + methodology + CID
          → "Verified on Filecoin" badge → gateway; buyer re-checks by CID,
            NO registry trust required.
        • (SECONDARY, opt-in) regen-condition attestation: iNaturalist +
          Sentinel-2/Landsat signal, geo-anchored — NOT an offset, an access-enabler.  TO-BUILD
                     │  farmer-owned, portable origin record (a CID she controls)
                     ▼
  (3) PRICE ─────────────────────────────────────────────  REAL (engine) · sources = TO-BUILD
      store-v2.mjs 7-tier ORACLE_TIER map (:46) + tier-regression guard (:240:
      "if incomingTier > existingTier continue" — higher tier NEVER overwritten).
      Swap ONLY the sources: PriceCharting/eBay-sold/Cardmarket → coffee comps
      (ICE Arabica reference + Nairobi Coffee Exchange / specialty differentials
      + buyer bids).  Surfaces discount = (oracle − offer)/oracle — the spread
      she has never been allowed to see.
                     │  live fair price + spread + confidence
                     ▼
  (4) MATCH + MOVE ──────────────────────────────────────  REAL (testnet) · mainnet = TO-BUILD
      IntentRegistry.sol publishIntent → submitFill → verifyFill → settle,
      deployed Base Sepolia (broadcast/Deploy.s.sol/84532/run-latest.json).
      Bounded-expectimax routes planner selects the route over a landed-cost graph.
      Real-money mainnet leg is HUMAN-GATED and NOT wired — labeled to-build.
                     │  buyer bid → onchain settle event
                     ▼
  (5) TRACK ─────────────────────────────────────────────  REAL (engine)
      v3_deals / v3_listings lifecycle + liveness sweeps; the settle event is
      the terminal farm-to-sale record.
                     │
                     ▼
  (V) HONEST VERIFY (optional, shipped pattern) ─────────  REAL (Hedera demo)
      Two OpenClaw agents: a Scout grades, an independent Diligence agent
      re-verifies the origin credential and posts PASS / CAUTION — the exact
      loop that flagged 5 REAL provenance gaps (not staged) in the Hedera build.
```

### 4.2 Real-vs-to-build ledger (the honesty contract)

| Component | Status | Evidence |
|---|---|---|
| Vision capture → strict-JSON pipeline + provider-abstracted proxy | **SHIPPED** | `slab-vision-ocr.mjs`, `vision-client.mjs` |
| 7-tier price oracle + tier-regression guard + confidence model | **SHIPPED** | `store-v2.mjs:46`, `:240`, `confidenceFor` :92 |
| Identity-resolution gate (authoritative-credential-beats-seller-claim) | **SHIPPED** | `resolve-graded-identity.mjs` |
| Live oracle over a real universe | **SHIPPED** | DB-verified `SELECT COUNT(*) FROM products` = **5,776** |
| Identity/contamination guards | **SHIPPED** | `ebay-registry.mjs filterListings` (50+; 88 in the core reject logic) |
| IntentRegistry publish/fill/verify/settle | **SHIPPED (Base Sepolia)** | `contracts/broadcast/Deploy.s.sol/84532/run-latest.json` |
| PostGIS 185-bioregion geo-anchoring | **SHIPPED** | regenatlas.xyz production |
| RADS origin record on Filecoin, CID-verifiable | **SHIPPED (Calibration testnet)** | Synapse SDK, "Verified on Filecoin" badge → calibration.filbeam.io |
| Two-agent grade-then-independently-verify loop | **SHIPPED** | hedera-hello-future.vercel.app (10 PASS / 5 real CAUTION) |
| Coffee grade rubric + vision prompt adapter | **TO-BUILD** | new prompt + parse grammar, anchored to SCA/Kenya standard |
| Coffee price-source adapter (ICE + Nairobi + buyer bids) | **TO-BUILD** | replaces card scrapers |
| Produce-lot connector into Regen Atlas ingestion (MIT) | **TO-BUILD** | same shape as an existing chain connector |
| Cheap-Android offline-first / co-op-mediated front door | **TO-BUILD** | Belief #3 deliverable |
| `npx aqueduct up` self-hostable packaging | **TO-BUILD** | the anti-middleman structural proof |
| Farmer-owned ERC-8004 identity + fork/self-host script | **TO-BUILD** | pattern proven by Dryad (ERC-8004 + iNaturalist + Base) |
| Field-generalized production grader; real-money mainnet buy; live satellite MRV; USSD/voice | **ROADMAP** | explicitly NOT claimed live |

The bid's credibility rests on the top block being real. The demo shows the pipeline + reference-standard scoring with honest confidence — **not** a validated production coffee grader, and **not** a real-money purchase. Blurring either is the single biggest diligence trust-killer, and we do not.

---

## 5. The demo — the exact walkable trial link (Q2f)

**One link. One farmer. One coffee lot. End to end.** The engine is the already-live api.slabclaw.com + regenatlas.xyz, retargeted to a coffee-lot instance — not a mockup. The link opens on a throttled cheap-Android profile.

1. **CAPTURE.** Assisted-capture photo of a Kenyan green-coffee sample (offline-first; upload queues on low bandwidth).
2. **GRADE.** The wired LLM-vision path returns strict JSON — screen size, defect count, colour/quaker flags — scored against the published SCA/Kenya AA-AB rubric, with a green/yellow/red confidence chip decoupled from the grade. *Label on screen: engine REAL, coffee model TO-BUILD (reference-standard scoring, not a validated grader).*
3. **ORIGIN.** The lot gets a Regen Atlas card: farm GPS pinned to its One Earth bioregion, plus a **"Verified on Filecoin"** badge. The judge clicks it and independently re-checks the content-addressed RADS object (attestor, geographic origin, grade, methodology) by CID at the gateway — trusting neither SlabClaw nor any registry. *This is the "origin record a distant buyer can believe," and it is shipped.*
4. **PRICE.** The 7-tier oracle shows the live fair price (ICE Arabica reference + Nairobi Coffee Exchange / specialty differential) **beside the local buyer's offer**, and computes `discount = (oracle − offer)/oracle` — the spread the farmer is normally denied, now shown to her.
5. **MATCH + SETTLE.** Publish the lot as an intent; a buyer bid arrives; an onchain settlement receipt lands on **Base Sepolia** via IntentRegistry (publish → fill → verify → settle), streamed live in the routes SSE UI. *Label on screen: TESTNET, MockUSDC — real-money leg is human-gated and TO-BUILD.*
6. **"THIS IS YOURS" reveal.** A panel shows the origin record is a CID the *farmer* controls and can carry to any buyer, the trust layer is MIT and forkable, and one command — `npx aqueduct up` — stands up the co-op's own node with the same trace and no Aqueduct server in the path.

**Fallback links, all live today and honestly the card vertical:** api.slabclaw.com (real grade-from-photo + live 7-tier oracle), regenatlas.xyz (live map + Filecoin provenance), hedera-hello-future.vercel.app (two agents grade-then-verify with real PASS/CAUTION).

---

## 6. What's open, and what would get worse if it closed (Q2e)

Mapped rule-by-rule to Sentient's **six beliefs** (their literal rubric), with concrete artifacts, not prose.

**#1 OPEN — "anyone can run it, inspect it, and build on it."**
License: the retargetable orchestrator + the 7-tier oracle/confidence logic + the coffee grade rubric + the Regen Atlas coffee-lot connector ship **MIT** (matching the already-MIT regen-atlas-integrations repo). Origin/observation data ships **CC-BY / CC-BY-SA**. This satisfies Sentient's pragmatic bar ("at least one critical element remains openly available and contributes meaningfully to adoption") without open-sourcing the entire prop-desk engine. **The named critical open element = the retargetable grade → origin → oracle orchestrator + the produce grade/oracle logic + the farmer-owned credential schema.**
> **Honesty fix required before submission:** the Regen Atlas production README line 71 currently reads "Proprietary — Ecofrontiers SARL" while the dApp + integrations repos and hackathon builds declare MIT/Apache/CC-BY-SA. We reconcile the README and state the actual split truthfully (public dApp + integrations MIT, data CC-BY-SA, admin panel closed). A license mismatch is fatal for a funder whose entire screen is "is openness the point."

**#2 YOURS TO KEEP — "a tool you can be cut off from was never yours."**
The origin + grade + reputation record is a **farmer-controlled content-addressed CID**, portable across buyers with no off-take lock-in. It is a producer-owned *relational claim* (Nondominium / hREA "property-as-relationship, not property-as-exclusion"), not a platform asset we can privatize and rent back. Material modularity (GCH Ch6) unbundles the crop-sale value from the data value, so she keeps the latter even after the lot sells.

**#3 ACCESSIBLE — "the cheapest phone is the only computer most of the world has."**
Offline-first assisted capture, low-bandwidth queued upload, local-language, co-op-mediated, and a small on-device grade path on the roadmap. This directly answers Ben Goertzel's caveat Sentient platformed (open code ≠ open access if the model is "ruinously expensive"): the wired LLM-vision path runs cheap, and the demo runs on a throttled cheap-Android profile, not a server farm.

**#4 GOOD FOR HUMANITY — "especially for those the market overlooked."**
The user is the smallholder Sentient names verbatim. The RCT scoping (grading + vouching + matching, not price feeds) means we attack the constraint that actually binds her income.

**#5 PRIVATE BY DEFAULT — "sensitive data never leaves the person's own device."**
The origin record is public *by design* (it is the thing a distant buyer must be able to re-verify), but the raw imagery and precise coordinates stay hers: on-device grading path on the roadmap, explicit consent + minimization today, and the farmer chooses what resolution of location enters the public record.

**#6 EMPOWERING, NOT EXTRACTIVE — the anti-middleman requirement, stated as a screen.** See §7.

**What gets worse if it closes, and for whom:** the reason *any* nature/provenance market fraud was ever caught is that the underlying data was open — "every single counterfactual-based impact evaluation of a nature market to date has been fundamentally enabled by public data availability" (Five Rules for Scientifically-Credible Nature Markets, Oxford Nature-positive Hub). If Aqueduct closed, the farmer's origin record becomes a claim only *we* can verify — a closed grade is exactly the opaque credential the incumbent middleman already sells, and the rent re-monopolizes. Openness here is not ideology; it is the scientific-integrity precondition a closed extractive tool structurally cannot meet.

---

## 7. Anti-middleman: mechanical, not promised (Belief #6)

The design is graded against the **Trustless Manifesto's principle 2** as a literal pass/fail spec published on the license page: *"if inclusion requires an intermediary users cannot realistically replace, it is not trustless; if that intermediary must be trusted, it is not neutral."*

1. **No indispensable intermediary.** MIT license + open prompts + `npx aqueduct up` self-hosting mean a co-op can *actually* fork and run the entire trust layer — replaceability, not a theoretical exit. This is OpenMandi's structural guarantee, grafted in as the core proof.
2. **Producer-owned record.** The grade/origin/reputation credential is a farmer-controlled CID (Nondominium / hREA), never a platform asset.
3. **The spread is surfaced, not hidden.** The oracle shows the live fair price beside the offer; REA / Value-Flow-Compass accounting makes the buyer's margin auditable — she finally sees the price she "never knows."
4. **No off-take lock-in.** Portable reputation + origin record travel across buyers; we take no exclusive off-take and no gatekept spread.
5. **Accountable governance.** Ostrom's 8 commons principles + Ruddick's open-ledger / peer-check "close and accountable" embeddedness test as a stated success metric, with unweighted / quadratic (not token-weighted) farmer governance to defeat wealth feedback loops.

**Structural backstop:** because an open competitor can replicate the layer, extractable rent is capped by construction. And we take the **GRANT track** (no equity, no claim on the work) precisely so the *funding structure* itself carries no rent-extraction incentive — taking equity would contradict the thesis the whole bid is built on. We position **against** DeHaat ($115M Series D, ~$700M valuation) and Bayer FieldView — the closed full-stack aggregators that ARE the "become the new middleman" failure mode (ETC Group "Commons to Code"; IPES-Food; Sarku 2025 on Farmerline/Mergdata). Aqueduct is the open, non-lock-in, farmer-owned version of the same trust layer.

---

## 8. Team — we wrote the book, then shipped the rails (Q2d)

Three non-bluffable proofs, in order:

1. **We wrote the reference works.** Patrick Rawson + Louise Borreani (Ecofrontiers SARL) authored *The Green Crypto Handbook* (Taylor & Francis, ISBN 9781041258933). Its Environmental Finance Stack (UMR → Data → Institution → Protocol → Asset → Market) is the exact framework Sentient's evaluation questions live inside. Borreani *also* authored the canonical ReFi-MRV reference (Kolektivo × Curve Labs, Celo Foundation, CC-BY) — we wrote the reference document on decentralized MRV — **and co-built Regen Atlas**, which is Asset 2 of this bid.
2. **We shipped the five-function pipeline twice.** SlabClaw/Aqueduct (grade → oracle → buy-rail for cards, live) and Regen Atlas (provenance + valuation for green assets, MIT). The hard part — identity resolution, grade oracle, execution rail, geospatial provenance — is done.
3. **Our agent pipelines surface honest failures.** The Hedera build's Diligence agent flagged 5 CAUTION tokens as "real data quality findings, not staged results" — precisely the diligence-trust posture Sentient screens for ("genuine value, not polish").

This is not adjacent credibility. The funder's screening questions ("what measurement technology backs this claim / where does data live / who governs it") are literally the framework these two authored and sold to central banks (Banque de France Le Lab, Central Bank of Uruguay).

**Stack fluency / integration offer:** Aqueduct's orchestrator-that-never-changes rhymes with ROMA's planner/executor/aggregator/verifier; we offer to run the produce-grading pipeline as ROMA agents and wire Open Deep Search as the buyer/price-discovery layer — which speaks their stack and unlocks the free engineering perk.

---

## 9. Track, amount, and what the grant unlocks

**Q3 Track: GRANT.** "No equity, no lockups, no claim on your work — you keep everything you make" is the funding-side mirror of the entire thesis (value + data stay with farmers; can't become the new middleman). Taking equity would reintroduce the extraction incentive the bid exists to remove. Investment optionality exists if they push, but we lead grant.

**Q4 Amount: $25,000** (with $50,000 reasoned as the field-pilot option). 25k is the aligned signal for "a credible extension of a shipped thing to a new vertical" — we are retargeting a shipped engine, not doing a research build. 50k only if the unlock genuinely scopes a Kenyan co-op field pilot with real lots; >50k would push us onto the milestone-gated Investment track, which we do not want.

**Q5 What the grant unlocks — concrete, "cannot happen without it":**
- A **coffee grade rubric + vision adapter** anchored to the SCA/Kenya public standard and the Coffee Beans Dataset — the one genuinely new model.
- A **live Kenyan coffee price feed** (Nairobi Coffee Exchange / specialty differentials + buyer bids) repointing the shipped oracle, so the spread is real and thick, not a synthetic feed that would reproduce the RCT failure.
- A **produce-lot connector** into the MIT Regen Atlas ingestion pipeline, minting a farmer-owned RADS/Filecoin origin record per lot.
- A **cheap-Android, offline-first, co-op-mediated front door** — the Belief #3 deliverable and the one thing we cannot cut without excluding the poorest.
- **`npx aqueduct up` self-hostable packaging** + open-license reconciliation + the farmer-owned portable-credential schema — the concrete anti-middleman guarantee.
- Sentient's **Distribution** help solves the one thing we cannot ship alone: farmer reach in underserved markets. Their **compute credits** + ROMA integration let the engine run for a $5 lot at a cost we could not otherwise hit — turning "compounds in the open" from slogan into a shared-infrastructure plan.

---

## 10. Risks and mitigations (Critic's standing list)

1. **Coffee grade-from-photo is the genuine to-build.** Field generalization across lighting/cultivar/camera/dirt is hard; public datasets are small (CBD, 450 imgs) and lab-clean. *Mitigation:* scope to one crop, anchor to the SCA/Kenya public standard the way SlabClaw anchors to PSA, cap confidence honestly, and never claim a validated production grader — show the pipeline + reference scoring.
2. **Live coffee price sourcing may be thin or scrape-hostile.** If the local feed is thin the oracle degrades to ICE futures — the exact US/UK-futures mispricing we critique. *Mitigation:* secure at least one real local comp source (Nairobi Coffee Exchange / specialty differential) before the demo; the grant funds this.
3. **Accessibility exclusion (#3).** Smartphone-only excludes the poorest. *Mitigation:* offline-first / assisted-capture / co-op-mediated / local-language, shown not asserted; on-device grade path on the roadmap.
4. **License reconciliation.** Regen Atlas README says "Proprietary." *Mitigation:* reconcile and state the true split before submission — a hard blocker, not optional.
5. **Real-money settlement is testnet-only.** Base Sepolia MockUSDC, human-gated. *Mitigation:* label every onchain leg TESTNET; a real-money produce purchase is roadmap.
6. **Anti-middleman claims are only real if the ownership/governance layer is actually built.** Shipping the app without the farmer-owned CID + portable reputation + open license would itself risk becoming the extractive intermediary (Farmerline/Mergdata is the cautionary precedent). *Mitigation:* the credential schema + self-host packaging are first-class grant deliverables, not nice-to-haves.
7. **Additionality trap.** The regen-origin credential must never be sold as a carbon/biodiversity offset (the Five-Rules critique the panel knows). *Mitigation:* it is strictly a provenance + quality + regen-condition attestation and an access-enabler, stated explicitly.

---

*Engine: slabclaw-app/backend (api.slabclaw.com). Origin layer: regenatlas.xyz + regen-atlas-integrations (MIT). Thesis: slabclaw-raise/aqueduct/AQUEDUCT-THESIS.md. All code claims in §4.2 verified in-repo on 2026-07-02.*
