# B4 — "MRV-in-a-box" Methodology Registry (RAEIS as a public standard)

**Scope.** Generalize **RAEIS** from a Regen Atlas internal standard into an open, forkable **MRV methodology registry**: anyone publishes an MRV methodology to **HCS** (inputs, model versions, thresholds, provenance rules), runs it, and mints attestation **HTS NFTs**. Append-only, **supersession-not-deletion** (NP6 from June papers — corrections supersede, never overwrite). Positions Regen Atlas as the **neutral rail under** NatureGrid-class SaaS rather than competing with them — "the rail, not the competitor."

**Tools.** Hedera RAEIS (extend existing HCS topic + HTS mint) + Earth Index/Farmscapes/Copernicus as reference methodologies + Citations-API-style provenance (June paper NP / rule §47).

**Build.** A credible reference implementation: methodology schema (JSON on HCS), a runner that executes a registered methodology over an ingestion query and mints the result, and **2 example methodologies** (one terrestrial change-detection, one marine state-of-nature). Generalizes B1's `attestation.ts`.

**Effort.** 2 weeks for reference implementation + 2 example methodologies.

**Target grant.** Nature-finance funders ("the missing rail" pitch); **EU LIFE governance strand**. Interop story with the **100+ companies in the BioInt Nature-MRV DB** (B8) — we're the rail, not the competitor — turns the C2 contactbook list into a partner funnel. Directly answers the report's "self-reported, unverified tools" critique with a verifiable open standard, and recommendation G2 (interoperability, standardisation).

**Sequencing.** After B1 (shares the attestation rail). The B8 landscape map supplies the named interop targets that make this credible.
