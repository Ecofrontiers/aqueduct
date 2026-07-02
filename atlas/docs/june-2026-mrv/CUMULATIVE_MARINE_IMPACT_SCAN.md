# Cumulative Marine Impact Scan — Design (R2-2)

> "Investee asset-location → cumulative marine impact" scan over EMODnet / WISE Marine / Copernicus Marine.
> Directly fills the report's flagged gap: *"FIs lack asset locations of investee companies… why is there not a public database of asset locations? — needed for cumulative/landscape impact scanning."*
> Target users: financial institutions, asset managers, ESG teams doing CSRD/TNFD portfolio analysis. Target grants: EU LIFE, B&B finance-sector recs (F1/F2). Consulting wedge: R2-4/R2-5.

## 1. Problem statement (from the report)

The EU B&B marine report documents, on the finance side:
- FIs rely on **model-based approaches (LCA)** with methodological gaps → marine impacts/dependencies **overlooked**.
- FIs **lack asset locations** of the companies they invest in — so they can't do site-specific or **cumulative** (landscape/seascape-level) impact assessment.
- FIs want **geolocated exposures + ocean-risk + ocean-impact indicators** for portfolio analysis (rec F2).
- **No ocean "ownership"** → accountability is ambiguous; cumulative pressures from many actors compound with no single party measuring them.

The scan turns "I hold equity/debt in company X" into "X operates these N marine assets, at these locations, contributing this much to the cumulative pressure on these eco-regions, against this state-of-nature baseline."

## 2. Pipeline

```
[1] Portfolio in        →  list of investee companies (LEI / name / sector)
[2] Asset-location resolve →  company → marine asset footprints (the missing DB; see §3)
[3] State-of-nature baseline →  per footprint, pull MarineStateRecord (marine module, §M1)
[4] Pressure attribution  →  map each asset's activity to MSFD-descriptor pressures
[5] Cumulative aggregation →  sum overlapping pressures per eco-region cell (the novel step)
[6] Exposure scoring      →  portfolio-weighted ocean-risk + ocean-impact indicators (rec F2)
[7] Report + attestation  →  CSRD ESRS E3/E4 + TNFD datapoints; RAEIS attest the methodology run
```

## 3. The asset-location layer (the hard part — and the moat)

No public asset-location DB exists (report's own question). RA assembles one for the marine domain, sector by sector, from open sources — this assembled layer is itself a defensible asset and a B4 methodology-registry candidate:

| Asset class | Open location source | Notes |
|---|---|---|
| Offshore wind / marine renewables | EMODnet Human Activities (wind farms, cables), national permitting registers, OpenStreetMap | EMODnet has georeferenced installations |
| Ports / marine infrastructure | EMODnet Human Activities, WPI, OSM | |
| Aquaculture | EMODnet Human Activities (aquaculture), national licences | |
| Oil/gas/mineral mining | EMODnet Human Activities (extraction), national licensing | |
| Shipping / transport lanes | EMODnet vessel density, AIS-derived layers | activity not fixed footprint → corridor model |
| Fisheries | Global Fishing Watch, ICES, EMODnet | effort-based, not point assets |

Resolution flag (per report): coverage is uneven. Each resolved asset carries a `locationConfidence` field; unresolved investees are reported as a coverage gap, not silently dropped (counters the "low resolution hidden" anti-pattern; cf. CLAUDE.md feedback "fix root cause, don't decorate").

## 4. Cumulative model

Grid the seascape into eco-region cells (MSFD assessment areas / MEOW provinces). For each cell:

```
cumulative_pressure[cell, descriptor] = Σ_assets ( pressure_intensity[asset, descriptor] × overlap(asset, cell) )
state_of_nature[cell]                  = MarineStateRecord baseline (Copernicus + EMODnet + OBIS/GBIF)
risk[cell]                             = f(cumulative_pressure, state_of_nature, designation_sensitivity)
```

`designation_sensitivity` upweights KBA/EBSA/VME/MPA/Natura2000 cells (report: significance matters; sensitive habitats weighted higher — analogous to the swarm spec's "proximity to irreversible loss = louder voice"). Method based on established cumulative-impact-assessment literature (Halpern-style additive/weighted models), cited in the methodology registered to HCS.

## 5. Implementation (in-repo)

New service under the marine module (the scan is the FI-facing M5 phase):

```
src/modules/marine/scan/
├── resolveAssetLocations.ts   # company → footprints (§3)
├── cumulative.ts              # grid + Σ overlap × intensity (§4)
├── exposure.ts               # portfolio-weighted ocean-risk/impact indicators (F2)
└── report.ts                 # CSRD ESRS E3/E4 + TNFD datapoint export
```

Reuses: `marine/sources/*` (data), `marine/types.ts` (`MarineStateRecord`), `marine/attestation.ts` (RAEIS), existing valuation engine for monetised impact where applicable.

Data sources consumed (all in `DATA_SOURCE_INTEGRATION_PLAN.md`): **EMODnet** (habitats + human activities — the asset-location backbone), **WISE Marine** (MSFD GES baselines), **Copernicus Marine / MyOcean** (physical/biogeochemical state), OBIS/GBIF (species occurrence), Ocean+ Data Viewer + KBA/EBSA/VME (designations/sensitivity).

## 6. Output: the FI report

Per portfolio: a ranked list of investees by cumulative marine-impact contribution; per eco-region heatmap of cumulative pressure vs state-of-nature; CSRD ESRS E3/E4 + TNFD-aligned datapoints; coverage/confidence disclosure; an RAEIS attestation of the scan run (inputs, model version, thresholds) so the analysis is auditable and reproducible — the credibility layer FIs and supervisors (rec F1: central banks/supervisors lead) need.

## 7. Go-to-market

- **Product:** SaaS scan + report inside Regen Atlas (FI tier).
- **Consulting wedge (R2-4/R2-5):** TNFD marine sector-guidance advisory + CSRD ESRS E3/E4 readiness — the scan is the tool that backs the engagement. Named frontrunner FIs to approach (report interviewees): BNP Paribas (Robert-Alexandre Poujade, Imene Ben Rejeb-Mzah), Mirova (Hadrien Gaudin-Hamama); renewable-energy MRV frontrunners RWE (Umberto Binetti / SeaMe) and Ørsted (Samir Whitaker / BMF). Orgs: ORRAA, UNEP FI Sustainable Blue Economy, SBTN Ocean, Making Oceans Count.
- **Grant:** EU LIFE + B&B finance-sector recommendations; the scan is a concrete deliverable that operationalises recs F1/F2.
