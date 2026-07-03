# 11 — Glow as a swarm primitive: what we know, what we need, what it maps to

Research only — nothing here is built, and (scope decision below) none of it belongs in the
Sentient demo. Facts verified 2026-07-03 via direct fetch of glow.org blog/app, the
glow-contracts README, npm registry, and CoinGecko — not training-data recall. Items marked
UNVERIFIED are exactly that.

## Why Glow, structurally

Glow is a fully-onchain instance of Aqueduct's own loop — aggregate → verify → price →
publish → fill → settle — applied to distributed solar instead of coffee. Every Aqueduct
primitive has a direct Glow counterpart, and unlike the coffee spine (real reads + prepared
testnet settle), Glow's settlement legs are live on Ethereum mainnet today:

| Aqueduct primitive | Glow counterpart | Status |
|---|---|---|
| Lot (`schema/canonicalLot.mjs`) | Solar farm: coords, wattage, weekly carbon, install date via `glow.org/api/audits`; weekly per-farm output/payment via public R2 archives | LIVE read — connector already exists: `atlas/src/modules/intelligence/sources/glow.ts` |
| Certifier (`connectors/certifiers.mjs`, TIC axis) | GCA (Glow Certification Agent, ≤5, elected/slashable) + GVE field audits: drone site visits, monitoring box w/ Short ID, Declaration of Intent (lat/long, installer, signed) | Real process, partially readable (gca-backend is open source, Go) |
| Standards resolver (`sim/standardsRegistry.mjs`) | A `GLOW-GCA` source resolving farm → audit record | TO-BUILD, straightforward |
| Oracle two-register (`sim/oracle.mjs` ICE C + differential) | GCC price: Carbon Credit Auction (declining-price, 1-week half-life) and USDG/GCC UniV2 pool — both readable onchain; GLW via UniV2/defined.fi (CoinGecko `glow-2` is preview-only) | LIVE, onchain, no proxy needed |
| Finance intent (`sim/financeIntent.mjs`, finance-this-planting) | GLW/sGCTL delegation to a farm's protocol deposit (Tuesday windows, 100-week competition, deposit recovery + emissions share) | Real mechanism, app-mediated (blocker below) |
| Tokenizer-solver output (`sim/tokenizerRoster.mjs` — structured receivable) | A "Miner": fractional claim on a specific farm's GLW reward stream, USDC-priced, ~100-week payout. Real quoted terms exist (live listing 2026-07: $399 USDC → est. 43.6 GLW/wk × 89 wks) — CONFIRMED-grade, unlike the four `estimate` archetypes | Real instrument; onchain representation UNVERIFIED |
| Settlement rail | USDG (guarded USDC wrapper, 1:1 redeemable) | LIVE, mainnet, allow-list-gated |
| Tick / cadence | Protocol week: GCA report buckets, 1 wk submit + 1 wk finalize, Veto Council can delay 90 days; farm launches every Tuesday | Known, maps onto the seeded economy's deterministic tick |
| Registry duplicate check | Content-addressed farm IDs (hexlified pubkeys) already in the R2 data | Same discipline as lot IDs |

## What we already hold (no one to ask)

- **Read surface, working code:** `atlas/src/modules/intelligence/sources/glow.ts` fetches
  the public, CORS-enabled R2 weekly archives (per-farm `carbonCreditsProduced`,
  `powerOutput`, `weeklyPayment`, `rollingImpactPoints`, week ≥18) and `glow.org/api/audits`
  (coords, panel count, wattage, weekly carbon). Snapshot-with-timestamp compatible.
- **Contracts + typed SDK:** V1 "Guarded Launch" contracts are open (Apache-2.0,
  github.com/glowlabs-org/glow-contracts) with published mainnet addresses; npm
  `@glowlabs-org/utils` (v0.2.182, actively maintained 2026-07) ships typechain types +
  addresses. Key ones: GLW `0xf4fbC617…`, GCC `0x21C46173…`, USDG `0xe010ec50…`,
  MinerPoolAndGCA `0x6Fa8C7a8…`, CarbonCreditAuction `0x85fbB04D…`, ImpactCatalyst
  `0x552Fbb4E…`.
- **V1 write surface an agent wallet can call today (mainnet):** buy GLW (EarlyLiquidity
  bonding curve or UniV2), buy GCC (auction, GLW-denominated), commit/"retire" GCC via
  ImpactCatalyst (earns impact power + nominations = sqrt(GCC×USDC)), stake GLW, governance.
  All subject to guarded-launch transfer allow-lists.
