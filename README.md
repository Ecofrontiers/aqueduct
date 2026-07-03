# AqueductX

A generalized peer-to-peer logistics and finance layer for smallholder farmers. Runs locally today (`npm run dev`); the hosted build is at [aqueductx.trade](https://aqueductx.trade).

Built by Ecofrontiers SARL. The code is MIT-licensed; the canonical lot schema and the lot-ID spec are dedicated to the public domain under CC0. Two grants, unownable rather than merely unowned. See [License](#license).

---

## The problem

A third of the world's food is grown by smallholders. Between them and the markets that consume it stands a chain of intermediaries, because trade runs on judgment: someone must grade the goods, vouch for their origin, find the buyer, and carry the risk. That judgment is an operational cost a single smallholder lot cannot carry. And lenders do not lend against lots they cannot verify—legibility comes before capital.

- **$2.5T** global trade-finance gap, credit demanded worldwide that goes unmet (ADB Trade Finance Gaps Survey).
- **~$250** minimum inspection fee per shipment (Bureau Veritas Verigates PVoC schedule). A single smallholder lot cannot carry it.
- **$323B** annual smallholder finance demand against roughly **$95B** supplied (ISF Advisors Global Report).

## Legibility

A smallholder's lot fails three checks lenders require. It cannot afford professional verification. It must re-prove compliance to every new buyer. Nobody can confirm the harvest is not pledged twice.

Make the lot legible—a shared schema, a derivable ID, typed claims—and a swarm of agents runs all three checks at almost no cost. One proof serves every standard. Double-pledging becomes a registry lookup. Verification works at single-lot scale.

## The steward

Automated judgment placed in the producer's hands. The steward is an agent that represents producer interests and nothing else. It holds the producer's plot geometry, credit history, reserve floor, harvest windows, and disclosure preferences. It screens solver bids against the floor, assembles compliance evidence once, and prepares settlement for confirmation.

Five verbs, one surface:

1. **Post an intent:** sell a lot, finance a planting, source an input.
2. **Set the floor:** the producer's reserve price; solvers bid against it, never under it.
3. **Accept or decline a fill:** matches arrive as named terms; the producer decides.
4. **Confirm settle:** human-confirmed by default, fully delegable to the steward by designation.
5. **Set disclosure tiers:** decides what evidence leaves the seat; plot geometry stays.

The verb set is a floor. Producers can extend the steward with negotiation strategies, alerts, or any automation that serves their interests.

## Architecture

AqueductX is an assemblage of concurrent agents acting on a small set of shared objects. No agent owns the next. Each reads and writes the same lots, intents, claims, and standards. Order belongs to the lot, not the swarm.

- **Scout** aggregates real platform surfaces.
- **Diligence** verifies origin and grade, and flags gaps.
- **Certifier-resolver** resolves cited standards against TIC, GLOW-GCA, and GIIN.
- **Oracle** prices against a real floor.
- **Solver** races to fill with landed-cost bids.
- **Steward** settles and custodies for the coop.

The system maps to three layers over two codebases forked in as our starting point:

| Layer | What it does | Fork / where it lives |
|---|---|---|
| **READ / aggregation** | Makes platforms, entities, and certifications legible on a bioregion map: the discovery and provenance surface. | [`atlas/`](atlas/), forked from **Regen Atlas / Ecospatial** (React + Vite + Mapbox + Supabase; already aggregates 500+ tokenized green assets across 7+ protocols, provenance on Filecoin). |
| **WRITE / intents + solver-transport** | Publishes a farmer or coop intent; a solver and transport network fills it (buy, finance, move) over a landed-cost graph. | [`routes/`](routes/), forked from **SlabClaw Routes** (the intents, route-cost, and solver engine, proven on physical goods). |
| **Attestation + provenance** | The proof layer. Every rendered element carries a provenance chip (LIVE / SNAPSHOT / SIM / TESTNET / TO-BUILD) and a confidence tag, and a curated certifier registry maps each citation to a verified firm. A portable certifier attestation object (VC/BBS+) is **TO-BUILD**. | `atlas/src/aqueduct/connectors/` + [`components/Chips.tsx`](atlas/src/aqueduct/components/Chips.tsx) |

## The data model

The data model is REA: Resources, Events, and Agents. Selling a harvest and financing one are the same kind of exchange. AqueductX models both sides in one schema: what a farm sells (the coffee lot it ships, with weight and grade) and what it consumes to produce (seedlings, home solar) are both resources.

Writing the model down exposed the object every platform lacks: the **Claim**. Capital moves now; the repayment owed later is a first-class record. The rate is real, published by a live lending platform, with completed repayment cycles onchain. EthicHub, a crowdlending platform financing smallholder coffee cooperatives, lends to these cooperatives at a published 9.9%, and Line 2 completed a full borrow-to-repay cycle of 192,600 to 212,369.79 USDC on Celo.

## What reads live today

Two verticals read live today, both real:

- **EthicHub, coffee (Chiapas).** The scout reads three public surfaces: the Odoo shop HTML, the lending JSON API, and a Celo `CreditLine` `eth_call` ([`connectors/ethichub.mjs`](atlas/src/aqueduct/connectors/ethichub.mjs)). Credit lines settle in native USDC on Celo; Line 2 completed a 192,600 to 212,369.79 USDC borrow-to-repay cycle at the published 9.9% EthicHub/Heifer facility rate. Chip: **LIVE / SNAPSHOT**.
- **Glow, solar.** Glow, a protocol financing distributed solar, publishes each farm's output and reward stream. The connector reads 124 audited farms (10 curated on-map), a live GLW price (~$0.2825) from an onchain Uniswap-V2 pool, and Glow Miner terms graded `reported` ([`connectors/glow.mjs`](atlas/src/aqueduct/connectors/glow.mjs)). The GCC price register is honestly reported degenerate (drained auction, dust pool); no number is fabricated.

Supporting snapshots, each carrying a `verifiedAt` date and a source URL: a certifier registry of real TIC and sustainability firms ([`connectors/certifiers.mjs`](atlas/src/aqueduct/connectors/certifiers.mjs)) and verified GIIN IRIS+ metric codes ([`connectors/giin.mjs`](atlas/src/aqueduct/connectors/giin.mjs)).

## Anti-middleman by construction

The failure mode for a tool like this is becoming the new middleman and extracting the same rent. The design forecloses it:

- **Aggregate, do not disintermediate.** Route the intent to platforms that already fill it; never sit between farmer and counterparty.
- **The farmer owns the proof.** A content-addressed attestation she carries across platforms, not a record locked in our database.
- **MIT and self-hostable.** Anyone can run it; no operator can enclose the layer.
- **The standard is unownable.** The canonical lot schema and the content-addressed lot-ID spec carry a CC0 public-domain dedication, distinct from the MIT grant on the code, so the namespace cannot be enclosed or rented back.
- **Credibility spine.** Respects the scientific-credibility rules for nature markets (public shapefiles, additionality, independent verification, spatially-explicit data). We do not blend incommensurable scores.

## The demo (what runs today)

One app: **AqueductX**, wearing Regen Atlas's body. The layers above are wired; the `routes/` landed-cost engine computes real solver bids inside the `atlas/` map UI.

- **Map** (`/`): the network graph. 3 real EthicHub coffee lots (LIVE reads, Chiapas) and 10 real Glow solar farms sit inside a seeded synthetic economy of 1,250 SIM lots across 21 real smallholder origins. That is 1,253 coffee and sim lots plus 10 solar farms, 1,263 in the Lots rail across two verticals, with coop-to-hub flow arcs, demand hubs, venues, and a docked judge tour ("One lot, end to end": aggregate, verify, price, publish, fill, settle, ask).
- **Coop seat** (`/coops/:coopId`): the same engine from the cooperative's chair. Publish a sell intent and watch solvers compete on that route; tokenized trade finance (structured receivable, policy-engine eligibility, advance) benchmarked against EthicHub's real Celo USDC credit lines; a duplicate-financing check over content-addressed lot IDs.
- **Financing** (`/financing`): capital formations. Buyers, grants, and funds matched to the lot population by the same (institution, rule, condition, effect) policy engine, citing verified GIIN IRIS+ metrics.
- **Receipts, inline.** Every element carries a provenance chip: LIVE / SNAPSHOT / SIM / TESTNET / TO-BUILD. There is no separate ledger page; the settle payload lives in the header's dev-mode bar, and every real source read (ethichub.com, the Celo credit line) links out from the lot it belongs to. A real EUDR check finding real gaps renders PARTIAL; nothing is invented to look complete.

The synthetic economy is deterministic (one seed, no runtime randomness, replays identically) and calibrated to the research in [`docs/research/`](docs/research/): solver-market concentration per measured CoW/Across data, coffee price bands anchored by the real EthicHub lots, cacao and honey labeled as coarse.

- **The data model** (`/ontology`): the REA ontology as a living page. Each of the five concepts with its plain-language definition, its AqueductX type, and a real example rendered straight from the economy.
- **System architecture** ([`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)): describes the aggregate, verify, price, publish, fill, settle loop, the connector and provenance discipline, the REA data model, and the settlement path, every claim citing code.

## Roadmap

The build to date hardens the reads above. The funded work extends them:

1. **Harden three live verticals** from existing Regen Atlas partners: EthicHub (coffee trade finance), Glow (solar finance), and LandX (agri-commodity trade finance). EthicHub and Glow read live today; LandX is a named partner for the hardening work.
2. **Wire the certification databases** (Fairtrade, Rainforest Alliance, TIC agencies) so compliance status is verified against the source, not declared.
3. **Sealed-bid solver races**, so coops and other producers keep their bargaining power.
4. **First cooperative or exporter reading its own lots in** through the ERP integration: the point where the registry stops being our data and starts being theirs.

## Quickstart

```bash
git clone https://github.com/Ecofrontiers/aqueduct && cd aqueduct/atlas
npm install
cp .env.example .env   # or create .env, see below
npm run dev            # → http://localhost:5173
```

Minimal `.env` (the app degrades gracefully without the rest):

```
VITE_MAPBOX_ACCESS_TOKEN=   # required, the map
VITE_SUPABASE_URL=          # optional, the inherited Atlas asset registry
VITE_SUPABASE_ANON_KEY=     # optional
```

## Repository

```
aqueduct/
├── atlas/                  # the app, forked Regen Atlas, now AqueductX
│   └── src/aqueduct/       # connectors, canonical lot schema, sim economy,
│                           #   policy engine, trade finance, pages
├── routes/                 # forked SlabClaw Routes, the landed-cost/solver engine
├── docs/                   # research (14 cited reports), application, specs
└── LICENSE                 # MIT
```

Built on [Regen Atlas](https://www.regenatlas.xyz) (Ecofrontiers SARL) and SlabClaw Routes, forked as the starting point and credited in-app.

## License

Two grants, deliberately distinct:

- **Code:** MIT, © 2026 Pat Rawson (Ecofrontiers SARL). See [`LICENSE`](LICENSE).
- **Standard:** the canonical lot schema and the content-addressed lot-ID spec are dedicated to the public domain under CC0 1.0. See [`LICENSE-SCHEMA`](LICENSE-SCHEMA). Unownable, not merely unowned.

Both forked components are our own prior work, not third-party code: `atlas/` (Regen Atlas / Ecospatial) and `routes/` (SlabClaw Routes) are each © Pat Rawson (Ecofrontiers SARL) and are included here under this same MIT license, so nothing in the tree carries an unstated or incompatible license.
