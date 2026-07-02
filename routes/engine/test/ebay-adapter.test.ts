/**
 * ebay-adapter.test.ts — ZERO-NETWORK unit tests for the eBay template + adapter.
 *
 * Covers, all over injected fetch (no network):
 *   • OAuth: consent-URL build, URL-encoded code exchange, app + user token refresh, the
 *     "not configured" honesty gate.
 *   • Sell Inventory client: the staged-when-unconfigured posture + the live 3-call publish.
 *   • EbayMarketplaceAdapter: quoteExit FVF math, quoteAcquire landed cost + human-gate posture,
 *     the D11 cap firebreak (over-cap + no-cap block before staging; in-cap stages, never
 *     fabricates a buy), discover() Browse parse, list() downstream-template staging, and the
 *     re-route custody move.
 */
import { EbayOAuth, EBAY_SELL_SCOPES } from "../lib/adapters/ebay-oauth.ts";
import { EbayInventoryClient, missingRelistConfig, type EbaySellerConfig } from "../lib/adapters/ebay-inventory.ts";
import {
  EbayMarketplaceAdapter,
  ebayFinalValueFee,
  ebayNetProceeds,
  EBAY_FINAL_VALUE_FEE_RATE,
  EBAY_PER_ORDER_FEE_USD,
} from "../lib/adapters/ebay.ts";
import type { AcquireQuote, MarketplaceListing } from "../lib/adapters/index.ts";
import { ok, eq, section } from "./assert.ts";

const TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";

/** A fetch that serves the token endpoint with a fixed token set (no network). */
function tokenFetch(body: Record<string, unknown>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url === TOKEN_URL) return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
    throw new Error(`unexpected fetch ${url}`);
  }) as typeof fetch;
}

/** A full per-seller config so the inventory client is "configured". */
const FULL_SELLER: EbaySellerConfig = {
  fulfillmentPolicyId: "FP-1",
  paymentPolicyId: "PP-1",
  returnPolicyId: "RP-1",
  merchantLocationKey: "LOC-1",
  categoryId: "183454",
};

