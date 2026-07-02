/**
 * routes-pnl.test.ts — Sprint 4 acceptance: best-net-EXIT argmax + realized/unrealized P&L.
 *
 * Proves (against sprint-4.md AC):
 *   AC2  NET-EXIT argmax — move-venue chosen when it nets more; relist-in-place chosen when IT
 *        nets more; the losing option is surfaced ("why this exit won").
 *   AC3  P&L math — unrealized = oracle−basis−exitFees; realized = netProceeds−basis; the
 *        portfolio aggregate sums correctly; a stale-oracle mark is DOWN-WEIGHTED (not face).
 *   AC4  Orchestrator route step is LIVE (real quoteExit drives it) and a simulated
 *        acquire→list→sold lifecycle emits BOTH realized + unrealized (zero-network via mocks).
 *   AC5  Honesty — realized vs unrealized distinct; marks labeled with tier/freshness; no
 *        fabricated proceeds.
 */

import { ok, eq, section } from "./assert.ts";
import { selectBestExit } from "../services/routes-plan.ts";
import { PnLBook, markTrustWeight, usdToCents, centsToUsd } from "../lib/pnl.ts";
import { AcquisitionDeskOrchestrator, type LoopResult } from "../services/orchestrator.ts";
import { MockDealsAdapter, MOCK_DEALS } from "../lib/adapters/deals.mock.ts";
import { MockOracleAdapter } from "../lib/adapters/oracle.mock.ts";
import { loadSpendPolicy, type SpendPolicy } from "../lib/policy.ts";
import { InMemoryCustodyStore } from "../lib/custody-store.ts";
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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function exit(p: Partial<ExitQuote> & Pick<ExitQuote, "strategy" | "marketplace" | "netProceedsUsd">): ExitQuote {
  return {
    productId: p.productId ?? "x",
    listAtUsd: p.listAtUsd ?? 100,
    sellFeeUsd: p.sellFeeUsd ?? 0,
    moveVenueUsd: p.moveVenueUsd ?? 0,
    crossCustody: p.crossCustody ?? p.strategy === "move-venue",
    execution: { primary: "onchain", fallbacks: ["human-gate"], requiresHumanGate: false },
    ...p,
  };
}

function installNoNetworkFetch(): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    throw new Error(`NETWORK CALLED (loop leak): ${typeof input === "string" ? input : input.toString()}`);
  }) as unknown as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

/**
 * A marketplace stub that returns CONFIGURABLE exits (to drive the argmax both ways) and,
 * optionally, a CONFIRMED sale (to book realized P&L). Zero-network, no signer.
 */
interface ConfigurableMarketplaceOpts {
  /** exits returned by quoteExit (drives the net-exit argmax). */
  exits: (i: { productId: string; listAtUsd: number }) => ExitQuote[];
  /** when set, confirmSale returns a confirmed SaleReceipt (books realized P&L). */
  sale?: (listingId: string) => SaleReceipt | null;
  /** when true, list() returns a CONFIRMED receipt with a listingId (so confirmSale runs). */
  listConfirmed?: boolean;
}

class ConfigurableMarketplace implements MarketplaceAdapter {
  readonly marketplace = "beezie" as const;
  readonly mode = "mock" as const;
  private readonly opts: ConfigurableMarketplaceOpts;
  constructor(opts: ConfigurableMarketplaceOpts) {
    this.opts = opts;
  }

