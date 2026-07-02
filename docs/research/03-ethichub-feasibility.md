# EthicHub Feasibility — Public Surface Map (2026-07-02)

**Question:** Can a scout agent render a credible "Chiapas coffee lot" card from REAL EthicHub data?

## VERDICT: YES

EthicHub's public surface yields **true lot-level Chiapas coffee data today** — producer name, locality, variety, process, altitude, SCA score, harvest season, sensory profile, and EUR/kg price — plus a live community-level lending API (688 historical projects, Chiapas community names) and readable Celo contracts with real USDC borrow/repay figures. Every claim below was verified by an actual fetch in this session (2026-07-02).

**Important context:** EthicHub pivoted. `ethichub.com/en` now 301s to `/en/coffee` — the headline product is a **green coffee marketplace** (an Odoo storefront at `greencoffee.ethichub.com`). The crowdlending platform lives on at `app.ethichub.com` (Nuxt SPA + JSON API). The lot data is on the shop; the loan/credential data is on the app API + onchain.

---

## 1. Surfaces table

| # | Surface | URL | Type | Status (verified) | Freshness |
|---|---------|-----|------|-------------------|-----------|
| 1 | **Green coffee shop (LOT DATA)** | `https://greencoffee.ethichub.com/en/shop` | Odoo e-commerce, server-rendered HTML | ✅ LIVE — 22 lots, 6 from Chiapas | Current inventory; "Harvest Season 2025" on lots |
| 2 | **Lot detail pages** | `…/en/shop/<slug>-<id>` | HTML (rich structured fields) | ✅ LIVE | Same |
| 3 | **Lending platform API** | `https://app.ethichub.com/api/v1/projects[?page=N]` | Public JSON, no auth | ✅ LIVE — 688 projects, paginated 9/page | Latest projects are 2024 export loans (platform in transition to coffee trade) |
| 4 | **Ponder indexer proxy** | `https://app.ethichub.com/api/v1/ponder/bonds/minimice`, `…/ponder/pools/staking` | Public JSON, no auth | ✅ LIVE — bond products w/ contract addrs, APR, currency | Live (drives the investing UI) |
| 5 | **Onchain — Celo** | CreditLine `0xDb5D3aBF19014308A67420344021CEEE6003ACdd` (+ 14 named originator nodes, staking, reserve) | eth_call via `https://forno.celo.org` | ✅ READ CONFIRMED — totalSupply=4, full structs decoded | Real-time |
| 6 | **Onchain — Ethereum mainnet** | ETHIX `0xFd09911130e6930Bf87F2B0554c44F400bD80D3e`, Minimice bond `0x21320683556BB718c8909080489F598120C554D9`, 4 originator nodes | eth_call | Addresses from DefiLlama adapter (maintained; adapter runs daily) | Real-time |
| 7 | **DefiLlama API** | `https://api.llama.fi/tvl/ethichub`, `…/protocol/ethichub` | Public JSON | ✅ LIVE — TVL $5,046.96; last datapoint dated **today** (1782988811) | Daily |
| 8 | **Farmer/originator pages** | `https://www.ethichub.com/en/farmers/<slug>` (16 slugs) | HTML | ✅ LIVE — org story, country, region | Static-ish marketing |
| 9 | **Docs (GitBook)** | `https://docs.ethichub.com` → `ethichub.gitbook.io/ethichub` (+ `llms.txt`, `.md` per page, `?ask=` query API) | Markdown/JSON, agent-friendly | ✅ LIVE — updated ~2 months ago | Model docs, not lot data |
| 10 | **Catalog PDF** | `https://www.ethichub.com/catalogo.pdf` | PDF (annual green-coffee catalog) | Linked from live site (not fetched) | Annual |
| 11 | ~~docs-ethix.ethichub.com~~ | — | — | ❌ DEAD — no DNS record | — |
| 12 | ~~api.ethichub.com~~ | — | — | ❌ DEAD — no DNS record | — |
| 13 | GitHub `github.com/Ethichub` | 49 repos | — | ⚠️ All forks (DePay, Odoo, DefiLlama, Ponder, celo-mondo) — **no first-party source/API client published**; forks reveal their stack (Odoo shop, Ponder indexer, Celo) | — |

