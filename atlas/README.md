# Ecospatial (Regen Atlas)

**[Production](https://regenatlas.xyz)** · **Ecofrontiers SARL**

Open-source registry of tokenized environmental assets, ecological actions, and regenerative actors — mapped to 185 bioregions.

## Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS + DaisyUI
- **Map:** Mapbox GL JS (react-map-gl) with GeoJSON bioregion boundaries, composite cluster layers, spiderfy
- **Data:** Supabase (PostgreSQL) — 505 assets, 224 actions, 27 actors across 7 protocols
- **Images:** 247 AI-generated bioregion landscapes (FLUX 1.1 Pro via Replicate)
- **Blockchain:** Wagmi + ConnectKit (Celo, Filecoin Calibration)

## Features

- **Bioregion Explorer** — 185 One Earth bioregions with asset/action/actor counts, PFP images, tabbed detail panels
- **Entity Filtering** — Assets (Type/Issuer/Chain), Actions (Protocol/SDG/Time), Actors (Orgs/Agents)
- **Action Grouping** — Actions at same location with same base title bundled in panel, deduped on map at high zoom
- **Actor Views** — Organizations and AI agents with collapsible accordion + detail cards
- **List Project** — Formspree-powered submission form for assets, actors, and actions
- **Mobile Responsive** — Entity toggle pills, full filter modal with Protocol/SDG support, 44px touch targets

## Hacks (Experimental UI)

Accessible via the **Hacks** dropdown in the navbar. These are hackathon demos with mock data:

- **Explore + EII** (`/hacks/explore`) — Full Explore UI with Ecosystem Integrity Index scoring, vault TVL, and delta trends per bioregion
- **Impact & Market Intelligence** (`/insights`) — Protocol panels, gap analysis, market cap charts
- **Bioregion Vaults** (`/vaults/:id`) — Vault metrics, EII pillars, proposals, yield sources, agent commitments
- **Interspecies Parliament** (`/parliament`) — Threaded feed with epochs, whispers, bounties (requires `node simulation/server.js`)
- **Hedera — RAEIS Provenance** (`/publish`) — 3-layer HCS/HTS visualization of Guardian attestations

## Project Structure

```
src/
├── Explore/           # Production map + panels
│   └── hacks/         # Old ecospatial UI with full EII integration
├── Ecospatial/        # VaultDetail, Parliament, components
├── Intelligence/      # ImpactDashboard, protocol panels
├── Publish/           # Hedera RAEIS page
├── Agents/            # Agent detail pages
├── modules/
│   ├── ecospatial/    # EII, vaults, parliament, A2A, proposals
│   ├── intelligence/  # Bioregion data, valuation, protocol sources
│   └── filecoin/      # Synapse SDK provenance
├── context/           # React context (filters, map, base)
└── shared/            # Components, types, consts
integrations/          # Hedera Guardian sync + autonomous agents
simulation/            # Parliament epoch simulation
contracts/             # Solidity (Foundry)
```

## Development

```bash
npm install
npm run dev        # localhost:5173
npm run build      # production build to dist/
```

Requires `.env` — see `env/ecospatial.env.enc` (encrypted).

## Protocols Tracked

Toucan, Regen Network, Hedera Guardian, Atlantis, Ecocerts (Gainforest), Silvi, Glow

## License

Proprietary — Ecofrontiers SARL
