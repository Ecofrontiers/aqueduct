# Ecospatial Competitor Landscape

Source: Tijn Tjoelker (Bioregional Weaving Lab) LinkedIn post, May 2026. 23 tools across mapping, systems, and finance. 96 comments, 148 reactions. Use case: Sierra Nevada de Santa Marta bioregional operating system.

## Key Insight

No competitor touches the full stack. Every tool handles either visualization (Felt, Google Earth, QGIS), community coordination (Hylo, Kumu), measurement (Restor, Conservation Metrics), financial instruments (Landler), certification (Oncra), or on-chain registry (Regen Network) — but none combines all six with bioregional aggregation, scientific valuation, on-chain provenance, and DeFi capital coordination. That gap is Ecospatial's position.

---

## Tier 1: Direct Competition / Must-Track

### Felt
- **URL:** felt.com
- **What:** Cloud-native GIS with real-time collaboration, drag-and-drop import, AI/MCP layer
- **Users:** GIS analysts, environmental consultancies, field teams
- **Pricing:** Free personal; Pro ~$50/user/mo; 30% nonprofit discount
- **Tech:** SaaS, Python/JS SDK, REST API, QGIS plugin, MCP server, iOS/Android field app
- **Threat:** Best-in-class UX + MCP server means agents can build maps via prompt. Most dangerous adjacency — could theoretically add financial primitives.
- **Gap:** No provenance, no valuation (SCC-EPA/TEEB), no on-chain, no DeFi, no capital coordination. Maps are visualizations, not financial objects.
- **Integration:** Felt MCP = Ecospatial agents write/read maps directly. Use as public-facing map layer while retaining provenance/valuation in registry. Target their environmental consultancy users.

### Regen Network Development PBC
- **URL:** regen.network
- **What:** Cosmos SDK blockchain for ecological credit issuance — registry, marketplace, governance
- **Users:** Land stewards, credit buyers, protocol developers, philanthropists
- **Pricing:** Protocol-native ($REGEN transaction fees)
- **Tech:** Open-source Cosmos SDK, IBC interoperable, gRPC/REST APIs
- **Threat:** Most direct architectural analog — on-chain ecological registry with scientific protocols, live transactions. Open-source and composable.
- **Gap:** Primarily carbon-focused. No bioregional vault mechanics, no DeFi yield layer, no AI agent/spectacle layer. Project-level, not 8-asset-type bioregional map.
- **Integration:** Composability target, not competitor. REGEN credits → Regen Atlas assets. Ecospatial = coordination + capital layer on top of Regen's registry + measurement layer. Filecoin provenance adds permanence beyond their chain.

### Landler (The Landbanking Group)
- **URL:** landler.io / thelandbankinggroup.com
- **What:** All-in-one natural capital management — measure, manage, monetize, report. "Nature Equity" tradable assets.
- **Users:** Agri-food, real estate, energy, pharma corporates; institutional investors; ESG teams (TNFD, CSRD, EUDR)
- **Pricing:** Enterprise B2B (unnamed pricing). Clients: Ritter Sport, Goldbeck, Bird & Bird, Ecotone, SEKEM.
- **Tech:** Proprietary SaaS, remote sensing + field data, AI assistant "Vā"
- **Threat:** Most financially sophisticated platform — full pipeline from measurement to balance sheet. EII API already planned for Ecospatial integration.
- **Gap:** Entirely Web2/TradFi. Proprietary "Nature Equity" standard with no open interoperability. Walled garden excludes small stewards. No blockchain, no DeFi.
- **Integration:** **Already planned** (EII API). Landler measures → Ecospatial wraps in on-chain provenance (Filecoin) → lists in registry → routes to bioregional vaults for DeFi yield. Landler = TradFi credibility; Ecospatial = Web3 liquidity + coordination.

### Restor
- **URL:** restor.eco
- **What:** Swiss nonprofit (Crowther Lab/ETH) connecting 200K restoration sites to ecological datasets and funders
- **Users:** Restoration practitioners, NGOs, governments, corporate funders
- **Pricing:** Freemium. Basic CHF 1,400/yr; Advanced CHF 5,000/yr (API); Enterprise custom. 30% nonprofit discount.
- **Tech:** Web app, API on Advanced+, 30+ ecological datasets. Not open-source.
- **Threat:** Massive scale (200K sites, 20K users, 140 countries). 30+ pre-integrated ecological datasets. Institutional credibility (ETH Zurich).
- **Gap:** Purely monitoring/visibility. No asset tokenization, no DeFi, no cross-asset-class registry. No scientific valuation at asset level. Steep pricing floor.
- **Integration:** Data source — 30+ ecological datasets and 200K site coordinates into Ecospatial registry. Funder database surfaces capital-seeking projects for bioregional vaults.

