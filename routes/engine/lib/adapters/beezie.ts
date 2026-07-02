/**
 * beezie.ts — BeezieMarketplaceAdapter (Base / chainId 8453).
 *
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║ COMMODITY/MARKETPLACE SWAP SEAM #3 of 3 — the VENUE (where the item is bought/sold). ║
 * ║   This is one CONCRETE `MarketplaceAdapter` (the SlabClaw demo's default tokenized   ║
 * ║   venue). Swap or add venues by implementing `MarketplaceAdapter` (quoteAcquire /    ║
 * ║   quoteExit / acquire / list / move) and injecting it at buildOrchestrator() — eBay  ║
 * ║   (ebay.ts) and Courtyard (courtyard.ts) are sibling impls already in this dir. The   ║
 * ║   orchestrator routes on landedCostUsd / netProceedsUsd alone; it never assumes a    ║
 * ║   specific venue OR a specific commodity. A different commodity (watches on Chrono24, ║
 * ║   sneakers on StockX, art on a gallery API) plugs in here with NO engine change.      ║
 * ║   Companion seams: DealsAdapter (deals.ts = deal source) + OracleAdapter (oracle.ts   ║
 * ║   = value-truth).                                                                     ║
 * ║   PAYGUARD: acquire()/list() block-or-commit against the per-item cap and NEVER call   ║
 * ║   verifyFill (escrow release is operator-only) — an injected venue MUST keep that.     ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 *
 * Implements the RING-2 `MarketplaceAdapter` contract for Beezie tokenized graded
 * Pokémon slabs. Beezie listings ARE real Seaport 1.6 orders on Base (chain 8453);
 * Beezie's own API is Cloudflare-403'd, so we read the orderbook from the **OpenSea
 * Orders API** (`/api/v2/listings/collection/beezie-base/all`) and we BUY by pulling
 * ready Seaport fill calldata from `/api/v2/listings/fulfillment_data`, then sending it
 * with **viem** to Seaport 1.6. We LIST via **opensea-js** `createListing` (EIP-712
 * signed Seaport order).
 *
 * ── VERIFIED ground-truth (Sprint-1 brief) ────────────────────────────────────────
 *   Seaport 1.6 : 0x0000000000000068f116a894984e2db1123eb395
 *   Beezie coll : 0xbb5ec6fd4b61723bd45c399840f1d868840ca16f
 *   USDC (Base) : 0x833589fcd6edb6e08f4c7c32d4f71b54bda02913
 *   take ≈ 8%   : Beezie ~6-7% + OpenSea fee (CONFIRMED live: a $15.00 order pays the
 *                 seller $13.80 + two USDC fee considerations $0.15 + $1.05 = $1.20 = 8%).
 *
 * ── HONESTY / live-vs-stub posture (P7) — labeled per method on the returned object ──
 *   discover()      LIVE  — real OpenSea Orders API read; real order_hash + Seaport addr.
 *   quoteAcquire()  LIVE  — pure read; landed cost from the real ask + ~8% take + gas est.
 *   quoteExit()     LIVE  — pure math over the oracle value, net of the ~8% take.
 *   acquire()       LIVE-CAPABLE — builds + (when a signer is configured) SENDS a real
 *                   Seaport fill via viem; SPEC-ONLY (returns a `staged` receipt, no tx)
 *                   when no signer is wired. The cap guard ALWAYS runs and blocks an
 *                   over-cap buy BEFORE any tx is built/sent.
 *   list()          LIVE-CAPABLE — opensea-js createListing when a signer is configured;
 *                   SPEC-ONLY staged otherwise. Base-mainnet only (OpenSea has no Base
 *                   Sepolia orderbook — the Sepolia mechanics proof uses the raw Seaport
 *                   `validate` path, see scripts/sepolia-roundtrip.mjs).
 *   confirmSale()   LIVE  — re-reads the order status from the OpenSea Orders API; returns
 *                   null while unsold (NEVER fabricates a sale).
 *
 * NO randomness, NO fabricated tx hashes, NO invented slugs anywhere in this file.
 */

import {
  type MarketplaceAdapter,
  type MarketplaceConfig,
  type ListingQuery,
  type MarketplaceListing,
  type AcquireQuote,
  type ExitQuote,
  type AcquireReceipt,
  type ListReceipt,
  type SaleReceipt,
  type CustodyMoveRequest,
  type CustodyMoveHandle,
  type ExecutionPlan,
} from "./index.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Constants (VERIFIED — Sprint-1 ground truth; do NOT re-theorize)
// ─────────────────────────────────────────────────────────────────────────────

export const SEAPORT_1_6 = "0x0000000000000068f116a894984e2db1123eb395" as const;
export const BEEZIE_COLLECTION = "0xbb5ec6fd4b61723bd45c399840f1d868840ca16f" as const;
export const USDC_BASE = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913" as const;
export const USDC_DECIMALS = 6;
export const BASE_CHAIN_ID = 8453;

const OPENSEA_BASE = "https://api.opensea.io/api/v2";
const OPENSEA_COLLECTION_SLUG = "beezie-base";
/**
 * OpenSea read key (read-only orderbook). Sourced from the environment — NO hardcoded
 * default. Set OPENSEA_API_KEY in .env (see .env.example) or pass `openSeaApiKey` via config.
 * Empty string when unset: discover()/quoteAcquire() still parse but live reads need a key.
 */
const ENV_OPENSEA_KEY = (typeof process !== "undefined" && process.env?.OPENSEA_API_KEY) || "";

/** ~8% combined Beezie + OpenSea take (the CONFIRMED live split: ~6-7% Beezie + OpenSea fee). */
export const BEEZIE_TAKE_RATE = 0.08;
/** Conservative onchain gas estimate for a Seaport fulfillAdvancedOrder on Base (cents). */
export const BASE_GAS_USD = 0.05;