  async discover(_q: ListingQuery): Promise<MarketplaceListing[]> {
    return [];
  }
  async quoteAcquire(listing: MarketplaceListing): Promise<AcquireQuote> {
    return {
      listing,
      askUsd: listing.askUsd,
      takeFeeUsd: round2(listing.askUsd * 0.08),
      gasUsd: 0.05,
      bridgeUsd: 0,
      shipToCustodyUsd: 0,
      landedCostUsd: round2(listing.askUsd + 0.05),
      custodyDestination: listing.custody,
      crossChain: false,
      settlementRail: "onchain-native",
      execution: { primary: "onchain", fallbacks: ["human-gate"], requiresHumanGate: false },
    };
  }
  async quoteExit(i: { productId: string; listAtUsd: number; currentCustody: CustodyDestination }): Promise<ExitQuote[]> {
    return this.opts.exits({ productId: i.productId, listAtUsd: i.listAtUsd });
  }
  async acquire(i: { quote: AcquireQuote; approvalRef?: string; maxUsd?: number }): Promise<AcquireReceipt> {
    const cap = i.maxUsd;
    if (cap !== undefined && i.quote.landedCostUsd > cap) {
      return { status: "failed", listingId: i.quote.listing.listingId, marketplace: "beezie", custody: "onchain-base", approvalRef: `BLOCKED:over-cap` };
    }
    return {
      status: "staged",
      listingId: i.quote.listing.listingId,
      marketplace: "beezie",
      paidUsd: i.quote.landedCostUsd,
      custody: "onchain-base",
      approvalRef: i.approvalRef,
    };
  }
  async list(i: { exit: ExitQuote; approvalRef?: string }): Promise<ListReceipt> {
    if (this.opts.listConfirmed) {
      return { status: "confirmed", listingId: `listing-${i.exit.productId}`, marketplace: "beezie", listAtUsd: i.exit.listAtUsd, approvalRef: i.approvalRef, listedAt: new Date().toISOString() };
    }
    return { status: "staged", listingId: undefined, marketplace: "beezie", listAtUsd: i.exit.listAtUsd, approvalRef: i.approvalRef };
  }
  async confirmSale(i: { listingId: string; marketplace: Marketplace }): Promise<SaleReceipt | null> {
    return this.opts.sale ? this.opts.sale(i.listingId) : null;
  }
  async initiateCustodyMove(req: CustodyMoveRequest): Promise<CustodyMoveHandle> {
    return { moveId: "m", status: "awaiting-shipment", from: req.from, to: req.to, requiresHumanShip: true };
  }
  async getCustodyMove(_i: { moveId: string }): Promise<CustodyMoveHandle | null> {
    return null;
  }
}

function buyDecide(): (s: Spread) => Promise<BuySkip> {
  return async (s: Spread) => ({
    verdict: s.netSpreadUsd > 0 ? "BUY" : "SKIP",
    reason: "test",
    netSpreadUsd: s.netSpreadUsd,
    flags: ["ok"],
    source: "fallback",
    model: "test",
  });
}

