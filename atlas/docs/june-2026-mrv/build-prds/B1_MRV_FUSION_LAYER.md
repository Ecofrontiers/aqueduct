# B1 — Regen Atlas MRV Fusion Layer (flagship)

**Scope.** A new map layer + attestation pipeline in ecospatial that fuses three signals into a single auditable MRV record per asset: (1) **Earth Index** change-detection over a parcel's time series, (2) **Farmscapes** woody-feature vectors (hedgerow/tree-cover delta), (3) onchain attestation via existing **RAEIS** (HCS methodology + HTS NFT). Output: a per-asset "nature-state delta" with full provenance and a mintable attestation. Built on the existing intelligence-pipeline + CompositeClusterLayer patterns.

**Tools.** Earth Index (`earthIndex.ts`) + Farmscapes GeoParquet (`farmscapes.ts`, read via DuckDB-WASM) + Hedera RAEIS (already built) + Octet/Astral (optional, proof-of-location for field-visit attestations, cf. B5). All adapters in `DATA_SOURCE_INTEGRATION_PLAN.md`.

**Build.** New layer over `src/modules/mrv/`: `compose.ts` fuses change-detection + woody-feature delta into a fusion record; `attestation.ts` publishes methodology to HCS and mints HTS NFT; new UI layer follows CompositeClusterLayer. The attestation rail exists — this is ingestion + fusion + new-layer work.

**Effort.** 2 weeks. Demoable slice in a weekend: single parcel, single change-detection + woody-feature delta, one minted attestation = "the MRV rail made tangible."

**Target grant.** **EU LIFE Programme 2026** (Sep 22, adaptation/NbS strand, €1–10M) — the MRV-tool deliverable LIFE adaptation grants want. Centerpiece for any nature-finance funder pitch. Demoable slice also fits a DeepMind framing if Scout/Diligence/Critic agents do the fusion (B6).

**Dependencies / sequencing.** Needs Farmscapes + Earth Index adapters (integration plan build-order steps 3–4). Flagship for Sep 22; build after B2/B8 weekend wins.
