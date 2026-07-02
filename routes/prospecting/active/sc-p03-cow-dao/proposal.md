# Grant Application - Batch Auction Settlement for AI Agent Acquisition of Physical Assets

## Author(s)

**Pat** — Ecofrontiers SARL (Barcelona/France)
- GitHub: [ecofrontiers]
- Published author: *Green Crypto* and *Mastering Claude* (Taylor & Francis, 2026)
- Builder: SlabClaw (10-platform collectibles arbitrage engine), Regen Atlas (Filecoin/IPFS), Windfall (DePIN inference), OpenClaw (AI agent tooling)
- Stack: Solidity, TypeScript, Swift, Python. Production systems: 5,167+ product universe, real-time oracle pricing across eBay, TCGPlayer, Courtyard, and 7 other marketplaces.

## Experiences and qualifications

Ecofrontiers builds infrastructure for physical-asset markets. Our flagship, SlabClaw, is a production arbitrage engine for graded Pokemon cards — a $50B+ collectibles market dominated by information asymmetry and fragmented liquidity.

**In production today:**

- **10-platform marketplace scanner** — real-time listings from eBay, TCGPlayer, Courtyard (Polygon NFTs), Beezie, MagicEden, Collector's Crypt, and others
- **6-tier price oracle** — merged sold comp pool from PriceCharting, CardFacts, and eBay API. T1 (3+ grader-matched sales) through T6 (active listing fallback). Contamination guards, grade inversion guards, reverse holo filters
- **5,167-product universe** with grade-band normalization across PSA, CGC, BGS, ACE, TAG, PCA grading services
- **Logistics graph architecture** — card movement modeled as a directed graph with cost-weighted edges: `[shipping, taxes, service_fee, insurance]`. Nodes = marketplaces, custody vaults, grading services, tokenization platforms. Route solvers find optimal paths.
- **Resource Lock design** — credible commitment framework for physical asset settlement, inspired by CyberFund's Resource Lock Machine. Per-hop settlement with 3-of-3 multisig (solver + custody + oracle).

Cross-chain stack: LI.FI SDK (`@lifi/sdk@3.16.3`), x402 protocol (`@x402/core@2.14.0`), Base MCP.

## Grant Description

### The Core Idea

AI agents that want to acquire physical assets need a coordination mechanism. Today, an autonomous vault agent that wants to buy a PSA 9 Base Set Charizard has to snipe listings across 10 platforms sequentially — racing against other agents, overpaying due to information asymmetry, and bearing all logistics risk.

We propose using CoW Protocol's batch auction as the **demand-side order book for AI agent acquisition intents**, where competing **solvers use physical logistics routes to fill those orders**.

### How It Works

**1. AI agents publish acquisition intents (demand side)**

An autonomous vault agent — an AI managing a collectibles portfolio — expresses an intent:

```
"Acquire any PSA 9 Base Set Charizard, max $800,
 deliver to Brink's NYC custody vault,
 total landed cost including shipping/insurance <= $850"
```

This is the demand side of the book. Multiple agents may want similar cards. Their intents accumulate in a batch.

**2. Solvers compete to fill intents using Routes (supply side)**

Solvers have marketplace expertise and logistics capabilities. A solver sees the batch of intents and:
- Queries SlabClaw's 10-platform oracle to find available supply
- Computes the optimal **route** for each fill: which marketplace to buy from, how to ship it, what the landed cost is
- A route is a path through a logistics graph: `[eBay DE seller] → [customs] → [Brink's NYC]` with cost vector `[shipping: $45, tax: $0, insurance: $210, intake: $25]`
- Submits a bid to the CoW batch auction: "I can fill these 3 intents for these prices, via these routes"

**3. CoW batch auction selects the best solver**

CoW Protocol's fair combinatorial auction selects the solver (or combination of solvers) that maximizes surplus for the agents. This is where CoW's architecture provides value:

