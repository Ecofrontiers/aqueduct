# B2 — GeoLibre In-Browser Bioregion Explorer (weekend · fastest demo)

**Scope.** A standalone, **zero-server** explorer that loads Farmscapes (and other) GeoParquet directly in the browser via **DuckDB-WASM** and lets a user draw a bioregion, query woody-feature density, and see change over time — no backend, no Mapbox bill, mobile-responsive. Ships as a public Regen Atlas microsite and a reusable demo shell embedded in every grant pitch ("here, click it").

**Tools.** GeoLibre stack (Tauri v2 / React / TS / MapLibre GL JS / DuckDB-WASM Spatial / deck.gl) + Farmscapes GeoParquet (+ optional Earth Index tiles). All client-side; reproject to EPSG:4326 in-browser.

**Build.** GeoLibre + an open GeoParquet *is* the entire stack. See `scaffolds/B2_geolibre_explorer/` for a build-ready spec: file tree, MapLibre + DuckDB-WASM init, GeoParquet load + spatial query (draw polygon → `ST_Within` count), deck.gl density layer, responsive slide-over panels.

**Effort.** **Weekend.** Highest demo-impact ÷ effort ratio in the work package. Build first.

**Target grant / use.** Any geospatial/open-data hackathon. Strong **standalone demo asset** for EU LIFE and nature-finance pitches; a public-good open-source artifact that strengthens the open-source credibility line for Women TechEU / EU calls.

**Sequencing.** Build this week, in parallel with B8. It is the live proof point the "MRV is the missing rail" blog (D1 downstream) needs.
