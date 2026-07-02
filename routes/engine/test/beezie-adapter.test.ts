/**
 * beezie-adapter.test.ts — unit tests for the two Sprint-1 math/guard contracts that
 * the Evaluator runs ZERO-NETWORK:
 *   (5) quoteExit math — netProceeds(listAt=oracle) = oracle − ~8% take.
 *   (6) the D11 cap guard — acquire() with maxUsd below price BLOCKS before any tx (zero spend).
 *
 * Plus coverage of discover() parsing over an INJECTED OpenSea Orders payload (no network),
 * so the Seaport-order parse is verified deterministically even when offline. The LIVE
 * discover() proof runs in scripts/beezie-discover.mjs (network, evidence logged).
 */
import {
  BeezieMarketplaceAdapter,
  BEEZIE_TAKE_RATE,
  netProceeds,
  netClearingListPrice,
  exactApprovalAmount,
  effectiveCapBaseUnits,
  SEAPORT_1_6,
  USDC_BASE,
  BEEZIE_COLLECTION,
} from "../lib/adapters/beezie.ts";
import type { AcquireQuote, MarketplaceListing } from "../lib/adapters/index.ts";
import { ok, eq, section } from "./assert.ts";

/** A deterministic OpenSea Orders payload (shape mirrors the LIVE API; values are a real $15 order). */
const FIXTURE_ORDERS = {
  listings: [
    {
      order_hash: "0xaf5b87ca88cbc6d21b59ebb0eb9050ff19be3fd84e040c282765e1f28141827f",
      chain: "base",
      protocol_address: SEAPORT_1_6,
      status: "active",
      price: { current: { currency: "USDC", decimals: 6, value: "15000000" } },
      protocol_data: {
        signature: "0xsig",
        parameters: {
          offerer: "0x05070e8e1a7d581ba0ffecfed00533a75c69d640",
          offer: [{ itemType: 2, token: BEEZIE_COLLECTION, identifierOrCriteria: "11851", startAmount: "1", endAmount: "1" }],
          consideration: [
            { itemType: 1, token: USDC_BASE, identifierOrCriteria: "0", startAmount: "13800000", endAmount: "13800000", recipient: "0xseller" },
            { itemType: 1, token: USDC_BASE, identifierOrCriteria: "0", startAmount: "150000", endAmount: "150000", recipient: "0xopenseafee" },
            { itemType: 1, token: USDC_BASE, identifierOrCriteria: "0", startAmount: "1050000", endAmount: "1050000", recipient: "0xbeeziefee" },
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
      chain: "base",
      protocol_address: SEAPORT_1_6,
      status: "active",
      price: { current: { currency: "WETH", decimals: 18, value: "1000000000000000" } },
      protocol_data: {
        signature: "0xsig2",
        parameters: {
          offerer: "0xofferer2",
          offer: [{ itemType: 2, token: BEEZIE_COLLECTION, identifierOrCriteria: "999", startAmount: "1", endAmount: "1" }],
          consideration: [
            { itemType: 1, token: "0x4200000000000000000000000000000000000006", identifierOrCriteria: "0", startAmount: "1000000000000000", endAmount: "1000000000000000", recipient: "0xseller2" },
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
  section("beezie-adapter: quoteExit math (netProceeds(oracle) = oracle − ~8%)");
  const adapter = new BeezieMarketplaceAdapter({ fetchImpl: fixtureFetch() });

  const oracle = 100;
  const exits = await adapter.quoteExit({ productId: "base1-4", listAtUsd: oracle, currentCustody: "onchain-base" });
  ok(exits.length >= 1, "quoteExit returns at least the relist-in-place exit");
  const relist = exits[0];
  eq(relist.strategy, "relist-in-place", "first exit is relist-in-place");
  eq(relist.sellFeeUsd, 8, "sellFee on a $100 list = 8% = $8.00");
  eq(relist.netProceedsUsd, 92, "netProceeds($100) = $100 − $8 take = $92.00");
  eq(relist.moveVenueUsd, 0, "relist-in-place has zero move-venue cost");

  // the pure helpers (used by the planner)
  eq(netProceeds(100), 92, "netProceeds(100) helper = 92");
  eq(Math.round(BEEZIE_TAKE_RATE * 100), 8, "take rate is ~8%");
  // net-clearing: list HIGH enough that the NET clears the oracle
  const listTarget = netClearingListPrice(100); // 100 / 0.92 = 108.70
  ok(listTarget > 100, "net-clearing list price is above oracle (to cover the take)");
  ok(netProceeds(listTarget) >= 100 - 0.01, `netProceeds(netClearingListPrice(100))=${netProceeds(listTarget)} ≥ oracle 100 (D-A5 clears net)`);

  section("beezie-adapter: D11 cap guard — over-cap acquire BLOCKS before any tx (zero spend)");
  // Build a quote for a $200 landed-cost slab.
  const listing: MarketplaceListing = {
    marketplace: "beezie",
    listingId: "0xorderhash",
    url: "https://opensea.io/assets/base/x/1",
    productName: "Test slab",
    grader: "PSA",
    grade: "10",
    askUsd: 200,
    currency: "USDC",
    custody: "onchain-base",
    tokenized: true,
    isLive: true,
  };
  const quote: AcquireQuote = await adapter.quoteAcquire(listing);
  ok(quote.landedCostUsd >= 200, `landed cost reflects the $200 ask (got $${quote.landedCostUsd})`);

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

  section("beezie-adapter: discover() parses live Seaport orders (injected fixture, no network)");
  const found = await adapter.discover({ limit: 10 });
  eq(found.length, 1, "discover surfaces the 1 USDC order and SKIPS the WETH order");
  const d = found[0];
  eq(d.marketplace, "beezie", "discovered listing is a beezie listing");
  eq(d.listingId, "0xaf5b87ca88cbc6d21b59ebb0eb9050ff19be3fd84e040c282765e1f28141827f", "listingId = the real Seaport order_hash");
  eq(d.currency, "USDC", "consideration currency is USDC");
  eq(d.askUsd, 15, "askUsd = total USDC consideration = $13.80 + $0.15 + $1.05 = $15.00");
  eq(d.custody, "onchain-base", "custody is onchain-base (Base-bound island)");
  ok(d.tokenized, "discovered slab is tokenized");
  ok(d.url.includes(BEEZIE_COLLECTION), "url carries the Beezie collection address (provenance)");

  // maxAskUsd filter
  const filtered = await adapter.discover({ limit: 10, maxAskUsd: 10 });
  eq(filtered.length, 0, "maxAskUsd=$10 filters out the $15 order");

  section("beezie-adapter: canWrite posture (honesty) — no signer ⇒ SPEC-ONLY writes");
  ok(adapter.canWrite === false, "adapter with no signer cannot write (canWrite=false)");
  const withSigner = new BeezieMarketplaceAdapter({
    fetchImpl: fixtureFetch(),
    rpcUrl: "https://sepolia.base.org",
    signerPrivateKey: "0x" + "1".repeat(64),
  });
  ok(withSigner.canWrite === true, "adapter with rpcUrl+signer CAN write (canWrite=true)");

  await runSecurityFixes();
}

// ─────────────────────────────────────────────────────────────────────────────
// Iteration-2 security fixes (cross-model adversarial review): C1/C2/H1/H2/H3/M1/M2.
// ─────────────────────────────────────────────────────────────────────────────

/** A test wallet whose address we assert as the fill recipient. */
const TEST_PK = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"; // anvil #1
const TEST_ADDR = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // matches TEST_PK

/** Build an OpenSea fulfillment_data response with a controllable advancedOrder. */
function fulfillmentResponse(opts: {
  considerations: Array<{ itemType: number; token: string; amount: string; recipient: string }>;
  recipient?: string;
  value?: string;
  numerator?: string;
  denominator?: string;
  criteriaResolvers?: unknown[];
  conduitKey?: string;
  /** Override the OFFER (NEW-2 tests). `null` ⇒ empty offer array. Default = a valid Beezie ERC721. */
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
          ? [{ itemType: 2, token: BEEZIE_COLLECTION, identifierOrCriteria: "11851", startAmount: "1", endAmount: "1" }]
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
        chain: "base",
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
  return new BeezieMarketplaceAdapter({
    fetchImpl: fulfillmentFetch(buildResp),
    rpcUrl: "https://sepolia.base.org",
    signerPrivateKey: TEST_PK,
    spendCapUsd,
  });
}

export async function runSecurityFixes(): Promise<void> {
  section("SEC C1: cap firebreak is ON by default (config spendCapUsd) + fail-closed");

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

  // (c) effective cap = MIN(per-call, config). per-call $300, config $50 → $50 wins → block $200.
  const both = writeAdapter(() => fulfillmentResponse({ considerations: [] }), 50);
  const minWins = await both.acquire({ quote: quote200, maxUsd: 300 });
  eq(minWins.status, "failed", "C1c: effective cap = MIN(per-call $300, config $50) blocks a $200 buy");
  // and the reverse: per-call $20 tighter than config $500 → $20 wins → block $200.
  const both2 = writeAdapter(() => fulfillmentResponse({ considerations: [] }), 500);
  const minWins2 = await both2.acquire({ quote: quote200, maxUsd: 20 });
  eq(minWins2.status, "failed", "C1c: effective cap = MIN(per-call $20, config $500) blocks a $200 buy");

  // pure helper coverage (compare BigInts as strings — the shared eq() can't serialize BigInt)
  eq(String(effectiveCapBaseUnits(300, 50)), "50000000", "C1c: effectiveCapBaseUnits(300,50) = $50 in base units");
  eq(String(effectiveCapBaseUnits(20, 500)), "20000000", "C1c: effectiveCapBaseUnits(20,500) = $20 in base units");
  eq(effectiveCapBaseUnits(undefined, undefined), undefined, "C1b: no caps → undefined (drives fail-closed)");

  section("SEC C2: untrusted fulfillment_data — inflated/foreign/non-zero-value consideration is REJECTED");

  // honest order: total USDC consideration = $40 (< $100 cap) → buildSeaportFill must ACCEPT.
  const honest = writeAdapter(() =>
    fulfillmentResponse({
      considerations: [
        { itemType: 1, token: USDC_BASE, amount: "37000000", recipient: "0xseller" }, // $37
        { itemType: 1, token: USDC_BASE, amount: "3000000", recipient: "0xfee" }, // $3 fee
      ],
    }),
  );
  const verified = await honest.buildSeaportFill({ orderHash: "0xhash", fulfiller: TEST_ADDR, capBaseUnits: 100_000_000n, quotedAskBaseUnits: 40_000_000n });
  eq(String(verified.considerationBaseUnits), "40000000", "C2: re-summed consideration = $40 (37+3)");
  eq(String(verified.value), "0", "C2: USDC order has tx.value === 0");

  // INFLATED: the API returns a $5000 consideration while the cap is $100 → REJECT.
  const inflated = writeAdapter(() =>
    fulfillmentResponse({ considerations: [{ itemType: 1, token: USDC_BASE, amount: "5000000000", recipient: "0xattacker" }] }),
  );
  await expectThrow(
    () => inflated.buildSeaportFill({ orderHash: "0xhash", fulfiller: TEST_ADDR, capBaseUnits: 100_000_000n, quotedAskBaseUnits: 40_000_000n }),
    "C2",
    "inflated $5000 consideration vs $100 cap is REJECTED before any tx",
  );

  // FOREIGN TOKEN: a non-USDC ERC20 consideration → REJECT.
  const foreign = writeAdapter(() =>
    fulfillmentResponse({ considerations: [{ itemType: 1, token: "0x4200000000000000000000000000000000000006", amount: "1000000", recipient: "0xseller" }] }),
  );
  await expectThrow(
    () => foreign.buildSeaportFill({ orderHash: "0xhash", fulfiller: TEST_ADDR, capBaseUnits: 100_000_000n, quotedAskBaseUnits: 1_000_000n }),
    "C2",
    "foreign-token (WETH) consideration is REJECTED",
  );

  // NON-ZERO VALUE: tx.value carries native ETH → REJECT.
  const nativeValue = writeAdapter(() =>
    fulfillmentResponse({ considerations: [{ itemType: 1, token: USDC_BASE, amount: "1000000", recipient: "0xseller" }], value: "1000000000000000000" }),
  );
  await expectThrow(
    () => nativeValue.buildSeaportFill({ orderHash: "0xhash", fulfiller: TEST_ADDR, capBaseUnits: 100_000_000n, quotedAskBaseUnits: 1_000_000n }),
    "C2",
    "non-zero tx.value (native-ETH leak) is REJECTED",
  );

  section("SEC H3: recipient / numerator / criteriaResolvers tampering is REJECTED");

  // WRONG RECIPIENT: the bought slab would go to an attacker, not our wallet → REJECT.
  const wrongRecip = writeAdapter(() =>
    fulfillmentResponse({
      considerations: [{ itemType: 1, token: USDC_BASE, amount: "1000000", recipient: "0xseller" }],
      recipient: "0x000000000000000000000000000000000000dEaD",
    }),
  );
  await expectThrow(
    () => wrongRecip.buildSeaportFill({ orderHash: "0xhash", fulfiller: TEST_ADDR, capBaseUnits: 100_000_000n, quotedAskBaseUnits: 1_000_000n }),
    "H3",
    "recipient != our wallet is REJECTED (slab can't be redirected to an attacker)",
  );

  // PARTIAL BUY: numerator/denominator != 1/1 → REJECT.
  const partial = writeAdapter(() =>
    fulfillmentResponse({ considerations: [{ itemType: 1, token: USDC_BASE, amount: "1000000", recipient: "0xseller" }], numerator: "1", denominator: "2" }),
  );
  await expectThrow(
    () => partial.buildSeaportFill({ orderHash: "0xhash", fulfiller: TEST_ADDR, capBaseUnits: 100_000_000n, quotedAskBaseUnits: 1_000_000n }),
    "H3",
    "partial-fill (numerator/denominator 1/2) is REJECTED",
  );

  // CRITERIA RESOLVERS present → REJECT.
  const withCriteria = writeAdapter(() =>
    fulfillmentResponse({
      considerations: [{ itemType: 1, token: USDC_BASE, amount: "1000000", recipient: "0xseller" }],
      criteriaResolvers: [{ orderIndex: 0, side: 0, index: 0, identifier: 0, criteriaProof: [] }],
    }),
  );
  await expectThrow(
    () => withCriteria.buildSeaportFill({ orderHash: "0xhash", fulfiller: TEST_ADDR, capBaseUnits: 100_000_000n, quotedAskBaseUnits: 1_000_000n }),
    "H3",
    "criteriaResolvers present is REJECTED",
  );

  section("SEC H1: USDC approval is the EXACT need, never maxUint256");
  const MAX_UINT256 = (1n << 256n) - 1n;
  // $40 consideration, $100 cap → approve $40 + 0.5% = $40.20, NOT maxUint256.
  const approve = exactApprovalAmount(40_000_000n, 100_000_000n);
  eq(String(approve), "40200000", "H1: approval = consideration $40 + 0.5% buffer = $40.20");
  ok(approve < MAX_UINT256, "H1: approval is bounded (NOT maxUint256)");
  // the cap is the hard ceiling: $99.90 consideration, $100 cap → cap wins (not 99.90+0.5%).
  eq(String(exactApprovalAmount(99_900_000n, 100_000_000n)), "100000000", "H1: approval is hard-capped by the spend cap");

  section("SEC NEW-1: overpay-within-cap — consideration must ≈ the QUOTED ask, not just ≤ cap");
  // cap $100, quoted ask $40, fulfillment_data returns a $99 consideration → REJECTED.
  // (Under the old `<= cap` rule this PASSED — we'd have paid $99 for a $40 slab.)
  const overpay = writeAdapter(() =>
    fulfillmentResponse({ considerations: [{ itemType: 1, token: USDC_BASE, amount: "99000000", recipient: "0xseller" }] }),
  );
  await expectThrow(
    () => overpay.buildSeaportFill({ orderHash: "0xhash", fulfiller: TEST_ADDR, capBaseUnits: 100_000_000n, quotedAskBaseUnits: 40_000_000n }),
    "NEW-1",
    "consideration $99 vs quoted ask $40 (under the $100 cap) is REJECTED as overpay-within-cap",
  );
  // and the inverse — an honest match within tolerance is ACCEPTED.
  const honestMatch = writeAdapter(() =>
    fulfillmentResponse({ considerations: [{ itemType: 1, token: USDC_BASE, amount: "40000000", recipient: "0xseller" }] }),
  );
  const okFill = await honestMatch.buildSeaportFill({ orderHash: "0xhash", fulfiller: TEST_ADDR, capBaseUnits: 100_000_000n, quotedAskBaseUnits: 40_000_000n });
  eq(String(okFill.considerationBaseUnits), "40000000", "NEW-1: a consideration matching the quoted ask is ACCEPTED");
  // tiny fee-drift within tolerance ($40.004 vs $40.00, delta $0.004 < $0.005) is ACCEPTED.
  const drift = writeAdapter(() =>
    fulfillmentResponse({ considerations: [{ itemType: 1, token: USDC_BASE, amount: "40004000", recipient: "0xseller" }] }),
  );
  const driftFill = await drift.buildSeaportFill({ orderHash: "0xhash", fulfiller: TEST_ADDR, capBaseUnits: 100_000_000n, quotedAskBaseUnits: 40_000_000n });
  eq(String(driftFill.considerationBaseUnits), "40004000", "NEW-1: sub-tolerance fee drift ($0.004) is ACCEPTED");

  section("SEC NEW-2: offer-side assertion — the order must OFFER the expected Beezie ERC721");
  // EMPTY offer → REJECT (we could pay USDC for nothing).
  const emptyOffer = writeAdapter(() =>
    fulfillmentResponse({ considerations: [{ itemType: 1, token: USDC_BASE, amount: "1000000", recipient: "0xseller" }], offer: null }),
  );
  await expectThrow(
    () => emptyOffer.buildSeaportFill({ orderHash: "0xhash", fulfiller: TEST_ADDR, capBaseUnits: 100_000_000n, quotedAskBaseUnits: 1_000_000n }),
    "NEW-2",
    "empty offer is REJECTED (no asset to receive)",
  );
  // WRONG COLLECTION → REJECT (pay USDC for a different/worthless NFT).
  const wrongColl = writeAdapter(() =>
    fulfillmentResponse({
      considerations: [{ itemType: 1, token: USDC_BASE, amount: "1000000", recipient: "0xseller" }],
      offer: [{ itemType: 2, token: "0x000000000000000000000000000000000000bEEf", identifierOrCriteria: "1", startAmount: "1", endAmount: "1" }],
    }),
  );
  await expectThrow(
    () => wrongColl.buildSeaportFill({ orderHash: "0xhash", fulfiller: TEST_ADDR, capBaseUnits: 100_000_000n, quotedAskBaseUnits: 1_000_000n }),
    "NEW-2",
    "offer token != Beezie collection is REJECTED",
  );
  // WRONG itemType (ERC20 offer, not ERC721) → REJECT.
  const wrongItemType = writeAdapter(() =>
    fulfillmentResponse({
      considerations: [{ itemType: 1, token: USDC_BASE, amount: "1000000", recipient: "0xseller" }],
      offer: [{ itemType: 1, token: BEEZIE_COLLECTION, identifierOrCriteria: "0", startAmount: "1", endAmount: "1" }],
    }),
  );
  await expectThrow(
    () => wrongItemType.buildSeaportFill({ orderHash: "0xhash", fulfiller: TEST_ADDR, capBaseUnits: 100_000_000n, quotedAskBaseUnits: 1_000_000n }),
    "NEW-2",
    "offer itemType != ERC721 is REJECTED",
  );
  // WRONG tokenId (vs expectedTokenId) → REJECT.
  const wrongToken = writeAdapter(() =>
    fulfillmentResponse({
      considerations: [{ itemType: 1, token: USDC_BASE, amount: "1000000", recipient: "0xseller" }],
      offer: [{ itemType: 2, token: BEEZIE_COLLECTION, identifierOrCriteria: "99999", startAmount: "1", endAmount: "1" }],
    }),
  );
  await expectThrow(
    () => wrongToken.buildSeaportFill({ orderHash: "0xhash", fulfiller: TEST_ADDR, capBaseUnits: 100_000_000n, quotedAskBaseUnits: 1_000_000n, expectedTokenId: "11851" }),
    "NEW-2",
    "offer tokenId != expectedTokenId is REJECTED",
  );
  // the correct Beezie ERC721 (default offer, tokenId 11851) with matching expectedTokenId → ACCEPTED.
  const rightOffer = writeAdapter(() =>
    fulfillmentResponse({ considerations: [{ itemType: 1, token: USDC_BASE, amount: "1000000", recipient: "0xseller" }] }),
  );
  const rightFill = await rightOffer.buildSeaportFill({ orderHash: "0xhash", fulfiller: TEST_ADDR, capBaseUnits: 100_000_000n, quotedAskBaseUnits: 1_000_000n, expectedTokenId: "11851" });
  eq(String(rightFill.considerationBaseUnits), "1000000", "NEW-2: the expected Beezie ERC721 (tokenId 11851) is ACCEPTED");

  section("SEC M1: acquire() is idempotent — concurrent re-entry on the same listing is rejected");
  // Use a slow fulfillment_data so two acquire()s overlap. The 2nd must be BLOCKED in-flight.
  const slow = new BeezieMarketplaceAdapter({
    rpcUrl: "https://sepolia.base.org",
    signerPrivateKey: TEST_PK,
    spendCapUsd: 100,
    fetchImpl: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/listings/fulfillment_data") && init?.method === "POST") {
        await new Promise((r) => setTimeout(r, 150)); // hold the in-flight slot
        // return a fill that will then fail at the (un-mocked) on-chain send — fine; we only
        // assert the 2nd call is rejected as in-flight before the 1st releases.
        return new Response(JSON.stringify(fulfillmentResponse({ considerations: [{ itemType: 1, token: USDC_BASE, amount: "1000000", recipient: "0xseller" }] })), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({ listings: [], next: null }), { status: 200 });
    }) as unknown as typeof fetch,
  });
  const q = await slow.quoteAcquire(usdListing(1, "0xSAME"));
  const p1 = slow.acquire({ quote: q, maxUsd: 100 }).catch((e) => ({ status: "failed", approvalRef: "threw:" + (e as Error).message }) as Awaited<ReturnType<typeof slow.acquire>>);
  // give p1 time to register in-flight, then fire the duplicate
  await new Promise((r) => setTimeout(r, 30));
  const dup = await slow.acquire({ quote: q, maxUsd: 100 });
  eq(dup.status, "failed", "M1: a concurrent duplicate acquire() on the same listingId is blocked");
  ok((dup.approvalRef ?? "").includes("in-flight"), "M1: duplicate labeled in-flight");
  await p1; // let the first settle/throw (on-chain send fails harmlessly in test)
}

/** A minimal USD-priced listing for quoteAcquire in the security tests. */
function usdListing(askUsd: number, id = "0xorder"): import("../lib/adapters/index.ts").MarketplaceListing {
  return {
    marketplace: "beezie",
    listingId: id,
    url: "https://opensea.io/x",
    productName: "Test slab",
    grader: "PSA",
    grade: "10",
    askUsd,
    currency: "USDC",
    custody: "onchain-base",
    tokenized: true,
    isLive: true,
  };
}

/** Assert a promise-returning fn throws (used for the quarantine rejections). */
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
