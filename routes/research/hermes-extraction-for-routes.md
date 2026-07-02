# Hermes Hackathon → Routes: Durable Extraction

> Everything from the `hermes-hackathon/` corpus that is durably relevant to the Routes engine,
> mined 2026-07-01 (ROUTES-MECHANICS + ROUTES-PRD read in full; the other 12 docs digested by a
> parallel agent). Submission fluff (demo scripts, pitch/X copy, judge-tuning) excluded by scope.
> Companion to `routes-thinking-2026-07.md` (forward strategy) and `apify-x402-agentic-data-rail.md`.
>
> **The load-bearing fact:** the Hermes hackathon built Routes' money spine under the name
> "Acquisition Desk." Much of what follows is *real code + real onchain*, not spec.

---

## 1. What Routes IS, precisely (the definition to keep)

**Routes = a probabilistic card-state MDP policy solver.** `routes_plan(intent)` — a ~150-LOC
in-process bounded-expectimax TS tool (shipped as a Hermes plugin tool) that returns a **conditional
policy**, not a fixed path. It sits **between**:
- the **ERC-4626/7540 vault** (declares demand + escrows USDC), and
- the **ERC-7683 / IntentRegistry settler** (escrows each intent, settles each hop on `verifyFill`),

and it **feeds landed cost back into deal scoring**. Live in `services/routes-plan.ts` here.

The round-trip Routes spans: `DISCOVER → BUY below oracle → CUSTODY/SETTLE → LIST at oracle → SALE`.
`quoteAcquire` ranks on `landedCostUsd`; `quoteExit` maximizes `netProceedsUsd`.

## 2. The reality gap (what's real vs spec — do not overclaim)

| Piece | Status |
|---|---|
| Vault + registry escrow spine | **REAL** — `47/47` Foundry today → target `62 FLOOR / 78 core / 84 full` (CONTRACTS-ARCH §7) |
| Pregrading EV math (`raw-ev.mjs:computeGradingEV@110`) | **REAL** (the one already-running piece) |
| Spread detector over live oracle (`spread-detector.ts`, 10+ marketplaces) | **REAL** — net-new TS over the live SlabClaw oracle |
| Tokenized round-trip (Seaport buy+list on Base/Polygon) | **REAL mechanism**, mainnet write unproven |
| `routes_plan` MDP planner | **REAL code** (`routes-plan.ts`), design from the 917-line doc |
| The 917-line `resource-locks-and-routes.md` route/lock design | **SPEC — zero code originally**; being activated incrementally |
| Per-hop `RouteLock`/`HopLock` independent settlement | **SPEC** (single-shot IntentRegistry escrow is the shipped FLOOR) |

## 3. The graph model (nodes, edges, worked routes)

- **8 node types**: marketplaces, custody vaults, grading services, tokenization platforms (+ the
  location subtypes). Nodes = where a card can be.
- **Edges** carry a cost vector `[shipping, tax, service_fee, insurance]` **plus** `duration`, `risk`,
  and `availability`. Today `services/fees.ts` implements only a flat `DEFAULT_FEES` — the real edge
  weights are the moat and are **not yet populated** (see thinking-doc move ①).
- The design doc works **routes A–D** with concrete example costs (raw→grade→tokenize, buy-tokenized→
  relist, physical cross-custodian, etc.) — the reference for `routes-plan.ts` cost math.
- **Routing problem**: minimize a chosen objective (`min-cost` | `max-risk-adjusted-ev`,
  `routes-plan.ts:ObjectiveType`) over a stochastic graph where the **Grade edge branches** on the
  grading outcome distribution (`raw-ev.mjs:getGradeDistribution@77`).

## 4. Resource locks & contracts (the onchain layer)

**`RoutesResourceLock.sol`** (arbiter-free fork of the Base-verified `agent-escrow-protocol`,
repo `github.com/Agastya910/agent-escrow-protocol`, onchain `0x6AC844…`; cyber•Fund RLM backbone):
- `createLock(hopId, amount, ReleaseCondition, deadline)` → `completeLock(hopId, proof)` (release −
  fee-skim, +1 reputation) → `disputeLock(hopId)` (freeze, −1 reputation). Reputation map feeds
  `SolverRegistry`.
- **`ReleaseCondition` enum (7)**: `SECRET_HASH, TIME_LOCK, MULTISIG, ORACLE_RESULT,
  CROSS_CHAIN_PROOF, LLM_OUTPUT_HASH, API_WEBHOOK`. **4 live** on single-chain Base 8453
  (TIME_LOCK / MULTISIG / ORACLE_RESULT / API_WEBHOOK); `SECRET_HASH` + `CROSS_CHAIN_PROOF` deferred.
  `ORACLE_RESULT` backed by Chainlink Proof-of-Reserve.
