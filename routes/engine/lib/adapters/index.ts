/**
 * RING 2 — Pluggable sponsor adapter interfaces (the clone-able contract).
 *
 * The product layer (RING 3) imports ONLY these interfaces — never a sponsor SDK
 * directly. Swap an implementation via env/config, not by editing product code:
 *   NVIDIA hosted ↔ self-hosted NIM, Stripe test ↔ live, x402 testnet ↔ mainnet,
 *   our vault ↔ your own ERC-4626. That is what makes a stranger able to clone
 *   this repo, replace RING 3, and keep the Hermes + sponsor plumbing.
 *
 * Every capability here traces to a downloaded primary source under
 * vendor reference docs  (cited inline). No claim that can't be cited.
 * See HERMES-TEMPLATE-ARCHITECTURE.md §2 for the full rationale + overclaim guards.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 2.1 NemotronAdapter — NVIDIA inference (BUY/SKIP decision + grade/cert match)
//   Sources: vendor primary docs, nano-12b-v2-vl-modelcard.md,
//            nemotron-3-super-120b-modelcard.md (real model on build.nvidia.com)
// ─────────────────────────────────────────────────────────────────────────────

export interface NemotronSpreadInput {
  productName: string;
  grade: string;
  grader: string;
  askPriceUsd: number;
  oracleValueUsd: number;
  spreadPct: number;
  popCount?: number;
  liquidityNote?: string;
}

export interface NemotronVerdict {
  verdict: "BUY" | "SKIP";
  confidence: number; // 0..1
  rationale: string;
  raw: string; // provenance — the model's literal response
}

export interface NemotronGradeInput {
  slabImg: string; // base64 or data: URL  (JPG/PNG/WEBP — modelcard input formats)
  digImg: string; // base64 or data: URL  (the TAG public DIG report image)
  expected?: { cert?: string; card?: string; grade?: string };
}

export interface NemotronGradeMatch {
  /**
   * Document/label OCR cross-match ONLY — confirms the printed cert text agrees
   * across the two supplied images. NOT biometric, NOT a re-grade, NOT counterfeit
   * detection. (Overclaim guard — vendor primary docs)
   */
  match: boolean;
  fields: { cert?: string; card?: string; grade?: string };
  mismatches: string[];
  confidence: number; // 0..1
  raw: string;
}

export interface NemotronAdapter {
  /** BUY/SKIP — text-only mode of the VLM ("a VLM behaves exactly like a text-only LLM"). */
  decideBuy(spread: NemotronSpreadInput, opts?: { reason?: boolean }): Promise<NemotronVerdict>;
  /** Grade/cert match — multi-image OCR+VQA (slab label vs cert/DIG report; up to 4 imgs @1k×2k). */
  verifyGrade(input: NemotronGradeInput): Promise<NemotronGradeMatch>;
}

export interface NemotronConfig {
  baseUrl: string; // 'https://integrate.api.nvidia.com/v1' (hosted) OR 'http://0.0.0.0:8000/v1' (self-hosted NIM)
  apiKey: string; // 'nvapi-...' hosted; 'not-used' for local NIM
  modelId?: string; // default 'nvidia/nemotron-nano-12b-v2-vl' (VLM, for verifyGrade)
  textModelId?: string; // BUY/SKIP reasoning model; default 'nvidia/nemotron-3-super-120b-a12b'
}

// ─────────────────────────────────────────────────────────────────────────────
// 2.2 StripeAdapter — fiat depositor rails (Connect onboarding + payouts + agent spend)
//   Sources: vendor primary docs, payouts-connected-accounts.txt,
//            payouts-overview.txt, agent-toolkit-github.txt
//   Overclaim guards: Express = demo path (deprecated for new platforms); payouts are
//   NOT instant by default (1–2 business days); build test-mode first (sk_test_/rk_test_).
// ─────────────────────────────────────────────────────────────────────────────

export type PayoutStatus = "pending" | "in_transit" | "paid" | "failed" | "canceled"; // verbatim vendor primary docs

/** A tool surfaced by @stripe/agent-toolkit for the Hermes agent to call (attenuated by a restricted key). */
export interface AgentTool {
  name: string;
  description: string;
  // Tool-call schema is toolkit-defined; kept opaque so the product needn't import the SDK.
  [k: string]: unknown;
}

