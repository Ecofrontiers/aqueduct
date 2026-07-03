# AqueductX

**A generalized peer-to-peer logistics and finance layer for smallholder farmers** — a swarm decision-support system for agricultural trade finance. Runs locally today (`npm run dev`); the hosted demo lands at [aqueductx.trade](https://aqueductx.trade) at submission.

Small, single-purpose agents **aggregate** commodity lots, **verify** them, and **price** them; a smallholder or co-op publishes **one intent** — *sell this lot · finance this planting · finance this farm* — and solvers compete to **fill** it. AqueductX routes the intent and feeds a capital-allocation decision a human or institution still owns, instead of inserting a new intermediary between farmer and counterparty.

Built by Ecofrontiers SARL. MIT licensed — openness is structural, not a promise: the repo is public at submission, and a reviewer who wants to verify sooner can request a read-only snapshot or the current commit hash.

---

## Why

A smallholder carries her harvest to the one buyer she can reach and takes the price she is given, because she cannot prove it is worth more. Smallholders grow ~a third of the world's food, yet capture a thin slice of what their crop is finally worth. The middleman's functions — grade, vouch, know the buyer, know the price, move the lot — are now automatable judgment tasks. The failure mode is the tool becoming the new middleman and extracting the same rent. **Open is the only version where the value and the data stay with the farmers.**

## The gap (why this doesn't exist yet)

- **Intents are DeFi-only.** ERC-7683 / Open Intents / x402 move tokens across chains; nobody publishes a farmer/lot/credential intent a solver can fill.
- **Smallholder proof is siloed per platform.** A lot verified on one platform can't be priced, financed, or sold on another — the farmer is re-onboarded and re-siloed everywhere, and the margin stays with the intermediary.
- **No one aggregates smallholder commodity lots across verticals** into one legible, financeable view. AqueductX does, reading two live today: EthicHub coffee (Chiapas) and Glow solar.

## Why now

- **EUDR** makes a GPS farm-origin proof *legally required* for smallholders (large operators 30 Dec 2026; SMEs/smallholders 30 Jun 2027) — instant, regulatory demand for a verifiable origin record.
- **Agent payment rails shipped** — x402 (Coinbase/Cloudflare/Google AP2) makes autonomous sub-cent solver settlement real.
- **dMRV cost collapsed** — satellite (Sentinel-2/Planet) + AI drop per-plot verification by orders of magnitude, making a $5 lot economically legible.
- **Agent identity (ERC-8004)** and **loyal/community-owned AI (Sentient OML)** landed in the same window — a farmer-*owned* routing agent can now hold portable reputation.

## Architecture

Three layers, mapping to the two codebases forked in as our starting point:

| Layer | What it does | Fork / where it lives |
|---|---|---|
| **READ / aggregation** | Make platforms, entities, and certifications legible on a bioregion map — the discovery + provenance surface. | [`atlas/`](atlas/) — forked from **Regen Atlas / Ecospatial** (React + Vite + Mapbox + Supabase; already aggregates 500+ tokenized green assets across 7+ protocols, provenance on Filecoin). |
| **WRITE / intents + solver-transport** | Publish a farmer/co-op intent; a solver + transport network fills it (buy, finance, move) over a landed-cost graph. | [`routes/`](routes/) — forked from **SlabClaw Routes** (the intents + route-cost + solver engine, proven on physical goods). |
| **Attestation + provenance** | The proof layer: every rendered element carries a provenance chip (LIVE / SNAPSHOT / SIM / TESTNET / TO-BUILD) and a confidence tag, and a curated certifier registry maps each citation to a verified firm. A portable certifier attestation object (VC/BBS+) is **TO-BUILD**. | `atlas/src/aqueduct/connectors/` + [`components/Chips.tsx`](atlas/src/aqueduct/components/Chips.tsx) |

**The reads are already live.** EthicHub settles smallholder coffee credit on **Celo** (real USDC credit lines), and Glow publishes solar-farm audits plus an onchain GLW price — two independent, verifiable sources AqueductX reads today. That is why aggregation is demonstrable now rather than a rebuild.

## What reads live today

Two verticals, both real reads:

- **EthicHub — coffee (Chiapas).** The scout reads three public surfaces: the Odoo shop HTML, the lending JSON API, and a Celo `CreditLine` `eth_call` ([`connectors/ethichub.mjs`](atlas/src/aqueduct/connectors/ethichub.mjs)). Real 9.9% EthicHub / Heifer facility rate; a completed 192,600 → 212,369.79 USDC repay cycle. Chip: **LIVE / SNAPSHOT**.
- **Glow — solar.** 124 audited farms (10 curated on-map), a live GLW price (~$0.2825) read from an onchain UniV2 pool, and Glow Miner terms graded `reported` ([`connectors/glow.mjs`](atlas/src/aqueduct/connectors/glow.mjs)). The GCC price register is honestly reported degenerate (drained auction, dust pool) — no number is fabricated.

Supporting snapshots, each carrying a `verifiedAt` date and source URL: a certifier registry of real TIC + sustainability firms ([`connectors/certifiers.mjs`](atlas/src/aqueduct/connectors/certifiers.mjs)) and verified GIIN IRIS+ metric codes ([`connectors/giin.mjs`](atlas/src/aqueduct/connectors/giin.mjs)).

## Anti-middleman by construction

- **Aggregate, don't disintermediate** — route the intent to platforms that already fill it; never sit between farmer and counterparty.
- **The farmer owns the proof** — a content-addressed attestation she carries across platforms, not a record locked in our DB.
- **MIT + self-hostable** — anyone can run it; no operator can enclose the layer.
- **The standard is unownable** — the canonical lot schema and the content-addressed lot-ID spec carry a CC0 public-domain dedication, distinct from the MIT grant on the code, so the namespace nobody owns cannot be enclosed or rented back.
- **Credibility spine** — respects the scientific-credibility rules for nature markets (public shapefiles, additionality, independent verification, spatially-explicit data); we don't blend incommensurable scores.

## The demo (what runs today)

One app: **AqueductX**, wearing Regen Atlas's body. The layers above are wired — the
`routes/` landed-cost engine computes real solver bids inside the `atlas/` map UI.

- **Map** (`/`) — the network graph: 3 real EthicHub coffee lots (LIVE reads, Chiapas)
  and 10 real Glow solar farms, inside a seeded synthetic economy of 1,250 SIM lots
  across 21 real smallholder origins — 1,253 coffee/sim lots + 10 solar = 1,263 in the
  Lots rail, across two verticals — with coop→hub flow arcs, demand hubs, venues, and a
  docked judge tour ("One lot, end to end": aggregate → verify → price → publish → fill
  → settle → ask).
- **Coop seat** (`/coops/:coopId`) — the same engine from the cooperative's chair:
  publish a sell intent and watch solvers compete on YOUR route; tokenized trade
  finance (structured receivable → policy-engine eligibility → advance) benchmarked
  against EthicHub's real Celo USDC credit lines; duplicate-financing check over
  content-addressed lot IDs.
- **Financing** (`/financing`) — capital formations: buyers/grants/funds matched to the
  lot population by the same (institution, rule, condition, effect) policy engine,
  citing verified GIIN IRIS+ metrics.
- **Receipts, inline** — every element in the app carries a provenance chip: **LIVE /
  SNAPSHOT / SIM / TESTNET / TO-BUILD**. There's no separate ledger page; the settle
  payload lives in the header's dev-mode bar and every real source read (ethichub.com,
  the Celo credit line) links out from the lot it belongs to. A real EUDR check
  finding real gaps renders PARTIAL — nothing is invented to look complete.