---

## 2. Fields available, with real retrieved samples

### 2a. Lot level (shop) — the anchor-lot surface

Shop index (`/en/shop`) lists every lot as `Producer / Region (Country) – Variety Process – SCA` + price. **Six Chiapas lots retrieved today:**

```
Gabino Pérez Pérez / Chiapas (Mexico) – Soft Washed Bourbon & Caturra – 84.5 SCA — €15.50/kg
Juventino Matías Ortiz / Chiapas (Mexico) – Bourbon Washed – 85.5 SCA — €15.00/kg
La Tribu (El Triunfo Reserve) / Chiapas (Mexico) – Blend Washed – 84 SCA — €13.00/kg
Lázaro Morales & Apolonia Pérez / Chiapas (Mexico) – Bourbon Washed – 86 SCA — €16.00/kg
Neri Ortíz Pérez / Chiapas (Mexico) – Bourbon Honey – 86 SCA — €17.00/kg
Neri Ortíz Pérez / Chiapas (Mexico) – Bourbon Natural – 86.5 SCA — €17.00/kg
Volcán Tacaná / Chiapas (Mexico) – Regional Blend Soft Washed – 84 SCA — €12.00/kg
```

Lot detail page (retrieved: `…/shop/neri-ortiz-perez-chiapas-mexico-bourbon-honey-86-sca-79`) — full field set:

| Field | Sample value (real) |
|-------|---------------------|
| Producer | Neri Ortíz Pérez |
| Origin (locality) | **Soconusco, Chiapas (Mexico)** — producer based in San José Ixtepec |
| Variety | Bourbon |
| Altitude | 1,700–2,000 m.a.s.l. |
| Process | Honey |
| Drying | Natural, sun and wind |
| Farming | Sustainable, shaded by trees |
| Harvest season | 2025 |
| Sensory profile | Aroma: cane sugar, chocolate · Taste: peach, grape · Body: medium · Acidity: honeyed |
| SCA score | 86 |
| Lot type | Single Producer Lot |
| Format | Brick 5kg |
| Price | €17.00/kg (incl. VAT) |
| Producer story / impact | Full paragraph (migration pressure, regenerative model, jobs/training) |
| Image | `https://greencoffee.ethichub.com/web/image/product.template/79/image_1920` |

This exceeds the demo's buyer-criteria fields ("Chiapas, SCA 84+"): SCA, region, and price are all first-class.

### 2b. Community/loan level (lending API)

`GET https://app.ethichub.com/api/v1/projects` — no auth, JSON (retrieved):

```json
{"projects":[
  {"id":704,"communityName":"San José Ixtepec (México)","status":5,
   "objective":"Shall we take the next step with San José Ixtepec? Let's export! (2024) (Part II)"},
  {"id":703,"communityName":"Chespal (México)","status":5, "objective":"…"},
  {"id":702,"communityName":"Agua Caliente (México)","status":5, "objective":"…"}
 ], "nextPage":1, "totalProjects":688}
```

- Fields per item: `id`, `communityName`, `status` (all current = 5), `objective`. **Thin but real** — community names are Chiapas villages (San José Ixtepec, Chespal, Agua Caliente, La Soledad, Salchijí, Pavencul).
- Pagination: `?page=N` (9/page, newest first, 688 total = full loan history back to 2018).
- **No public per-project detail endpoint** (`/api/v1/projects/704` → SPA shell). Loan amounts are NOT in this API; they ARE onchain (2c).
- Other public JSON found in the client bundle: `/api/v1/ponder/bonds/minimice` (retrieved — bond contract `0x0f497a790429685a3CfD43b841865Ee185378ff0`, cUSD `0x765DE…282a`, APR 7–8%, maturity, IPFS image CIDs), `/api/v1/ponder/pools/staking`. Auth-gated: user, KYC, Stripe routes.
- Cross-link: the lot producer (Neri Ortíz, San José Ixtepec) appears in BOTH the shop (lot 79) and the loan history (projects 704, 698 "San José Ixtepec exports to Europe") — a real producer→loan→lot join for the credential.

