# 07 — Lot identity ground truth: how the coffee trade actually numbers, tracks, splits, and joins lots

> Research for the Aqueduct canonical lot schema + cross-platform identity resolution
> (DEMO-SPEC §4 connectors, §5 rails). Researched 2026-07-02, web via TinyFish.
> Companion to research/01 (EUDR/docs-as-logistics), 03 (EthicHub join caveat), 05 (platform landscape).

---

## 1. The ICO identification mark — the only (near-)universal lot ID, and what it actually identifies

**Structure (primary source: ICO Rules on Statistics — Certificates of Origin, ICC-102-9 Rev. 3, Rule 3):**
every export of coffee must bear a mark "corresponding only and exclusively to the parcel of
coffee concerned" — either the **ICO identification mark** or the WCO **Unique Consignment
Reference (UCR)**. The ICO mark has three parts:

| Part | Size | Who assigns it |
|---|---|---|
| Country code | up to **3 digits** | the ICO (allocated to each Member country) |
| Grower/exporter code | up to **4 digits** | the **Member country** (its national certifying agency), per registered grower/exporter |
| Parcel serial number | up to **5 digits** | the **grower/exporter itself**, starting at "1" for the first parcel exported on/after 1 October each year, sequential |

Example (San Cristobal Coffee Importers / FincaLab deck): `016-02922-0003` = Mexico (016) —
exporter 02922 — lot 0003. The mark is printed on all bags (or stamped on a metal strip) and
**must be declared on the ICO Certificate of Origin**, which is issued by the national
Certifying Agency and stamped by Customs.
Sources: [ICC-102-9 Rev. 3 (ICO, 2021)](https://www.ico.org/documents/cy2020-21/icc-102-9-r3e-rules-certificates-origin.pdf);
[SCM "Coffee Naming Convention" deck](https://www.sancristocafe.com/media/archives/ICO-Extension_SCM_10a.pdf);
[XLIII Coffee explainer on ICO Marks](https://xliiicoffee.com/en/journal/ico-marks-in-the-coffee-industry/).

**Is it still in force post-reform?** Yes for members. The **International Coffee Agreement 2022**
carries the requirement forward: "Every export of coffee by an exporting Member shall be covered
by a valid Certificate of Origin"
([ICA 2022 text](https://www.ico.org/documents/cy2021-22/ica-2022-e.pdf)). The current rules
revision is **ICC-102-9 Rev. 5**, listed under ICO Key Documents
([ico.org/key-documents](https://ico.org/key-documents/)). ICO membership is 75 countries
covering **94% of production** ([Coffee Development Report 2022-23](https://www.icocoffee.org/documents/cy2024-25/coffee-development-report-2022-23.pdf)) —
so effectively all Mexican (016) coffee carries a mark, but the system is not literally
universal (non-member origins; samples under 60 kg exempt, per the XLIII explainer).

**Four properties that matter for Aqueduct:**
1. **It identifies an export parcel (shipment), not a farm lot.** The mark is born at export
   time; everything upstream (cherry, parchment, mill batches) has no ICO identity. SCM's deck
   says it flatly: "The ICO marks have no information about the detailed origin, process, or
   quality of the coffee in the bag" — which is why SCM invented its own extension
   (`016-2588-001-D-NDA-SS2`: +origin community, +process/blend ID, +screen/shape/grade).
2. **The serial resets every coffee year (Oct 1).** An ICO mark is only unique when qualified
   by coffee year — `016-02922-0003` recurs annually.
3. **Assignment is three-level federated**: ICO → national agency → exporter. The last field is
   self-assigned by the exporter, with no registry of what physical coffee it maps to.
4. **A UCR may lawfully substitute for it** (Rule 3), so even the "universal" ID has two formats.

## 2. Inside the co-op: paper ledgers first, ERPs second

**The paper baseline.** TechnoServe's Coffee Wet Mill Processing Guide describes the standard
co-op/wet-mill bookkeeping system as a set of ledgers: **cherry delivery records, parchment
records, dry milling report, cupping records, lot traceability sheet, expense book, asset
register** ([TechnoServe guide, PDF](https://www.technoserve.org/wp-content/uploads/2022/03/TechnoServe-Wet-Mill-Processing-Guide.pdf)).
The atomic record is the **cherry delivery** (farmer × date × weight at the mill gate); a "lot"
is an aggregation constructed later on the lot traceability sheet. Grower delivery notes
accompany parchment to the mill.

**Cropster Origin (the dominant specialty ERP, mill/exporter side).** Cropster's own docs
define the model ([Getting started with Cropster Origin](https://help.cropster.com/en_US/getting-started-/getting-started-with-cropster-origin);
[Lot building](https://help.cropster.com/en_US/origin-operations/lot-building)):
- **Supply Network**: typed contacts — Field, Farm, Association, **Cooperative**, Community,
  Wet mill, Dry mill.
- **Batches are registered at mills** under a 2–3-character mill prefix (permissioned per
  mill manager); each batch carries the **crop year**.
- Coffee is tracked through **three weight states**: *received* (delivered by suppliers,
  pre-processing), *stored* (post-processing, pre-dry-mill), *green* (export-ready), with a
  **yield factor** (ratio/%) connecting states and an error tolerance vs. estimates.
- Receptions can be **separated into parts** (unripe/ripe/overripe/dry; by weight, percentage,
  or by supplier) — so even one delivery forks into multiple quality streams.
- **"Lot building" = grouping batches into lots**, which then enter Green Inventory. A lot is
  a *constructed grouping*, not a natural unit.
- On the roaster side (Cropster Roast), the green-lot record's API-sync fields are:
  **External ID, Green Lot Name, Weight, ICO Number, Price, Location** — i.e. Cropster itself
  treats the ICO mark as one attribute of a lot, plus a free-text external ID
  ([Cropster features page](https://www.cropster.com/products/roast/features/)). Internal lot
  IDs are Cropster-generated (SG-/PG- numbers; lots can be split across warehouses).

**Other systems.** CoopAtlas (Kenya) shows the same shape for co-op ops software: farmer
registry with **farmer numbers** + GPS plots → factory (wet mill) cherry intake → **batch
creation + product separation** → season records → stock/custody → "published lots" for buyers
([coopatlas.co.ke/coffee](https://coopatlas.co.ke/coffee)). Yave ran blockchain **auctions of
lots** (20 Guatemalan lots, 2019) — lots defined by the exporter/producer per auction, not by
any shared registry ([GCR Magazine](https://www.gcrmag.com/yave-to-hold-worlds-first-blockchain-coffee-auction/);
[Perfect Daily Grind](https://perfectdailygrind.com/2018/11/producer-roaster-forum-blockchain-auction-announced-for-2019/)).
Farmforce and "agOS"-type first-mile systems were in scope but no primary lot-model
documentation was retrieved this pass — treat as unverified; do not cite in the demo.

**Takeaway:** a "lot" inside a co-op is **whatever grouping the mill chose to construct** —
producer-day deliveries, quality-separated parts, a whole season's community blend — keyed by
local IDs (farmer number, batch prefix + number, crop year) that never leave the co-op's books.

## 3. Splitting and merging: what identity survives the chain

Physical flow: **cherry → (wet mill) → parchment → (dry mill) → green**, with weight shrinking
at each state (Cropster's yield factor exists precisely to reconcile this). Identity events:

- **Split at reception**: one farmer delivery separated into ripe/unripe/overripe parts
  (Cropster "Coffee separation") — one delivery becomes 2–4 quality streams.
- **Merge at the wet mill**: deliveries from many farmers on the same day are fermented/dried
  together — the classic **day lot**. Identity above the day-lot level is *records-based*
  (the cherry delivery ledger), not physical.
- **Merge at lot building**: day lots/batches are blended into an export lot sized to a
  contract (a container ≈ 275 bags). SCM's extension encodes this honestly: when coffee is
  blended across communities the community field becomes "XX" and traceability moves to a
  **Blend ID** referencing the constituent wet-mill/patio lots (SCM deck, slide 6).
- **Split at export/import**: one lot splits across warehouses and buyers (Cropster lot
  splitting; [7 Cropster tools](https://www.cropster.com/blog-post/7-cropster-tools-that-help-you-manage-green-coffee-with-ease/)).

**"Micro-lot" is a curation construct, not a unit**: "A microlot may represent one producer,
or 10 producers, or one portion of one producer's farm — or several hundred producers"
([Genuine Origin](https://blog.genuineorigin.com/2017/10/microlots/)); Nordic Approach defines
it as a lot "separated from the main harvest or processing batch"
([Nordic Approach glossary](https://www.nordicapproach.no/glossary/coffee-microlot)).

**What survives commingling** is formalized by certification chain-of-custody levels
(Rainforest Alliance Traceability Annex, highest→lowest): **Identity Preserved** (single farm,
never mixed) → **Segregation** (certified mixed with certified) → **Mass Balance** (certified
and non-certified mix physically; the claim survives only as an accounting volume)
([RA Traceability Annex](https://knowledge.rainforest-alliance.org/docs/traceability-annex);
[RA on mass balance](https://www.rainforest-alliance.org/business/certification/what-is-mass-balance-sourcing/)).
Below IP, farm-level identity is a **claim backed by ledgers**, not a physical fact.

## 4. Traceability standards actually in force

- **ICO marks / Certificates of Origin** — the only trade-wide system; shipment-level (§1).
- **GS1 is NOT established upstream in green coffee.** GS1 Sweden announced a *pilot* to apply
  GS1 standards to the coffee chain ([gs1.se pilot](https://gs1.se/en/news/new-pilot-project-to-improve-traceability-in-the-coffee-supply-chain/)) —
  the "pilot" framing is itself the evidence. GS1's own EUDR positioning proposes EPCIS
  key-data-elements — who = **GLN**, what = **GTIN + batch + quantity**, when/where/why —
  and batch-level GTINs for EUDR ([GS1 in Europe EUDR white paper](https://gs1.eu/wp-content/uploads/2025/04/GS1-in-Europe-EUDR-white-paper.pdf);
  [GS1 UK](https://www.gs1uk.org/insights/news/GS1-standards-and-the-fight-against-deforestation)).
  Downstream (roasted retail product) GS1 GTINs are universal; farm/mill/export lots do not
  carry them today.
- **EUDR is the forcing function** (research/01 §EUDR): coffee entering the EU from
  30 Dec 2026 needs **plot geolocation for all production plots, a production/harvest window,
  legality evidence, and a Due Diligence Statement (DDS) filed in the EU Information System**,
  with a DDS reference number at import — a brand-new, regulation-assigned identifier layer
  that co-ops are being retrofitted for right now.
- **GCA contracts** (US trade rules): "On spot contracts the identifying marks or lot numbers
  must be included" ([GCA Contract Terms](https://greencoffeeassociation.org/wp-content/uploads/2021/09/GCA-Contract-eff-9-27-21.pdf)) —
  the trade's contractual identity anchor is the mark/lot number pair plus the contract number.
- **Digital pilots**: Beyco (Progreso Foundation) is a blockchain contract/trading platform —
  identity lives at **contract level** ("verification tool for your impact claims by confirming
  your contract data": [beyco.nl](https://beyco.nl/for-whom/buyers?lang=en-us)), with QR-coded
  coffees and a farmer app feeding it ([Beyco 2020 report](https://www.progreso.nl/wp-content/uploads/2022/11/2020-Beyco-year-report_single-pages.pdf);
  [Daily Coffee News](https://dailycoffeenews.com/2018/10/04/progreso-launches-innovative-blockchain-backed-trading-platform-beyco/)).
  Farmer Connect / "Thank My Farmer" (IBM Food Trust) is dormant (research/05). None of these
  created a shared lot-ID namespace; each platform mints its own.

## 5. The joinability question: same physical lot on two platforms

What identifiers exist at each level, and who can join on them:

| Level | Identifier | Scope | Cross-platform joinable? |
|---|---|---|---|
| Farmer delivery | farmer number + date (co-op ledger/ERP) | private to co-op | No — never published |
| Mill batch / day lot | mill prefix + batch no. + crop year (Cropster/CoopAtlas) | private to co-op/exporter | No |
| Export lot | **ICO mark** (+ coffee year), or UCR | trade-wide, on bags + CoO + transport docs | **Yes, when both platforms publish it** — the only shared key that exists |
| Contract | contract/PO number; GCA "marks or lot numbers" | bilateral | Only within the two counterparties |
| Import (EU) | **DDS reference** (EUDR, from 30 Dec 2026) | regulator-assigned | Yes in principle — but visible to operators/authorities, not public |
| Platform listing | platform-minted ID (EthicHub shop lot id, Beyco contract id, Cropster SG-no., auction lot no.) | per platform | No — namespaces never coordinated |

**The EthicHub ground case confirms this** (research/03): the same producer appears on the
shop (lot 79), the lending API (projects 698/704), and a Celo credit line — and "there is no
public field linking shop lot id → lending project id → onchain credit line. The join
(Neri Ortíz ↔ San José Ixtepec) is by name/place." Specialty platforms sell at exactly the
level (micro-lot/offer) where no shared identifier exists; the ICO mark exists at exactly the
level (container/shipment) most listings sit *below*.

**So an aggregator can join on**, in descending strength:
1. **ICO mark + coffee year** — deterministic, but only for export-stage lots and only if
   published (importers' offer sheets sometimes carry it; farm-level shop listings almost never).
2. **DDS reference** — deterministic post-2026 for EU-bound coffee, access-gated.
3. **Contract number** — deterministic but bilateral/private.
4. **Composite fuzzy key**: producer/co-op name + origin (region/community) + crop year/harvest
   + process + variety + screen/grade + quantity — probabilistic entity resolution, the same
   join research/03 already labels "linked by producer/community, not by platform id."

**Genuinely unjoinable:** anything below the export lot across organizations (farmer
deliveries, day lots, blend constituents — private ledgers); any lot that has passed through
mass-balance custody (identity is an accounting fiction at that point, per §3); and
platform-listing IDs to each other absent a shared key.

---

## Canonical lot schema implications (for the Aqueduct demo)

To be credible to anyone who knows the trade, the demo's lot object should carry:

```
lot {
  aqueduct_id            // our namespace — because no global one exists; that absence IS the pitch
  source: { platform, platform_lot_id, url, fetched_at }   // provenance-first (ledger page)
  identity_stage         // cherry | parchment | green | export_parcel — a lot is stage-specific
  ico_mark: { country_code, exporter_code, serial, coffee_year } | null   // null is the honest common case
  producer: { name_or_initials, entity_type }   // person | farm | cooperative | community
  origin: { country, region, community, plot_geo: point|polygon|null }    // plot_geo null → EUDR gap renders PARTIAL
  crop_year / harvest_window
  process                // washed | honey | natural — first-class, it defines the lot
  variety
  quality: { sca_score, screen, grade_basis }
  quantity: { amount, unit, weight_state }      // received | stored | green — Cropster's three states
  composition: [ parent_lot_refs ] | "single"   // blend lineage; "XX + Blend ID" is the trade's own pattern
  custody_model          // identity_preserved | segregated | mass_balance | unknown
  certs: [ { scheme, claim_level } ]
  eudr: { plot_geo_present, harvest_window_present, legality_evidence, dds_ref | null }
  join_keys: { deterministic: [ico_mark?, dds_ref?, contract_no?], fuzzy: composite_key }
  join_confidence        // deterministic | name_place_match | unmatched — surfaced in UI, per research/03
}
```

**Honest limits to state in the demo/application:** cross-platform lot joining below the
export parcel is name/place/attribute matching, not ID matching — there is no universal lot
ID in coffee (the ICO mark is shipment-level, year-scoped, and rarely published on farm-level
listings; GS1 is a pilot upstream; every platform mints its own namespace). Aqueduct should
render join confidence explicitly ("linked by producer/community, not by platform id") rather
than pretending to a registry that does not exist — and can honestly claim that *maintaining
the cross-platform composite-key resolution* is itself part of the layer's value.