---

## Tier 2: Strategic Partners / Complementary

### Hylo
- **URL:** hylo.com
- **What:** Open-source non-profit community coordination for regenerative/bioregional groups. Nested composable groups, cross-group collaboration, geographic map.
- **Users:** Regen ag networks, bioregional organizers, Indigenous-led orgs. Partners: Regen Network, Planetary Health Alliance, Salmon Nation, OpenTEAM.
- **Pricing:** Free. Donation/grant-funded 501c3.
- **Tech:** Open-source Apache 2.0. Web + mobile. Terran Collective / Holo Ltd.
- **Why partner:** Most natural strategic partner. Their communities = our users. Hylo = who is working on what; Ecospatial = what assets exist + economic value. Embed bioregional vault widget in Hylo group pages. Shared Regen Network connection.
- **Gap they fill:** Cross-group composability, community trust, grassroots coordination that Ecospatial doesn't address.

### CoMapeo
- **URL:** comapeo.app (Awana Digital, formerly Digital Democracy)
- **What:** Free, open-source, offline-first territory monitoring co-designed with Indigenous communities (Amazon, East Africa, Southeast Asia, Pacific)
- **Users:** Indigenous communities (Achuar, Waorani, Maasai, Ogiek), environmental justice orgs
- **Pricing:** Free and open-source. Non-profit.
- **Tech:** Offline mobile app, peer-to-peer sync, no central server. 10+ years field development.
- **Why partner:** Only tool built WITH Indigenous communities. Offline-first is critical for remote territories. GPS boundaries + biodiversity observations + rights documentation = provenance source for Ecospatial. Pipeline: CoMapeo field data → IPFS/Filecoin → Ecospatial registry. Connect via RADS Filecoin grant.
- **Gap they fill:** Community-verified, Indigenous-co-designed ground truth that no other platform has.

### explorer.land (OpenForests)
- **URL:** explorer.land
- **What:** Map-based storytelling for nature-based projects — satellite/drone imagery, SDG tagging, funding discovery
- **Users:** Conservation NGOs, restoration managers, carbon project developers, impact funders
- **Pricing:** Freemium. Free (1 project). Starter €49/mo. Professional €99/mo. Enterprise custom (API).
- **Tech:** SaaS, ArcGIS basemaps, mobile story-mapping app. Proprietary.
- **Why partner:** Clearest partnership or acquisition target. Same mission, complementary stack — they have projects + storytelling, we have capital coordination + provenance. Ingest via Enterprise API.
- **Gap they fill:** Rich visual storytelling for donor communication that Ecospatial lacks.

### Conservation Metrics
- **URL:** conservationmetrics.com
- **What:** Biodiversity monitoring consultancy — passive acoustic monitoring, camera traps, ML species identification. Indigenous co-creation model.
- **Users:** Conservation NGOs, Indigenous communities, governments, protected area managers
- **Scale:** 24 countries, 72 partners, 6,944 survey locations, 14.9M+ ha monitored
- **Pricing:** Project-based consultancy (not SaaS)
- **Why partner:** Strongest biodiversity MRV data source. Species richness indices + acoustic signatures + habitat health scores substantiate EII scores in Regen Atlas. Would give Ecospatial the strongest biodiversity MRV layer in Web3.

### Land Portal
- **URL:** landportal.org
- **What:** Global open-data knowledge broker for land governance — aggregating datasets, research, expert networks. Focus: tenure security, community land delimitation, Global South.
- **Users:** Land governance practitioners, NGOs, FAO, USAID, ILC, GIZ
- **Pricing:** Free and open. ANBI public benefit org (Netherlands). Donor-funded.
- **Tech:** Drupal CMS, semantic web / linked open data (SPARQL), GIS. Self-hosted.
- **Why partner:** Community land boundary datasets (Africa, Latin America) anchor bioregional vaults in legally-recognized territories. Linked open data pull legitimizes spatial layer with institutional provenance.

