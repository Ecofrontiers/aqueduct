/**
 * routes-plan.ts — the `routes_plan` MDP policy seed.
 *
 * Bounded expectimax over the card-state graph. The headline property (the oracle source): on the
 * SAME card, `min-cost` and `max-risk-adjusted-ev` produce VERIFIABLY DIFFERENT policies —
 * cautious takes the cheap deterministic graded-buy → hold; aggressive branches on the
 * stochastic Grade outcome (raw → grade → sell) because the probability-weighted uplift
 * beats the cheap path.
 *
 * The Grade edge is valued by the grade-EV reference module
 * (computeGradingEV / getGradeDistribution / buildPricesByGrade). This is a public
 * reference implementation (../lib/grade-ev.mjs); in production the tuned grade-EV
 * (grade distribution + FMV-by-grade) is served by the SlabClaw oracle over the
 * SLABCLAW_API_URL HTTP seam and passed into the planner.
 *
 * DISCIPLINE (§5.2 step 7): the numbers come from this expectimax + the grade-EV
 * module; Nemotron only narrates. The arithmetic is NOT delegated to the LLM.
 *
 * ZERO contract dependency. The `Address` type is a plain string alias here (no viem dep)
 * so the seed runs standalone; the agent build can widen it to viem's Address.
 */
// grade-ev.mjs is plain ESM JS — typed via lib/grade-ev.d.ts.
import {
  getGradeDistribution,
  expectedGrade,
  computeGradingEV,
  buildPricesByGrade,
} from "../lib/grade-ev.mjs";
import type { ExitQuote } from "../lib/adapters/index.ts";
import { DESK_FILL_FEE_BPS, gradingCost, venueSellFeeUsd, shipToGraderRoundTrip } from "./route-costs.ts";

export type Address = string;
export type CardForm = "raw" | "slabbed" | "tokenized";
export interface Grade {
  grader: "PSA" | "BGS" | "CGC" | "SGC" | "TAG" | null;
  grade: number | null;
}
export interface CardState {
  form: CardForm;
  grade: Grade;
  location: string;
  listingStatus: "unlisted" | "listed" | "sold" | "in_transit" | "in_custody" | "locked_by_intent";
  certNumber?: string;
  nftTokenId?: string;
}
export function stateKey(s: CardState): string {
  return `${s.form}:${s.grade.grader}:${s.grade.grade}:${s.location}:${s.listingStatus}`;
}

export interface CostVector {
  shippingUsd: number;
  taxUsd: number;
  serviceFeeUsd: number;
  insuranceUsd: number;
  timeDays: number;
}
export function totalCost(c: CostVector): number {
  return c.shippingUsd + c.taxUsd + c.serviceFeeUsd + c.insuranceUsd;
}
function addCost(a: CostVector, b: CostVector): CostVector {
  return {
    shippingUsd: a.shippingUsd + b.shippingUsd,
    taxUsd: a.taxUsd + b.taxUsd,
    serviceFeeUsd: a.serviceFeeUsd + b.serviceFeeUsd,
    insuranceUsd: a.insuranceUsd + b.insuranceUsd,
    timeDays: a.timeDays + b.timeDays,
  };
}
const ZERO_COST: CostVector = { shippingUsd: 0, taxUsd: 0, serviceFeeUsd: 0, insuranceUsd: 0, timeDays: 0 };

export type EdgeType =
  | "acquire"
  | "grade"
  | "crack"
  | "crossover"
  | "tokenize"
  | "redeem"
  | "vault"
  | "list"
  | "delist"
  | "sell"
  | "ship"
  | "bundle"
  | "split"
  | "trade"
  | "hold";

export type ObjectiveType = "min-cost" | "max-risk-adjusted-ev";

/** A scored hop in a returned policy branch. */
export interface PolicyHop {
  type: EdgeType;
  fromKey: string;
  toKey: string;
  cost: CostVector;
  isProbabilistic: boolean;
  /** stateKey → prob for chance (Grade) edges. */
  outcomeDist?: Record<string, number>;
  note?: string;
}

