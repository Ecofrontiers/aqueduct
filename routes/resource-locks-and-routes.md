# SlabClaw Routes: Resource Locks for Card Logistics

## Core Thesis

SlabClaw operates two distinct intent layers. **Layer 1 — Registries** — handles acquisition: "buy this card at this price or below." **Layer 2 — Routes** — handles logistics: the physical and tokenized movement of cards between nodes. Routes have never been formally designed. This document applies the Resource Lock framework (CyberFund / OneBalance / LI.FI) to both layers, turning SlabClaw's card logistics into a credible commitment machine.

The insight: every card in the SlabClaw ecosystem exists at a **node** and can move between nodes along **edges**. Each edge has a cost vector:

```
edge_cost = [shipping, taxes, service_fee, insurance]
```

Where:
- **Shipping** — physical transit cost (FedEx, USPS, DHL, or zero for tokenized transfers)
- **Taxes** — import duties, sales tax, VAT (varies by jurisdiction pair)
- **Service fee** — grading ($20-150), vaulting ($5-50/yr), authentication ($0-200), tokenization ($5-25)
- **Insurance** — transit insurance, custody insurance, value-proportional premiums

A **route** is a sequence of edges from origin to destination. The cheapest route between "eBay listing in Germany" and "PSA 10 slab in Brink's vault, NYC" is a multi-hop optimization problem identical in structure to cross-chain token routing — but with physical constraints that crypto routes don't have.

Resource Locks solve the same problem in both domains: **credible commitments that let solvers act before settlement confirms, without risk of double-spend.**

---

## Table of Contents

