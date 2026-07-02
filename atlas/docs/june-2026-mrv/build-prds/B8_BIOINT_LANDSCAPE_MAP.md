# B8 — Nature-MRV Landscape Map + Interop Scan (weekend · evidence base)

**Scope.** Turn the **BioInt 100+ MRV-startup database** into a structured landscape map: who measures what, with which models, on which chains (if any), and where the attestation/interop gaps are. Output: a positioning artifact ("where Regen Atlas's rail plugs in") + a contactbook bulk-import + a partner shortlist.

**Tools.** Nature MRV DB (BioInt) + contactbook (FullEnrich enrichment) + GeoLibre (to visualize the landscape geographically; reuses B2 stack). See `scaffolds/B8_landscape_map/` for the schema, scoring rubric, and build-ready spec.

**Build.** Data wrangling + visualization; no novel tech. Structure each company on a fixed schema (name, realm, signal type, models, chain, attestation, interop surface, region, contact), score the interop gap, and render as a table + map + gap matrix.

**Effort.** **Weekend.** Build in parallel with B2.

**Target grant / use.** Not a grant target itself — it's the **evidence base** that makes B1/B3/B4 grant narratives concrete (named competitors, named gaps, named partners). Also a **distribution asset** ("the nature-MRV landscape, mapped") and a **consulting lead generator**. Turns C2's "100+ MRV company list = its own deferred contactbook bulk-import job" into a structured pipeline.

**Sequencing.** This week, parallel with B2. Feeds B4 (interop targets), the grant narratives, and the contactbook bulk-import.