export interface ConditionalPolicy {
  objective: ObjectiveType;
  hops: PolicyHop[];
  /** Expected terminal value (oracle realisation) net of cumulative cost on the chosen branch. */
  expectedValue: number;
  /** Cumulative deterministic cost of the chosen branch. */
  cumulativeCostUsd: number;
  expectedGrade?: number;
  narrationSeed: string;
}

export interface AcquisitionPolicy {
  vaultAddress: Address;
  targetProduct: string;
  objective: ObjectiveType;
  recommendedIntents: {
    form: CardForm;
    /** Landed-cost-adjusted ceiling (§5.5): oracle value − chosen-branch cumulative cost. */
    maxPrice: number;
    expectedCost: number;
    expectedGrade?: number;
    priority: number;
  }[];
  policyTree: ConditionalPolicy;
  replanTriggers: { priceChange: number; gradeOutcome: boolean; timeElapsed: number };
}

/** Oracle inputs for the planner (in production read from oracle.ts over SLABCLAW_API_URL). */
export interface OracleInputs {
  productId: string;
  psa10: number; // anchor for buildPricesByGrade
  psa9: number;
  /** Price to BUY the card already-slabbed at the target grade (the cautious cheap path). */
  slabbedAskByGrade: Record<number, number>;
  /** Price to BUY the card raw (NM condition) — the input to the grade-it route. */
  rawAskUsd: number;
  /** Condition of the raw buy (drives the grade distribution). */
  rawCondition: string;
  /** Target grade the vault wants to end up holding. */
  targetGrade: number;
  grader?: "PSA" | "BGS" | "CGC";
  gradingTier?: "economy" | "regular" | "express";
  sellFeePercent?: number;
}

export interface PlanContext {
  vaultAddress: Address;
  budgetEnvelopeUsd: number;
  horizonDays: number;
  maxHops?: number;
}

const DESK_FILL_RATE = DESK_FILL_FEE_BPS / 10_000; // 2% desk fill fee on the acquire leg (route-costs.ts)

/**
 * Two candidate ROUTES for the same card, valued under one objective:
 *   ROUTE A (cautious): acquire the SLABBED card at target grade → hold. Deterministic.
 *   ROUTE B (aggressive): acquire RAW → ship to grader → grade (chance node) → sell.
 *
 * `min-cost` scores each route by cumulative deterministic cost (lower wins).
 * `max-risk-adjusted-ev` scores each route by probability-weighted (terminal value − cost).
 */