- **Solver competition** — multiple solvers with different route expertise compete. One specializes in US domestic shipping, another in Japanese imports, another in tokenized assets on Courtyard (zero shipping cost).
- **Batch efficiency** — an aggregator solver can fill 5 intents in one PSA submission batch, saving 36% on shipping vs. individual fulfillment. CoW's auction rewards this efficiency.
- **Uniform Directed Clearing Prices** — when multiple agents want the same card type, the batch auction establishes fair market price rather than each agent independently overpaying.
- **Coincidence of Wants** — rare for individual non-fungible items at early volumes, but grade-band equivalence creates quasi-fungible classes (any PSA 9 from the same set). As the agent ecosystem grows, CoW frequency increases. At launch, the primary value is solver competition and uniform clearing prices.

**4. Physical settlement with dispute resolution**

After the auction, the winning solver executes the route:
- Buys the card on the source marketplace
- Ships it through the logistics graph (possibly multi-hop: seller → inspection → grading → custody)
- Each hop has a Resource Lock — funds locked for that leg, released on delivery confirmation
- Settlement oracle confirms delivery via carrier tracking + custody provider API + cert verification

**Dispute mechanism:** When the agent and solver disagree (card condition disputed, wrong item shipped, delivery not confirmed), a structured resolution process modeled on existing marketplace dispute systems (eBay Buyer Protection, Courtyard's inspection process) and on-chain arbitration patterns (Kleros):

- **Tier 1: Automated** — carrier tracking API confirms delivery, cert number comparison (barcode on slab matches intent). Binary: delivered-or-not, right-item-or-not. Handles the majority of dispute types (lost in transit, wrong item shipped).
- **Tier 2: Arbitration** — for condition disputes (card arrived damaged, grade contested vs. listing description), a designated arbitrator reviews photographic evidence submitted by both parties. Arbitrator selected from a staked pool: custody providers (Brink's, PWCC) or grading service partners who have professional card evaluation expertise. Arbitrator posts a bond (minimum 5% of dispute value) against frivolous or colluded rulings. Losing party pays arbitration fee.
- **Tier 3: Timeout default** — if no resolution within the lock window (configurable per route, default 30 days), funds return to the agent's Resource Lock pool, solver's collateral is slashed proportional to the unfulfilled route cost. This protects against indefinite lock-ups.

Design note: dispute resolution will iterate during testnet (Milestone 3). We will publish dispute data (frequency, tier distribution, resolution times) in the Milestone 4 post-launch report.

### Why This Matters for CoW Protocol

**CoW Protocol has proven batch auctions work for fungible tokens ($87B in 2025).** This grant proves the mechanism generalizes to non-fungible physical assets — a large, fragmented market ($2B/year in graded cards alone, with 15-20% annual growth) where batch auction coordination has not been attempted.

The insight: CoW's solver competition model is not specific to token routing. It's a general-purpose mechanism for matching demand intents against competing supply solvers. The only difference is what the solver does to fill the order — instead of routing through Uniswap pools, the solver routes through a physical logistics graph.

**This serves CIP-80's 2026 priorities:**
1. **Solver Ecosystem** — new solver type with genuinely different fill mechanics
2. **Innovation** — first intent protocol handling physical asset settlement
3. **Volume** — every settled order triggers an on-chain payment release through CoW's settlement contract, bringing a new asset class into CoW's volume metrics

**The AI agent angle is strategic.** Autonomous agents managing physical asset portfolios is an emerging category. CoW Protocol as the coordination layer for agent-to-agent physical asset commerce is a positioning no other intent protocol has.

### Technical Architecture

```
    AI Vault Agents (demand)
    ┌─────────────────────┐
    │ "Want PSA 9 Zard    │
    │  under $800,        │
    │  deliver to vault"  │
    └─────────┬───────────┘
              │ intents
    ┌─────────v───────────┐
    │  CoW Batch Auction   │   (coordination layer)
    │  - Collects intents  │
    │  - Runs auction      │
    │  - Selects winners   │
    └─────────┬───────────┘
              │ winning bids
    ┌─────────v───────────┐
    │  Competing Solvers   │   (supply side)
    │  ┌────────────────┐  │
    │  │ SlabClaw Oracle │  │   existing: 10 platforms, 6-tier pricing
    │  │ (supply disc.)  │  │
    │  └───────┬────────┘  │
    │  ┌───────v────────┐  │
    │  │ Route Engine    │  │   existing: logistics graph, cost vectors
    │  │ (fill planning) │  │
    │  └───────┬────────┘  │
    │  ┌───────v────────┐  │
    │  │ Bid Generator   │  │   new: CoW solver interface
    │  │ (surplus calc)  │  │
    │  └────────────────┘  │
    └─────────┬───────────┘
              │ execution
    ┌─────────v───────────┐
    │  Settlement Layer    │
    │  ┌────────────────┐  │
    │  │ Resource Locks  │  │   per-hop escrow with timeout
    │  │ (escrow)        │  │
    │  └───────┬────────┘  │
    │  ┌───────v────────┐  │
    │  │ Settlement      │  │   carrier API + custody + cert verify
    │  │ Oracle          │  │
    │  └───────┬────────┘  │
    │  ┌───────v────────┐  │
    │  │ Dispute         │  │   3-tier: automated → arbitration → timeout
    │  │ Resolution      │  │
    │  └────────────────┘  │
    └─────────────────────┘
```

### Mapping Physical Assets to CoW Orders

CoW Protocol currently handles ERC-20 token pairs via `GPv2Order`. Physical asset orders require an extended schema. Our proposed approach:

**Synthetic ERC-20 wrapper.** Each asset class (e.g., "PSA 9 Base Set Charizard") maps to a synthetic ERC-20 token representing a claim on physical delivery. The solver mints a `PhysicalAssetClaim` token when it commits to a fill, which the agent receives on auction settlement. The claim token is burned when the settlement oracle confirms physical delivery and releases the payment escrow. This keeps the order flow within CoW's existing solver interface — no protocol-level changes required.

Grade-band equivalence is handled at the solver level: a "PSA 9 equivalent" claim covers PSA 9, CGC 9, and BGS 9, with the solver choosing the best fill. The claim token contract encodes the asset identity, grade range, and custody destination.

We will validate this approach with CoW Protocol engineers before Milestone 1 begins. If the team recommends a programmatic order type or hook-based approach instead, we will adapt.

### What We Reuse vs. Build New

| Component | Status | Notes |
|-----------|--------|-------|
| 10-platform marketplace scanner | **Production** | eBay, TCGPlayer, Courtyard, Beezie, MagicEden, etc. |
| 6-tier price oracle | **Production** | Sold comps, grade-matched, contamination-guarded |
| Grade-band normalization (6 graders) | **Production** | PSA, CGC, BGS, ACE, TAG, PCA |
| 5,167-product universe | **Production** | Expanding weekly |
| Logistics graph + route solver | **Designed** | Nodes, edges, cost vectors, constrained shortest path |
| Resource Lock architecture | **Designed** | Per-hop locks, 3-of-3 settlement |
| CoW solver interface + bid generator | **To build** | Core grant deliverable |
| Intent aggregator for AI agents | **To build** | Adapts existing vault intent format |
| Physical settlement oracle | **To build** | Carrier API + custody confirmation bridge |
| Dispute resolution mechanism | **To build** | 3-tier: automated, arbitration, timeout |
| Batch matching for non-fungibles | **To build** | Grade-substitutability + route-cost-aware surplus maximization |

## Type of Grant

Milestone-based.

## Milestones

| Milestone | Title | Due Date | Funding Request |
|-----------|-------|----------|-----------------|
| Milestone 1 | CoW Solver Interface + Agent Intent Schema | 4 weeks after acceptance | 3,000 xDAI + 7,500 COW |
| Milestone 2 | Route-Aware Batch Matching + Oracle Integration | 9 weeks after acceptance | 4,500 xDAI + 11,000 COW |
| Milestone 3 | Settlement Oracle + Dispute Resolution + Testnet Demo | 15 weeks after acceptance | 4,500 xDAI + 11,000 COW |
| Milestone 4 | Mainnet Launch + Agent Settlement Volume | 22 weeks after acceptance | 3,000 xDAI + 10,500 COW |

### Milestone 1: CoW Solver Interface + Agent Intent Schema (4 weeks)

**Deliverables:**
- CoW Protocol solver interface implementation for physical asset orders
- `PhysicalAssetOrder` schema: asset identity (set, number, grader, grade range), max landed cost (including route), custody destination, verification requirements
- Agent SDK: TypeScript library for vault agents to publish intents to the solver
- Grade-band normalization adapter: translates 6 grading services into CoW-compatible asset equivalence classes
- Unit tests against CoW Protocol testnet

**KPIs:**
- Solver registered on CoW Protocol testnet
- 10+ test intents from simulated vault agents submitted and processed
- Schema documented with examples for each order type (buy, sell, swap)

### Milestone 2: Route-Aware Batch Matching + Oracle Integration (9 weeks)

**Deliverables:**
- Batch matching algorithm for non-fungible assets with two innovations:
  1. **Grade-substitutability** — PSA 9, CGC 9, BGS 9 are different products but fill the same intent. Solver exploits cross-grader equivalence for better fills.
  2. **Route-cost-aware surplus** — a card at $750 on eBay with $80 route cost is worse than $770 on Courtyard with $0 route cost. Solver optimizes on landed cost, not listing price.
- Integration with SlabClaw's production oracle (10 platforms, 6-tier pricing)
- Solver benchmarking: demonstrate surplus improvement vs. naive best-price-first fill (target: 8-15%)
- Coincidence of Wants detection for agent-to-agent swaps (peer-to-peer, no marketplace fees)

**KPIs:**
- 5+ orders matched in a single batch on testnet
- Measurable surplus improvement vs. baseline documented
- Oracle returning real-time cross-platform pricing in solver responses

### Milestone 3: Settlement Oracle + Dispute Resolution + Testnet Demo (15 weeks)

**Deliverables:**
- Physical settlement oracle with three verification channels:
  1. Carrier tracking (FedEx/DHL/USPS API) → delivery confirmation
  2. Custody provider (Brink's/PWCC API) → intake confirmation
  3. NFT transfer (Courtyard on Polygon) → on-chain verification
- Resource Lock escrow contract on Gnosis Chain: per-hop locks, timeout release
- 3-tier dispute resolution:
  1. Automated: tracking + vision verification for 90%+ of cases
  2. Arbitration: designated arbitrator for condition/authenticity disputes, arbitrator staking
  3. Timeout default: funds return to agent, solver collateral slashed
- End-to-end testnet demo: agent publishes intent → solver bids → auction settles → physical delivery → payment release
- Open-source repository

**KPIs:**
- 3 complete settlement cycles on testnet (physical, tokenized, mixed)
- Dispute resolution demonstrated for each tier
- Repository public on GitHub with architecture docs

### Milestone 4: Mainnet Launch + Agent Settlement Volume (22 weeks)

**Deliverables:**
- Mainnet deployment on Gnosis Chain
- Solver competing in live CoW Protocol auctions
- Agent onboarding: documentation, SDK published to npm, integration guide
- Volume tracking dashboard
- Post-launch report: settlement times, dispute rates, surplus delivered

**KPIs:**
- Solver live on mainnet and competing in CoW Protocol auctions
- Settlement volume targets (tiered):
  - Floor (milestone passes): 10+ orders settled, $2K+ volume — proves end-to-end mechanism works
  - Target: 50+ orders settled, $10K+ volume
  - Stretch: 200+ orders, $40K+ volume
- 3+ unique agents/users submitting intents (includes both autonomous agents and human SDK users)
- Dispute resolution invoked and functioning in production
- Post-launch report published: settlement times, dispute rates, surplus delivered vs. baseline

## Length

22 weeks (~5.5 months) from acceptance. Commencement on Snapshot approval.

## Funding Request

**Total: 15,000 xDAI + 40,000 COW**

At current COW price (~$0.45), total grant value is approximately $33,000.

**Justification:**
- The production oracle, 10-platform scanner, grade normalization engine, and logistics graph architecture represent 12+ months of prior development. The grant scope is specifically the CoW interface layer, not the underlying infrastructure.
- Primary new build: CoW solver interface, route-aware batch matching, settlement oracle, dispute resolution — all building on top of production systems
- Milestone structure: CoW DAO pays only for delivered, verified work
- Comparable scope to recent CoW grants (Helva AI Agent ~$9.2K for simpler integration; this is broader scope but reuses substantial existing infrastructure)

**Breakdown by category:**
- Solver engine + batch matching algorithm: 30%
- Smart contracts (escrow, settlement, dispute): 30%
- Oracle integration (carrier, custody, marketplace APIs): 20%
- Agent SDK, testing, documentation, community: 20%

## Gnosis Chain Address

`[To be provided — Ecofrontiers Gnosis Chain multisig]`

## Other Information

### Demand Bootstrapping

A coordination layer needs demand. Our bootstrapping plan:

1. **Phase 1 (Milestones 1-3): SlabClaw's own vault agent is the first customer.** We accept this bootstrapping risk explicitly. Our production arbitrage engine already identifies acquisition opportunities daily across 10 platforms. Converting these signals into CoW batch auction intents is a natural extension, not a speculative leap.

2. **Phase 2 (Milestone 4): Human intents via SDK.** The Agent SDK works for any participant — human or AI. A collector can submit an intent ("find me a PSA 9 Charizard under $800") through the SDK without running an autonomous agent. This broadens the demand side to the existing collector community.

3. **Phase 3 (post-grant): External agent frameworks.** We will publish integration guides for agent platforms (Olas/Autonolas, ElizaOS, LangChain agent frameworks) to attract third-party agents. The open-source solver and SDK lower the integration barrier.

The milestone KPIs reflect this phased approach — "3+ unique agents/users" includes both autonomous agents and human users submitting via SDK.

### Why AI Agents + Physical Assets + CoW Protocol

Three trends converging:

1. **Autonomous agents managing real-world portfolios** — AI agents with wallets acquiring, holding, and trading physical assets on behalf of users. SlabClaw's vault agent architecture is built for this, and we will operate the first agent ourselves.

2. **Physical assets coming on-chain** — Courtyard has tokenized hundreds of thousands of Pokemon cards as Polygon NFTs. The physical-to-tokenized bridge is built. What's missing is the coordination layer for intelligent acquisition.

3. **Intent protocols maturing beyond DeFi** — CoW Protocol proved batch auctions work. The question is: what other markets benefit from solver competition and uniform clearing prices? Physical collectibles is the answer.

CoW Protocol as the settlement coordination layer for AI agents acquiring physical assets is a unique positioning in the intent protocol space.

### Open Design Questions (for committee feedback)

1. **Settlement timing** — CoW settles token swaps in seconds. Physical asset settlement takes days to weeks (shipping + custody intake). Our approach: payment escrow locks immediately on auction settlement via the Resource Lock contract, releases on physical delivery oracle confirmation. The batch auction handles demand coordination; settlement is asynchronous.

2. **Solver collateral** — Physical asset solvers front capital for days/weeks (buy card, ship it, wait for custody confirmation). Our proposal: solver bonds proportional to route duration, slashed on timeout/dispute. This is analogous to CoW's existing solver bonding mechanism but with longer time horizons.

3. **Solver competition bootstrapping** — initially, Ecofrontiers operates the primary solver. As volume grows and the solver framework is open-sourced (Milestone 3), we expect competition from marketplace specialists: a Japan-import solver, a Courtyard-native solver (zero shipping cost for tokenized cards), a grading-service solver that batches PSA submissions. Solver competition is a medium-term outcome, not a launch-day assumption.

We welcome committee input on these questions and are prepared to adapt the design.

### Existing Work

- [SlabClaw production system] — 10-platform scanner, 6-tier oracle, 5,167-product universe (running daily)
- [Resource Locks for Card Logistics] — 14-section architecture doc: logistics graph, resource locks, route solvers, cross-layer composition
- [LI.FI SDK integration] — cross-chain routing for tokenized card settlement
- Published: *Green Crypto* (Taylor & Francis, 2026) — sustainability and crypto infrastructure
- Published: *Mastering Claude* (Taylor & Francis, 2026) — AI agent architecture

### Related Grant Context

We are exploring grants from LI.FI (Builders Program) and Uniswap Foundation (ERC-7683 physical asset extension). The CoW solver is complementary — it uses CoW's batch auction specifically for demand-side coordination and solver competition. LI.FI funds the cross-chain routing, Uniswap funds the ERC-7683 standard extension, CoW funds the batch auction matching. No deliverable overlap.

## Terms and Conditions

By submitting this grant application, I acknowledge and agree to be bound by the CoW DAO Participation Agreement and the CoW DAO Grant Agreement Terms.
