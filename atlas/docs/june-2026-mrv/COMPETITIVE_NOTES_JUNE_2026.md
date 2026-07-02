# Competitive Notes — June 2026 (R2-T1–T4)

> Supplements `docs/COMPETITOR_LANDSCAPE.md` with four June-intake entries. Source: `_output/articles/TOOLS_SUMMARIES_JUNE_2026.md`.

## R2-T1 — NatureGrid (Open Forest AG) → add to competitor matrix

**What:** "The Operating System for Nature Monitoring" — a dMRV SaaS for carbon, biodiversity, restoration, conservation teams. Built by **Open Forest AG (Switzerland)**. Closest **direct competitor** to RA on the MRV/field-data axis.

**Feature set (table-stakes baseline to match):**
- Web dashboard centralising submissions, validation tracking, ground + remote-sensing data in one workspace.
- Offline-first mobile app for georeferenced field collection (observations, photos, plot measurements, GPS) for remote conditions.
- Configurable collection templates + standardised submission/validation (QA across teams/sites).
- Order/access remote-sensing layers to complement field data.
- Export reporting-ready datasets. Custom development on offer.
- Pricing: free trial + sales-led demo, no public tiers. Positioning = operations tooling, **not** a registry/marketplace.

**Where they stop / RA's differentiation:** They end at "reporting-ready datasets." No **bioregional spatial finance**, no **onchain MRV/provenance**, no **agent coordination layer**, no scientific valuation. Position RA explicitly above on those four axes. Add a NatureGrid row to `COMPETITOR_LANDSCAPE.md` Tier 1 as the "MRV operations OS" benchmark.

**Actions:**
- Add NatureGrid to the competitor matrix (Tier 1) capturing dashboard/mobile/templates feature set; state RA's edge (spatial finance + onchain provenance + agent layer + valuation).
- Study their offline georeferenced field-collection UX as the baseline RA's field-data story (B5 proof-of-location) must match or beat.
- **Consulting / partnership signal:** Open Forest AG is a Swiss nature-tech shop in the **same region as SimplexDNA (Kristy Deiner)** — possible warm-intro / partnership path. Tag in consulting (R2-T12 also flags CeSIA/Pour Demain/Convergence as FR/CH signals).

## R2-T2 — Earth Index (Earth Genome) → evaluate as upstream detection feed

**What:** Non-profit Sentinel-2 **foundation-model search engine** — index the Earth, search any feature ("find harms in less than a day"): illegal mining, logging, cattle ops, wastewater, ecosystem disturbance. Few-shot label→predict→iterate loop (no ML expertise). Upcoming: change-detection notifications + cloud-deployable fine-tuned detection models. Free sign-up.

**Relationship:** **Complementary, not competitive.** Earth Index finds *where harm/feature is*; RA does *spatial finance + MRV around bioregions*. RA should **consume, not rebuild**.

**Actions:**
- Evaluate Earth Index as an **upstream detection feed** — surface illegal-mining/deforestation hotspots inside a bioregion as a monitoring/alerting layer and as MRV-corroboration evidence (feeds B1 change-detection signal; adapter `earthIndex.ts` in the integration plan).
- **Trial the few-shot label→predict loop** on a target bioregion; test whether their export drops cleanly into the RA data model (`MarineStateRecord` / fusion record). This is the concrete de-risking step before committing the B1 adapter.
- Narrative template for distribution: "find harms in minutes, not months."

## R2-T3 — Agentic Earth → hands-on teardown plan

**What:** agenticearth.app — "the self-serve agentic geospatial platform." Gated behind Google/email login; public surface is only the tagline. Sits squarely on the **geospatial + agents** convergence RA is itself building toward (cf. Planet agentic EO chat, Google Earth AI + Gemini, IBM/arXiv multi-agent EO frameworks). **Highest-priority recon of the batch** — competitor or reference is unknown until behind the login.

**Teardown plan (do this, don't defer):**
1. Create an account (Google or email).
2. Capture: what analysis tasks the agent handles; its data sources; output format (map/vector/report); whether it touches **finance or MRV at all** (RA's defensible layer).
3. Probe the agent surface: NL→satellite/vector query→map? Zero-code? How deep is the reasoning vs a thin LLM-over-GIS wrapper?
4. **Build-vs-partner decision:** thin wrapper → build RA's own conversational agent surface on top of the Scout/Diligence agents (cf. B6); deep/defensible → consider integration/partnership.
5. Log findings to `COMPETITOR_LANDSCAPE.md` and catalogue in ai-mech-atlas alongside Planet, Google Earth AI, Earth-Agent (R2-T13).

## R2-T4 — GeoLibre stack → evaluate (and adopt for B2)

**What:** github.com/opengeos/GeoLibre — lightweight cloud-native **open-source GIS** running desktop + browser + native Android from one codebase, by **opengeos (Qiusheng Wu**, leafmap/geemap author — high pedigree). Stack: **Tauri v2 + React + TypeScript + MapLibre GL JS + DuckDB-WASM Spatial + deck.gl**. Loads GeoJSON/GeoParquet/GeoPackage/Shapefile/FlatGeobuf/KML/GML/GPX/OSM-PBF **client-side via DuckDB-WASM**; in-browser reprojection to EPSG:4326; all processing client-side (privacy + zero server cost). Free, OSS.

**Verdict:** Strong, low-risk **build accelerator**. In-browser DuckDB-WASM Spatial + GeoParquet + deck.gl is exactly the modern client-side geospatial stack; cross-platform (incl. Android) is free reach. **This is the foundation for B2** (see `build-prds/B2_GEOLIBRE_EXPLORER.md` + `scaffolds/B2_geolibre_explorer/`).

**Actions / patterns to lift:**
- Evaluate the DuckDB-WASM Spatial + GeoParquet pipeline for **client-side vector handling** — removes server-side processing cost, enables offline/mobile field use (directly answers the gap NatureGrid fills with its mobile app — but open and zero-server).
- Lift specific patterns: in-browser reprojection; the **responsive slide-over Layers/Style panel** (relevant to the mobile-architecture feedback notes in MEMORY); FlatGeobuf/GeoParquet loading.
- Harness: bookmark opengeos repos (leafmap, geemap, GeoLibre) as the canonical open geospatial toolchain (MEMORY §26 / H26).

---

*Add the four entries above to `docs/COMPETITOR_LANDSCAPE.md` on next edit pass. NatureGrid → Tier 1; Earth Index + GeoLibre → Tier 2 (complementary/accelerator); Agentic Earth → Tier 1 pending teardown.*
