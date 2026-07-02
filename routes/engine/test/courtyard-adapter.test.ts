/**
 * courtyard-adapter.test.ts — unit tests for the CourtyardMarketplaceAdapter (Polygon).
 *
 * STRUCTURAL MIRROR of beezie-adapter.test.ts. The Courtyard money-path reuses the SHARED
 * hardened seaport-common.ts logic, so these tests assert the SAME security properties on the
 * Polygon binding (Courtyard collection + Polygon USDC.e):
 *   quoteExit math · D11 cap guard (C1 fail-closed) · discover() parse over an injected payload ·
 *   C2 (inflated/foreign/non-zero-value rejected) · H1 (exact approval, no maxUint256) ·
 *   H3 (recipient/numerator/criteria tampering rejected) · NEW-1 (overpay-within-cap rejected) ·
 *   NEW-2 (offer-side wrong-collection/itemType/tokenId rejected) · M1 (idempotent in-flight).
 *
 * ZERO-NETWORK: all reads/writes use an injected fetch. The LIVE discover() proof runs in
 * scripts/courtyard-discover.mjs (network, evidence logged).
 */
import {
  CourtyardMarketplaceAdapter,
  COURTYARD_TAKE_RATE_FALLBACK,
  COURTYARD_TAKE_RATE_FLOOR,
  COURTYARD_TAKE_RATE_CEILING,
  netProceeds,
  netClearingListPrice,
  takeRateFromOrder,
  exactApprovalAmount,
  effectiveCapBaseUnits,
  SEAPORT_1_6,
  USDC_POLYGON,
  COURTYARD_COLLECTION,
} from "../lib/adapters/courtyard.ts";
import type { AcquireQuote, MarketplaceListing } from "../lib/adapters/index.ts";
import { ok, eq, section } from "./assert.ts";

/** A deterministic OpenSea Orders payload (shape mirrors the LIVE API; a real-shaped $50 order). */
const FIXTURE_ORDERS = {
  listings: [
    {
      order_hash: "0xc0117a7d7e3b9f0a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d",
      chain: "matic",
      protocol_address: SEAPORT_1_6,
      status: "active",
      price: { current: { currency: "USDC", decimals: 6, value: "50000000" } },
      protocol_data: {
        signature: "0xsig",
        parameters: {
          offerer: "0x05070e8e1a7d581ba0ffecfed00533a75c69d640",
          offer: [{ itemType: 2, token: COURTYARD_COLLECTION, identifierOrCriteria: "42424242", startAmount: "1", endAmount: "1" }],
          consideration: [
            { itemType: 1, token: USDC_POLYGON, identifierOrCriteria: "0", startAmount: "46000000", endAmount: "46000000", recipient: "0xseller" },
            { itemType: 1, token: USDC_POLYGON, identifierOrCriteria: "0", startAmount: "2000000", endAmount: "2000000", recipient: "0xopenseafee" },
            { itemType: 1, token: USDC_POLYGON, identifierOrCriteria: "0", startAmount: "2000000", endAmount: "2000000", recipient: "0xcourtyardfee" },
          ],
          startTime: "0",
          endTime: "99999999999",
          orderType: 0,
          zone: "0x0000000000000000000000000000000000000000",
          zoneHash: "0x" + "0".repeat(64),
          salt: "0",
          conduitKey: "0x" + "0".repeat(64),
          totalOriginalConsiderationItems: 3,
          counter: 0,
        },
      },
    },
    // a WETH order (no USDC consideration) — must be SKIPPED (out of USDC arb scope)
    {
      order_hash: "0xweth",
      chain: "matic",
      protocol_address: SEAPORT_1_6,
      status: "active",
      price: { current: { currency: "WETH", decimals: 18, value: "1000000000000000" } },
      protocol_data: {
        signature: "0xsig2",
        parameters: {
          offerer: "0xofferer2",
          offer: [{ itemType: 2, token: COURTYARD_COLLECTION, identifierOrCriteria: "999", startAmount: "1", endAmount: "1" }],
          consideration: [
            { itemType: 1, token: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", identifierOrCriteria: "0", startAmount: "1000000000000000", endAmount: "1000000000000000", recipient: "0xseller2" },
          ],
          startTime: "0",
          endTime: "99999999999",
          orderType: 0,
          zone: "0x0000000000000000000000000000000000000000",
          zoneHash: "0x" + "0".repeat(64),
          salt: "0",
          conduitKey: "0x" + "0".repeat(64),
          totalOriginalConsiderationItems: 1,
          counter: 0,
        },
      },
    },
  ],
  next: null,
};

/** Injected fetch that returns the fixture orders for the collection read (no network). */
function fixtureFetch(): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/listings/collection/")) {
      return new Response(JSON.stringify(FIXTURE_ORDERS), { status: 200, headers: { "content-type": "application/json" } });
    }
    throw new Error(`unexpected fetch in fixture test: ${url}`);
  }) as unknown as typeof fetch;
}