export async function run(): Promise<void> {
  // ── OAuth ──────────────────────────────────────────────────────────────────
  section("ebay-oauth: consent URL is well-formed (client_id, RuName redirect, scopes, state)");
  const oauth = new EbayOAuth({ clientId: "APP-1", clientSecret: "SECRET-1", ruName: "Eco-RuName-123", fetchImpl: tokenFetch({}) });
  const consent = oauth.buildConsentUrl({ state: "xyz" });
  ok(consent.startsWith("https://auth.ebay.com/oauth2/authorize?"), "consent URL hits the production authorize host");
  ok(consent.includes("client_id=APP-1"), "consent URL carries the client_id");
  ok(consent.includes("redirect_uri=Eco-RuName-123"), "consent URL redirect_uri is the RuName (not a literal URL)");
  ok(consent.includes("response_type=code"), "consent URL is the authorization-code flow");
  ok(consent.includes("state=xyz"), "consent URL carries the state");
  ok(consent.includes(encodeURIComponent(EBAY_SELL_SCOPES[0])), "consent URL requests the sell.inventory scope");

  section("ebay-oauth: 'not configured' gates throw clearly; nothing is fabricated");
  const bare = new EbayOAuth({});
  eq(bare.isAppConfigured, false, "no creds ⇒ isAppConfigured=false");
  eq(bare.isUserConfigured, false, "no refresh token ⇒ isUserConfigured=false");
  let threw = false;
  try {
    await bare.getUserAccessToken();
  } catch {
    threw = true;
  }
  ok(threw, "getUserAccessToken throws (clear error) when not configured — no fake token");

  section("ebay-oauth: code exchange decodes the URL-encoded code + returns the token set");
  let sentBody = "";
  const captureFetch: typeof fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    sentBody = String(init?.body ?? "");
    return new Response(
      JSON.stringify({ access_token: "USER-AT", refresh_token: "USER-RT", expires_in: 7200, refresh_token_expires_in: 47304000, token_type: "User" }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;
  const oauth2 = new EbayOAuth({ clientId: "APP-1", clientSecret: "SECRET-1", ruName: "Ru-1", fetchImpl: captureFetch });
  const set = await oauth2.exchangeCodeForTokens("v%5E1.1%23abc"); // URL-encoded code from the redirect
  eq(set.refreshToken, "USER-RT", "code exchange returns the refresh token");
  // the redirect code is decoded ("v^1.1#abc") then re-encoded by URLSearchParams on the wire
  ok(sentBody.includes(`code=${encodeURIComponent("v^1.1#abc")}`), "code is decoded then properly URL-encoded on the wire");
  ok(sentBody.includes("grant_type=authorization_code"), "code exchange uses the authorization_code grant");

  section("ebay-oauth: user + app tokens refresh from fixtures + cache");
  const oauth3 = new EbayOAuth({
    clientId: "APP-1",
    clientSecret: "SECRET-1",
    userRefreshToken: "RT-STORED",
    fetchImpl: tokenFetch({ access_token: "AT-FRESH", expires_in: 7200, token_type: "User" }),
  });
  eq(oauth3.isUserConfigured, true, "app creds + stored refresh token ⇒ isUserConfigured=true");
  eq(await oauth3.getUserAccessToken(), "AT-FRESH", "getUserAccessToken mints from the stored refresh token");
  eq(await oauth3.getAppAccessToken(), "AT-FRESH", "getAppAccessToken mints the client-credentials app token");

  // ── Sell Inventory client ────────────────────────────────────────────────────
  section("ebay-inventory: unconfigured ⇒ staged (names missing config), no network, no fake listing");
  const oauthNoUser = new EbayOAuth({ clientId: "APP-1", clientSecret: "SECRET-1", fetchImpl: tokenFetch({}) });
  const invUnconfigured = new EbayInventoryClient({ oauth: oauthNoUser, seller: {}, fetchImpl: tokenFetch({}) });
  eq(invUnconfigured.isConfigured, false, "missing user token + policies ⇒ isConfigured=false");
  const stagedRelist = await invUnconfigured.relist({ sku: "base1-4", title: "x", description: "y", imageUrls: ["http://img"], priceUsd: 100 });
  eq(stagedRelist.status, "staged", "unconfigured relist returns staged (template, not live)");
  ok(stagedRelist.listingId === undefined, "unconfigured relist has NO fabricated listingId (P7)");
  ok((stagedRelist.detail ?? "").includes("EBAY_USER_REFRESH_TOKEN"), "staged detail names the missing user token");
  const missing = missingRelistConfig(oauthNoUser, {});
  ok(missing.includes("EBAY_FULFILLMENT_POLICY_ID"), "missingRelistConfig names the missing fulfillment policy");

  section("ebay-inventory: configured ⇒ real 3-call publish flow returns the live listingId");
  let calls: string[] = [];
  const inventoryFetch: typeof fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const method = init?.method ?? "GET";
    if (url === TOKEN_URL) return new Response(JSON.stringify({ access_token: "AT", expires_in: 7200 }), { status: 200 });
    calls.push(`${method} ${url.replace("https://api.ebay.com", "")}`);
    if (url.includes("/sell/inventory/v1/inventory_item/")) return new Response(null, { status: 204 });
    if (url.endsWith("/sell/inventory/v1/offer")) return new Response(JSON.stringify({ offerId: "OFFER-9" }), { status: 200 });
    if (url.includes("/offer/OFFER-9/publish")) return new Response(JSON.stringify({ listingId: "LISTING-77" }), { status: 200 });
    throw new Error(`unexpected ${method} ${url}`);
  }) as typeof fetch;
  const oauthUser = new EbayOAuth({ clientId: "APP-1", clientSecret: "SECRET-1", userRefreshToken: "RT", fetchImpl: inventoryFetch });
  const invLive = new EbayInventoryClient({ oauth: oauthUser, seller: FULL_SELLER, fetchImpl: inventoryFetch });
  eq(invLive.isConfigured, true, "user token + full seller config ⇒ isConfigured=true");
  const pub = await invLive.relist({ sku: "base1-4", title: "Charizard PSA 9", description: "d", imageUrls: ["http://img"], priceUsd: 250 });
  eq(pub.status, "published", "configured relist publishes");
  eq(pub.listingId, "LISTING-77", "publish returns the real listingId");
  eq(pub.listingUrl, "https://www.ebay.com/itm/LISTING-77", "listingUrl is the canonical eBay item URL");
  ok(calls.some((c) => c.startsWith("PUT /sell/inventory/v1/inventory_item/")), "flow calls createOrReplaceInventoryItem (PUT)");
  ok(calls.includes("POST /sell/inventory/v1/offer"), "flow calls createOffer (POST)");
  ok(calls.some((c) => c.includes("/offer/OFFER-9/publish")), "flow calls publishOffer (POST)");

  // ── Adapter math ─────────────────────────────────────────────────────────────
  section("ebay-adapter: quoteExit nets the eBay final-value fee");
  const adapter = new EbayMarketplaceAdapter({ fetchImpl: tokenFetch({}) });
  const exits = await adapter.quoteExit({ productId: "base1-4", listAtUsd: 100, currentCustody: "self-custody" });
  ok(exits.length >= 1, "quoteExit returns the relist-in-place exit");
  const relist = exits[0];
  eq(relist.marketplace, "ebay", "exit venue is eBay");
  eq(relist.sellFeeUsd, ebayFinalValueFee(100), "sellFee = 13.35% + $0.40 per-order");
  eq(relist.netProceedsUsd, ebayNetProceeds(100), "netProceeds = listAt − FVF");
  eq(relist.moveVenueUsd, 0, "relist-in-place has zero move-venue cost");
  ok(relist.execution.requiresHumanGate, "an eBay list carries a human-gate on the price commitment");
  eq(ebayFinalValueFee(100), round2(100 * EBAY_FINAL_VALUE_FEE_RATE + EBAY_PER_ORDER_FEE_USD), "FVF helper math is exact");

  section("ebay-adapter: quoteAcquire — landed = ask + inbound ship + ship-to-vault; buyer pays no FVF");
  const listing: MarketplaceListing = {
    marketplace: "ebay",
    listingId: "v1|123|0",
    url: "https://www.ebay.com/itm/123",
    productId: "base1-4",
    productName: "Charizard PSA 9",
    grader: "PSA",
    grade: "9",
    askUsd: 200,
    currency: "USD",
    custody: "self-custody",
    tokenized: false,
    isLive: true,
    raw: { shippingOptions: [{ shippingCost: { value: "5.00", currency: "USD" } }] },
  };
  const quote: AcquireQuote = await adapter.quoteAcquire(listing);
  eq(quote.takeFeeUsd, 0, "buyer pays NO eBay final-value fee");
  eq(quote.gasUsd, 0, "fiat venue ⇒ no gas");
  eq(quote.settlementRail, "stripe-fiat", "eBay settles via Stripe-fiat (Issuing card)");
  eq(quote.landedCostUsd, round2(200 + 5 + 15), "landed = ask $200 + inbound $5 + ship-to-vault $15 = $220");
  ok(quote.execution.requiresHumanGate, "an eBay buy is human-gated (irreversible fiat spend)");
  eq(quote.execution.primary, "browser", "the eBay buy primary strategy is browser checkout");

  section("ebay-adapter: D11 cap firebreak — over-cap + no-cap BLOCK before staging; in-cap stages (no fake buy)");
  const overCap = await adapter.acquire({ quote, maxUsd: 50 });
  eq(overCap.status, "failed", "over-cap acquire is blocked");
  ok((overCap.approvalRef ?? "").startsWith("BLOCKED:"), "over-cap is labeled BLOCKED with the reason");
  ok(overCap.settleTxHash === undefined && overCap.committedAt !== undefined && overCap.proofUri === undefined, "over-cap stages NOTHING (no commit, no fabricated proof)");
  const noCap = await adapter.acquire({ quote }); // no maxUsd, no config cap
  eq(noCap.status, "failed", "no resolvable cap ⇒ FAIL CLOSED");
  ok((noCap.approvalRef ?? "").includes("no-cap-set"), "no-cap block is explicit about the fail-closed reason");
  const inCap = await adapter.acquire({ quote, maxUsd: 1000 });
  eq(inCap.status, "staged", "in-cap acquire STAGES (eBay never auto-spends)");
  ok(inCap.committedAt === undefined, "staged buy is NOT committed (the human-gate commits the fiat spend)");
  ok(inCap.settleTxHash === undefined, "staged buy has NO fabricated tx/receipt (P7)");
  eq(inCap.proofUri, listing.url, "staged buy points at the real eBay listing for the human to check");
  eq(inCap.paidUsd, quote.landedCostUsd, "staged buy carries the would-be landed cost");

  section("ebay-adapter: discover() — no app creds ⇒ honest []; with creds parses Browse itemSummaries");
  eq((await adapter.discover({ limit: 5 })).length, 0, "no app creds ⇒ discover returns [] (honest, not an error)");
  const browseFetch: typeof fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url === TOKEN_URL) return new Response(JSON.stringify({ access_token: "AT", expires_in: 7200 }), { status: 200 });
    if (url.includes("/buy/browse/v1/item_summary/search")) {
      return new Response(
        JSON.stringify({
          itemSummaries: [
            { itemId: "v1|111|0", title: "Charizard PSA 9", price: { value: "180.00", currency: "USD" }, itemWebUrl: "https://www.ebay.com/itm/111" },
            { itemId: "v1|222|0", title: "Blastoise PSA 9", price: { value: "900.00", currency: "USD" }, itemWebUrl: "https://www.ebay.com/itm/222" },
          ],
        }),
        { status: 200 },
      );
    }
    throw new Error(`unexpected ${url}`);
  }) as typeof fetch;
  const liveAdapter = new EbayMarketplaceAdapter({ ebayClientId: "APP-1", ebayClientSecret: "SECRET-1", fetchImpl: browseFetch });
  const found = await liveAdapter.discover({ grader: "PSA", grade: "9", maxAskUsd: 500, limit: 10 });
  eq(found.length, 1, "discover surfaces the $180 listing and filters out the $900 (maxAsk $500)");
  eq(found[0].marketplace, "ebay", "discovered listing is an eBay listing");
  eq(found[0].custody, "self-custody", "a bought eBay slab lands in self-custody (then re-routes to a vault)");
  ok(found[0].tokenized === false, "eBay listings are physical (not tokenized)");

  section("ebay-adapter: list() is a downstream TEMPLATE — staged by default, never fabricates a listing");
  eq(adapter.canRelist, false, "default adapter cannot relist (template not wired)");
  const listReceipt = await adapter.list({ exit: relist });
  eq(listReceipt.status, "staged", "default list() stages (downstream template not configured)");
  ok(listReceipt.listingId === undefined, "default list() has NO fabricated listingId (P7)");
  ok((listReceipt.approvalRef ?? "").includes("STAGED"), "list() surfaces the staged/missing-config reason honestly");

  section("ebay-adapter: initiateCustodyMove() — the RE-ROUTE (ship the eBay slab to a vault)");
  const move = await adapter.initiateCustodyMove({ productId: "base1-4", from: "self-custody", to: "courtyard-vault" });
  eq(move.status, "awaiting-shipment", "a re-route starts awaiting the human ship-out");
  ok(move.requiresHumanShip, "the physical drop-off is inherently human (no token-bridge)");
  eq(move.to, "courtyard-vault", "the slab re-routes to the Courtyard vault to tokenize");
  eq(await adapter.confirmSale({ listingId: "x", marketplace: "ebay" }), null, "confirmSale is honest null (no fabricated sale)");
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await run();
  const { exitWithSummary } = await import("./assert.ts");
  exitWithSummary();
}
