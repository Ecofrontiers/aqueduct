# B5 — Proof-of-Location Field Attestation (Octet × Regen Atlas)

**Scope.** A lightweight mobile flow where a field steward visits a parcel, captures evidence, and **Octet** (or Astral Protocol — already in CLAUDE.md External APIs) produces a cryptographic **proof-of-location** bound to the attestation at capture time. Closes the "did the human actually go there?" gap that undermines most MRV (and eDNA chain-of-custody, cf. B3). The proof rides into the RAEIS HTS NFT.

**Tools.** Octet SDK (proof-of-location + Uniswap v4 geofence hooks) / Astral Protocol (location proofs) + Hedera RAEIS + a thin mobile capture UI (reuse the GeoLibre responsive/Android shell from B2).

**Build.** Octet/Astral SDK does the hard part; the work is wiring the proof into the attestation mint and the mobile capture UI. NatureGrid's offline georeferenced field capture (R2-T1) is the table-stakes UX baseline to match — but RA adds the cryptographic proof + onchain attestation they lack.

**Effort.** 2 weeks (SDK does the heavy lifting).

**Target grant.** Cross-cut with **I1 flagship** (location-aware verification: Windfall × Regen Atlas × FlexHEG). Strong for any onchain/RWA hackathon. The proof-of-location primitive **doubles** for windfall's spatial GPU-routing and the consulting RWA-compliance offering ("proof-of-location = same primitive as spatial MRV attestation").

**Sequencing.** Opportunistic — build when an onchain/RWA hackathon lands in the window. Reusable across windfall + consulting, so high cross-project leverage.
