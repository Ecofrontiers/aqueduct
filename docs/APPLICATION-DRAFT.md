# Aqueduct — Sentient Foundation Open Source AGI Grant Application

> Final, submittable copy for form.typeform.com/to/IRj7WaKH. Written to be pasted field-by-field.
> Voice: plain, conviction, real building, not polish. Open is the point.
> Every claim in this draft was verified in-repo on 2026-07-02. Real-vs-to-build is labeled throughout;
> blurring the two is a diligence trust-killer and we refuse to do it.

---

## Q3 — TRACK

**Grant.**

We are choosing the Grant track deliberately, against the pull of the larger check. The whole thesis of this bid is that the farmer keeps the value and the data, and that no operator — including us — can turn the trust layer into a new toll. Taking equity would reintroduce the exact rent-extraction incentive the design exists to remove. "No equity, no lockups, no claim on your work" is not a concession we accept; it is the funding structure that makes the anti-middleman argument congruent. If value stays with farmers, the funding cannot be structured to eventually pull it back to us.

Investment optionality exists — the engine has commercial pedigree and Ecofrontiers runs a live consulting practice — but we lead Grant because a public good pointed at the world's poorest reads honestly only when the funder holds no claim on the upside.

---

## Q4 — AMOUNT

**$25,000 USD.**

This is a retarget, not a research project. Four of the five middleman functions you name are already shipped as orchestrator-invariant code (verified below). $25k funds the genuinely-new work: the coffee grade rubric + vision adapter, one live coffee price feed, the produce-lot connector into Regen Atlas, and the cheap-Android co-op front door. That is a weeks-not-quarters build because the hard part is done.

We would move to $50k only if, in conversation, we jointly scope a real Kenyan co-op field pilot (a named cooperative, on-the-ground assisted-capture, a first cohort of lots run end to end). That crosses from "retarget the engine" into "put it in farmers' hands in the field," which is a bigger, honest ask. We are not padding the number to reach it. Anything above $50k belongs on the Investment track, and we are not asking for that.

---

## Q2(a) — What problem are you solving, and why now?

A smallholder carries her coffee to the one buyer she can reach and takes the price she is given, because she cannot prove it is worth more. Farms under two hectares grow around a third of the world's food (28-31% of crop production, 30-34% of food supply, on ~24% of agricultural land — Ricciardi et al. 2018 / FAO; we deliberately do not repeat the debunked "70-80%" figure). Perishable post-harvest loss runs 40-50%, and FAO finds it cuts the income of ~470 million smallholders by up to 15%. On top of physical loss sits information-asymmetry rent: the classic Stigler (1961) case, where the party who knows the grade and the buyer captures the surplus. Green coffee specifically "is mostly priced by centralized futures exchanges in the USA and UK" (The Green Crypto Handbook, Ch6) — the aqueduct price is set an ocean away from the farm.

The middleman is not a villain. He does real work she cannot: he grades the quality, he vouches for it to a distant buyer, he knows the buyers and the price, and he moves the lot. Every one of those is a judgment task. The reason to build now is that all four became automatable at once. A vision model can grade produce from a photo against a public standard. A content-addressed origin record can let a distant buyer re-verify provenance without trusting any registry. A live-market oracle can price the lot. An agent-payment rail can match it and settle onchain. Digital MRV already collapses per-lot verification cost — "ten projects per day per verification officer, compared to legacy systems' annual throughput of 100-150" (SustainCERT 2022, via GCH Ch1) — erasing the project-size minimums that kept a $5 lot illegible.

And the obvious failure mode is now visible in the field: the RCT record (Nakasone, Peru; Reuters Market Light across 100 Maharashtra villages; the J-PAL/ATAI synthesis) shows that giving farmers a price feed alone does not raise incomes. The binding constraint is credible grading, vouching, and buyer-matching — not the price signal in isolation. So a price app is the wrong build. The four judgment functions are the right build. That is exactly the tool you asked for, and it is exactly the tool we already shipped for a different good.