export async function run(): Promise<void> {
  // ───────────────────────────────────────────────────────────────────────────
  section("net-exit argmax — selectBestExit picks the higher-NET venue (both directions)");
  // ───────────────────────────────────────────────────────────────────────────

  // CASE A — MOVE-VENUE WINS: relist-in-place on a high-fee venue nets less than shipping to a
  // low-fee venue even after paying the move cost.
  //   relist-in-place: list $100, 8% fee = $8 → net $92, move $0
  //   move-venue:      list $100, 0% fee = $0 → net $98, move $4  → net $96  (WINS by $4)
  const relistHi = exit({ strategy: "relist-in-place", marketplace: "beezie", listAtUsd: 100, sellFeeUsd: 8, moveVenueUsd: 0, netProceedsUsd: 92 });
  const moveLowFee = exit({ strategy: "move-venue", marketplace: "courtyard", listAtUsd: 100, sellFeeUsd: 0, moveVenueUsd: 4, netProceedsUsd: 96 });
  const bestA = selectBestExit([relistHi, moveLowFee])!;
  ok(!!bestA, "selectBestExit returns a result for case A");
  eq(bestA.chosen.strategy, "move-venue", "CASE A: move-venue is chosen (nets $96 > relist $92)");
  eq(bestA.chosen.marketplace, "courtyard", "CASE A: chosen exit is the courtyard move-venue");
  eq(bestA.netAdvantageUsd, 4, "CASE A: net advantage over the runner-up is $4");
  eq(bestA.losers.length, 1, "CASE A: the losing option is surfaced (relist-in-place)");
  eq(bestA.losers[0].strategy, "relist-in-place", "CASE A: the loser is relist-in-place (why move won is honest)");
  ok(bestA.rationale.includes("move-venue") && bestA.rationale.includes("relist-in-place"), "CASE A: rationale names winner + loser");

  // CASE B — RELIST-IN-PLACE WINS: the move cost outweighs the fee saving.
  //   relist-in-place: list $100, 5% fee = $5 → net $95, move $0  (WINS)
  //   move-venue:      list $100, 0% fee = $0 → net $100, move $12 → net $88
  const relistLowFee = exit({ strategy: "relist-in-place", marketplace: "beezie", listAtUsd: 100, sellFeeUsd: 5, moveVenueUsd: 0, netProceedsUsd: 95 });
  const moveExpensive = exit({ strategy: "move-venue", marketplace: "courtyard", listAtUsd: 100, sellFeeUsd: 0, moveVenueUsd: 12, netProceedsUsd: 88 });
  const bestB = selectBestExit([moveExpensive, relistLowFee])!; // order shouldn't matter
  eq(bestB.chosen.strategy, "relist-in-place", "CASE B: relist-in-place is chosen (nets $95 > move $88)");
  eq(bestB.netAdvantageUsd, 7, "CASE B: net advantage over the move-venue runner-up is $7");
  eq(bestB.losers[0].strategy, "move-venue", "CASE B: the loser is move-venue");

  // TIE-BREAK: equal net → relist-in-place wins (avoids the multi-day physical move).
  const tieRelist = exit({ strategy: "relist-in-place", marketplace: "beezie", netProceedsUsd: 90 });
  const tieMove = exit({ strategy: "move-venue", marketplace: "courtyard", netProceedsUsd: 90 });
  const bestTie = selectBestExit([tieMove, tieRelist])!;
  eq(bestTie.chosen.strategy, "relist-in-place", "TIE: equal net → relist-in-place wins (no physical move)");
  eq(bestTie.netAdvantageUsd, 0, "TIE: net advantage is $0");

  ok(selectBestExit([]) === null, "selectBestExit([]) → null (nothing to sell, honest)");

  // ───────────────────────────────────────────────────────────────────────────
  section("P&L math — markTrustWeight down-weights a stale/thin SUSPECT (P3)");
  // ───────────────────────────────────────────────────────────────────────────
  eq(markTrustWeight("pc_sold", "fresh"), 1.0, "T1 pc_sold fresh → full trust 1.0 (gospel-ish)");
  ok(markTrustWeight("pc_sold_thin", "fresh") < 1.0, "T2 thin fresh is down-weighted (< 1.0)");
  ok(markTrustWeight("pc_last_stale", "stale_hard") < markTrustWeight("pc_sold", "fresh"), "stale_hard T5.8 < fresh T1 trust");
  ok(markTrustWeight("pc_sold", "stale_hard") < 0.5, "even a T1 oracle is heavily down-weighted when stale_hard");

  // cents discipline round-trip
  eq(centsToUsd(usdToCents(31.55)), 31.55, "usdToCents/centsToUsd round-trips $31.55 with no float drift");

  // ───────────────────────────────────────────────────────────────────────────
  section("P&L math — unrealized = oracle−basis−exitFees, realized = netProceeds−basis");
  // ───────────────────────────────────────────────────────────────────────────
  const book = new PnLBook();
  // FRESH T1 position: basis $40, oracle $100, projected exit fee $8 → raw unrealized = $52, full trust.
  book.openPosition({ productId: "p-fresh", grade: "PSA 9", grader: "PSA", costBasisUsd: 40, basisIsLive: false });
  book.markToOracle({
    productId: "p-fresh",
    grade: "PSA 9",
    grader: "PSA",
    mark: { valueUsd: 100, tier: "pc_sold", freshness: "fresh" },
    projectedExitFeesUsd: 8,
  });
  const fresh = book.position({ productId: "p-fresh", grade: "PSA 9", grader: "PSA" })!;
  eq(fresh.unrealizedRawUsd, 52, "fresh: raw unrealized = oracle $100 − basis $40 − exitFee $8 = $52");
  eq(fresh.unrealizedUsd, 52, "fresh T1: booked unrealized = raw $52 (full trust, no down-weight)");
  eq(fresh.markConfidence, 1.0, "fresh T1 mark confidence = 1.0");
  eq(fresh.downWeighted, false, "fresh T1 is NOT down-weighted");
  eq(fresh.realizedUsd, null, "fresh: realized is null (not sold yet) — distinct from unrealized (P7)");

  // STALE position: SAME raw gain, but a stale_hard T5.8 mark is DOWN-WEIGHTED (P3).
  book.openPosition({ productId: "p-stale", grade: "PSA 9", grader: "PSA", costBasisUsd: 40, basisIsLive: false });
  book.markToOracle({
    productId: "p-stale",
    grade: "PSA 9",
    grader: "PSA",
    mark: { valueUsd: 100, tier: "pc_last_stale", freshness: "stale_hard" },
    projectedExitFeesUsd: 8,
  });
  const stale = book.position({ productId: "p-stale", grade: "PSA 9", grader: "PSA" })!;
  eq(stale.unrealizedRawUsd, 52, "stale: raw unrealized is the SAME $52 (the value isn't recomputed)");
  ok(stale.downWeighted === true, "stale: the mark IS flagged down-weighted (P3 — not taken at face)");
  ok(stale.unrealizedUsd! < stale.unrealizedRawUsd!, "stale: BOOKED unrealized < raw (down-weighted toward basis)");
  const expectedStale = round2(52 * markTrustWeight("pc_last_stale", "stale_hard"));
  eq(stale.unrealizedUsd, expectedStale, `stale: booked unrealized = raw $52 × trust ${markTrustWeight("pc_last_stale", "stale_hard")} = $${expectedStale}`);

  // A LOSS is booked in FULL (never softened by the trust weight).
  book.openPosition({ productId: "p-loss", grade: "PSA 9", grader: "PSA", costBasisUsd: 100, basisIsLive: false });
  book.markToOracle({ productId: "p-loss", grade: "PSA 9", grader: "PSA", mark: { valueUsd: 80, tier: "pc_last_stale", freshness: "stale_hard" }, projectedExitFeesUsd: 5 });
  const loss = book.position({ productId: "p-loss", grade: "PSA 9", grader: "PSA" })!;
  eq(loss.unrealizedRawUsd, -25, "loss: raw unrealized = $80 − $100 − $5 = −$25");
  eq(loss.unrealizedUsd, -25, "loss: booked unrealized = full −$25 (downside never softened by trust weight)");

  // REALIZED at sale: book a confirmed sale on the fresh position.
  book.bookRealized({ productId: "p-fresh", grade: "PSA 9", grader: "PSA", fill: { netProceedsUsd: 92, soldAtUsd: 100, saleIsLive: false } });
  const sold = book.position({ productId: "p-fresh", grade: "PSA 9", grader: "PSA" })!;
  eq(sold.status, "sold", "fresh position is now SOLD");
  eq(sold.realizedUsd, 52, "realized = netProceeds $92 − basis $40 = $52");
  eq(sold.unrealizedUsd, null, "once sold, unrealized becomes null (it's now realized cash — distinct, P7)");

  // a null fill (unsold) is a no-op — NEVER fabricates proceeds (P7).
  book.openPosition({ productId: "p-unsold", grade: "PSA 9", grader: "PSA", costBasisUsd: 10, basisIsLive: false });
  book.markToOracle({ productId: "p-unsold", grade: "PSA 9", grader: "PSA", mark: { valueUsd: 30, tier: "pc_sold", freshness: "fresh" }, projectedExitFeesUsd: 2 });
  book.bookRealized({ productId: "p-unsold", grade: "PSA 9", grader: "PSA", fill: null });
  const unsold = book.position({ productId: "p-unsold", grade: "PSA 9", grader: "PSA" })!;
  ok(unsold.status !== "sold", "a null confirmSale leaves the position OPEN/unsold (no fabricated sale, P7)");
  eq(unsold.realizedUsd, null, "unsold: realized stays null");

  // ───────────────────────────────────────────────────────────────────────────
  section("P&L aggregate — portfolio sums realized + unrealized + NAV correctly");
  // ───────────────────────────────────────────────────────────────────────────
  const port = book.portfolio({ cashUsd: 200 });
  // open positions: p-stale, p-loss, p-unsold ; sold: p-fresh
  eq(port.totalRealizedUsd, 52, "Σ realized = $52 (only the sold p-fresh)");
  // Σ booked unrealized of OPEN positions = stale(expectedStale) + loss(−25) + unsold(18)
  const unsoldUnreal = round2(30 - 10 - 2); // 18, fresh T1 full trust
  const expectedTotalUnreal = round2(expectedStale + -25 + unsoldUnreal);
  eq(port.totalUnrealizedUsd, expectedTotalUnreal, `Σ unrealized of open = ${expectedStale} + (−25) + ${unsoldUnreal} = $${expectedTotalUnreal}`);
  eq(port.openCostBasisUsd, 150, "Σ open cost basis = stale 40 + loss 100 + unsold 10 = $150");
  // NAV = cash + Σ mark-to-oracle(open) ; mark-to-oracle(open) = openBasis + bookedUnrealized
  const expectedMark = round2(150 + expectedTotalUnreal);
  eq(port.markToOracleUsd, expectedMark, `Σ mark-to-oracle(open) = openBasis 150 + Σunreal ${expectedTotalUnreal} = $${expectedMark}`);
  eq(port.navUsd, round2(200 + expectedMark), `NAV = cash 200 + mark-to-oracle ${expectedMark} = $${round2(200 + expectedMark)}`);
  ok(port.downWeightedCount >= 1, "portfolio flags ≥1 down-weighted (suspect) mark in the book (honesty)");

  // ───────────────────────────────────────────────────────────────────────────
  section("orchestrator — route step is LIVE + move-venue chosen via real quoteExit");
  // ───────────────────────────────────────────────────────────────────────────
  const policy = loadSpendPolicy();
  // The acquire venue returns BOTH a relist-in-place AND a move-venue exit; move-venue nets more.
  const moveWinsMkt = new ConfigurableMarketplace({
    exits: ({ productId, listAtUsd }) => [
      exit({ productId, strategy: "relist-in-place", marketplace: "beezie", listAtUsd, sellFeeUsd: round2(listAtUsd * 0.08), moveVenueUsd: 0, netProceedsUsd: round2(listAtUsd - listAtUsd * 0.08) }),
      exit({ productId, strategy: "move-venue", marketplace: "courtyard", listAtUsd, sellFeeUsd: 0, moveVenueUsd: 1, netProceedsUsd: round2(listAtUsd - 1) }),
    ],
  });
  const restore = installNoNetworkFetch();
  let res: LoopResult;
  try {
    const orch = new AcquisitionDeskOrchestrator(
      { deals: new MockDealsAdapter({ deals: [MOCK_DEALS[0]] }), oracle: new MockOracleAdapter(), marketplace: moveWinsMkt },
      policy,
      { decide: buyDecide() },
    );
    res = await orch.runLoop();
  } finally {
    restore();
  }
  const good = res.traces.find((t) => t.productId === "mock-good-1")!;
  eq(good.disposition, "acquired", "good card acquired (zero-network)");
  const routeStep = good.steps.find((s) => s.step === "route")!;
  eq(routeStep.label, "live", "AC4: route step is LIVE (a real quoteExit argmax drives it, not a stub)");
  ok(!!good.bestExit, "best-net-exit is attached to the trace");
  eq(good.bestExit?.chosen.strategy, "move-venue", "move-venue chosen (oracle $102: net $101 > relist $93.84)");
  eq(good.bestExit?.losers[0].strategy, "relist-in-place", "the losing relist-in-place option is surfaced (why move won)");
  const exitStep = good.steps.find((s) => s.step === "quote-exit")!;
  ok(exitStep.detail.includes("move-venue") && exitStep.detail.includes("beat"), "quote-exit step shows the chosen exit beating the loser");

  // ───────────────────────────────────────────────────────────────────────────
  section("orchestrator — lifecycle acquire→list→SOLD emits BOTH realized + unrealized");
  // ───────────────────────────────────────────────────────────────────────────
  // A marketplace that confirms the list AND confirms a sale → the position goes to SOLD and
  // books realized P&L; the trace carries a pnl step with realized populated.
  const lifecycleMkt = new ConfigurableMarketplace({
    exits: ({ productId, listAtUsd }) => [
      exit({ productId, strategy: "relist-in-place", marketplace: "beezie", listAtUsd, sellFeeUsd: round2(listAtUsd * 0.08), moveVenueUsd: 0, netProceedsUsd: round2(listAtUsd - listAtUsd * 0.08) }),
    ],
    listConfirmed: true,
    // sell at the oracle ($102), net of the 8% take = $93.84 net proceeds.
    sale: (listingId) => ({ status: "confirmed", soldAtUsd: 102, feeUsd: 8.16, netProceedsUsd: 93.84, txHashOrPayout: `sale:${listingId}`, soldAt: new Date().toISOString() }),
  });
  const restore2 = installNoNetworkFetch();
  let lres: LoopResult;
  try {
    const orch2 = new AcquisitionDeskOrchestrator(
      // Buy on the SAME (tokenized) custody we relist on, so relist-in-place is custody-coherent
      // (no re-route) and the SOLD lifecycle / realized-P&L is what's under test here.
      { deals: new MockDealsAdapter({ deals: [{ ...MOCK_DEALS[0], listingPlatform: "beezie" }] }), oracle: new MockOracleAdapter(), marketplace: lifecycleMkt },
      policy,
      { decide: buyDecide() },
    );
    lres = await orch2.runLoop();
  } finally {
    restore2();
  }
  const lg = lres.traces.find((t) => t.productId === "mock-good-1")!;
  ok(!!lg.pnl, "AC4: a P&L view is attached to the trace");
  eq(lg.pnl?.status, "sold", "lifecycle reached SOLD");
  // basis = landed cost = ask $31.50 + gas $0.05 = $31.55 ; realized = $93.84 − $31.55 = $62.29
  eq(lg.pnl?.costBasisUsd, 31.55, "cost basis = landed cost $31.55 (ask $31.50 + gas $0.05)");
  eq(lg.pnl?.realizedUsd, round2(93.84 - 31.55), `realized = netProceeds $93.84 − basis $31.55 = $${round2(93.84 - 31.55)}`);
  eq(lg.pnl?.unrealizedUsd ?? null, null, "once SOLD, unrealized is null (realized + unrealized are DISTINCT, P7)");
  const pnlStep = lg.steps.find((s) => s.step === "pnl")!;
  ok(!!pnlStep, "AC4: a pnl step is in the trace");
  ok(pnlStep.detail.includes("realized") && pnlStep.detail.includes("$62.29"), "pnl step surfaces the realized number");

  // and the portfolio aggregate reflects the realized sale
  eq(lres.portfolio.totalRealizedUsd, round2(93.84 - 31.55), "portfolio Σ realized reflects the booked sale");

  // ───────────────────────────────────────────────────────────────────────────
  section("orchestrator — HELD (not sold) emits unrealized, realized stays null (P7)");
  // ───────────────────────────────────────────────────────────────────────────
  // The default StubMarketplace path: staged buy + staged list + null sale → position HELD,
  // unrealized populated (mark-to-oracle), realized null. Reuse the move-wins run's good card.
  const heldPnl = good.pnl!;
  ok(heldPnl.status !== "sold", "held position is not sold");
  ok(heldPnl.unrealizedUsd !== null, "AC4: a HELD position emits an unrealized mark-to-oracle");
  eq(heldPnl.realizedUsd, null, "held: realized stays null (no fabricated proceeds, P7)");
  ok(heldPnl.markTier === "pc_sold" && heldPnl.markFreshness === "fresh", "AC5: the mark is labeled with its oracle tier + freshness");
  // mock-good-1: oracle $102, basis $31.55, projected exit fee on the chosen move-venue = $0 fee + $1 move.
  ok(typeof heldPnl.unrealizedUsd === "number" && heldPnl.unrealizedUsd! > 0, "held unrealized is a positive mark-to-oracle gain");

  // ───────────────────────────────────────────────────────────────────────────
  section("orchestrator — cross-custody exit RE-ROUTES, stages the list, books NO sale before arrival");
  // ───────────────────────────────────────────────────────────────────────────
  // Buy on eBay (psa-vault custody) but the chosen exit is tokenized on Beezie (onchain-base):
  // the slab MUST physically ship/tokenize before it can list. Even though this stub would
  // CONFIRM a list AND a sale, the orchestrator must re-route, STAGE the list, and book nothing
  // (the asset hasn't arrived/minted — no fabricated listing or sale, P7).
  const rerouteMkt = new ConfigurableMarketplace({
    exits: ({ productId, listAtUsd }) => [
      exit({ productId, strategy: "move-venue", marketplace: "beezie", listAtUsd, sellFeeUsd: round2(listAtUsd * 0.08), moveVenueUsd: 4, netProceedsUsd: round2(listAtUsd - listAtUsd * 0.08 - 4) }),
    ],
    listConfirmed: true, // would confirm a listing…
    sale: (listingId) => ({ status: "confirmed", soldAtUsd: 102, feeUsd: 8.16, netProceedsUsd: 93.84, txHashOrPayout: `sale:${listingId}`, soldAt: new Date().toISOString() }), // …and a sale
  });
  const restore3 = installNoNetworkFetch();
  let rres: LoopResult;
  try {
    const orch3 = new AcquisitionDeskOrchestrator(
      { deals: new MockDealsAdapter({ deals: [{ ...MOCK_DEALS[0], listingPlatform: "ebay" }] }), oracle: new MockOracleAdapter(), marketplace: rerouteMkt },
      policy,
      { decide: buyDecide() },
    );
    rres = await orch3.runLoop();
  } finally {
    restore3();
  }
  const rg = rres.traces.find((t) => t.productId === "mock-good-1")!;
  const rerouteStep = rg.steps.find((s) => s.step === "reroute");
  ok(!!rerouteStep, "a reroute step is emitted for the cross-custody exit");
  eq(rerouteStep?.label, "spec-only", "the reroute is spec-only (asset in flight, not a live event)");
  ok(!!rg.custodyMove && rg.custodyMove.status === "awaiting-shipment", "the custody-move handle is attached + awaiting shipment");
  ok(rg.custodyMove?.requiresHumanShip === true, "the physical drop-off is human-shipped (no token-bridge)");
  const rListStep = rg.steps.find((s) => s.step === "list")!;
  eq(rListStep.label, "spec-only", "the list is STAGED behind the re-route (not confirmed)");
  ok(rg.listReceipt?.status === "staged" && !rg.listReceipt?.listingId, "list receipt is staged with NO listingId (no fabricated listing)");
  ok((rg.listReceipt?.approvalRef ?? "").includes("PENDING-REROUTE"), "the staged list names the pending re-route");
  ok(rg.pnl?.status !== "sold", "position is NOT sold — the sale-capable stub books nothing before arrival (P7)");
  eq(rg.pnl?.realizedUsd ?? null, null, "realized stays null while the slab is in re-route (no fabricated proceeds)");
  eq(rg.saleReceipt ?? null, null, "no sale receipt — confirmSale never ran on an unlisted asset");

  // ───────────────────────────────────────────────────────────────────────────
  section("orchestrator — cross-run RESUME: persist the move → poll while in-flight → on arrival, advance the staged list to SOLD");
  // ───────────────────────────────────────────────────────────────────────────
  // A SHARED custody store persists the in-flight leg across runs. The same venue ("beezie") is
  // the buy adapter + the exit it re-routes to; the eBay-platform deal forces the custody jump.
  const store = new InMemoryCustodyStore();
  const resumeMkt = new ConfigurableMarketplace({
    exits: ({ productId, listAtUsd }) => [
      exit({ productId, strategy: "move-venue", marketplace: "beezie", listAtUsd, sellFeeUsd: round2(listAtUsd * 0.08), moveVenueUsd: 4, netProceedsUsd: round2(listAtUsd - listAtUsd * 0.08 - 4) }),
    ],
    listConfirmed: true, // on the OTHER side of the move, the list confirms…
    sale: (listingId) => ({ status: "confirmed", soldAtUsd: 102, feeUsd: 8.16, netProceedsUsd: 93.84, txHashOrPayout: `sale:${listingId}`, soldAt: new Date().toISOString() }), // …and sells
  });
  const ebayDeal = { ...MOCK_DEALS[0], listingPlatform: "ebay" };
  const restore4 = installNoNetworkFetch();
  let r1: LoopResult, r1b: LoopResult, r2: LoopResult, legBasis: number, moveId: string;
  try {
    // RUN 1 — the deal is live → buy + initiate the re-route (leg persisted, list staged).
    const orch1 = new AcquisitionDeskOrchestrator(
      { deals: new MockDealsAdapter({ deals: [ebayDeal] }), oracle: new MockOracleAdapter(), marketplace: resumeMkt, custodyStore: store },
      policy,
      { decide: buyDecide() },
    );
    r1 = await orch1.runLoop();
    const open1 = store.listOpen();
    moveId = open1[0]?.moveId;
    legBasis = open1[0]?.costBasisUsd;

    // RUN 1b — the deal is GONE from the feed (it was bought); the move is still in flight → reroute-pending.
    const orch2 = new AcquisitionDeskOrchestrator(
      { deals: new MockDealsAdapter({ deals: [] }), oracle: new MockOracleAdapter(), marketplace: resumeMkt, custodyStore: store },
      policy,
      { decide: buyDecide() },
    );
    r1b = await orch2.runLoop();

    // A REAL arrival is recorded (the vault scan / operator confirms the slab is minted).
    store.recordArrival(moveId, { tokenId: "777" });

    // RUN 2 — empty feed; the resume poll finds the move COMPLETE → advances the staged list → SOLD.
    const orch3 = new AcquisitionDeskOrchestrator(
      { deals: new MockDealsAdapter({ deals: [] }), oracle: new MockOracleAdapter(), marketplace: resumeMkt, custodyStore: store },
      policy,
      { decide: buyDecide() },
    );
    r2 = await orch3.runLoop();
  } finally {
    restore4();
  }

  // RUN 1: the leg persisted + the buy happened.
  ok(!!moveId, "run 1 persisted an in-flight re-route leg to the store");
  eq(store.get(moveId) !== null, true, "the leg is retrievable from the store by moveId");
  ok(r1.traces.some((t) => t.disposition === "acquired" && t.custodyMove), "run 1: the card is acquired + carries a custody-move handle");

  // RUN 1b: still in flight — re-injected, list stays staged, position HELD (not sold), leg still open.
  const pending = r1b.traces.find((t) => t.disposition === "reroute-pending");
  ok(!!pending, "run 1b: the in-flight leg resumes as reroute-pending (polled, re-injected)");
  eq(r1b.summary.reroutePending, 1, "run 1b summary counts 1 reroute-pending leg");
  eq(pending?.pnl?.status !== "sold", true, "run 1b: the in-flight position is HELD, not sold");
  eq(pending?.pnl?.realizedUsd ?? null, null, "run 1b: realized stays null while in flight (P7)");
  ok(typeof pending?.pnl?.unrealizedUsd === "number", "run 1b: the held position re-marks to oracle from the persisted basis");
  eq(store.listOpen().length, 0, "store has no open legs AFTER run 2 resolved it");

  // RUN 2: the move completed → the staged list advanced to LIVE on the exit venue → SOLD, realized booked.
  const relisted = r2.traces.find((t) => t.disposition === "relisted");
  ok(!!relisted, "run 2: the completed leg advances to a relisted disposition");
  eq(r2.summary.relisted, 1, "run 2 summary counts 1 relisted leg");
  eq(relisted?.listReceipt?.status, "confirmed", "run 2: the staged list is advanced to a CONFIRMED listing on the exit venue");
  eq(relisted?.pnl?.status, "sold", "run 2: the position reaches SOLD after arrival");
  eq(relisted?.pnl?.costBasisUsd, legBasis, "run 2: the position re-opened from the SAME persisted basis (no re-derived basis)");
  eq(relisted?.pnl?.realizedUsd, round2(93.84 - legBasis), `run 2: realized = netProceeds $93.84 − persisted basis $${legBasis}`);
  const resumedRerouteStep = relisted?.steps.find((s) => s.step === "reroute");
  eq(resumedRerouteStep?.label, "live", "run 2: the reroute step is LIVE once the move completed (arrival is real, not fabricated)");
}

// allow direct invocation
if (import.meta.url === `file://${process.argv[1]}`) {
  await run();
  const { exitWithSummary } = await import("./assert.ts");
  exitWithSummary();
}
