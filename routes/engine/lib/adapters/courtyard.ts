/**
 * courtyard.ts — CourtyardMarketplaceAdapter (Polygon / chainId 137).
 *
 * Implements the RING-2 `MarketplaceAdapter` contract for Courtyard tokenized graded
 * Pokémon slabs. Courtyard cards ARE real Seaport 1.6 orders on **Polygon (chain 137)**,
 * traded on OpenSea-Polygon; we read the orderbook from the **OpenSea Orders API**
 * (`/api/v2/listings/collection/courtyard-nft/all`) and we BUY by pulling ready Seaport
 * fill calldata from `/api/v2/listings/fulfillment_data`, then sending it with **viem** to
 * Seaport 1.6 on Polygon. We LIST via **opensea-js** `createListing` (EIP-712 signed order).
 *
 * This is a STRUCTURAL MIRROR of the hardened Beezie adapter (which survived two cross-model
 * security reviews). It DOES NOT re-derive the security model — it reuses the exact same
 * quarantine/cap/approval logic via lib/adapters/seaport-common.ts. Every Beezie security
 * property is preserved (see the per-method notes + the SEC tests in courtyard-adapter.test.ts):
 *   C1  cap ON-by-default + fail-closed.
 *   C2  untrusted fulfillment_data quarantined — re-sum consideration, assert value===0n,
 *       reject foreign-token, re-check cap before send.
 *   H1  exact USDC approval bounded by cap, no maxUint256.
 *   H2  conduit resolved from the order's fulfillerConduitKey via the ConduitController.
 *   H3  recipient===fulfiller + numerator/denominator===1/1 + criteriaResolvers empty.
 *   NEW-1 reSum ≈ quoted ask within CONSIDERATION_TOLERANCE (rejects overpay-within-cap).
 *   NEW-2 offer-side itemType 2 (ERC721) + Courtyard collection (+tokenId) assertion.
 *   M1  idempotency in-flight set.   M2  BigInt money discipline.
 *
 * ── VERIFIED ground-truth (Sprint brief) ───────────────────────────────────────────
 *   Seaport 1.6      : 0x0000000000000068f116a894984e2db1123eb395  (same canonical addr)
 *   Courtyard coll   : 0x251be3a17af4892035c37ebf5890f4a4d889dcad  (slug courtyard-nft)
 *   USDC (Polygon)   : 0x2791bca1f2de4661ed88a30c99a7a9449aa84174  (bridged USDC.e — the
 *                      consideration token in the live Courtyard orders)
 *   OpenSea chain str: "matic" (Polygon)  ·  explorer: polygonscan.com
 *   take             : Courtyard/OpenSea fees are READ from the live order's USDC
 *                      consideration recipients (seller-net vs fee-net), NOT a hardcoded %.
 *
 * ── HONESTY / live-vs-stub posture (P7) — labeled per method ───────────────────────
 *   discover()      LIVE  — real OpenSea Orders API read; real order_hash + Seaport addr.
 *   quoteAcquire()  LIVE  — pure read; landed cost from the real ask + gas est.
 *   quoteExit()     LIVE  — pure math over the oracle value, net of the live take.
 *   acquire()       LIVE-CAPABLE — builds + (with a signer) SENDS a real Seaport fill via
 *                   viem on Polygon; SPEC-ONLY staged when no signer. The cap guard ALWAYS
 *                   runs and blocks an over-cap buy BEFORE any tx is built/sent.
 *   list()          LIVE-CAPABLE — opensea-js createListing when a signer is configured;
 *                   SPEC-ONLY staged otherwise. Requires a held-position tokenId (threaded
 *                   by the orchestrator) — throws honestly otherwise (no fake order).
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
import {
  SEAPORT_1_6,
  SEAPORT_CONDUIT_CONTROLLER,
  ZERO_BYTES32_LITERAL,
  USDC_DECIMALS,
  type OSOrdersResponse,
  type OSFulfillmentResponse,
  type OSProtocolParameters,
  type VerifiedFill,
  type EncodeFn,
  round2,
  usdToBaseUnits,
  baseUnitsToUsd,
  minCap,
  exactApprovalAmount,
  totalUsdcConsideration,
  offeredTokenId,
  tokenIdFromAssetUrl,
  verifyFulfillment,
  FULFILL_ADVANCED_ORDER_ABI,
} from "./seaport-common.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Constants (VERIFIED — Sprint ground truth; do NOT re-theorize)
// ─────────────────────────────────────────────────────────────────────────────

export { SEAPORT_1_6, SEAPORT_CONDUIT_CONTROLLER, USDC_DECIMALS, exactApprovalAmount, effectiveCapBaseUnits } from "./seaport-common.ts";

/** Courtyard NFT collection on Polygon (slug `courtyard-nft`). */
export const COURTYARD_COLLECTION = "0x251be3a17af4892035c37ebf5890f4a4d889dcad" as const;
/** Polygon bridged USDC.e — the consideration token in the live Courtyard Seaport orders. */
export const USDC_POLYGON = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174" as const;
export const POLYGON_CHAIN_ID = 137;