The synthetic economy is deterministic (one seed, no runtime randomness — replays
identically) and calibrated to the research in [`docs/research/`](docs/research/):
solver-market concentration per measured CoW/Across data, coffee price bands anchored
by the real EthicHub lots, cacao/honey labeled as coarse.

- **The data model** (`/ontology`) — the REA (Resource–Event–Agent) ontology as a living
  page: each of the five concepts with its plain-language definition, its AqueductX type,
  and a real example rendered straight from the economy.
- **System architecture** — [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) describes the
  aggregate → verify → price → publish → fill → settle loop, the connector/provenance
  discipline, the REA data model, and the settlement path, every claim citing code.

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
├── atlas/                  # the app — forked Regen Atlas, now AqueductX
│   └── src/aqueduct/       # connectors, canonical lot schema, sim economy,
│                           #   policy engine, trade finance, pages
├── routes/                 # forked SlabClaw Routes — the landed-cost/solver engine
├── docs/                   # research (14 cited reports), application, specs
└── LICENSE                 # MIT
```

Built on [Regen Atlas](https://www.regenatlas.xyz) (Ecofrontiers SARL) and SlabClaw
Routes — forked as the starting point, credited in-app.

## License

Two grants, deliberately distinct:

- **Code:** MIT — © 2026 Pat Rawson (Ecofrontiers SARL). See [`LICENSE`](LICENSE).
- **Standard:** the canonical lot schema and the content-addressed lot-ID spec are
  dedicated to the public domain under CC0 1.0 — see [`LICENSE-SCHEMA`](LICENSE-SCHEMA).
  Unownable, not merely unowned.

Both forked components are our own prior work, not third-party code: `atlas/`
(Regen Atlas / Ecospatial) and `routes/` (SlabClaw Routes) are each © Pat Rawson
(Ecofrontiers SARL) and are included here under this same MIT license — so nothing
in the tree carries an unstated or incompatible license.
