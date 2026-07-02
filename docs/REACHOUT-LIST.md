# Aqueduct — Reachout & Test List

> Built 2026-07-02 by mining the Green Crypto Handbook (all 7 final chapters, `3_archives/green-crypto-handbook.tar.gz`)
> + the bid docs + ecosystem knowledge. Purpose: who we test the Aqueduct app **with** (field partners,
> verification peers, buyers) and **against** (comparables that already claim aqueduct-price transparency).
> GCH = cited in our own book → warm, non-bluffable opener ("we covered you in our Taylor & Francis handbook").

## Tier 1 — Field partners (test WITH farmers; the missing "farmer touchpoint" in the bid)

| Org | Who / where | Why them | What we test | GCH anchor |
|---|---|---|---|---|
| **EthicHub** | Crowdlending to smallholder **coffee** farmers (Chiapas, Mexico; expanding), staked-ETHIX crowd-collateral | The in-book smallholder-coffee precedent our bid already cites. They have real coffee co-op relationships + a default-risk problem our grade+origin record directly de-risks (a graded, CID-verifiable lot is better loan collateral) | Grade-from-photo on their farmers' real lots; origin record as lending collateral; aqueduct spread vs the price their farmers actually get | Ch6 (staked ETHIX / reversible collateral) + Ch7 (crypto-staking insurance for global-south microcredit) |
| **Grassroots Economics** (Will Ruddick, Sarafu) | Kenya — community currencies, deep rural co-op networks | THE Kenya field-access shortcut. Our bid already cites Ruddick's "close and accountable" governance model. They know which co-ops would actually try a shared-Android capture flow | Co-op-mediated assisted capture UX; whether the spread display changes seller behavior; governance fit | Ch5 (Sarafu-Credit full case study) |
| **Silvi** | Tree-planting MRV — photo-based verification, mobile-first payments to smallholder planters (East Africa) | Closest live analog to our capture flow: cheap-phone photo → verified claim → payment. They've solved field-photo QA (lighting, GPS spoofing, duplicate submissions) — exactly our to-build risks | Their field-photo QA learnings vs our capture; interop: a Silvi-style attestation as the regen-condition secondary credential | Not in book (Pat-named). Verify current chain + geography before outreach |
| **Farmerline** | Ghana — voice-first (6 languages), 1M+ farmer reach | The distribution reality-check our accessibility claims lean on (bid cites them). Also the cautionary precedent (Sarku 2025 / Mergdata) — they've lived the "become the middleman" critique | Whether co-op-mediated beats voice-first for capture; what actually breaks on cheap Androids at collection points | Cited in bid docs, not GCH |
| **Digital Green** | India + Africa — farmer extension via village video | Assisted-capture delivery model at scale; nonprofit, partnership-friendly | Front-door UX validation; co-op onboarding script | Cited in bid docs, not GCH |

## Tier 2 — Verification / MRV peers (test the grade + origin record)

| Org | Who | Why them | What we test | GCH anchor |
|---|---|---|---|---|
| **Shamba Network** | **Kenya** — Chainlink-integrated climate/ag oracles; parametric insurance for smallholders; ran the Marsabit County vegetation-health data challenge with Ocean Protocol | Kenyan, agricultural, oracle-native — the single most on-thesis verification peer. Their ag-data feeds could be a tier in our coffee oracle; our origin record could trigger their insurance | Oracle interop (their climate data as an input tier); whether our CID origin record can serve as their insurance-claim evidence | Ch3/Ch7 (Chainlink oracle integration, Marsabit challenge, parametric insurance tables) |
| **GainForest** | AI + community MRV, measure-to-earn | Photo/AI verification of nature claims by non-experts — direct methodological peer for grade-from-photo. They publish on the equity problem of who benefits from data collection | Adversarial review of our vision-grading confidence model; measure-to-earn as co-op officer incentive | Ch1/Ch3 (measure-to-earn, verification equity) |
| **Open Forest Protocol** | Decentralized forest-MRV validation network | Their validator model (independent parties re-verify field claims) is the scaled version of our Hedera two-agent PASS/CAUTION loop | Whether our origin record survives independent validator re-verification; validator economics | Ch1 (data pipeline + legacy-vs-digital MRV figures) |
| **Regen Network** | Ecocredit registry, Cosmos; CID-addressed metadata on IPFS | Registry-grade methodology rigor; staked-verifier attestations. The "who governs the credential" conversation | Credential schema review; whether a coffee-lot origin record could anchor a Regen methodology | Ch3/Ch5 (IPFS CID governance metadata, verifier staking) |
| **Astral Protocol** | Location-proof infrastructure (location claims / proofs / composite credibility) | Our farm-GPS→bioregion anchor is a location claim; their framework is the formal spec for making it adversarially robust | GPS-spoofing resistance of the origin record | Ch3 (three-component location-proof framework) |
| **Dryad** | ERC-8004 + iNaturalist + Base | The proven pattern our farmer-owned ERC-8004 identity cites as precedent | ERC-8004 credential portability | Bid docs (FUSION §4.2) |