- ⚠️ **Open item**: `RoutesResourceLock` + the OIF fork require a `trailofbits-supply-chain-risk-auditor`
  pass **before vendoring**.

**`Registry7683Adapter.sol`** (ERC-7683 over kept escrow) — order struct
`AcquisitionOrderData{vault, productIdHash, maxPriceUsd, quantity, targetGrade, targetGraderHash,
shippingTo}`; `SLABCLAW_ACQUISITION_TYPE = keccak256("SlabClawAcquisitionV1")`; single-chain
`originChainId == destChainId == 8453`; named assumption `"slabclaw.physical-verification"`.

**`IntentRegistry.sol` (KEPT internals):** `publishIntent@96` (escrow pull `safeTransferFrom` @109,
USDC 6dp), `submitFill@152` (reverts `IntentAlreadyFilled@158`), `verifyFill@183` (`onlyOwner`),
`cancelIntent@132`, `getActiveIntents@224`.
- **The real fund-loss bug** = solver-auth: `IntentRegistry.sol:196` pays **any `msg.sender`**. Fixed
  by OZ `SignatureChecker.isValidSignatureNow` (EOA+ERC-1271) + `SolverRegistry.isAuthorized` +
  `submitNonce` replay guard.
- The `verifyFill` **CEI reorder** (move `intent.status=Filled@199-201` before `safeTransfer`) is
  **hygiene / defense-in-depth, NOT fund-loss** (it's already `nonReentrant`) — do not label it a
  live exploit.

**`SlabClawVault` v2** — ERC-4626 (OZ base) + ERC-7540 async-redeem + **inflation guard**
(`_decimalsOffset()=6`, kills first-depositor donate-to-inflate). `nav()@154` math KEPT as
`totalAssets()`. `supportsInterface` true for `0xe3bc4e65 / 0x620ee8e4 / 0x2f0a18c5 / IERC4626 /
IERC165`, **false for `0xce3bbe50`** (async deposit not advertised). The two direct fund-loss
findings = inflation guard + `updateCardValue` access control (the FLOOR).

**Fee invariants**: `depositorFeeBps + marketplaceTakeBps ≤ 1000`; `mgmtCarryBpsYr ≤ 55`.
Demo fee args: `managementFeeBps 150` (1.5%/yr), `fillFeeBps 200` (2%).

**Test-count breakdown** (canonical = CONTRACTS-ARCH §7): FLOOR **62** = Vault 32 + IntentRegistry 16
+ SolverAuth 6 + VaultFactory 8; **core 78** (+Redeemable7578 8 +Adapter 8); **full 84**
(+RoutesResourceLock 6); OIF TS/vitest = 4 separate. OZ **v5.6.1** (accept ≥v5.6.0).

**Trust caveat**: NAV offset-6 does **NOT** bound `totalCardValue` operator manipulation —
trusted-operator-only until Chainlink Data Feeds ships.

## 5. The MarketplaceAdapter interface (the integration contract)

`SPEC.md §3.2.2` — every venue implements: `quoteAcquire` / `quoteExit` / `acquire` / `list` /
`confirmSale`. Mapping (from ROUTES-MECHANICS §9):

| Method | Beezie (Base) | Courtyard (Polygon) | eBay (physical) |
|---|---|---|---|
| `quoteAcquire` | ask + ~8% take + cents gas; `custody:onchain-base`; `crossChain:false` | ask + OpenSea/creator fee + CCTP/LI.FI bridge; `crossChain:true` | ask + Stripe-Issuing fee + `shipToCustodyUsd`; `settlementRail:stripe-fiat` |
| `quoteExit` | relist-in-place same Base venue, `sellFee≈8%` | OpenSea-Polygon (fee) vs Courtyard-native (0%) | Sell-Inventory vs PSA-consignment; `crossCustody` on move |
| `acquire` | Seaport `fulfillAdvancedOrder` (must NOT use `fulfillBasicOrder` — orderType 2 needs SignedZone extraData) | same on `matic` | capped Stripe Issuing card via browser checkout |
| `list` | `setApprovalForAll` once → `createListing` (gas-free signed order) | seaport-js `createOrder` → POST OpenSea | Sell-Inventory (needs USER token) or PSA consignment |
| `confirmSale` | poll order status / transfer event → realized P&L | same on Polygon | Sell Fulfillment `getOrders` |

Verified adapters in `slabclaw-app/backend/src/`: `beezie-opensea.mjs:15-21` (collection `beezie-base`,
`0xbb5ec6…ca16f`, Base, USDC), `courtyard.mjs:14-18` (`courtyard-nft`, `0x251be3…dcad`, matic),
`ebay-registry.mjs:56-104` (Browse dual-sort 200-cap defeat), `ebay-auth.mjs:38-75` (client-creds
OAuth ~2h), `turnstile.mjs:1-40` (in-house CF solver).

## 6. Hard constraints that reshape the design (the honest reality)

1. **Tokenized cards are chain-bound islands.** No API and no token bridge moves the ASSET
   cross-custodian; redeeming **burns** the token. Cross-marketplace tokenized arb is **structurally
   blocked** — Beezie(Base) and Courtyard(Polygon) vault NFTs cannot be wrapped/bridged and stay
   redeemable. **Only USDC bridges** (Circle CCTP, Base↔Polygon 1:1). Cross-custodian movement =
   **physical only**: eBay-bought card → ship to Courtyard intake (`35 Industrial Blvd STE 3, New
   Castle DE 19720`) → tokenize (~1–2wk mint, vault scans twice/week).
2. **Per-leg autonomy is non-uniform.** Beezie = fully autonomous (Seaport). Courtyard buy/list =
   autonomous, but tokenize = human ship + US-only KYC, 1–2wk. eBay = READ autonomous, WRITE
   browser-driven (Buy Order API is Limited-Release, unavailable on our creds), settlement is **fiat**
   (Stripe Issuing capped card), never USDC.
3. **The oracle is a suspect.** Tier + freshness gated, grade-MATCHED always. `spread-decision.ts`
   converses (asks) when oracle is thin/stale or edge ambiguous rather than auto-running.
4. **The spend wallet is the agent signer `0x232b0056…` (NOT the verifier `0x3D70…`).** Gated ONLY by
   `policy.yaml` cap (`per_card` + rolling `window`) + `kanban_block` HITL — the **D11 model**: in-cap
   BUY/LIST commit autonomously with zero taps; the cap is the *only* firebreak; human steps remain
   only on cap-unbounded legs (physical ship-out, one-time KYC, one-time eBay OAuth consent).
   ⚠️ Per SlabClaw memory `feedback_human_gate_must_be_enforced`, the cap must be enforced in the
   `acquire()`-code-path (block-or-commit before staging), fail-closed — not narrated.

## 7. The rails (settlement)

- **Tokenized buy**: Seaport tx in USDC directly from the agent wallet (NOT x402 — x402 settles HTTP
  resources, not NFT trades). Cross-chain USDC: Circle CCTP native burn-and-mint; fallback LI.FI SDK
  (`@lifi/sdk 3.16.3`), or pre-fund Polygon USDC.
- **x402 on Base** = the rail for **agent-to-API / Routes resource-lock settlement** (`@x402/fetch`
  `wrapFetchWithPaymentFromConfig` + `ExactEvmScheme` on `eip155:8453`; CDP facilitator
  `api.cdp.coinbase.com/platform/v2/x402`). PayGuard (`nativ3ai/hermes-payguard`) over `@x402/*@2.14.0`
  is the spend guardrail. **← this is the exact rail the Apify data-rail rides (see companion doc).**
- **eBay fiat buy rail**: agent spends USDC via Bitrefill/x402 on Base → eBay gift card (checkout-
  redemption code, not balance-load), OR a capped Stripe Issuing virtual card (test-mode kept). **US
  card ↔ US account region gotcha** (Spain account can't redeem US cards). Depositor payout = onchain
  USDC. (SlabClaw memory `reference_bitrefill_ebay_checkout_redemption`, `EBAY-BUY-RAIL.md`.)

## 8. Physical-goods economics (the viability evidence)

From `PHYSICAL-GOODS-ECONOMICS.md` — the numbers that make Routes productizable, not a lottery:
- Worked SKU **Base Set Charizard #4 Unlimited**: cost basis ~$452/card (raw $296.62 + ~$152 grade+
  ship). **EV/cycle ≈ $3,676 net (~8.1×)**; capital locked ~25–55 days.
- **Ex-PSA-10-tail EV ≈ $953 net (~2.1×)** — *positive-EV at the median, not just the tail.*
- Blastoise #2 (basis ~$242): EV ≈ $1,033 net (~4.3×).
- **Competitive thesis**: every incumbent (Courtyard "0% seller," Phygitals "zero-fee," Beezie 6%,
  Collector Crypt 2%) is a **sole market-maker** taxing a hidden **10–15% buyback spread** dressed as
  "free." Nobody runs a **competed sourcing layer**. Multi-solver auction compresses that spread and
  shares it with depositors. 4K/RealWorld validated the guardian/solver-fee model but died on
  liquidity — the lane is open.
- **Binding constraint**: grading latency (PSA Value tiers PAUSED since 2026-06-02, ~10M-card backlog)
  — why the vault is ERC-7540 async-redeem, and why the tokenized arb round-trip (instant, both legs
  onchain) is what books a real profit *inside* a demo window.

## 9. Reuse pull-list (installed deps / primitives already in hand)

From `REUSE-MINING.md` / `STACK-DECISION.md` — do NOT rebuild these:
- **Shippo first-party MCP** (`@shippo/shippo-mcp`) — `rate → label(SAMPLE) → track` as native tools →
  the source of real shipping edge weights for the cost oracle.
- **Base MCP** (wallet + contract-write + EIP-5792 batch), **`awal` CLI** (signs, `0x232b…`), **CDP**
  (facilitator/off-ramp), **evalanche MCP** (non-custodial multi-EVM wallet under x402).
- **OIF solver fork** (`BootNodeDev/intents-framework` `typescript/solver/`, Apache-2.0, Hyperlane
  stripped) — `acquisition7683/` solver.
- **Stripe agent-toolkit** (`rk_test_*` earn rail), **Nemotron 3 Ultra** (buy/skip BRAIN, TEXT-ONLY,
  `integrate.api.nvidia.com/v1`) + **Nano-2-VL** (verifyFill vision).
- **Courtyard Proof-of-Integrity** identity key `keccak256(fingerprint, salt)`, fingerprint =
  `Graded Pokemon TCG | TAG {cert} | {set/year/name/#} | {grade}` — ~2 lines Solidity; the tokenId
  IS the card's tamper-evident fingerprint.

## 10. The command-center UI (if Routes ships a surface)

`routes.html` served by the same `serve.mjs` process that serves `/vaults` (no separate `:3410`
gateway — that was never in the verified server map; use `PORT=3459` pm2 `routes-api` for an isolated
instance). Reuses `sc-components.js` `buildNav()`/orb chrome. API: `/api/routes/policy/:intentId`,
`/api/routes/stream` (SSE), `/api/routes/{events,execute}`. ⚠️ SlabClaw memory
`feedback_human_gate_must_be_enforced`: `/api/routes/execute` was caught **open** — the resolve
chokepoint must enforce auth and fail closed.

## 11. Consolidated open TODOs inherited by Routes

(Superset of `ROUTES-MECHANICS.md §10`, folded into `routes-thinking-2026-07.md §3`.)
1. Beezie mainnet `fulfillAdvancedOrder` + `createListing` write proof.
2. Courtyard Polygon buy/list proof (fulfillment_data → seaport-js).
3. One small CCTP/LI.FI Base→Polygon USDC transfer (confirm landed amount for `crossChain` math).
4. eBay buyer session + capped Stripe Issuing card + camofox reaches "Confirm and pay".
5. eBay Sell Inventory USER token (auth-code + one-time consent; NOT business-unit-gated).
6. keep-vaulted boolean read from checkout DOM + net-exit recompute when the eBay glitch drops it.
7. **Cap-guard enforced in the `acquire()` code path, fail-closed** (the only firebreak).
8. **Populate the route-cost oracle with real edge weights** (the moat — flat `fees.ts` today).
9. `trailofbits-supply-chain-risk-auditor` pass on `RoutesResourceLock` + OIF fork before vendoring.
10. Chainlink Data Feeds for NAV (removes trusted-operator `totalCardValue` assumption).
11. Apify-over-x402 as metered DISCOVER fallback + T1-comp enrichment (companion doc).

---

*Sources: `hermes-hackathon/` — ROUTES-MECHANICS, ROUTES-PRD, ROUTES-DESIGN, ROUTES-UI-DESIGN-BRIEF,
VAULTS-ROUTES-DOSSIER, PHYSICAL-GOODS-ECONOMICS, EBAY-BUY-RAIL, CONTRACTS-ARCH, HACKATHON-LEARNINGS,
REUSE-MINING, RWA-REUSE-AND-VISION, CORRECTED-PRIORS, FINAL-SPEC, MAINNET-RUN-PLAN, SPEC, STACK-DECISION.
Code anchors in `slabclaw-app/backend/src/` and `slabclaw-vaults/`. Verified 2026-07-01.*
