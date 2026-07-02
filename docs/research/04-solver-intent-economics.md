# 04 — Solver & Intent-Network Economics: Grounding the Aqueduct Swarm

> Research for the Aqueduct demo's solver economy (`docs/DEMO-SPEC.md §3`, swarm cast items 4–6).
> Question: how do intent/solver networks actually work economically, what maps to physical
> commodities, and what parameters make the demo's SIM solvers credible rather than decorative.
> Sources: local corpus first (SlabClaw Routes research + `~/Desktop/2_resources/`), then web.
> Compiled 2026-07-02.

---

## 1. How existing solver networks actually work

### 1.1 CoW Protocol — permissioned batch auctions, bonded solvers

- **Who runs solvers:** professional trading/infra teams. Entry is *permissioned via bonding
  pools*: a full pool posts **$500k in stables + 1.5M COW** as slashable collateral; as of
  CIP-44 (May 2024) there were **20 active solvers covered by only 2 bonding pools** (Gnosis
  DAO vouching for 6, CoW DAO for 14) — i.e. the DAO itself underwrites most of the solver
  set. CIP-44 introduced reduced-bond setups to lower the barrier.
  [forum.cow.fi/t/cip-44-reduced-bonding-requirements/2424]
- **How they profit:** second-price-auction rewards paid weekly in COW (protocol currently
  *subsidizing* the competition on every chain it operates on) + surplus/slippage capture +
  arbitrage + private order flow. [docs.cow.fi/cow-protocol/reference/core/auctions/rewards]
- **Concentration (Jan–Apr 2025, on-chain data):** of **28 active solvers, only 12 handled
  >1% of volume; the top 3 account for >50% of all volume; one solver captured ~50% of all
  rewards.** Production-solver operating cost estimated **$13k–26k/month** before penalties,
  slashing, or capital lock-up. Conclusion of the study: *"Winner-takes-all dynamics… most
  professional solvers aren't profitable"* — solving is largely a reputation game funded by
  adjacent revenue (arbitrage/MEV, solver infra, privatized order flow via swap APIs).
  [Sprinter, "Building Economic Trust in Solver-Based Networks – Part 2", blog.sprinter.tech, 2025-07-10]
- **Four observed solver archetypes** (same source): *Noisy* (sporadic, rarely win), *Optimizers*
  (public-liquidity routing, aggressive pricing, higher settlement failure), *Multi-strategy*
  (near break-even, survival through efficiency), *Vertically integrated* (deep capital, private
  inventory, CEX access — win selectively on high-value intents). "The biggest centralizing
  forces are capital requirements and access to non-public liquidity — far more than logic or
  latency."

### 1.2 Across — permissionless relayers, protocol-run backstop

- **Structure:** permissionless entry, low bond barrier → many participants, long unviable tail.
  **$4.6B volume in Jan–Apr 2025; 78 total solvers, only 10 processed ≥1% of volume; only
  5–10 profitable** under the study's cost assumptions.
- **The load-bearing fact for cold-start design:** *"Nessus", the solver operated by the Across
  team itself, covers the largest share (~half) of bridge volume — and it "does not really take
  part in competition: it waits for other solvers to fill and only steps in as a last resort."*
  The protocol's own backstop filler is what keeps fill-rate at ~100% while the external solver
  set stays thin.
- **Inventory is the edge:** the top *external* solver ("Lichas") held **>$3.7M inventory vs
  <$600k for most peers** — scale cuts rebalancing cost and lets it fill more/larger orders.
  Some solvers pay **up to 25% of potential revenue in priority-fee tips**. Failed-fill costs
  and rebalancing costs are material and usually unmodeled.
  [Sprinter Part 2, ibid.]

### 1.3 UniswapX — Dutch auctions, RFQ-seeded fillers

