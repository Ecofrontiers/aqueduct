# Marine MRV Module — Spec (R2-1)

> Re-scopes the deferred **marine bioregions** (CLAUDE.md: "marine bioregions = deferred module"; ra-april-26 produced 62 marine stubs) as a revenue product, grounded in the EU B&B *Marine Biodiversity Measurement* report's documented state-of-nature data gap.
> Status: spec → build. Target grants: EU LIFE 2026 (Sep 22, joint w/ SimplexDNA), EU B&B marine/eDNA calls.

## 1. Why now (the documented gap)

The EU B&B *Marine Biodiversity Measurement* report (2026, Arcadis authors, prepared for the European Commission) is a stocktake of corporate marine-biodiversity measurement. Its load-bearing findings — each one a product hook:

| Finding (from report) | Product implication |
|---|---|
| Measuring marine state-of-nature is **far harder than land**; corporate tools are **scarce** (TNFD Tools Catalogue: 233 tools → only 8 hit "marine," most are data *sources* not tools) | An MRV module aimed at marine is in a thin, high-demand market |
| Binding constraint is **state-of-nature data, not pressure data** (companies already have pressure data) | Module's value = composing scarce state-of-nature signal, not re-collecting pressure data |
| **"Labyrinth of data sources"** — datasets exist but are fragmented, non-standardised, paywalled, in academic language, poorly catalogued | A normalisation/ingestion layer is the wedge (see `DATA_SOURCE_INTEGRATION_PLAN.md`) |
| **Resolution too low** for site-specific corporate needs (habitat extent/condition + species occurrence/diversity/abundance/threat-status at a fixed-infrastructure footprint) | Per-asset footprint reporting at the parcel level is the deliverable |
| FIs **lack asset locations** of investees → marine impacts overlooked; LCA model gaps | Cumulative-impact scan (R2-2) is the FI-facing sibling product |
| Emerging tech transforming the field: **satellite, bioacoustics, eDNA, ROV/AUV, AI cameras, drones** | eDNA (SimplexDNA) + satellite (Earth Index/Copernicus) fusion is the on-thesis methodology |
| Recommendation **G2**: build centralized regional/eco-region one-stop data platforms (WISE Marine as starting point) + corporate guidance | RA marine module = the eco-region one-stop, with onchain provenance on top |

Policy frame the module reports against: **MSFD** (Good Environmental Status, 11 descriptors, Art. 11 monitoring), **CSRD ESRS E3** (Water & Marine Resources) + **ESRS E4** (Biodiversity), **TNFD** (ocean discussion paper June 2025; sector-guidance pilots recommended), **SBTN Ocean**, Nature Restoration Regulation (restore ≥20% sea by 2030).

## 2. Conceptual model

Mirror the ALIGN framing the report anchors on. Biodiversity is measured across three components × two indicator classes:

```
Components:  ecosystems (extent + condition) · species (population + extinction risk) · genes (genetic diversity)
Indicators:  PRESSURE (human activity — companies have this)  vs  STATE-OF-NATURE (ecosystem health — missing/expensive)
Data types:  primary · secondary · modelled  (no single metric is credible → composite required)
```

The module computes a **per-asset marine state-of-nature record** = a composite of multiple metrics, each tagged with data type, source, resolution, confidence, and provenance. This becomes an RAEIS attestation (HCS methodology + HTS NFT), making the composite auditable — directly answering the report's "no single credible metric / unverified self-reported tools" problem.

## 3. Module architecture (matches existing conventions)

New module `src/modules/marine/` alongside `src/modules/intelligence/`, `eii/`, `valuation/`. Follows the dual-path pattern from `PRD-HEDERA-INGESTION.md`:

```
src/modules/marine/
├── sources/                  # one file per data source (mirrors intelligence/sources/)
│   ├── emodnet.ts            # EMODnet (habitats, human activities, biology)
│   ├── wiseMarine.ts         # WISE Marine (EEA / MSFD central DB)
│   ├── copernicusMarine.ts   # Copernicus Marine / MyOcean (Mercator Ocean Int'l)
│   ├── obisGbif.ts           # OBIS + GBIF species occurrence
│   ├── oceanPlusViewer.ts    # Ocean+ Data Viewer (UNEP-WCMC)
│   └── designations.ts       # KBA / EBSA / VME / MPA overlays
├── compose.ts                # normalize → MarineStateRecord (mirrors intelligence/compose.ts → VerifiableProvenance)
├── indicators.ts             # MSFD descriptor mapping; ALIGN component scoring; confidence bands
├── valuation.ts              # marine biome rates (TEEB marine/coastal; SCC where applicable)
├── attestation.ts            # → RAEIS: publish methodology to HCS, mint MarineStateRecord as HTS NFT
└── types.ts                  # MarineStateRecord, MarineIndicator, MarineDataSource
```

