# Data-Source Integration Plan — RA MRV Ingestion Layer (R2-3 + I23)

> The ingestion layer that feeds the Marine MRV module (R2-1), the cumulative-impact scan (R2-2), and the terrestrial MRV fusion layer (B1). Answers the report's "labyrinth of data sources" + recommendation **G2** (centralized, interoperable, one-stop eco-region data platform) — RA becomes that one-stop, with onchain provenance on top.
> Follows the existing `src/modules/intelligence/sources/` one-file-per-source pattern (see `PRD-HEDERA-INGESTION.md` Path B / intelligence pipeline).

## 1. Architecture — one ingestion contract, many adapters

Every source implements a common adapter interface so the compose layer stays source-agnostic. This is the normalisation layer the report says is missing ("fragmented, non-standardised").

```ts
// src/modules/mrv/ingest/SourceAdapter.ts
interface SourceAdapter<Raw, Norm> {
  id: string;                          // 'emodnet' | 'copernicus' | 'earth-index' | ...
  realm: 'marine' | 'terrestrial' | 'both';
  auth: 'none' | 'apiKey' | 'oauth';
  fetch(query: SpatialQuery): Promise<Raw[]>;     // bbox / polygon / time range
  normalize(raw: Raw): Norm;                       // → MarineIndicator | TerrestrialFeature
  cite(raw: Raw): VerifiableProvenance;            // source, license, resolution, asOf, accessUrl
  rateLimit: { rpm: number; notes: string };
}
```

Output of every adapter is (a) a normalised indicator/feature and (b) a `VerifiableProvenance` record (reusing the existing Filecoin/typed-provenance objects) — so every datapoint downstream is attributable, license-tracked, and resolution-tagged. This is what makes RA's composite auditable where the report's surveyed tools are "self-reported, unverified."

## 2. Source catalogue

Folder: `src/modules/mrv/ingest/sources/`. Marine sources double as `src/modules/marine/sources/` (re-exported).

| # | Source | Adapter | Realm | Provides | Access / auth | API surface | Resolution / coverage notes |
|---|--------|---------|-------|----------|---------------|-------------|------------------------------|
| 1 | **EMODnet** | `emodnet.ts` | marine | Habitats (EUSeaMap), human activities (wind/cables/aquaculture/extraction/ports), biology, bathymetry | Open, no auth | OGC WMS/WFS + REST per thematic portal | EU seas; the **asset-location backbone** for R2-2 |
| 2 | **WISE Marine** | `wiseMarine.ts` | marine | MSFD central DB — Good Environmental Status, 11 descriptors, Art. 11 monitoring; regional assessments | Open (EEA) | EEA discodata / WFS | MSFD assessment areas; the GES baseline |
| 3 | **Copernicus Marine / MyOcean** (Mercator Ocean Int'l) | `copernicusMarine.ts` | marine | Physical + biogeochemical ocean state (temp, salinity, chl-a, oxygen, currents); reanalysis + forecast | Free, registration → API key | Copernicus Marine Toolbox / STAC / OPeNDAP | Global gridded; the state-of-nature modelled layer |
| 4 | **OBIS** | `obis.ts` | marine | Marine species occurrence records | Open, no auth | OBIS REST API | Global, taxonomically biased (report flag) → carry confidence |
| 5 | **GBIF** | `gbif.ts` | both | Species occurrence (marine + terrestrial) | Open, no auth | GBIF REST API | Global; pair with OBIS for marine |
| 6 | **Ocean+ Data Viewer** (UNEP-WCMC) | `oceanPlusViewer.ts` | marine | Curated marine habitats + designations layers | Open | tile/WFS endpoints | Designation + significance overlays |
| 7 | **Designations** (KBA / EBSA / VME / MPA / Natura2000) | `designations.ts` | both | KBA DB (16,000+), CBD EBSA repository, FAO VME, MPA + Natura2000 | Open (some registration) | per-registry APIs / downloads | Sensitivity weighting for cumulative scan |
| 8 | **Earth Index** (Earth Genome) | `earthIndex.ts` | terrestrial (+ coastal) | Sentinel-2 foundation-model semantic search; change-detection; few-shot label→predict | Free sign-up (non-profit) | search/export (export → data model trial, R2-T2) | Change-detection signal layer for B1 |
| 9 | **Google Earth AI / Vectorized Farmscapes (RSF)** | `farmscapes.ts` | terrestrial | Pre-vectorized woody features, hedgerows, field boundaries (RSF ViT over 300M images) | Open dataset, GeoParquet | static GeoParquet (read in-browser via DuckDB-WASM, cf. B2) | Pre-vectorized = **no inference cost** |
| 10 | **Mercator Ocean** (digital-twin partner) | `mercator.ts` | marine | Ocean digital-twin state feeds (EU DTO) | Partnership / Copernicus overlap | via Copernicus Marine | Powers B7 digital-twin; partnership-gated |

Also catalogued from the report's Table 4 as secondary/optional adapters (lower priority): MBON/GOOS, Hub Ocean Data Portal, ICES Ecosystem Overviews, NASA SeaBASS, Marine Ecosystem Viewer (CBS / offshore-wind investor tool).

## 3. Compose & dedup

`src/modules/mrv/ingest/compose.ts` (mirrors `intelligence/compose.ts`):
1. Run adapters for a spatial query (bbox/polygon + time range).
2. Normalise each to `MarineIndicator` / `TerrestrialFeature`.
3. Dedup across sources (e.g. OBIS×GBIF occurrence overlap) by record key + spatial/temporal proximity.
4. Tag each with data type (primary/secondary/modelled), resolution, confidence.
5. Emit a composite (`MarineStateRecord` for marine, fusion record for terrestrial B1) — no single source is trusted alone (report: "no single biodiversity metric is credible → composite of multiple metrics").

## 4. Caching & cost

- Open APIs (EMODnet, OBIS, GBIF, WISE) → server-side cache with TTL per source volatility (occurrence data: days; bathymetry: months).
- Copernicus gridded data → fetch on demand by polygon, cache tiles; respect API-key rate limits.
- Farmscapes GeoParquet → static; serve from CDN, query client-side via DuckDB-WASM (zero server cost; this is the B2 path).
- Earth Index → on-demand query + export ingest (the export-into-data-model trial is R2-T2).

## 5. Provenance & attestation

Every composite carries its `VerifiableProvenance[]` chain. The methodology that produced it (which sources, versions, thresholds, dedup rules) is published to **RAEIS HCS**; the resulting record is minted as an **HTS NFT**. Append-only / supersession-not-deletion (NP6 from June papers): corrections supersede, never overwrite — the audit trail the report says is absent.

## 6. Build order

1. **EMODnet + Copernicus Marine + OBIS/GBIF** — minimum viable marine state-of-nature (feeds M1 + R2-2). Open/free, no partnership needed.
2. **WISE Marine + designations** — MSFD baselines + sensitivity weighting (completes R2-2 cumulative model).
3. **Farmscapes (GeoParquet)** — terrestrial, zero-cost, powers B1 + B2 immediately.
4. **Earth Index** — change-detection (B1) + R2-T2 export trial.
5. **Ocean+ Viewer, Mercator** — enrichment + B7 digital-twin (partnership-gated).
