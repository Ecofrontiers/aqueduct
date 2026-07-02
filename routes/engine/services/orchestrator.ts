/**
 * orchestrator.ts — the master autonomous-arb loop (Sprint 3, closes AUDIT #1).
 *
 * Threads the EXISTING pieces end-to-end, ALL adapters INJECTED (constructor), so swapping
 * the mocks runs the whole loop with ZERO network:
 *
 *   DealsAdapter.getDeals()                       (the under-oracle deal feed — RING-2 seam)
 *     → OracleAdapter.getOracleInputs()           (tier/freshness READ — the SUSPECT, P3)
 *         · down-weight low-tier / stale; freshness-gate                  (P3)
 *     → decideBuySkip()                           (the REAL Nemotron brain — actually called)
 *     → computePolicy() (routes-plan)             (cheapest acquisition route)
 *       + MarketplaceAdapter.quoteExit()          (relist-in-place exit surfaced)
 *     → MarketplaceAdapter.quoteAcquire()/acquire (BUY — policy cap threaded; FAIL-CLOSED no cap)
 *     → MarketplaceAdapter.list()                 (LIST at oracle)
 *     → MarketplaceAdapter.confirmSale()          (poll for a realized sale; null while unsold)
 *
 * D11 (the ONLY firebreak on an in-cap tokenized buy): the per-card cap from policy.yaml is
 * threaded into acquire()'s `maxUsd`. The orchestrator NEVER calls acquire without a resolved
 * cap — if no cap resolves, it refuses (fail-closed) BEFORE any acquire send, matching beezie's
 * own guard. Self-approve under cap, NO per-spend tap (policy.selfApprove). Over-cap → blocked.
 *
 * HONESTY (P1/P7): every step carries a live-vs-stub label. The oracle value is READ, never
 * recomputed. No fabricated tx/oracle values — the trace reflects exactly what the injected
 * adapters returned (a no-signer marketplace adapter yields `staged` SPEC-ONLY receipts).
 *
 * ZERO contract dependency. Pure orchestration over the injected RING-2 adapters.
 */
import type {
  OracleAdapter,
  OracleInputs as OracleAdapterInputs,
  DealsAdapter,
  DealRecord,
  DealQuery,
  MarketplaceAdapter,
  MarketplaceListing,
  AcquireQuote,
  ExitQuote,
  AcquireReceipt,
  ListReceipt,
  SaleReceipt,
  CustodyDestination,
  CustodyMoveHandle,
  Marketplace,
} from "../lib/adapters/index.ts";
import type { NemotronAdapter } from "../lib/adapters/index.ts";
import { decideBuySkip, type BuySkip } from "./spread-decision.ts";
import type { Spread } from "./spread-detector.ts";
import { computeFees, DEFAULT_FEES, round2, type FeeModel } from "./fees.ts";
import { computePolicy, selectBestExit, type OracleInputs as PlanOracleInputs, type AcquisitionPolicy, type ObjectiveType, type BestExit } from "./routes-plan.ts";
import type { SpendPolicy } from "../lib/policy.ts";
import { PnLBook, type PositionPnL, type PortfolioPnL } from "../lib/pnl.ts";
import type { CustodyMoveStore, RerouteLeg } from "../lib/custody-store.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Trace types — the structured per-step output (Sprint 5 web + narration consume this)
// ─────────────────────────────────────────────────────────────────────────────

/** Honesty label (P7) carried on every step of the trace. */
export type StepLabel = "live" | "stub" | "spec-only" | "skipped" | "blocked";

export interface TraceStep {
  step:
    | "oracle"
    | "decide"
    | "route"
    | "quote-exit"
    | "quote-acquire"
    | "acquire"
    | "reroute"
    | "list"
    | "confirm-sale"
    | "pnl";
  label: StepLabel;
  detail: string;
  data?: unknown;
}

/** The terminal disposition of one candidate through the loop. */
export type Disposition =
  | "skipped-no-oracle" // oracle had no value for the product×grade
  | "skipped-grade-mismatch" // oracle priced a DIFFERENT grade than the listing (no cross-grade buy)
  | "skipped-suspect-oracle" // tier/freshness gate down-weighted it (P3)
  | "skipped-nemotron" // the brain said SKIP
  | "blocked-no-cap" // FAIL-CLOSED: no per-card cap resolved
  | "blocked-over-cap" // landed cost > the per-card cap
  | "blocked-window-budget" // would breach the rolling window envelope
  | "approved-pending" // PROD: in-cap, the agent decided BUY, but real-money execution is NOT simulated — awaits the human-gated run
  | "acquired" // acquire returned a (live or staged) receipt — proceeded to list (incl. an initiated re-route)
  | "reroute-pending" // a RESUMED leg: the cross-custody move is still in flight; the list stays staged (re-inject)
  | "relisted" // a RESUMED leg: the move completed (arrived/minted) → the staged list advanced to the exit venue
  | "error"; // an adapter threw (handled, not crashed)

/** The full per-card trace one deal produces walking the loop. */
export interface CardTrace {
  productId: string;
  name: string;
  grade: string;
  grader: string;
  disposition: Disposition;
  /** Honest live-vs-stub flag for the whole card (true once a real on-chain write lands). */
  isLive: boolean;
  steps: TraceStep[];
  /** The Nemotron verdict (surfaced — D18; sponsor-legible rationale). */
  decision?: BuySkip;
  /** The chosen acquisition policy (routes-plan), when the brain said BUY. */
  policy?: AcquisitionPolicy;
  /** The acquisition + exit + sale receipts, when reached. */
  acquireReceipt?: AcquireReceipt;
  exitQuote?: ExitQuote;
  /** The best-net-exit argmax (chosen + losing options + why-this-won) — Sprint 4 D-E. */
  bestExit?: BestExit;
  /** The physical cross-custodian re-route handle, when the chosen exit needs a custody move
   *  (e.g. eBay buy → ship to a vault → tokenized exit). Async/multi-day; polled, never assumed. */
  custodyMove?: CustodyMoveHandle;
  listReceipt?: ListReceipt;
  saleReceipt?: SaleReceipt | null;
  /** Per-position P&L (realized + unrealized, mark-to-oracle) — Sprint 4 D-F. */
  pnl?: PositionPnL;
  /** The resolved per-card cap that gated the buy (USD) — provenance of the firebreak. */
  capUsd?: number;
  /** Landed cost the cap was checked against (USD). */
  landedCostUsd?: number;
}

