---
title: "Hedera Guardian Integration — Data Package"
subtitle: "Regen Atlas / Ecospatial"
author: "Pat Cowden"
date: "March 2026"
geometry: margin=2.5cm
fontsize: 11pt
colorlinks: true
linkcolor: blue
urlcolor: blue
header-includes:
  - \usepackage{booktabs}
  - \usepackage{longtable}
  - \usepackage{float}
  - \floatplacement{table}{H}
---

# Overview

This package contains **46 verified environmental actions** scraped from the **Hedera mainnet** via the Mirror Node public API. Actions span 6 platforms that use Hedera's token infrastructure for carbon credit issuance, bridging, and industrial measurement.

All data is independently verifiable — every action links to a Hedera token or HCS topic on HashScan (the Hedera block explorer).

\bigskip

| Metric | Value |
|--------|-------|
| Total actions | 46 (aggregated from ~80 raw tokens) |
| Actions with geography | 39 (85%) |
| Total proof links | 145 |
| Actions with certifications | 22 |
| Countries covered | US, GB, BG, FR, AU, RW + 4 more |
| SDGs tagged | 13 (Climate), 12 (Resp. Consumption), 15 (Life on Land), 6 (Clean Water) |

# Data Source

**Hedera Mirror Node REST API (mainnet)**

- Base URL: `https://mainnet-public.mirrornode.hedera.com/api/v1`
- Authentication: None required (public, free)
- Rate limit: ~100 req/sec (we throttle to 5 req/sec out of courtesy)
- Docs: <https://docs.hedera.com/hedera/sdks-and-apis/rest-api>

Key endpoints used:

- `GET /accounts/{id}/tokens` — enumerate tokens held by a treasury account
- `GET /tokens/{id}` — token detail (name, symbol, memo, supply, keys)
- `GET /tokens/{id}/nfts?limit=1` — first NFT serial metadata (for Tolam/GCR)

No Hedera SDK is needed for reading data. The `@hashgraph/sdk` package is only used for our RAEIS publisher (writing to testnet).

# Platforms

## 1. DOVU (10 actions)

**What:** Soil carbon credits from UK and European farms, verified under DOVU's digital MRV (dMRV) standard via Hedera Guardian.

**Treasury accounts:** `0.0.610168` (original), `0.0.1357309` (Guardian reissue)

**Token pattern:** Fungible tokens, one per farm. Memo format: `DOVU:SYMBOL:TOPIC_ID` where the topic ID links to the Guardian MRV policy.

**Geography:** UK (Summerley Hall, Red Hill), Bulgaria (Setka Gosheva, Omarchevo, Briyastovo), France (Distillerie Coquerel), Argentina (Ketrawe), Bolivia (Vaca Diez), Colombia (Savimbo).

**SDGs:** 13 (Climate Action), 15 (Life on Land)

**Certification:** DOVU dMRV Standard — self-certified but Guardian-verified infrastructure.

## 2. Tolam Earth (7 actions)

**What:** Multi-registry carbon credit bridge. Tokenizes credits from Verra VCS, EcoRegistry, and Global C-Sink Registry as NFTs on Hedera (1 NFT = 1 tCO2e).

**Treasury accounts:** `0.0.6144372` (assets), `0.0.6138881` (certificates)

**Token pattern:** Non-fungible unique (NFT). Name prefixes indicate registry: `VRA` (Verra), `ERA` (EcoRegistry), `GCSR` (Global C-Sink). NFT metadata on IPFS contains project name, registry ID, monitoring period dates.

**Geography:** Mexico, US, Singapore, India, Brazil, Colombia.

**SDGs:** 13 (Climate Action)

**Certifications:** Verra VCS, EcoRegistry, or Global C-Sink depending on underlying credit.

## 3. Capturiant (2 actions — aggregated from 30 tokens)

**What:** SEC/FINRA-regulated forward carbon credit marketplace. Two US forestry projects with 20-year vintage ranges.

**Treasury accounts:** `0.0.4640644` (Miller Mountain, 20 vintage tokens 2024-2043), `0.0.5054978` (Warrior, 10 vintage tokens 2024-2033)

**Token pattern:** Fungible tokens, one per vintage year. Memo field is a plain IPFS CID (bafkrei...) resolvable at `https://{CID}.ipfs.w3s.link/`. IPFS JSON contains `projectName`, `projectType`, `country`, `vintage`, `validationDate`, `standard`, `sdgs[]`.

**Geography:** Virginia (Miller Mountain), North Carolina (Warrior)

**SDGs:** 13, 9, 12, 15 (varies by project)

**Certification:** Capturiant Standard (SEC/FINRA regulated)

## 4. OrbexCO2 (22 actions)

**What:** Industrial carbon intensity measurement for recycled metals. Dual-token model: a commodity token (scrap metal batch) paired with a CO2 credit token.

**Treasury account:** `0.0.4576278` (120+ tokens total; ~22 CO2 credit tokens after filtering)

**Token pattern:** CO2 credit tokens have `tokenLink` in memo JSON pointing to the paired commodity token. Geography comes from the commodity token's memo: `Origin-US-{STATE}`. Material categories: ferrous, aluminum, copper, stainless steel, thermal coal, plastic.

**Geography:** US states — Tennessee, Kentucky, Alabama, California, Illinois, Indiana, and more.

**SDGs:** 13 (Climate Action), 12 (Responsible Consumption and Production)

**Certification:** None (self-measured industrial MRV)

## 5. GCR — Global Climate Registry (4 actions)

**What:** Gold Standard TPDDTEC-verified emission reductions. Safe water and clean cookstove projects.

**Treasury account:** `0.0.3843565`