### Core type (sketch)

```ts
interface MarineStateRecord {
  assetId: string;
  footprint: GeoJSON.Polygon;          // fixed-infrastructure footprint or bioregion boundary
  ecoRegion: string;                    // MEOW / EU marine region
  components: {
    ecosystem: { extent: Indicator; condition: Indicator };
    species:   { occurrence: Indicator; diversity: Indicator; threatStatus: Indicator };
    genes?:    { eDNADiversity?: Indicator };   // SimplexDNA fill when available (B3)
  };
  msfdDescriptors: Partial<Record<MSFDDescriptor, Indicator>>;  // D1 Biodiversity, D4 Food webs, D6 Sea-floor integrity, ...
  designations: ('KBA'|'EBSA'|'VME'|'MPA'|'Natura2000')[];
  confidence: 'high'|'medium'|'low';    // driven by resolution + data-type mix
  provenance: VerifiableProvenance[];   // reuse existing Filecoin/typed-provenance objects
  attestation?: { hcsTopicId: string; htsTokenId: string; serial: number };
}
interface Indicator {
  value: number; unit: string; metric: string;
  dataType: 'primary'|'secondary'|'modelled';
  source: string; resolution: string; asOf: string; confidence: number;
}
```

## 4. Reporting surfaces

1. **Marine bioregion page** — activate the 62 marine bioregion stubs (`public/images/bioregions/`). Per bioregion: composite state-of-nature score, MSFD descriptor breakdown, designation overlays, data-coverage/confidence heatmap (makes the "under-sampled / low-resolution" gap visible rather than hiding it).
2. **Per-asset footprint card** — for marine assets (offshore wind, aquaculture, ports, cables): habitat extent/condition + species occurrence/diversity/threat-status at the footprint, mapped to CSRD ESRS E3/E4 datapoints and MSFD descriptors. This is the corporate deliverable the report says doesn't exist.
3. **Confidence & provenance panel** — every number shows data type, source, resolution, as-of date, and attestation link. Counters the report's "self-reported, unverified" critique.

## 5. Differentiation vs the report's named tools

The report lists marine-scoring tools (BIAT, BINTACT, BFFI, Biodiversity Risk Filter, ENCORE, IBAT, InVEST, MESAT, SUMES, ARIES, Ocean Health Index, Darwin, READS, MEsP 2.0, Ørsted BMF). None combine: composite state-of-nature scoring **+ onchain attestation/provenance + bioregional aggregation + agent verification**. RA's wedge is the verifiable composite, not a new metric. Position as the **rail under** these tools (cf. B4), not a competitor to them.

## 6. Phasing

| Phase | Deliverable | Effort | Dependency |
|---|---|---|---|
| M0 | Data-source ingestion (EMODnet, WISE Marine, Copernicus, OBIS/GBIF, Ocean+) | per `DATA_SOURCE_INTEGRATION_PLAN.md` | — |
| M1 | `MarineStateRecord` compose + indicators + marine bioregion page (activate 62 stubs) | 2-wk | M0 |
| M2 | Per-asset footprint card + CSRD/MSFD mapping | 1-wk | M1 |
| M3 | RAEIS attestation (HCS methodology + HTS NFT) | 1-wk | M1; reuses existing RAEIS rail |
| M4 | eDNA fusion (SimplexDNA) → genes component + confidence uplift | JOINT (B3) | partnership |
| M5 | Cumulative-impact scan (R2-2) — FI-facing | see `CUMULATIVE_MARINE_IMPACT_SCAN.md` | M0 |

## 7. Grant narrative hook

EU LIFE 2026 (adaptation/NbS strand) + EU B&B marine calls fund exactly the G1/G2 recommendations: shared-cost state-of-nature data collection and a centralized eco-region one-stop platform. RA marine module **is** that one-stop, with the auditability the report says is missing. Joint with SimplexDNA (eDNA ground-truth + Swiss deep-tech + Kristy Deiner as second woman-led-deeptech applicant) → strongest possible LIFE / Women TechEU framing. See `build-prds/B3_eDNA_SIMPLEXDNA.md`.
