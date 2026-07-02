# B6 — Multi-Agent MRV Fusion Pipeline + Critic (DeepMind-grant-shaped)

**Scope.** Recast the B1/B3 fusion as a coordinated multi-agent pipeline: a **Scout** agent ingests Earth Index/Farmscapes/Copernicus signals, a **Diligence** agent cross-checks against eDNA + prior attestations, a new **Critic** agent validates the fused record against the RAEIS methodology **before mint** (rule 31: separate the judge from the executor). Regen Atlas already runs Scout + Diligence over HCS — the new work is the Critic node, and the agent coordination itself becomes the research artifact.

**Tools.** Existing Hedera agent coordination (Scout/Diligence over HCS; cf. Planet Scout + Diligence patterns in `docs/INTERSPECIES_SWARM_SPEC.md`) + Earth Index/Farmscapes + RAEIS. Apply contract-first decomposition + attenuated sub-agent permissions (NP5) so the Critic cannot mint, only approve/reject.

**Build.** Extend the existing agent layer with one validator node + a coordination contract: Scout output → Diligence cross-check → Critic validates against the registered RAEIS methodology → mint only on Critic approval. Every decision logged to HCS = auditable agent trail (the safety story).

**Effort.** 2 weeks (the third node is the new work; reuses live infrastructure).

**Target grant.** **DeepMind Multi-Agent AI Safety ($10M, Aug 8 2026)** — verifiable multi-agent coordination with a Critic/validator on real ecological stakes is a credible safety story (auditable agent decisions, attestation as ground-truth). Also feeds **ai-mech-atlas** as a worked coordination card (Orchestrator/Specialist/Critic, rule 31).

**Sequencing.** Cheapest path to a DeepMind-shaped artifact. Build by **Aug 8**. Reuses B1's fusion logic.