## Tier 3 — Buyer side (test the match + price legs)

| Org | Who | Why them | What we test |
|---|---|---|---|
| **Genuine Origin** (Volcafe/ED&F Man) | Green-coffee importer, direct-trade platform, US | Literally the source our bid cites for "coffee is priced by US/UK futures desks" — they wrote the explainer. A distant buyer with a real re-verification problem | Would their sourcing team trust a CID-verifiable origin record over a paper chain? What grade evidence moves their bid? |
| **Algrano** | Swiss farmer-to-roaster direct-trade marketplace | The closest live "farmer reaches distant buyer" marketplace; growers list, roasters bid — our buyer-match leg in Web2 form | Whether our graded+verified lot gets better bids than an unverified listing; buyer-side API interop. *Verify current status* |
| **Beyco** (Progreso Foundation) | Blockchain coffee-trading platform connecting growers to buyers | Nonprofit, blockchain-native, coffee-specific — direct comparable AND potential rail | Where their contract/provenance model stops vs ours (self-hosting, farmer-owned CID). *Verify current status* |

## Tier 4 — Benchmark AGAINST (comparables whose gaps define our demo)

| Org | Claim | The gap we demonstrate |
|---|---|---|
| **iFinca** | "Verified aqueduct price" coffee app | Price transparency without credible *grading* or portable origin record — the RCT failure mode (price feed alone) |
| **Farmer Connect** ("Thank My Farmer", IBM) | Consumer-facing coffee provenance | Provenance points *downstream* (consumer storytelling), not *upstream* (farmer's price power); registry-trust, not CID-verifiable |
| **Agrotoken** | Tokenized grain commodities (Argentina), proof-of-reserves | Commodity tokenization for producers who already have scale — the $5-lot smallholder is exactly who it excludes (GCH Ch6) |
| **DeHaat / Climate FieldView** | Closed full-stack ag aggregators | The named "become the new middleman" failure mode — already positioned against in the bid |

## Rails & standards (not reachout targets, but the demo depends on them)

- **Nairobi Coffee Exchange** — the live local price feed (grant deliverable M2). Scrape/API feasibility check BEFORE the demo — risk #2 in FUSION §10.
- **SCA (Specialty Coffee Association)** — the public grade standard we anchor to; their Q-grader network is the human ground-truth for validating grade-from-photo.
- **ICE Arabica (C-contract)** — the futures reference tier; also the rent narrative's villain, so cite externally (not via our own book).

## Sequencing (test plan order)

1. **EthicHub** — one email gets: real coffee-farmer photos to grade + the field touchpoint the application is missing. Highest value per hour.
2. **Shamba Network** — Kenya + ag + oracles; one call covers field access AND oracle interop.
3. **Grassroots Economics** — Kenya co-op access; Ruddick is already load-bearing in the bid's governance section.
4. **Silvi** — field-photo QA learnings before we build the capture flow, not after.
5. **Genuine Origin or Algrano** — one buyer-side conversation validates (or kills) the "distant buyer believes the CID" thesis.
6. GainForest / OFP / Regen / Astral — after the one-sample demo exists, as adversarial reviewers of it.

> ⚠️ Statuses marked *verify* were not re-checked against live sources today. Before any outreach email:
> confirm the org is alive, the program still runs, and the contact route (per feedback_google_resolver_slugs — never guess).