**Token pattern:** Non-fungible unique. Memo is a topic ID (e.g., `0.0.5945736`) linking to the Guardian policy. Symbol includes project name.

**Geography:** Rwanda (Safe Water Project), Kenya (Westcom POC)

**SDGs:** 13 (Climate Action), 6 (Clean Water)

**Certification:** Gold Standard Foundation — TPDDTEC methodology

## 6. TYMLEZ (1 action)

**What:** GHG Corporate Standard carbon emissions accounting. Pilot project at Cohort Innovation Space, Gold Coast Health & Knowledge Precinct, Queensland, Australia.

**Treasury account:** `0.0.1810743`

**Token pattern:** Single fungible CET (Carbon Emission Token). 37 tCO2e measured.

**Geography:** Gold Coast, Australia (-27.96, 153.38)

**SDGs:** 13 (Climate Action), 12 (Responsible Consumption and Production)

**Certification:** None (GHG Protocol Corporate Standard — self-measured)

# Files in This Package

## `/data/` — Frontend-ready JSON

| File | Records | Description |
|------|---------|-------------|
| `hedera-actions.json` | 46 | Full action objects with proofs, SDGs, certifications, actors, locations |
| `hedera-orgs.json` | 6 | Platform operator profiles (DOVU, Tolam, Capturiant, OrbexCO2, GCR, TYMLEZ) |
| `hedera-provenance.json` | 46 | Scientific valuation + provenance chain (SCC-EPA $51–$190/tCO2e) |
| `hedera-transactions.json` | — | RAEIS publication record (testnet HCS topics + NFT mints) |

## `/research/` — Raw Analysis

| File | Description |
|------|-------------|
| `HEDERA_TOKEN_METADATA_RESEARCH.md` | Capturiant + OrbexCO2 deep dive (memo schemas, IPFS, pairing logic) |
| `MIRROR_NODE_TOKEN_ANALYSIS.md` | GCR, TYMLEZ, iREC token patterns |
| `TOLAM_TOKEN_ANALYSIS.md` | Tolam Earth NFT metadata, IPFS resolution |
| `DOVU_TOKEN_ANALYSIS.md` | DOVU treasury analysis, Guardian key patterns |

## `/source/` — Integration Code

The full connector code from `integrations/src/connectors/hedera/`:

| File | Purpose |
|------|---------|
| `index.ts` | Connector entry point (implements `Connector` interface) |
| `fetcher.ts` | Mirror Node scraper (treasury enumeration, IPFS resolution) |
| `parser.ts` | Platform-specific token → `ParsedActionData` parsers |
| `types.ts` | TypeScript interfaces + treasury→platform mapping |
| `geography.ts` | Static geo lookup (farm coords, country centroids, US state centroids) |
| `schemas.ts` | RAEIS schema definitions (methodology, bioregion feed, verified action NFT) |
| `publisher.ts` | HCS/HTS publisher (testnet — creates topics, posts messages, mints NFTs) |

# Action Data Schema

Each action in `hedera-actions.json` has this shape:

```json
{
  "id": "hedera-1",
  "title": "Summerley Hall Fruit Farm",
  "description": "Soil carbon credits from...",
  "status": "PUBLISHED",
  "location": { "latitude": 52.15, "longitude": -2.22 },
  "country_code": "GB",
  "action_start_date": "2021-12-10T14:29:30.869Z",
  "action_end_date": "2021-12-15T12:35:38.927Z",
  "main_image": "/images/hedera/soil-carbon.jpg",
  "actors": [{ "id": "actor-dovu", "name": "DOVU" }],
  "sdg_outcomes": [
    { "id": 13, "code": "13", "title": "Climate Action" }
  ],
  "proofs": [{
    "proof_link": "https://hashscan.io/mainnet/token/0.0.612877",
    "proof_metadata_link": "https://hashscan.io/mainnet/topic/0.0.612876",
    "protocol": { "id": "hedera-guardian", "name": "Hedera Guardian" },
    "platform": { "id": "hedera-hashgraph", "name": "Hedera" }
  }],
  "certifications": [{
    "description_short": "dMRV verified",
    "certification_source": "https://app.dovu.market",
    "certifier": { "name": "DOVU dMRV Standard" }
  }]
}
```

Multi-vintage projects (Capturiant) aggregate into a single action with a `periods` array and multiple proofs.

# How to Verify

Any action can be independently verified:

1. Open `proof_link` on HashScan — see the token's supply, treasury, creation date
2. Open `proof_metadata_link` — see the Guardian topic messages or IPFS metadata
3. Hit the Mirror Node directly: `GET https://mainnet-public.mirrornode.hedera.com/api/v1/tokens/{token_id}`

# How to Refresh

```bash
cd integrations/
cp .env.example .env   # no API keys needed for reads
npx tsx src/cli.ts sync hedera
npx tsx src/build-static.ts
```

This scrapes all 6 treasury accounts live from Hedera mainnet (~2 minutes), filters test/junk tokens, resolves IPFS metadata, and outputs fresh JSON to `public/data/`.

# RAEIS Publication (Testnet)

We also published our own standard — **RAEIS (Regen Atlas Environmental Intelligence Standard)** — to Hedera testnet via HCS (Hedera Consensus Service). This creates:

- **Layer 1:** Methodology topic (valuation methodology, trust hierarchy, certifier registry)
- **Layer 2:** Bioregion feed topics (aggregated intelligence per bioregion with agent directives)
- **Layer 3:** Verified Action NFT collection (one NFT per action, metadata: `RAEIS:v1:actionId:bioregion:sourceToken`)

Operator: `0.0.8212210` (testnet). Transaction log in `hedera-transactions.json`.

# Contact

For questions about the integration code or data: **Pat Cowden** — ecospatial project.