### Oncra
- **URL:** oncra.org
- **What:** Open carbon removal accounting framework — 4 CDR pathways (land, rock, ocean, construction). EU CRCF aligned. Launched at COP27.
- **Users:** Farmers, foresters, biochar producers, corporates, EU compliance. Backed by ASN Bank, Province of Gelderland.
- **Pricing:** Free to register. Nonprofit (Climate Cleanup Foundation, Amsterdam).
- **Why partner:** Only framework designed for EU CRCF compliance. Land + Ocean carbon credits → ingest as Ecospatial asset type. Ecospatial adds on-chain provenance that their centralized registry lacks. Strategic for European bioregional vaults.

### LandScale
- **URL:** landscale.org
- **What:** Landscape-level sustainability assessment aligned to CDP/SBTN. Multi-stakeholder governance + corporate matchmaking.
- **Users:** Landscape initiatives, agri-food companies, IFC, investors, DFIs
- **Pricing:** Free (grant-subsidized). Conservation International, ISEAL, IFC.
- **Why partner:** LandScale maturity assessment = credibility signal in Ecospatial registry. Offer on-chain provenance + monetization that LandScale lacks.

### Open Future Coalition / Open Impact
- **URL:** openfuturecoalition.org
- **What:** Coordination platform for grassroots place-based organizations. 300 orgs across 60 countries. Beta.
- **Users:** Community-rooted orgs in food systems, restoration, wellness, built environment
- **Why partner:** 300 grassroots organizations in 60 countries = asset origination layer. Regional Resilience Fellows → first cohort of Ecospatial Bioregional Stewards.

### AlVelAl (Territorio AlVelAl on explorer.land)
- **URL:** alvelal.net + explorer.land/x/project/territorio_alvelal
- **What:** 1M ha regenerative territory in southeast Spain. 4 Returns framework (Commonland). Ecoregenerative Certification. 10+ years track record. Roger Kaufman 2026 Award.
- **Why partner:** Ideal pilot territory for European bioregional vault. Register restoration sites as verified assets, create Altiplano Estepario Bioregional Vault, route EU nature finance through it.

---

## Tier 3: General Tools (Not Direct Competitors)

### QGIS
- Open-source desktop GIS. Processing backbone. Offer GeoPackage/WFS exports for technical users. QGIS users at conservation orgs = acquisition channel.

### Google Earth / Google MyMaps
- Universal imagery + zero-friction mapping. Baseline layer, not coordination platform. "Import your MyMaps KML into Ecospatial" = conversion path.

### ArcGIS Earth (Esri)
- Enterprise GIS ecosystem. Consume ArcGIS Feature Server layers. Target institutional users who need capital coordination Esri doesn't provide.

### Kumu
- Relationship/systems mapping (abstract graphs, not geospatial). Export stakeholder network data in Kumu-compatible JSON as visualization complement.

### Terraso
- Open-source field data tools (LandPKS Soil ID). LandPKS field data → ground truth for EII integration.

### PamPam City
- Consumer travel map maker. Not a competitor. Not a partner.

### Planetir
- Early-stage regen social graph. Web3 token in development. Monitor but don't prioritize — too early-stage and not spatially grounded.

---

## Positioning Summary

**Ecospatial is the only platform that combines:**
1. Multi-asset-type registry (8 types, 30 subtypes, 500+ assets)
2. Scientific valuation (SCC-EPA, TEEB biome rates)
3. On-chain provenance (Filecoin/Synapse)
4. Bioregional aggregation (EII integration via Landbanking)
5. DeFi capital coordination (bioregional vaults with yield)
6. AI agent spectacle layer (A2A protocol)

**Priority integrations (ordered):**
1. Landler EII API (already planned)
2. Regen Network credit ingestion (Cosmos IBC)
3. Hylo community partnership
4. CoMapeo field data pipeline (via RADS/Filecoin grant)
5. explorer.land project ingestion (API)
6. Oncra EU carbon credits
7. Felt MCP for agent-driven mapping

**Flagship pilot:** AlVelAl (1M ha, 10yr track record, European, institutional credibility)

---

*Last updated: 2026-05-11. Source: Tijn Tjoelker LinkedIn thread + agent swarm research.*
