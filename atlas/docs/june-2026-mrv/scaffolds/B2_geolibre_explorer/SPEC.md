# B2 Scaffold — GeoLibre In-Browser Bioregion Explorer

> Build-ready spec. Goal: a zero-server, mobile-responsive bioregion explorer that loads Farmscapes GeoParquet client-side via DuckDB-WASM, lets a user draw a bioregion polygon, and queries woody-feature density + change over time — no backend, no Mapbox bill. **Weekend build.**

## Stack decision

Two paths; pick by reach vs speed:

- **Path A (fastest, recommended for the demo):** fork/clone `opengeos/GeoLibre` (Tauri v2 + React + TS + **MapLibre GL JS** + **DuckDB-WASM Spatial** + **deck.gl**) and add a "Bioregion" panel. You inherit the responsive slide-over Layers/Style panels, OpenFreeMap basemaps, in-browser EPSG:4326 reprojection, and GeoParquet loading for free. Run as browser app for the demo; the Android build is a bonus.
- **Path B (in-repo):** add a standalone Vite route to ecospatial (`/explore-lite`) reusing the existing React + MapLibre setup, and pull in `@duckdb/duckdb-wasm` + `deck.gl` directly. Use this if you want it embedded in the main app rather than a separate microsite.

This scaffold gives Path B (self-contained, no Tauri toolchain). Lift GeoLibre's panel UX patterns.

## File tree (Path B, standalone microsite or `/explore-lite` route)

```
scaffolds/B2_geolibre_explorer/
├── SPEC.md                  (this file)
├── package.json             deps: maplibre-gl, @duckdb/duckdb-wasm, deck.gl, @deck.gl/mapbox, @turf/turf, react, vite
├── index.html
├── src/
│   ├── main.tsx             React mount
│   ├── App.tsx              layout: map + slide-over Bioregion panel (responsive)
│   ├── map/
│   │   ├── useMapLibre.ts   init MapLibre w/ OpenFreeMap basemap; expose map ref
│   │   ├── DrawControl.ts   polygon-draw (Mapbox-gl-draw or MapLibre draw plugin)
│   │   └── DensityLayer.ts  deck.gl ScreenGridLayer / HexagonLayer over feature points
│   ├── data/
│   │   ├── duckdb.ts        init DuckDB-WASM; register parquet; spatial extension
│   │   ├── queries.ts       woody-feature density + change-over-time SQL
│   │   └── sources.ts       GeoParquet URLs (Farmscapes; CDN-hosted, byte-range read)
│   └── panel/
│       └── BioregionPanel.tsx   draw → query → density + delta readout
└── public/
    └── (optional) sample farmscapes_subset.parquet  for offline demo
```

## Core implementation

### `data/duckdb.ts` — init DuckDB-WASM + spatial

```ts
import * as duckdb from '@duckdb/duckdb-wasm';

export async function initDuckDB() {
  const bundles = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(bundles);
  const worker = new Worker(bundle.mainWorker!);
  const db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(), worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  const conn = await db.connect();
  await conn.query(`INSTALL spatial; LOAD spatial;`);
  await conn.query(`INSTALL httpfs; LOAD httpfs;`); // remote parquet via HTTP byte-range
  return { db, conn };
}
```

### `data/sources.ts` — Farmscapes GeoParquet (remote, no download)

```ts
// Google Earth AI "Vectorized Farmscapes" — open GeoParquet, woody features / hedgerows / field boundaries.
// Host a regional subset on the RA CDN/R2 bucket; DuckDB reads byte-ranges directly — zero server compute.
export const FARMSCAPES_PARQUET = 'https://cdn.regenatlas.xyz/farmscapes/eu_woody_features.parquet';
```

### `data/queries.ts` — draw polygon → density (the demo's payoff)

```ts
// User draws a bioregion polygon (GeoJSON) → count + density of woody features inside.
export function densityQuery(polygonWKT: string) {
  return `
    SELECT count(*) AS feature_count,
           count(*) / ST_Area(ST_GeomFromText('${polygonWKT}')) AS density_per_unit
    FROM read_parquet('${FARMSCAPES_PARQUET}')
    WHERE ST_Within(geometry, ST_GeomFromText('${polygonWKT}'));`;
}

// Change-over-time: Farmscapes vintages (or Earth Index change-detect deltas) per year.
export function changeQuery(polygonWKT: string) {
  return `
    SELECT year, count(*) AS woody_features
    FROM read_parquet('${FARMSCAPES_PARQUET}')
    WHERE ST_Within(geometry, ST_GeomFromText('${polygonWKT}'))
    GROUP BY year ORDER BY year;`;
}
```

### `panel/BioregionPanel.tsx` — flow

1. User clicks "Draw bioregion" → `DrawControl` enters polygon mode.
2. On `draw.create`, convert the GeoJSON polygon to WKT (`@turf` or inline).
3. Run `densityQuery` + `changeQuery` against DuckDB.
4. Render: feature count, density, a small year-over-year sparkline (woody-feature delta = the "nature-state change" headline).
5. Render the features as a deck.gl `HexagonLayer` / `ScreenGridLayer` over MapLibre (`DensityLayer.ts`).
6. Mobile: panel is a slide-over sheet (lift GeoLibre's responsive pattern; matches MEMORY mobile-architecture feedback — no "use desktop" placeholders).

## Acceptance criteria (weekend done = all true)

- [ ] Loads in a browser with **no backend running**; all spatial processing client-side.
- [ ] User draws a polygon and sees woody-feature **count + density** within ~1–2s for a regional parquet subset.
- [ ] Year-over-year **change readout** renders (sparkline or table).
- [ ] deck.gl density layer renders over the MapLibre basemap.
- [ ] **Responsive** on a phone viewport (panel becomes slide-over sheet).
- [ ] Embeddable as a microsite URL to drop into grant pitches.

## Build steps

1. `npm create vite@latest` (react-ts) in this folder; add deps (see file tree).
2. Wire `useMapLibre` with an OpenFreeMap style URL (no token needed).
3. `initDuckDB()`, register the Farmscapes parquet URL, `LOAD spatial`.
4. Add polygon draw; on create → run queries → render panel + deck.gl layer.
5. Host a regional Farmscapes subset on R2/CDN (or bundle `public/farmscapes_subset.parquet` for an offline demo).
6. Deploy to Vercel (`vercel --prod`) as a standalone microsite.

## Why this is the first build

Highest demo-impact ÷ effort in the work package. One OSS stack + one open GeoParquet = a clickable, zero-backend bioregion explorer that becomes the live "MRV is the missing rail" proof embedded in every grant pitch. No new server cost, no Mapbox bill, works on mobile.
