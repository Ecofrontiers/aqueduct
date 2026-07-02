# 05 — The Commodity Layer: Who Aggregates & Serves Smallholder Commodity Data + Trade Today

> Research pass 2026-07-02 for Aqueduct (`docs/DEMO-SPEC.md`). Competitive frame is the
> **commodity side** (aggregation + trade + finance), NOT regen/carbon MRV — that was
> covered separately (see `2_resources/Maps and GIS/ecospatial-competitor-landscape-2026-05.md`,
> which confirms the same "no one owns the full stack" pattern on the ecological-credit side).
> Extends `docs/REACHOUT-LIST.md` (prior pass) — does not duplicate it.
> Method: TinyFish web search + prior corpus. Sources cited inline. Anything not re-verified
> against a live primary source today is marked **UNVERIFIED**.

---

## 1. Blockchain / digital commodity platforms

Every one of these is **single-vertical or single-platform**. They compete to *be* the venue
a farmer sells inside, or they do *one function* (traceability OR tokenization OR provenance)
for *one crop*. None aggregates across the others.

### GrainChain (grain; Texas/Mexico)
- **What:** Vertically-integrated grain-trade stack — buyer↔farmer contracts negotiated in a
  digital portal, escrow/settlement via its own tokens, plus silo/receipt management
  (SiloWise). Sets up the contract *before* the commodity ships, then automates payment on
  delivery ([Miller Magazine](https://millermagazine.com/blog/grainchain-a-blockchain-based-platform-for-commodity-trading-launches-in-mexico-3231); [The Daily Scoop](https://www.thedailyscoop.com/news/retail-business/startup-pilots-blockchain-based-platform-buy-sell-grain)).
- **Scale/funding:** Raised **$29M** (2023, [SiliconAngle](https://siliconangle.com/2023/02/17/grainchain-raises-29m-expand-agricultural-blockchain/)); a later **$3M** round incl. Bed Bath & Beyond investors ([LinkedIn](https://www.linkedin.com/posts/jesselandry23_fraud-supplychains-farmers-activity-7376021733239169024--xmk)). Named a top blockchain startup. Real-usage volume numbers **UNVERIFIED**.
- **Model:** Closed proprietary platform + native token for settlement. Take-rate/SaaS.
- **Open vs closed:** **Closed.** Own ledger, own token, own portal. No open API surface an outside aggregator could scout.
- **Readable surface:** Low — closed portal; no public listing feed found.

### AgriDex (multi-commodity RWA; Solana)
- **What:** Decentralized marketplace tokenizing real-world agricultural assets; producers
  list/execute/settle trades on-platform, settled in **stablecoins**, with digital
  letters-of-credit; integrated **Stripe Bridge** for fiat on/off-ramp ([The Block](https://www.theblock.co/post/307055/agridex-completes-first-agricultural-rwa-trade-on-solana); [Yahoo/Stripe Bridge](https://sg.finance.yahoo.com/news/solana-based-rwa-platform-agridex-150258616.html)).
- **Scale/funding:** ~**$9M+ raised** (pre-seed $5M led by Endeavour Ventures; $4M strategic led by Portal Ventures) ([Dealroom](https://app.dealroom.co/news/feed/agridex-facilitates-first-farmland-trade-raises-9m); [The Defiant](https://thedefiant.io/news/infrastructure/solana-based-agridex-marks-usd9m-in-stablecoin-trades-across-african-markets)). Reported **~$9M in stablecoin trades across African markets**; a "Loam" product targeting **$40M** cross-border payment volume by end-2025 ([Token Dispatch](https://www.thetokendispatch.com/p/agridex-fixing-global-agricultural)). Profit projections are self-reported/**UNVERIFIED**.
- **Model:** Onchain DEX/marketplace; fees on settlement + payments.
- **Open vs closed:** Onchain (Solana) → **transactions are readable**, but it is *its own*
  marketplace, not an aggregator over others.
- **Readable surface:** Medium-high — onchain settlement is inspectable; marketplace listings likely gated.

### Dimitra (multi-crop compliance/traceability; global)
- **What:** NOT a marketplace — a **data/compliance infrastructure** layer: farm mapping,
  field records, traceability + compliance evidence (EUDR-style), farm-financing enablement.
  Deployments in **Uganda, Mexico, Kenya, Indonesia** ([Dimitra](https://dimitra.io/); [Medium](https://dimitratech.medium.com/dmtr-utility-in-the-real-world-7a55bd027655)).
- **Scale:** National-scale deployments claimed; **DMTR** token thinly traded (~$0.0055, ~$150k/day — [CoinMarketCap](https://coinmarketcap.com/currencies/dimitra/)). Farmer counts **UNVERIFIED**.
- **Model:** SaaS + token utility; sells workflows to national partners/govts.
- **Open vs closed:** **Closed** platform; token-gated utility.
- **Readable surface:** Low — compliance records are private to partners.

### Agrotoken (grain tokenization; Argentina/Brazil)
- **What:** "1 token = 1 ton of grain" — commodity-backed stablecoins (soy/corn/wheat) with
  proof-of-reserves in certified silos; used as **loan collateral** (Santander partnership) and
  as spendable digital cash; published grain **indices** with Matba-Rofex ([Santander](https://www.santander.com/en/press-room/press-releases/2022/03/santander-and-agrotoken-join-forces-to-offer-loans-secured-by-cryptoassets); [Algorand case study](https://algorand.co/case-studies/how-agrotoken-uses-algorand-to-cultivate-a-fairer-agricultural-future); [Matba-Rofex](https://www.matbarofex.com.ar/documentos/prensa/launch-agrotoken-grain-indices)).
- **Scale:** Scaled across Argentina + Brazil; a Mercy Corps pilot explicitly tried to extend it
  to *smallholders* — implying the base product serves **producers who already have scale/stored grain** ([Mercy Corps](https://medium.com/mercy-corps-social-venture-fund/pilot-launch-leveraging-grain-tokenization-to-unlock-credit-for-argentinas-smallholder-farmers-2092ff060d9c)). Exact TVL/volume **UNVERIFIED**.
- **Model:** Tokenization infra; fees on mint/collateralization. (Now also branded **Justoken**.)
- **Open vs closed:** Onchain (Algorand) tokens = **readable**; issuance is permissioned.
- **Readable surface:** Medium — token contracts + indices are public; reserve backing is off-chain-attested.
- **The gap it *is*:** the $5-lot smallholder is exactly who grain-tokenization *excludes* (needs stored, graded, warehoused tonnage). Matches REACHOUT-LIST Tier-4 framing.

### Beyco (coffee; Progreso Foundation, NL)
- **What:** Neutral, nonprofit **coffee trading + connection** platform on blockchain; producers
  upload docs/samples per lot, contract + trade with roasters, optional traceability display,
  access to finance. Progreso "does not buy or sell — just facilitates" ([Beyco FAQ](https://beyco.nl/faq?lang=en-us); [Daily Coffee News](https://dailycoffeenews.com/2018/10/04/progreso-launches-innovative-blockchain-backed-trading-platform-beyco/)).
- **Model:** Nonprofit-run marketplace; facilitation, not principal trading.
- **Open vs closed:** **Web2 marketplace** (public listing pages); blockchain used for data ownership. No open API found.
- **Readable surface:** Medium — grower/lot listings are web-scrapeable. (Already a REACHOUT-LIST Tier-3 target.)

### Algrano (coffee; Switzerland)
- **What:** Farmer-to-roaster **direct-trade marketplace** — growers list coffees with clear
  pricing + defined volumes; roasters bid/buy; Algrano handles logistics, shared shipments,
  and financing. US launch 2023 ([Algrano](https://algrano.com/); [Daily Coffee News](https://dailycoffeenews.com/2023/04/10/direct-trade-green-coffee-platform-algrano-makes-us-launch/)).
- **Scale:** **4,000+ connections** facilitated over 10 years; in 2024, **90% of traded volume** was between roasters and producers with an *existing* relationship ([Comunicaffe](https://www.comunicaffe.com/algrano-the-online-gateway-among-coffee-producers-and-roasters-in-the-past-10-years-weve-facilitated-over-4000-connections/)).
- **Model:** Web2 marketplace; take-rate + logistics/finance services. (Not blockchain.)
- **Open vs closed:** **Web2, public marketplace pages** — the most scoutable coffee surface.
- **Readable surface:** High — public listing/offer pages with prices + volumes.

### Farmer Connect / "Thank My Farmer" (coffee provenance; IBM Food Trust)
- **What:** **Consumer-facing** provenance — scan QR on a Folgers/UCC pack, trace the bean's
  origin, tip the farmer ([PRNewswire](https://www.prnewswire.com/news-releases/farmer-connect-uses-ibm-blockchain-to-bridge-the-gap-between-consumers-and-smallholder-coffee-farmers-300981149.html); [thankmyfarmer.com](https://www.thankmyfarmer.com/)).
- **Status:** All substantive references cluster **2020–2022**; built on IBM Food Trust (itself
  wound down as a distinct offering). Appears **dormant/legacy — UNVERIFIED current activity**.
- **The gap it *is*:** provenance points *downstream* (consumer storytelling), not *upstream*
  (farmer price power). Registry-trust, not farmer-portable credential. (REACHOUT-LIST Tier-4.)

### iFinca (coffee "farmgate price" transparency)
- **What:** B2B blockchain mobile app that **verifies coffee's price from farmgate onward** along
  the chain; traceability + "fair, transparent pricing." Agri-fintech social enterprise;
  listed on FAO STI portal ([Producer & Roaster Forum](https://producerroasterforum.com/q-a-ifinca-2/); [FAO STI](http://sti-portal.fao.org/innovations/ifinca); [SustainCoffee](https://www.sustaincoffee.org/partners/ifinca)).
- **Model:** B2B SaaS subscription (ran a 4-month free-trial push in 2025).
- **The gap it *is*:** price transparency **without credible grading or a portable, farmer-owned
  origin record** — the "price feed alone" failure mode. (REACHOUT-LIST Tier-4 benchmark.)

---

## 2. Public / institutional rails

### eNAM — National Agriculture Market (India)
- **What:** Pan-India electronic trading portal networking existing APMC **mandis** into one
  market; price discovery, remote bidding, e-payments ([enam.gov.in](https://enam.gov.in/); [FAO STI](http://sti-portal.fao.org/innovations/enam-platform)).
- **Scale (large, and real):** **1,656 mandis** across 23 states + 4 UTs by March 2026;
  **~1.80 crore (18M) farmers**, 2.73 lakh traders, 4,724 FPOs ([PIB Govt of India](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2251543&reg=3&lang=1)).
- **Digital?** Yes — trading + **real-time mandi price** data. Public commodity price data is
  surfaced (Indiastat/Statista mirror it), but a clean public **developer API is UNVERIFIED**;
  access is portal/app-first, single-country.
- **Readable surface:** Medium — public mandi prices are scrapeable; lot-level trade data is gated.

### WFP Building Blocks (humanitarian cash, not commodity trade)
- **What:** **Privately-managed (permissioned) blockchain** assigning each beneficiary a unique
  account so multiple aid agencies avoid duplicated assistance; settles cash-for-food without
  routing every payment through banks. Started 2017 (Jordan/Azraq, iris-scan auth); scaled to
  hundreds of thousands of refugees ([WFP](https://www.wfp.org/building-blocks); [WFP Innovation](https://innovation.wfp.org/project/building-blocks)).
- **Relevance:** Proof that a **neutral shared coordination ledger across many organizations**
  works at scale — but it's a closed, permissioned aid-disbursement network, **not** a
  commodity market and **not** externally readable.
- **Readable surface:** None (permissioned, private).

### National warehouse-receipt registries (digital collateral rails)
- **What:** Electronic warehouse receipt systems (eWRS) let farmers deposit certified produce
  and receive a secure digital receipt usable as **loan collateral** — reducing distress sales.
  **Kenya launched a national eWRS central registry** in Feb 2026 ([WRSC Kenya](https://wrsc.go.ke/2026/02/26/kenya-launches-the-electronic-warehouse-receipt-system-to-transform-agriculture-commodity-trade-in-the-country/); [TradeMark Africa](https://trademarkafrica.com/kenya-launches-electronic-warehouse-receipt-system-to-cut-post-harvest-losses-and-unlock-finance-for-smallholder-farmers/)). Vendors like **GMEX** sell registry+tokenization modules ([GMEX](https://www.gmex-group.com/electronic-warehouse-receipts/)).
- **Digital?** Increasingly yes, but **per-country, siloed registries** — no cross-border layer,
  no open aggregation. India (WDRA) + several African states run parallel systems.
- **Readable surface:** Low-medium — national registries, mostly access-controlled.

---

## 3. The closed full-stack aggregators

### DeHaat (India)
- **What:** India's largest **full-stack** agritech — inputs, advisory, output-buying, financing,
  market linkage, all in one closed platform. Acquired Olam-backed AgriCentral to reach
  **~13M farmers (~15% of India's farmers)** ([RTP Global](https://rtp.vc/how-to-grow-an-agritech-company/); [Inc42](https://www.facebook.com/Inc42/posts/); [PRNewswire](https://www.prnewswire.com/news-releases/dehaat-indias-homegrown-full-stack-agritech-platform-raises-us115-million-301409100.html)).
- **Scale:** FY25 revenue **₹3,041 crore (~$337M), +11% YoY**; turned profitable FY25;
  ~$700M valuation ([LinkedIn analysis](https://www.linkedin.com/posts/utkarsh-mishra-60a3b5187_day-1315-analysing-indian-startups-dehaat-activity-7411749295831371776-huh_)).
- **Captures:** the *entire* farmer relationship + all transaction data — the textbook
  **"become the new middleman"** model.
- **Open vs closed:** **Fully closed**, proprietary. No external readability by design.

### Climate FieldView-type (Bayer) & precision-ag stacks
- **What:** Closed full-stack farm data platforms (agronomy telemetry, prescriptions). Data is
  the moat and is **not** externally readable. Named in the bid as the "become the middleman"
  failure mode. (No new primary source pulled this pass — consistent with REACHOUT-LIST Tier-4.)

---

## 4. GAP analysis — who does what (positioning table)

| Player | Vertical | Function | Aggregates ACROSS platforms? | Intents/solvers for physical goods? | Open-source / open API? | Readable by an outside scout? |
|---|---|---|---|---|---|---|
| **GrainChain** | Grain | Own contract+settlement venue | No | No | No (closed + own token) | Low |
| **AgriDex** | Multi (RWA) | Own onchain marketplace | No | No (DEX for its own listings) | Onchain readable; not OSS | Med-High |
| **Dimitra** | Multi | Compliance/traceability records | No | No | No | Low |
| **Agrotoken** | Grain | Tokenization / collateral | No | No | Onchain tokens readable | Med |
| **Beyco** | Coffee | Nonprofit marketplace | No | No | Web2 pages; no open API | Med |
| **Algrano** | Coffee | Direct-trade marketplace | No | No | Web2 pages; no open API | **High** |
| **Farmer Connect** | Coffee | Consumer provenance (dormant?) | No | No | No | Low |
| **iFinca** | Coffee | Price/traceability app | No | No | No (B2B SaaS) | Low |
| **eNAM** | Multi (India) | Public spot-market portal | Within India only | No | Prices public; dev API unverified | Med (prices) |
| **WFP Building Blocks** | Aid cash | Multi-org coordination ledger | Across *agencies*, not markets | No | No (permissioned) | None |
| **Warehouse-receipt registries** | Multi | Digital collateral registry | No (per-country) | No | No | Low-Med |
| **DeHaat / FieldView** | Multi | Closed full-stack aggregator | No (owns the farmer) | No | No | None |
| **CoW / UniswapX / LI.FI / 0x** | Crypto tokens | **Intent/solver networks** | Yes — across *DeFi liquidity* | **No — digital tokens only** | Mostly open | (N/A, onchain) |
| **OADA / GOAT / AgroAPI / USDA FAS API** | Ag data | Open **interoperability standards** | Standards, not a trade layer | No | **Yes, open** | (data, not trade) |

### What the table shows
- **Cross-platform aggregation of smallholder commodity trade: nobody.** Each commodity
  platform wants production *inside its own venue*. The only "aggregate across venues"
  primitive that exists — the **intent/solver network** (CoW, UniswapX, LI.FI, 0x) — operates
  **exclusively on fungible crypto tokens**, never on physical, graded, origin-bound commodity
  lots ([LI.FI](https://li.fi/knowledge-hub/with-intents-its-solvers-all-the-way-down); [CoW](https://cow.fi/learn/what-is-intent-based-trading); [0x](https://0x.org/post/intents-in-defi)).
- **Open efforts exist only for telemetry, not trade/finance.** OADA, GOAT, AgroAPI,
  USDA FAS OpenData are open **interoperability standards for precision-ag/field data** — none
  is a trade-execution or certification-aggregation layer ([OADA](https://openag.io/principles/); [GOAT](https://goatech.org/category/features/); [USDA FAS](https://stgapps.fas.usda.gov/opendatawebv2/)).
- **The regen/ecological side mirrors this exactly:** the ecospatial landscape found "no
  competitor touches the full stack" — visualization OR measurement OR registry OR finance,
  never combined (`2_resources/.../ecospatial-competitor-landscape-2026-05.md`). Same negative
  space, adjacent domain.

---

## 5. Readable surfaces at demo time — feasibility ranking

Feeds DEMO-SPEC §4 connector priority. Ranked by "can a scout agent read lot-level data in ≤1 day."

| Rank | Surface | Why feasible | Read type | Risk |
|---|---|---|---|---|
| **1** | **EthicHub** (anchor, REQUIRED) | Onchain crowd-lending (BSC/xDai) + public hub/loan pages; loans-per-cooperative are the intended public record ([EthicHub](https://www.ethichub.com/en/blog/originator-hub); [GSMA](https://www.gsma.com/solutions-and-impact/connectivity-for-good/mobile-for-development/blog/blockchain-in-agriculture-global-lessons/)) | Onchain + web | Lot↔loan granularity **must be spike-verified** (DEMO-SPEC §4 escalation) |
| **2** | **Algrano** | Public direct-trade marketplace pages: grower, origin, price, defined volume — the cleanest scrapeable coffee listing surface | Web2 scrape | ToS/scrape fragility; no official API |
| **3** | **Agrotoken** | Onchain tokens on Algorand + published grain indices — machine-readable by design | Onchain read | Reserve backing is off-chain; not smallholder-granular |
| 4 | **Beyco** | Public coffee listing pages (nonprofit, likely scrape-tolerant) | Web2 scrape | Coverage/liveness of listings unknown |
| 5 | **eNAM prices** | Public real-time mandi prices (mirrored by Indiastat/Statista) | Web2 scrape | India-only; lot-level trades gated; dev API unverified |
| 6 | **AgriDex** | Onchain Solana settlement is inspectable | Onchain read | Marketplace listings likely gated; thin smallholder coverage |
| — | DeHaat, FieldView, WFP, Dimitra, iFinca, Farmer Connect | Closed by design / dormant | — | Not scoutable — render as labeled **TO-BUILD** connectors |

---

## The gap sentence

**Nobody runs an open, cross-platform aggregation + certification + intent/solver layer over
the venues where smallholder commodity production already lives — every incumbent either owns a
single crop's marketplace and wants the farmer trading *inside* it (GrainChain, AgriDex, Algrano,
DeHaat), or performs one isolated function (tokenization, traceability, or provenance) for one
crop in one country — and the only intent/solver networks that aggregate across venues at all
work exclusively on fungible crypto tokens, never on physical, graded, origin-bound commodity lots.**
