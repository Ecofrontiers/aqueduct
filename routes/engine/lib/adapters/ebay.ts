/**
 * ebay.ts — EbayMarketplaceAdapter (physical / fiat venue).
 *
 * Implements the RING-2 `MarketplaceAdapter` contract for eBay. eBay is a PHYSICAL venue:
 * the asset is a graded slab that ships, and settlement is fiat (Stripe Issuing virtual
 * card), never onchain. eBay's role in the SlabClaw §0 loop is BUY + RE-ROUTE:
 *
 *   discover()            LIVE-CAPABLE — eBay Buy/Browse READ (client-credentials app token).
 *                         The PRODUCTION discovery source is the SlabClaw cross-marketplace
 *                         deal feed; this Browse read is a best-effort/standalone evidence path.
 *   quoteAcquire()        LIVE — pure landed-cost math (ask + inbound shipping + ship-to-vault).
 *   quoteExit()           TEMPLATE math — net of the eBay final-value fee. SlabClaw's own demo
 *                         does NOT sell on eBay (it exits on the tokenized venue after re-route);
 *                         this is here for downstream users who DO relist on eBay.
 *   acquire()             HUMAN-GATED — eBay checkout is an irreversible fiat spend; it is ALWAYS
 *                         browser + human-gate (Stripe Issuing card, capped). The D11 cap firebreak
 *                         runs UNCONDITIONALLY and blocks an over-cap / no-cap buy BEFORE staging.
 *                         Never fabricates a purchase.
 *   list()                DOWNSTREAM TEMPLATE — delegates to the eBay Sell Inventory client. Returns
 *                         a `staged` receipt naming the missing config until a downstream user wires
 *                         their own EBAY_* creds + seller setup. Never fabricates a listing.
 *   confirmSale()         honest null — no order indexer wired here (matches the repo posture); a
 *                         downstream user wires the Sell Fulfillment poll. Never fabricates a sale.
 *   initiateCustodyMove() THE RE-ROUTE — the eBay-bought slab (self-custody) ships to a vault
 *                         (Courtyard/PSA) to tokenize. Physical, multi-day, human drop-off.
 *
 * NO randomness, NO fabricated tx hashes / order ids / sales anywhere in this file.
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
  type CustodyDestination,
  type Marketplace,
  type ExecutionPlan,
} from "./index.ts";
import { EbayOAuth, ebayOAuthConfigFromEnv, type EbayEnvironment } from "./ebay-oauth.ts";
import { EbayInventoryClient, ebaySellerConfigFromEnv, type EbaySellerConfig, type RelistRequest } from "./ebay-inventory.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Constants (eBay economics — configurable; defaults are the trading-card schedule)
// ─────────────────────────────────────────────────────────────────────────────

const BROWSE_HOSTS: Record<EbayEnvironment, string> = {
  production: "https://api.ebay.com",
  sandbox: "https://api.sandbox.ebay.com",
};

/**
 * eBay final-value fee for trading cards (the SELL-side take): ~13.35% of the total amount
 * of the sale (item + shipping) for most categories, PLUS a per-order fee. The buyer pays
 * NO final-value fee — so this only enters quoteExit (a relist), never quoteAcquire (a buy).
 * Configurable via EbayAdapterOptions; defaults are conservative/round.
 */
export const EBAY_FINAL_VALUE_FEE_RATE = 0.1335;
export const EBAY_PER_ORDER_FEE_USD = 0.4;

/** Default cost to ship a graded slab INTO a vault/custody (insured). Configurable. */
export const DEFAULT_SHIP_TO_CUSTODY_USD = 15;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** The eBay sell take on a given sale price (item only): FVF% + per-order fee. */
export function ebayFinalValueFee(
  saleUsd: number,
  rate: number = EBAY_FINAL_VALUE_FEE_RATE,
  perOrder: number = EBAY_PER_ORDER_FEE_USD,
): number {
  return round2(saleUsd * rate + perOrder);
}