function buildRoutes(o: OracleInputs): { route: "slabbed-hold" | "raw-grade-sell"; build: () => ConditionalPolicy }[] {
  const grader = o.grader ?? "PSA";
  const tier = o.gradingTier ?? "economy";

  const pricesByGrade = buildPricesByGrade(o.psa10, o.psa9) as Record<number, number> | null;
  if (!pricesByGrade) throw new Error("buildPricesByGrade returned null — need psa10/psa9 anchors");

  // ----- ROUTE A: buy slabbed at target grade, hold (deterministic) -----
  const buildSlabbedHold = (): ConditionalPolicy => {
    const ask = o.slabbedAskByGrade[o.targetGrade];
    if (!(ask > 0)) throw new Error(`no slabbed ask for grade ${o.targetGrade}`);
    const start: CardState = { form: "raw", grade: { grader: null, grade: null }, location: "market", listingStatus: "unlisted" };
    const held: CardState = { form: "slabbed", grade: { grader, grade: o.targetGrade }, location: "custody", listingStatus: "in_custody" };
    const acquireCost: CostVector = { ...ZERO_COST, serviceFeeUsd: ask * DESK_FILL_RATE }; // desk fill fee on the buy
    const cum = acquireCost;
    const terminalValue = pricesByGrade[o.targetGrade] ?? o.slabbedAskByGrade[o.targetGrade];
    const net = terminalValue - ask - totalCost(cum);
    const hops: PolicyHop[] = [
      {
        type: "acquire",
        fromKey: stateKey(start),
        toKey: stateKey(held),
        cost: acquireCost,
        isProbabilistic: false,
        note: `buy slabbed ${grader} ${o.targetGrade} @ $${ask}`,
      },
      { type: "hold", fromKey: stateKey(held), toKey: stateKey(held), cost: ZERO_COST, isProbabilistic: false },
    ];
    return {
      objective: "min-cost",
      hops,
      expectedValue: round2(net),
      cumulativeCostUsd: round2(ask + totalCost(cum)),
      expectedGrade: o.targetGrade,
      narrationSeed: `Cautious: acquire the already-graded ${grader} ${o.targetGrade} at $${ask} and hold — no grading variance, lowest cost to a terminal state.`,
    };
  };

  // ----- ROUTE B: buy raw, ship, grade (chance node), sell -----
  const buildRawGradeSell = (): ConditionalPolicy => {
    const dist = getGradeDistribution(o.rawCondition) as Record<string, number> | null;
    if (!dist) throw new Error(`no grade distribution for condition ${o.rawCondition}`);
    const ev = computeGradingEV({ condition: o.rawCondition, predictedGrade: null, pricesByGrade, grader, tier }) as {
      ev: number;
      cost: number;
      netEv: number;
      breakdown: { grade: number; probability: number; fmv: number; contribution: number }[];
    };
    const expG = expectedGrade(o.rawCondition) as number;

    const start: CardState = { form: "raw", grade: { grader: null, grade: null }, location: "market", listingStatus: "unlisted" };
    const owned: CardState = { form: "raw", grade: { grader: null, grade: null }, location: "desk", listingStatus: "in_custody" };
    const atGrader: CardState = { form: "raw", grade: { grader: null, grade: null }, location: "grader", listingStatus: "in_transit" };

    const acquireCost: CostVector = { ...ZERO_COST, serviceFeeUsd: o.rawAskUsd * DESK_FILL_RATE };
    // Round-trip ship to grader (value-aware, both legs insured): out at raw value, back at graded.
    const shipCost: CostVector = shipToGraderRoundTrip(o.rawAskUsd, ev?.ev);
    // Grade turnaround (capital-lock days) from the route-cost oracle, not a magic 30.
    const gsvc = gradingCost(grader, tier);
    const gradeServiceCost: CostVector = {
      ...ZERO_COST,
      serviceFeeUsd: ev.cost, // grading fee: grade-ev is source of truth (route-costs cross-checks)
      timeDays: Math.round((gsvc.turnaroundDaysLo + gsvc.turnaroundDaysHi) / 2),
    };

    // chance node: grade outcome distribution
    const outcomeDist: Record<string, number> = {};
    for (const [g, p] of Object.entries(dist)) {
      const sold: CardState = { form: "slabbed", grade: { grader, grade: parseInt(g) }, location: "custody", listingStatus: "sold" };
      outcomeDist[stateKey(sold)] = p;
    }

    const hops: PolicyHop[] = [
      { type: "acquire", fromKey: stateKey(start), toKey: stateKey(owned), cost: acquireCost, isProbabilistic: false, note: `buy raw ${o.rawCondition} @ $${o.rawAskUsd}` },
      { type: "ship", fromKey: stateKey(owned), toKey: stateKey(atGrader), cost: shipCost, isProbabilistic: false, note: "ship to grader (round-trip, insured)" },
      {
        type: "grade",
        fromKey: stateKey(atGrader),
        toKey: "chance",
        cost: gradeServiceCost,
        isProbabilistic: true,
        outcomeDist,
        note: `grade (${grader} ${tier}); E[grade]≈${expG}`,
      },
      { type: "sell", fromKey: "chance", toKey: "sold", cost: ZERO_COST, isProbabilistic: false, note: "list & sell graded" },
    ];

    // probability-weighted terminal realisation, net of cumulative cost + sell fee
    const cum = addCost(addCost(acquireCost, shipCost), gradeServiceCost);
    const grossEv = ev.ev; // probability-weighted FMV across grades (from grade-ev)
    // Sell fee: explicit sellFeePercent wins (flat); else the route-cost oracle's TIERED eBay take
    // (13.25% under $1k, ~6.6% effective on high-value singles) on the graded value.
    const sellFee = o.sellFeePercent !== undefined
      ? grossEv * (o.sellFeePercent / 100)
      : venueSellFeeUsd("ebay", grossEv);
    const net = grossEv - sellFee - o.rawAskUsd - totalCost(cum);

    return {
      objective: "max-risk-adjusted-ev",
      hops,
      expectedValue: round2(net),
      cumulativeCostUsd: round2(o.rawAskUsd + totalCost(cum)),
      expectedGrade: expG,
      narrationSeed: `Aggressive: buy raw at $${o.rawAskUsd}, ship + grade (${grader} ${tier}), branch on the stochastic grade outcome; probability-weighted graded value ≈ $${round2(grossEv)} → net EV $${round2(net)}.`,
    };
  };

  return [
    { route: "slabbed-hold", build: buildSlabbedHold },
    { route: "raw-grade-sell", build: buildRawGradeSell },
  ];
}