### 2c. Onchain (Celo primary; Ethereum + Gnosis secondary)

From the maintained DefiLlama adapter (`DefiLlama-Adapters/projects/ethichub/index.js`) + verified live this session via `forno.celo.org`:

- **CreditLine (Celo) `0xDb5D3aBF19014308A67420344021CEEE6003ACdd`** — `totalSupply()` = **4** credit lines; `creditLines(uint256)` returns `(auditor, collateralFees, platformFees, auditorFees, totalRepaid, totalBorrowed, totalFees, credits[], principalToken)`. Decoded today (principalToken = native USDC on Celo `0xcebA9300f2b948710d2653dD7B07f33A8B32118C`, 18-dec internal accounting):
  - Line 0: borrowed 106,000 / repaid 0
  - Line 1: borrowed 736,000 / repaid 0 (9 credit tranches)
  - Line 2: borrowed 192,600 / **repaid 212,369.79** (principal + interest — a completed, repaid line)
  - Line 3: borrowed 170,200 / repaid 0
- **14 named originator nodes on Celo** (staking targets, names/countries in adapter comments): CAFE_FUNDADORES (MX), CERES (MX), **CoRi (MX — the Chiapas originator)**, COSTAL_CAMPESINO 1+2 (CO), FABEDI (CO), PRODUCTOS_AGROALIMENTARIOS (MX), RESERVA_1920 (MX), SIERRA_AZUL 1+2 (MX), UM_COFFEE (BR), ANEPAAN (MX), CAFE_SUSTENTABLE (MX), SAN_MARCOS (HN). Ethereum has 4 more (UM_COFFEE BR, DICAFE HN, NORTFRUIT PE, CAFE_SUSTENTABLE MX).
- **ETHIX token**: Ethereum `0xFd09…0D3e`, Celo (in DefiLlama coreAssets), Gnosis. Staking: `0x5b2b…CC2D` (ETH), `0xCb16…3C6B` (Celo). Liquidity reserve (Celo) `0x8510…5B62`.
- App runtime config confirms chain: `window.__NUXT__.config.public.blockchain = {id:42220, name:"celo", explorer:"https://celoscan.io", rpc:"https://celo-mainnet.g.alchemy…"}`.

### 2d. Originator pages (community context)

`https://www.ethichub.com/en/farmers/cosechando-riqueza` (retrieved): "Cosechando Riqueza (CoRi) is a rural production society… born December 2020… small coffee growers, immersed in the mountains of the **Sierra de Chiapas**… connecting them through EthicHub to more accessible financing…" — 16 originator slugs total (agros, alcala-tradewise, anepaan-odeput, cafe-fundadores, cafe-sustentable, ceres, codicafe, cosechando-riqueza, costal-campesino, fabedi, nortfruit, productos-agroalimentarios, reserva-1920, san-marcos-dregalado, sierra-azul, um-coffee). These slugs map ~1:1 to the onchain originator nodes.

### 2e. Docs (agent-friendly)

GitBook at `docs.ethichub.com` exposes `llms.txt`, per-page `.md`, and a **`?ask=<question>` natural-language query API** (`GET https://ethichub.gitbook.io/ethichub/<page>.md?ask=…`). Headline stat retrieved: ">$5M lent to >10,000 farmers in six countries since 2018." Covers lending pools, crowd collateral, credit lines, ETHIX, impact assessment — good source text for the credential card's methodology footnote.

---

## 3. Connector recipe (build-agent ready)