export interface StripeAdapter {
  // Connect — depositor fiat onboarding (KYC performed BY Stripe, hosted)
  createConnectedAccount(i: { depositorId: string; country: string; email: string; type?: "express" | "custom" }): Promise<{ accountId: string }>;
  getOnboardingLink(i: { accountId: string; returnUrl: string; refreshUrl: string }): Promise<{ url: string }>;
  getAccountStatus(i: { accountId: string }): Promise<{ chargesEnabled: boolean; payoutsEnabled: boolean; requirementsDue: string[] }>;
  // Payouts — pay depositors their proceeds
  payoutToDepositor(i: { accountId: string; amount: number; currency: string; method?: "standard" | "instant"; idempotencyKey: string }): Promise<{ payoutId: string; status: PayoutStatus }>;
  getPayoutStatus(i: { payoutId: string; accountId: string }): Promise<{ status: PayoutStatus; failureCode?: string; arrivalDate?: number }>;
  handleWebhook(rawBody: Buffer, sig: string): Promise<{ type: string; payoutId?: string; status?: PayoutStatus }>;
  // Agent commerce — what the Hermes agent may spend (restricted-key gated)
  getAgentTools(): Promise<AgentTool[]>;
  agentSpend(i: { sellerAccount?: string; amount: number; currency: string; maxAmount?: number; expiresAt?: number; description: string }): Promise<{ paymentIntentId: string; status: string }>;
}

export interface StripeConfig {
  secretKey: string; // sk_test_* first; sk_live_* only after the full loop passes end-to-end
  restrictedAgentKey?: string; // rk_test_* / rk_* — attenuated key for the agent toolkit
  webhookSecret?: string;
  mode?: "test" | "live"; // default 'test'
}

// ─────────────────────────────────────────────────────────────────────────────
// 2.3 X402Adapter — onchain USDC micropayments (Base Sepolia first)
//   Sources: vendor primary docs, cdp-x402-how-it-works.md,
//            cdp-x402-quickstart-sellers.md, x402-core-types-extract.d.ts
//   Overclaim guards: keyless facilitator is Base-Sepolia ONLY; facilitator is
//   non-custodial (NOT escrow — escrow is the separate IntentRegistry contract);
//   settle() is spec'd + simulated today, not yet shipped in engine/.
// ─────────────────────────────────────────────────────────────────────────────

export type X402Network = "eip155:8453" /* Base mainnet */ | "eip155:84532" /* Base Sepolia */;

export interface SettleReceipt {
  success: boolean;
  token: "USDC";
  amountUsd: number;
  network: "Base" | "Base Sepolia";
  txHash: string;
  explorerUrl: string; // basescan.org/tx/<hash> | sepolia.basescan.org/tx/<hash>
  payer?: string;
  settledAt: string; // ISO
}

export interface X402Adapter {
  settle(o: { amountUsd: number; to: `0x${string}`; network?: X402Network; scheme?: "exact" | "upto"; memo?: string }): Promise<SettleReceipt>;
  /** Buyer-side fetch that auto-pays HTTP 402 challenges (@x402/fetch). */
  payingFetch(): typeof fetch;
  /** Parse/validate a raw facilitator settle response into a receipt. */
  verifyReceipt(raw: unknown): SettleReceipt;
}

export interface X402Config {
  facilitatorUrl: string; // 'https://x402.org/facilitator' (keyless, Sepolia-only) | CDP url
  network?: X402Network; // default 'eip155:84532'
  cdpApiKeyId?: string; // required only for the CDP facilitator (mainnet/testnet)
  cdpApiKeySecret?: string;
  signerPrivateKey?: string; // buyer-side signer for EIP-3009 TransferWithAuthorization
}

// ─────────────────────────────────────────────────────────────────────────────
// 2.4 VaultAdapter — ERC-4626 tokenized vault (point at YOUR own vault)
//   Reference impl: contracts/src/SlabClawVault.sol (ERC-4626, 121/121 Foundry,
//   deployed Base Sepolia). Real-money rule: exercise deposit/redeem on Sepolia first.
// ─────────────────────────────────────────────────────────────────────────────

export interface VaultAdapter {
  deposit(i: { assetsUsd: number; receiver: `0x${string}` }): Promise<{ shares: bigint; txHash: string }>;
  redeem(i: { shares: bigint; receiver: `0x${string}`; owner: `0x${string}` }): Promise<{ assetsUsd: number; txHash: string }>;
  previewYield(i: { owner: `0x${string}` }): Promise<{ assetsUsd: number; sharePrice: number }>;
  totalAssets(): Promise<{ assetsUsd: number }>;
}