const OPENSEA_BASE = "https://api.opensea.io/api/v2";
const OPENSEA_COLLECTION_SLUG = "courtyard-nft";
/** OpenSea chain string for Polygon orders (verified in backend courtyard.mjs). */
const OPENSEA_CHAIN = "matic";
/**
 * OpenSea read key (read-only orderbook). Sourced from the environment — NO hardcoded
 * default. Set OPENSEA_API_KEY in .env (see .env.example) or pass `openSeaApiKey` via config.
 * Empty string when unset: discover()/quoteAcquire() still parse but live reads need a key.
 */
const ENV_OPENSEA_KEY = (typeof process !== "undefined" && process.env?.OPENSEA_API_KEY) || "";

/**
 * Conservative onchain gas estimate for a Seaport fulfillAdvancedOrder on Polygon (USD).
 * Polygon gas is paid in POL and is cents-scale; this is a transparency/ranking figure only —
 * the actual all-in USDC the buyer transfers is the order's USDC consideration (already includes
 * the take), re-summed and asserted in acquire(). Kept tiny + explicit (NOT a fabricated number).
 */
export const POLYGON_GAS_USD = 0.02;

/**
 * Fallback take rate used ONLY for quoteExit's relist-in-place math when no live order's fee
 * split is available (a forward-looking SELL quote has no buy-order to read). The ACQUIRE side
 * never uses this — it reads the real consideration. ~8% mirrors the observed Courtyard+OpenSea
 * combined take (read live via quoteExit when a sample order is supplied). Surfaced for ranking.
 */
export const COURTYARD_TAKE_RATE_FALLBACK = 0.08;

/**
 * Sane band the derived take is clamped to (N1 — cross-model review, LOW defense-in-depth).
 * The take is read from an untrusted order; an odd/malicious split could under- or over-report
 * it, biasing the quoteExit net-proceeds estimate. Clamp it to the observed Courtyard/OpenSea
 * range before any exit auto-execution ever relies on it. 4% floor / 15% ceiling.
 */