export async function run(): Promise<void> {
  section("courtyard-adapter: quoteExit math (netProceeds(oracle) = oracle − ~8% fallback take)");
  const adapter = new CourtyardMarketplaceAdapter({ fetchImpl: fixtureFetch() });

  const oracle = 100;
  const exits = await adapter.quoteExit({ productId: "base1-4", listAtUsd: oracle, currentCustody: "onchain-polygon" });
  ok(exits.length >= 1, "quoteExit returns at least the relist-in-place exit");
  const relist = exits[0];
  eq(relist.strategy, "relist-in-place", "first exit is relist-in-place");
  eq(relist.marketplace, "courtyard", "exit venue is courtyard");
  eq(relist.sellFeeUsd, 8, "sellFee on a $100 list = 8% fallback = $8.00");
  eq(relist.netProceedsUsd, 92, "netProceeds($100) = $100 − $8 take = $92.00");
  eq(relist.moveVenueUsd, 0, "relist-in-place has zero move-venue cost");

  // the pure helpers (used by the planner)
  eq(netProceeds(100), 92, "netProceeds(100) helper = 92");
  eq(Math.round(COURTYARD_TAKE_RATE_FALLBACK * 100), 8, "fallback take rate is ~8%");
  const listTarget = netClearingListPrice(100); // 100 / 0.92 = 108.70
  ok(listTarget > 100, "net-clearing list price is above oracle (to cover the take)");
  ok(netProceeds(listTarget) >= 100 - 0.01, `netProceeds(netClearingListPrice(100))=${netProceeds(listTarget)} ≥ oracle 100`);

  // quoteExit reads the LIVE take from a sample order when supplied (verify, don't hardcode).
  const sampleParams = FIXTURE_ORDERS.listings[0].protocol_data.parameters as any;
  const liveTake = takeRateFromOrder(sampleParams);
  ok(liveTake !== null && Math.abs(liveTake! - 0.08) < 1e-9, `takeRateFromOrder reads the live $4/$50 fee split = 8% (got ${liveTake})`);
  const liveExit = await adapter.quoteExit({ productId: "base1-4", listAtUsd: 100, currentCustody: "onchain-polygon", sampleOrderParams: sampleParams });
  eq(liveExit[0].sellFeeUsd, 8, "quoteExit with a live sample reads the real 8% take");

  section("courtyard-adapter: N1 — takeRateFromOrder is clamped + ambiguity-safe (defense-in-depth)");
  eq(COURTYARD_TAKE_RATE_FLOOR, 0.04, "N1: take floor is 4%");
  eq(COURTYARD_TAKE_RATE_CEILING, 0.15, "N1: take ceiling is 15%");

  // (a) UNDER-REPORTED take: an odd order with a tiny $0.01 fee on a $100 sale derives 0.0001 →
  //     clamped UP to the 4% floor (else quoteExit would over-estimate net proceeds).
  const underReported = orderParams([
    { amount: "99990000", recipient: "0xseller" }, // $99.99 seller-net
    { amount: "10000", recipient: "0xfee" }, // $0.01 fee → derived ≈ 0.0001
  ]);
  const clampedLow = takeRateFromOrder(underReported);
  eq(clampedLow, 0.04, "N1a: an under-reported $0.01/$100 take is clamped UP to the 4% floor");
  const exitLow = await adapter.quoteExit({ productId: "p", listAtUsd: 100, currentCustody: "onchain-polygon", sampleOrderParams: underReported });
  eq(exitLow[0].sellFeeUsd, 4, "N1a: quoteExit uses the clamped 4% take (not the under-reported 0.01%)");

  // (b) OVER-REPORTED take: a degenerate split deriving >15% is clamped DOWN to the ceiling.
  const overReported = orderParams([
    { amount: "50000000", recipient: "0xseller" }, // $50 seller-net (the max)
    { amount: "40000000", recipient: "0xfee" }, // $40 fee → derived ≈ 0.444
  ]);
  eq(takeRateFromOrder(overReported), 0.15, "N1b: an over-reported 44% take is clamped DOWN to the 15% ceiling");

  // (c) AMBIGUOUS seller-net: two USDC considerations TIE for the largest → undecidable → null
  //     so quoteExit falls back to the ~8% default rather than guess the seller-net.
  const ambiguous = orderParams([
    { amount: "25000000", recipient: "0xa" }, // $25
    { amount: "25000000", recipient: "0xb" }, // $25 (tie for max — ambiguous)
    { amount: "2000000", recipient: "0xfee" }, // $2
  ]);
  eq(takeRateFromOrder(ambiguous), null, "N1c: ambiguous (tied-max) seller-net returns null");
  const exitAmbig = await adapter.quoteExit({ productId: "p", listAtUsd: 100, currentCustody: "onchain-polygon", sampleOrderParams: ambiguous });
  eq(exitAmbig[0].sellFeeUsd, 8, "N1c: ambiguous sample → quoteExit falls back to the ~8% default");

  // (d) a normal in-band split (unique max, derived 8%) is returned as-is (clamp is a no-op).
  const normal = orderParams([
    { amount: "92000000", recipient: "0xseller" }, // $92 seller-net
    { amount: "8000000", recipient: "0xfee" }, // $8 fee → 8%
  ]);
  ok(Math.abs((takeRateFromOrder(normal) ?? -1) - 0.08) < 1e-9, "N1d: an in-band 8% take passes through unchanged");

  section("courtyard-adapter: D11 cap guard — over-cap acquire BLOCKS before any tx (zero spend)");
  const listing: MarketplaceListing = {
    marketplace: "courtyard",
    listingId: "0xorderhash",
    url: "https://opensea.io/assets/matic/x/1",
    productName: "Test slab",
    grader: "PSA",
    grade: "10",
    askUsd: 200,
    currency: "USDC",
    custody: "onchain-polygon",
    tokenized: true,
    isLive: true,
  };
  const quote: AcquireQuote = await adapter.quoteAcquire(listing);
  ok(quote.landedCostUsd >= 200, `landed cost reflects the $200 ask (got $${quote.landedCostUsd})`);
  eq(quote.custodyDestination, "onchain-polygon", "quote custody is onchain-polygon");
  eq(quote.settlementRail, "onchain-native", "settlement rail is onchain-native (USDC settles AS the Seaport tx)");

  // cap BELOW landed cost → must block, no tx, no settleTxHash
  const blocked = await adapter.acquire({ quote, maxUsd: 50 });
  eq(blocked.status, "failed", "over-cap acquire returns status=failed (blocked)");
  ok(blocked.settleTxHash === undefined, "over-cap acquire sends NO tx (no settleTxHash)");
  ok((blocked.approvalRef ?? "").startsWith("BLOCKED:"), "over-cap acquire is labeled BLOCKED with the reason");

  // cap ABOVE landed cost → not blocked; with no signer wired it STAGES (SPEC-ONLY), never fabricates a tx
  const staged = await adapter.acquire({ quote, maxUsd: 1000 });
  eq(staged.status, "staged", "in-cap acquire with no signer STAGES (SPEC-ONLY, no fabricated tx)");
  ok(staged.settleTxHash === undefined, "in-cap staged acquire has no fabricated settleTxHash (honesty P7)");
  eq(staged.paidUsd, quote.landedCostUsd, "staged receipt carries the would-be landed cost");

  // boundary: cap EXACTLY at landed cost → allowed (not strictly over)
  const atCap = await adapter.acquire({ quote, maxUsd: quote.landedCostUsd });
  ok(atCap.status !== "failed", "cap exactly at landed cost is allowed (block is strictly >)");

  section("courtyard-adapter: discover() parses live Seaport orders (injected fixture, no network)");
  const found = await adapter.discover({ limit: 10 });
  eq(found.length, 1, "discover surfaces the 1 USDC order and SKIPS the WETH order");
  const d = found[0];
  eq(d.marketplace, "courtyard", "discovered listing is a courtyard listing");
  eq(d.listingId, "0xc0117a7d7e3b9f0a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d", "listingId = the real Seaport order_hash");
  eq(d.currency, "USDC", "consideration currency is USDC");
  eq(d.askUsd, 50, "askUsd = total USDC consideration = $46 + $2 + $2 = $50.00");
  eq(d.custody, "onchain-polygon", "custody is onchain-polygon (Polygon-bound island)");
  ok(d.tokenized, "discovered slab is tokenized");
  ok(d.url.includes(COURTYARD_COLLECTION), "url carries the Courtyard collection address (provenance)");
  ok(d.url.includes("/matic/"), "url uses the matic (Polygon) chain segment");

  // maxAskUsd filter
  const filtered = await adapter.discover({ limit: 10, maxAskUsd: 40 });
  eq(filtered.length, 0, "maxAskUsd=$40 filters out the $50 order");

  section("courtyard-adapter: canWrite posture (honesty) — no signer ⇒ SPEC-ONLY writes");
  ok(adapter.canWrite === false, "adapter with no signer cannot write (canWrite=false)");
  const withSigner = new CourtyardMarketplaceAdapter({
    fetchImpl: fixtureFetch(),
    rpcUrl: "https://polygon-rpc.com",
    signerPrivateKey: "0x" + "1".repeat(64),
  });
  ok(withSigner.canWrite === true, "adapter with rpcUrl+signer CAN write (canWrite=true)");
  eq(withSigner.chainId, 137, "chainId is 137 (Polygon)");

  await runSecurityFixes();
}