Why us, why now: we did not spend this grant learning to build the trust layer. We shipped it — live at api.slabclaw.com over a database-verified 5,776-product universe — for graded collectibles, where the same five functions (grade a card from a photo, resolve its true identity, price it against live sold-comps, match it to a buyer, settle onchain) already run. We are retargeting the node labels from a $5,000 Charizard to a $5 coffee lot. The orchestrator never changes; that is an explicit design property, not a hope.

---

## Q2(b) — Who does this help?

The smallholder coffee grower who currently sells at the aqueduct to the single accessible buyer and never sees the price that buyer gets downstream. Coffee is the deliberate first crop: it has a public grade standard to anchor to (SCA / Kenya AA-AB, the way our card engine anchors to PSA), a field dataset to train against (the Coffee Beans Dataset, 9 grades), a documented rent to remove (US/UK futures-desk pricing), and an in-book precedent (EthicHub's coffee-farmer loans).

Concretely it helps her, and it helps the cooperative she belongs to, in three ways a price feed cannot:
1. She gets a credible grade she can show a buyer she has never met.
2. She gets an origin record that buyer can independently re-verify by content-address, so she can reach past the local monopsony to a distant market she was previously locked out of — the UNDP-documented gap where third-party certification is too expensive and excludes smallholders from premium/export buyers.
3. She sees the spread — the gap between the live-market price and the offer in front of her — which today is precisely the number she is denied.

The co-op is a first-class user, not an afterthought: the delivery model is co-op-mediated and offline-first, because ~27% sub-Saharan mobile-internet penetration means a smartphone-only app would exclude the exact people the market forgot. We design for the assisted-capture, low-bandwidth, one-shared-Android-at-the-collection-point reality, which is also how Farmerline and Digital Green actually reach farmers.

It also helps the distant buyer, who today cannot believe a smallholder's origin claim without an expensive intermediary. A CID-verifiable origin record is trust infrastructure that serves both ends — which is why this bid answers both halves of your product request at once.

---

## Q2(c) — In one line, what are you building?

An open, cheap-Android trust layer that grades a smallholder's coffee lot from a photo, binds it to a farmer-owned origin record a distant buyer can re-verify by CID, prices it against the live market, and matches it to a buyer with an onchain settlement receipt — the shipped Aqueduct engine retargeted from a $5,000 Charizard to a $5 coffee lot, self-hostable so no operator can become the new middleman.

---

## Q2(d) — Who is building this, and why is your team the right one to do it?

Patrick Rawson and Louise Borreani, Ecofrontiers SARL — an applied-research agency working at the frontier of AI orchestration, blockchain mechanism design, and climate infrastructure since 2021, advising central banks, international organizations, and foundations on how public blockchains intersect with environmental finance.

Three non-bluffable proofs, in order:

1. **We wrote the book on this exact domain.** "The Green Crypto Handbook: Blockchain for Sustainability Professionals" (Rawson & Borreani, Taylor & Francis / CRC Press, ISBN 9781041258933). Its core artifact is the Environmental Finance Stack — UMR -> Data -> Institution -> Protocol -> Asset -> Market — a six-layer diligence methodology. Your own evaluation questions ("what measurement backs this claim, where does the data live, who governs it") are literally the framework we authored and sold to central banks. Louise separately authored the canonical decentralized-MRV reference (Kolektivo x Curve Labs, Celo Foundation, April 2023, CC-BY) — the reference document on how to make a small producer's origin record believable at near-zero cost, which is the precise problem in your farmer request.

2. **We already shipped the five-function pipeline — twice.** SlabClaw / Aqueduct (live, api.slabclaw.com): grade-from-photo Claude Vision, identity resolution over 5,776 edition-separated products with 88 contamination guards in a single filter function, a 7-tier live-market price oracle, a USDC-to-marketplace buy rail closed at the Hermes hackathon, ERC-4626 tokenized custody on Base Sepolia. Regen Atlas (regenatlas.xyz, the public dApp and integrations repos MIT): 505 tokenized green assets geo-anchored to 185 bioregions, with a Filecoin provenance layer (RADS objects, CID-verifiable, "no registry trust required") that won 1st place in Infrastructure & Digital Rights at Protocol Labs' PL_Genesis (572 submissions). Louise co-built Regen Atlas — it is not a partner we cite, it is Asset 2 of this bid.

3. **Our agent pipelines surface honest failures.** In our Hedera build, two autonomous agents coordinated purely through consensus (no shared database); the diligence agent independently cross-verified tokens and returned 10 PASS and 5 CAUTION — real data-quality findings on missing provenance, not staged results. That is the diligence posture you screen for: genuine value, not polish.

The hard part — identity resolution, grade oracle, execution rail, geospatial provenance — is done. This grant funds retargeting node labels, not inventing the trust layer.

---

## Q2(e) — What's open about it, and what would get worse if it closed tomorrow, and for whom?

Openness here is not a values slide. It is a scientific-integrity requirement and a mechanical anti-rent property. We map it to your six beliefs with concrete artifacts, then make the anti-middleman guarantee a pass/fail contract on the license page.

**The critical open element (your "at least one critical element" bar):** the retargetable grade -> origin -> oracle orchestrator, the produce grade/oracle logic, and the farmer-owned credential schema — MIT-licensed, matching the already-MIT Regen Atlas integrations repo; CC-BY / CC-BY-SA on data. This is the piece that lets the trust layer become a commons instead of a proprietary toll.

- **#1 Open** — the orchestrator, oracle/confidence logic, coffee rubric, and Regen Atlas coffee-lot connector are MIT and inspectable. Anyone can run it, fork it, and point it at a new crop.
- **#2 Yours to keep** — the origin + grade + reputation record is a farmer-controlled, content-addressed CID she carries to any buyer. No off-take lock-in. It is a relational claim she owns (the Nondominium / hREA pattern), not a platform asset we rent back to her.
- **#3 Accessible** — offline-first, low-bandwidth, co-op-mediated, with an on-device grade path on the roadmap. This is our direct answer to the Goertzel caveat you platformed: open code is not open access if the model is ruinously expensive. It has to run on the cheapest Android at the collection point, and we design for that from day one.
- **#5 Private by default** — raw imagery and precise coordinates stay on her device; only the public record she chooses to publish is exposed, at her chosen resolution.
- **#6 Empowering, not extractive** — the spread is surfaced, not hidden. She finally sees the price the buyer gets.

**Anti-middleman as a mechanical pass/fail (from the Trustless Manifesto, co-authored by Vitalik Buterin — "if inclusion requires an intermediary, it is not trustless"):**
1. No indispensable intermediary — `npx aqueduct up` stands up a co-op's own node with no Aqueduct server in the path. The community can actually fork and exit, not just "theoretically."
2. Producer-owned record — the CID is hers.
3. Rent surfaced, not hidden — the oracle exposes the spread (REA / Value-Flow-Compass accounting).
4. No off-take lock-in — the record is portable across buyers.
5. Accountable governance — Ostrom's 8 principles + Ruddick's close-and-accountable open-ledger model; unweighted / quadratic voting to defeat wealth feedback loops.

The structural backstop: because the layer is open, an open competitor can replicate it, which caps the rent any operator (including us) can extract. That is the version where value and data stay with farmers, and it is the only version that survives your #6.

**What gets worse if it closed tomorrow, and for whom.** If this closed and re-formed as a proprietary aggregator, it becomes the exact failure mode you name — a DeHaat or a Climate FieldView, a closed full-stack platform that captures margin at both ends and owns the farmer's data (the "data colonialism" the ETC Group and IPES-Food document). The farmer loses the one thing that let her reach a distant buyer: an origin record anyone can re-verify without trusting the platform. And there is a harder, scientific loss. Every counterfactual impact evaluation of a nature/provenance market to date was only possible because the underlying data was public ("Five Rules for Scientifically-Credible Nature Markets," zu Ermgassen et al., Oxford). A closed origin record cannot be independently checked, so it cannot be believed, so it cannot command the premium — for the farmer, for the honest buyer, and for the integrity of the market itself. Open is the only version that works, for exactly the people who lose the most when it doesn't.

**Honesty note we are fixing before submission:** the Regen Atlas production README currently reads "Proprietary — Ecofrontiers SARL" on line 71 while the dApp and integrations repos are MIT. We are reconciling that to state the true, clean open license (MIT public dApp + integrations, CC-BY-SA data, admin panel closed) before we submit, because a blurred open story is a diligence trust-killer and openness is your actual screen.

---

## Q2(f) — Demo or trial link (REQUIRED, https://)

**Primary (live today):** https://api.slabclaw.com — the shipped Aqueduct engine: real grade-from-photo, real 7-tier price oracle over 5,776 products, real spread/discount compute. This is the trust layer, running, for graded cards.

**Provenance layer (live today):** https://regenatlas.xyz — the geospatial origin-record layer: 505 assets geo-anchored to bioregions, each with a "Verified on Filecoin" badge a judge can click to independently re-check the RADS provenance object by CID at the gateway, trusting no registry.

**In-window demo link (what we ship in the grant window):** a coffee-lot instance of the same live stack — one farmer, one Kenyan green-coffee sample, end to end on a throttled cheap-Android profile: capture -> grade against the SCA/Kenya AA-AB rubric with a confidence chip decoupled from the grade -> Regen Atlas origin card with the CID-verifiable Filecoin badge -> 7-tier oracle showing the live fair price beside the buyer's offer and the spread -> publish intent, buyer bid, onchain settle receipt streamed in the routes SSE UI. We will provide this URL when the coffee adapter is stood up; it is not a mockup, it is the existing engine with new node labels.

**Real-vs-to-build ledger for the demo (we state this on the demo page itself):**
- REAL / shipped: vision capture -> strict-JSON pipeline; 7-tier oracle + tier-regression guard (store-v2.mjs:46 and :240, verified) + confidence model; identity-resolution gate; IntentRegistry publish/fill/settle on Base Sepolia (84532 broadcast on disk, verified); Regen Atlas PostGIS bioregion anchoring + RADS-on-Filecoin (Calibration testnet); two-agent diligence loop.
- TO-BUILD in-window: coffee grade rubric + vision prompt adapter; one live coffee price feed (Nairobi Coffee Exchange + specialty differentials + buyer bids); produce-lot connector into the Regen Atlas ingestion pipeline; crop×grade×lot identity taxonomy; offline-first cheap-Android front door; `npx aqueduct up` self-host packaging + open-license reconciliation + farmer-owned credential schema.
- ROADMAP, explicitly NOT claimed live: real-money mainnet purchase (human-gated); a field-generalized grader across cultivars and lighting; live satellite MRV; USSD/voice. The Hermes buy loop is Base Sepolia test-mode only (MockUSDC, self-fulfil roundtrip, $200 cap) — the demo shows buyer-match and settlement end-to-end on testnet honestly; a real-money produce purchase is a build item, never surfaced as live.

---

## Q5 — What would the grant unlock?

Concretely, in the next few months, and impossible at this cost without it:

1. **A working coffee grade oracle anchored to a public standard.** The vision capture->JSON pipeline is shipped; the grant funds the coffee rubric + prompt adapter scored against SCA / Kenya AA-AB (screen size, defect count, colour, quaker), with the confidence chip decoupled from the grade so a thin read is never dressed as a confident one. Ships as MIT, so it becomes reusable produce-grading infrastructure the ecosystem can fork per crop — "compounds in the open," not a private model.

2. **One live coffee price feed wired into the 7-tier oracle.** The tiering, the tier-regression guard, and the spread compute already run; the new work is the source adapter (Nairobi Coffee Exchange + specialty differentials + buyer bids). This is the moment the farmer first sees the spread she is denied today.

3. **The produce-lot connector into Regen Atlas + the farmer-owned credential schema.** The connector architecture (fetch->parse->normalize->geo-anchor->provenance) is shipped and MIT; a "produce/farm" connector is the same shape as an existing chain connector. This turns a farm GPS point + grade into a CID-verifiable origin record — the ~$50k-per-project MRV floor that excludes smallholders collapses to near-zero per lot. That cost collapse is the single "cannot happen without it" unlock: it is what makes a $5 lot legible at all.

4. **The cheap-Android, co-op-mediated front door + `npx aqueduct up` self-host packaging.** Offline-first assisted capture so we reach the farmers the market forgot rather than only the connected ones, plus the one-command self-host that makes the anti-middleman guarantee mechanical rather than promised.

**Where your non-money support is load-bearing, not decorative:** your Distribution help solves the one thing we cannot ship alone — farmer reach in underserved markets, the hardest problem in agtech. Compute credits + your ROMA orchestrator let the engine run for a $5 lot at a per-lot cost we could not otherwise hit (our fixed-orchestrator / retargetable-node design is ROMA-shaped — planner/executor/verifier — so this is a real integration, not a name-drop), and Open Deep Search is a natural fit as the buyer/price-discovery layer. That is how "compounds in the open" becomes a shared-infrastructure plan instead of a slogan.

Milestone framing (if you prefer gates): M1 coffee grade oracle live on the demo; M2 live price feed + visible spread; M3 CID origin record for a real lot; M4 cheap-Android co-op capture + `npx aqueduct up` public. Gate on farmer-retained-value and independent re-verifiability, never on GMV.

---

## Q6 — Supporting docs (<=10MB): deck + video-demo plan

**One PDF deck (<=8MB), 8 slides:**
1. The farmer and the aqueduct price — the person losing money, in one sentence (your verbatim ask claimed back).
2. The five middleman functions -> the five shipped Aqueduct primitives, side by side (grade / origin / price / match / track), with the honest "$5k Charizard -> $5 coffee lot" retarget line.
3. Architecture: the orchestrator that never changes; Regen Atlas plugs into one seam (the origin record). Rhymes with ROMA planner/executor/verifier.
4. The oracle, live: ORACLE_TIER map + tier-regression guard as a real code invariant, the spread the farmer never sees.
5. Open, mechanically: the six beliefs mapped to artifacts + the Trustless-Manifesto anti-middleman pass/fail + `npx aqueduct up`.
6. Real-vs-to-build ledger (the same table as Q2(f)) — nothing blurred.
7. Team: the Taylor & Francis book + the ReFi-MRV reference + Regen Atlas, one line each.
8. Ask: Grant, $25k, what ships, the milestones.

**One video demo (<=2.5MB compressed, ~2 min, screen recording, no polish):** the live api.slabclaw.com grade+oracle flow on a real photo, then the regenatlas.xyz "Verified on Filecoin" click-through re-verifying a provenance object by CID, then the coffee-lot retarget walked step by step with the real-vs-to-build labels visible on screen. The killer 20 seconds is step 3+4 back to back: a distant buyer believes the origin record without trusting us, and the farmer sees the spread. We record the product working — we do not stage it.

Total upload well under 10MB. If the video pushes the limit, it links out (unlisted) and the deck carries the <=10MB budget alone.

---

## Internal notes (NOT submitted)

- Amount: default $25k. Only move to $50k in-conversation if a named Kenyan co-op field pilot is scoped. >$50k => Investment track, out of scope.
- Pre-submission blocker to clear: reconcile Regen Atlas README line 71 ("Proprietary") vs MIT dApp/integrations. The open story collapses if this is left inconsistent.
- Verified 2026-07-02: products=5,776; ORACLE_TIER store-v2.mjs:46; tier guard store-v2.mjs:240 (`incomingTier > existingTier continue`); confidenceFor:92; ebay-registry filter guards ~88; IntentRegistry Base Sepolia broadcast at contracts/broadcast/Deploy.s.sol/84532/run-latest.json.
- Honesty boundaries enforced: Hermes buy loop is Base Sepolia test-mode (MockUSDC, $200 cap), no mainnet/real money; macOS Vision path is macOS-only so the produce app leans on the wired LLM-vision path; iNaturalist biodiversity oracle / ERC-8004-per-farmer / satellite MRV are to-build, never surfaced as live.
