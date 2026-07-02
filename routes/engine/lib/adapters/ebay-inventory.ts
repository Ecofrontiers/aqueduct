/**
 * ebay-inventory.ts — eBay Sell Inventory relist client (CLONE-ABLE TEMPLATE).
 *
 * Implements the modern eBay Sell Inventory API relist flow so a downstream Hermes user
 * can have the agent LIST a held slab autonomously (no browser). It is a TEMPLATE:
 *   • SlabClaw's own demo does NOT sell on eBay — it buys + re-routes to a vault. This
 *     client is therefore INERT for our demo (isConfigured=false) and never called.
 *   • A downstream user fills in their EBAY_* creds + the one-time seller setup
 *     (business policies + a merchant location) and flips it live.
 *
 * The three-call publish flow (eBay Sell Inventory API):
 *   1. PUT  /sell/inventory/v1/inventory_item/{sku}     createOrReplaceInventoryItem
 *   2. POST /sell/inventory/v1/offer                     createOffer            → offerId
 *   3. POST /sell/inventory/v1/offer/{offerId}/publish   publishOffer          → listingId
 *
 * Why this needs one-time seller setup (the "fill in your own" part):
 *   • listingPolicies — fulfillment (shipping), payment, and return policy IDs (created once
 *     in Seller Hub → Business policies, or via the Account API).
 *   • merchantLocationKey — an inventory location (created once via the Account/Location API).
 *   • A category id for graded trading cards.
 * None of these are SlabClaw's to provide; they are per-seller. The client surfaces a clear
 * error naming exactly what's missing rather than guessing.
 */

import { EbayOAuth, type EbayEnvironment } from "./ebay-oauth.ts";

const API_HOSTS: Record<EbayEnvironment, string> = {
  production: "https://api.ebay.com",
  sandbox: "https://api.sandbox.ebay.com",
};

/** Marketplace + locale defaults (downstream overridable). */
const DEFAULT_MARKETPLACE_ID = "EBAY_US";
const DEFAULT_CONTENT_LANGUAGE = "en-US";

/** Per-seller listing configuration the downstream user supplies once. */
export interface EbaySellerConfig {
  fulfillmentPolicyId?: string; // EBAY_FULFILLMENT_POLICY_ID
  paymentPolicyId?: string; // EBAY_PAYMENT_POLICY_ID
  returnPolicyId?: string; // EBAY_RETURN_POLICY_ID
  merchantLocationKey?: string; // EBAY_MERCHANT_LOCATION_KEY
  categoryId?: string; // EBAY_CARD_CATEGORY_ID — graded trading-card category
  marketplaceId?: string; // default EBAY_US
  currency?: string; // default USD
}

/** Build an EbaySellerConfig from process.env. */
export function ebaySellerConfigFromEnv(env: Record<string, string | undefined> = process.env): EbaySellerConfig {
  return {
    fulfillmentPolicyId: env.EBAY_FULFILLMENT_POLICY_ID,
    paymentPolicyId: env.EBAY_PAYMENT_POLICY_ID,
    returnPolicyId: env.EBAY_RETURN_POLICY_ID,
    merchantLocationKey: env.EBAY_MERCHANT_LOCATION_KEY,
    categoryId: env.EBAY_CARD_CATEGORY_ID,
    marketplaceId: env.EBAY_MARKETPLACE_ID,
    currency: env.EBAY_CURRENCY,
  };
}

/** A held slab to relist at the oracle price. */
export interface RelistRequest {
  sku: string; // a stable per-slab SKU (e.g. certHash or productId:cert)
  title: string; // <=80 chars (eBay limit) — caller should pre-truncate
  description: string;
  imageUrls: string[]; // at least one; eBay requires a primary image
  priceUsd: number; // the list price (= oracle, or net-clearing list price)
  /** eBay item aspects (e.g. {"Grade":["PSA 9"],"Professional Grader":["PSA"]}). */
  aspects?: Record<string, string[]>;
  /** eBay condition enum (graded slabs are typically "LIKE_NEW"/"USED_EXCELLENT" + a grade aspect). */
  conditionEnum?: string;
  quantity?: number; // default 1 (a slab is unique)
}

export interface RelistResult {
  status: "published" | "staged" | "failed";
  sku: string;
  offerId?: string;
  listingId?: string;
  listingUrl?: string;
  priceUsd: number;
  /** Honest detail: why staged (template not configured) or why failed. */
  detail?: string;
}

/** What's missing for a live relist, named explicitly (so the error is actionable, not vague). */
export function missingRelistConfig(oauth: EbayOAuth, seller: EbaySellerConfig): string[] {
  const missing: string[] = [];
  if (!oauth.isUserConfigured) missing.push("EBAY_USER_REFRESH_TOKEN (run the consent flow once)");
  if (!seller.fulfillmentPolicyId) missing.push("EBAY_FULFILLMENT_POLICY_ID");
  if (!seller.paymentPolicyId) missing.push("EBAY_PAYMENT_POLICY_ID");
  if (!seller.returnPolicyId) missing.push("EBAY_RETURN_POLICY_ID");
  if (!seller.merchantLocationKey) missing.push("EBAY_MERCHANT_LOCATION_KEY");
  if (!seller.categoryId) missing.push("EBAY_CARD_CATEGORY_ID");
  return missing;
}