1. [The Two Intent Layers](#1-the-two-intent-layers)
2. [The Card Logistics Graph](#2-the-card-logistics-graph)
3. [Resource Locks: Core Mechanism](#3-resource-locks-core-mechanism)
4. [Layer 1: Resource Locks for Acquisition Registries](#4-layer-1-resource-locks-for-acquisition-registries)
5. [Layer 2: Resource Locks for Routes](#5-layer-2-resource-locks-for-routes)
6. [Route Solver Design](#6-route-solver-design)
7. [The Resource Lock Machine for Physical Assets](#7-the-resource-lock-machine-for-physical-assets)
8. [Cross-Layer Composition](#8-cross-layer-composition)
9. [Comparison: Crypto Routes vs Card Routes](#9-comparison-crypto-routes-vs-card-routes)
10. [Implementation Architecture](#10-implementation-architecture)
11. [Risk Analysis](#11-risk-analysis)
12. [Connections to Other SlabClaw Projects](#12-connections-to-other-slabclaw-projects)
13. [Build Sequence](#13-build-sequence)
14. [Open Questions](#14-open-questions)

---

## 1. The Two Intent Layers

### Layer 1: Registries (Acquisition)

Defined in `slabclaw-vaults/mechanism-design.md`. A vault agent expresses an acquisition intent:

```typescript
{
  product_id: "base1-4",        // PSA 10 Base Set Unlimited Charizard
  max_price_usd: 42000,
  quantity: 1,
  expiry: 1719878400,
  verification_level: "vision_verify"
}
```

Marketplace solvers compete to fill this intent. The vault locks USDC in escrow. The solver purchases the card on eBay/TCGPlayer/Courtyard/etc. and delivers it to vault custody. Escrow releases on verification.

**Current limitation:** The registry layer treats acquisition as a single atomic event — "card appears at custody" — without modeling the intermediate logistics. A solver on eBay buys the card, but then what? Ship it directly to Brink's? Ship it to themselves first for inspection? What if the card needs regrading? What if it's in Germany and the vault is in NYC? The cost vector of these intermediate steps is invisible to the intent system.

### Layer 2: Routes (Logistics)

Routes model what happens *between* the acquisition event and the card reaching its final destination. This is the logistics engine.

A route intent says: "Move this card from node A to node B, optimizing for [cost | speed | safety]."

```typescript
interface RouteIntent {
  id: string;
  card_id: string;                    // cert number or NFT token ID
  origin_node: NodeID;                // where the card is now
  destination_node: NodeID;           // where it needs to be
  optimization: "cost" | "speed" | "safety";
  max_total_cost_usd: number;        // ceiling for entire route
  max_duration_days: number;          // deadline
  insurance_required: boolean;
  constraints: RouteConstraint[];     // e.g., "must pass through grading"
  escrow_address: string;
  expiry: number;
}
```

Routes are composed of **hops**. Each hop is an edge in the logistics graph with its own cost vector. A route solver finds the optimal sequence of hops and commits to executing them.

---

## 2. The Card Logistics Graph

### Nodes

Every location where a card can exist is a node. Nodes have properties: jurisdiction, capabilities, trust level, and holding costs.

| Node Type | Examples | Capabilities | Jurisdiction |
|-----------|----------|-------------|-------------|
| **Marketplace** | eBay seller, TCGPlayer store, Cardmarket seller | Sale, shipping | Varies |
| **Custody Vault** | Brink's (NYC, LA, Dallas), PWCC (Oregon), Card Vault (EU) | Storage, insurance, inspection | US, EU |
| **Grading Service** | PSA (Santa Ana), BGS (Dallas), CGC (Sarasota), SGC (FL) | Grading, encapsulation, regrading | US |
| **Tokenization Platform** | Courtyard (Brink's), Beezie, Collector Crypt | Tokenize, detokenize, custody | US, varies |
| **Collector** | Individual buyer/seller, LCS | Sale, purchase, inspection | Varies |
| **Vault Agent** | SlabClaw vault LLC | Acquisition, custody, management | Wyoming |
| **Forwarder** | Package consolidation services, customs brokers | Aggregation, customs clearance | Varies |
| **Solver Facility** | Solver's own inspection/staging facility | Inspection, photography, staging | Varies |

### Edges

An edge connects two nodes. Every edge has a cost vector and constraints.

```typescript
interface Edge {
  from: NodeID;
  to: NodeID;
  cost: {
    shipping_usd: number;          // physical transit
    tax_usd: number;               // import duties, VAT, sales tax
    service_fee_usd: number;       // grading, vaulting, tokenization
    insurance_usd: number;         // value-proportional premium
  };
  duration_days: {
    min: number;
    typical: number;
    max: number;
  };
  constraints: EdgeConstraint[];    // e.g., "requires customs declaration > $800"
  risk_score: number;               // 0-1, probability of loss/damage
  available: boolean;               // is this edge currently operational?
}
```

### Example Routes

**Route A: eBay Germany → Brink's NYC (physical, direct)**
```
[eBay DE seller] --ship--> [Customs broker] --clear--> [Brink's NYC]
  shipping: $45    tax: $0 (< $800)    service: $25    insurance: $210
  Total: $280 | Duration: 7-14 days
```

**Route B: eBay Germany → PSA grading → Brink's NYC**
```
[eBay DE seller] --ship--> [PSA Santa Ana] --grade--> [Brink's NYC]
  shipping: $45+$15    tax: $0    service: $75 (grading) + $25 (vault intake)    insurance: $420
  Total: $580 | Duration: 30-90 days (PSA turnaround)
```

**Route C: Courtyard NFT → SlabClaw vault wallet (tokenized, instant)**
```
[Courtyard marketplace] --NFT transfer--> [Vault wallet on Polygon]
  shipping: $0    tax: $0    service: $0 (2% platform fee is acquisition cost)    insurance: $0
  Total: $0 | Duration: minutes
```

**Route D: Raw card → PSA grading → Courtyard tokenization → Vault**
```
[Collector] --ship--> [PSA] --grade--> [Courtyard/Brink's] --tokenize--> [Vault wallet]
  shipping: $15+$15    tax: $0    service: $75+$25    insurance: $150
  Total: $280 | Duration: 60-120 days
```

### The Routing Problem

Given an origin and destination, find the optimal path through the graph minimizing a cost function:

```
minimize: w_cost * total_cost + w_time * total_duration + w_risk * total_risk

subject to:
  - total_cost <= max_total_cost_usd
  - total_duration <= max_duration_days
  - all constraints satisfied (insurance, grading requirements, jurisdiction restrictions)
```

This is a constrained shortest-path problem on a weighted directed graph — structurally identical to cross-chain token routing, but with physical-world constraints (shipping time, customs, grading queues).

---

## 3. Resource Locks: Core Mechanism

### What Resource Locks Do (from CyberFund)

A Resource Lock is a **cryptographic commitment guaranteeing exclusive fund availability** based on predetermined conditions. The Resource Lock Machine (also called Credible Commitment Machine, Allocator, or Sequencer) provides immediate cryptographic proof that funds are exclusively reserved for a specific intent.

**Key properties:**
1. **Prevents double-spending** — locked funds cannot be spent elsewhere until the lock expires or is released
2. **Enables T+1 execution** — solvers can act immediately on the commitment, without waiting for source-chain settlement (in crypto) or without waiting for physical verification (in our case)
3. **Real-time proving** — proofs generated immediately when locks are created or modified, not batched periodically
4. **Sequencing rights** — the RL Machine controls transaction ordering, preventing race conditions

### Three Types (CyberFund Taxonomy)

| Type | Trust Model | Speed | Custody | Best For |
|------|-----------|-------|---------|----------|
| **Fully offchain (TEE)** | Trust TEE | Fastest | TEE holds keys | Maximum UX, lower sovereignty |
| **Semi-onchain (co-signer)** | 2/2 multisig (user + TEE) | Fast | Shared control | Balance of UX and sovereignty |
| **Fully onchain (escrow/RL hooks)** | Smart contract | On-chain speed | Subaccount escrow | Maximum sovereignty, extra deposit step |

### Why Resource Locks for Physical Cards?

The CyberFund paper addresses cross-chain token transfers. Our problem is structurally analogous but physically grounded:

| Crypto Intent Problem | Card Logistics Problem |
|----------------------|----------------------|
| User has USDC on Arbitrum, wants token on Solana | Vault has USDC on Base, wants PSA 10 Charizard in Brink's |
| Solver fronts capital on destination chain | Solver fronts capital on eBay to buy the card |
| Risk: user double-spends source USDC | Risk: vault cancels intent while solver is mid-shipment |
| Settlement: source chain confirms transfer | Settlement: card arrives at custody and passes verification |
| T+4 in Intents 1.0, T+1 with Resource Locks | 7-90 days for physical cards, minutes for tokenized |

The timing mismatch is *worse* for physical cards. A solver who buys a $40K Charizard on eBay and ships it to Brink's has capital locked for 7-14 days. If the vault can cancel the intent during that window, the solver eats the loss. Resource Locks solve this by making the vault's commitment credible *before* the solver acts.

---

## 4. Layer 1: Resource Locks for Acquisition Registries

### Current Escrow Model (Intents 1.0)

The existing vault mechanism (from `mechanism-design.md`) uses a basic escrow:

```
1. Vault publishes intent with max_price
2. Vault locks USDC in escrow contract (max_price * quantity * (1 + fees))
3. Solver sees intent, buys card on marketplace
4. Solver ships card to custody
5. Custody confirms receipt → verification → escrow releases
```

**Problems with this model:**

1. **Escrow is static.** Once locked, those funds cannot serve other intents. A vault with $100K in escrow across 3 intents has $100K immobilized, even if only one intent is likely to fill.

2. **No sequencing.** If a vault publishes intents totaling $200K but only has $150K, the escrow model requires choosing which intents to fund. First-come-first-serve creates race conditions among solvers.

3. **Solver capital risk during transit.** The escrow guarantees payment *on verification*, but the solver has capital locked during the 7-14 day shipping window. If the card is damaged in transit, the solver loses both the card value and the fill fee.

4. **No double-spend protection for multi-marketplace race.** If a solver on eBay and a solver on TCGPlayer both find the same card (cross-listed by the seller), they might both try to fill. First pheromone signal wins per the swarm coordination rules, but there's no cryptographic guarantee — it's a social consensus backed by reputation.

### Resource Lock Model (Intents 2.0)

Apply the CyberFund framework to acquisition intents:

**Step 1: Vault deposits USDC into a Resource Lock Account (fully onchain escrow model)**

```solidity
// Vault deposits total acquisition budget into RL subaccount
vault.depositToResourceLock(totalBudget);
// RL account holds funds but vault retains ownership (can withdraw after timelock)
```

**Step 2: Resource Lock Machine manages sequencing rights**

The RL Machine (running as a service, potentially TEE-backed for speed) manages which intents are funded from the pool:

```typescript
interface ResourceLockState {
  total_balance: number;           // total USDC in RL account
  locked_amount: number;           // sum of all active locks
  available_amount: number;        // total - locked
  active_locks: ResourceLock[];    // individual locks per intent
}

interface ResourceLock {
  intent_id: string;
  amount: number;                  // locked for this intent
  solver_id: string | null;        // which solver claimed this lock
  status: "pending" | "claimed" | "settling" | "released";
  expiry: number;                  // when lock auto-releases
  proof: string;                   // cryptographic proof of lock
}
```

**Step 3: Solver receives cryptographic proof before acting**

When a solver finds a matching listing and signals a pheromone claim, the RL Machine:
1. Verifies available funds in the RL account
2. Creates a lock for that specific intent + solver
3. Issues a cryptographic proof to the solver: "These funds are exclusively reserved for your fill of intent X"
4. The solver now has a *credible commitment* — the vault cannot double-spend those funds

**Step 4: Settlement on verification**

On successful verification at custody:
1. RL Machine releases the lock
2. Smart contract transfers USDC to solver (reimbursement + fill fee)
3. Lock removed from RL state

On failed verification:
1. Lock released
2. Funds return to RL available pool
3. Solver reputation penalized (if solver's fault)

### What This Changes

| Before (Intents 1.0) | After (Resource Locks) |
|----------------------|----------------------|
| Static escrow per intent | Dynamic pool with per-solver locks |
| $200K across 5 intents = $200K locked | $200K pool serves all intents dynamically |
| Solver trusts escrow contract | Solver holds cryptographic proof |
| Race condition on multi-marketplace fills | RL Machine sequences: one solver, one lock |
| No cancellation protection during transit | Lock persists through shipping + verification window |
| Pheromone-only coordination | Pheromone + cryptographic lock |

### Capital Efficiency Gain

Consider a vault with $200K budget and 5 active intents averaging $40K each. Under static escrow, the vault needs $200K locked (1:1). Under Resource Locks with historical fill analysis:

- Average concurrent fills: 1.5 (most intents wait for listings)
- Peak concurrent fills: 3 (during market events)
- Required RL pool: $120K (3 * $40K) vs $200K static
- Capital efficiency improvement: 40%

The freed capital can earn yield in DeFi or fund additional acquisition.

---

## 5. Layer 2: Resource Locks for Routes

This is the novel layer. Routes have no existing design — they are being defined here.

### Route Intent Lifecycle

```
1. ORIGIN:      Card exists at origin node (marketplace, collector, solver facility)
2. INTENT:      Route intent published: "move card from A to B, cost <= X, time <= Y"
3. LOCK:        Resource Lock Machine locks funds for the route
4. CLAIM:       Route solver claims the intent, receives lock proof
5. EXECUTE:     Solver executes hops: ship → customs → grade → vault
6. CHECKPOINT:  At each hop, solver submits proof of progress
7. SETTLE:      Card arrives at destination, verified, lock releases
```

### Resource Locks at Each Hop

The critical insight: **a multi-hop route needs resource locks at each transition, not just the endpoints.** A card moving from Germany to PSA to Brink's has three risk transitions:

**Hop 1: Seller → Solver (or directly to next node)**
- Lock: acquisition cost + shipping + insurance for this leg
- Release condition: tracking shows delivery to next node
- Risk: seller doesn't ship, ships wrong item

**Hop 2: Solver facility → PSA**
- Lock: grading fee + shipping + insurance
- Release condition: PSA confirms receipt and queues for grading
- Risk: damage in transit, PSA rejects submission

**Hop 3: PSA → Brink's custody**
- Lock: shipping + vault intake fee + insurance
- Release condition: Brink's confirms receipt and custody
- Risk: damage in transit, Brink's rejects condition

Each hop's lock is released independently, allowing partial settlement. If hop 1 completes but hop 2 fails (PSA rejects the submission), the solver is compensated for hop 1 but not hop 2.

### The Route Lock Structure

```typescript
interface RouteLock {
  route_id: string;
  total_locked: number;               // sum of all hop locks + solver fee
  hops: HopLock[];
  solver_fee_lock: number;            // solver's total fee, released on completion
  status: "active" | "partial" | "complete" | "failed";
}

interface HopLock {
  hop_index: number;
  from_node: NodeID;
  to_node: NodeID;
  locked_amount: number;              // cost for this hop
  release_condition: ReleaseCondition;
  proof_of_progress: string | null;   // tracking number, receipt, cert confirmation
  status: "pending" | "in_transit" | "confirmed" | "failed";
}

interface ReleaseCondition {
  type: "tracking_delivered" | "receipt_confirmed" | "cert_issued" | "nft_transferred" | "custody_confirmed";
  verifier: string;                   // who confirms: carrier API, PSA API, Brink's API, chain
  timeout_days: number;               // auto-release to solver if no dispute within timeout
}
```

### Route Pricing Oracle

Routes need a pricing oracle for each edge. This oracle tracks:

```typescript
interface EdgePricing {
  from_type: NodeType;
  to_type: NodeType;
  jurisdiction_pair: [string, string];   // e.g., ["DE", "US"]
  shipping: {
    carriers: CarrierQuote[];            // FedEx, USPS, DHL quotes
    typical_usd: number;
    currency: string;
  };
  tax: {
    rate_pct: number;                    // import duty rate
    threshold_usd: number;              // de minimis threshold (US: $800)
    vat_pct: number;                    // VAT rate if applicable
  };
  service: {
    service_type: string;               // "grading", "vaulting", "tokenization"
    provider: string;                   // "PSA", "Brinks", "Courtyard"
    fee_usd: number;
    turnaround_days: number;
  };
  insurance: {
    rate_per_1000_usd: number;          // premium per $1K of declared value
    provider: string;
  };
  last_updated: number;
}
```

This data feeds the route optimizer. Some of it is static (PSA grading fees), some is dynamic (shipping quotes, customs rates), some is estimated (turnaround times).

---

## 6. Route Solver Design

### What Is a Route Solver?

A route solver is distinct from a marketplace solver. Marketplace solvers (from `slabclaw-vaults`) find and acquire cards. Route solvers move cards between nodes.

The same entity might do both — an eBay solver that buys and ships is performing acquisition + routing in one step. But the separation matters because:

1. **Routes can exist without acquisition.** A vault might acquire a raw card from a collector and need it graded and vaulted. No marketplace involved — pure routing.
2. **Routes can span multiple solvers.** One solver handles Germany→US customs, another handles US→PSA, another handles PSA→Brink's. Specialization.
3. **Route optimization is a separate skill.** Knowing that PSA Santa Ana has a 45-day backlog but BGS Dallas is running 20 days is logistics intelligence, not marketplace intelligence.

### Solver Types

| Solver Type | Specialization | Example |
|-------------|---------------|---------|
| **Full-service** | Acquires and routes in one flow | eBay solver buys, inspects, ships to custody |
| **Logistics** | Physical shipping and customs only | Freight forwarder, customs broker |
| **Service** | Grading, authentication, tokenization | PSA submission service, Courtyard tokenization |
| **Aggregator** | Combines multiple cards for batch routing | Consolidates 10 cards for one PSA submission |

### Aggregator Solvers: Batch Routing

This is where route solvers unlock real value. PSA charges per-card grading fees, but shipping is per-package. A route solver that consolidates 10 cards from 10 different vaults into one PSA submission saves:

```
Individual routing (10 cards):
  Shipping: 10 * $15 = $150
  Insurance: 10 * $20 = $200
  Total routing overhead: $350

Aggregated routing (10 cards, one shipment):
  Shipping: 1 * $25 = $25
  Insurance: 1 * $200 = $200 (same total value, but group policy discount)
  Total routing overhead: $225

Savings: $125 (36% reduction in routing costs)
```

The aggregator solver's Resource Lock: each vault locks its card's share of the route cost. The aggregator holds a composite lock covering all cards. If one vault's card fails verification, that vault's portion releases back; the rest proceed.

### Solver Economics

```
Route solver revenue:
  Route fee: 1-5% of card value (scales with complexity)
  + Aggregation savings share: 50% of savings vs. individual routing
  + Speed premium: 1-2% for expedited service

Route solver costs:
  - Shipping labels and packaging
  - Insurance premiums
  - Customs brokerage fees
  - Working capital (fronting shipping costs before lock release)
  - Infrastructure (tracking integration, API connections)

Example: $40K card, Germany → PSA → Brink's
  Route fee (2%): $800
  Shipping cost: $60
  Insurance premium: $210
  Customs brokerage: $50
  Net profit: $480
```

---

## 7. The Resource Lock Machine for Physical Assets

### The Physical Settlement Problem

CyberFund's Resource Locks achieve T+1 execution because crypto settlement is fast — the destination-chain transaction confirms in seconds to minutes. Physical card logistics are T+7 to T+90. This creates a fundamentally different trust requirement.

**In crypto:** Solver fronts capital for seconds/minutes. Risk window is tiny.
**In cards:** Solver fronts capital for days/weeks. Risk window is enormous.

Resource Locks don't eliminate this time window — they make the vault's commitment *credible* throughout it. The solver knows the funds are locked and cannot be redirected, even if the card is in transit for 14 days.

### RL Machine Architecture for SlabClaw

We adapt the three RL types from CyberFund:

#### Option A: Fully Onchain (Escrow + RL Hooks)

**How it works:**
- Vault deposits USDC into an onchain escrow subaccount (Base L2)
- Smart contract enforces lock/release conditions
- Release triggered by oracle/verifier confirmation (custody provider API, carrier tracking API)

**Pros:** Maximum trust minimization. All rules enforced by code. Vault and solver both trust the contract, not each other.

**Cons:** Onchain oracles for physical delivery are imperfect. "FedEx says delivered" != "card is authentic and undamaged." Needs a dispute resolution layer.

**Best for:** High-value acquisitions (>$10K), where trust minimization justifies complexity. Tokenized card transfers (Courtyard → vault wallet) where the entire lifecycle is onchain.

#### Option B: Semi-Onchain (Co-signer with TEE)

**How it works:**
- Vault's RL account is a 2/2 multisig: vault signer + TEE signer
- TEE manages sequencing and lock proofs
- Vault can remove TEE signer after timelock (e.g., 30 days)
- TEE validates delivery proofs and triggers settlement

**Pros:** Faster coordination. TEE can make instant decisions on lock allocation. User retains sovereignty via timelock escape.

**Cons:** TEE trust assumption. If TEE is compromised, locks could be forged.

**Best for:** Medium-value acquisitions ($1K-$10K). Balances speed and trust.

#### Option C: Hybrid (Onchain escrow + offchain routing intelligence)

**How it works:**
- Escrow and lock/release are onchain (trustless)
- Route optimization and solver coordination are offchain (fast)
- Physical delivery verification uses a 3-of-3 multisig: solver (submits proof), custody provider (confirms receipt), oracle (validates cert)

**Pros:** Best of both worlds. Trustless settlement with fast coordination.

**Cons:** More complex. Requires custody providers to participate as signers.

**Best for:** SlabClaw's architecture. The vault agent is already a software entity managing an LLC. Adding a TEE co-signer for routing coordination is a natural extension.

### Recommended: Option C (Hybrid)

```
                    +-------------------+
                    | Route Optimizer   |  (offchain, fast)
                    | - Path finding    |
                    | - Cost estimation |
                    | - Solver matching |
                    +--------+----------+
                             |
                    +--------v----------+
                    | RL Machine (TEE)  |  (offchain coordination)
                    | - Lock allocation |
                    | - Sequencing      |
                    | - Proof issuance  |
                    +--------+----------+
                             |
                    +--------v----------+
                    | Escrow Contract   |  (onchain, Base L2)
                    | - USDC custody    |
                    | - Lock/release    |
                    | - Dispute timeout |
                    +--------+----------+
                             |
              +--------------+--------------+
              |              |              |
     +--------v--+   +------v----+  +------v------+
     | Solver    |   | Custody   |  | Verification|
     | (submits  |   | Provider  |  | Oracle      |
     |  proof)   |   | (confirms)|  | (validates) |
     +-----------+   +-----------+  +-------------+
           \              |              /
            \             |             /
             +--- 3-of-3 multisig ----+
             |   Settlement trigger   |
             +------------------------+
```

---

## 8. Cross-Layer Composition

### The Full Intent Chain

The most powerful pattern is composing Layer 1 (acquisition) and Layer 2 (routing) into a single atomic intent:

```
"Acquire base1-4 PSA 10 at <= $42K from any marketplace,
 route it to Brink's NYC custody,
 total cost including route <= $43.5K,
 complete within 30 days."
```

This composite intent decomposes into:

```
Intent 1 (Acquisition, Layer 1):
  Lock: $42,000 (max card price) + $2,100 (fill fee @ 5%)
  Solver: marketplace solver
  Release: on verification at custody

Intent 2 (Route, Layer 2):
  Lock: $1,500 (max route cost: shipping + insurance + customs)
  Solver: route solver (might be same entity as acquisition solver)
  Release: on custody confirmation at Brink's
```

Both locks draw from the same Resource Lock pool. The RL Machine ensures total locked amount never exceeds available funds.

### Route-Aware Acquisition

With routes formalized, the vault agent can make smarter acquisition decisions:

**Before routes:** "This eBay listing in Germany is $38K. Oracle says $42K. Deal score: 9.5%. Buy it."

**After routes:** "This eBay listing in Germany is $38K. Route cost Germany→Brink's: $280 (shipping $45 + customs $0 + insurance $210 + intake $25). Total landed cost: $38,280. Deal score adjusted for route: 8.8%. Still a buy."

Another example with a worse route:

"This Cardmarket listing in Japan is $35K — looks like a deal. But route cost Japan→US: $1,800 (shipping $120 + customs $0 + insurance $350 + customs brokerage $150 + PSA reholder $75 + Brink's intake $25 + Japan export paperwork $80 + time-value of 21-day transit: $1,000). Total landed cost: $36,800. Deal score drops from 16.7% to 12.4%. Still viable, but the eBay DE listing at $38K with a $280 route is actually better landed."

**Route costs change the optimal solver.** A Courtyard listing at $41K with zero route cost ($41K landed) beats an eBay listing at $38K with $2K route cost ($40K landed) by only $1K — and the Courtyard fill settles in minutes vs. weeks.

### Dynamic Route Repricing

Route costs aren't static. They change based on:

- **Carrier rates:** Holiday surcharges, fuel surcharges, demand-based pricing
- **Grading turnaround:** PSA Economy goes from 45 days to 120 days during peak season
- **Customs policy:** Tariff changes, de minimis threshold changes
- **Insurance rates:** Spike after publicized theft/damage events
- **Currency rates:** EUR/USD, JPY/USD for international routes

The route pricing oracle updates continuously. Vault agents re-evaluate active intents when route costs change significantly.

---

## 9. Comparison: Crypto Routes vs Card Routes

| Dimension | Cross-Chain Token Route | Cross-Marketplace Card Route |
|-----------|------------------------|------------------------------|
| **Asset** | Fungible token (ERC-20) | Non-fungible physical object (graded card) |
| **Settlement** | Seconds to minutes (onchain) | Days to months (physical + verification) |
| **Verification** | Cryptographic (hash, signature) | Multi-tier (cert lookup, vision AI, physical) |
| **Reversibility** | Transactions are final | Marketplace returns, chargebacks, disputes |
| **Custody** | Self-custody (wallet) | Third-party custody (Brink's, PWCC) |
| **Double-spend risk** | Nonce manipulation | Intent cancellation during transit |
| **Fragmentation** | Balances across chains | Inventory across marketplaces + custody |
| **Route optimization** | Minimize gas + slippage + bridge fees | Minimize shipping + tax + service + insurance |
| **Solver capital lock-up** | Seconds | Days to weeks |
| **Edge costs** | Gas, bridge fee, LP fees | Shipping, customs, grading, insurance |
| **Composability** | Atomic cross-chain txns | Multi-hop physical movement with checkpoints |
| **State proof** | Merkle proof, ZK proof | Tracking number, custody receipt, cert verification |

### Where Card Routes Are Harder

1. **No atomic execution.** You can't "roll back" a physical shipment. Crypto routes can revert atomically; card routes require dispute resolution and insurance.

2. **Verification is probabilistic.** A ZK proof is 100% certainty. A vision verification is 95%+ certainty. Physical inspection is 99%+. There's always residual authentication risk.

3. **Solver capital is locked longer.** The equivalent of "solver fronts capital on destination chain" in crypto (seconds) is "solver buys card and ships it" in cards (weeks). This makes solver fill fees higher.

4. **Jurisdiction matters.** Cross-chain = different consensus mechanisms. Cross-marketplace = different legal jurisdictions with different consumer protection, tax, and customs rules.

### Where Card Routes Are Easier

1. **No MEV.** Physical card logistics have no miner/sequencer extractable value. Nobody can front-run a FedEx shipment.

2. **No gas volatility.** Shipping costs are predictable (carriers publish rate cards). Gas costs can spike 100x during network congestion.

3. **Established infrastructure.** FedEx, DHL, USPS are battle-tested logistics networks with tracking, insurance, and dispute resolution. Crypto bridges are nascent.

4. **Human fallback.** When onchain dispute resolution fails, there's nowhere to go. When card logistics fail, you sue in court (the vault is a Wyoming LLC with legal standing).

---

## 10. Implementation Architecture

### Phase 1: Route-Aware Acquisition (Modify Existing Vault Agent)

Extend the vault agent's deal scoring to include route costs:

```typescript
// Current deal scoring (from mechanism-design.md):
deal_score = (oracle_price - total_cost) / oracle_price * 100

// Route-aware deal scoring:
route_cost = estimateRouteCost(listing.origin_node, vault.custody_node, card_value);
landed_cost = listing.total_cost + route_cost;
deal_score = (oracle_price - landed_cost) / oracle_price * 100
```

This requires:
- Route cost estimator (edge pricing oracle)
- Origin node detection (which marketplace, which country)
- Vault custody node configuration

### Phase 2: Route Intent Registry (New Contract)

Deploy a RouteIntentRegistry alongside the existing IntentRegistry:

```solidity
interface IRouteIntentRegistry {
    function publishRouteIntent(
        bytes32 cardId,              // cert number hash or NFT token ID
        bytes32 originNode,
        bytes32 destinationNode,
        uint256 maxCostUsd,
        uint256 maxDurationDays,
        bytes calldata constraints   // ABI-encoded route constraints
    ) external returns (bytes32 routeIntentId);

    function claimRoute(
        bytes32 routeIntentId,
        bytes32 solverId,
        bytes calldata routePlan     // ABI-encoded hop sequence
    ) external;

    function confirmHop(
        bytes32 routeIntentId,
        uint8 hopIndex,
        bytes calldata proof         // delivery proof, receipt, etc.
    ) external;

    function settleRoute(bytes32 routeIntentId) external;
}
```

### Phase 3: Resource Lock Integration

Deploy RL-aware escrow that replaces static escrow for both acquisition and route intents:

```solidity
interface IResourceLockAccount {
    // Deposit USDC into RL pool
    function deposit(uint256 amount) external;

    // RL Machine creates a lock (requires RL Machine signature)
    function createLock(
        bytes32 intentId,
        uint256 amount,
        address solver,
        uint256 expiry,
        bytes calldata rlMachineProof
    ) external;

    // Release lock to solver (requires 2-of-3: solver proof + custody confirmation + oracle validation)
    function releaseLock(
        bytes32 intentId,
        bytes calldata solverProof,
        bytes calldata custodyProof,
        bytes calldata oracleProof
    ) external;

    // Auto-release on timeout (returns to RL pool)
    function timeoutRelease(bytes32 intentId) external;

    // Vault can withdraw unlocked funds after timelock
    function withdraw(uint256 amount) external;
}
```

### Phase 4: Route Solver Infrastructure

- Carrier API integrations (FedEx, DHL, USPS) for real-time quotes and tracking
- Grading service APIs (PSA, BGS cert verification + turnaround estimates)
- Custody provider APIs (Brink's, PWCC intake confirmation)
- Customs data (tariff schedules, de minimis thresholds by country pair)
- Route optimizer (shortest path with constraints on the logistics graph)

---

## 11. Risk Analysis

### Route Failure Modes

| Failure | Probability | Impact | Mitigation |
|---------|------------|--------|-----------|
| Card lost in transit | Low (~0.1% insured) | High | Insurance covers value; solver reputation hit |
| Card damaged in transit | Low-Medium (~0.5%) | High | Insurance; solver penalized if poor packaging |
| Customs seizure | Very low (<0.01%) | High | Customs broker; proper documentation; insurance |
| Grading service loses card | Very low | Catastrophic | PSA/BGS carry insurance; route lock includes grading risk premium |
| Seller ships wrong card | Medium (~2%) | Medium | Verification at first hop; marketplace buyer protection |
| Solver abandons mid-route | Low | High | Solver collateral slashed; card tracked via carrier API |
| Route cost exceeds estimate | Medium | Low | Lock includes buffer; solver absorbs overages (priced into fee) |
| Custody provider rejects card | Low | Medium | Pre-verification before shipping to custody |

### Resource Lock Specific Risks

1. **RL Machine compromise (TEE attack).** If the RL Machine is compromised, fake lock proofs could be issued. Mitigation: 3-of-3 settlement (solver + custody + oracle) means a compromised RL Machine can't steal funds — it can only create invalid lock proofs that won't settle.

2. **Lock griefing.** A solver claims a lock but never executes. Capital locked until timeout. Mitigation: solver collateral (slashed on timeout without fill); short timeout windows (7 days for same-country, 30 days for international).

3. **Oracle manipulation on route pricing.** Fake carrier quotes or grading fee misreporting. Mitigation: route pricing oracle uses published rate cards from carriers/graders, not user-submitted data.

4. **Partial route failure.** Card passes hop 1 but fails hop 2. Who bears the cost? Mitigation: per-hop settlement. Solver compensated for completed hops. Failed hop cost shared between solver (if solver's fault) and vault (if external factor).

---

## 12. Connections to Other SlabClaw Projects

### slabclaw-vaults

Routes are the logistics layer beneath vaults. The vault's `mechanism-design.md` describes settlement (Section 8) with three pathways — traditional, tokenized, and direct seller. Each pathway is a route. Resource Locks upgrade the escrow model in Section 4.2 from static to dynamic.

**Specific integration points:**
- Deal scoring (Section 1, Phase 3) gains route cost awareness
- Solver coordination (Section 3) gains cryptographic locks alongside pheromone signals
- Settlement pathways (Section 8) become formalized routes with per-hop verification

### slabclaw-token

The pre-grading prediction market (`pregrading-prediction-markets.md`) creates a natural route: raw card → grading → tokenization. The pgToken lifecycle IS a route:

```
[Collector] --submit--> [Pre-Grade Vault] --ship--> [PSA] --grade--> [Courtyard] --tokenize--> [pgToken settlement]
```

Resource Locks on this route ensure that:
- The raw card's capital lock persists through the entire grading pipeline (60-120 days)
- pgToken holders have credible commitment that the card is actually in the grading queue
- Grade resolution triggers settlement atomically across all pgToken positions

### slabclaw-app (Backend/Scan Pipeline)

The scan pipeline already discovers deals across marketplaces. Route-aware deal scoring means the pipeline needs to annotate each deal with its origin node and estimated route cost. The `v3_deals` table needs:

```sql
ALTER TABLE v3_deals ADD COLUMN origin_node TEXT;         -- "ebay-de", "tcgplayer-us", "courtyard"
ALTER TABLE v3_deals ADD COLUMN estimated_route_cost REAL; -- USD
ALTER TABLE v3_deals ADD COLUMN landed_cost REAL;          -- listing_cost + route_cost
```

### Windfall (Agent Economy)

Resource Lock Machines are infrastructure. Windfall's agent identity (ERC-8004) and settlement patterns apply directly:
- Route solvers need agent identities
- x402 protocol enables machine-payable route services (carrier APIs, customs brokers)
- Inference routing for route optimization models

### SWARM / Open House

Pheromone-based solver coordination from SWARM extends naturally to route solvers:
- Route pheromones: "PSA turnaround currently 45 days" (decaying signal)
- Carrier pheromones: "FedEx International Priority from DE→US taking 5 days average this week"
- Aggregation pheromones: "3 cards staging at solver facility in Dallas, heading to PSA — room for more"

---

## 13. Build Sequence

### Milestone 1: Route Cost Oracle
- Build edge pricing database (carrier rates, grading fees, customs thresholds, insurance rates)
- Expose API: `GET /routes/estimate?from=ebay-de&to=brinks-nyc&value=40000`
- Integrate into deal scoring in scan pipeline

### Milestone 2: Route-Aware Deal Scoring
- Modify vault agent deal scoring to include route costs
- Add `origin_node` and `landed_cost` to deal annotations
- Vault agent uses landed cost for acquisition decisions

### Milestone 3: Route Intent Registry
- Deploy RouteIntentRegistry contract (Base L2)
- Define hop types and release conditions
- Route solver registration and collateral

### Milestone 4: Resource Lock Account
- Deploy ResourceLockAccount contract
- Replace static escrow with dynamic RL pool for acquisition intents
- RL Machine service (initially centralized, TEE in future)

### Milestone 5: Route Solver Infrastructure
- Carrier tracking API integration (FedEx, DHL, USPS)
- Custody provider intake API (Brink's, PWCC)
- Grading service turnaround API (PSA, BGS)
- Route optimizer (constrained shortest path)

### Milestone 6: Cross-Layer Composition
- Composite intents (acquisition + route in one intent)
- Batch route aggregation (multi-vault PSA submissions)
- Per-hop settlement with 3-of-3 multisig

### Milestone 7: Full Resource Lock Machine
- TEE-backed RL Machine for fast lock allocation
- Semi-onchain RL accounts (2/2 multisig: vault + TEE)
- Timelock escape for vault sovereignty

---

## 14. Open Questions

1. **Who runs the Resource Lock Machine?** In CyberFund's framework, teams like OneBalance build the RL infrastructure. For SlabClaw, do we build our own RL Machine, or integrate with an existing one (OneBalance, LI.FI)? The onchain/card-specific portions (custody verification, cert lookup) are SlabClaw-specific, but the USDC lock/release mechanism is generic.

2. **How do we verify physical delivery onchain?** Carrier tracking APIs are offchain. We need an oracle that bridges "FedEx says delivered to Brink's address" into an onchain settlement trigger. Who runs this oracle? Options: Chainlink (generic), Brink's directly (trusted custody provider), a decentralized attestation network (overkill for now).

3. **Should route solvers be permissionless?** Marketplace solvers already have a reputation system and collateral requirements. Route solvers handle physical cards in transit — the trust requirement is higher. Early: permissioned (known logistics providers). Later: permissionless with high collateral.

4. **How do we handle cross-jurisdiction tax?** A card moving from Germany to the US has different tax implications than US to US. The route pricing oracle needs jurisdiction-pair tax tables. Who maintains this data? Manual curation initially; automated via customs API later.

5. **What's the minimum viable route?** The simplest useful route is "eBay US seller → Brink's NYC" (single hop, same country, known carrier). Start here. International routes, multi-hop routes, and grading routes are progressive complexity.

6. **How do aggregator solvers handle partial failures?** If an aggregator batches 10 cards for PSA and 2 fail grading (damaged in transit), how are the 8 successful cards settled independently of the 2 failures? The RL needs per-card sub-locks within the batch lock.

7. **Can route intelligence become a competitive moat?** If SlabClaw accumulates proprietary data on route costs, carrier reliability, grading turnaround times, and customs processing — this becomes a logistics intelligence moat that no other card platform has. The route pricing oracle is as valuable as the card pricing oracle.

---

## Sources

- **CyberFund, "Supercharging Intents: Resource Locks"** (Dogan Alpaslan, Jul 2025) — Core Resource Lock framework, RL Machine types, T+1 execution model, ERC-7702/7811 considerations
- **LI.FI, "Open Intents Framework"** — Intent value chain (order flow → expression → escrow → auction → fulfillment → verification → settlement), asset-first model, solver competition
- **LI.FI, "How Resource Locks Will Make Intents Scale"** — Practical application of Resource Locks to cross-chain transfers, solver capital efficiency, timing improvements
- **SlabClaw Vaults, `mechanism-design.md`** — Vault lifecycle, intent framework, escrow model, solver coordination, settlement pathways
- **SlabClaw Vaults, `CLAUDE.md`** — Architecture overview, intent format, marketplace solver specs, custody and verification tiers
- **ERC-7683** — Cross-chain intent standard (referenced by both LI.FI and CyberFund)
- **ERC-7702** — Account abstraction upgrade, "master key" limitation for semi-onchain Resource Locks
- **ERC-7811** — GetAsset proposal for Resource Lock-aware wallets
- **OneBalance** — Resource Lock Machine implementation (CyberFund portfolio company)