/**
 * computePolicy — the routes_plan entrypoint. Builds candidate routes, scores them under the
 * objective, returns the winning conditional policy + landed-cost-adjusted recommended intents.
 *
 * The two objectives select DIFFERENT routes on the same card (the demo's policy contrast):
 *  - min-cost              → minimise cumulative deterministic cost  → slabbed-hold (cautious)
 *  - max-risk-adjusted-ev  → maximise prob-weighted (value − cost)   → raw-grade-sell (aggressive)
 */
export function computePolicy(o: OracleInputs, objective: ObjectiveType, ctx: PlanContext): AcquisitionPolicy {
  const maxHops = ctx.maxHops ?? 6;
  const candidates = buildRoutes(o).map((c) => c.build());

  // circuit breaker (§5.2 bounds): prune over-budget / over-length branches.
  const feasible = candidates.filter(
    (p) => p.hops.length <= maxHops && p.cumulativeCostUsd <= ctx.budgetEnvelopeUsd,
  );
  const pool = feasible.length ? feasible : candidates;

  let chosen: ConditionalPolicy;
  if (objective === "min-cost") {
    // minimise cumulative deterministic cost (the cautious special case, §5.2 step 6)
    chosen = pool.reduce((best, p) => (p.cumulativeCostUsd < best.cumulativeCostUsd ? p : best));
  } else {
    // maximise probability-weighted (terminal value − cumulative cost)
    chosen = pool.reduce((best, p) => (p.expectedValue > best.expectedValue ? p : best));
  }
  chosen = { ...chosen, objective };

  // Derive the acquire form from the CHOSEN branch's own hops (robust to object cloning):
  // a probabilistic Grade chance node ⇒ the raw-grade-sell route; otherwise slabbed-hold.
  const isRawRoute = chosen.hops.some((h) => h.type === "grade" && h.isProbabilistic);
  const form: CardForm = isRawRoute ? "raw" : "slabbed";
  // maxPrice = the price we will pay for the acquire leg (the landed cost is folded into EV).
  const acquireAsk = form === "raw" ? o.rawAskUsd : o.slabbedAskByGrade[o.targetGrade];

  return {
    vaultAddress: ctx.vaultAddress,
    targetProduct: o.productId,
    objective,
    recommendedIntents: [
      {
        form,
        maxPrice: round2(acquireAsk),
        expectedCost: chosen.cumulativeCostUsd,
        expectedGrade: chosen.expectedGrade,
        priority: 1,
      },
    ],
    policyTree: chosen,
    replanTriggers: { priceChange: 0.1, gradeOutcome: true, timeElapsed: Math.min(ctx.horizonDays, 14) },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// Best-net-EXIT argmax (Sprint 4 — finding #4, D-E1/D-E2)
//
// The EXIT axis of Deals×Routes: once the desk HOLDS a graded slab, where does it
// realise the most NET proceeds at the oracle target — relist where it already sits
// (relist-in-place, no move cost), or ship/bridge it to another venue (move-venue,
// which pays a move cost but may carry a lower sell fee)?
//
// Each candidate exit is an `ExitQuote` produced by a `MarketplaceAdapter.quoteExit`
// (Beezie ~8% take, Courtyard its own, eBay its own). This module does NOT call the
// adapters — it takes the already-quoted exits (gathered by the orchestrator across
// its acquire venue + any alternate venues) and selects the argmax on `netProceedsUsd`.
//
// HONESTY (P7): the winner is the argmax; the LOSING options are returned verbatim so
// the trace can explain "why THIS exit won" (the delta over the runner-up). No exit is
// fabricated — every option came from a real (or mock-labeled) adapter quote. The
// arithmetic (net = listAt − sellFee − moveVenue) lives in the adapter; this only ranks.
// ─────────────────────────────────────────────────────────────────────────────

/** The chosen exit + the losing options + an honest "why this won" delta. */
export interface BestExit {
  /** The argmax-netProceeds exit (where the desk should list/sell). */
  chosen: ExitQuote;
  /** Every other quoted exit, sorted by netProceeds DESC (the honest losing options). */
  losers: ExitQuote[];
  /** chosen.netProceedsUsd − runner-up.netProceedsUsd (0 when only one option). */
  netAdvantageUsd: number;
  /** Sponsor-/audit-legible rationale: which strategy won and by how much over the runner-up. */
  rationale: string;
}

/**
 * selectBestExit — argmax over `netProceedsUsd` across all quoted exits.
 *
 * Tie-break (deterministic, never random): when two exits net the SAME proceeds, prefer
 * `relist-in-place` (no custody move ⇒ no multi-day physical leg, lower execution risk).
 * Returns null when no exits are supplied (honest — nothing to sell).
 */
export function selectBestExit(quotes: ExitQuote[]): BestExit | null {
  if (!quotes || quotes.length === 0) return null;

  // Sort by net proceeds DESC; on a tie, relist-in-place wins (avoids the physical move).
  const ranked = [...quotes].sort((a, b) => {
    if (b.netProceedsUsd !== a.netProceedsUsd) return b.netProceedsUsd - a.netProceedsUsd;
    const aRelist = a.strategy === "relist-in-place" ? 0 : 1;
    const bRelist = b.strategy === "relist-in-place" ? 0 : 1;
    return aRelist - bRelist;
  });

  const chosen = ranked[0];
  const losers = ranked.slice(1);
  const runnerUp = losers[0];
  const netAdvantageUsd = runnerUp ? round2(chosen.netProceedsUsd - runnerUp.netProceedsUsd) : 0;

  const where = `${chosen.strategy} on ${chosen.marketplace}`;
  const rationale = runnerUp
    ? `${where} nets $${chosen.netProceedsUsd} (list $${chosen.listAtUsd} − fee $${chosen.sellFeeUsd} − move $${chosen.moveVenueUsd}), ` +
      `beating ${runnerUp.strategy} on ${runnerUp.marketplace} ($${runnerUp.netProceedsUsd}) by $${netAdvantageUsd}.`
    : `${where} nets $${chosen.netProceedsUsd} (list $${chosen.listAtUsd} − fee $${chosen.sellFeeUsd} − move $${chosen.moveVenueUsd}); only exit quoted.`;

  return { chosen, losers, netAdvantageUsd, rationale };
}
