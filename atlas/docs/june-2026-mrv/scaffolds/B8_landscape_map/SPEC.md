# B8 Scaffold — Nature-MRV Landscape Map + Interop Scan

> Build-ready spec. Goal: turn the BioInt 100+ MRV-startup database into a structured landscape — a table + map + interop-gap matrix that shows where Regen Atlas's rail plugs in. Doubles as the contactbook bulk-import (C2) and the evidence base for B1/B3/B4 grant narratives. **Weekend build.**

## Output artifacts (all from one dataset)

1. **`mrv_landscape.json`** — canonical structured dataset (schema below).
2. **Interop-gap matrix** — companies × {measures-what, models, chain, attestation, interop surface} → highlights who lacks onchain provenance / attestation (= RA's rail target).
3. **Map** — render company HQs / operating regions via the B2 GeoLibre stack (reuse).
4. **`contactbook_import.csv`** — name, role, org, region, url → feeds the `/contactbook` bulk-import (C2 deferred job).
5. **`partner_shortlist.md`** — top interop/partner candidates (those with measurement but no attestation = "we're the rail, not the competitor").

## Schema (`mrv_landscape.json` records)

```ts
interface MRVCompany {
  name: string;
  url: string;
  realm: 'terrestrial' | 'marine' | 'both' | 'cross';
  measures: string[];            // e.g. ['carbon', 'biodiversity', 'soil', 'water', 'restoration']
  signalType: ('remote-sensing' | 'field' | 'eDNA' | 'acoustic' | 'IoT' | 'modelled')[];
  models: string[];              // foundation models / proprietary / methodology
  chain: string | null;          // 'none' | 'Hedera' | 'Polygon' | 'Cosmos' | ...
  attestation: boolean;          // do they issue verifiable/onchain attestations?
  interopSurface: ('API' | 'export' | 'SaaS-only' | 'closed')[];
  region: string;                // HQ / primary operating region
  segment: 'dMRV-SaaS' | 'data-platform' | 'consultancy' | 'registry' | 'marketplace';
  // derived:
  interopGapScore: number;       // 0-5, see rubric
  railFit: 'high' | 'medium' | 'low';   // does RA's attestation rail plug in?
  contact?: { person?: string; email?: string; role?: string };
}
```

## Interop-gap scoring rubric (the analysis that makes it grant-grade)

`interopGapScore` (0–5) = how much value RA's rail adds = how big the gap RA fills:

| Signal | +points |
|---|---|
| Has measurement but **no onchain attestation** | +2 |
| **No provenance/audit trail** (self-reported) | +1 |
| Has API/export (interoperable, easy to plug RA under) | +1 |
| Targets nature **finance** (needs credible KPI → RA's valuation+attestation) | +1 |
| Already onchain with own registry (lower RA fit) | −1 |

`railFit = high` if score ≥ 4 (measurement + no attestation + interoperable → ideal partner: "we're the rail under your SaaS", cf. B4). These are the B4 interop targets and the partner-funnel from C2.

## Seed entries (from June intake — start the dataset with these)

| Name | Realm | Segment | Chain | Attestation | Rail fit | Source |
|---|---|---|---|---|---|---|
| NatureGrid (Open Forest AG) | both | dMRV-SaaS | none | no | **high** | R2-T1 |
| Restor (Crowther Lab/ETH) | terrestrial | data-platform | none | no | high | COMPETITOR_LANDSCAPE |
| Landler (Landbanking Group) | both | dMRV-SaaS | none | no | high | COMPETITOR_LANDSCAPE |
| Conservation Metrics | both | consultancy | none | no | high | COMPETITOR_LANDSCAPE |
| explorer.land (OpenForests) | terrestrial | data-platform | none | no | high | COMPETITOR_LANDSCAPE |
| Earth Genome (Earth Index) | both | data-platform | none | no | medium (feed, not competitor) | R2-T2 |
| Regen Network | terrestrial | registry | Cosmos | yes | low (composability) | COMPETITOR_LANDSCAPE |
| Oncra | both | registry | none | no | high | COMPETITOR_LANDSCAPE |
| refinq | both | data-platform | none | no | high | EU_BB summary / C2 |
| NatureMetrics (eDNA) | both | data-platform | none | no | high | EU_BB marine report |
| Darwin (darwindata.ai) | marine | data-platform | none | no | high | EU_BB marine report |
| ARIES | both | data-platform | none | no | medium | EU_BB marine report |
| Mycosoft NatureOS | both | data-platform | none | no | medium (partner/twin, B7) | R2-T5 |

Then expand to the full BioInt 100+ DB (scrape/import → score each row).

## Build steps (weekend)

```
scaffolds/B8_landscape_map/
├── SPEC.md            (this file)
├── schema.ts          MRVCompany interface + scoreInteropGap()
├── seed.json          the seed entries above (expand from BioInt DB)
├── build.ts           load → score → emit mrv_landscape.json + contactbook_import.csv + partner_shortlist.md
└── render/            (optional) reuse B2 GeoLibre stack to map company regions
```

1. Fill `seed.json` from the table; expand from the BioInt 100+ DB (R6 / C2).
2. Run `scoreInteropGap()` over every record → `interopGapScore` + `railFit`.
3. Emit `mrv_landscape.json`, the interop-gap matrix (sorted by score), `contactbook_import.csv`, `partner_shortlist.md`.
4. (Optional) render the map via the B2 stack.

## Acceptance criteria

- [ ] `mrv_landscape.json` with ≥ the 13 seed entries scored (target: 100+ from BioInt DB).
- [ ] Interop-gap matrix sorts companies by where RA's rail adds most value.
- [ ] `partner_shortlist.md` names the `railFit: high` companies (the B4 interop targets / C2 funnel).
- [ ] `contactbook_import.csv` ready for the `/contactbook` bulk-import.
- [ ] (Optional) geographic map renders.

## Why this matters

Not a grant target itself — the **evidence base** that makes B1/B3/B4 narratives concrete (named competitors, named gaps, named partners), a distribution asset ("the nature-MRV landscape, mapped"), and a consulting lead generator. Converts C2's deferred "100+ MRV company list" into a structured, scored pipeline.
