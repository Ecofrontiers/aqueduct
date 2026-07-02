# Research 01 — How Smallholder Commodity Infrastructure Actually Works

> Aqueduct research series. Written 2026-07-02 by a research agent against
> `docs/DEMO-SPEC.md`. Purpose: ground the Routes/solver/logistics legs of the demo in
> field reality. Every factual claim carries a source (URL or local path). Where a claim
> rests on a search-result excerpt of a primary document rather than a full read, it is
> marked *(excerpt)*.
>
> **Local-library note:** Pat's library (`~/Desktop/2_resources/`) was mined first
> (RESOURCES.md index + Ecology + Nature Finance folders). It is rich on nature
> finance/bioregional capital but thin on smallholder commodity *operations*; the one
> directly relevant file is cited in §6. Everything else below is web-sourced, primary
> sources preferred.

---

## 1. Cooperative structures and collection-point mechanics

### 1.1 Coffee (washed, East Africa / Latin America pattern)

The atomic unit is the **cherry delivery**: a farmer carries picked cherry to a
collection point or directly to a cooperative **wet
mill** ("washing station" in East Africa, "beneficio" in Latin America). At intake the
cherry is inspected, weighed, and the farmer is **paid per kg of cherry delivered and
given a sales receipt** — TechnoServe's operational wet-mill guide treats the receipt as
the farmer's core record and shows a template of it
(https://www.technoserve.org/wp-content/uploads/2022/03/TechnoServe-Wet-Mill-Processing-Guide.pdf).
The cooperative then owns processing, quality control, financing, and sale of the
resulting parchment/green coffee
(https://www.nordicapproach.no/glossary/coffee-cooperatives-and-producer-associations).

**Payment is multi-tranche, not spot.** The dominant pattern is a small advance at
delivery plus a residual after milling and sale:

- Kenya (Meru): growers paid Sh20/kg **on delivery of cherries, "with the balance paid
  after the commodity is milled and sold"**; Co-operative Bank loaned coffee societies
  Sh200M to fund the cash-on-delivery advance *(excerpt)*
  (https://kuscco.com/index.php/who-we-are/92-ticker/165-coffee-growers-in-meru-to-get-cash-on-delivery-of-cherries).
- 60 Decibels' survey of a Kenyan coffee cooperative: "A typical farmer receives payments
  from the cooperative in their account **after 5 months** of selling their coffee but
  expect it to arrive in 2 months" *(excerpt; page timed out on full fetch)*
  (https://60decibels.com/insights/kenyan-coffee-farmers/).
- Second payments consolidate across the co-op's multiple export sales before being
  distributed to members (Kieni/Coffee Collective description, *(excerpt)*,
  https://www.facebook.com/thecoffeecollective/posts/1283975870426531/).

So the farmer's economics are: **spot advance ≪ final price, months of float carried by
the farmer**, with the cooperative as the aggregation, processing, finance, and sales
agent. Members also typically fund co-op operations via a fee or a percentage of crop
value (https://greencoffeecollective.com/blogs/learn/coffee-cooperatives).

### 1.2 Cocoa (Ghana — the state-marketing-board pattern)

Ghana is the canonical *regulated* aggregation chain. COCOBOD (state board) does **not**
buy from farmers; it licenses **Licensed Buying Companies (LBCs)** and allocates them a
seed fund for purchases
(https://www.facebook.com/cocobodgh/posts/1485901520237334/ — COCOBOD's own statement;
IISD case study of an LBC:
https://www.iisd.org/system/files/2024-08/responsible-agricultural-investment-ghana-cocoa.pdf).
The LBC's field presence is the **purchasing clerk (PC)** — a village-level agent who
buys cocoa at community collection points, checks quality, weighs, and pays
(https://www.instagram.com/p/DOa8Bk_guQL/; academic study of the farmer–PC relationship:
https://globaljournals.org/GJSFR_Volume12/5-Examining-the-Cocoa-Farmer-Purcha.pdf).
LBCs are authorized to buy from farmers and sell on to COCOBOD (IISD case study above);
LBCs compete with each other for farmer supply, and studies examine both their
competitive strategies and how farmers choose among them
(https://academicjournals.org/journal/JDAE/article-full-text/7C862C067894 *(excerpt)*;
https://www.researchgate.net/publication/376028470 *(excerpt)*).

Payment reality (Better Than Cash Alliance / Ghana Business & Financial Times,
full article read): the sector pushes **>7 billion cedis (~US$1.2B) per year in cash and
cheques to purchasing clerks**, who pay farmers in cash — **over 90% of farmer
transactions are still cash**; the cost and risk of cash is **>$20M/yr, more than 20% of
LBC turnover**; PCs carrying cash are robbery targets; the purchasing cycle can tie up
LBC working capital for up to 60 days; only 1 in 8 cocoa farmers has bought inputs with a
formal loan (https://www.betterthancash.org/news/the-cost-of-cash-to-ghanas-cocoa-sector).

### 1.3 Grain

Grain aggregation runs through the warehouse-receipt/commodity-exchange systems in §2
(Ghana GCX, ECX for maize/wheat/sesame) — the collection point *is* the certified
warehouse, and deposit rather than sale is the aggregation event.

**Design takeaway:** a "lot" at origin is not a static object — it is an *aggregation of
many small deliveries*, with identity created at the intake desk (weigh + receipt), and
with a **two-tranche payment liability** hanging off it for months.

---

## 2. Warehouse-receipt systems (WRS)

### 2.1 Mechanics

World Bank (Varangis, Jan 2025, full read —
https://blogs.worldbank.org/en/psd/can-warehouse-receipts-unlock-farmer-finance-):
farmers/traders/processors deposit crops in a **certified warehouse** run by **licensed
managers** and receive a **receipt evidencing stated quantity and quality**; the receipt
is usable as **bank-loan collateral**, letting the depositor wait out post-harvest price
recovery instead of distress-selling at harvest. Context figures from the same source:
**<3% of formal credit in emerging markets goes to agriculture**, and **30–40% of
harvested crops can be lost to poor storage**. FAO's reference framework lists the core
preconditions: enabling legal/regulatory framework, a regulatory and supervisory agency,
licensed warehouses and managers *(excerpt)*
(https://www.fao.org/4/i3339e/i3339e.pdf).

### 2.2 Where they operate

- **Ghana:** Ghana Commodity Exchange (GCX) runs an **e-WRS**; a SECO-funded World Bank
  project got 2,113 smallholders/SMEs $584,837 of receipt-backed finance with **zero
  defaults**, and 32 rural/community banks integrated into the GCX e-WRS
  (World Bank blog above).
- **Ethiopia:** the ECX (est. April 2008, Africa's first commodity exchange) operates
  **55+ warehouses across 17+ regional locations**; every deposited lot is third-party
  graded and payment clears **within 24 hours** of trade
  (https://www.ethiocoffee.co/insights/ecx-and-ethiopian-coffee-export, full read;
  export stats therein sourced to ECTA and USDA FAS Coffee Annual 2025).
- **Tanzania:** state-mandated WRS for cashew and other crops
  (https://www.rfilc.org/wp-content/uploads/2020/08/Review__of__Warehouse_pdf.pdf *(excerpt)*).
- **Malawi:** Agricultural Commodity Exchange; IFPRI examined who actually uses and
  benefits from it using transaction-level data *(excerpt)*
  (https://massp.ifpri.info/files/2020/05/MaSSP-Working-Paper-35_Who-Uses-and-Who-Benefits-From-WRS_May-12-2020.pdf).

### 2.3 Failure modes (the part a credible demo must respect)

- **Scaling constraints** (World Bank, full read): lack of farmer awareness; missing
  legal/regulatory frameworks to protect lenders; banks that don't know how to lend
  against receipts; shortage of suitable warehouses and management services.
- **Slow, tranched payouts erode trust:** in Tanzanian farmer surveys, **90% of
  respondents agreed the WRS "takes a long time to pay farmers"** *(excerpt)*
  (https://suaire.sua.ac.tz/bitstreams/2e02d18d-f3f3-477c-8228-b13f5cedbd03/download);
  payment arrives in "two to three tranches" and cooperative unions are weak *(excerpt)*
  (https://scholar.mzumbe.ac.tz/server/api/core/bitstreams/d2035f27-b30b-4559-b2a1-cc3ea2ecc14b/content).
- **Traceability destruction by commingling:** the ECX's original design **anonymized
  coffee origins** to prevent manipulation — traceability was "eliminated for 80% of the
  coffee exported" once ECX trading became mandatory, and specialty buyers revolted;
  reforms (2017 Direct Specialty License; Directive 1106/2025 expanding direct delivery
  and pre-trade information) were built to restore farm-level identity
  (https://www.mdpi.com/2077-0472/13/2/368;
  https://www.ethiocoffee.co/insights/ecx-and-ethiopian-coffee-export;
  https://royalcoffee.com/exchange-is-the-only-constant-the-evolution-of-ethiopias-commodity-marketplace/).

**Design takeaway:** a warehouse receipt is the closest real-world ancestor of Aqueduct's
"lot as financial object" — but the two historical failure axes are **payout latency**
and **identity loss on commingling**. An intent/solver layer that preserves lot identity
and settles fast is solving the *documented* pain, not an invented one.

---

## 3. Payment rails smallholders actually use

### 3.1 Mobile money at industry scale

GSMA State of the Industry Report on Mobile Money 2026 (landing page, full read —
https://www.gsma.com/sotir/): in 2025 mobile money processed **>$2.1 trillion** across
**2.3B registered accounts** (**593M active 30-day**; global 30-day activity rate 25.7%);
merchant payments grew ~50% to **$155B**, the fastest-growing use case. It took 20 years
to reach $1T in annual value and only four more to double it.

### 3.2 The agricultural last mile is still largely cash

- Ghana cocoa: **>90% of farmer transactions in cash** despite Ghana being a mobile-money
  leader; the digital pattern now emerging is *LBC bank → farmer wallet at the moment the
  purchasing clerk digitally records the cocoa receipt*, cutting LBC interest cost ~10%
  and robbery risk (https://www.betterthancash.org/news/the-cost-of-cash-to-ghanas-cocoa-sector).
- The predecessor instrument was the **Akuafo cheque** system — worth knowing as the
  historic "traceable farmer payment" rail (same source).

### 3.3 Rails are contested — the Kenya coffee payment fight (2025)

Kenya's Ministry of Cooperatives ordered the Nairobi Coffee Exchange to pay growers via a
**Direct Settlement System (DSS)** — individual accounts/M-Pesa, bypassing cooperative
societies. Farmers in Kirinyaga **opposed** it: they argue it will collapse cooperatives
and SACCOs, that two-season payment structures make direct payment hard, and that
individual farmers lose FX negotiating power ("who will negotiate our dollar?")
(https://citizen.digital/news/kirinyaga-coffee-farmers-oppose-cs-oparanyas-directive-to-pay-them-on-m-pesa-n364613,
full read; Mathira farmers likewise rejected M-Pesa payment "cooperatives will die" —
https://peopledaily.digital/business/mathira-coffee-farmers-reject-m-pesa-payments-says-cooperatives-will-die
*(headline/excerpt; page unreachable at fetch time)*). Courts suspended the directive in
some counties (https://www.youtube.com/watch?v=GeRKRiAgDBs *(excerpt)*).

**Why farmers defend the "slower" rail:** the cooperative/SACCO account is not just a
payment endpoint — it is where input credit, school-fee loans, and deductions are netted
against the crop payment. Disintermediating the payment disintermediates the credit stack.

**Design takeaway:** "pay the farmer instantly on their phone" is NOT automatically the
credible story. The credible story is **paying the aggregation node (co-op/LBC) with
transparent, fast pass-through and preserved deduction/netting logic**. A demo that wires
settlement to a single farmer wallet as the default would read as naive to anyone who
followed the 2025 Kenya fight.

---

## 4. Export logistics chain for a smallholder lot (and EUDR)

### 4.1 Who touches the lot (coffee reference chain)

1. **Farmer** → cherry to **collection point / wet mill** (co-op or private washing
   station); paid per kg + receipt (§1.1).
2. **Wet mill** → pulping, fermentation, washing, drying to parchment; QC and lot
   separation (TechnoServe guide, §1.1).
3. **Dry mill** → hulling parchment to green, grading/sorting, bagging (jute/sisal,
   often with moisture-barrier liner), lot sheets (CBI, below; Ethiopian workflow:
   https://guji-coffee.com/blog/ethiopian-coffee-shipping-logistics *(excerpt)*).
4. **Exporter** (licensed) → contracts, documents, trucking to port; in Ethiopia most
   volume must clear the **ECX auction + grading (G1–G5 on defects/300g + cup)** before
   export; buyers cannot trade on ECX directly — they buy through licensed exporters
   (https://www.ethiocoffee.co/insights/ecx-and-ethiopian-coffee-export).
5. **Freight forwarder / carrier** → most contracts are **FOB** (exporter responsible to
   the departure port, buyer takes over); landlocked origins use **FCA**. Small exporters
   share containers — but only with other coffee, never mixed commodities
   (CBI, full read: https://www.cbi.eu/market-information/coffee/tips-organise-your-export).
6. **Importer/trader → roaster** in destination market; payment is typically **Cash
   Against Documents** (paid on presentation of shipping docs; LCs only for very large
   shipments; direct-to-roaster terms can stretch to 100–360 days) (CBI, same page).

### 4.2 The paperwork stack (per CBI's exporter guide, full read)

Commercial invoice · **Bill of Lading** · **Certificate of Origin** (two flavors: the
**ICO Certificate of Origin** carrying a unique export identification code — rules at
https://www.icocoffee.org/wp-content/uploads/2022/11/icc-102-9-r5e-rules-certificates-origin-final.pdf —
plus an EU/chamber-of-commerce CoO) · **Phytosanitary certificate** issued by the origin
country's National Plant Protection Organisation · **Export license** (e.g., Uganda: URSB
registration + TIN + UCDA quality standard) · Packing list · Insurance certificate ·
Export declaration · possibly EUR.1 movement certificate for tariff preferences
(https://www.cbi.eu/market-information/coffee/tips-organise-your-export). Buyers judge
exporters on document *timeliness* — "your ability to show all documents on time is even
more important than the price of your coffee" (same source). Example origin timeline
(Uganda): lot inspection/grading days 15–21, phyto + CoO days 22–28 of the export cycle
*(excerpt)* (https://swabdealers.com/coffee-export-documents/).

### 4.3 EUDR traceability (Regulation (EU) 2023/1115)

From the European Commission's implementation portal (full read —
https://green-forum.ec.europa.eu/nature-and-biodiversity/deforestation-regulation-implementation_en):

- **From 30 December 2026**, products placed on/sold in/exported from the EU must be
  **deforestation-free** and **produced legally in the country of production**. Covered:
  cattle, **cocoa, coffee**, palm oil, rubber, soy, wood + derived products (Annex I).
- Obligation sits on the EU **operator** (first placer on the EU market) — but non-EU
  producers "may still be asked to provide information — such as the **locations where
  products were grown, harvested or raised**" so operators can comply (same page).
  For coffee this cashes out as **plot-level geolocation for all production areas**
  demanded down the chain by importers (e.g., importer supplier requirements:
  https://efico.com/supplierguidelineseudrcompliance/).
- Compliance is filed as a **Due Diligence Statement (DDS)** in the EU **Information
  System (TRACES platform)**, which issues reference numbers that travel with the product
  (EC page above; TRACES mechanics:
  https://www.cepi.org/wp-content/uploads/2025/09/FOR-25-058-Cepi-Guidance-on-EUDR-June-2025-Erratum.pdf).
- **Micro/small primary operators and downstream SMEs get simplified rules**; upstream
  operators carry full due diligence, downstream operators/traders lighter verification
  (EC supply-chain infographics, same portal).

Ethiopia's ECX reforms (Directive 1106/2025 — expanded direct delivery, better pre-trade
lot information) are explicitly framed around enabling EUDR-compliant sourcing
(https://www.ethiocoffee.co/insights/ecx-and-ethiopian-coffee-export) — i.e., the world's
commodity infrastructure is *currently being rebuilt* to carry farm-level geolocation.

**Design takeaway:** for a demo lot to be "EUDR-traceable" it needs, concretely: plot
geolocation (point or polygon), a production-date window, evidence of legality, and a DDS
reference number at EU import. The buyer criterion in DEMO-SPEC §3 ("Chiapas, SCA 84+,
EUDR-traceable, ≤$X landed") is exactly what a 2026 EU buyer would specify — but note
Mexico→EU coffee must carry the same geolocation package even though the anchor story is
financing, not deforestation risk.

---

## 5. Existing digital infrastructure reaching farmers

### 5.1 Farmerline / Mergdata (Ghana; the tech + legwork pattern)

Full read of Farmerline's own operational description
(https://farmerline.co/how-legwork-supports-the-delivery-of-technology-solutions-to-the-agricultural-last-mile/):

- A **hierarchical field-agent network** moves products/services "from national centres
  all the way to individual farmers"; agents first build relationships with community
  leaders before introducing tech.
- Agents build **digital farmer profiles** (identity, assets, activities) that "gradually
  grow to become an **economic identity**" positioning farmers for credit and insurance.
- Delivery channels match device reality: **voice messages in the farmer's native
  language**, **USSD ordering** for inputs (with free delivery through the agent
  network), community weather stations.
- Scale claim: Mergdata has supported 3,000+ partners in 50 countries to reach **2.3M+
  farmers** (https://farmerline.co/).

### 5.2 Digital Green (video-mediated extension)

- Model: train village-level extension agents to produce and screen short videos
  featuring **local model farmers, in local language**; mediators run facilitated
  screenings (https://digitalgreen.org/category/inspiration/;
  https://www.academia.edu/87970801/Digital_Green_Participatory_video_for_agricultural_extension).
- Evidence: J-PAL case study puts the cost of one farmer adopting one new practice via
  the video model at roughly **US$3.50**
  (https://www.povertyactionlab.org/case-study/video-based-support-small-scale-farmers-around-world);
  an RCT-grade study in Ethiopia found video-mediated extension **increases technology
  uptake** by improving access and farmer knowledge (Abate et al. 2023,
  https://pmc.ncbi.nlm.nih.gov/articles/PMC9693707/). Digital Green now layers an LLM
  assistant (Farmer.CHAT) on the same agent network
  (https://www.itu.int/en/ITU-D/Regional-Presence/AsiaPacific/SiteAssets/Pages/Events/2023/Digital%20Agriculture%20Solutions%20Forum%20%28DASF%29/Digital-Agriculture-Solutions-Forum/S2_P1_Pallassana_Digital%20Green.pdf).

### 5.3 EthicHub (the anchor platform — financing pattern)

- **Crowdlending with crowd-collateral**: since 2018, blockchain-based loans to
  smallholder coffee farmers excluded from formal finance, starting in Chiapas, Mexico;
  a community-staked collateral pool absorbs first loss so lenders will fund unbanked
  farmers (https://www.heifer.org/press-release/heifer-international-ethichub-invest-420000-to-improve-financial-access-for-smallholder-coffee-farmers-in-mexico;
  https://cerulean.vc/portfolio/cerulean-ventures-blog/financing-coffee-farms-growing-equityinvesting-in-ethichub;
  https://wiki.p2pfoundation.net/index.php/EthicHub).
- The loan is repaid from the coffee sale — i.e., EthicHub already couples **finance to
  the physical lot cycle** described in §1/§4, which is why it works as Aqueduct's anchor.
- Adjacent proof of the same Chiapas geography: Root Capital lends against coffee-co-op
  receivables in Chiapas (https://rootcapital.org/improving-livelihoods-and-increasing-smallholder-coffee-farmer-incomes-in-chiapas/).

**Common delivery pattern across all three:** none is app-first. All route through a
**trusted human aggregation layer** (field agent, video mediator, co-op) with tech as the
back office. Digital identity accretes *at the aggregation node*, not on the farmer's
phone.

### 5.4 Local library cross-reference

`~/Desktop/2_resources/Ecology/wri-ai-nature-restoration-insights.md` (WRI): local
farmers/stewards manage **50%+ of the world's land**; **$1.5B** investment opportunity in
restorative agricultural value chains in Kenya alone; lists Fanteakwa Cooperative Cocoa
Farmers (Ghana) as an agroforestry cooperative enterprise — useful named entities for the
map's breadth layer. (Rest of the library: bioregional finance and nature-market design,
relevant to the cert layer but not to logistics mechanics.)

---

## 6. Implications for the Aqueduct demo

What the swarm/routes rendering must get right to be credible to someone who knows this
field:

1. **The lot is an aggregate with a liability tail.** Render the anchor lot as an
   aggregation of many farmer deliveries at a named collection point/wet mill, not as
   "farmer X's 10 bags." The intake event (weigh + receipt) is where identity is born
   (§1.1). If the demo shows a payment, show it as the **two-tranche pattern** (advance
   at delivery, residual after sale) — a single instant spot payment to a farmer is the
   tell of someone who has never seen the field (§1.1, §3.3).

2. **Settle to the aggregation node, not the farmer's phone.** Kenya's farmers went to
   court to STOP direct M-Pesa payment because the co-op/SACCO layer carries their credit
   stack (§3.3). Aqueduct's onchain settle should visibly credit the cooperative/exporter
   entity, with farmer pass-through as a labeled downstream step. This is also exactly
   the LBC→purchasing-clerk digitization story in Ghana (§3.2) — Aqueduct rides a
   documented modernization wave instead of fighting the social structure.

3. **The solver's landed-cost route has a real checklist to mirror.** A credible route
   bid decomposes into: wet mill → dry mill → licensed exporter → FOB port (Incoterm
   stated) → Cash-Against-Documents payment on B/L presentation (§4.1–4.2). The route
   planner should name the document set (B/L, ICO CoO, phyto, export license, DDS ref) as
   route *steps with lead times* (Uganda example: grading d15–21, phyto/CoO d22–28) —
   documents ARE logistics in this trade ("ability to show all documents on time is more
   important than price," CBI §4.2).

4. **EUDR is a data-shape requirement, not a badge.** "EUDR-traceable" in the buyer
   intent must resolve to concrete fields the diligence agent can check: plot
   geolocation, harvest window, legality evidence, DDS/TRACES reference at import
   (§4.3). A green checkmark with no geolocation behind it will read as fake to anyone
   in coffee in 2026 — the whole origin world is mid-retrofit for this (ECX Directive
   1106/2025, §4.3).

5. **The warehouse receipt is the ancestor primitive — and its two failure modes are the
   pitch.** WRS already turned stored lots into collateral (§2.1) but historically failed
   on payout latency (90% of Tanzanian farmers: "takes too long to pay") and on identity
   loss when lots commingle (ECX anonymization destroyed traceability for 80% of exports,
   §2.3). Aqueduct's intent→solver→instant-settle flow and lot-identity preservation
   should be narrated *against* those two documented failures — that's the field-real
   justification for the whole architecture.

6. **The scout/aggregator agents mimic a real job.** Farmerline's field agents building
   farmer economic identities at the last mile (§5.1) and Digital Green's mediator
   network (§5.2) are the human versions of Aqueduct's scout agents. Framing scouts as
   "reading the surfaces where aggregators already publish" (EthicHub, Algrano, GCX/ECX
   listings) matches how data actually enters this ecosystem: at the aggregation node,
   through an agent layer — never from individual farmer phones (§5, honest per
   DEMO-SPEC's no-farmer-facing-app scope).

7. **Get the vocabulary right on screen.** Cherry vs parchment vs green; wet mill / dry
   mill; purchasing clerk and LBC (cocoa); FOB/FCA; Cash Against Documents; DDS/TRACES;
   G1–G5 (ECX grades) vs SCA cup score — the demo's captions using the field's own terms
   correctly is cheap credibility; misusing them is expensive.

---

### Source quality note

Full reads: World Bank PSD blog (WRS), Better Than Cash Alliance (Ghana cocoa cash), CBI
coffee export guide, EC Green Forum EUDR portal, GSMA SOTIR 2026 landing, Ethio Coffee
ECX guide (industry primary, stats attributed to ECTA/USDA), Farmerline legwork article,
Citizen Digital (Kenya DSS fight). Excerpt-level: TechnoServe wet-mill guide (PDF),
FAO i3339e, ICO ICC-102-9, IFPRI Malawi WP, Tanzanian WRS theses, 60 Decibels, KUSCCO,
swabdealers timeline. Claims from excerpt-level sources are marked and kept to what the
excerpt itself states.