// ─────────────────────────────────────────────────────────────────────────────
// Security fixes mirroring the Beezie SEC tests — on the Courtyard/Polygon binding.
// ─────────────────────────────────────────────────────────────────────────────

const TEST_PK = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"; // anvil #1
const TEST_ADDR = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // matches TEST_PK

/** Build an OpenSea fulfillment_data response with a controllable advancedOrder (Polygon binding). */
function fulfillmentResponse(opts: {
  considerations: Array<{ itemType: number; token: string; amount: string; recipient: string }>;
  recipient?: string;
  value?: string;
  numerator?: string;
  denominator?: string;
  criteriaResolvers?: unknown[];
  conduitKey?: string;
  /** Override the OFFER (NEW-2 tests). `null` ⇒ empty offer array. Default = a valid Courtyard ERC721. */
  offer?: Array<{ itemType: number; token: string; identifierOrCriteria: string; startAmount: string; endAmount: string }> | null;
}) {
  const consideration = opts.considerations.map((c) => ({
    itemType: c.itemType,
    token: c.token,
    identifierOrCriteria: "0",
    startAmount: c.amount,
    endAmount: c.amount,
    recipient: c.recipient,
  }));
  const advancedOrder = {
    parameters: {
      offerer: "0xseller",
      zone: "0x0000000000000000000000000000000000000000",
      offer:
        opts.offer === undefined
          ? [{ itemType: 2, token: COURTYARD_COLLECTION, identifierOrCriteria: "42424242", startAmount: "1", endAmount: "1" }]
          : opts.offer ?? [],
      consideration,
      orderType: 0,
      startTime: "0",
      endTime: "99999999999",
      zoneHash: "0x" + "0".repeat(64),
      salt: "0",
      conduitKey: "0x" + "0".repeat(64),
      totalOriginalConsiderationItems: consideration.length,
    },
    numerator: opts.numerator ?? "1",
    denominator: opts.denominator ?? "1",
    signature: "0xsig",
    extraData: "0x",
  };
  return {
    protocol: "seaport1.6",
    fulfillment_data: {
      transaction: {
        function: "fulfillAdvancedOrder(...)",
        chain: "matic",
        to: SEAPORT_1_6,
        value: opts.value ?? "0",
        input_data: {
          advancedOrder,
          criteriaResolvers: opts.criteriaResolvers ?? [],
          fulfillerConduitKey: opts.conduitKey ?? "0x" + "0".repeat(64),
          recipient: opts.recipient ?? TEST_ADDR,
        },
      },
      orders: [],
    },
  };
}