export interface VaultConfig {
  vaultAddress: `0x${string}`; // your deployed ERC-4626
  assetAddress: `0x${string}`; // the underlying (e.g. USDC / MockUSDC)
  chainId: 8453 | 84532; // Base mainnet | Base Sepolia
  rpcUrl: string;
  signerPrivateKey?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2.5 OracleAdapter — the value-truth, but the SUSPECT (RING-3 swap boundary)
//   The grade-matched PriceCharting tier engine → fair value per product×grade is
//   the value-truth source. P3: the orchestration READS it behind this adapter and NEVER
//   recomputes it; it must reason confidence-tier-aware (T1 sold-3+ ≫ T6 eBay-active)
//   and freshness-gated — never treat an oracle number as gospel. Down-weight / flag
//   low-tier or stale values. (.4;
//   the oracle is the suspect, not ground truth.)
//   Swap this to point at your own value source; the engine stays oracle-agnostic.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Oracle confidence tier — the hierarchy the orchestration ranks on (highest first).
 * Real grader-matched data (even thin) always beats estimates. Verbatim from the
 * Oracle Hierarchy v3.4: T1 pc_sold (3+ grader-matched sold, 30d) is the
 * gold standard; T6 ebay_active (lowest active listing) is the weakest fallback; T7
 * manual is user-entered last resort. A cloner MUST down-weight low tiers.
 */
export type OracleTier =
  | "pc_sold" // T1 — grader-matched sold avg, 3+ sales, 30d window (gold)
  | "pc_sold_thin" // T2 — grader-matched sold avg, 1–2 sales, 30d
  | "pc_grader_est" // T3 — PSA sold avg × grader multiplier
  | "pc_last" // T4 — grader-matched last sale, 30d
  | "pc_last_est" // T5 — PSA last sale × grader multiplier
  | "pc_display" // T5.5 — PriceCharting computed display price
  | "pc_grade_equiv" // T5.7 — half-grade equivalence
  | "pc_last_stale" // T5.8 — last sale beyond freshness window
  | "ebay_active" // T6 — eBay Browse lowest active listing (weak)
  | "manual" // T7 — user-entered fallback
  | "vault_auction" // T8 — SlabClaw Vault token-gated auction clearing price (self-referential; weakest, gap-fill only)
  | "vault_fill"; // T8 — SlabClaw Vault acquisition floor (weaker still; never a clearing comp)

/**
 * Freshness state of an oracle value. The orchestration MUST gate on this: a stale
 * value is down-weighted/flagged, never treated as gospel (P3 freshness-gated).
 * Window is 30d fresh (SOLD_FRESHNESS_MS, pricecharting.mjs); >365d is hard-stale.
 */
export type OracleFreshness = "fresh" | "stale" | "stale_hard"; // fresh ≤30d · stale >30d · stale_hard >365d

/**
 * One product×grade value record the orchestration reads. Carries enough provenance
 * for confidence-tier-aware + freshness-gated reasoning WITHOUT recomputing the oracle source.
 * (Audit H1/L1: the return shape MUST carry tier/source + confidence + freshness.)
 */
export interface OracleRecord {
  productId: string;
  grade: string;
  grader: string;
  oraclePrice: number; // fair value (USD) for this product×grade
  oracleSource: OracleTier; // which tier produced it — rank/down-weight on this
  oracleConfidence: number; // 0..1 derived from tier × sold-count × freshness
  oracleSoldCount?: number; // # of grader-matched comps behind the value (thin if 1–2)
  graderMatched: boolean; // true = real grader-matched data (always beats estimates)
  freshness: OracleFreshness; // fresh / stale / stale_hard — gate on this
  updatedAt: string; // ISO timestamp the value was last computed
  stale: boolean; // convenience flag (freshness !== 'fresh')
  oracleUrl?: string; // the PriceCharting page the value derives from (provenance)
}

/**
 * The inputs the BUY/SKIP brain needs from the oracle for ONE candidate spread —
 * the value-truth side of NemotronSpreadInput, sourced ONLY through this adapter.
 */
export interface OracleInputs {
  productId: string;
  grade: string;
  grader: string;
  oracleValueUsd: number;
  oracleSource: OracleTier;
  oracleConfidence: number; // 0..1
  oracleSoldCount?: number;
  graderMatched: boolean;
  freshness: OracleFreshness;
  oracleUrl?: string;
}

export interface OracleAdapter {
  /**
   * Read the oracle source's fair-value records (optionally scoped to one product). The
   * orchestration ranks/down-weights on oracleSource (tier) + freshness — it NEVER
   * recomputes the value. Returns [] when the oracle has no value for the scope.
   */
  getDeals(productId?: string): Promise<OracleRecord[]>;
  /** The value-truth inputs for ONE product×grade, for the BUY/SKIP decision. */
  getOracleInputs(i: { productId: string; grade: string; grader: string }): Promise<OracleInputs | null>;
}

export interface OracleConfig {
  apiUrl: string; // 'https://api.slabclaw.com' — the oracle endpoint
  apiKey?: string; // optional auth for the private oracle
  freshnessMs?: number; // default 30d (SOLD_FRESHNESS_MS) — the fresh/stale boundary
}

// ─────────────────────────────────────────────────────────────────────────────
// 2.5b DealsAdapter — the DEAL-SOURCE (the under-oracle listing feed, RING-3 swap)
//   The deal feed is the cross-marketplace aggregation (10+ venues → one record per
//   live listing, joined to the oracle value-truth). The orchestration READS candidate
//   listings through this adapter; it NEVER hand-rolls a `fetch` to the deal endpoint.
//   This is the deal-side twin of OracleAdapter: swap it to point at YOUR own listing
//   source (your scraper fleet, a partner feed, a fixture) and the engine stays
//   deal-source-agnostic. The mock makes the whole loop runnable zero-network (D19).
//
//   SEPARATION OF CONCERNS (P3): the DealsAdapter supplies the ASK side (the listing:
//   venue, price, grade, liveness) PLUS the oracle's provenance carried alongside each
//   listing (oracleSource tier / confidence / freshness) — it does NOT recompute the
//   value-truth. The OracleAdapter is the canonical value-truth read; the DealsAdapter
//   carries the same fields verbatim so the phantom-guard + spread math have one record
//   to reason over.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One cross-marketplace deal record — a live under-oracle listing joined to its
 * grade-matched oracle value-truth + provenance. This is the EXACT shape the
 * phantom-guard + spread math consume (the detector's `DealRecord`), declared here so
 * the deal source becomes a swappable RING-2 contract. Every field is read, none is
 * recomputed by the orchestration (P3).
 */
export interface DealRecord {
  cardId?: string; // SlabClaw product identity (join key to the oracle)
  id?: string; // venue-native listing id (fallback identity)
  name?: string;
  set?: string;
  // ── ASK side (the listing) ──
  listingPlatform?: string; // buy venue (ebay / cardmarket / beezie / …)
  listingPrice?: number; // $A — the under-oracle ask
  listingGrade?: string; // the listing's grade (must grade-match the oracle)
  listingUrl?: string | null; // provenance
  // ── VALUE-TRUTH side (the oracle, carried verbatim — never recomputed, P3) ──
  oraclePrice?: number; // $B — grade-matched fair value
  oracleSource?: string; // the tier that produced it (pc_sold T1 … ebay_active T6)
  oracleConfidence?: string; // 'high' | 'medium' | 'low'
  oracleUrl?: string | null; // the PriceCharting page the value derives from
  oracleSoldCount?: number | null; // # grader-matched comps (thin if 1–2)
  pcSoldCount?: number | null; // legacy sold-count field (fallback)
  spreadGrade?: string; // the grade the oracle priced (grade-match gate)
  stale?: boolean; // freshness flag — gate on this (P3)
  variant?: string | null;
  grader?: string;
  grade?: string; // the listing's grade token (feed field; companion to grader)
  dataAgeHours?: number; // freshness provenance (how old the value is)
  // ── derived deal metrics (carried verbatim from the feed) ──
  discount?: number; // % the ask sits under oracle (positive; e.g. 55 = 55% below). Quality floor gates on this.
  spread?: number; // signed spread % (≈ -discount); used as a fallback for the quality floor
}

/**
 * Scope a deal read to a product / grade / venue / price band (the arbitrage filter:
 * keep ask < oracle). All fields optional — an empty query reads the whole live feed.
 */
export interface DealQuery {
  productId?: string; // join to the oracle product identity (cardId)
  grader?: string;
  grade?: string;
  maxAskUsd?: number; // keep ask under this (the arbitrage band)
  limit?: number;
}

export interface DealsAdapter {
  /**
   * Read live under-oracle deal candidates (multi-marketplace, liveness-checked, joined
   * to the oracle value-truth). Optionally scoped by `DealQuery`. Returns [] when the
   * feed has no candidates for the scope. The orchestration NEVER hand-rolls a `fetch`
   * to the deal endpoint — it reads through this adapter (the RING-2 seam).
   */
  getDeals(query?: DealQuery): Promise<DealRecord[]>;
}

export interface DealsConfig {
  apiUrl: string; // 'https://api.slabclaw.com' — the cross-marketplace deal feed endpoint
  apiKey?: string; // optional auth for the private feed
  timeoutMs?: number; // network timeout (default 20s)
}

// ─────────────────────────────────────────────────────────────────────────────
// 2.6 MarketplaceAdapter — the BUY/LIST/MOVE surface across venues + custodians
//   Sources: ROUTES-MECHANICS.md §1–§9 (the no-handwave route playbook), SPEC.md
//   §3.2.2 (quoteAcquire/quoteExit/acquire/list/confirmSale + overclaim guards).
//   Verified drivers: beezie-opensea.mjs, courtyard.mjs, courtyard-marketplace.mjs,
//   ebay-registry.mjs/ebay.mjs/ebay-auth.mjs, turnstile.mjs.
//
//   Routes sits across BUY+LIST: quoteAcquire ranks on landedCostUsd; quoteExit
//   maximises netProceedsUsd (relist-in-place vs move-venue). Each leg runs a 3-tier
//   execution stack — PRIMARY (onchain/api) → BROWSER fallback (toolbox) → HUMAN-GATE.
//
//   OVERCLAIM GUARDS (do not imply more than the mechanics allow):
//   - acquire/list are NOT pure synchronous calls for eBay (and tokenized BUY under
//     the demo posture): they return a STAGED intermediate and surface a human-gate
//     before the irreversible commit (ROUTES §9 — staged → approved → committed).
//   - Cross-custodian movement of the ASSET is PHYSICAL-ONLY (ship + KYC + weeks);
//     there is NO token-bridge between vault custodians (redeem BURNS the token —
//     Beezie/Courtyard vault NFTs are chain-bound islands). Only the SETTLEMENT
//     CURRENCY (USDC via CCTP) is cross-chain, never the asset (ROUTES §5.1).
//   - initiateCustodyMove is therefore async + multi-day for physical legs; it returns
//     a tracked handle the orchestration polls (re-injecting {goal, status, checkpoint}).
// ─────────────────────────────────────────────────────────────────────────────

/** Which venue + chain a leg targets. The asset's home is a chain-bound island for tokenized. */
export type Marketplace =
  | "beezie" // Base, tokenized (Seaport 1.6, OpenSea v2 'beezie-base')
  | "courtyard" // Polygon, tokenized (OpenSea 'courtyard-nft' / Courtyard-native UI)
  | "ebay" // physical (Browse READ autonomous; checkout = browser + human-gate)
  | "opensea" // generic OpenSea orderbook venue for a relist (same chain as asset)
  | "cardmarket"; // physical, CF-walled (turnstile.mjs driver)

/** Where the slab physically/onchain lives — the custody island it is bound to. */
export type CustodyDestination =
  | "onchain-base" // tokenized on Base (Beezie)
  | "onchain-polygon" // tokenized on Polygon (Courtyard)
  | "psa-vault" // physical, custodied by PSA/Collectors (eBay grade-at-checkout / keep-vaulted)
  | "courtyard-vault" // physical, Brink's-custodied, awaiting/after Courtyard mint
  | "self-custody" // physical, in our own hands (raw shipped to us)
  | "third-party-3pl"; // physical, generic logistics custodian

/** Fiat vs onchain vs HTTP-resource settlement (ROUTES §5.2). eBay = fiat; tokenized = USDC. */
export type SettlementRail =
  | "onchain-native" // USDC settles AS the Seaport tx (Beezie/Courtyard) — NOT x402
  | "stripe-fiat" // eBay (card/PayPal); Stripe Issuing virtual card; no crypto
  | "x402"; // agent-to-API / Routes resource-lock settlement only (not NFT trades)

/**
 * The per-leg execution stack: a PRIMARY strategy plus ordered fallbacks, ending in a
 * human-gate where the mechanism is irreversible/UI-only. This encodes the §0 decision
 * rule (ROUTES §0): API/onchain → browser driver (toolbox) → human-gate. The adapter
 * EXPOSES which strategy it will actually use so the orchestration can reason about
 * autonomy + where a human tap is required — it never silently downgrades.
 */
export type ExecutionStrategy = "onchain" | "api" | "browser" | "human-gate";

/** A named browser driver from the automation toolbox (ROUTES §6), for browser-tier legs. */
export type BrowserDriver =
  | "turnstile.mjs" // OUR patchright + CF/Turnstile clear (only self-owned CF bypass)
  | "browser_camofox" // Camoufox stealth Firefox, logged-in sessions (eBay/PSA/native)
  | "browser_native" // Hermes native browser toolset (clean UIs)
  | "stagehand" // NL act/observe over patchright (brittle selectors)
  | "computer_use" // pixel-level cua-driver (native apps / DOM-defeating captcha)
  | "browser_cdp"; // DOM-level Chrome + wallet dialogs (B-UI onchain last resort)

/**
 * The execution plan for ONE leg: the chosen primary + ordered fallbacks, plus whether
 * an irreversible-commit human-gate is required (liability firebreak). Surfaced on
 * every quote/staged result so the orchestration knows the autonomy posture up front.
 */
export interface ExecutionPlan {
  primary: ExecutionStrategy;
  fallbacks: ExecutionStrategy[]; // ordered; e.g. ['browser','human-gate'] after an 'api' primary
  driver?: BrowserDriver; // set when any tier is 'browser'
  requiresHumanGate: boolean; // true for every irreversible money/ship commit (ROUTES §0)
  gateReason?: string; // why the gate exists (spend release, ship-out, immutable address…)
}

/** Scope for DISCOVER/getListings — narrow a venue read to a product/grade/price band. */
export interface ListingQuery {
  productId?: string; // join to the oracle product identity
  grader?: string; // PSA/CGC/BGS/…
  grade?: string;
  maxAskUsd?: number; // keep ask < oracle (the arbitrage filter)
  limit?: number;
}

/** One live acquisition candidate read from a venue (pre-spend; provenance-carrying). */
export interface MarketplaceListing {
  marketplace: Marketplace;
  listingId: string; // order_hash / itemId / objectID — venue-native id
  url: string; // canonical listing URL (provenance,)
  productId?: string; // resolved SlabClaw product identity (null if unmatched)
  productName: string;
  grader: string;
  grade: string;
  askUsd: number; // the ask in USD (USDC consideration for tokenized)
  currency: string; // 'USDC' | 'USD' | …
  custody: CustodyDestination; // where the asset lives (drives the net-exit math)
  tokenized: boolean; // tokenized (onchain transfer) vs physical (ship/UI)
  isLive: boolean; // liveness-checked (not a stale/dead listing)
  raw?: unknown; // venue-native payload (provenance)
}

/**
 * A landed-cost acquisition quote. Routes ranks the cheapest route on landedCostUsd.
 * Carries the execution plan so the orchestration sees primary+fallbacks+gate before buying.
 */
export interface AcquireQuote {
  listing: MarketplaceListing;
  askUsd: number;
  takeFeeUsd: number; // marketplace + royalty take (~8% Beezie/OpenSea; eBay/Stripe fee; 0% Courtyard-native)
  gasUsd: number; // onchain gas (cents on Base/Polygon; 0 for fiat)
  bridgeUsd: number; // cross-chain funding cost (LI.FI/CCTP) when crossChain (0 same-chain)
  shipToCustodyUsd: number; // physical ship-in/3PL/PSA-Vault cost (0 for tokenized)
  landedCostUsd: number; // total all-in cost to OWN the asset in custody — the rank key
  custodyDestination: CustodyDestination;
  crossChain: boolean; // true when settlement currency must bridge (Courtyard/Polygon vs Base budget)
  settlementRail: SettlementRail;
  execution: ExecutionPlan; // how acquire() will run this leg (and where the gate is)
}

/** A net-proceeds exit quote — Routes maximises netProceedsUsd (relist-in-place vs move-venue). */
export interface ExitQuote {
  productId: string;
  listAtUsd: number; // target list price (= oracle); the public commitment
  strategy: "relist-in-place" | "move-venue"; // relist where it sits vs ship/bridge to a better venue
  marketplace: Marketplace; // the exit venue
  sellFeeUsd: number; // venue sell/consignment fee (~8% OpenSea; 0% Courtyard-native; eBay sell fee)
  moveVenueUsd: number; // bridge/ship cost to reach the exit venue (0 for relist-in-place)
  netProceedsUsd: number; // listAtUsd − sellFeeUsd − moveVenueUsd — the maximise key
  crossCustody: boolean; // true when the exit requires a custody move (physical, multi-day)
  execution: ExecutionPlan; // how list() will run this exit (and where the gate is)
}

/**
 * Where a BUY/LIST is in the staged → approved → committed lifecycle (ROUTES §9). eBay
 * (and tokenized BUY under the demo posture) cannot commit synchronously: acquire/list
 * return a STAGED state and raise the human-gate; the receipt is filled post-confirmation.
 */
export type ExecutionStatus =
  | "staged" // prepared up to the irreversible click; awaiting the human-gate
  | "approved" // human approved (Telegram/Base-MCP tap); ready to commit
  | "committed" // the irreversible action fired (tx sent / pay clicked)
  | "confirmed" // on-chain confirmation / order placed / checkout completed
  | "failed";

/** Result of staging/committing a BUY. Tokenized → fills settleTxHash; eBay → screenshot/OCR proof. */
export interface AcquireReceipt {
  status: ExecutionStatus;
  listingId: string;
  marketplace: Marketplace;
  paidUsd?: number; // actual cost once committed
  settleTxHash?: string; // onchain settle tx (tokenized) — the buy IS the settlement
  certHash?: string; // keccak256(grader, certNumber) — slab identity anchor
  custody: CustodyDestination;
  approvalRef?: string; // the human-gate approval id/URL (provenance of the firebreak)
  proofUri?: string; // screenshot/OCR/explorer URL evidence
  committedAt?: string; // ISO
}

/** Result of staging/committing a LIST/SELL at the target (= oracle). */
export interface ListReceipt {
  status: ExecutionStatus;
  listingId?: string; // venue listing/offer/consignment id once published
  marketplace: Marketplace;
  listAtUsd: number;
  approvalRef?: string; // human-gate on the public price commitment
  proofUri?: string;
  listedAt?: string; // ISO
}

/** Terminal realized-P&L result once the listed asset actually sells (confirmSale). */
export interface SaleReceipt {
  status: ExecutionStatus;
  soldAtUsd: number;
  feeUsd: number; // realized venue fee at sale
  netProceedsUsd: number; // realized net (the P&L numerator)
  txHashOrPayout: string; // onchain transfer tx (tokenized) | Stripe payout id (fiat)
  soldAt?: string; // ISO
}

/**
 * A cross-custodian PHYSICAL move (the only real cross-custody mechanism). NO API,
 * NO token-bridge — it is a ship + KYC + multi-day flow (ROUTES §5.1). The hook
 * returns a tracked handle the orchestration polls across days, re-injecting state.
 */
export interface CustodyMoveRequest {
  productId: string;
  from: CustodyDestination; // e.g. 'self-custody' (eBay-bought slab in hand)
  to: CustodyDestination; // e.g. 'courtyard-vault' (ship-in to tokenize)
  certHash?: string;
}

/** A long-running, multi-day physical-move handle. Polled, never assumed synchronous. */
export interface CustodyMoveHandle {
  moveId: string;
  status:
    | "awaiting-shipment" // human must drop off the package (not automatable)
    | "in-transit"
    | "received" // arrived at the destination custodian
    | "processing" // mint/scan/intake (e.g. Courtyard twice-weekly vault scan)
    | "completed"
    | "failed";
  trackingNumber?: string;
  from: CustodyDestination;
  to: CustodyDestination;
  nextCheckpoint?: string; // when to poll next (async re-injection)
  requiresHumanShip: boolean; // the physical drop-off is inherently human (true for physical)
  proofUri?: string;
}

export interface MarketplaceAdapter {
  /** The venue this adapter trades on — lets the orchestrator resolve the EXIT adapter by venue
   *  (so a cross-venue exit lists on the right adapter, not the buy adapter). */
  readonly marketplace: Marketplace;
  /** DISCOVER + getListings — read live acquisition candidates (multi-sourced, liveness-checked). */
  discover(query: ListingQuery): Promise<MarketplaceListing[]>;
  /** Landed-cost acquisition quote (Routes ranks cheapest route on landedCostUsd). Pure read. */
  quoteAcquire(listing: MarketplaceListing): Promise<AcquireQuote>;
  /** Best net exit quote at the target price (relist-in-place vs move-venue). Pure read. */
  quoteExit(i: { productId: string; listAtUsd: number; currentCustody: CustodyDestination }): Promise<ExitQuote[]>;
  /**
   * BUY below oracle — NOT pure: returns a STAGED intermediate and raises the human-gate
   * for irreversible commits (eBay + demo-posture tokenized). Call again post-approval to
   * commit; tokenized onchain commits gated only by Base MCP approval-mode (ROUTES §9).
   *
   * `maxUsd` is the D11 per-call spend-cap firebreak. It is enforced as the MIN of this
   * per-call value and the config `spendCapUsd` (MarketplaceConfig). An over-cap buy is
   * blocked BEFORE any tx is built or sent. An onchain adapter with NO resolvable cap
   * (neither per-call `maxUsd` nor config `spendCapUsd`) MUST FAIL CLOSED — it never sends
   * an uncapped spend.
   */
  acquire(i: { quote: AcquireQuote; approvalRef?: string; maxUsd?: number }): Promise<AcquireReceipt>;
  /** LIST/SELL at the target (= oracle) — staged → approved → committed, human-gate on the price commitment. */
  list(i: { exit: ExitQuote; approvalRef?: string }): Promise<ListReceipt>;
  /** Poll a published listing for a realized sale → realized P&L (SaleReceipt). */
  confirmSale(i: { listingId: string; marketplace: Marketplace }): Promise<SaleReceipt | null>;
  /**
   * CUSTODY/TRANSFER hook — the physical cross-custodian leg (eBay → PSA/Courtyard vault).
   * Async + multi-day; returns a tracked handle. There is NO tokenized cross-custodian
   * path (redeem burns the token) — this is physical-only, ship + KYC, human-gated drop-off.
   */
  initiateCustodyMove(req: CustodyMoveRequest): Promise<CustodyMoveHandle>;
  /** Poll a previously-initiated custody move (re-inject {goal, status, checkpoint}). */
  getCustodyMove(i: { moveId: string }): Promise<CustodyMoveHandle | null>;
}

export interface MarketplaceConfig {
  marketplace: Marketplace;
  // tokenized venues (Beezie/Courtyard/OpenSea)
  openSeaApiKey?: string; // OpenSea v2 read/orders
  chainId?: 8453 | 137 | 84532; // Base | Polygon | Base Sepolia
  rpcUrl?: string;
  signerPrivateKey?: string; // agent wallet (attenuated: per-card spend cap = budget)
  conduitAddress?: `0x${string}`; // Seaport conduit for approvals
  // eBay (physical)
  ebayClientId?: string; // client-credentials Browse READ (ebay-auth.mjs)
  ebayClientSecret?: string;
  ebayUserToken?: string; // auth-code USER token for Sell Inventory (Path-1 exit)
  // browser-tier driver config (toolbox)
  browserDriver?: BrowserDriver; // default driver when a leg falls to the browser tier
  browserSessionProfile?: string; // path/id of the pre-seeded logged-in session (agent never types secrets)
  // human-gate (the liability firebreak)
  approvalChannel?: "telegram" | "base-mcp" | "discord"; // where the one-tap approval is emitted
  spendCapUsd?: number; // deterministic policy.yaml firebreak — enforced BEFORE staging
}

/**
 * The full adapter set a product wires once at startup. RING 3 receives this object
 * and is otherwise sponsor-agnostic.
 */
export interface SponsorAdapters {
  nemotron: NemotronAdapter;
  stripe: StripeAdapter;
  x402: X402Adapter;
  vault: VaultAdapter;
  oracle: OracleAdapter; // P3 — the value-truth, but the SUSPECT (swappable RING-3 moat)
  deals: DealsAdapter; // the under-oracle deal-source (cross-marketplace listing feed; RING-3 swap)
  marketplace: MarketplaceAdapter; // BUY/LIST/MOVE across venues + custodians (ROUTES §9; staged→committed)
}