**Read A — anchor lot (Chiapas coffee), HTML scrape, no auth, no JS needed (server-rendered Odoo):**
1. `GET https://greencoffee.ethichub.com/en/shop` → parse product anchors: `href="/en/shop/<slug>-<id>"` (regex `href="(/en/shop/[a-z0-9-]+-(\d+))"`). Filter `slug.includes('chiapas')` → 6-7 lots.
2. `GET https://greencoffee.ethichub.com/en/shop/<slug>-<id>` → title `<h1>` = `Producer / Region (Country) – Variety Process – SCA`; parse the bolded spec lines (`Origin:`, `Variety:`, `Altitude:`, `Process:`, `Drying:`, `Harvest Season`, `SCA:`) and the spec table rows (`Format`, `Variety`, `Country`, `Process`, `SCA`, `Lot Type`, `Coffee type`). Price is in the product JSON-LD/`itemprop` and the visible `€` node. Image: `https://greencoffee.ethichub.com/web/image/product.template/<id>/image_1920`.
3. Stamp `fetchedAt` + source URL on the card (demo criterion: ledger shows fetch timestamp + source URL).
   - Suggested anchor lot: **id 79, Neri Ortíz Pérez, Soconusco Chiapas, Bourbon Honey, SCA 86, €17/kg** — richest page and joins to lending projects 698/704 (San José Ixtepec).

**Read B — community loan history (credential enrichment), JSON, no auth:**
- `GET https://app.ethichub.com/api/v1/projects?page=N` (9/page, `totalProjects` 688). Match `communityName` containing `San José Ixtepec` → project ids + objectives ("…exports to Europe (2024)").

**Read C — onchain finance (LIVE badge), any EVM lib or `cast`:**
- RPC `https://forno.celo.org`, contract `0xDb5D3aBF19014308A67420344021CEEE6003ACdd`:
  - `totalSupply() → uint256` (selector `0x18160ddd`)
  - `creditLines(uint256) → (address auditor, (uint256,address,uint256) collateralFees, (uint256,address,uint256) platformFees, (uint256,address,uint256) auditorFees, uint256 totalRepaid, uint256 totalBorrowed, uint256 totalFees, uint256[] credits, address principalToken)` — values are 18-dec regardless of token decimals (scale to USDC 6-dec per the DefiLlama adapter).
- Optional cheap freshness/TVL: `GET https://api.llama.fi/tvl/ethichub` (single number, daily).

**Read D — docs quote for methodology:** `GET https://ethichub.gitbook.io/ethichub/en/introduction/ethichub.md` (or `?ask=`).

**Fragility notes:** the shop is Odoo (stable markup, but cookie banner text pollutes naive text-extraction — parse HTML, not rendered text); `app.ethichub.com/api/v1/*` is an undocumented internal API (could change without notice — cache reads, degrade gracefully); `/api/projects` (no `v1`) also returns 200 but serves the SPA shell to JSON clients — use the `v1` path only.

---

## 4. Honest caveats (what the lot card should NOT claim)

- **The shop lot is a trade offer, not a loan-backed lot record.** There is no public field linking shop lot id → lending project id → onchain credit line. The join (Neri Ortíz ↔ San José Ixtepec ↔ CoRi/Chiapas) is by name/place, which is credible for a credential card if labeled "linked by producer/community, not by platform id."
- **Loan amounts per project are not public per-project** — only community name + objective (API) and aggregate credit-line borrow/repay (onchain). Card should show community-level lending history + onchain aggregates, not "this lot was financed by loan #704 of $X."
- Latest lending projects are 2024 vintage (platform transitioning to the coffee-trade model); the SHOP data is the current, fresh surface (Harvest 2025).
- GitHub org has no first-party code; contract addresses come from the community-maintained (by EthicHub themselves — they hold the fork) DefiLlama adapter, verified live here.
- The old docs subdomain (`docs-ethix`) and `api.ethichub.com` are dead — do not cite them.

**Bottom line:** the demo's anchor requirement is satisfiable as specced — a scout agent can render a real Chiapas coffee lot card with producer, locality, variety, process, altitude, SCA, harvest season, sensory profile, price, and image from surface #1/#2, enriched with community loan history (#3) and a live onchain read (#5), each element stamped with fetch time + source URL.
