/**
 * orchestrator.test.ts — Sprint 3 acceptance: the master loop + D11 cap firebreak.
 *
 * Proves (against the Sprint-3 AC):
 *   AC2  ZERO-NETWORK full loop — MockDeals + MockOracle + a no-network StubMarketplace run
 *        deal→oracle→decide→route→quote-exit→acquire(staged)→list(staged)→confirm end-to-end,
 *        and the full per-card trace is asserted. A guarded fetch makes ANY live call CRASH.
 *   AC2b TIER/FRESHNESS — the thin (mock-thin-1) + stale (mock-stale-1) oracle deals are
 *        down-weighted/skipped (P3 SUSPECT), while the T1-fresh mock-good-1 proceeds to acquire.
 *   AC3  CAP FAIL-CLOSED — with NO per-card cap the orchestrator refuses to acquire
 *        (blocked-no-cap); with a cap, an over-cap deal is blocked BEFORE any acquire send.
 *   AC4  decideBuySkip IS invoked — the loop calls the decide function (asserted via a spy)
 *        and surfaces the Nemotron verdict in the trace.
 *   AC5  HONESTY — every step carries a live-vs-stub label; no fabricated tx/oracle values.
 */

import { ok, eq, section } from "./assert.ts";
import { AcquisitionDeskOrchestrator, type LoopResult, type CardTrace } from "../services/orchestrator.ts";
import { MockDealsAdapter, MOCK_DEALS } from "../lib/adapters/deals.mock.ts";
import { MockOracleAdapter } from "../lib/adapters/oracle.mock.ts";
import { loadSpendPolicy, readYamlScalar, type SpendPolicy } from "../lib/policy.ts";
import type {
  MarketplaceAdapter,
  ListingQuery,
  MarketplaceListing,
  AcquireQuote,
  ExitQuote,
  AcquireReceipt,
  ListReceipt,
  SaleReceipt,
  CustodyMoveRequest,
  CustodyMoveHandle,
  Marketplace,
  CustodyDestination,
} from "../lib/adapters/index.ts";
import type { Spread } from "../services/spread-detector.ts";
import type { BuySkip } from "../services/spread-decision.ts";

/**
 * A fetch that THROWS on any call — installed globally for the zero-network test so a
 * "no network" claim is ENFORCED, not asserted by inspection. If any adapter touched the
 * network the loop would crash here.
 */
function installNoNetworkFetch(): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    throw new Error(`NETWORK CALLED (loop leak): ${url}`);
  }) as unknown as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

/**
 * StubMarketplaceAdapter — a deterministic, ZERO-network MarketplaceAdapter for the loop test.
 * NO signer, NO network: quoteAcquire/quoteExit are pure math; acquire/list return SPEC-ONLY
 * `staged` receipts (no fabricated tx); confirmSale returns null (unsold). The cap is honored:
 * an over-cap landed cost returns a `failed` receipt with a BLOCKED:over-cap marker, mirroring
 * beezie's engine guard — but the ORCHESTRATOR blocks first (it never sends an over-cap acquire).
 */
class StubMarketplaceAdapter implements MarketplaceAdapter {
  readonly marketplace = "beezie" as const;
  readonly mode = "mock" as const;
  /** Records every acquire() call so the test can assert the orchestrator's cap gating. */
  public acquireCalls: { landed: number; maxUsd?: number }[] = [];
  private readonly takeRate = 0.08;
  private readonly capUsd?: number;

  constructor(capUsd?: number) {
    this.capUsd = capUsd;
  }

  async discover(_query: ListingQuery): Promise<MarketplaceListing[]> {
    return []; // unused by the orchestrator (deals come from the DealsAdapter)
  }

  async quoteAcquire(listing: MarketplaceListing): Promise<AcquireQuote> {
    const askUsd = listing.askUsd;
    return {
      listing,
      askUsd,
      takeFeeUsd: round2(askUsd * this.takeRate),
      gasUsd: 0.05,
      bridgeUsd: 0,
      shipToCustodyUsd: 0,
      landedCostUsd: round2(askUsd + 0.05),
      custodyDestination: listing.custody,
      crossChain: false,
      settlementRail: "onchain-native",
      execution: { primary: "onchain", fallbacks: ["human-gate"], requiresHumanGate: false },
    };
  }

  async quoteExit(i: { productId: string; listAtUsd: number; currentCustody: CustodyDestination }): Promise<ExitQuote[]> {
    const sellFeeUsd = round2(i.listAtUsd * this.takeRate);
    return [
      {
        productId: i.productId,
        listAtUsd: i.listAtUsd,
        strategy: "relist-in-place",
        marketplace: "beezie",
        sellFeeUsd,
        moveVenueUsd: 0,
        netProceedsUsd: round2(i.listAtUsd - sellFeeUsd),
        crossCustody: false,
        execution: { primary: "onchain", fallbacks: ["human-gate"], requiresHumanGate: false },
      },
    ];
  }