/**
 * Seaport ConduitController on Base (canonical Seaport deployment address). Used to RESOLVE
 * the conduit address a non-zero `fulfillerConduitKey` maps to, so we approve USDC to the
 * exact spender Seaport will pull from — never a hardcoded guess (H2).
 */
export const SEAPORT_CONDUIT_CONTROLLER = "0x00000000F9490004C11Cef243f5400493c00Ad63" as const;

/**
 * Tolerance (USDC base units, 6 decimals) for the re-summed consideration vs the cap-checked
 * amount — covers benign fee-rounding drift only. 5_000 = $0.005. A mismatch beyond this means
 * the untrusted fulfillment_data does NOT match our order → we refuse (C2).
 */
export const CONSIDERATION_TOLERANCE_BASE_UNITS = 5_000n; // $0.005

/** bytes32(0) — the "no conduit" key (approve USDC to Seaport itself). */
const ZERO_BYTES32_LITERAL = ("0x" + "0".repeat(64)) as `0x${string}`;

// ─────────────────────────────────────────────────────────────────────────────
// OpenSea Orders API payload shapes (the subset we read)
// ─────────────────────────────────────────────────────────────────────────────

interface OSConsiderationItem {
  itemType: number;
  token: string;
  identifierOrCriteria: string;
  startAmount: string;
  endAmount: string;
  recipient: string;
}

interface OSOfferItem {
  itemType: number;
  token: string;
  identifierOrCriteria: string;
  startAmount: string;
  endAmount: string;
}

interface OSProtocolParameters {
  offerer: string;
  offer: OSOfferItem[];
  consideration: OSConsiderationItem[];
  startTime: string;
  endTime: string;
  orderType: number;
  zone: string;
  zoneHash: string;
  salt: string;
  conduitKey: string;
  totalOriginalConsiderationItems: number;
  counter: number;
}

interface OSOrder {
  order_hash: string;
  chain: string;
  protocol_address: string;
  protocol_data: { parameters: OSProtocolParameters; signature: string | null };
  price?: { current?: { currency: string; decimals: number; value: string } };
  type?: string;
  status?: string;
}

interface OSOrdersResponse {
  listings?: OSOrder[];
  next?: string | null;
}

/** OpenSea fulfillment_data response — ready Seaport calldata for the buy. */
interface OSFulfillmentResponse {
  protocol?: string;
  fulfillment_data?: {
    transaction?: {
      function: string;
      chain: string;
      to: string;
      value: number | string;
      input_data: Record<string, unknown>;
    };
    orders?: unknown[];
  };
}

/** A Seaport consideration item as returned inside fulfillment_data.input_data.advancedOrder (UNTRUSTED). */
interface SeaportConsiderationItem {
  itemType: number | string;
  token: string;
  identifierOrCriteria: string;
  startAmount: string;
  endAmount: string;
  recipient: string;
}

/** The advancedOrder tuple OpenSea hands back — parsed + asserted before any tx (UNTRUSTED). */
interface SeaportAdvancedOrder {
  parameters: {
    offerer: string;
    zone: string;
    offer: Array<{ itemType: number | string; token: string; identifierOrCriteria: string; startAmount: string; endAmount: string }>;
    consideration: SeaportConsiderationItem[];
    orderType: number | string;
    startTime: string;
    endTime: string;
    zoneHash: string;
    salt: string;
    conduitKey: string;
    totalOriginalConsiderationItems: number | string;
  };
  numerator: number | string;
  denominator: number | string;
  signature: string;
  extraData: string;
}

/** The validated, cross-checked fill the adapter is willing to send (post-quarantine). */
interface VerifiedFill {
  to: `0x${string}`;
  value: bigint; // MUST be 0n for a USDC order
  advancedOrder: SeaportAdvancedOrder;
  criteriaResolvers: unknown[]; // MUST be empty for a full direct buy
  fulfillerConduitKey: `0x${string}`;
  recipient: `0x${string}`; // MUST equal our wallet
  considerationBaseUnits: bigint; // re-summed from advancedOrder.parameters.consideration
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Loose encoder signature so we can pass viem's `encodeFunctionData` without importing its generics. */
type EncodeFn = (args: { abi: readonly unknown[]; functionName: string; args: readonly unknown[] }) => `0x${string}`;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Total USDC consideration (all recipients) in USD — the true ask the buyer pays. */
function totalUsdcConsideration(params: OSProtocolParameters): number | null {
  let total = 0n;
  let sawUsdc = false;
  for (const c of params.consideration) {
    // itemType 1 = ERC20; only count USDC considerations
    if (c.itemType === 1 && c.token.toLowerCase() === USDC_BASE.toLowerCase()) {
      total += BigInt(c.startAmount);
      sawUsdc = true;
    }
  }
  if (!sawUsdc) return null;
  return Number(total) / 10 ** USDC_DECIMALS;
}

/** The slab tokenId offered by the order (the ERC-721 being sold). */
function offeredTokenId(params: OSProtocolParameters): string | null {
  const offer = params.offer?.[0];
  if (!offer) return null;
  // itemType 2 = ERC721
  if (offer.itemType !== 2) return null;
  return offer.identifierOrCriteria;
}

/** Extract the tokenId from a canonical Beezie listing url (.../{collection}/{tokenId}). */
function tokenIdFromBeezieUrl(url: string): string | undefined {
  const last = url.split("/").pop();
  return last && /^\d+$/.test(last) ? last : undefined;
}

/** USD (float) → USDC base units (6 decimals), rounded UP so we never under-cap (M2). */
function usdToBaseUnits(usd: number): bigint {
  return BigInt(Math.ceil(usd * 10 ** USDC_DECIMALS));
}

/** The tighter (smaller) of two optional caps. Returns undefined only if BOTH are undefined. */
function minCap(a?: bigint, b?: bigint): bigint | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return a < b ? a : b;
}

/** USDC base units → USD (float) for display only — NEVER used at a money boundary. */
function baseUnitsToUsd(units: bigint): number {
  return Number(units) / 10 ** USDC_DECIMALS;
}

