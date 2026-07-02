# Aqueduct

**The open aggregation + intent layer for regenerative agriculture.**

Aqueduct makes the fragmented regen-ag / ReFi ecosystem legible, and lets a smallholder or co-op publish **one intent** — *sell this lot · finance this planting · prove this origin* — that the existing platforms' solvers compete to fill. It aggregates the proof and routes the intent to whoever already fills it, instead of inserting a new intermediary between farmer and buyer/lender.

Built by Ecofrontiers SARL. MIT licensed — openness is structural, not a promise.

---

## Why

A smallholder carries her harvest to the one buyer she can reach and takes the price she is given, because she cannot prove it is worth more. Smallholders grow ~a third of the world's food and routinely lose 30-60% of a crop's worth to intermediaries. The middleman's functions — grade, vouch, know the buyer, know the price, move the lot — are now automatable judgment tasks. The failure mode is the tool becoming the new middleman and extracting the same rent. **Open is the only version where the value and the data stay with the farmers.**

## The gap (why this doesn't exist yet)

- **Intents are DeFi-only.** ERC-7683 / Open Intents / x402 move tokens across chains; nobody publishes farmer/produce/credential intents.
- **Aggregation exists only inside carbon** (Toucan, KlimaDAO, Carbonmark). There is no *registry of registries* spanning EthicHub + Regen + Silvi + AgroforestDAO + Astral into one legible farmer/lot view.
- So the same farmer is **re-onboarded and re-siloed on every platform** — a planting proven on Silvi can't be spent to request a loan on EthicHub or sell an ecocredit on Regen.

## Why now

- **EUDR** makes a GPS farm-origin proof *legally required* for smallholders (large operators 30 Dec 2026; SMEs/smallholders 30 Jun 2027) — instant, regulatory demand for a verifiable origin record.
- **Agent payment rails shipped** — x402 (Coinbase/Cloudflare/Google AP2) makes autonomous sub-cent solver settlement real.
- **dMRV cost collapsed** — satellite (Sentinel-2/Planet) + AI drop per-plot verification by orders of magnitude, making a $5 lot economically legible.
- **Agent identity (ERC-8004)** and **loyal/community-owned AI (Sentient OML)** landed in the same window — a farmer-*owned* routing agent can now hold portable reputation.

## Architecture

Three layers, mapping to the two codebases forked in as our starting point:

| Layer | What it does | Fork |
|---|---|---|
| **READ / aggregation** | Make platforms, entities, and certifications legible on a bioregion map — the discovery + provenance surface. | [`atlas/`](atlas/) — forked from **Regen Atlas / Ecospatial** (React + Vite + Mapbox + Supabase; already aggregates 500+ tokenized green assets across 7+ protocols, provenance on Filecoin). |
| **WRITE / intents + solver-transport** | Publish a farmer/co-op intent; a solver + transport network fills it (buy, finance, move) over a landed-cost graph. | [`routes/`](routes/) — forked from **SlabClaw Routes** (the intents + route-cost + solver engine, proven on physical goods). |
| **Tokenized farm assets** | The portable **farmer-lot attestation** (who / where / what / proof-hash) an intent references and any buyer can re-verify. | EAS + Astral Location Protocol on **Celo** (the shared substrate). |

**The substrate is already shared.** Silvi, AgroforestDAO, Astral, and Regen Atlas are all on **Celo**, and **EAS on Celo** can carry a portable farmer-lot attestation. That is why aggregation is feasible now rather than a rebuild.

## First platforms to aggregate

Read-real today: **Regen Network** (ecocredit gRPC/REST), **EthicHub** (onchain smallholder loans), **Astral** (EAS location proofs), **Toucan** (carbon subgraph). Fillable via a small EAS-on-Celo attestation adapter: **Silvi** (planting claims), **AgroforestDAO** (Proof-of-Succession). Each maps to a concrete farmer intent (finance / sell ecocredit / prove origin / pre-sell carbon).

## Anti-middleman by construction

- **Aggregate, don't disintermediate** — route the intent to platforms that already fill it; never sit between farmer and counterparty.
- **The farmer owns the proof** — a content-addressed attestation she carries across platforms, not a record locked in our DB.
- **MIT + self-hostable** — anyone can run it; no operator can enclose the layer.
- **Credibility spine** — respects the scientific-credibility rules for nature markets (public shapefiles, additionality, independent verification, spatially-explicit data); we don't blend incommensurable scores.

## Repository

```
aqueduct/
├── atlas/    # READ  — forked Regen Atlas (the aggregation interface, our starting point)
├── routes/   # WRITE — forked SlabClaw Routes (intents + solver/transport engine)
├── docs/     # concept, application draft, source materials, research
└── LICENSE   # MIT
```

> **Status: early.** `atlas/` and `routes/` are the forked starting point, not yet wired together. What is *real today* (aggregation, provenance, the intent/route engine) and what is *to build* (the regen-ag intent schema, the EAS-on-Celo lot attestation, the platform adapters, the farmer front door) is tracked honestly in [`docs/`](docs/). Nothing here claims a capability that isn't wired.

## License

MIT — © 2026 Pat Rawson (Ecofrontiers SARL). See [`LICENSE`](LICENSE).