export class EbayInventoryClient {
  private readonly oauth: EbayOAuth;
  private readonly seller: EbaySellerConfig;
  private readonly fetchImpl: typeof fetch;
  private readonly apiBase: string;
  private readonly marketplaceId: string;
  private readonly currency: string;

  constructor(opts: { oauth: EbayOAuth; seller?: EbaySellerConfig; fetchImpl?: typeof fetch }) {
    this.oauth = opts.oauth;
    this.seller = opts.seller ?? {};
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.apiBase = API_HOSTS[opts.oauth.environment];
    this.marketplaceId = this.seller.marketplaceId ?? DEFAULT_MARKETPLACE_ID;
    this.currency = this.seller.currency ?? "USD";
  }

  /** True only when BOTH the user token and the per-seller listing config are present. */
  get isConfigured(): boolean {
    return missingRelistConfig(this.oauth, this.seller).length === 0;
  }

  /**
   * Relist a held slab at the target price. When the template is not fully configured this
   * returns a `staged` result naming exactly what's missing — it does NOT touch the network
   * and NEVER fabricates a listingId (honesty posture P7). When configured, it runs the real
   * 3-call publish flow and returns the live listingId.
   */
  async relist(req: RelistRequest): Promise<RelistResult> {
    const missing = missingRelistConfig(this.oauth, this.seller);
    if (missing.length > 0) {
      return {
        status: "staged",
        sku: req.sku,
        priceUsd: req.priceUsd,
        detail: `eBay relist is a downstream TEMPLATE — not configured. Missing: ${missing.join(", ")}.`,
      };
    }

    const token = await this.oauth.getUserAccessToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "Content-Language": DEFAULT_CONTENT_LANGUAGE,
    };

    // 1) createOrReplaceInventoryItem (idempotent PUT keyed by SKU)
    await this.put(`/sell/inventory/v1/inventory_item/${encodeURIComponent(req.sku)}`, headers, {
      availability: { shipToLocationAvailability: { quantity: req.quantity ?? 1 } },
      condition: req.conditionEnum ?? "LIKE_NEW",
      product: {
        title: req.title.slice(0, 80),
        description: req.description,
        imageUrls: req.imageUrls,
        aspects: req.aspects,
      },
    });

    // 2) createOffer → offerId
    const offer = (await this.post(`/sell/inventory/v1/offer`, headers, {
      sku: req.sku,
      marketplaceId: this.marketplaceId,
      format: "FIXED_PRICE",
      availableQuantity: req.quantity ?? 1,
      categoryId: this.seller.categoryId,
      listingPolicies: {
        fulfillmentPolicyId: this.seller.fulfillmentPolicyId,
        paymentPolicyId: this.seller.paymentPolicyId,
        returnPolicyId: this.seller.returnPolicyId,
      },
      merchantLocationKey: this.seller.merchantLocationKey,
      pricingSummary: { price: { value: req.priceUsd.toFixed(2), currency: this.currency } },
    })) as { offerId?: string };
    if (!offer.offerId) {
      return { status: "failed", sku: req.sku, priceUsd: req.priceUsd, detail: "createOffer returned no offerId" };
    }

    // 3) publishOffer → listingId
    const published = (await this.post(`/sell/inventory/v1/offer/${encodeURIComponent(offer.offerId)}/publish`, headers, {})) as {
      listingId?: string;
    };
    if (!published.listingId) {
      return { status: "failed", sku: req.sku, offerId: offer.offerId, priceUsd: req.priceUsd, detail: "publishOffer returned no listingId" };
    }

    return {
      status: "published",
      sku: req.sku,
      offerId: offer.offerId,
      listingId: published.listingId,
      listingUrl: `https://www.ebay.com/itm/${published.listingId}`,
      priceUsd: req.priceUsd,
    };
  }

  private async put(path: string, headers: Record<string, string>, payload: unknown): Promise<unknown> {
    return this.send("PUT", path, headers, payload);
  }
  private async post(path: string, headers: Record<string, string>, payload: unknown): Promise<unknown> {
    return this.send("POST", path, headers, payload);
  }

  private async send(method: "PUT" | "POST", path: string, headers: Record<string, string>, payload: unknown): Promise<unknown> {
    const res = await this.fetchImpl(`${this.apiBase}${path}`, {
      method,
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`eBay ${method} ${path} -> HTTP ${res.status}: ${text.slice(0, 300)}`);
    }
    // PUT inventory_item returns 204 No Content; offer/publish return JSON.
    return text ? JSON.parse(text) : {};
  }
}