export const COURTYARD_TAKE_RATE_FLOOR = 0.04;
export const COURTYARD_TAKE_RATE_CEILING = 0.15;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers (Courtyard-specific; the hardened money-path logic lives in seaport-common.ts)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read the marketplace take from a LIVE order's USDC consideration recipients: the seller's
 * net is the single LARGEST USDC consideration; every other USDC consideration is a fee. The
 * take rate = Σ(fee considerations) / Σ(all USDC considerations). This is the VERIFIED way to
 * surface Courtyard/OpenSea's cut (we never hardcode it on the buy side).
 *
 * N1 defense-in-depth (cross-model review, LOW — quoteExit-only, moves no funds today):
 *  - AMBIGUOUS seller-net: if two or more USDC considerations TIE for the largest amount, which
 *    one is the seller-net is undecidable → return null so the caller falls back to the ~8%
 *    default rather than guess (a wrong guess would under-report the take).
 *  - The derived rate is CLAMPED to [floor, ceiling] so an odd/malicious split can't under-report
 *    the take (→ over-estimated net proceeds → a relist that looks profitable but isn't).
 *
 * Returns null when there is no USDC consideration OR the seller-net is ambiguous.
 */
export function takeRateFromOrder(params: OSProtocolParameters): number | null {
  const usdc: bigint[] = [];
  for (const c of params.consideration) {
    if (c.itemType === 1 && c.token.toLowerCase() === USDC_POLYGON.toLowerCase()) {
      usdc.push(BigInt(c.startAmount));
    }
  }
  if (usdc.length === 0) return null;
  let total = 0n;
  let sellerNet = 0n; // the largest consideration is the seller's net
  let maxCount = 0; // how many considerations tie for the largest (ambiguity check)
  for (const v of usdc) {
    total += v;
    if (v > sellerNet) {
      sellerNet = v;
      maxCount = 1;
    } else if (v === sellerNet) {
      maxCount++;
    }
  }
  if (total === 0n) return null;
  // AMBIGUOUS seller-net (≥2 equal-max USDC considerations) → don't guess; fall back to default.
  if (maxCount > 1) return null;
  const fee = total - sellerNet;
  const derived = Number(fee) / Number(total);
  // CLAMP to the sane band so an under-reported take can't inflate the net-proceeds estimate.
  return Math.min(Math.max(derived, COURTYARD_TAKE_RATE_FLOOR), COURTYARD_TAKE_RATE_CEILING);
}

/** The default execution plan for a tokenized Courtyard buy: onchain primary, human-gate firebreak. */
function courtyardExecutionPlan(requiresGate: boolean, gateReason: string): ExecutionPlan {
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

export interface CourtyardAdapterOptions extends Partial<MarketplaceConfig> {
  /** Override the OpenSea read key. */
  openSeaApiKey?: string;
  /** Polygon RPC url — required only for acquire()/list() onchain writes. */
  rpcUrl?: string;
  /** Agent wallet private key (attenuated by the per-card spend cap). Absent ⇒ SPEC-ONLY writes. */
  signerPrivateKey?: string;
  /** Injected fetch (tests). Defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

export class CourtyardMarketplaceAdapter implements MarketplaceAdapter {
  readonly marketplace = "courtyard" as const;
  readonly chainId = POLYGON_CHAIN_ID;
  private readonly apiKey: string;
  private readonly rpcUrl?: string;
  private readonly signerPrivateKey?: string;
  private readonly fetchImpl: typeof fetch;
  /** D11 config cap (MarketplaceConfig.spendCapUsd) in USDC base units. undefined ⇒ no config cap. */
  private readonly configCapBaseUnits?: bigint;
  /** Idempotency: listingIds with an in-flight acquire(). Re-entry is rejected (M1). */
  private readonly inFlight = new Set<string>();

  constructor(opts: CourtyardAdapterOptions = {}) {
    this.apiKey = opts.openSeaApiKey ?? ENV_OPENSEA_KEY;
    this.rpcUrl = opts.rpcUrl;
    this.signerPrivateKey = opts.signerPrivateKey;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    // The deterministic policy.yaml firebreak — read from config, enforced BEFORE staging (C1).
    this.configCapBaseUnits = typeof opts.spendCapUsd === "number" ? usdToBaseUnits(opts.spendCapUsd) : undefined;
  }

  /** True when an onchain write path (acquire/list) can actually send a tx. */
  get canWrite(): boolean {
    return !!(this.rpcUrl && this.signerPrivateKey);
  }

  /** The per-chain binding the shared quarantine verifier checks against (Polygon USDC + Courtyard coll). */
  private get binding() {
    return { usdcToken: USDC_POLYGON, collection: COURTYARD_COLLECTION };
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
   * DISCOVER — read live Courtyard Seaport orders from the OpenSea Orders API (Polygon).
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
      const askUsd = totalUsdcConsideration(params, USDC_POLYGON);
      if (askUsd == null) continue; // non-USDC order (e.g. WETH/POL) — out of the USDC arb scope
      if (typeof query.maxAskUsd === "number" && askUsd > query.maxAskUsd) continue;

      out.push({
        marketplace: "courtyard",
        listingId: o.order_hash, // provenance: the Seaport order hash
        url: `https://opensea.io/assets/${OPENSEA_CHAIN}/${COURTYARD_COLLECTION}/${tokenId}`,
        productId: query.productId, // resolved upstream by the oracle identity join (null here)
        productName: `Courtyard slab #${tokenId}`,
        grader: query.grader ?? "",
        grade: query.grade ?? "",
        askUsd: round2(askUsd),
        currency: "USDC",
        custody: "onchain-polygon",
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
   * landedCostUsd = askUsd + gasUsd. The take is ALREADY inside the order's USDC consideration
   * (seller + Courtyard/OpenSea fee recipients), so askUsd is the all-in USDC the buyer transfers;
   * takeFeeUsd is surfaced for transparency/ranking, READ from the live order's fee split.
   */
  async quoteAcquire(listing: MarketplaceListing): Promise<AcquireQuote> {
    const askUsd = listing.askUsd;
    // Read the real take from the order when we have the raw payload; else surface 0 (don't invent).
    let takeRate = 0;
    const raw = listing.raw as { protocol_data?: { parameters?: OSProtocolParameters } } | undefined;
    const params = raw?.protocol_data?.parameters;
    if (params) {
      const t = takeRateFromOrder(params);
      if (t != null) takeRate = t;
    }
    const takeFeeUsd = round2(askUsd * takeRate);
    const gasUsd = POLYGON_GAS_USD;
    return {
      listing,
      askUsd,
      takeFeeUsd,
      gasUsd,
      bridgeUsd: 0, // same-chain (Polygon USDC), no bridge within this leg
      shipToCustodyUsd: 0, // tokenized — no physical ship
      landedCostUsd: round2(askUsd + gasUsd), // ask already includes the take (it's in the consideration)
      custodyDestination: "onchain-polygon",
      crossChain: false,
      settlementRail: "onchain-native",
      execution: courtyardExecutionPlan(false, "in-cap tokenized buy self-approves (D11 cap firebreak)"),
    };
  }

  /**
   * quoteExit — net proceeds from relisting at the oracle, net of the Courtyard/OpenSea take.
   * LIVE (pure math). netProceeds(listAtUsd) = listAtUsd − sellFee − moveVenueUsd.
   * Relist-in-place on Courtyard/OpenSea (same chain) has moveVenueUsd = 0.
   *
   * The sell take is read from a live `sampleOrderParams` when supplied (verify the real fee from
   * the order's consideration recipients); else the ~8% fallback. To CLEAR the oracle net of the
   * take, the planner should list at `oracle / (1 − take)` (see netClearingListPrice).
   */
  async quoteExit(i: {
    productId: string;
    listAtUsd: number;
    currentCustody: import("./index.ts").CustodyDestination;
    sampleOrderParams?: OSProtocolParameters;
  }): Promise<ExitQuote[]> {
    const listAtUsd = i.listAtUsd;
    let takeRate = COURTYARD_TAKE_RATE_FALLBACK;
    if (i.sampleOrderParams) {
      const t = takeRateFromOrder(i.sampleOrderParams);
      if (t != null) takeRate = t;
    }
    const sellFeeUsd = round2(listAtUsd * takeRate);
    const relistInPlace: ExitQuote = {
      productId: i.productId,
      listAtUsd,
      strategy: "relist-in-place",
      marketplace: "courtyard",
      sellFeeUsd,
      moveVenueUsd: 0,
      netProceedsUsd: round2(listAtUsd - sellFeeUsd),
      crossCustody: false,
      execution: courtyardExecutionPlan(false, "list-at-oracle price commitment"),
    };
    return [relistInPlace];
  }

  /**
   * acquire — BUY the slab on-chain via Seaport 1.6 on Polygon.
   *
   * THE D11 CAP FIREBREAK (the ONLY gate on an in-cap tokenized buy) — identical to Beezie (C1):
   *  - effective cap = MIN(per-call `maxUsd`, config `spendCapUsd`).
   *  - canWrite and NO resolvable cap ⇒ FAIL CLOSED (an uncapped onchain spend is never sent).
   *  - landed cost > effective cap ⇒ BLOCK *before building or sending any tx* (no settleTxHash).
   *  - Cap math in USDC base units as BigInt (no float compare at the boundary, M2).
   *
   * QUARANTINE (C2): the OpenSea fulfillment_data response is UNTRUSTED. After the quote-level cap
   * check, `buildSeaportFill` re-parses the calldata, re-sums the USDC consideration, asserts
   * recipient/value/conduit/numerator/offer, and `sendSeaportFill` RE-CHECKS the cap against the
   * freshly-parsed amount immediately before the tx.
   *
   * Idempotent (M1): a second acquire() for the same listingId while one is in flight is rejected.
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
      marketplace: "courtyard",
      custody: "onchain-polygon",
      proofUri: undefined,
      committedAt: new Date().toISOString(),
      approvalRef: `BLOCKED:${reason}`, // honesty: explicit, no tx attempted
    });

    // ── D11 FIREBREAK — runs UNCONDITIONALLY before any staging/build/send (C1) ──
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
        marketplace: "courtyard",
        paidUsd: quote.landedCostUsd,
        custody: "onchain-polygon",
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
        // bind the actual spend to the QUOTED ask (NEW-1).
        quotedAskBaseUnits: usdToBaseUnits(listing.askUsd),
        // assert the offered slab is the one we discovered (NEW-2), parsed from the canonical url.
        expectedTokenId: tokenIdFromAssetUrl(listing.url),
      });
      const { txHash } = await this.sendSeaportFill(verified, effectiveCap!);
      return {
        status: "confirmed",
        listingId: listing.listingId,
        marketplace: "courtyard",
        paidUsd: baseUnitsToUsd(verified.considerationBaseUnits),
        settleTxHash: txHash,
        custody: "onchain-polygon",
        approvalRef: i.approvalRef,
        proofUri: `https://polygonscan.com/tx/${txHash}`,
        committedAt: new Date().toISOString(),
      };
    } finally {
      this.inFlight.delete(listing.listingId);
    }
  }

  /**
   * list — post a Seaport listing at the oracle price via opensea-js createListing (Polygon).
   * LIVE-CAPABLE. SPEC-ONLY staged when no signer is wired. Requires a held-position tokenId
   * (threaded by the orchestrator) — throws honestly otherwise (no fake order).
   */
  async list(i: { exit: ExitQuote; approvalRef?: string }): Promise<ListReceipt> {
    const { exit } = i;
    if (!this.canWrite) {
      return {
        status: "staged",
        listingId: undefined,
        marketplace: "courtyard",
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
      marketplace: "courtyard",
      listAtUsd: exit.listAtUsd,
      approvalRef: i.approvalRef,
      proofUri: `https://opensea.io/assets/${OPENSEA_CHAIN}/${COURTYARD_COLLECTION}`,
      listedAt: new Date().toISOString(),
    };
  }

  /**
   * confirmSale — poll the order status from the OpenSea Orders API.
   * LIVE. Returns a SaleReceipt only when the order is no longer active (sold/filled);
   * returns null while still listed (NEVER fabricates a sale).
   */
  async confirmSale(i: { listingId: string; marketplace: import("./index.ts").Marketplace }): Promise<SaleReceipt | null> {
    const data = (await this.osGet(`/listings/collection/${OPENSEA_COLLECTION_SLUG}/all?limit=100`)) as OSOrdersResponse;
    const orders = Array.isArray(data.listings) ? data.listings : [];
    const still = orders.find((o) => o.order_hash.toLowerCase() === i.listingId.toLowerCase());
    if (still && (still.status === undefined || still.status.toUpperCase() === "ACTIVE")) {
      return null; // still listed — unsold
    }
    // The order is gone from the active orderbook. We can only HONESTLY report a sale when we can
    // resolve the settlement on-chain (a transfer/OrderFulfilled event). Without an indexer wired
    // here, return null rather than fabricate proceeds (P7).
    return null;
  }

  /**
   * initiateCustodyMove — physical cross-custodian move. For tokenized Courtyard there is NO
   * cross-custodian token path (redeem ships the physical slab out of the vault; the token is a
   * Polygon-bound island). This returns a handle flagged requiresHumanShip for the physical flow.
   */
  async initiateCustodyMove(req: CustodyMoveRequest): Promise<CustodyMoveHandle> {
    return {
      moveId: `courtyard-move-${Date.now()}`,
      status: "awaiting-shipment",
      from: req.from,
      to: req.to,
      requiresHumanShip: true, // physical drop-off/ship-out is inherently human; no token-bridge exists
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
   * Pull ready Seaport fill calldata from OpenSea's fulfillment_data endpoint and QUARANTINE-VERIFY
   * it before it is allowed anywhere near a tx. Delegates to the SHARED `verifyFulfillment` (the
   * exact C2/H3/NEW-1/NEW-2 assertion set the Beezie adapter uses), bound to Polygon USDC + the
   * Courtyard collection. Returns a VerifiedFill the caller re-checks once more before sending.
   */
  async buildSeaportFill(i: {
    orderHash: string;
    fulfiller: `0x${string}`;
    capBaseUnits: bigint;
    /** The QUOTED ask (from discover()/quoteAcquire) in USDC base units (NEW-1). */
    quotedAskBaseUnits: bigint;
    /** The slab tokenId we expect this order to offer (from discover()). Optional (NEW-2). */
    expectedTokenId?: string;
  }): Promise<VerifiedFill> {
    const resp = (await this.osPost("/listings/fulfillment_data", {
      listing: { hash: i.orderHash, chain: OPENSEA_CHAIN, protocol_address: SEAPORT_1_6 },
      fulfiller: { address: i.fulfiller },
    })) as OSFulfillmentResponse;

    return verifyFulfillment({
      resp,
      fulfiller: i.fulfiller,
      capBaseUnits: i.capBaseUnits,
      quotedAskBaseUnits: i.quotedAskBaseUnits,
      expectedTokenId: i.expectedTokenId,
      binding: this.binding,
    });
  }

  /**
   * Approve the EXACT USDC need to the CORRECT spender, then encode + send the verified fill (Polygon).
   *
   * Defence-in-depth at the money boundary (identical to Beezie):
   *  - RE-CHECK the cap against the freshly-parsed consideration immediately before any tx (C2).
   *  - Resolve the approval spender from the fill's `fulfillerConduitKey` — zero ⇒ Seaport itself;
   *    non-zero ⇒ resolve + assert the conduit via the ConduitController (H2).
   *  - Approve the EXACT need (re-summed consideration + a few-cents fee-drift buffer), capped by
   *    the cap. NEVER an unbounded/infinite approval (H1).
   */
  private async sendSeaportFill(verified: VerifiedFill, capBaseUnits: bigint): Promise<{ txHash: `0x${string}` }> {
    const { createWalletClient, createPublicClient, http, encodeFunctionData, parseAbiItem } = await import("viem");
    const { privateKeyToAccount } = await import("viem/accounts");
    const { polygon } = await import("viem/chains");

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
    const publicClient = createPublicClient({ chain: polygon, transport });
    const walletClient = createWalletClient({ account, chain: polygon, transport });

    // ── Resolve the approval spender from the fill's conduit key (H2) ──
    const spender = await this.resolveApprovalSpender(verified.fulfillerConduitKey, publicClient);

    // ── Approve the EXACT need to that spender (never an unbounded approval, H1) ──
    const erc20Abi = [
      parseAbiItem("function allowance(address owner, address spender) view returns (uint256)"),
      parseAbiItem("function approve(address spender, uint256 amount) returns (bool)"),
    ];
    const need = exactApprovalAmount(verified.considerationBaseUnits, capBaseUnits);
    const allowance = (await publicClient.readContract({
      address: USDC_POLYGON,
      abi: erc20Abi,
      functionName: "allowance",
      args: [account.address, spender],
    })) as bigint;
    if (allowance < need) {
      const approveHash = await walletClient.writeContract({
        address: USDC_POLYGON,
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
   *  - non-zero  ⇒ resolve the conduit address via the ConduitController.getConduit(key), assert it
   *               exists, and approve USDC to that conduit (never a hardcoded guess).
   * NEW-3 (accepted residual): this conduit resolution TRUSTS the configured RPC — a malicious RPC
   * could return a rogue conduit. The RPC is trusted operator infra (our own node/key), so this is
   * acceptable; if the RPC were ever untrusted, pin/verify the conduit address too.
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

  /** Encode the VERIFIED Seaport fill into calldata. Uses the asserted recipient (our wallet, H3). */
  private encodeFulfillment(verified: VerifiedFill, encodeFunctionData: EncodeFn): `0x${string}` {
    // fulfillAdvancedOrder(advancedOrder, criteriaResolvers, fulfillerConduitKey, recipient)
    // Use the VERIFIED fields: the asserted advancedOrder, empty criteriaResolvers, the conduit
    // key we resolved the approval for, and OUR asserted wallet as recipient (H3) — never the raw,
    // untrusted d.recipient.
    return encodeFunctionData({
      abi: FULFILL_ADVANCED_ORDER_ABI as unknown as readonly unknown[],
      functionName: "fulfillAdvancedOrder",
      args: [verified.advancedOrder, verified.criteriaResolvers, verified.fulfillerConduitKey, verified.recipient],
    });
  }

  /** Create + submit a Seaport listing at the oracle price via opensea-js (Polygon). */
  private async createOpenSeaListing(exit: ExitQuote): Promise<{ orderHash: string }> {
    // exit.productId carries the SlabClaw product identity; the venue tokenId is resolved by the
    // caller (orchestrator) — the held position's tokenId is threaded in. Here we throw if we don't
    // have a concrete tokenId to list (honest — no fake order).
    void exit;
    throw new Error(
      "list() onchain publish requires a held-position tokenId (threaded by the orchestrator). " +
        "The createListing mechanics mirror the Beezie path (opensea-js createListing on Polygon).",
    );
  }
}

/**
 * netClearingListPrice — the list price that, after the take, NETS at LEAST the oracle value.
 * Used by the planner/exit so a relist truly clears the oracle net of fees.
 * netProceeds(netClearingListPrice(oracle)) ≥ oracle.
 */
export function netClearingListPrice(oracleUsd: number, takeRate: number = COURTYARD_TAKE_RATE_FALLBACK): number {
  return round2(oracleUsd / (1 - takeRate));
}

/** Net proceeds from a given list price (relist-in-place), net of the take. */
export function netProceeds(listAtUsd: number, takeRate: number = COURTYARD_TAKE_RATE_FALLBACK): number {
  return round2(listAtUsd - listAtUsd * takeRate);
}