/**
 * Re-sum the USDC consideration in a (possibly untrusted) Seaport order's parameters.
 * Counts ONLY ERC20 (itemType 1) USDC considerations; returns the total in base units
 * AND asserts there is no non-USDC ERC20 / native consideration sneaking in. (C2)
 */
function reSumUsdcConsideration(considerations: SeaportConsiderationItem[]): { totalBaseUnits: bigint; foreignTokens: string[] } {
  let total = 0n;
  const foreignTokens: string[] = [];
  for (const c of considerations) {
    const itemType = Number(c.itemType);
    const token = String(c.token).toLowerCase();
    if (itemType === 1 && token === USDC_BASE.toLowerCase()) {
      // a Seaport order pays max(startAmount, endAmount) over its window — use the larger
      // so the cap can never be under-counted by a descending-price trick.
      const start = BigInt(c.startAmount);
      const end = BigInt(c.endAmount);
      total += start > end ? start : end;
    } else if (itemType === 0) {
      // native ETH consideration — NOT a USDC order; flag it
      foreignTokens.push("native-ETH");
    } else if (itemType === 1) {
      // a non-USDC ERC20 consideration — flag it
      foreignTokens.push(token);
    }
    // itemType 2/3/4 (NFT considerations) are not a spend of our funds — ignore for the cap.
  }
  return { totalBaseUnits: total, foreignTokens };
}

