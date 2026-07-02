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

## The demo (what runs today)

One app: **Aqueduct**, wearing Regen Atlas's body. The layers above are wired — the
`routes/` landed-cost engine computes real solver bids inside the `atlas/` map UI.

- **Map** (`/`) — the network graph: 3 real EthicHub coffee lots (LIVE reads, Chiapas)
  inside a seeded synthetic economy of ~1,250 SIM lots across 21 real smallholder
  origins, with coop→hub flow arcs, demand hubs, venues, and a docked judge tour
  ("One lot, end to end": aggregate → verify → price → publish → fill → settle → ask).
- **Coop seat** (`/coops/:coopId`) — the same engine from the cooperative's chair:
  publish a sell intent and watch solvers compete on YOUR route; tokenized trade
  finance (structured receivable → policy-engine eligibility → advance) benchmarked
  against EthicHub's real Celo USDC credit lines; duplicate-financing check over
  content-addressed lot IDs.
- **Financing** (`/financing`) — capital formations: buyers/grants/funds matched to the
  lot population by the same (institution, rule, condition, effect) policy engine,
  citing verified GIIN IRIS+ metrics.
- **Ledger** (`/ledger`) — the real-vs-sim receipts. Every element in the app carries a
  provenance chip: **LIVE / SNAPSHOT / SIM / TESTNET / TO-BUILD**. A real EUDR check
  finding real gaps renders PARTIAL — nothing is invented to look complete.

The synthetic economy is deterministic (one seed, no runtime randomness — replays
identically) and calibrated to the research in [`docs/research/`](docs/research/):
solver-market concentration per measured CoW/Across data, coffee price bands anchored
by the real EthicHub lots, cacao/honey labeled as coarse.

## Quickstart

```bash
git clone https://github.com/Ecofrontiers/aqueduct && cd aqueduct/atlas
npm install
cp .env.example .env   # or create .env — see below
npm run dev            # → http://localhost:5173
```

Minimal `.env` (the app degrades gracefully without the rest):

```
VITE_MAPBOX_ACCESS_TOKEN=   # required — the map
VITE_SUPABASE_URL=          # optional — the inherited Atlas asset registry
VITE_SUPABASE_ANON_KEY=     # optional
```

## Repository

```
aqueduct/
├── atlas/                  # the app — forked Regen Atlas, now Aqueduct
│   └── src/aqueduct/       # connectors, canonical lot schema, sim economy,
│                           #   policy engine, trade finance, pages
├── routes/                 # forked SlabClaw Routes — the landed-cost/solver engine
├── docs/                   # research (9 cited reports), application, specs
└── LICENSE                 # MIT
```

Built on [Regen Atlas](https://www.regenatlas.xyz) (Ecofrontiers SARL) and SlabClaw
Routes — forked as the starting point, credited in-app.

## License

MIT — © 2026 Pat Rawson (Ecofrontiers SARL). See [`LICENSE`](LICENSE).
