/**
 * vault-accumulator.test.ts — the vault BUY-MAX accumulator + its D11 cap firebreak (Build Step 2).
 *
 * Proves the money loop is SAFE (Guardrail A): a funded vault accumulates as many copies as its
 * DEPOSIT and the D11 window allow, and can NEVER over-commit its capital — across a collection
 * basket AND across ticks. Every assertion runs ZERO-NETWORK against the REAL orchestrator
 * (a fetch that throws is installed) driven by the agent's pure `runVaultAccumulator` sizer.
 *
 *   AC-A1  BOUND ENVELOPE — the effective window cap = min(policy window, live deposit); a small
 *          deposit binds the cap below the policy window (never authorize more than the vault holds).
 *   AC-A2  BUY-MAX UNDER CAP — with a $50 deposit and unlimited cheap copies, the accumulator
 *          approves as many as fit, then FREEZES at the window (blocked-window-budget). The
 *          cumulative committed spend NEVER exceeds min(window, deposit). ← the required over-spend block.
 *   AC-A3  CROSS-TICK SEED — a second tick seeded with the first tick's spend sees the prior fills
 *          and approves nothing more (the window is already full) — no re-authorizing the window.
 *   AC-A4  COLLECTION BASKET — two products under one vault SHARE one D11 window; the basket total
 *          never breaches the shared envelope.
 *   AC-A5  FAIL-CLOSED — with NO per-card cap the accumulator approves nothing (0 committed).
 *   AC-A6  boundWindowCapUsd unit table.
 */

import { ok, eq, section } from "./assert.ts";
import {
  runVaultAccumulator,
  boundWindowCapUsd,
  type RunProduct,
  type AccumulatorPolicy,
} from "../../../slabclaw-vaults/agent/src/services/accumulator.ts";
import { AcquisitionDeskOrchestrator, type LoopResult } from "../services/orchestrator.ts";
import type {
  DealsAdapter,
  DealQuery,
  DealRecord,
  OracleAdapter,
  OracleInputs,
  OracleRecord,
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
import type { SpendPolicy } from "../lib/policy.ts";
import type { Spread } from "../services/spread-detector.ts";
import type { BuySkip } from "../services/spread-decision.ts";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** A fetch that THROWS on any call — ENFORCES the zero-network claim (crashes on any leak). */
function installNoNetworkFetch(): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    throw new Error(`NETWORK CALLED (accumulator leak): ${url}`);
  }) as unknown as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

/**
 * A deterministic deal source that yields `count` identical, grade-matched, under-oracle copies of
 * ONE product at a fixed ask — the "many copies of a thin card" the accumulator corners. Distinct
 * listingIds so each is a real separate candidate.
 */
class RepeatingDealsAdapter implements DealsAdapter {
  readonly mode = "mock" as const;
  private readonly productId: string;
  private readonly count: number;
  private readonly askUsd: number;
  private readonly grade: string;
  constructor(productId: string, count: number, askUsd: number, grade: string) {
    this.productId = productId;
    this.count = count;
    this.askUsd = askUsd;
    this.grade = grade;
  }
  async getDeals(_query: DealQuery = {}): Promise<DealRecord[]> {
    const out: DealRecord[] = [];
    for (let i = 0; i < this.count; i++) {
      out.push({
        cardId: this.productId,
        id: `${this.productId}-copy-${i}`,
        name: `Accumulator Target ${this.productId}`,
        set: "Test Set",
        listingPlatform: "beezie",
        listingPrice: this.askUsd,
        listingGrade: this.grade,
        listingUrl: `https://example.test/${this.productId}/${i}`,
        grader: "PSA",
        grade: this.grade,
        spreadGrade: this.grade,
        stale: false,
      });
    }
    return out;
  }
}

/** A confident, fresh, well-sold, grade-matched value-truth for the accumulated product (T1). */
class GoodOracleAdapter implements OracleAdapter {
  readonly mode = "mock" as const;
  private readonly valueUsd: number;
  constructor(valueUsd: number) {
    this.valueUsd = valueUsd;
  }
  async getDeals(_productId?: string): Promise<OracleRecord[]> {
    return [];
  }
  async getOracleInputs(i: { productId: string; grade: string; grader: string }): Promise<OracleInputs | null> {
    return {
      productId: i.productId,
      grade: i.grade || "9",
      grader: i.grader || "PSA",
      oracleValueUsd: this.valueUsd,
      oracleSource: "pc_sold", // T1 — passes the suspect gate
      oracleConfidence: 0.9,
      oracleSoldCount: 5, // >= minSoldCount (3) — not thin
      graderMatched: true,
      freshness: "fresh",
      oracleUrl: "https://example.test/oracle",
    };
  }
}