/** A fetch that serves the collection GET (empty) and a controllable fulfillment_data POST. */
function fulfillmentFetch(buildResp: () => unknown): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/listings/fulfillment_data") && init?.method === "POST") {
      return new Response(JSON.stringify(buildResp()), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (url.includes("/listings/collection/")) {
      return new Response(JSON.stringify({ listings: [], next: null }), { status: 200, headers: { "content-type": "application/json" } });
    }
    throw new Error(`unexpected fetch: ${url}`);
  }) as unknown as typeof fetch;
}

function writeAdapter(buildResp: () => unknown, spendCapUsd?: number) {
  return new CourtyardMarketplaceAdapter({
    fetchImpl: fulfillmentFetch(buildResp),
    rpcUrl: "https://polygon-rpc.com",
    signerPrivateKey: TEST_PK,
    spendCapUsd,
  });
}

export async function runSecurityFixes(): Promise<void> {
  section("SEC C1 (courtyard): cap firebreak is ON by default (config spendCapUsd) + fail-closed");

  // (a) config spendCapUsd is read + enforced — a quote over the CONFIG cap is BLOCKED.
  const capped = writeAdapter(() => fulfillmentResponse({ considerations: [] }), 50); // $50 config cap
  const quote200 = await capped.quoteAcquire(usdListing(200));
  const overCfg = await capped.acquire({ quote: quote200 }); // NO per-call maxUsd — config cap must still bite
  eq(overCfg.status, "failed", "C1a: config spendCapUsd ($50) blocks a $200 buy with NO per-call maxUsd");
  ok((overCfg.approvalRef ?? "").includes("over-cap"), "C1a: blocked for over-cap against the config cap");

  // (b) FAIL CLOSED — canWrite but neither maxUsd nor spendCapUsd → never spends.
  const noCap = writeAdapter(() => fulfillmentResponse({ considerations: [] })); // no config cap
  const failClosed = await noCap.acquire({ quote: quote200 }); // no per-call cap either
  eq(failClosed.status, "failed", "C1b: canWrite + NO resolvable cap FAILS CLOSED (no spend)");
  ok((failClosed.approvalRef ?? "").includes("no-cap-set"), "C1b: labeled no-cap-set fail-closed");
  ok(failClosed.settleTxHash === undefined, "C1b: fail-closed sends no tx");

  // (c) effective cap = MIN(per-call, config).
  const both = writeAdapter(() => fulfillmentResponse({ considerations: [] }), 50);
  const minWins = await both.acquire({ quote: quote200, maxUsd: 300 });
  eq(minWins.status, "failed", "C1c: effective cap = MIN(per-call $300, config $50) blocks a $200 buy");
  const both2 = writeAdapter(() => fulfillmentResponse({ considerations: [] }), 500);
  const minWins2 = await both2.acquire({ quote: quote200, maxUsd: 20 });
  eq(minWins2.status, "failed", "C1c: effective cap = MIN(per-call $20, config $500) blocks a $200 buy");

  // pure helper coverage (BigInts compared as strings)
  eq(String(effectiveCapBaseUnits(300, 50)), "50000000", "C1c: effectiveCapBaseUnits(300,50) = $50 in base units");
  eq(String(effectiveCapBaseUnits(20, 500)), "20000000", "C1c: effectiveCapBaseUnits(20,500) = $20 in base units");
  eq(effectiveCapBaseUnits(undefined, undefined), undefined, "C1b: no caps → undefined (drives fail-closed)");

  section("SEC C2 (courtyard): untrusted fulfillment_data — inflated/foreign/non-zero-value REJECTED");

  // honest order: total USDC consideration = $40 (< $100 cap) → buildSeaportFill must ACCEPT.
  const honest = writeAdapter(() =>
    fulfillmentResponse({
      considerations: [
        { itemType: 1, token: USDC_POLYGON, amount: "37000000", recipient: "0xseller" }, // $37
        { itemType: 1, token: USDC_POLYGON, amount: "3000000", recipient: "0xfee" }, // $3 fee
      ],
    }),
  );
  const verified = await honest.buildSeaportFill({ orderHash: "0xhash", fulfiller: TEST_ADDR, capBaseUnits: 100_000_000n, quotedAskBaseUnits: 40_000_000n });
  eq(String(verified.considerationBaseUnits), "40000000", "C2: re-summed consideration = $40 (37+3)");
  eq(String(verified.value), "0", "C2: USDC order has tx.value === 0");

  // INFLATED: the API returns a $5000 consideration while the cap is $100 → REJECT.
  const inflated = writeAdapter(() =>
    fulfillmentResponse({ considerations: [{ itemType: 1, token: USDC_POLYGON, amount: "5000000000", recipient: "0xattacker" }] }),
  );
  await expectThrow(
    () => inflated.buildSeaportFill({ orderHash: "0xhash", fulfiller: TEST_ADDR, capBaseUnits: 100_000_000n, quotedAskBaseUnits: 40_000_000n }),
    "C2",
    "inflated $5000 consideration vs $100 cap is REJECTED before any tx",
  );

  // FOREIGN TOKEN: a non-USDC ERC20 (Polygon WETH) consideration → REJECT.
  const foreign = writeAdapter(() =>
    fulfillmentResponse({ considerations: [{ itemType: 1, token: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", amount: "1000000", recipient: "0xseller" }] }),
  );
  await expectThrow(
    () => foreign.buildSeaportFill({ orderHash: "0xhash", fulfiller: TEST_ADDR, capBaseUnits: 100_000_000n, quotedAskBaseUnits: 1_000_000n }),
    "C2",
    "foreign-token (Polygon WETH) consideration is REJECTED",
  );

  // NON-ZERO VALUE: tx.value carries native value → REJECT.
  const nativeValue = writeAdapter(() =>
    fulfillmentResponse({ considerations: [{ itemType: 1, token: USDC_POLYGON, amount: "1000000", recipient: "0xseller" }], value: "1000000000000000000" }),
  );
  await expectThrow(
    () => nativeValue.buildSeaportFill({ orderHash: "0xhash", fulfiller: TEST_ADDR, capBaseUnits: 100_000_000n, quotedAskBaseUnits: 1_000_000n }),
    "C2",
    "non-zero tx.value (native-value leak) is REJECTED",
  );

  section("SEC H3 (courtyard): recipient / numerator / criteriaResolvers tampering is REJECTED");

  const wrongRecip = writeAdapter(() =>
    fulfillmentResponse({
      considerations: [{ itemType: 1, token: USDC_POLYGON, amount: "1000000", recipient: "0xseller" }],
      recipient: "0x000000000000000000000000000000000000dEaD",
    }),
  );
  await expectThrow(
    () => wrongRecip.buildSeaportFill({ orderHash: "0xhash", fulfiller: TEST_ADDR, capBaseUnits: 100_000_000n, quotedAskBaseUnits: 1_000_000n }),
    "H3",
    "recipient != our wallet is REJECTED (slab can't be redirected to an attacker)",
  );

  const partial = writeAdapter(() =>
    fulfillmentResponse({ considerations: [{ itemType: 1, token: USDC_POLYGON, amount: "1000000", recipient: "0xseller" }], numerator: "1", denominator: "2" }),
  );
  await expectThrow(
    () => partial.buildSeaportFill({ orderHash: "0xhash", fulfiller: TEST_ADDR, capBaseUnits: 100_000_000n, quotedAskBaseUnits: 1_000_000n }),
    "H3",
    "partial-fill (numerator/denominator 1/2) is REJECTED",
  );

  const withCriteria = writeAdapter(() =>
    fulfillmentResponse({
      considerations: [{ itemType: 1, token: USDC_POLYGON, amount: "1000000", recipient: "0xseller" }],
      criteriaResolvers: [{ orderIndex: 0, side: 0, index: 0, identifier: 0, criteriaProof: [] }],
    }),
  );
  await expectThrow(
    () => withCriteria.buildSeaportFill({ orderHash: "0xhash", fulfiller: TEST_ADDR, capBaseUnits: 100_000_000n, quotedAskBaseUnits: 1_000_000n }),
    "H3",
    "criteriaResolvers present is REJECTED",
  );

  section("SEC H1 (courtyard): USDC approval is the EXACT need, never maxUint256");
  const MAX_UINT256 = (1n << 256n) - 1n;
  const approve = exactApprovalAmount(40_000_000n, 100_000_000n);
  eq(String(approve), "40200000", "H1: approval = consideration $40 + 0.5% buffer = $40.20");
  ok(approve < MAX_UINT256, "H1: approval is bounded (NOT maxUint256)");
  eq(String(exactApprovalAmount(99_900_000n, 100_000_000n)), "100000000", "H1: approval is hard-capped by the spend cap");

  section("SEC NEW-1 (courtyard): overpay-within-cap — consideration must ≈ the QUOTED ask, not just ≤ cap");
  const overpay = writeAdapter(() =>
    fulfillmentResponse({ considerations: [{ itemType: 1, token: USDC_POLYGON, amount: "99000000", recipient: "0xseller" }] }),
  );
  await expectThrow(
    () => overpay.buildSeaportFill({ orderHash: "0xhash", fulfiller: TEST_ADDR, capBaseUnits: 100_000_000n, quotedAskBaseUnits: 40_000_000n }),
    "NEW-1",
    "consideration $99 vs quoted ask $40 (under the $100 cap) is REJECTED as overpay-within-cap",
  );
  const honestMatch = writeAdapter(() =>
    fulfillmentResponse({ considerations: [{ itemType: 1, token: USDC_POLYGON, amount: "40000000", recipient: "0xseller" }] }),
  );
  const okFill = await honestMatch.buildSeaportFill({ orderHash: "0xhash", fulfiller: TEST_ADDR, capBaseUnits: 100_000_000n, quotedAskBaseUnits: 40_000_000n });
  eq(String(okFill.considerationBaseUnits), "40000000", "NEW-1: a consideration matching the quoted ask is ACCEPTED");
  const drift = writeAdapter(() =>
    fulfillmentResponse({ considerations: [{ itemType: 1, token: USDC_POLYGON, amount: "40004000", recipient: "0xseller" }] }),
  );
  const driftFill = await drift.buildSeaportFill({ orderHash: "0xhash", fulfiller: TEST_ADDR, capBaseUnits: 100_000_000n, quotedAskBaseUnits: 40_000_000n });
  eq(String(driftFill.considerationBaseUnits), "40004000", "NEW-1: sub-tolerance fee drift ($0.004) is ACCEPTED");

  section("SEC NEW-2 (courtyard): offer-side assertion — the order must OFFER the expected Courtyard ERC721");
  const emptyOffer = writeAdapter(() =>
    fulfillmentResponse({ considerations: [{ itemType: 1, token: USDC_POLYGON, amount: "1000000", recipient: "0xseller" }], offer: null }),
  );
  await expectThrow(
    () => emptyOffer.buildSeaportFill({ orderHash: "0xhash", fulfiller: TEST_ADDR, capBaseUnits: 100_000_000n, quotedAskBaseUnits: 1_000_000n }),
    "NEW-2",
    "empty offer is REJECTED (no asset to receive)",
  );
  const wrongColl = writeAdapter(() =>
    fulfillmentResponse({
      considerations: [{ itemType: 1, token: USDC_POLYGON, amount: "1000000", recipient: "0xseller" }],
      offer: [{ itemType: 2, token: "0x000000000000000000000000000000000000bEEf", identifierOrCriteria: "1", startAmount: "1", endAmount: "1" }],
    }),
  );
  await expectThrow(
    () => wrongColl.buildSeaportFill({ orderHash: "0xhash", fulfiller: TEST_ADDR, capBaseUnits: 100_000_000n, quotedAskBaseUnits: 1_000_000n }),
    "NEW-2",
    "offer token != Courtyard collection is REJECTED",
  );
  const wrongItemType = writeAdapter(() =>
    fulfillmentResponse({
      considerations: [{ itemType: 1, token: USDC_POLYGON, amount: "1000000", recipient: "0xseller" }],
      offer: [{ itemType: 1, token: COURTYARD_COLLECTION, identifierOrCriteria: "0", startAmount: "1", endAmount: "1" }],
    }),
  );
  await expectThrow(
    () => wrongItemType.buildSeaportFill({ orderHash: "0xhash", fulfiller: TEST_ADDR, capBaseUnits: 100_000_000n, quotedAskBaseUnits: 1_000_000n }),
    "NEW-2",
    "offer itemType != ERC721 is REJECTED",
  );
  const wrongToken = writeAdapter(() =>
    fulfillmentResponse({
      considerations: [{ itemType: 1, token: USDC_POLYGON, amount: "1000000", recipient: "0xseller" }],
      offer: [{ itemType: 2, token: COURTYARD_COLLECTION, identifierOrCriteria: "99999", startAmount: "1", endAmount: "1" }],
    }),
  );
  await expectThrow(
    () => wrongToken.buildSeaportFill({ orderHash: "0xhash", fulfiller: TEST_ADDR, capBaseUnits: 100_000_000n, quotedAskBaseUnits: 1_000_000n, expectedTokenId: "42424242" }),
    "NEW-2",
    "offer tokenId != expectedTokenId is REJECTED",
  );
  const rightOffer = writeAdapter(() =>
    fulfillmentResponse({ considerations: [{ itemType: 1, token: USDC_POLYGON, amount: "1000000", recipient: "0xseller" }] }),
  );
  const rightFill = await rightOffer.buildSeaportFill({ orderHash: "0xhash", fulfiller: TEST_ADDR, capBaseUnits: 100_000_000n, quotedAskBaseUnits: 1_000_000n, expectedTokenId: "42424242" });
  eq(String(rightFill.considerationBaseUnits), "1000000", "NEW-2: the expected Courtyard ERC721 (tokenId 42424242) is ACCEPTED");

  section("SEC M1 (courtyard): acquire() is idempotent — concurrent re-entry on the same listing is rejected");
  const slow = new CourtyardMarketplaceAdapter({
    rpcUrl: "https://polygon-rpc.com",
    signerPrivateKey: TEST_PK,
    spendCapUsd: 100,
    fetchImpl: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/listings/fulfillment_data") && init?.method === "POST") {
        await new Promise((r) => setTimeout(r, 150)); // hold the in-flight slot
        return new Response(JSON.stringify(fulfillmentResponse({ considerations: [{ itemType: 1, token: USDC_POLYGON, amount: "1000000", recipient: "0xseller" }] })), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({ listings: [], next: null }), { status: 200 });
    }) as unknown as typeof fetch,
  });
  const q = await slow.quoteAcquire(usdListing(1, "0xSAME"));
  const p1 = slow.acquire({ quote: q, maxUsd: 100 }).catch((e) => ({ status: "failed", approvalRef: "threw:" + (e as Error).message }) as Awaited<ReturnType<typeof slow.acquire>>);
  await new Promise((r) => setTimeout(r, 30));
  const dup = await slow.acquire({ quote: q, maxUsd: 100 });
  eq(dup.status, "failed", "M1: a concurrent duplicate acquire() on the same listingId is blocked");
  ok((dup.approvalRef ?? "").includes("in-flight"), "M1: duplicate labeled in-flight");
  await p1; // let the first settle/throw (on-chain send fails harmlessly in test)
}

/** Build a minimal OSProtocolParameters with the given USDC consideration split (N1 take tests). */
function orderParams(considerations: Array<{ amount: string; recipient: string }>): any {
  return {
    offerer: "0xseller",
    offer: [{ itemType: 2, token: COURTYARD_COLLECTION, identifierOrCriteria: "42424242", startAmount: "1", endAmount: "1" }],
    consideration: considerations.map((c) => ({
      itemType: 1,
      token: USDC_POLYGON,
      identifierOrCriteria: "0",
      startAmount: c.amount,
      endAmount: c.amount,
      recipient: c.recipient,
    })),
    startTime: "0",
    endTime: "99999999999",
    orderType: 0,
    zone: "0x0000000000000000000000000000000000000000",
    zoneHash: "0x" + "0".repeat(64),
    salt: "0",
    conduitKey: "0x" + "0".repeat(64),
    totalOriginalConsiderationItems: considerations.length,
    counter: 0,
  };
}

/** A minimal USD-priced courtyard listing for quoteAcquire in the security tests. */
function usdListing(askUsd: number, id = "0xorder"): import("../lib/adapters/index.ts").MarketplaceListing {
  return {
    marketplace: "courtyard",
    listingId: id,
    url: "https://opensea.io/assets/matic/x/1",
    productName: "Test slab",
    grader: "PSA",
    grade: "10",
    askUsd,
    currency: "USDC",
    custody: "onchain-polygon",
    tokenized: true,
    isLive: true,
  };
}

/** Assert a promise-returning fn throws a labeled SECURITY refusal. */
async function expectThrow(fn: () => Promise<unknown>, tag: string, msg: string): Promise<void> {
  let threw = false;
  let err = "";
  try {
    await fn();
  } catch (e) {
    threw = true;
    err = (e as Error).message;
  }
  ok(threw, `${tag}: ${msg}`);
  if (threw) ok(/SECURITY/.test(err), `${tag}: rejection is a labeled SECURITY refusal (${err.slice(0, 60)}…)`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await run();
  const { exitWithSummary } = await import("./assert.ts");
  exitWithSummary();
}