- Fillers (MEV searchers, market makers) compete to fill signed off-chain orders; the Dutch
  auction's *starting price* is seeded by an off-chain RFQ round, and the RFQ winner gets a
  brief exclusivity window before the price decays open to all fillers.
  [developers.uniswap.org/docs/liquidity/uniswapx/overview; anoma.net/blog/uniswapx]
- At launch Uniswap explicitly pre-arranged the market: *"The earliest fillers are standing by
  to ensure appropriate auction starting prices and quick order execution."* — i.e. a
  whitelisted seed cohort, not spontaneous emergence. [blog.uniswap.org/uniswapx-protocol]

### 1.4 What buyers actually gain (measured price improvement)

Empirical study of CoWSwap / 1inchFusion / UniswapX vs vanilla Uniswap V2/V3 routing
[arXiv:2503.00738, "Execution Welfare Across Solver-based DEXes"]:

- Improvement is real but **size- and asset-dependent**: on USDC-WETH, large trades (>100 ETH)
  gain; CoWSwap consistently **>20 bps** on large trades, some reaching **~150 bps vs V2**
  (and >500 bps on small long-tail trades vs V3). UniswapX hovers **0–10 bps vs V3**.
- On liquid pairs at small size, solver venues ≈ AMM — the auction's value concentrates where
  routing is hard (large size, thin liquidity). CoW's own marketing figure: users save **~0.5%**
  vs traditional execution. [decentralised.co/p/on-solver-economics]
- Directional market share (Oct 2024): intents ≈ **20% of DEX volume, ~45% of bridge volume**.
  [decentralised.co, ibid.]

### 1.5 ERC-7683 / Open Intents Framework — the standardization layer

- ERC-7683 defines a **solver-facing order format** (opaque order payload + resolver) so one
  solver network can serve many intent protocols; explicitly "designed to optimize for solver
  UX, lower barriers to entry to a universal solver network."
  [eips.ethereum.org/EIPS/eip-7683; archetype.fund/media/erc7683-the-cross-chain-intents-standard]
- OIF launched Feb 2025 by Ethereum Foundation + Hyperlane + Bootnode; **LI.FI Intents runs
  the OIF reference contracts in production** with a competitive solver set; Nethermind used it
  to connect Starknet. [hyperlane.xyz/post/the-open-intents-framework…; docs.li.fi/lifi-intents;
  nethermind.io/blog/open-intent-framework-for-starknet]
- **Aqueduct already holds a working fork of this stack:** the SlabClaw/Routes build vendored
  the BootNodeDev OIF solver (Apache-2.0, Hyperlane stripped) and shipped a deployed
  `IntentRegistry` (publish → escrow-pull → submitFill → verifyFill → settle) plus an ERC-7683
  adapter with a **named `"slabclaw.physical-verification"` assumption** and single-chain
  origin==dest settlement.
  [/Users/pat/Desktop/1_projects/slabclaw/slabclaw-routes/research/hermes-extraction-for-routes.md §4, §9]
  The one real fund-loss bug found there is a standing lesson: the naive registry **paid any
  `msg.sender` on fill** — solver authorization (signature check + solver registry + replay
  nonce) is not optional. [ibid. §4]

### 1.6 What makes a solver network liquid vs dead

Synthesis of the above:

1. **A first-party backstop filler** (Across "Nessus" pattern) — fill-rate stays ~100% while
   external solvers remain optional. Networks without one show visible unfilled intents and die
   of user distrust before solver economics can mature.