/** Net proceeds from relisting at a given price on eBay (relist-in-place), net of the take. */
export function ebayNetProceeds(listAtUsd: number, rate: number = EBAY_FINAL_VALUE_FEE_RATE, perOrder: number = EBAY_PER_ORDER_FEE_USD): number {
  return round2(listAtUsd - ebayFinalValueFee(listAtUsd, rate, perOrder));
}

/** The execution plan for an eBay BUY: browser checkout primary, human-gate firebreak (always). */
function ebayBuyExecutionPlan(): ExecutionPlan {
  return {
    primary: "browser",
    fallbacks: ["human-gate"],
    driver: "browser_camofox", // logged-in eBay session; the agent never types card secrets (Stripe Issuing)
    requiresHumanGate: true, // eBay checkout is an irreversible fiat spend (firebreak)
    gateReason: "eBay checkout is an irreversible fiat spend — browser + human-gate, paid by a capped Stripe Issuing virtual card",
  };
}

/** The execution plan for an eBay LIST: Sell Inventory API primary, human-gate on the price commitment. */
function ebayListExecutionPlan(): ExecutionPlan {
  return {
    primary: "api",
    fallbacks: ["human-gate"],
    requiresHumanGate: true,
    gateReason: "public list-at-oracle price commitment on eBay",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Browse API payload (the subset we read)
// ─────────────────────────────────────────────────────────────────────────────

interface BrowsePrice {
  value?: string;
  currency?: string;
}
interface BrowseItemSummary {
  itemId?: string;
  title?: string;
  price?: BrowsePrice;
  shippingOptions?: Array<{ shippingCost?: BrowsePrice }>;
  itemWebUrl?: string;
  image?: { imageUrl?: string };
  condition?: string;
}
interface BrowseSearchResponse {
  itemSummaries?: BrowseItemSummary[];
  total?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Options
// ─────────────────────────────────────────────────────────────────────────────

export interface EbayAdapterOptions extends Partial<MarketplaceConfig> {
  environment?: EbayEnvironment;
  /** Per-seller listing config for the downstream relist template. */
  seller?: EbaySellerConfig;
  /** Override the inbound ship-to-custody estimate (insured slab shipping). */
  shipToCustodyUsd?: number;
  /** Override the eBay final-value fee rate (sell side). */
  finalValueFeeRate?: number;
  /** Injected OAuth (tests). When omitted, built from the provided creds / env. */
  oauth?: EbayOAuth;
  /** Injected inventory client (tests). When omitted, built from oauth + seller. */
  inventory?: EbayInventoryClient;
  /** Injected fetch (tests). Defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

// ─────────────────────────────────────────────────────────────────────────────
// The adapter
// ─────────────────────────────────────────────────────────────────────────────

export class EbayMarketplaceAdapter implements MarketplaceAdapter {
  readonly marketplace = "ebay" as const;
  readonly environment: EbayEnvironment;
  private readonly oauth: EbayOAuth;
  private readonly inventory: EbayInventoryClient;
  private readonly fetchImpl: typeof fetch;
  private readonly browseBase: string;
  private readonly shipToCustodyUsd: number;
  private readonly fvfRate: number;
  /** D11 config cap (MarketplaceConfig.spendCapUsd). undefined ⇒ no config cap. */
  private readonly configCapUsd?: number;

  constructor(opts: EbayAdapterOptions = {}) {
    this.environment = opts.environment ?? "production";
    this.oauth =
      opts.oauth ??
      new EbayOAuth({
        ...ebayOAuthConfigFromEnv(),
        environment: this.environment,
        clientId: opts.ebayClientId,
        clientSecret: opts.ebayClientSecret,
        userRefreshToken: opts.ebayUserToken,
        fetchImpl: opts.fetchImpl,
      });
    this.inventory =
      opts.inventory ?? new EbayInventoryClient({ oauth: this.oauth, seller: opts.seller ?? ebaySellerConfigFromEnv(), fetchImpl: opts.fetchImpl });
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.browseBase = BROWSE_HOSTS[this.environment];
    this.shipToCustodyUsd = typeof opts.shipToCustodyUsd === "number" ? opts.shipToCustodyUsd : DEFAULT_SHIP_TO_CUSTODY_USD;
    this.fvfRate = typeof opts.finalValueFeeRate === "number" ? opts.finalValueFeeRate : EBAY_FINAL_VALUE_FEE_RATE;
    this.configCapUsd = typeof opts.spendCapUsd === "number" ? opts.spendCapUsd : undefined;
  }

  /** True when the autonomous eBay relist template is fully wired by a downstream user. */
  get canRelist(): boolean {
    return this.inventory.isConfigured;
  }

  // ── DISCOVER — eBay Buy/Browse READ (client-credentials app token) ───────────
  /**
   * Best-effort LIVE read of fixed-price eBay listings. NOTE: the PRODUCTION acquisition
   * discovery source is the SlabClaw cross-marketplace deal feed (DealsAdapter); this Browse
   * read is a standalone/evidence path. Returns [] (not an error) when no app creds are wired.
   */
  async discover(query: ListingQuery): Promise<MarketplaceListing[]> {
    if (!this.oauth.isAppConfigured) return []; // honest: no creds ⇒ nothing to read (not a fake)
    const limit = Math.min(Math.max(query.limit ?? 25, 1), 200);
    const keywords = [query.grader, query.grade, "pokemon"].filter(Boolean).join(" ").trim() || "pokemon graded";
    const params = new URLSearchParams({ q: keywords, limit: String(limit) });
    const filters = ["buyingOptions:{FIXED_PRICE}"];
    if (typeof query.maxAskUsd === "number") filters.push(`price:[..${query.maxAskUsd}],priceCurrency:USD`);
    params.set("filter", filters.join(","));

    const token = await this.oauth.getAppAccessToken();
    const res = await this.fetchImpl(`${this.browseBase}/buy/browse/v1/item_summary/search?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "X-EBAY-C-MARKETPLACE-ID": "EBAY_US" },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`eBay Browse search -> HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as BrowseSearchResponse;
    const items = Array.isArray(data.itemSummaries) ? data.itemSummaries : [];
    const out: MarketplaceListing[] = [];
    for (const it of items) {
      const ask = it.price?.value ? Number(it.price.value) : NaN;
      if (!it.itemId || !Number.isFinite(ask)) continue;
      if (typeof query.maxAskUsd === "number" && ask > query.maxAskUsd) continue;
      out.push({
        marketplace: "ebay",
        listingId: it.itemId,
        url: it.itemWebUrl ?? `https://www.ebay.com/itm/${it.itemId}`,
        productId: query.productId,
        productName: it.title ?? "?",
        grader: query.grader ?? "",
        grade: query.grade ?? "",
        askUsd: round2(ask),
        currency: it.price?.currency ?? "USD",
        custody: "self-custody", // a bought eBay slab arrives in our own hands (then re-routes to a vault)
        tokenized: false,
        isLive: true, // Browse only returns live listings
        raw: it,
      });
    }
    return out;
  }

  // ── quoteAcquire — landed cost to OWN the slab (buy + ship-in + ship-to-vault) ──
  /**
   * Landed cost = ask + inbound shipping + ship-to-custody. The buyer pays NO eBay
   * final-value fee (that is the seller's take), so takeFeeUsd is 0 here. Pure read.
   */
  async quoteAcquire(listing: MarketplaceListing): Promise<AcquireQuote> {
    const askUsd = listing.askUsd;
    // inbound shipping the BUYER pays (from the Browse payload when present)
    const raw = listing.raw as BrowseItemSummary | undefined;
    const inboundShipUsd = raw?.shippingOptions?.[0]?.shippingCost?.value ? round2(Number(raw.shippingOptions[0].shippingCost!.value)) : 0;
    const shipToCustodyUsd = this.shipToCustodyUsd; // ship the slab on to the vault (the re-route leg)
    const landedCostUsd = round2(askUsd + inboundShipUsd + shipToCustodyUsd);
    return {
      listing,
      askUsd,
      takeFeeUsd: 0, // buyer pays no FVF on eBay
      gasUsd: 0, // fiat — no gas
      bridgeUsd: 0,
      shipToCustodyUsd: round2(inboundShipUsd + shipToCustodyUsd),
      landedCostUsd,
      custodyDestination: "self-custody",
      crossChain: false,
      settlementRail: "stripe-fiat",
      execution: ebayBuyExecutionPlan(),
    };
  }

  // ── quoteExit — net proceeds relisting on eBay (DOWNSTREAM template math) ──────
  /**
   * Net proceeds from relisting on eBay at `listAtUsd`, net of the eBay final-value fee.
   * TEMPLATE: SlabClaw's own demo exits on the tokenized venue after re-route, not on eBay.
   * A downstream user who DOES relist on eBay gets correct net-of-fee math here.
   */
  async quoteExit(i: { productId: string; listAtUsd: number; currentCustody: CustodyDestination }): Promise<ExitQuote[]> {
    const listAtUsd = i.listAtUsd;
    const sellFeeUsd = ebayFinalValueFee(listAtUsd, this.fvfRate);
    const relistInPlace: ExitQuote = {
      productId: i.productId,
      listAtUsd,
      strategy: "relist-in-place",
      marketplace: "ebay",
      sellFeeUsd,
      moveVenueUsd: 0, // relist where it sits (self-custody slab listed on eBay)
      netProceedsUsd: round2(listAtUsd - sellFeeUsd),
      crossCustody: false,
      execution: ebayListExecutionPlan(),
    };
    return [relistInPlace];
  }

  // ── acquire — eBay BUY: D11 firebreak, then STAGED browser + human-gate ───────
  /**
   * eBay checkout is an irreversible fiat spend; it is ALWAYS human-gated (browser + Stripe
   * Issuing). This method NEVER spends autonomously and NEVER fabricates a purchase — it
   * returns a `staged` receipt that the human-gate (Telegram/Base-MCP) commits out of band.
   *
   * The D11 cap firebreak runs UNCONDITIONALLY first:
   *   • effective cap = MIN(per-call maxUsd, config spendCapUsd)
   *   • no resolvable cap ⇒ FAIL CLOSED (block; an uncapped buy intent is never staged)
   *   • landed cost > cap ⇒ block BEFORE staging
   */
  async acquire(i: { quote: AcquireQuote; approvalRef?: string; maxUsd?: number }): Promise<AcquireReceipt> {
    const { quote } = i;
    const listing = quote.listing;
    const perCallCap = typeof i.maxUsd === "number" ? i.maxUsd : undefined;
    const effectiveCap = minCapUsd(perCallCap, this.configCapUsd);

    const blocked = (reason: string): AcquireReceipt => ({
      status: "failed",
      listingId: listing.listingId,
      marketplace: "ebay",
      custody: "self-custody",
      committedAt: new Date().toISOString(),
      approvalRef: `BLOCKED:${reason}`, // honesty: explicit, no purchase attempted
    });

    // ── D11 FIREBREAK — unconditional, before any staging ──
    if (effectiveCap === undefined) {
      return blocked("no-cap-set (neither maxUsd nor spendCapUsd configured) — fail-closed");
    }
    if (quote.landedCostUsd > effectiveCap) {
      return blocked(`over-cap landed $${quote.landedCostUsd} > cap $${effectiveCap}`);
    }

    // ── In-cap ⇒ STAGE the buy for the human-gate (eBay never auto-spends) ──
    return {
      status: "staged",
      listingId: listing.listingId,
      marketplace: "ebay",
      paidUsd: quote.landedCostUsd,
      custody: "self-custody",
      approvalRef: i.approvalRef, // the SELF/human approval ref; the irreversible click is out-of-band
      proofUri: listing.url, // the eBay listing to check (provenance); no fabricated receipt
      committedAt: undefined, // not committed — the human-gate commits the fiat spend
    };
  }

  // ── list — eBay relist via the Sell Inventory TEMPLATE (downstream) ───────────
  /**
   * Delegates to the eBay Sell Inventory client. When the downstream template is not wired
   * (default), this returns a `staged` receipt naming the missing config — no network, no
   * fabricated listing. SlabClaw's own demo never calls this on eBay (it exits on the
   * tokenized venue after re-route).
   */
  async list(i: { exit: ExitQuote; approvalRef?: string }): Promise<ListReceipt> {
    const { exit } = i;
    // Build a minimal relist request from the exit. A downstream user threads the real slab
    // art/title/aspects/SKU in (here we use the product identity as a stable SKU + title).
    const req: RelistRequest = {
      sku: exit.productId,
      title: `Graded Pokémon slab — ${exit.productId}`,
      description: `Graded Pokémon card ${exit.productId}. Listed at the SlabClaw oracle value.`,
      imageUrls: [], // downstream threads the real slab image; a real publish requires ≥1
      priceUsd: exit.listAtUsd,
    };
    const result = await this.inventory.relist(req);
    if (result.status === "published") {
      return {
        status: "confirmed",
        listingId: result.listingId,
        marketplace: "ebay",
        listAtUsd: exit.listAtUsd,
        approvalRef: i.approvalRef,
        proofUri: result.listingUrl,
        listedAt: new Date().toISOString(),
      };
    }
    // staged (template not configured) or failed — surface honestly, no fabricated listingId.
    return {
      status: result.status === "failed" ? "failed" : "staged",
      listingId: undefined,
      marketplace: "ebay",
      listAtUsd: exit.listAtUsd,
      approvalRef: result.detail ? `${result.status.toUpperCase()}:${result.detail}` : i.approvalRef,
      proofUri: undefined,
      listedAt: undefined,
    };
  }

  // ── confirmSale — honest null (no order indexer wired; downstream wires Fulfillment poll) ──
  async confirmSale(i: { listingId: string; marketplace: Marketplace }): Promise<SaleReceipt | null> {
    // Matches the repo posture (beezie): without a wired order/settlement indexer we return
    // null rather than fabricate proceeds (P7). A downstream user wires the eBay Sell
    // Fulfillment API (getOrders) to resolve a real sale of `listingId`.
    void i;
    return null;
  }

  // ── initiateCustodyMove — THE RE-ROUTE: ship the eBay slab to a vault ─────────
  /**
   * The eBay-bought slab (self-custody) ships to a vault custodian (Courtyard/PSA) to be
   * tokenized — this is the §0 "re-route" leg. Physical + multi-day + human drop-off; there
   * is no API/token path. Returns a tracked handle the orchestration polls (re-injecting
   * {goal, status, checkpoint}). A downstream user wires Shippo for the real label.
   */
  async initiateCustodyMove(req: CustodyMoveRequest): Promise<CustodyMoveHandle> {
    return {
      moveId: `ebay-move-${Date.now()}`,
      status: "awaiting-shipment",
      from: req.from, // 'self-custody' (slab in hand from the eBay buy)
      to: req.to, // 'courtyard-vault' | 'psa-vault'
      requiresHumanShip: true, // the physical drop-off is inherently human
      nextCheckpoint: undefined,
    };
  }

  async getCustodyMove(i: { moveId: string }): Promise<CustodyMoveHandle | null> {
    // No persistence in this adapter (the P&L/state module owns move tracking). Honest null.
    void i;
    return null;
  }
}

/** The tighter (smaller) of two optional USD caps. undefined only when BOTH are undefined. */
function minCapUsd(a?: number, b?: number): number | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return a < b ? a : b;
}