/**
 * StubMarketplaceAdapter — deterministic, ZERO-network. quoteAcquire is pure math (landed = ask +
 * gas); acquire() is NEVER reached in prodMode (approved-pending returns first). Mirrors the
 * orchestrator-test stub so the accumulator drives the REAL loop.
 */
class StubMarketplaceAdapter implements MarketplaceAdapter {
  readonly marketplace = "beezie" as const;
  readonly mode = "mock" as const;
  public acquireCalls = 0;
  private readonly takeRate = 0.08;

  async discover(_query: ListingQuery): Promise<MarketplaceListing[]> {
    return [];
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
    this.acquireCalls++; // MUST stay 0 in prodMode — a broadcast attempt from the tick loop
    return { status: "failed", listingId: i.quote.listing.listingId, marketplace: "beezie", custody: "onchain-base", approvalRef: "BLOCKED:prodMode-should-never-acquire" };
  }
  async list(i: { exit: ExitQuote; approvalRef?: string }): Promise<ListReceipt> {
    return { status: "staged", listingId: undefined, marketplace: "beezie", listAtUsd: i.exit.listAtUsd, approvalRef: i.approvalRef, proofUri: undefined, listedAt: undefined };
  }
  async confirmSale(_i: { listingId: string; marketplace: Marketplace }): Promise<SaleReceipt | null> {
    return null;
  }
  async initiateCustodyMove(req: CustodyMoveRequest): Promise<CustodyMoveHandle> {
    return { moveId: "stub-move", status: "awaiting-shipment", from: req.from, to: req.to, requiresHumanShip: true };
  }
  async getCustodyMove(_i: { moveId: string }): Promise<CustodyMoveHandle | null> {
    return null;
  }
}

/** A deterministic decide that BUYs any positive-net spread (so the loop reaches the cap gate). */
function buyPositiveNet(): (s: Spread) => Promise<BuySkip> {
  return async (s: Spread): Promise<BuySkip> => {
    const buy = s.netSpreadUsd > 0;
    return {
      verdict: buy ? "BUY" : "SKIP",
      reason: buy ? `net +$${s.netSpreadUsd}` : `net $${s.netSpreadUsd}`,
      netSpreadUsd: s.netSpreadUsd,
      flags: ["ok"],
      source: "fallback",
      model: "test-spy",
    };
  };
}

/** A base test SpendPolicy: per-card $100, window $200 (mirrors policy.yaml), self-approve. */
function testPolicy(overrides: Partial<SpendPolicy> = {}): SpendPolicy {
  return {
    perCardCapUsd: 100,
    windowCapUsd: 200,
    windowHours: 24,
    selfApprove: true,
    mode: "test",
    source: "(test)",
    resolved: "policy.yaml",
    ...overrides,
  };
}

/**
 * Build the accumulator's `runProduct` backed by the REAL orchestrator over controlled fixtures.
 * This is the EXACT wiring engine-bridge.ts uses in prodMode: prodMode + countApprovedTowardWindow
 * + seed + bound window. `sharedMkt` lets a test assert acquire() was never called across products.
 */
function makeRunProduct(opts: {
  copiesPerProduct: number;
  askUsd: number;
  oracleValueUsd: number;
  perCardCapUsd?: number;
  sharedMkt: StubMarketplaceAdapter;
}): RunProduct {
  return async (args) => {
    const deals = new RepeatingDealsAdapter(args.productId, opts.copiesPerProduct, opts.askUsd, String(args.grade));
    const oracle = new GoodOracleAdapter(opts.oracleValueUsd);
    const policy: SpendPolicy = testPolicy({ perCardCapUsd: opts.perCardCapUsd, windowCapUsd: args.windowCapUsd });
    const orch = new AcquisitionDeskOrchestrator(
      { deals, oracle, marketplace: opts.sharedMkt },
      policy,
      {
        decide: buyPositiveNet(),
        prodMode: true,
        countApprovedTowardWindow: true,
        seedWindowSpentUsd: args.seedWindowSpentUsd,
        maxCandidatePriceUsd: args.maxCandidatePriceUsd,
      },
    );
    const res: LoopResult = await orch.runLoop({ productId: args.productId, grade: String(args.grade), maxAskUsd: args.perCardCapUsd });
    const frozen = res.traces.some((t) => t.disposition === "blocked-window-budget");
    return {
      candidates: res.summary.candidates,
      approvedPending: res.summary.approvedPending ?? 0,
      acquired: res.summary.acquired,
      blocked: res.summary.blocked,
      endWindowSpentUsd: res.summary.windowSpentUsd,
      frozen,
    };
  };
}