/** The loop's overall result. */
export interface LoopResult {
  /** Honesty: how the policy resolved + the cap in force. */
  policy: { perCardCapUsd?: number; windowCapUsd?: number; selfApprove: boolean; mode: string; resolved: string };
  /** Per-card traces (every candidate, including skips/blocks — full auditability). */
  traces: CardTrace[];
  /**
   * The portfolio P&L roll-up (Sprint 4 D-F): Σ realized + Σ unrealized + NAV. cashUsd is
   * the un-deployed window budget (windowCap − windowSpent) the Earnings tab reads. Realized
   * and unrealized are DISTINCT (P7) — never summed into one "profit".
   */
  portfolio: PortfolioPnL;
  /** Counts for a quick read. */
  summary: {
    candidates: number;
    acquired: number;
    /** PROD: in-cap cards the agent approved to buy but did NOT execute (awaiting the gated run). */
    approvedPending?: number;
    skipped: number;
    blocked: number;
    errored: number;
    /** RESUMED re-route legs advanced to a live/staged list on the exit venue this run. */
    relisted: number;
    /** RESUMED re-route legs still in flight (polled, re-injected, list still staged). */
    reroutePending: number;
    windowSpentUsd: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Orchestrator
// ─────────────────────────────────────────────────────────────────────────────

/** The adapters the orchestrator threads. A subset of SponsorAdapters — only what the loop uses. */
export interface OrchestratorAdapters {
  deals: DealsAdapter;
  oracle: OracleAdapter;
  marketplace: MarketplaceAdapter;
  /**
   * Optional ALTERNATE exit venues (Sprint 4 D-E move-venue axis). The orchestrator quotes
   * the best NET exit by comparing the acquire venue's relist-in-place exit against each of
   * these venues' exits (e.g. ship/bridge to OpenSea/Courtyard). When absent, only the
   * acquire venue is considered (relist-in-place). Each must implement quoteExit.
   */
  exitVenues?: MarketplaceAdapter[];
  /** Optional: the Nemotron adapter. When absent, the loop uses the real `decideBuySkip` service. */
  nemotron?: NemotronAdapter;
  /**
   * Optional persistence for in-flight cross-custodian RE-ROUTES (ROUTES §5.1). When present, an
   * initiated re-route is recorded here, and each runLoop FIRST polls open legs — advancing a
   * completed move's staged list to the exit venue (re-opening the position from the persisted
   * basis). Absent ⇒ a re-route is initiated + staged in-run only (no cross-run continuation).
   */
  custodyStore?: CustodyMoveStore;
}

export interface OrchestratorOptions {
  /** Fee model for the spread arithmetic (deterministic; the LLM never recomputes it). */
  fees?: FeeModel;
  /** Phantom-guard min sold-count (default 3 — matches the detector). */
  minSoldCount?: number;
  /**
   * Inject the decide function (tests). Defaults to the REAL `decideBuySkip` (Nemotron, with a
   * deterministic labeled fallback when no key) — never a silent stub. When an `adapters.nemotron`
   * is supplied, it is preferred (its `decideBuy` is the real adapter call).
   */
  decide?: (s: Spread) => Promise<BuySkip>;
  /** Routes-plan objective (default 'min-cost' — cheapest acquisition, Sprint 3 scope). */
  objective?: ObjectiveType;
  /** Cap the number of candidates processed (safety bound). */
  maxCandidates?: number;
  /**
   * Venues we BUY on but never SELL on (so their relist-in-place exit is NOT offered to the
   * exit argmax). Encodes "buy on eBay, re-route to a vault, exit tokenized" as CONFIG, not a
   * hardcode: set `["ebay"]` for the SlabClaw demo. Default empty (every venue can relist).
   */
  excludeRelistInPlaceFor?: Marketplace[];
  /**
   * PROD MODE (real-money instance). When true, the loop does the full real ANALYSIS (oracle,
   * decide, route) but NEVER stages/simulates an acquisition: an in-cap approved card is marked
   * `approved-pending` (decided to buy, awaiting the human-gated real-money run) and the position
   * is NOT opened. So "bought"/held/P&L stay 0 until a REAL onchain settlement lands — no
   * fabricated activity on the real-money surface (P5/P7). Default false (the test-mode demo).
   */
  prodMode?: boolean;
  /**
   * PROD: only CONSIDER candidates whose listing price ≤ this (USD). Keeps the small real-money
   * budget on cards it can actually buy SEVERAL of (make the money work) — the loop never even
   * "looks at" cards above the ceiling. Undefined ⇒ no price ceiling (the demo).
   */
  maxCandidatePriceUsd?: number;
  /**
   * ACCUMULATOR: seed the rolling-window spent total for THIS loop (USD). A persistent vault
   * accumulator threads prior in-window spend here — across ticks (a cron pass reflects the
   * vault's already-acquired ledger) AND across a collection basket (each product's loop is
   * seeded with the cumulative spend of the products before it). The window firebreak then
   * gates against seed + this-run spend, so a multi-tick / multi-product accumulator can NEVER
   * re-authorize the full window each pass. Default 0 (a fresh window). See vault-accumulator.ts.
   */
  seedWindowSpentUsd?: number;
  /**
   * ACCUMULATOR: when true, a prodMode `approved-pending` card COUNTS its landed cost toward the
   * rolling window (so the accumulator only APPROVES as many copies as the window/deposit envelope
   * allows, then freezes at the cap). Default false — on the real-money desk an approved-pending
   * is a human-gated PROPOSAL that does NOT consume the window (P5/P7 semantics unchanged when
   * unset). The vault accumulator sets this true so its buy-MAX can never over-commit the budget.
   */
  countApprovedTowardWindow?: boolean;
}

/**
 * Map a freshness/tier oracle record into a SUSPECT verdict (P3). A stale or low-tier value is
 * down-weighted: the loop SKIPS it rather than treat the number as gospel. Returns a reason when
 * the candidate should be dropped (null = passes the oracle trust gate).
 */
function suspectReason(o: OracleAdapterInputs, minSoldCount: number): string | null {
  // Freshness gate — a stale value is never gospel (P3 freshness-gated).
  if (o.freshness === "stale_hard") return `stale_hard oracle (>365d) on ${o.oracleSource}`;
  if (o.freshness === "stale") return `stale oracle (>30d) on ${o.oracleSource}`;
  // Tier gate — thin grader-matched comps (1-2 sold) are the SUSPECT; down-weight out.
  if (typeof o.oracleSoldCount === "number" && o.oracleSoldCount < minSoldCount) {
    return `thin oracle (${o.oracleSoldCount} sold < ${minSoldCount}) on ${o.oracleSource}`;
  }
  // The weakest fallback tiers are not a confident value-truth to buy against.
  if (o.oracleSource === "ebay_active" || o.oracleSource === "manual") {
    return `weak tier (${o.oracleSource}) — not a confident value-truth`;
  }
  return null;
}

/** Map an OracleAdapter confidence (0..1) to the detector's 'high'|'medium'|'low' band. */
function confidenceBand(c: number): "high" | "medium" | "low" {
  if (c >= 0.75) return "high";
  if (c >= 0.45) return "medium";
  return "low";
}

/** Tokenized-venue check (matches the detector's set) for the spread `form`. */
const TOKENIZED_VENUES = new Set(["beezie", "courtyard", "phygitals", "collector-crypt", "alt", "fanatics"]);

/**
 * Build the grounded `Spread` for the Nemotron brain from a deal + its oracle READ. The
 * arithmetic (net = B − A − fees) is deterministic here; the brain only judges BUY/SKIP (§5.2).
 * The oracle value is the one READ from the OracleAdapter — never recomputed (P3).
 */
function buildSpread(d: DealRecord, o: OracleAdapterInputs, fees: FeeModel): Spread {
  const A = d.listingPrice as number;
  const B = o.oracleValueUsd; // READ from the oracle adapter — the value-truth (P3)
  const feesUsd = computeFees(A, B, fees);
  const buyVenue = d.listingPlatform ?? "unknown";
  return {
    productId: o.productId,
    name: d.name ?? "?",
    set: d.set ?? "?",
    grade: o.grade,
    buyVenue,
    askUsd: A,
    sellVenue: o.oracleSource,
    gradeMatchedValueUsd: B,
    feesUsd,
    grossSpreadUsd: round2(B - A),
    netSpreadUsd: round2(B - A - feesUsd),
    form: TOKENIZED_VENUES.has(buyVenue) ? "tokenized" : "slabbed",
    confidence: round2(o.oracleConfidence),
    oracleSource: o.oracleSource,
    oracleConfidence: confidenceBand(o.oracleConfidence),
    soldCount: o.oracleSoldCount ?? 0,
    listingUrl: d.listingUrl ?? null,
    oracleUrl: o.oracleUrl ?? null,
  };
}

/**
 * Build the routes-plan OracleInputs from the deal + oracle READ. Sprint-3 scope is the
 * cheapest acquisition (min-cost → slabbed-hold), so we anchor the slabbed ask at the listing
 * price for the target grade and seed the psa10/psa9 anchors from the oracle value. (Full
 * grade-EV branching is the Sprint-4 net-exit/P&L axis — not recomputed here.)
 */
function buildPlanInputs(d: DealRecord, o: OracleAdapterInputs): PlanOracleInputs {
  const targetGrade = parseGradeNumber(o.grade);
  const ask = d.listingPrice as number;
  const oracleVal = o.oracleValueUsd;
  return {
    productId: o.productId,
    psa10: oracleVal, // anchor for buildPricesByGrade (the value-truth, READ)
    psa9: round2(oracleVal * 0.6), // conservative lower anchor (deterministic, not recomputed value)
    slabbedAskByGrade: { [targetGrade]: ask },
    rawAskUsd: round2(ask * 0.8), // raw is cheaper than slabbed (input to the grade route)
    rawCondition: "NM",
    targetGrade,
    grader: planGrader(o.grader),
    gradingTier: "economy",
    sellFeePercent: 8, // Beezie/OpenSea ~8% take
  };
}

/**
 * Grade-match invariant: the listing grade and the oracle-priced grade must agree on BOTH the
 * numeric grade AND the grader prefix when both carry one. Tolerant of formatting
 * ("PSA 9" vs "9" vs "psa9"). A blank/unknown grade on either side does NOT pass (fail-safe).
 */
function gradesMatch(listingGrade: string, oracleGrade: string): boolean {
  const a = String(listingGrade).trim().toLowerCase();
  const b = String(oracleGrade).trim().toLowerCase();
  if (!a || !b) return false;
  const na = a.match(/(\d+(?:\.\d+)?)/)?.[1];
  const nb = b.match(/(\d+(?:\.\d+)?)/)?.[1];
  if (!na || !nb) return false;
  if (na !== nb) return false;
  // if both name a grader (alpha prefix), they must agree too
  const ga = a.match(/[a-z]+/)?.[0];
  const gb = b.match(/[a-z]+/)?.[0];
  if (ga && gb && ga !== gb) return false;
  return true;
}

function parseGradeNumber(grade: string): number {
  const m = String(grade).match(/(\d+(?:\.\d+)?)/);
  const n = m ? Number(m[1]) : 10;
  return Number.isFinite(n) ? n : 10;
}

function planGrader(g: string): "PSA" | "BGS" | "CGC" {
  const up = String(g).toUpperCase();
  if (up === "BGS") return "BGS";
  if (up === "CGC") return "CGC";
  return "PSA";
}

/** Map a marketplace listing platform string to a Marketplace + custody destination. */
function custodyFor(platform: string): { marketplace: Marketplace; custody: CustodyDestination } {
  const p = platform.toLowerCase();
  if (p === "beezie") return { marketplace: "beezie", custody: "onchain-base" };
  if (p === "courtyard") return { marketplace: "courtyard", custody: "onchain-polygon" };
  if (p === "ebay") return { marketplace: "ebay", custody: "psa-vault" };
  if (p === "cardmarket") return { marketplace: "cardmarket", custody: "self-custody" };
  return { marketplace: "opensea", custody: "onchain-base" };
}

export class AcquisitionDeskOrchestrator {
  private readonly adapters: OrchestratorAdapters;
  private readonly policy: SpendPolicy;
  private readonly fees: FeeModel;
  private readonly minSoldCount: number;
  private readonly decide: (s: Spread) => Promise<BuySkip>;
  private readonly objective: ObjectiveType;
  private readonly maxCandidates: number;
  private readonly excludeRelistInPlaceFor: Set<Marketplace>;
  private readonly prodMode: boolean;
  private readonly maxCandidatePriceUsd: number | undefined;
  private readonly seedWindowSpentUsd: number;
  private readonly countApprovedTowardWindow: boolean;

  constructor(adapters: OrchestratorAdapters, policy: SpendPolicy, opts: OrchestratorOptions = {}) {
    this.adapters = adapters;
    this.policy = policy;
    this.fees = opts.fees ?? DEFAULT_FEES;
    this.minSoldCount = opts.minSoldCount ?? 3;
    this.objective = opts.objective ?? "min-cost";
    this.maxCandidates = opts.maxCandidates ?? 100;
    this.excludeRelistInPlaceFor = new Set(opts.excludeRelistInPlaceFor ?? []);
    this.prodMode = opts.prodMode ?? false;
    this.maxCandidatePriceUsd = opts.maxCandidatePriceUsd;
    this.seedWindowSpentUsd = opts.seedWindowSpentUsd ?? 0;
    this.countApprovedTowardWindow = opts.countApprovedTowardWindow ?? false;
    // Prefer an injected decide; else an injected Nemotron adapter's decideBuy; else the real service.
    if (opts.decide) {
      this.decide = opts.decide;
    } else if (adapters.nemotron) {
      const nem = adapters.nemotron;
      this.decide = async (s: Spread): Promise<BuySkip> => {
        const v = await nem.decideBuy(
          {
            productName: s.name,
            grade: s.grade,
            grader: planGrader(s.grade.replace(/\d.*/, "") || "PSA"),
            askPriceUsd: s.askUsd,
            oracleValueUsd: s.gradeMatchedValueUsd,
            spreadPct: s.gradeMatchedValueUsd > 0 ? round2((s.netSpreadUsd / s.gradeMatchedValueUsd) * 100) : 0,
            popCount: s.soldCount,
            liquidityNote: `${s.oracleSource} / ${s.oracleConfidence} conf`,
          },
          { reason: true },
        );
        return {
          verdict: v.verdict,
          reason: v.rationale,
          netSpreadUsd: s.netSpreadUsd, // grounded, never recomputed by the LLM
          flags: ["ok"],
          source: "nemotron",
          model: "nemotron-adapter",
        };
      };
    } else {
      // The REAL brain (Nemotron NIM; deterministic labeled fallback when no key — never a silent stub).
      this.decide = (s: Spread) => decideBuySkip(s);
    }
  }

  /**
   * Resolve the adapter that trades on a given venue — the BUY marketplace or one of the
   * alternate exitVenues. This is what lets a cross-venue exit LIST on the correct adapter
   * (e.g. a Beezie/Courtyard exit after an eBay buy) instead of the buy adapter. Falls back to
   * the buy marketplace when no exit venue matches (relist-in-place is always on the buy venue).
   */
  private adapterFor(marketplace: Marketplace): MarketplaceAdapter {
    if (this.adapters.marketplace.marketplace === marketplace) return this.adapters.marketplace;
    for (const v of this.adapters.exitVenues ?? []) {
      if (v.marketplace === marketplace) return v;
    }
    return this.adapters.marketplace;
  }

  /**
   * resumeReroutes — the CROSS-RUN continuation of in-flight re-routes (ROUTES §5.1).
   *
   * For every open leg in the custody store: poll the move (prefer a live tracker via the buy
   * adapter's getCustodyMove; else the store's last-known status), and
   *  • STILL IN FLIGHT → re-inject {goal, status, checkpoint}, re-open the held position from the
   *    persisted basis (so the portfolio reflects the in-transit slab), keep the leg open.
   *  • COMPLETED (arrived + minted; recorded by a REAL arrival, never fabricated) → advance the
   *    staged list to the EXIT venue (live with a signer, else honestly staged), poll a sale, book
   *    realized/held P&L from the persisted basis, and RESOLVE the leg.
   * Each leg emits its own CardTrace so the run is fully auditable. Returns [] when no store is wired.
   */
  private async resumeReroutes(book: PnLBook): Promise<CardTrace[]> {
    const store = this.adapters.custodyStore;
    if (!store) return [];
    const out: CardTrace[] = [];

    for (const leg of store.listOpen()) {
      const trace: CardTrace = {
        productId: leg.productId,
        name: leg.name ?? leg.productId,
        grade: leg.grade,
        grader: leg.grader,
        disposition: "reroute-pending",
        isLive: false,
        steps: [],
      };
      const mark = { valueUsd: leg.oracleValueUsd, tier: leg.oracleTier as never, freshness: leg.oracleFreshness as never, oracleUrl: leg.oracleUrl };

      // Refresh the move status from a live tracker when one exists (the buy adapter owns the move).
      let handle: CustodyMoveHandle | null = null;
      try {
        handle = await this.adapters.marketplace.getCustodyMove({ moveId: leg.moveId });
      } catch {
        handle = null;
      }
      const status = handle?.status ?? leg.status;
      if (handle && handle.status !== leg.status) {
        store.update(leg.moveId, { status: handle.status, trackingNumber: handle.trackingNumber, nextCheckpoint: handle.nextCheckpoint });
      }

      // Re-open the held position from the PERSISTED basis (same cost basis on both sides).
      book.openPosition({
        productId: leg.productId,
        name: leg.name,
        grade: leg.grade,
        grader: leg.grader,
        costBasisUsd: leg.costBasisUsd,
        acquiredOn: leg.exitMarketplace,
        basisIsLive: leg.basisIsLive,
      });

      if (status !== "completed") {
        // Still in flight — re-inject state, keep waiting (no fabricated arrival).
        trace.custodyMove =
          handle ?? {
            moveId: leg.moveId,
            status,
            from: leg.fromCustody,
            to: leg.toCustody,
            requiresHumanShip: true,
            trackingNumber: leg.trackingNumber,
            nextCheckpoint: leg.nextCheckpoint,
          };
        trace.steps.push({
          step: "reroute",
          label: "spec-only",
          detail: `RE-ROUTE ${leg.fromCustody} → ${leg.toCustody} still ${status} — list stays staged (re-inject goal/checkpoint; move ${leg.moveId})`,
          data: { moveId: leg.moveId, status, exitVenue: leg.exitMarketplace },
        });
        book.markToOracle({ productId: leg.productId, grade: leg.grade, grader: leg.grader, mark, projectedExitFeesUsd: leg.projectedExitFeesUsd, listed: false });
        const pos = book.position({ productId: leg.productId, grade: leg.grade, grader: leg.grader });
        if (pos) trace.pnl = pos;
        out.push(trace);
        continue;
      }

      // ── COMPLETED — the slab has arrived + minted at the exit custody. Advance the staged list. ──
      trace.disposition = "relisted";
      trace.steps.push({
        step: "reroute",
        label: "live",
        detail: `RE-ROUTE complete: arrived at ${leg.toCustody}${leg.tokenId ? ` (tokenId ${leg.tokenId})` : ""} — advancing the staged ${leg.exitMarketplace} list`,
        data: { moveId: leg.moveId, status, tokenId: leg.tokenId, exitVenue: leg.exitMarketplace },
      });

      const exitAdapter = this.adapterFor(leg.exitMarketplace);
      const resumedExit: ExitQuote = {
        productId: leg.productId,
        listAtUsd: leg.listAtUsd,
        strategy: "move-venue",
        marketplace: leg.exitMarketplace,
        sellFeeUsd: leg.projectedExitFeesUsd,
        moveVenueUsd: 0, // the move cost was already counted at initiation
        netProceedsUsd: round2(leg.listAtUsd - leg.projectedExitFeesUsd),
        crossCustody: false, // the asset is NOW at the exit custody
        execution: { primary: "api", fallbacks: ["human-gate"], requiresHumanGate: true, gateReason: "list-at-oracle after re-route arrival" },
      };
      const listReceipt = await exitAdapter.list({
        exit: resumedExit,
        approvalRef: this.policy.selfApprove ? `self-approve:relist-after-reroute:${leg.productId}` : undefined,
      });
      trace.listReceipt = listReceipt;
      const listLive = listReceipt.status === "confirmed" && !!listReceipt.listingId;
      book.markToOracle({ productId: leg.productId, grade: leg.grade, grader: leg.grader, mark, projectedExitFeesUsd: leg.projectedExitFeesUsd, listed: true });
      trace.steps.push({
        step: "list",
        label: listLive ? "live" : "spec-only",
        detail: listLive
          ? `LIST confirmed @ $${leg.listAtUsd} on ${leg.exitMarketplace} after re-route — listing ${listReceipt.listingId}`
          : `LIST staged on ${leg.exitMarketplace} after re-route (no signer wired). list-at $${leg.listAtUsd}`,
        data: { status: listReceipt.status, listingId: listReceipt.listingId, listAtUsd: leg.listAtUsd },
      });

      if (listReceipt.listingId) {
        const sale = await exitAdapter.confirmSale({ listingId: listReceipt.listingId, marketplace: leg.exitMarketplace });
        trace.saleReceipt = sale;
        const saleIsLive = sale?.status === "confirmed" || (!!sale && !!sale.txHashOrPayout);
        book.bookRealized({
          productId: leg.productId,
          grade: leg.grade,
          grader: leg.grader,
          fill: sale ? { netProceedsUsd: sale.netProceedsUsd, soldAtUsd: sale.soldAtUsd, saleIsLive } : null,
        });
        trace.steps.push({
          step: "confirm-sale",
          label: sale ? "live" : "skipped",
          detail: sale ? `SOLD $${sale.soldAtUsd} → net $${sale.netProceedsUsd}` : "unsold (confirmSale → null; no fabricated sale, P7)",
          data: sale ?? null,
        });
        trace.isLive = listLive && saleIsLive;
      } else {
        trace.saleReceipt = null;
        trace.steps.push({ step: "confirm-sale", label: "skipped", detail: "no published listingId yet (staged list) — nothing to poll" });
      }

      const pos = book.position({ productId: leg.productId, grade: leg.grade, grader: leg.grader });
      if (pos) trace.pnl = pos;
      // The staged list is advanced — close the leg (it leaves listOpen()).
      store.resolve(leg.moveId, listReceipt.listingId);
      out.push(trace);
    }
    return out;
  }

  /**
   * runLoop — drive the full §0 loop over the deal feed. Returns a structured result with a
   * per-card trace. Zero-network when injected with mock adapters + a no-signer marketplace.
   */
  async runLoop(query: DealQuery = {}): Promise<LoopResult> {
    const traces: CardTrace[] = [];
    // Seed the rolling window from prior in-window spend (accumulator: cross-tick + cross-product).
    // The window firebreak (line ~829) gates against this seed + this-run spend so a persistent
    // accumulator never re-authorizes the full window each pass. Default 0 (a fresh window).
    let windowSpentUsd = this.seedWindowSpentUsd;
    // The positions book (Sprint 4): cost basis at acquire → mark-to-oracle → realized at sale.
    const book = new PnLBook();

    // ── 0. RESUME — poll any in-flight re-routes FIRST and advance completed ones to a live list
    //    on the exit venue (cross-run continuation, ROUTES §5.1). [] when no store is wired. ──
    const resumedTraces = await this.resumeReroutes(book);
    traces.push(...resumedTraces);

    const deals = await this.adapters.deals.getDeals(query);
    // PROD: never even LOOK at cards above the price ceiling — keep the small real-money budget on
    // cards it can actually buy SEVERAL of (make the money work). The demo has no ceiling.
    const affordable =
      typeof this.maxCandidatePriceUsd === "number"
        ? deals.filter((d) => typeof d.listingPrice === "number" && (d.listingPrice as number) <= this.maxCandidatePriceUsd!)
        : deals;
    const candidates = affordable.slice(0, this.maxCandidates);

    for (const d of candidates) {
      const productId = d.cardId ?? d.id ?? "unknown";
      const grade = d.listingGrade ?? d.spreadGrade ?? "";
      const grader = d.grader ?? "PSA";
      const trace: CardTrace = {
        productId,
        name: d.name ?? "?",
        grade,
        grader,
        disposition: "error",
        isLive: false,
        steps: [],
      };

      try {
        await this.processCard(d, productId, grade, grader, trace, book, () => windowSpentUsd, (n) => {
          windowSpentUsd = round2(windowSpentUsd + n);
        });
      } catch (err) {
        trace.disposition = "error";
        trace.steps.push({
          step: "acquire",
          label: "blocked",
          detail: `adapter error (handled, not crashed): ${(err as Error).message}`,
        });
      }
      traces.push(trace);
    }

    const acquired = traces.filter((t) => t.disposition === "acquired").length;
    const approvedPending = traces.filter((t) => t.disposition === "approved-pending").length;
    const blocked = traces.filter((t) => t.disposition.startsWith("blocked")).length;
    const errored = traces.filter((t) => t.disposition === "error").length;
    const relisted = traces.filter((t) => t.disposition === "relisted").length;
    const reroutePending = traces.filter((t) => t.disposition === "reroute-pending").length;
    const skipped = traces.length - acquired - approvedPending - blocked - errored - relisted - reroutePending;

    // Free cash = the un-deployed window budget (windowCap − spent). When the window is
    // unbounded, free cash is 0 (NAV then reflects only the marked-to-oracle book).
    // PROD (real-money): NO cash exists until real USDC is funded — the window cap is a BUDGET
    // ceiling, not cash on hand, so it must never read as "cash not yet spent". Stays $0 until a real run.
    const cashUsd = this.prodMode
      ? 0
      : typeof this.policy.windowCapUsd === "number"
        ? round2(Math.max(0, this.policy.windowCapUsd - windowSpentUsd))
        : 0;
    const portfolio = book.portfolio({ cashUsd });

    return {
      policy: {
        perCardCapUsd: this.policy.perCardCapUsd,
        windowCapUsd: this.policy.windowCapUsd,
        selfApprove: this.policy.selfApprove,
        mode: this.policy.mode,
        resolved: this.policy.resolved,
      },
      traces,
      portfolio,
      summary: { candidates: candidates.length, acquired, approvedPending, skipped, blocked, errored, relisted, reroutePending, windowSpentUsd },
    };
  }

  /** Walk ONE candidate through oracle → decide → route → acquire → list → confirm. */
  private async processCard(
    d: DealRecord,
    productId: string,
    grade: string,
    grader: string,
    trace: CardTrace,
    book: PnLBook,
    getWindowSpent: () => number,
    addWindowSpent: (n: number) => void,
  ): Promise<void> {
    // ── 1. ORACLE — READ the value-truth (the SUSPECT, P3). Never recomputed. ──
    const oracleLabel = (this.adapters.oracle as { mode?: string }).mode === "mock" ? "stub" : "live";
    const o = await this.adapters.oracle.getOracleInputs({ productId, grade, grader });
    if (!o) {
      trace.disposition = "skipped-no-oracle";
      trace.steps.push({ step: "oracle", label: "skipped", detail: `no oracle value for ${productId} ${grade} ${grader}` });
      return;
    }
    trace.steps.push({
      step: "oracle",
      label: oracleLabel,
      detail: `${o.oracleSource} · ${o.freshness} · conf ${round2(o.oracleConfidence)} · ${o.oracleSoldCount ?? 0} sold · $${o.oracleValueUsd}`,
      data: { oracleSource: o.oracleSource, freshness: o.freshness, oracleConfidence: o.oracleConfidence, oracleValueUsd: o.oracleValueUsd },
    });

    // ── GRADE-MATCH GATE (hard invariant): the oracle's priced grade MUST equal the listing
    //    grade. A PSA 9 listing valued against a PSA 10 oracle is NOT a grade-matched EARN —
    //    it is the classic cross-grade contamination.
    //    The detector's phantom-guard enforces this on the deal; we re-enforce on the oracle READ
    //    so the orchestrator never buys against a mis-graded value-truth. ──
    if (!gradesMatch(grade, o.grade)) {
      trace.disposition = "skipped-grade-mismatch";
      trace.steps.push({
        step: "oracle",
        label: "skipped",
        detail: `grade-mismatch: listing ${grade} != oracle-priced ${o.grade} — not a grade-matched EARN (no cross-grade buy)`,
      });
      return;
    }

    // ── P3 trust gate: down-weight/skip a stale or thin/weak-tier oracle (the SUSPECT). ──
    const suspect = suspectReason(o, this.minSoldCount);
    if (suspect) {
      trace.disposition = "skipped-suspect-oracle";
      trace.steps.push({ step: "oracle", label: "skipped", detail: `SUSPECT oracle down-weighted (P3): ${suspect}` });
      return;
    }

    // ── 2. DECIDE — the REAL Nemotron brain (or labeled deterministic fallback). ──
    const spread = buildSpread(d, o, this.fees);
    // Skip a non-positive net before bothering the brain (deterministic, §5.2).
    if (spread.netSpreadUsd <= 0) {
      trace.disposition = "skipped-nemotron";
      trace.steps.push({ step: "decide", label: "skipped", detail: `non-positive net $${spread.netSpreadUsd} — no EARN` });
      return;
    }
    const decision = await this.decide(spread);
    trace.decision = decision;
    trace.steps.push({
      step: "decide",
      label: decision.source === "nemotron" ? "live" : "stub", // 'fallback' = deterministic stub label (P7)
      detail: `${decision.verdict} [${decision.source}/${decision.model}] — ${decision.reason}`,
      data: { verdict: decision.verdict, source: decision.source, flags: decision.flags, netSpreadUsd: decision.netSpreadUsd },
    });
    if (decision.verdict !== "BUY") {
      trace.disposition = "skipped-nemotron";
      return;
    }

    // ── 3. ROUTE — cheapest acquisition (routes-plan) + best NET EXIT (Sprint 4 D-E). ──
    // The acquisition MDP is the deterministic min-cost/max-EV policy; the EXIT axis is the
    // argmax over real quoteExit() across the acquire venue (relist-in-place) and any alternate
    // venues (move-venue). The `route` step flips stub→live because a REAL quoteExit now drives
    // the chosen terminal exit (no placeholder anchor).
    const planInputs = buildPlanInputs(d, o);
    const policy = computePolicy(planInputs, this.objective, {
      vaultAddress: "0x0000000000000000000000000000000000000000",
      budgetEnvelopeUsd: this.policy.windowCapUsd ?? Number.MAX_SAFE_INTEGER,
      horizonDays: 30,
    });
    trace.policy = policy;

    const { marketplace, custody } = custodyFor(d.listingPlatform ?? "");
    // Gather every quoted exit: the acquire venue's relist-in-place + each alternate move-venue.
    const exitQuotes: ExitQuote[] = [];
    // A venue we only BUY on (e.g. eBay in the SlabClaw demo) does NOT offer a relist-in-place
    // exit — its slabs re-route to a vault and exit on a tokenized venue (config, not hardcode).
    if (!this.excludeRelistInPlaceFor.has(marketplace)) {
      const acquireExits = await this.adapters.marketplace.quoteExit({ productId, listAtUsd: o.oracleValueUsd, currentCustody: custody });
      exitQuotes.push(...acquireExits);
    }
    for (const venue of this.adapters.exitVenues ?? []) {
      const alt = await venue.quoteExit({ productId, listAtUsd: o.oracleValueUsd, currentCustody: custody });
      exitQuotes.push(...alt);
    }
    const best = selectBestExit(exitQuotes);
    const exit = best?.chosen;
    if (best) {
      trace.bestExit = best;
      trace.exitQuote = best.chosen;
    }

    // The ROUTE step is now LIVE: a real quoteExit argmax drives the terminal exit value.
    trace.steps.push({
      step: "route",
      label: best ? "live" : "stub", // live once a real quoteExit drives the exit; stub if no venue quoted one
      detail: best
        ? `${this.objective} acquire: ${policy.policyTree.narrationSeed} · BEST EXIT: ${best.rationale}`
        : `${this.objective}: ${policy.policyTree.narrationSeed} (no exit quoted)`,
      data: {
        objective: this.objective,
        recommendedForm: policy.recommendedIntents[0]?.form,
        expectedValue: policy.policyTree.expectedValue,
        chosenExit: best?.chosen,
        losingExits: best?.losers,
        netAdvantageUsd: best?.netAdvantageUsd,
      },
    });

    // ── 3b. QUOTE-EXIT — surface the chosen best-net exit + the losing options (why-this-won). ──
    if (exit && best) {
      trace.steps.push({
        step: "quote-exit",
        label: "live",
        detail:
          `chose ${exit.strategy} on ${exit.marketplace}: list $${exit.listAtUsd} → net $${exit.netProceedsUsd} (fee $${exit.sellFeeUsd}, move $${exit.moveVenueUsd})` +
          (best.losers.length ? ` · beat ${best.losers.length} option(s) by $${best.netAdvantageUsd}` : " · only option"),
        data: { chosen: exit, losers: best.losers, netAdvantageUsd: best.netAdvantageUsd },
      });
    }

    // ── 4. QUOTE-ACQUIRE + ACQUIRE — BUY with the D11 cap threaded. ──
    // Build the marketplace listing the adapter quotes/acquires against.
    const listing: MarketplaceListing = {
      marketplace,
      listingId: d.id ?? d.listingUrl ?? `${productId}:${marketplace}`,
      url: d.listingUrl ?? "",
      productId,
      productName: d.name ?? "?",
      grader,
      grade,
      askUsd: d.listingPrice as number,
      currency: marketplace === "beezie" || marketplace === "courtyard" || marketplace === "opensea" ? "USDC" : "USD",
      custody,
      tokenized: custody.startsWith("onchain"),
      isLive: d.stale !== true,
    };
    const acquireQuote = await this.adapters.marketplace.quoteAcquire(listing);
    trace.landedCostUsd = acquireQuote.landedCostUsd;
    trace.steps.push({
      step: "quote-acquire",
      label: "live",
      detail: `landed $${acquireQuote.landedCostUsd} (ask $${acquireQuote.askUsd} + take $${acquireQuote.takeFeeUsd} + gas $${acquireQuote.gasUsd}) via ${acquireQuote.settlementRail}`,
      data: { landedCostUsd: acquireQuote.landedCostUsd, settlementRail: acquireQuote.settlementRail, requiresHumanGate: acquireQuote.execution.requiresHumanGate },
    });

    // ── D11 CAP FIREBREAK — the orchestrator NEVER calls acquire without a resolved cap. ──
    const cap = this.policy.perCardCapUsd;
    trace.capUsd = cap;
    if (typeof cap !== "number") {
      // FAIL CLOSED — no per-card cap resolved from policy.yaml ⇒ refuse to acquire (matches beezie's guard).
      trace.disposition = "blocked-no-cap";
      trace.steps.push({
        step: "acquire",
        label: "blocked",
        detail: "FAIL-CLOSED: no per-card cap resolved from policy.yaml — orchestrator refuses to acquire (D11)",
      });
      return;
    }
    if (acquireQuote.landedCostUsd > cap) {
      // Over-cap → blocked BEFORE any acquire send (the firebreak surfaces to the human).
      trace.disposition = "blocked-over-cap";
      trace.steps.push({
        step: "acquire",
        label: "blocked",
        detail: `BLOCKED over-cap: landed $${acquireQuote.landedCostUsd} > per-card cap $${cap} — stop + surface (D11), no send`,
      });
      return;
    }
    // Rolling window envelope (the budget guardrail) — block before breaching it.
    if (typeof this.policy.windowCapUsd === "number" && round2(getWindowSpent() + acquireQuote.landedCostUsd) > this.policy.windowCapUsd) {
      trace.disposition = "blocked-window-budget";
      trace.steps.push({
        step: "acquire",
        label: "blocked",
        detail: `BLOCKED window-budget: $${getWindowSpent()} + $${acquireQuote.landedCostUsd} > window cap $${this.policy.windowCapUsd} — freeze new spend (D11)`,
      });
      return;
    }

    // PROD MODE: the desk has APPROVED an in-cap buy — but on the real-money instance we do NOT
    // simulate or stage the purchase. A real onchain buy only happens through the human-gated run.
    // Record the approval honestly and STOP: no staged receipt, no opened position, no window spend.
    // Nothing counts as "bought"/held until a real settlement lands (P5/P7 — no fabricated activity).
    if (this.prodMode) {
      // ACCUMULATOR: when the vault accumulator drives this loop, an approved-pending proposal
      // CONSUMES the rolling-window envelope so buy-MAX can only approve as many copies as the
      // deposit/window budget allows — then the NEXT candidate freezes at blocked-window-budget.
      // Off by default: the real-money desk's approved-pending is a human-gated proposal that does
      // NOT move the window (no fabricated spend on the real-money surface, P5/P7).
      if (this.countApprovedTowardWindow) addWindowSpent(acquireQuote.landedCostUsd);
      trace.disposition = "approved-pending";
      trace.steps.push({
        step: "acquire",
        label: "spec-only",
        detail: `APPROVED in-cap (landed $${acquireQuote.landedCostUsd} ≤ per-card cap $${cap}) — awaiting the human-gated real-money run; NOT executed (real-money prod shows no buy until a real onchain settlement).`,
      });
      return;
    }

    // In-cap → SELF-APPROVE (D11: no per-spend tap) and call acquire with the cap threaded.
    const acquireReceipt = await this.adapters.marketplace.acquire({
      quote: acquireQuote,
      // D11: self-approve the in-cap intent — no operator stamp. approvalRef is the SELF stamp, not a human tap.
      approvalRef: this.policy.selfApprove ? `self-approve:in-cap:${productId}` : undefined,
      maxUsd: cap, // the resolved policy cap — beezie re-enforces it block-or-commit before staging
    });
    trace.acquireReceipt = acquireReceipt;
    const acquireLive = acquireReceipt.status === "confirmed" && !!acquireReceipt.settleTxHash;
    trace.isLive = acquireLive;
    if (acquireReceipt.status === "failed") {
      // The engine guard (beezie) blocked it — surface honestly.
      trace.disposition = acquireReceipt.approvalRef?.includes("over-cap") ? "blocked-over-cap" : "blocked-no-cap";
      trace.steps.push({ step: "acquire", label: "blocked", detail: `engine guard blocked: ${acquireReceipt.approvalRef}`, data: acquireReceipt });
      return;
    }
    trace.steps.push({
      step: "acquire",
      label: acquireLive ? "live" : "spec-only",
      detail: acquireLive
        ? `BUY confirmed — tx ${acquireReceipt.settleTxHash} (paid $${acquireReceipt.paidUsd})`
        : `BUY staged (SPEC-ONLY — no signer wired; no tx fabricated). paid-quote $${acquireReceipt.paidUsd}`,
      data: { status: acquireReceipt.status, settleTxHash: acquireReceipt.settleTxHash, paidUsd: acquireReceipt.paidUsd },
    });
    trace.disposition = "acquired";
    addWindowSpent(acquireQuote.landedCostUsd);

    // ── P&L: open the position at the LANDED COST (the cost basis), Sprint 4 D-F1. ──
    // basisIsLive mirrors the acquire honesty flag (true only once a real on-chain buy landed).
    book.openPosition({
      productId,
      name: d.name ?? undefined,
      grade,
      grader,
      costBasisUsd: acquireQuote.landedCostUsd,
      acquiredOn: marketplace,
      basisIsLive: acquireLive,
    });

    // ── P&L: MARK-TO-ORACLE while held (D-F2). The mark is the grade-matched oracle value
    //    (READ, never recomputed); the projected exit fee comes from the chosen best-net exit
    //    (sellFee + moveVenue). The mark carries the oracle tier/freshness so the book can
    //    down-weight a stale/thin SUSPECT (P3 — never a hyped headline). ──
    const projectedExitFeesUsd = exit ? round2(exit.sellFeeUsd + exit.moveVenueUsd) : 0;
    book.markToOracle({
      productId,
      grade,
      grader,
      mark: { valueUsd: o.oracleValueUsd, tier: o.oracleSource, freshness: o.freshness, oracleUrl: o.oracleUrl },
      projectedExitFeesUsd,
      listed: false, // upgraded to listed below once a list receipt lands
    });

    // ── 5. RE-ROUTE (if the exit is on a different custody) + LIST at the oracle on the EXIT venue. ──
    if (exit) {
      // Resolve the adapter that actually trades on the chosen exit venue (NOT always the buy
      // adapter) and whether the asset must physically MOVE custody before it can list there.
      const exitAdapter = this.adapterFor(exit.marketplace);
      const exitCustody = custodyFor(exit.marketplace).custody;
      const needsReroute = exitCustody !== custody;

      if (needsReroute) {
        // The chosen exit lives on a DIFFERENT custody than where the slab was bought (e.g. an
        // eBay buy that must SHIP to a vault to be tokenized before it can list). This is a
        // physical, multi-day, human-shipped move — there is NO token-bridge (ROUTES §5.1). We
        // initiate the move on the BUY adapter (it owns the ship-out), then STAGE the list behind
        // it: a slab that has not arrived/minted at the exit custody CANNOT be listed (P7).
        const move = await this.adapters.marketplace.initiateCustodyMove({
          productId,
          from: custody,
          to: exitCustody,
          certHash: trace.acquireReceipt?.certHash,
        });
        trace.custodyMove = move;
        // Persist the leg so a LATER run can poll the move + advance the staged list (cross-run
        // continuation). The resume context carries the cost basis + oracle mark so the position
        // re-opens from the SAME basis on the other side (no re-derived/fabricated P&L).
        this.adapters.custodyStore?.open({
          moveId: move.moveId,
          productId,
          name: d.name ?? undefined,
          grade,
          grader,
          exitMarketplace: exit.marketplace,
          fromCustody: custody,
          toCustody: exitCustody,
          listAtUsd: exit.listAtUsd,
          projectedExitFeesUsd,
          costBasisUsd: acquireQuote.landedCostUsd,
          basisIsLive: acquireLive,
          oracleValueUsd: o.oracleValueUsd,
          oracleTier: o.oracleSource,
          oracleFreshness: o.freshness,
          oracleUrl: o.oracleUrl,
          certHash: trace.acquireReceipt?.certHash,
          status: move.status,
          trackingNumber: move.trackingNumber,
          nextCheckpoint: move.nextCheckpoint,
          openedAt: new Date().toISOString(),
        });
        trace.steps.push({
          step: "reroute",
          label: "spec-only", // the asset is in flight — the move is not a completed, live event
          detail:
            `RE-ROUTE ${custody} → ${exitCustody} for the ${exit.marketplace} exit — ${move.status}` +
            `${move.requiresHumanShip ? " (human ship-out)" : ""}; move-cost $${exit.moveVenueUsd}` +
            `${this.adapters.custodyStore ? ` · leg persisted (poll to advance, move ${move.moveId})` : ""}`,
          data: { move, fromCustody: custody, toCustody: exitCustody, exitVenue: exit.marketplace },
        });
        // The list is STAGED behind the physical move — surfaced honestly, never confirmed early.
        const stagedList: ListReceipt = {
          status: "staged",
          listingId: undefined,
          marketplace: exit.marketplace,
          listAtUsd: exit.listAtUsd,
          approvalRef: `PENDING-REROUTE:awaiting ${exitCustody} arrival (move ${move.moveId})`,
          listedAt: undefined,
        };
        trace.listReceipt = stagedList;
        // Position stays HELD/in-transit — marked-to-oracle, NOT listed (no premature listed=true).
        trace.steps.push({
          step: "list",
          label: "spec-only",
          detail: `LIST staged on ${exit.marketplace} pending re-route — list-at $${exit.listAtUsd} (asset must arrive at ${exitCustody} first)`,
          data: { status: "staged", listingId: undefined, listAtUsd: exit.listAtUsd, pendingReroute: true },
        });
        trace.saleReceipt = null;
        trace.steps.push({
          step: "confirm-sale",
          label: "skipped",
          detail: `not listed yet (re-route to ${exitCustody} in flight) — nothing to poll`,
        });
      } else {
        // Relist-in-place (or a same-custody move-venue): list directly on the exit adapter.
        const listReceipt = await exitAdapter.list({ exit, approvalRef: this.policy.selfApprove ? `self-approve:list:${productId}` : undefined });
        trace.listReceipt = listReceipt;
        const listLive = listReceipt.status === "confirmed" && !!listReceipt.listingId;
        // The position is now LISTED (mark stays, status advances).
        book.markToOracle({
          productId,
          grade,
          grader,
          mark: { valueUsd: o.oracleValueUsd, tier: o.oracleSource, freshness: o.freshness, oracleUrl: o.oracleUrl },
          projectedExitFeesUsd,
          listed: true,
        });
        trace.steps.push({
          step: "list",
          label: listLive ? "live" : "spec-only",
          detail: listLive
            ? `LIST confirmed @ $${listReceipt.listAtUsd} on ${exit.marketplace} — listing ${listReceipt.listingId}`
            : `LIST staged (SPEC-ONLY — no signer wired) on ${exit.marketplace}. list-at $${listReceipt.listAtUsd}`,
          data: { status: listReceipt.status, listingId: listReceipt.listingId, listAtUsd: listReceipt.listAtUsd },
        });

        // ── 6. CONFIRM-SALE — poll the EXIT venue for a realized sale (null while unsold; never fabricated). ──
        if (listReceipt.listingId) {
          const sale = await exitAdapter.confirmSale({ listingId: listReceipt.listingId, marketplace: exit.marketplace });
          trace.saleReceipt = sale;
          // P&L: BOOK REALIZED at sale (D-F3) — realized = netProceeds − basis. A null sale is a
          // no-op (unsold ⇒ the position stays marked-to-oracle; no fabricated proceeds, P7).
          const saleIsLive = sale?.status === "confirmed" || (!!sale && !!sale.txHashOrPayout);
          book.bookRealized({ productId, grade, grader, fill: sale ? { netProceedsUsd: sale.netProceedsUsd, soldAtUsd: sale.soldAtUsd, saleIsLive } : null });
          trace.steps.push({
            step: "confirm-sale",
            label: sale ? "live" : "skipped",
            detail: sale ? `SOLD $${sale.soldAtUsd} → net $${sale.netProceedsUsd}` : "unsold (confirmSale → null; no fabricated sale, P7)",
            data: sale ?? null,
          });
        } else {
          trace.saleReceipt = null;
          trace.steps.push({ step: "confirm-sale", label: "skipped", detail: "no published listingId yet (staged list) — nothing to poll" });
        }
      }
    }

    // ── P&L STEP: surface realized + unrealized for this position into the trace (D-F4). ──
    // Realized and unrealized are DISTINCT (P7); the mark carries its oracle tier/freshness and
    // a down-weight flag when the oracle is a SUSPECT (P3). The label is 'live' only when the
    // underlying basis/sale is a real on-chain event; otherwise 'spec-only' (mark off a staged buy).
    const pos = book.position({ productId, grade, grader });
    if (pos) {
      trace.pnl = pos;
      const pnlLive = pos.status === "sold" ? pos.saleIsLive : pos.basisIsLive;
      const realizedStr = pos.realizedUsd === null ? "—" : `$${pos.realizedUsd}`;
      const unrealStr =
        pos.unrealizedUsd === null
          ? "—"
          : `$${pos.unrealizedUsd}${pos.downWeighted ? ` (down-weighted ${pos.markConfidence}, ${pos.markTier}/${pos.markFreshness}; raw $${pos.unrealizedRawUsd})` : ""}`;
      trace.steps.push({
        step: "pnl",
        label: pnlLive ? "live" : "spec-only",
        detail: `P&L [${pos.status}] basis $${pos.costBasisUsd} · realized ${realizedStr} · unrealized ${unrealStr}`,
        data: pos,
      });
    }
  }
}

/** Render a CardTrace as a compact human-readable block (for `npm run demo` / the web layer). */
export function renderTrace(t: CardTrace): string {
  const head = `▸ ${t.name} (${t.productId}) ${t.grader} ${t.grade} → ${t.disposition}${t.isLive ? " [LIVE]" : ""}`;
  const lines = t.steps.map((s) => `    · [${s.label}] ${s.step}: ${s.detail}`);
  return [head, ...lines].join("\n");
}