- **Token math:** GLW fixed inflation 230k/wk (175k farms / 40k grants / 15k foundation);
  1 GCC = 1 tCO2 claimed; GCTL mint price = sqrt(GLW price) to nearest $0.05, sGCTL steers
  the 175k/wk pro-rata, 1%/wk unstake.
- **No MCP, no agent integration exists anywhere.** Greenfield — first-mover position is open.

## The blocker that defines the integration

**Everything yield-bearing is V2 (Oct 2025) and app-mediated with unpublished contract
addresses.** Delegation, Miner purchases, GCTL mint/stake, referrals all route through
app.glow.org / hub.glow.org; the glow-contracts README still documents V1 only, and part of
V2 reward math appears to be computed offchain per a Rust spec (PhaseIRewardsSimulator repo).
Worse for stability: the README states all contracts will be **redeployed post-Guarded-Launch
with fresh addresses and airdrops**. So the honest architecture today is: LIVE reads + V1
onchain writes; V2 actions are either (a) reverse-engineered through
`@glowlabs-org/crm-bindings` (npm — the typed client for the app's Elysia backend; the
strongest lead) or (b) SIM-labeled until Glow publishes addresses/API.

## What we still need to know

**Testable ourselves (hours, no permission needed):**
1. Do the R2 archives still update at the current protocol week, and is the schema stable?
2. Guarded-launch allow-lists in practice: can an arbitrary fresh wallet acquire and hold
   GLW/GCC, or only transact via the approved pools? (Read the GuardedLaunch token code +
   one dry-run staticcall.)
3. Is the USDG/GCC pool liquid enough to be a price register? Derive pool addresses via the
   UniV2 factory; compare against auction price.
4. Does `crm-bindings` expose delegation/miner/referral endpoints, and what auth does the
   Elysia backend demand? (Read the published package — the backend repo is private.)
5. Is the glow-subgraph hosted endpoint alive (repo stale since 2024-09), or do we index
   ourselves?

**Ask Glow directly (this is the reply to their KOL thread):**
6. V2 contract addresses / API docs — is delegation an onchain call an agent wallet can
   make, or an app-DB entry? Is a Miner position onchain (transferable? valuable?) or a row?
7. Referral attribution: programmatic API? Can an agent hold a referral code and have
   miner-sale/delegation attribution tracked without a human clicking a dashboard? (Their
   Impact Points layer is offchain; points→Miner redemption exists; token payouts
   undocumented.)
8. Post-Guard redeploy timeline — any integration built now must treat addresses as
   provisional (`@glowlabs-org/utils` abstracts this; pin to it, never hardcode).
9. The formal carbon-accounting methodology document (1 GCC = 1 tCO2 *displaced relative to
   electricity revenue* — the competitive-displacement framing needs its methodology cited
   before Aqueduct renders it next to Toucan/Regen credits with a straight face).
10. MCP / agent-surface roadmap. Nothing exists; if they won't build it, the crm-bindings
    package + open contracts mean we could — which is a different conversation than "add us
    as a KOL."

**Our decisions, not Glow's:**
11. Where an agent's earnings live: referral points are app-scoped; delegation/miner yields
    are wallet-scoped and mainnet-real. Real keys and real money → Pat's boundary, always
    (FABLE-KICKOFF working rule 5). There is no Glow testnet (none found — UNVERIFIED as
    absence); the Base Sepolia settle discipline has no analog here.
12. Determinism: the seeded economy bans Date.now/Math.random in sim files; Glow weekly data
    enters as dated snapshots (the EthicHub pattern), never live polls inside the sim tick.

## Scope decision

**Not in the Sentient demo.** The north star is smallholder *commodity lots*; the demo's
credibility rests on one coherent corridor, and FABLE-KICKOFF's "never a capability shown
live that isn't" + doc 10's Robinhood-Chain precedent (no named-partner archetypes without
reality) both apply. Glow integration is a **Regen Atlas / Ecofrontiers track** — where a
Glow ingestion module already ships — and a post-submission Aqueduct candidate at most.

When/if built, the slots are: connector (exists) → standards resolver (`GLOW-GCA`) → oracle
register (GCC two-register) → venue node (REAL-read labeled, farm coords are real) →
`finance-this-farm` intent (SIM fill until #6 resolves) → Miner as the first
CONFIRMED-confidence tokenizer profile (real quoted terms, unlike the four estimates).

The swarm-coordination bar — agents that observe, price, act, earn, settle against Glow —
is met today on observe/price, met on act only for V1 primitives, and blocked on earn/act-V2
pending questions #6–7. That's the honest state.