export async function run(): Promise<void> {
  const policyBudget: AccumulatorPolicy = { perCardCapUsd: 100, windowCapUsd: 200 };
  const LANDED = round2(20 + 0.05); // ask $20 + $0.05 gas = $20.05 landed per copy

  // ───────────────────────────────────────────────────────────────────────────
  section("AC-A1 — the D11 window is BOUND to the live deposit (min(policy window, deposit))");
  // ───────────────────────────────────────────────────────────────────────────
  const restore1 = installNoNetworkFetch();
  let smallDeposit: Awaited<ReturnType<typeof runVaultAccumulator>>;
  const mkt1 = new StubMarketplaceAdapter();
  try {
    smallDeposit = await runVaultAccumulator(
      { productIds: ["thin-1"], targetGrade: 9, deployableCashUsd: 50 },
      policyBudget,
      makeRunProduct({ copiesPerProduct: 20, askUsd: 20, oracleValueUsd: 60, perCardCapUsd: 100, sharedMkt: mkt1 }),
    );
  } finally {
    restore1();
  }
  eq(smallDeposit.windowCapUsd, 50, "a $50 deposit binds the window cap to $50 (below the $200 policy window)");
  ok(smallDeposit.endWindowSpentUsd <= 50, `cumulative committed $${smallDeposit.endWindowSpentUsd} never exceeds the $50 deposit-bound cap`);
  eq(mkt1.acquireCalls, 0, "prodMode: the tick loop NEVER called acquire() (no broadcast/spend)");

  // ───────────────────────────────────────────────────────────────────────────
  section("AC-A2 — BUY-MAX then FREEZE: the over-spend attempt is blocked at the window (D11)");
  // ───────────────────────────────────────────────────────────────────────────
  // 20 copies × $20.05 landed = $401 if uncapped; the $50-bound window must freeze it at 2 copies.
  ok(smallDeposit.approvedPending === 2, `approved exactly ${smallDeposit.approvedPending} copy(ies) that fit under $50 (2 × $${LANDED} = $${round2(2 * LANDED)})`);
  eq(smallDeposit.committedThisRunUsd, round2(2 * LANDED), `committed $${round2(2 * LANDED)} — the max that fits under the deposit-bound window`);
  ok(smallDeposit.frozen, "the D11 window FROZE new spend once the envelope was reached (blocked-window-budget fired)");
  ok(smallDeposit.blocked >= 1, "the copies past the freeze were BLOCKED (never over-committed)");
  // perturbation: raising the deposit lifts the cap and approves more (cap-safety is deposit-driven)
  const restore1b = installNoNetworkFetch();
  let bigDeposit: Awaited<ReturnType<typeof runVaultAccumulator>>;
  const mkt1b = new StubMarketplaceAdapter();
  try {
    bigDeposit = await runVaultAccumulator(
      { productIds: ["thin-1"], targetGrade: 9, deployableCashUsd: 500 },
      policyBudget,
      makeRunProduct({ copiesPerProduct: 20, askUsd: 20, oracleValueUsd: 60, perCardCapUsd: 100, sharedMkt: mkt1b }),
    );
  } finally {
    restore1b();
  }
  eq(bigDeposit.windowCapUsd, 200, "a $500 deposit is capped by the $200 policy window (min binds the other way)");
  ok(bigDeposit.endWindowSpentUsd <= 200, `cumulative committed $${bigDeposit.endWindowSpentUsd} never exceeds the $200 policy window`);
  ok(bigDeposit.approvedPending > smallDeposit.approvedPending, "a larger deposit approves MORE copies (perturbation-testable, D-D3) — but still bounded by the policy window");

  // ───────────────────────────────────────────────────────────────────────────
  section("AC-A3 — CROSS-TICK seed: a second tick reflects prior fills (no re-authorizing the window)");
  // ───────────────────────────────────────────────────────────────────────────
  const restore2 = installNoNetworkFetch();
  let tick2: Awaited<ReturnType<typeof runVaultAccumulator>>;
  const mkt2 = new StubMarketplaceAdapter();
  try {
    // Tick 2 is seeded with tick-1's committed spend (as a cron accumulator would read its ledger).
    tick2 = await runVaultAccumulator(
      { productIds: ["thin-1"], targetGrade: 9, deployableCashUsd: 50, seedWindowSpentUsd: smallDeposit.endWindowSpentUsd },
      policyBudget,
      makeRunProduct({ copiesPerProduct: 20, askUsd: 20, oracleValueUsd: 60, perCardCapUsd: 100, sharedMkt: mkt2 }),
    );
  } finally {
    restore2();
  }
  eq(tick2.seedWindowSpentUsd, smallDeposit.endWindowSpentUsd, "tick 2 seeds from tick 1's committed spend");
  eq(tick2.approvedPending, 0, "tick 2 approves NOTHING more — the window is already full from tick 1 (no re-authorization)");
  ok(tick2.endWindowSpentUsd <= 50, `cumulative across BOTH ticks $${tick2.endWindowSpentUsd} still never exceeds the $50 deposit-bound cap`);
  ok(tick2.frozen, "tick 2 is frozen at the window from the first candidate (the seed carried the prior spend)");

  // ───────────────────────────────────────────────────────────────────────────
  section("AC-A4 — COLLECTION basket: two products share ONE global D11 window");
  // ───────────────────────────────────────────────────────────────────────────
  const restore3 = installNoNetworkFetch();
  let basket: Awaited<ReturnType<typeof runVaultAccumulator>>;
  const mkt3 = new StubMarketplaceAdapter();
  try {
    basket = await runVaultAccumulator(
      { productIds: ["thin-1", "thin-2"], targetGrade: 9, deployableCashUsd: 50 },
      policyBudget,
      makeRunProduct({ copiesPerProduct: 20, askUsd: 20, oracleValueUsd: 60, perCardCapUsd: 100, sharedMkt: mkt3 }),
    );
  } finally {
    restore3();
  }
  eq(basket.perProduct.length, 2, "the basket ran BOTH products under one vault");
  ok(basket.endWindowSpentUsd <= 50, `the BASKET total $${basket.endWindowSpentUsd} never breaches the ONE shared $50 window`);
  eq(basket.approvedPending, 2, "the basket approved 2 copies TOTAL across both products (shared envelope, not $50 each)");
  const p2 = basket.perProduct.find((p) => p.productId === "thin-2")!;
  eq(p2.approvedPending, 0, "product 2 approved 0 — product 1 already consumed the shared window (basket cap-safety)");
  eq(mkt3.acquireCalls, 0, "prodMode across the whole basket: acquire() never called (no broadcast)");

  // ───────────────────────────────────────────────────────────────────────────
  section("AC-A5 — FAIL-CLOSED: no per-card cap ⇒ the accumulator approves nothing");
  // ───────────────────────────────────────────────────────────────────────────
  const restore4 = installNoNetworkFetch();
  let noCap: Awaited<ReturnType<typeof runVaultAccumulator>>;
  const mkt4 = new StubMarketplaceAdapter();
  try {
    noCap = await runVaultAccumulator(
      { productIds: ["thin-1"], targetGrade: 9, deployableCashUsd: 50 },
      { perCardCapUsd: undefined, windowCapUsd: 200 }, // no per-card cap resolved
      makeRunProduct({ copiesPerProduct: 20, askUsd: 20, oracleValueUsd: 60, perCardCapUsd: undefined, sharedMkt: mkt4 }),
    );
  } finally {
    restore4();
  }
  eq(noCap.approvedPending, 0, "AC-A5: no per-card cap ⇒ 0 approvals (fail-closed — the orchestrator blocked-no-cap)");
  eq(noCap.committedThisRunUsd, 0, "AC-A5: $0 committed with no cap (never buys against an unresolved firebreak)");
  eq(mkt4.acquireCalls, 0, "AC-A5: acquire() never called with no cap");

  // ───────────────────────────────────────────────────────────────────────────
  section("AC-A6 — boundWindowCapUsd unit table (the deposit-bound envelope math)");
  // ───────────────────────────────────────────────────────────────────────────
  eq(boundWindowCapUsd({ windowCapUsd: 200 }, 50), 50, "min($200 window, $50 deposit) = $50");
  eq(boundWindowCapUsd({ windowCapUsd: 200 }, 1000), 200, "min($200 window, $1000 deposit) = $200");
  eq(boundWindowCapUsd({ windowCapUsd: undefined }, 75), 75, "no policy window ⇒ bound purely by the $75 deposit");
  eq(boundWindowCapUsd({ windowCapUsd: 200 }, -10), 0, "a negative/zero deposit ⇒ $0 cap (never negative)");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await run();
  const { exitWithSummary } = await import("./assert.ts");
  exitWithSummary();
}