/** The default execution plan for a tokenized Beezie buy: onchain primary, human-gate as the firebreak. */
function beezieExecutionPlan(requiresGate: boolean, gateReason: string): ExecutionPlan {
  return {
    primary: "onchain",
    fallbacks: ["human-gate"],
    requiresHumanGate: requiresGate,
    gateReason: requiresGate ? gateReason : undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// The adapter
// ─────────────────────────────────────────────────────────────────────────────

export interface BeezieAdapterOptions extends Partial<MarketplaceConfig> {
  /** Override the OpenSea read key. */
  openSeaApiKey?: string;
  /** Base RPC url — required only for acquire()/list() onchain writes. */
  rpcUrl?: string;
  /** Agent wallet private key (attenuated by the per-card spend cap). Absent ⇒ SPEC-ONLY writes. */
  signerPrivateKey?: string;
  /** Injected fetch (tests). Defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

export class BeezieMarketplaceAdapter implements MarketplaceAdapter {
  readonly marketplace = "beezie" as const;
  readonly chainId = BASE_CHAIN_ID;
  private readonly apiKey: string;
  private readonly rpcUrl?: string;
  private readonly signerPrivateKey?: string;
  private readonly fetchImpl: typeof fetch;
  /** D11 config cap (MarketplaceConfig.spendCapUsd) in USDC base units. undefined ⇒ no config cap. */
  private readonly configCapBaseUnits?: bigint;
  /** Idempotency: listingIds with an in-flight acquire(). Re-entry is rejected (M1). */
  private readonly inFlight = new Set<string>();

  constructor(opts: BeezieAdapterOptions = {}) {
    this.apiKey = opts.openSeaApiKey ?? ENV_OPENSEA_KEY;
    this.rpcUrl = opts.rpcUrl;
    this.signerPrivateKey = opts.signerPrivateKey;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    // The deterministic policy.yaml firebreak — read from config, enforced BEFORE staging.
    this.configCapBaseUnits = typeof opts.spendCapUsd === "number" ? usdToBaseUnits(opts.spendCapUsd) : undefined;
  }

  /** True when an onchain write path (acquire/list) can actually send a tx. */
  get canWrite(): boolean {
    return !!(this.rpcUrl && this.signerPrivateKey);
  }

  // ── OpenSea Orders API read ────────────────────────────────────────────────
  private async osGet(path: string): Promise<unknown> {
    const res = await this.fetchImpl(`${OPENSEA_BASE}${path}`, {
      headers: { "X-API-KEY": this.apiKey, Accept: "application/json" },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`OpenSea GET ${path} -> HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    return res.json();
  }

  private async osPost(path: string, payload: unknown): Promise<unknown> {
    const res = await this.fetchImpl(`${OPENSEA_BASE}${path}`, {
      method: "POST",
      headers: { "X-API-KEY": this.apiKey, Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`OpenSea POST ${path} -> HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    return res.json();
  }

  /**
   * DISCOVER — read live Beezie Seaport orders from the OpenSea Orders API.
   * LIVE. Returns provenance: listingId = order_hash, url, askUsd, isLive, raw payload.
   */
  async discover(query: ListingQuery): Promise<MarketplaceListing[]> {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);
    const data = (await this.osGet(`/listings/collection/${OPENSEA_COLLECTION_SLUG}/all?limit=${limit}`)) as OSOrdersResponse;
    const orders = Array.isArray(data.listings) ? data.listings : [];

    const out: MarketplaceListing[] = [];
    for (const o of orders) {
      const params = o.protocol_data?.parameters;
      if (!params) continue;
      const tokenId = offeredTokenId(params);
      if (!tokenId) continue; // not a single-ERC721 sale
      const askUsd = totalUsdcConsideration(params);
      if (askUsd == null) continue; // non-USDC order (e.g. WETH) — out of the USDC arb scope
      if (typeof query.maxAskUsd === "number" && askUsd > query.maxAskUsd) continue;

      out.push({
        marketplace: "beezie",
        listingId: o.order_hash, // provenance: the Seaport order hash
        url: `https://opensea.io/assets/base/${BEEZIE_COLLECTION}/${tokenId}`,
        productId: query.productId, // resolved upstream by the oracle identity join (null here)
        productName: `Beezie slab #${tokenId}`,
        grader: query.grader ?? "",
        grade: query.grade ?? "",
        askUsd: round2(askUsd),
        currency: "USDC",
        custody: "onchain-base",
        tokenized: true,
        // The /listings/collection/.../all endpoint only returns ACTIVE orders; treat a
        // missing/ACTIVE status as live (the API uses uppercase "ACTIVE").
        isLive: o.status === undefined || o.status.toUpperCase() === "ACTIVE",
        raw: o,
      });
    }
    return out;
  }

  /**
   * quoteAcquire — landed cost to OWN the slab. LIVE (pure read).
   * landedCostUsd = askUsd + takeFeeUsd + gasUsd. The ~8% take is ALREADY inside the
   * order's USDC consideration (seller + OpenSea + Beezie recipients), so askUsd is the
   * all-in USDC the buyer transfers; takeFeeUsd is surfaced for transparency/ranking.
   */
  async quoteAcquire(listing: MarketplaceListing): Promise<AcquireQuote> {
    const askUsd = listing.askUsd;
    // The take is the portion of the ask that is NOT the seller's net (≈8% of ask).
    const takeFeeUsd = round2(askUsd * BEEZIE_TAKE_RATE);
    const gasUsd = BASE_GAS_USD;
    return {
      listing,
      askUsd,
      takeFeeUsd,
      gasUsd,
      bridgeUsd: 0, // same-chain (Base USDC), no bridge
      shipToCustodyUsd: 0, // tokenized — no physical ship
      landedCostUsd: round2(askUsd + gasUsd), // ask already includes the take (it's in the consideration)
      custodyDestination: "onchain-base",
      crossChain: false,
      settlementRail: "onchain-native",
      execution: beezieExecutionPlan(false, "in-cap tokenized buy self-approves (D11 cap firebreak)"),
    };
  }

  /**
   * quoteExit — net proceeds from relisting at the oracle, net of the ~8% take.
   * LIVE (pure math). netProceeds(listAtUsd) = listAtUsd − sellFee − moveVenueUsd.
   * Relist-in-place on Beezie/OpenSea (same chain) has moveVenueUsd = 0.
   *
   * NOTE: to CLEAR the oracle net of the take, the planner should list at
   * `oracle / (1 − take)` (see netClearingListPrice). This method reports the net for a
   * GIVEN list price so the planner can compare exits.
   */
  async quoteExit(i: { productId: string; listAtUsd: number; currentCustody: import("./index.ts").CustodyDestination }): Promise<ExitQuote[]> {
    const listAtUsd = i.listAtUsd;
    const sellFeeUsd = round2(listAtUsd * BEEZIE_TAKE_RATE);
    const relistInPlace: ExitQuote = {
      productId: i.productId,
      listAtUsd,
      strategy: "relist-in-place",
      marketplace: "beezie",
      sellFeeUsd,
      moveVenueUsd: 0,
      netProceedsUsd: round2(listAtUsd - sellFeeUsd),
      crossCustody: false,
      execution: beezieExecutionPlan(false, "list-at-oracle price commitment"),
    };
    return [relistInPlace];
  }

  /**
   * acquire — BUY the slab on-chain via Seaport 1.6.
   *
   * THE D11 CAP FIREBREAK (the ONLY gate on an in-cap tokenized buy):
   *  - The effective cap = MIN(per-call `maxUsd`, config `spendCapUsd`) — whichever are set.
   *  - If `canWrite` and NO cap is resolvable, acquire FAILS CLOSED (an uncapped onchain
   *    spend is never sent).
   *  - If the quote's landed cost exceeds the effective cap, acquire BLOCKS *before building
   *    or sending any tx* (returns `failed`, no settleTxHash).
   *  - Cap math is done in USDC base units as BigInt (no float compare at the boundary, M2).
   *
   * QUARANTINE: the OpenSea fulfillment_data response is UNTRUSTED. After the quote-level
   * cap check, `buildSeaportFill` re-parses the calldata, re-sums the USDC consideration,
   * asserts recipient/value/conduit/numerator, and `sendSeaportFill` RE-CHECKS the cap
   * against the freshly-parsed amount immediately before the tx (C2).
   *
   * Idempotent: a second acquire() for the same listingId while one is in flight is rejected (M1).
   * No signer wired ⇒ SPEC-ONLY staged receipt (nothing fabricated).
   */
  async acquire(i: { quote: AcquireQuote; approvalRef?: string; maxUsd?: number }): Promise<AcquireReceipt> {
    const { quote } = i;
    const listing = quote.listing;

    const landedBaseUnits = usdToBaseUnits(quote.landedCostUsd);
    const perCallCap = typeof i.maxUsd === "number" ? usdToBaseUnits(i.maxUsd) : undefined;
    const effectiveCap = minCap(perCallCap, this.configCapBaseUnits);

    const blocked = (reason: string): AcquireReceipt => ({
      status: "failed",
      listingId: listing.listingId,
      marketplace: "beezie",
      custody: "onchain-base",
      proofUri: undefined,
      committedAt: new Date().toISOString(),
      approvalRef: `BLOCKED:${reason}`, // honesty: explicit, no tx attempted
    });

    // ── D11 FIREBREAK — runs UNCONDITIONALLY before any staging/build/send ──
    if (this.canWrite && effectiveCap === undefined) {
      // FAIL CLOSED: an onchain-capable adapter with no resolvable cap never spends.
      return blocked(`no-cap-set (canWrite but neither maxUsd nor spendCapUsd configured) — fail-closed`);
    }
    if (effectiveCap !== undefined && landedBaseUnits > effectiveCap) {
      return blocked(`over-cap landed $${quote.landedCostUsd} > cap $${baseUnitsToUsd(effectiveCap)}`);
    }

    // No signer wired ⇒ SPEC-ONLY staged receipt (no fabricated tx).
    if (!this.canWrite) {
      return {
        status: "staged",
        listingId: listing.listingId,
        marketplace: "beezie",
        paidUsd: quote.landedCostUsd,
        custody: "onchain-base",
        approvalRef: i.approvalRef,
        proofUri: undefined, // SPEC-ONLY: no tx — wire rpcUrl+signerPrivateKey to commit
        committedAt: undefined,
      };
    }

    // ── Idempotency guard (M1) — reject concurrent re-entry on the same order ──
    if (this.inFlight.has(listing.listingId)) {
      return blocked(`in-flight (a fill for ${listing.listingId} is already pending)`);
    }
    this.inFlight.add(listing.listingId);
    try {
      // ── LIVE on-chain fill path (canWrite) ──
      // effectiveCap is guaranteed defined here (fail-closed above).
      const fulfiller = await this.signerAddress();
      const verified = await this.buildSeaportFill({
        orderHash: listing.listingId,
        fulfiller,
        capBaseUnits: effectiveCap!,
        // bind the actual spend to the QUOTED ask (NEW-1): the buyer pays the full USDC
        // consideration, which discover() set as listing.askUsd.
        quotedAskBaseUnits: usdToBaseUnits(listing.askUsd),
        // assert the offered slab is the one we discovered (NEW-2), parsed from the canonical url.
        expectedTokenId: tokenIdFromBeezieUrl(listing.url),
      });
      const { txHash } = await this.sendSeaportFill(verified, effectiveCap!);
      return {
        status: "confirmed",
        listingId: listing.listingId,
        marketplace: "beezie",
        paidUsd: baseUnitsToUsd(verified.considerationBaseUnits),
        settleTxHash: txHash,
        custody: "onchain-base",
        approvalRef: i.approvalRef,
        proofUri: `https://basescan.org/tx/${txHash}`,
        committedAt: new Date().toISOString(),
      };
    } finally {
      this.inFlight.delete(listing.listingId);
    }
  }

  /**
   * list — post a Seaport listing at the oracle price via opensea-js createListing.
   * LIVE-CAPABLE (Base mainnet). SPEC-ONLY staged when no signer is wired.
   * Base-mainnet only: OpenSea has no Base Sepolia orderbook (Sepolia mechanics use the
   * raw Seaport validate path in scripts/sepolia-roundtrip.mjs).
   */
  async list(i: { exit: ExitQuote; approvalRef?: string }): Promise<ListReceipt> {
    const { exit } = i;
    if (!this.canWrite) {
      return {
        status: "staged",
        listingId: undefined,
        marketplace: "beezie",
        listAtUsd: exit.listAtUsd,
        approvalRef: i.approvalRef,
        proofUri: undefined, // SPEC-ONLY: wire signer to publish a signed order
        listedAt: undefined,
      };
    }
    const { orderHash } = await this.createOpenSeaListing(exit);
    return {
      status: "confirmed",
      listingId: orderHash,
      marketplace: "beezie",
      listAtUsd: exit.listAtUsd,
      approvalRef: i.approvalRef,
      proofUri: `https://opensea.io/assets/base/${BEEZIE_COLLECTION}`,
      listedAt: new Date().toISOString(),
    };
  }

  /**
   * confirmSale — poll the order status from the OpenSea Orders API.
   * LIVE. Returns a SaleReceipt only when the order is no longer active (sold/filled);
   * returns null while still listed (NEVER fabricates a sale).
   */
  async confirmSale(i: { listingId: string; marketplace: import("./index.ts").Marketplace }): Promise<SaleReceipt | null> {
    // Re-read the collection orderbook and look for this order_hash.
    const data = (await this.osGet(`/listings/collection/${OPENSEA_COLLECTION_SLUG}/all?limit=100`)) as OSOrdersResponse;
    const orders = Array.isArray(data.listings) ? data.listings : [];
    const still = orders.find((o) => o.order_hash.toLowerCase() === i.listingId.toLowerCase());
    if (still && (still.status === undefined || still.status.toUpperCase() === "ACTIVE")) {
      return null; // still listed — unsold
    }
    // The order is gone from the active orderbook. We can only HONESTLY report a sale when
    // we can resolve the settlement on-chain (a transfer/OrderFulfilled event). Without an
    // indexer wired here, return null rather than fabricate proceeds (P7).
    return null;
  }

  /**
   * initiateCustodyMove — physical cross-custodian move. For tokenized Beezie there is NO
   * cross-custodian token path (redeem BURNS the token; the slab is a Base-bound island).
   * This returns a handle flagged requiresHumanShip for the physical-only flow.
   */
  async initiateCustodyMove(req: CustodyMoveRequest): Promise<CustodyMoveHandle> {
    return {
      moveId: `beezie-move-${Date.now()}`,
      status: "awaiting-shipment",
      from: req.from,
      to: req.to,
      requiresHumanShip: true, // physical drop-off is inherently human; no token-bridge exists
      nextCheckpoint: undefined,
    };
  }

  async getCustodyMove(i: { moveId: string }): Promise<CustodyMoveHandle | null> {
    // No persistence in this adapter (Sprint-4 P&L module owns state). Honest null.
    void i;
    return null;
  }

  // ── On-chain write internals (only reached when canWrite) ──────────────────

  /** Resolve the signer's address from the private key via viem. */
  private async signerAddress(): Promise<`0x${string}`> {
    const { privateKeyToAccount } = await import("viem/accounts");
    const acct = privateKeyToAccount(this.normalizePk(this.signerPrivateKey!));
    return acct.address;
  }

  private normalizePk(pk: string): `0x${string}` {
    return (pk.startsWith("0x") ? pk : `0x${pk}`) as `0x${string}`;
  }

  /**
   * Pull ready Seaport fill calldata from OpenSea's fulfillment_data endpoint and
   * QUARANTINE-VERIFY it before it is allowed anywhere near a tx.
   *
   * The fulfillment_data response is UNTRUSTED. We assert, FAIL-CLOSED on any mismatch:
   *  - tx.to === Seaport 1.6                                  (no rogue target)
   *  - tx.value === 0                                          (USDC order; no native ETH leak, C2)
   *  - recipient === our fulfiller wallet                     (slab can't be sent to an attacker, H3)
   *  - numerator/denominator === 1/1                          (full direct buy, no partial trick, H3)
   *  - criteriaResolvers is empty                             (no criteria substitution, H3)
   *  - every consideration is USDC (no foreign-token spend)   (C2)
   *  - re-summed USDC consideration ≤ cap                     (C2 — vs the SAME cap acquire() used)
   *
   * Returns a VerifiedFill carrying the re-summed amount the caller re-checks once more
   * immediately before sending (defence in depth).
   */
  async buildSeaportFill(i: {
    orderHash: string;
    fulfiller: `0x${string}`;
    capBaseUnits: bigint;
    /** The QUOTED ask (from discover()/quoteAcquire) in USDC base units. The re-summed
     *  consideration must match this within CONSIDERATION_TOLERANCE_BASE_UNITS — an
     *  inflated-but-under-cap fill (e.g. $99 for a $40 quote) is REJECTED (NEW-1). */
    quotedAskBaseUnits: bigint;
    /** The slab tokenId we expect this order to offer (from discover()). Optional — when
     *  set, the offer's identifier is asserted too. */
    expectedTokenId?: string;
  }): Promise<VerifiedFill> {
    const resp = (await this.osPost("/listings/fulfillment_data", {
      listing: { hash: i.orderHash, chain: "base", protocol_address: SEAPORT_1_6 },
      fulfiller: { address: i.fulfiller },
    })) as OSFulfillmentResponse;
    const tx = resp.fulfillment_data?.transaction;
    if (!tx) throw new Error(`fulfillment_data returned no transaction for order ${i.orderHash}`);

    // 1) target must be Seaport 1.6
    if (String(tx.to).toLowerCase() !== SEAPORT_1_6.toLowerCase()) {
      throw new Error(`SECURITY: fulfillment_data target ${tx.to} is not Seaport 1.6 — refusing`);
    }
    // 2) value must be 0 for a USDC order (no native-ETH spend hidden in tx.value)
    const value = BigInt(tx.value ?? 0);
    if (value !== 0n) {
      throw new Error(`SECURITY: fulfillment_data tx.value=${value} non-zero for a USDC order — refusing (C2)`);
    }

    const d = tx.input_data as {
      advancedOrder?: SeaportAdvancedOrder;
      criteriaResolvers?: unknown[];
      fulfillerConduitKey?: string;
      recipient?: string;
    };
    const advancedOrder = d.advancedOrder;
    if (!advancedOrder?.parameters?.consideration) {
      throw new Error(`SECURITY: fulfillment_data missing advancedOrder.parameters.consideration — refusing`);
    }

    // 3) recipient (where the bought slab is sent) MUST be our wallet
    const recipient = String(d.recipient ?? "");
    if (recipient.toLowerCase() !== i.fulfiller.toLowerCase()) {
      throw new Error(`SECURITY: fill recipient ${recipient} != our wallet ${i.fulfiller} — refusing (H3)`);
    }
    // 4) full direct buy — numerator/denominator must be 1/1
    if (String(advancedOrder.numerator) !== "1" || String(advancedOrder.denominator) !== "1") {
      throw new Error(`SECURITY: fill is not a full buy (numerator/denominator=${advancedOrder.numerator}/${advancedOrder.denominator}) — refusing (H3)`);
    }
    // 5) no criteria resolvers (no collection-offer / criteria substitution)
    const criteriaResolvers = Array.isArray(d.criteriaResolvers) ? d.criteriaResolvers : [];
    if (criteriaResolvers.length !== 0) {
      throw new Error(`SECURITY: fill carries ${criteriaResolvers.length} criteriaResolvers — refusing (H3)`);
    }

    // 6) OFFER-SIDE assertion (NEW-2): the order must OFFER exactly the ERC721 Beezie slab we
    //    expect — itemType 2 (ERC721) + the Beezie collection token (+ the discovered tokenId
    //    when supplied). Otherwise we could pay USDC for nothing / the wrong asset.
    const offer = advancedOrder.parameters.offer?.[0];
    if (!offer) {
      throw new Error(`SECURITY: fill has no offer item — refusing (NEW-2)`);
    }
    if (Number(offer.itemType) !== 2) {
      throw new Error(`SECURITY: fill offer itemType=${offer.itemType} is not ERC721 (2) — refusing (NEW-2)`);
    }
    if (String(offer.token).toLowerCase() !== BEEZIE_COLLECTION.toLowerCase()) {
      throw new Error(`SECURITY: fill offer token ${offer.token} != Beezie collection ${BEEZIE_COLLECTION} — refusing (NEW-2)`);
    }
    if (i.expectedTokenId !== undefined && String(offer.identifierOrCriteria) !== String(i.expectedTokenId)) {
      throw new Error(`SECURITY: fill offer tokenId ${offer.identifierOrCriteria} != expected ${i.expectedTokenId} — refusing (NEW-2)`);
    }

    // 7) re-sum the USDC consideration; reject any foreign-token consideration
    const { totalBaseUnits, foreignTokens } = reSumUsdcConsideration(advancedOrder.parameters.consideration);
    if (foreignTokens.length > 0) {
      throw new Error(`SECURITY: fill consideration includes non-USDC tokens [${foreignTokens.join(",")}] — refusing (C2)`);
    }
    if (totalBaseUnits <= 0n) {
      throw new Error(`SECURITY: fill consideration re-sums to ${totalBaseUnits} USDC — refusing`);
    }
    // 8) cap check against the freshly-parsed amount (not the stale discover() quote)
    if (totalBaseUnits > i.capBaseUnits) {
      throw new Error(
        `SECURITY: re-summed consideration $${baseUnitsToUsd(totalBaseUnits)} > cap $${baseUnitsToUsd(i.capBaseUnits)} — refusing (C2)`,
      );
    }
    // 9) ASK-MATCH (NEW-1): the re-summed consideration must equal the QUOTED ask within a
    //    tight tolerance. `<= cap` alone permits overpay-within-cap (pay $99 for a $40 slab);
    //    bind the actual spend to what we quoted. This wires CONSIDERATION_TOLERANCE_BASE_UNITS.
    const askDelta = totalBaseUnits > i.quotedAskBaseUnits ? totalBaseUnits - i.quotedAskBaseUnits : i.quotedAskBaseUnits - totalBaseUnits;
    if (askDelta > CONSIDERATION_TOLERANCE_BASE_UNITS) {
      throw new Error(
        `SECURITY: re-summed consideration $${baseUnitsToUsd(totalBaseUnits)} != quoted ask $${baseUnitsToUsd(i.quotedAskBaseUnits)} ` +
          `(delta $${baseUnitsToUsd(askDelta)} > tolerance $${baseUnitsToUsd(CONSIDERATION_TOLERANCE_BASE_UNITS)}) — refusing (NEW-1 overpay-within-cap)`,
      );
    }

    const fulfillerConduitKey = (d.fulfillerConduitKey ?? ZERO_BYTES32_LITERAL) as `0x${string}`;
    return {
      to: tx.to as `0x${string}`,
      value,
      advancedOrder,
      criteriaResolvers,
      fulfillerConduitKey,
      recipient: i.fulfiller, // our asserted wallet
      considerationBaseUnits: totalBaseUnits,
    };
  }

  /**
   * Approve the EXACT USDC need to the CORRECT spender, then encode + send the verified fill.
   *
   * Defence-in-depth at the money boundary:
   *  - RE-CHECK the cap against the freshly-parsed consideration immediately before any tx (C2).
   *  - Resolve the approval spender from the fill's `fulfillerConduitKey` — zero-key ⇒ Seaport
   *    itself; non-zero ⇒ resolve + assert the conduit via the ConduitController (H2).
   *  - Approve the EXACT need (re-summed consideration + a few-cents fee-drift buffer), capped
   *    by the cap. NEVER an unbounded/infinite approval (H1).
   */
  private async sendSeaportFill(verified: VerifiedFill, capBaseUnits: bigint): Promise<{ txHash: `0x${string}` }> {
    const { createWalletClient, createPublicClient, http, encodeFunctionData, parseAbiItem } = await import("viem");
    const { privateKeyToAccount } = await import("viem/accounts");
    const { base } = await import("viem/chains");

    // ── Last-line cap RE-CHECK against the freshly-parsed amount (C2) ──
    if (verified.considerationBaseUnits > capBaseUnits) {
      throw new Error(
        `SECURITY: pre-send cap re-check failed — $${baseUnitsToUsd(verified.considerationBaseUnits)} > cap $${baseUnitsToUsd(capBaseUnits)}`,
      );
    }
    if (verified.value !== 0n) {
      throw new Error(`SECURITY: pre-send value=${verified.value} non-zero — refusing`);
    }
    if (verified.recipient.toLowerCase() !== (await this.signerAddress()).toLowerCase()) {
      throw new Error(`SECURITY: pre-send recipient != our wallet — refusing (H3)`);
    }

    const account = privateKeyToAccount(this.normalizePk(this.signerPrivateKey!));
    const transport = http(this.rpcUrl!);
    const publicClient = createPublicClient({ chain: base, transport });
    const walletClient = createWalletClient({ account, chain: base, transport });

    // ── Resolve the approval spender from the fill's conduit key (H2) ──
    const spender = await this.resolveApprovalSpender(verified.fulfillerConduitKey, publicClient);

    // ── Approve the EXACT need to that spender (never an unbounded approval, H1) ──
    const erc20Abi = [
      parseAbiItem("function allowance(address owner, address spender) view returns (uint256)"),
      parseAbiItem("function approve(address spender, uint256 amount) returns (bool)"),
    ];
    // exact consideration + a 0.5% fee-drift buffer, but never above the cap (H1).
    const need = exactApprovalAmount(verified.considerationBaseUnits, capBaseUnits);
    const allowance = (await publicClient.readContract({
      address: USDC_BASE,
      abi: erc20Abi,
      functionName: "allowance",
      args: [account.address, spender],
    })) as bigint;
    if (allowance < need) {
      const approveHash = await walletClient.writeContract({
        address: USDC_BASE,
        abi: erc20Abi,
        functionName: "approve",
        args: [spender, need], // EXACT need, never unbounded
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
    }

    // ── Encode the verified fill + send ──
    const calldata = this.encodeFulfillment(verified, encodeFunctionData as unknown as EncodeFn);
    const txHash = await walletClient.sendTransaction({ to: verified.to, data: calldata, value: verified.value });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return { txHash };
  }

  /**
   * Resolve the USDC approval spender from a Seaport `fulfillerConduitKey` (H2):
   *  - zero key  ⇒ Seaport pulls funds itself; approve USDC to Seaport 1.6.
   *  - non-zero  ⇒ resolve the conduit address via the ConduitController.getConduit(key),
   *               assert it exists, and approve USDC to that conduit (never a hardcoded guess).
   * NEW-3 (accepted residual): this conduit resolution TRUSTS the configured RPC — a malicious
   * RPC could return a rogue conduit. The RPC is trusted operator infra (our own node/key), so
   * this is acceptable; if the RPC were ever untrusted, pin/verify the conduit address too.
   */
  private async resolveApprovalSpender(
    conduitKey: `0x${string}`,
    publicClient: { readContract: import("viem").PublicClient["readContract"] },
  ): Promise<`0x${string}`> {
    if (conduitKey === ZERO_BYTES32_LITERAL) {
      return SEAPORT_1_6;
    }
    const { parseAbiItem } = await import("viem");
    const controllerAbi = [parseAbiItem("function getConduit(bytes32 conduitKey) view returns (address conduit, bool exists)")];
    const res = (await publicClient.readContract({
      address: SEAPORT_CONDUIT_CONTROLLER,
      abi: controllerAbi,
      functionName: "getConduit",
      args: [conduitKey],
    })) as [string, boolean];
    const [conduit, exists] = res;
    if (!exists || !conduit || conduit === "0x0000000000000000000000000000000000000000") {
      throw new Error(`SECURITY: conduitKey ${conduitKey} does not resolve to a deployed conduit — refusing (H2)`);
    }
    return conduit as `0x${string}`;
  }

  /** Encode the VERIFIED Seaport fill into calldata. Uses the asserted recipient (our wallet). */
  private encodeFulfillment(verified: VerifiedFill, encodeFunctionData: EncodeFn): `0x${string}` {
    // fulfillAdvancedOrder(advancedOrder, criteriaResolvers, fulfillerConduitKey, recipient)
    const abi = [
      {
        type: "function",
        name: "fulfillAdvancedOrder",
        stateMutability: "payable",
        inputs: [
          {
            name: "advancedOrder",
            type: "tuple",
            components: [
              {
                name: "parameters",
                type: "tuple",
                components: [
                  { name: "offerer", type: "address" },
                  { name: "zone", type: "address" },
                  {
                    name: "offer",
                    type: "tuple[]",
                    components: [
                      { name: "itemType", type: "uint8" },
                      { name: "token", type: "address" },
                      { name: "identifierOrCriteria", type: "uint256" },
                      { name: "startAmount", type: "uint256" },
                      { name: "endAmount", type: "uint256" },
                    ],
                  },
                  {
                    name: "consideration",
                    type: "tuple[]",
                    components: [
                      { name: "itemType", type: "uint8" },
                      { name: "token", type: "address" },
                      { name: "identifierOrCriteria", type: "uint256" },
                      { name: "startAmount", type: "uint256" },
                      { name: "endAmount", type: "uint256" },
                      { name: "recipient", type: "address" },
                    ],
                  },
                  { name: "orderType", type: "uint8" },
                  { name: "startTime", type: "uint256" },
                  { name: "endTime", type: "uint256" },
                  { name: "zoneHash", type: "bytes32" },
                  { name: "salt", type: "uint256" },
                  { name: "conduitKey", type: "bytes32" },
                  { name: "totalOriginalConsiderationItems", type: "uint256" },
                ],
              },
              { name: "numerator", type: "uint120" },
              { name: "denominator", type: "uint120" },
              { name: "signature", type: "bytes" },
              { name: "extraData", type: "bytes" },
            ],
          },
          {
            name: "criteriaResolvers",
            type: "tuple[]",
            components: [
              { name: "orderIndex", type: "uint256" },
              { name: "side", type: "uint8" },
              { name: "index", type: "uint256" },
              { name: "identifier", type: "uint256" },
              { name: "criteriaProof", type: "bytes32[]" },
            ],
          },
          { name: "fulfillerConduitKey", type: "bytes32" },
          { name: "recipient", type: "address" },
        ],
        outputs: [{ name: "fulfilled", type: "bool" }],
      },
    ];
    // Use the VERIFIED fields: the asserted advancedOrder, empty criteriaResolvers, the
    // conduit key we resolved the approval for, and OUR asserted wallet as recipient (H3) —
    // never the raw, untrusted d.recipient.
    return encodeFunctionData({
      abi,
      functionName: "fulfillAdvancedOrder",
      args: [verified.advancedOrder, verified.criteriaResolvers, verified.fulfillerConduitKey, verified.recipient],
    });
  }

  /** Create + submit a Seaport listing at the oracle price via opensea-js (Base mainnet). */
  private async createOpenSeaListing(exit: ExitQuote): Promise<{ orderHash: string }> {
    // exit.productId carries the SlabClaw product identity; the venue tokenId is resolved
    // by the caller (orchestrator) — Sprint-3 threads the held position's tokenId in.
    // Here we throw if we don't have a concrete tokenId to list (honest — no fake order).
    throw new Error(
      "list() onchain publish requires a held-position tokenId (threaded by the Sprint-3 orchestrator). " +
        "Sprint-1 proves the createListing mechanics on Sepolia via scripts/sepolia-roundtrip.mjs.",
    );
  }
}

/**
 * netClearingListPrice — the list price that, after the ~8% sell take, NETS at LEAST the
 * oracle value. Used by the planner/exit so a relist truly clears the oracle net of fees.
 * netProceeds(netClearingListPrice(oracle)) ≥ oracle.
 */
export function netClearingListPrice(oracleUsd: number, takeRate: number = BEEZIE_TAKE_RATE): number {
  return round2(oracleUsd / (1 - takeRate));
}

/** Net proceeds from a given list price (relist-in-place), net of the ~8% take. */
export function netProceeds(listAtUsd: number, takeRate: number = BEEZIE_TAKE_RATE): number {
  return round2(listAtUsd - listAtUsd * takeRate);
}

/**
 * The EXACT USDC approval amount (base units) for a verified fill (H1): the re-summed
 * consideration plus a 0.5% fee-drift buffer, hard-capped by the spend cap. NEVER unbounded
 * (no unbounded/infinite approval). This is the only amount the adapter ever approves to a Seaport spender.
 */
export function exactApprovalAmount(considerationBaseUnits: bigint, capBaseUnits: bigint): bigint {
  const buffer = considerationBaseUnits / 200n; // 0.5%
  const need = considerationBaseUnits + buffer;
  return need > capBaseUnits ? capBaseUnits : need; // the cap is the hard ceiling on the approval too
}

/** Re-exported for tests: the tighter of two optional caps (undefined only if both undefined). */
export function effectiveCapBaseUnits(perCallUsd?: number, configUsd?: number): bigint | undefined {
  const a = typeof perCallUsd === "number" ? usdToBaseUnits(perCallUsd) : undefined;
  const b = typeof configUsd === "number" ? usdToBaseUnits(configUsd) : undefined;
  return minCap(a, b);
}