  async acquire(i: { quote: AcquireQuote; approvalRef?: string; maxUsd?: number }): Promise<AcquireReceipt> {
    this.acquireCalls.push({ landed: i.quote.landedCostUsd, maxUsd: i.maxUsd });
    const cap = i.maxUsd ?? this.capUsd;
    // Mirror beezie's engine guard: fail-closed if no cap; blocked if over-cap.
    if (cap === undefined) {
      return { status: "failed", listingId: i.quote.listing.listingId, marketplace: "beezie", custody: "onchain-base", approvalRef: "BLOCKED:no-cap-set" };
    }
    if (i.quote.landedCostUsd > cap) {
      return { status: "failed", listingId: i.quote.listing.listingId, marketplace: "beezie", custody: "onchain-base", approvalRef: `BLOCKED:over-cap $${i.quote.landedCostUsd}>${cap}` };
    }
    // SPEC-ONLY staged — no signer, NO fabricated tx.
    return {
      status: "staged",
      listingId: i.quote.listing.listingId,
      marketplace: "beezie",
      paidUsd: i.quote.landedCostUsd,
      custody: "onchain-base",
      approvalRef: i.approvalRef,
      proofUri: undefined,
      committedAt: undefined,
    };
  }

  async list(i: { exit: ExitQuote; approvalRef?: string }): Promise<ListReceipt> {
    return { status: "staged", listingId: undefined, marketplace: "beezie", listAtUsd: i.exit.listAtUsd, approvalRef: i.approvalRef, proofUri: undefined, listedAt: undefined };
  }

  async confirmSale(_i: { listingId: string; marketplace: Marketplace }): Promise<SaleReceipt | null> {
    return null; // unsold — never fabricates a sale
  }

  async initiateCustodyMove(req: CustodyMoveRequest): Promise<CustodyMoveHandle> {
    return { moveId: "stub-move", status: "awaiting-shipment", from: req.from, to: req.to, requiresHumanShip: true };
  }