2. **Subsidized rewards during bootstrap** (CoW's weekly COW subsidy on every chain).
3. **Real spread for solvers to eat** — solver profit needs `user_ceiling − true_landed_cost −
   auction_competition > operating_cost + capital_cost + failure_cost`. Where incumbent spread
   is thin (liquid pairs), only vertically-integrated players survive.
4. **Low enough entry cost for a long tail** (Across) *or* underwritten bonds (CoW DAO bonding
   pool) — but expect a power-law either way.
5. **Inventory/capital access** decides winners more than algorithm quality.

---

## 2. Prior art: intents for physical goods / RWAs — and what broke

**There is no production intent/solver network for physical goods.** Every live ERC-7683/OIF
deployment settles fungible tokens; the standard's core assumption is that the solver can front
the *destination asset itself* within seconds-to-minutes. Physical goods break that in four
specific places:

1. **Settlement latency: T+1 becomes T+7…T+90.** CyberFund's resource-lock model assumes the
   solver's capital-at-risk window is seconds; for physical assets the same lock must hold for
   days–weeks, which changes the trust requirement in kind, not degree.
   [~/Desktop/2_resources/Crypto/cyber•Fund _ Supercharging Intents_ Resource Locks.pdf;
   /Users/pat/Desktop/1_projects/slabclaw/slabclaw-routes/resource-locks-and-routes.md §7:
   "In crypto: solver fronts capital for seconds/minutes. In cards: days/weeks."]
2. **The delivery oracle is imperfect.** "'FedEx says delivered' ≠ 'authentic and undamaged'" —
   physical fills need a verification layer (multi-party attestation: solver proof + custody
   confirmation + oracle cert validation) and a dispute path, which pure-token intents don't.
   [resource-locks-and-routes.md §7, Option A cons + Option C 3-of-3 design]
3. **No atomicity → per-hop settlement.** A physical route is a multi-hop graph
   (seller → solver → customs → grader/certifier → custody); the honest design settles and
   compensates *per hop*, so partial completion isn't a total loss for the solver.
   [resource-locks-and-routes.md §5 "Each hop's lock is released independently"]
4. **Assets can be chain/custodian-bound islands.** In the card market, tokenized vault NFTs
   cannot move cross-custodian at all (redeem burns the token); only the settlement currency
   (USDC via CCTP) crosses chains — "cross-custodian movement" is a physical, weeks-long leg.
   Commodity analog: warehouse receipts / certs tied to a specific silo, co-op, or exporter
   platform. [hermes-extraction-for-routes.md §6.1]

**Closest attempts and their failure modes:**

- **4K Protocol (2021)** — NFT marketplace for blockchain-owned *physical* goods with a
  guardian/custody model [coindesk.com, 2021-09-29]. Per the SlabClaw physical-goods analysis:
  4K/RealWorld **validated the guardian/solver-fee model but died on liquidity** — the
  mechanism worked, the two-sided market never got dense enough.
  [hermes-extraction-for-routes.md §8, citing hermes-hackathon/PHYSICAL-GOODS-ECONOMICS.md]
- **Sole-market-maker incumbents** — every physical-collectibles platform (Courtyard "0%
  seller," Beezie, Collector Crypt, Phygitals) is a *single* market maker taxing a hidden
  **10–15% buyback spread** dressed as zero fees. Nobody runs competed sourcing. This is the
  exact spread a multi-solver auction exists to compress — and the same structure exists in
  commodity origination (exporter/coyote margin at farmgate). [ibid. §8]
- **SlabClaw Routes / Acquisition Desk (2026)** — the closest *running* system: ERC-7683
  registry + ERC-4626/7540 vault + resource locks + a real MarketplaceAdapter engine
  (535 tests) that computes **landed cost per venue** and executed a real $5 physical buy
  end-to-end. Its route-cost oracle models per-venue *policies*, not just fees: economics +
  chain + custody + cross-custodian movability + execution autonomy + provenance tags
  (CONFIRMED/REPORTED/ESTIMATE).
  [/Users/pat/Desktop/1_projects/slabclaw/slabclaw-routes/CLAUDE.md;
  routes-thinking-2026-07.md §1, §6]
- **Agentic commerce rails (2025–26)** — Stripe's x402-based USDC Payment Intents, agent
  checkout protocols, OKX/McKinsey "transaction intents" for physical purchases — these are
  *payment* intents (one merchant, no competing fillers), not solver markets. They matter to
  Aqueduct as settlement rails, not as prior art for the auction.
  [khala.io x402 piece; mckinsey.com agentic-commerce]

**The open question 4K never answered and Aqueduct's sim must at least dramatize honestly:**
where does the *first* liquidity come from (see §3), and the Routes strategy doc's own answer
is instructive — *"Is the near-term version a single first-party solver (us) that proves the
spread compression, with the auction as the scaling story?"*
[routes-thinking-2026-07.md §5]

---

## 3. The cold-start problem — how real networks bootstrapped

| Network | Bootstrap mechanism | Evidence |
|---|---|---|
| CoW | Protocol ran its own solvers (Gnosis Protocol lineage); DAO bonding pool **underwrites 14 of 20 solvers' bonds**; weekly COW reward subsidy still running | CIP-7/CIP-44 forum; docs.cow.fi rewards |
| Across | **Team-run relayer "Nessus" as solver of last resort** — still ~half of all volume in 2025, stepping in only when nobody else fills | Sprinter Part 2 |
| UniswapX | **Whitelisted "earliest fillers standing by"** at launch + RFQ-winner exclusivity window to guarantee quotes | blog.uniswap.org/uniswapx-protocol |
| OIF/LI.FI | Reference solver shipped open-source with the framework so any team can fork a working filler | docs.li.fi; BootNodeDev/intents-framework |

**Pattern:** nobody cold-started permissionlessly. The sequence is always
**(1) first-party solver guarantees fills → (2) subsidized/underwritten early external solvers →
(3) progressive permissionlessness**, with the first-party filler *retreating to backstop* rather
than disappearing.

**Implication for a commodity intent network:** Aqueduct's realistic launch topology is one
first-party solver (the platform itself, running the Routes-style landed-cost engine) + a
backstop role, with the *demo's* multi-solver race being an honest preview of stage 3. The sim
should therefore include a visibly distinct "Aqueduct backstop" solver that only wins when
others decline — that is what the real network will look like for its first year, and showing it
is more credible than pretending five independent solvers exist on day one.

---

## 4. Agent-swarm precedents (payments, identity, reputation)

- **x402 is real and growing:** on Base, **3.1M transactions and $1.2M transferred in 30 days**
  (as of 2026-05-29), sellers +23%, buyers +37% m/m; Cloudflare and Amazon Bedrock AgentCore
  support it. [~/Desktop/2_resources/Crypto/lifi-intents-open-intents-framework.pdf — Base
  "The Agentic Economy Is Here" article capture]. Note the honest scale: ~$0.39 average per
  transaction — micropayments for data/inference, not commodity settlement. The proven local
  instance: Apify's 20k scrapers behind x402, live-verified at **$0.004 per scrape** from the
  same wallet that buys cards.
  [/Users/pat/Desktop/1_projects/slabclaw/slabclaw-routes/research/apify-x402-agentic-data-rail.md §3]
  x402's `upto` scheme (authorize a ceiling, settle actual usage) is structurally a resource
  lock — the same primitive the physical settlement layer needs. [ibid. §2]
- **ERC-8004 (Trustless Agents)** — three registries (Identity ERC-721, Reputation, Validation),
  mainnet since 2026-01-29. The first empirical study [arXiv:2606.26028, data through
  2026-05-13] is sobering: **most registrations are batch-minted placeholders** (only a small
  fraction expose a live service endpoint), ownership is highly concentrated (high Gini),
  **the Reputation Registry "cannot function as a trust signal"** — values incommensurable,
  feedback rarely tied to verifiable interactions, cheap to manipulate, substantial coordinated
  Sybil behavior; the Validation Registry had **no confirmed mainnet deployment** in the study
  window. → DEMO-SPEC §3 item 7 (ERC-8004 registrar as greyed ROADMAP node, never a live actor)
  is exactly right; do not wire sim reputation to 8004 semantics and imply it works today.
- **Multi-agent market framing:** DeepMind's "Virtual Agent Economies" proposes the sandbox-
  economy lens (emergent vs intentional origins × permeable vs impermeable boundaries) and
  argues for **auction mechanisms as the fair-allocation primitive** in agent markets.
  Aqueduct's demo is an *intentional, labeled-permeable* sandbox — the SIM badge system is
  literally the permeability boundary made visible.
  [~/Desktop/2_resources/Crypto/Virtual Agent Economies.pdf, abstract + §2]
- **Compositionality warning:** intent solving across domains composes badly — solvers
  optimizing sub-problems don't automatically compose into a global optimum; obstructions
  appear exactly at the seams between markets. For Aqueduct: keep the sim's solver problem
  *one* auction over *one* landed-cost objective; don't simulate meta-solvers.
  [~/Desktop/2_resources/Crypto/Mechanics of intent solving II – Obstructions to
  Compositionality.pdf]

---

## 5. Honest assessment for the demo sim

The sim is credible if it reproduces the *measured shape* of real solver markets — concentration,
thin margins, itemized landed cost, imperfect fills — rather than a cartoon where five equal
solvers all profit. The three failure modes of a decorative sim: (a) uniform win distribution,
(b) bids that are just `price ± random%` with no cost structure, (c) 100% competitive fill rate
with no backstop and no declines.

### Sim-economy parameters

Each parameter traced to a real-network analog. All SIM-labeled per DEMO-SPEC §6.

| Parameter | Value / range for the sim | Real-network analog (source) |
|---|---|---|
| **Visible solver count** | 4–6 named solvers + 1 "Aqueduct backstop" | CoW: 28 registered but 12 relevant; Across: 78 registered, ~10 relevant (Sprinter Pt 2). 4–6 *active* is what a healthy young network looks like |
| **Win concentration** | Top solver wins ~40–50% of intents; top 2–3 win ~75%; ≥1 "noisy" solver bids but never wins | CoW: top 3 solvers >50% volume, one takes ~50% of rewards; Across: Nessus ~50% (Sprinter Pt 2) |
| **Bid dispersion** | Bids cluster within **1–4% of each other** on landed cost; winner beats runner-up by 0.2–1.0% | DeFi solver auctions separate by bps on liquid pairs but 20–150+ bps on hard routes (arXiv:2503.00738); physical routes are "hard routes," so percent-level dispersion is honest |
| **Solver gross fee (winner's margin)** | **1–5% of lot value**, scaling with route complexity; ~2% typical for the Chiapas anchor lot | Founding Routes design: route fee 1–5% + speed premium 1–2% (resource-locks-and-routes.md §6 Solver Economics); worked example: $40k route → 2% fee, ~$480 net after costs |
| **Landed-cost vector (every bid itemizes)** | `[commodity cost, freight, insurance, customs/duties, cert/QA, financing, platform fee]` — each line carries a confidence tag (CONFIRMED/ESTIMATE) | Routes route-cost oracle: cost vector `[shipping, taxes, service_fee, insurance]` + duration/risk, per-venue policy with provenance tags (slabclaw-routes/CLAUDE.md; routes-thinking §6) |
| **Financing cost line** | Capital locked 14–45 days at **10–15% APR** → ~0.4–1.9% of lot value, explicit in each bid | Physical solver capital-lock 7–90 days is the defining cost vs DeFi's seconds (resource-locks-and-routes.md §7); solver inventory advantage decides winners (Across "Lichas" $3.7M vs $600k, Sprinter) |
| **Fill rate** | **70–85% of published intents fill competitively**; 10–20% fill via backstop solver; 5–10% expire unfilled (shown honestly) | Across: external solvers decline unprofitable fills, team backstop takes ~half of volume (Sprinter); SlabClaw found ~45% of stale deals already sold — physical inventory decays (MEMORY: project_scan_cadence_plan) |
| **Auction mechanics** | Dutch decay from `oracle fair price − target spread` toward buyer ceiling, 30–90s window (compressed for tour pacing); winner = first accept, settle at bid (or second-price if showing CoW-style) | UniswapX Dutch + RFQ starting price (developers.uniswap.org; anoma.net); CoW second-price rewards (docs.cow.fi) |
| **Buyer surplus displayed** | Buyer saves **0.5–2% vs best single-venue quote**, and the narration contrasts it with the **10–15% sole-intermediary spread** being compressed | CoW ~0.5% user savings (decentralised.co); 10–15% hidden buyback spread of sole market-makers (PHYSICAL-GOODS-ECONOMICS via hermes-extraction §8) |
| **Solver bond/stake** | Each sim solver shows a posted bond ≈ **1–2× typical lot value**, slashable on failed fill; one scripted slash/reputation-drop event if tour length allows | CoW bonding pool $500k + 1.5M COW, slashable (CIP-44); RoutesResourceLock ±1 reputation on complete/dispute (hermes-extraction §4) |
| **Solver P&L honesty** | At least one solver's ledger shows a *losing* fill (failure/rebalancing cost); margins render as thin (single-digit %) not fat | "Most professional solvers aren't profitable"; priority fees eat up to 25% of revenue; failed-fill costs unmodeled but real (Sprinter Pt 2) |
| **Per-hop settlement** | The winning route settles in 2–4 hops (acquire → export/certify → ship → custody), each hop releasing its lock independently on the map | Per-hop lock release, partial-completion compensation (resource-locks-and-routes.md §5); IntentRegistry publish→fill→verify→settle already deployed (hermes-extraction §4) |
| **Oracle spread input** | Fair price = ICE C-contract quote + Mexican differential (LIVE tier per DEMO-SPEC); solver bids reference it; bid > oracle − spread never wins | DEMO-SPEC §3.3; mirrors oracle-anchored spread detection in the running engine (spread-detector.ts) |

### What NOT to simulate

- **ERC-8004 reputation as a working trust signal** — empirically it isn't (arXiv:2606.26028);
  keep the registrar greyed/ROADMAP as specced.
- **Five independently profitable solvers** — contradicts every measured network; show the
  power law.
- **Meta-solving / solver-of-solvers** — composition obstructions are real (Mechanics of Intent
  Solving II); one auction, one objective.
- **Instant physical settlement** — the settle receipt is onchain-instant (Base Sepolia tx),
  but the physical hops must display duration (days/weeks) or the sim teaches the wrong physics.

---

## Sources

**Local corpus** (cited by path above): `slabclaw-routes/research/routes-thinking-2026-07.md`,
`slabclaw-routes/research/hermes-extraction-for-routes.md`,
`slabclaw-routes/research/apify-x402-agentic-data-rail.md`,
`slabclaw-routes/resource-locks-and-routes.md`, `slabclaw-routes/CLAUDE.md`,
`~/Desktop/2_resources/Crypto/{cyber•Fund Supercharging Intents, Virtual Agent Economies,
Mechanics of intent solving II, lifi-intents-open-intents-framework (Base agentic-economy
capture)}.pdf`.

**Web**: Sprinter "Building Economic Trust in Solver-Based Networks Pt 2" (2025-07-10);
arXiv:2503.00738 "Execution Welfare Across Solver-based DEXes"; arXiv:2606.26028 "Can Trustless
Agents Be Trusted?" (ERC-8004 empirical study); forum.cow.fi CIP-44; docs.cow.fi solver
rewards/competition; blog.uniswap.org "Introducing the UniswapX Protocol";
developers.uniswap.org UniswapX overview; anoma.net/blog/uniswapx; eips.ethereum.org/EIPS/eip-7683;
archetype.fund ERC-7683; decentralised.co "On Solver Economics" (2024-11-04);
hyperlane.xyz OIF announcement; docs.li.fi LI.FI Intents; nethermind.io OIF-Starknet;
coindesk.com 4K launch (2021-09-29); eco.com intent guides (2026).