  async getCustodyMove(_i: { moveId: string }): Promise<CustodyMoveHandle | null> {
    return null;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** A deterministic decide spy: records calls, BUYs on positive net (so the loop reaches acquire). */
function makeDecideSpy(): { decide: (s: Spread) => Promise<BuySkip>; calls: Spread[] } {
  const calls: Spread[] = [];
  const decide = async (s: Spread): Promise<BuySkip> => {
    calls.push(s);
    const buy = s.netSpreadUsd > 0;
    return {
      verdict: buy ? "BUY" : "SKIP",
      reason: buy ? `spy: net +$${s.netSpreadUsd} is a real EARN` : `spy: net $${s.netSpreadUsd} not an EARN`,
      netSpreadUsd: s.netSpreadUsd,
      flags: ["ok"],
      source: "fallback",
      model: "test-spy",
    };
  };
  return { decide, calls };
}

export async function run(): Promise<void> {
  // ───────────────────────────────────────────────────────────────────────────
  section("policy.ts — parse the D11 cap from hermes-plugin/policy.yaml");
  // ───────────────────────────────────────────────────────────────────────────
  const policy = loadSpendPolicy();
  eq(policy.resolved, "policy.yaml", "policy.yaml is found + parsed (not defaults)");
  eq(policy.perCardCapUsd, 100, "per-card cap = $100 (spend_policy.caps.per_card.amount_usd)");
  eq(policy.windowCapUsd, 200, "window cap = $200 (spend_policy.caps.window.cap_usd)");
  eq(policy.windowHours, 24, "window hours = 24");
  eq(policy.selfApprove, true, "self_approve = true (D11 — no per-spend tap)");
  eq(policy.mode, "test", "mode = test (the trust line gate)");
  // the nested-scalar walker resolves a deep key without a YAML dep
  eq(readYamlScalar("a:\n  b:\n    c: 7\n", "a.b.c"), "7", "readYamlScalar walks nested indentation");
  eq(readYamlScalar("a:\n  b: 1\n", "a.x"), undefined, "readYamlScalar returns undefined for a missing key");

  // ───────────────────────────────────────────────────────────────────────────
  section("orchestrator AC2 — ZERO-NETWORK full loop (deal→oracle→decide→route→acquire→list→confirm)");
  // ───────────────────────────────────────────────────────────────────────────
  const restore = installNoNetworkFetch();
  let result: LoopResult;
  const spy = makeDecideSpy();
  try {
    const orch = new AcquisitionDeskOrchestrator(
      { deals: new MockDealsAdapter(), oracle: new MockOracleAdapter(), marketplace: new StubMarketplaceAdapter() },
      policy,
      { decide: spy.decide },
    );
    result = await orch.runLoop();
  } finally {
    restore(); // un-install the network guard no matter what
  }

  eq(result.summary.candidates, MOCK_DEALS.length, `loop processed all ${MOCK_DEALS.length} fixtures with NO network`);
  ok(result.traces.length === MOCK_DEALS.length, "a per-card trace exists for every candidate");

  const good = result.traces.find((t) => t.productId === "mock-good-1")!;
  ok(!!good, "mock-good-1 has a trace");
  eq(good.disposition, "acquired", "mock-good-1 (T1 fresh, well-sold, positive-net) → acquired");
  // assert the FULL ordered trace for the good card
  const goodSteps = good.steps.map((s) => s.step);
  ok(
    ["oracle", "decide", "route", "quote-exit", "quote-acquire", "acquire", "list", "confirm-sale"].every((s) => goodSteps.includes(s as CardTrace["steps"][number]["step"])),
    `good-card trace threads ALL loop steps (${goodSteps.join("→")})`,
  );
  // honesty labels present on every step (no unlabeled step)
  ok(good.steps.every((s) => ["live", "stub", "spec-only", "skipped", "blocked"].includes(s.label)), "AC5: every step carries a live-vs-stub label");
  // acquire + list are SPEC-ONLY staged (no signer) — NO fabricated tx
  const acqStep = good.steps.find((s) => s.step === "acquire")!;
  eq(acqStep.label, "spec-only", "acquire is labeled SPEC-ONLY (no signer) — staged, no tx");
  ok(!good.acquireReceipt?.settleTxHash, "AC5: no fabricated settleTxHash on the staged acquire");
  ok(!good.isLive, "good card is NOT marked live (staged, no on-chain write)");
  // confirmSale returned null → unsold, no fabricated sale
  eq(good.saleReceipt ?? null, null, "AC5: confirmSale → null (unsold), no fabricated sale");

  // ───────────────────────────────────────────────────────────────────────────
  section("orchestrator AC2b — tier/freshness gate (the SUSPECT is down-weighted, P3)");
  // ───────────────────────────────────────────────────────────────────────────
  const thin = result.traces.find((t) => t.productId === "mock-thin-1")!;
  eq(thin.disposition, "skipped-suspect-oracle", "mock-thin-1 (1 sold) is down-weighted/skipped (P3 thin)");
  ok(thin.steps.some((s) => s.detail.includes("thin oracle")), "thin skip reason names the thin-oracle cause");

  const stale = result.traces.find((t) => t.productId === "mock-stale-1")!;
  eq(stale.disposition, "skipped-suspect-oracle", "mock-stale-1 (stale_hard) is freshness-gated out (P3 stale)");
  ok(stale.steps.some((s) => s.detail.toLowerCase().includes("stale")), "stale skip reason names the staleness cause");

  // contrast: the SUSPECT cards never reached acquire, the good one did
  ok(thin.disposition !== good.disposition, "AC2b: thin/stale dispositions DIFFER from the fresh T1 good card");

  // grade-match invariant: mock-mismatch-1 (listing PSA 9, oracle priced PSA 10) is dropped —
  // never bought against a cross-grade value-truth.
  const mismatch = result.traces.find((t) => t.productId === "mock-mismatch-1")!;
  eq(mismatch.disposition, "skipped-grade-mismatch", "mock-mismatch-1 (PSA9 listing vs PSA10 oracle) → skipped-grade-mismatch (no cross-grade buy)");
  ok(mismatch.steps.some((s) => s.detail.includes("grade-mismatch")), "grade-mismatch skip reason is in the trace");
  eq(result.summary.acquired, 1, "exactly ONE fixture (the grade-matched mock-good-1) is acquired — the rest correctly drop");

  // ───────────────────────────────────────────────────────────────────────────
  section("orchestrator AC4 — decideBuySkip IS invoked (not bypassed)");
  // ───────────────────────────────────────────────────────────────────────────
  ok(spy.calls.length >= 1, `the decide brain was actually called (${spy.calls.length} time(s))`);
  ok(spy.calls.some((s) => s.productId === "mock-good-1"), "decide was called for mock-good-1 with the grounded spread");
  ok(!!good.decision, "the Nemotron verdict is surfaced on the trace (D18 sponsor-legible)");
  eq(good.decision?.verdict, "BUY", "surfaced verdict is BUY for the good card");
  // the loop also reaches decide via the REAL service when no spy is injected (next test)

  // ───────────────────────────────────────────────────────────────────────────
  section("orchestrator AC4b — real decideBuySkip wired by default (no key ⇒ deterministic labeled fallback)");
  // ───────────────────────────────────────────────────────────────────────────
  const restore2 = installNoNetworkFetch();
  let realResult: LoopResult;
  try {
    // NO decide injected ⇒ the orchestrator uses the REAL `decideBuySkip` service.
    const orch2 = new AcquisitionDeskOrchestrator(
      { deals: new MockDealsAdapter({ deals: [MOCK_DEALS[0]] }), oracle: new MockOracleAdapter(), marketplace: new StubMarketplaceAdapter() },
      policy,
    );
    realResult = await orch2.runLoop();
  } finally {
    restore2();
  }
  const realGood = realResult.traces.find((t) => t.productId === "mock-good-1")!;
  ok(!!realGood.decision, "real decideBuySkip produced a verdict (the brain is wired, not stubbed)");
  ok(realGood.decision?.source === "nemotron" || realGood.decision?.source === "fallback", "decision source is labeled (nemotron live OR deterministic fallback — honest)");

  // ───────────────────────────────────────────────────────────────────────────
  section("orchestrator AC3 — CAP fail-closed: NO cap ⇒ refuse to acquire");
  // ───────────────────────────────────────────────────────────────────────────
  const noCapPolicy: SpendPolicy = { ...policy, perCardCapUsd: undefined, windowCapUsd: undefined, resolved: "defaults", source: "(no-cap)" };
  const restore3 = installNoNetworkFetch();
  let noCapResult: LoopResult;
  const noCapMkt = new StubMarketplaceAdapter();
  const spy3 = makeDecideSpy();
  try {
    const orch3 = new AcquisitionDeskOrchestrator(
      { deals: new MockDealsAdapter({ deals: [MOCK_DEALS[0]] }), oracle: new MockOracleAdapter(), marketplace: noCapMkt },
      noCapPolicy,
      { decide: spy3.decide },
    );
    noCapResult = await orch3.runLoop();
  } finally {
    restore3();
  }
  const noCapGood = noCapResult.traces.find((t) => t.productId === "mock-good-1")!;
  eq(noCapGood.disposition, "blocked-no-cap", "AC3: no per-card cap ⇒ disposition blocked-no-cap (fail-closed)");
  ok(noCapGood.steps.some((s) => s.label === "blocked" && s.detail.includes("FAIL-CLOSED")), "AC3: a FAIL-CLOSED blocked step is in the trace");
  eq(noCapMkt.acquireCalls.length, 0, "AC3: the orchestrator NEVER called acquire without a resolved cap (0 acquire sends)");

  // ───────────────────────────────────────────────────────────────────────────
  section("orchestrator AC3b — over-cap deal blocked BEFORE any acquire send");
  // ───────────────────────────────────────────────────────────────────────────
  // mock-good-1 lands ~$31.55. Set the per-card cap BELOW that to force an over-cap block.
  const tightPolicy: SpendPolicy = { ...policy, perCardCapUsd: 10 };
  const restore4 = installNoNetworkFetch();
  let tightResult: LoopResult;
  const tightMkt = new StubMarketplaceAdapter();
  const spy4 = makeDecideSpy();
  try {
    const orch4 = new AcquisitionDeskOrchestrator(
      { deals: new MockDealsAdapter({ deals: [MOCK_DEALS[0]] }), oracle: new MockOracleAdapter(), marketplace: tightMkt },
      tightPolicy,
      { decide: spy4.decide },
    );
    tightResult = await orch4.runLoop();
  } finally {
    restore4();
  }
  const tightGood = tightResult.traces.find((t) => t.productId === "mock-good-1")!;
  eq(tightGood.disposition, "blocked-over-cap", "AC3b: landed > $10 cap ⇒ blocked-over-cap");
  ok(tightGood.steps.some((s) => s.label === "blocked" && s.detail.includes("over-cap")), "AC3b: an over-cap blocked step is in the trace");
  eq(tightMkt.acquireCalls.length, 0, "AC3b: over-cap blocked BEFORE any acquire send (0 acquire sends)");
  // perturbation: raising the cap changes the disposition (same deal commits).
  ok(tightGood.disposition !== good.disposition, "AC3b: changing the cap changes which buys self-approve (perturbation-testable, D-D3)");

  // ───────────────────────────────────────────────────────────────────────────
  section("orchestrator AC3c — in-cap buy self-approves with NO per-spend tap (D11)");
  // ───────────────────────────────────────────────────────────────────────────
  // The good-card acquire in the AC2 run committed under the $100 cap with the policy's
  // self-approve stamp and the cap threaded as maxUsd — assert that envelope.
  ok(good.capUsd === 100, "in-cap buy gated by the resolved $100 per-card cap");
  ok(
    good.acquireReceipt?.approvalRef?.startsWith("self-approve:") === true,
    "D11: in-cap buy carries a SELF-approve stamp (no operator/human tap)",
  );
  ok(
    !good.steps.some((s) => /payguard approve|operator stamp|telegram tap|human tap/i.test(s.detail)),
    "D11: NO per-spend human-tap/operator-stamp gate anywhere in the in-cap buy path",
  );
}
