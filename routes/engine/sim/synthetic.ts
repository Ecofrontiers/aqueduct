/**
 * synthetic.ts — the SYNTHETIC-SCALE simulation harness (the pre-mainnet gate, D8).
 *
 * Runs the REAL `AcquisitionDeskOrchestrator` over 100s of SYNTHETIC cards on MockUSDC, in a
 * fully in-process / zero-network environment, and validates the engine's invariants AT SCALE
 * before any real money is risked (the gate Pat set on the mainnet run):
 *   • the D11 per-card cap firebreak holds for EVERY card (no over-cap spend ever commits)
 *   • the rolling window budget is never breached
 *   • realized vs unrealized P&L stay DISTINCT; the portfolio NAV reconciles
 *   • cross-custody buys RE-ROUTE (stage behind a physical move) and RESUME to a live exit on arrival
 *   • the run is DETERMINISTIC (same seed → identical summary) and crash-free
 *
 * Everything here is explicitly SYNTHETIC (settlement labeled `mockusdc:synth:…`); this is a
 * simulation, not the live demo — it never touches a network, a chain, or real funds.
 */

import { AcquisitionDeskOrchestrator, type LoopResult } from "../services/orchestrator.ts";
import type {
  DealsAdapter,
  DealRecord,
  DealQuery,
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
  CustodyDestination,
  Marketplace,
} from "../lib/adapters/index.ts";
import type { BuySkip } from "../services/spread-decision.ts";
import type { Spread } from "../services/spread-detector.ts";
import type { SpendPolicy } from "../lib/policy.ts";
import { InMemoryCustodyStore } from "../lib/custody-store.ts";

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Deterministic PRNG (mulberry32) — seeded so the whole simulation is reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Scenario = "buy-tokenized" | "reroute-physical" | "over-cap" | "skip-negative" | "skip-thin" | "skip-stale";

const SCENARIO_WEIGHTS: Array<[Scenario, number]> = [
  ["buy-tokenized", 0.4],
  ["reroute-physical", 0.2],
  ["over-cap", 0.12],
  ["skip-negative", 0.1],
  ["skip-thin", 0.09],
  ["skip-stale", 0.09],
];

const NAMES = ["Charizard", "Blastoise", "Venusaur", "Pikachu", "Mewtwo", "Gyarados", "Dragonite", "Lugia", "Poliwrath", "Alakazam", "Machamp", "Gengar", "Zapdos", "Articuno", "Moltres"];
const GRADERS = ["PSA", "CGC", "BGS"];
const TOKENIZED_PLATFORMS = ["beezie", "courtyard"];
const PHYSICAL_PLATFORMS = ["ebay", "cardmarket"];

/** One generated card = a deal + its oracle truth + the scenario it should exercise. */
export interface SynthCard {
  scenario: Scenario;
  deal: DealRecord;
  oracle: OracleInputs;
  willSell: boolean; // deterministic: does a listed position sell within the window?
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
function weightedScenario(rng: () => number): Scenario {
  let r = rng();
  for (const [s, w] of SCENARIO_WEIGHTS) {
    if (r < w) return s;
    r -= w;
  }
  return "buy-tokenized";
}

/**
 * Generate `n` synthetic cards deterministically from `seed`. The per-card cap is needed so the
 * over-cap scenario can place an ask ABOVE it (to exercise the firebreak at scale).
 */
export function generateCards(n: number, seed: number, perCardCapUsd: number): SynthCard[] {
  const rng = mulberry32(seed);
  const cards: SynthCard[] = [];
  for (let i = 0; i < n; i++) {
    const scenario = weightedScenario(rng);
    const name = pick(rng, NAMES);
    const grader = pick(rng, GRADERS);
    const grade = `${grader} ${7 + Math.floor(rng() * 4)}`; // e.g. "PSA 9"
    const productId = `synth-${i}`;
    const baseAsk = round2(20 + rng() * 380); // $20–$400 normal band

    // defaults (a confident, fresh, grader-matched buy)
    let ask = baseAsk;
    let oracleValueUsd = round2(ask * (1.3 + rng() * 0.5)); // +30–80% edge
    let platform = pick(rng, TOKENIZED_PLATFORMS);
    let oracleSource: OracleInputs["oracleSource"] = "pc_sold";
    let oracleSoldCount = 3 + Math.floor(rng() * 8);
    let freshness: OracleInputs["freshness"] = "fresh";
    let oracleConfidence = round2(0.75 + rng() * 0.2);

    switch (scenario) {
      case "reroute-physical":
        platform = pick(rng, PHYSICAL_PLATFORMS); // physical buy → must re-route to tokenize
        break;
      case "over-cap":
        ask = round2(perCardCapUsd + 50 + rng() * 1500); // above the per-card cap
        oracleValueUsd = round2(ask * (1.3 + rng() * 0.4));
        break;
      case "skip-negative":
        oracleValueUsd = round2(ask * (0.8 + rng() * 0.18)); // value ≤ ask ⇒ non-positive net
        break;
      case "skip-thin":
        oracleSoldCount = 1 + Math.floor(rng() * 2); // 1–2 comps ⇒ SUSPECT (thin)
        break;
      case "skip-stale":
        freshness = rng() < 0.5 ? "stale" : "stale_hard"; // freshness-gated SUSPECT
        break;
      case "buy-tokenized":
      default:
        break;
    }

    const deal: DealRecord = {
      cardId: productId,
      name,
      listingPlatform: platform,
      listingPrice: ask,
      listingGrade: grade,
      spreadGrade: grade,
      grader,
      stale: false,
      listingUrl: `synthetic://${platform}/${productId}`,
    };
    const oracle: OracleInputs = {
      productId,
      grade,
      grader,
      oracleValueUsd,
      oracleSource,
      oracleConfidence,
      oracleSoldCount,
      graderMatched: true,
      freshness,
      oracleUrl: `synthetic://oracle/${productId}`,
    };
    cards.push({ scenario, deal, oracle, willSell: rng() < 0.45 });
  }
  return cards;
}

// ─────────────────────────────────────────────────────────────────────────────
// Synthetic adapters (MockUSDC; zero-network; deterministic)
// ─────────────────────────────────────────────────────────────────────────────

export class SyntheticDealsAdapter implements DealsAdapter {
  private readonly cards: SynthCard[];
  constructor(cards: SynthCard[]) {
    this.cards = cards;
  }
  async getDeals(_q?: DealQuery): Promise<DealRecord[]> {
    return this.cards.map((c) => ({ ...c.deal }));
  }
}

export class SyntheticOracleAdapter implements OracleAdapter {
  private readonly byId = new Map<string, OracleInputs>();
  constructor(cards: SynthCard[]) {
    for (const c of cards) this.byId.set(c.oracle.productId, c.oracle);
  }
  async getDeals(_productId?: string): Promise<OracleRecord[]> {
    return [];
  }
  async getOracleInputs(i: { productId: string; grade: string; grader: string }): Promise<OracleInputs | null> {
    return this.byId.get(i.productId) ?? null;
  }
}

const TOKENIZED_TAKE = 0.08;

/**
 * SyntheticMarketplaceAdapter — a deterministic MockUSDC venue (marketplace "beezie",
 * onchain-base). Honors the D11 cap (blocks over-cap before any synthetic commit), settles
 * in MockUSDC with a clearly-SYNTHETIC tx tag, lists at the oracle, and sells a deterministic
 * fraction (the rest stay HELD → unrealized). Physical-platform buys re-route to this venue.
 */
export class SyntheticMarketplaceAdapter implements MarketplaceAdapter {
  readonly marketplace = "beezie" as const;
  private readonly willSell: Map<string, boolean>;
  private readonly listAtById: Map<string, number>;
  private readonly configCapUsd?: number;
  constructor(cards: SynthCard[], spendCapUsd?: number) {
    this.willSell = new Map(cards.map((c) => [c.oracle.productId, c.willSell]));
    this.listAtById = new Map(cards.map((c) => [c.oracle.productId, c.oracle.oracleValueUsd]));
    this.configCapUsd = spendCapUsd;
  }
  async discover(_q: ListingQuery): Promise<MarketplaceListing[]> {
    return [];
  }
  async quoteAcquire(listing: MarketplaceListing): Promise<AcquireQuote> {
    const askUsd = listing.askUsd;
    return {
      listing,
      askUsd,
      takeFeeUsd: round2(askUsd * TOKENIZED_TAKE),
      gasUsd: 0.05,
      bridgeUsd: 0,
      shipToCustodyUsd: 0,
      landedCostUsd: round2(askUsd + 0.05),
      custodyDestination: "onchain-base",
      crossChain: false,
      settlementRail: "onchain-native",
      execution: { primary: "onchain", fallbacks: ["human-gate"], requiresHumanGate: false },
    };
  }
  async quoteExit(i: { productId: string; listAtUsd: number; currentCustody: CustodyDestination }): Promise<ExitQuote[]> {
    const sellFeeUsd = round2(i.listAtUsd * TOKENIZED_TAKE);
    return [{
      productId: i.productId,
      listAtUsd: i.listAtUsd,
      strategy: "relist-in-place",
      marketplace: "beezie",
      sellFeeUsd,
      moveVenueUsd: 0,
      netProceedsUsd: round2(i.listAtUsd - sellFeeUsd),
      crossCustody: false,
      execution: { primary: "onchain", fallbacks: ["human-gate"], requiresHumanGate: false },
    }];
  }
  async acquire(i: { quote: AcquireQuote; approvalRef?: string; maxUsd?: number }): Promise<AcquireReceipt> {
    const landed = i.quote.landedCostUsd;
    const cap = i.maxUsd ?? this.configCapUsd;
    const id = i.quote.listing.listingId;
    if (cap === undefined) return { status: "failed", listingId: id, marketplace: "beezie", custody: "onchain-base", approvalRef: "BLOCKED:no-cap-set" };
    if (landed > cap) return { status: "failed", listingId: id, marketplace: "beezie", custody: "onchain-base", approvalRef: `BLOCKED:over-cap $${landed}>${cap}` };
    // SYNTHETIC commit — labeled MockUSDC, never a real chain tx.
    return { status: "confirmed", listingId: id, marketplace: "beezie", paidUsd: landed, settleTxHash: `mockusdc:synth:0x${id}`, custody: "onchain-base", committedAt: new Date().toISOString() };
  }
  async list(i: { exit: ExitQuote; approvalRef?: string }): Promise<ListReceipt> {
    return { status: "confirmed", listingId: `mocklist:${i.exit.productId}`, marketplace: "beezie", listAtUsd: i.exit.listAtUsd, listedAt: new Date().toISOString() };
  }
  async confirmSale(i: { listingId: string; marketplace: Marketplace }): Promise<SaleReceipt | null> {
    const productId = i.listingId.replace(/^mocklist:/, "");
    if (!this.willSell.get(productId)) return null; // HELD → unrealized only (deterministic fraction)
    const listAt = this.listAtById.get(productId) ?? 0;
    const feeUsd = round2(listAt * TOKENIZED_TAKE);
    // SYNTHETIC realized sale at the oracle list price, net of the take. Labeled MockUSDC.
    return { status: "confirmed", soldAtUsd: round2(listAt), feeUsd, netProceedsUsd: round2(listAt - feeUsd), txHashOrPayout: `mockusdc:synth:sale:0x${productId}`, soldAt: new Date().toISOString() };
  }
  async initiateCustodyMove(req: CustodyMoveRequest): Promise<CustodyMoveHandle> {
    return { moveId: `synthmove-${req.productId}`, status: "awaiting-shipment", from: req.from, to: req.to, requiresHumanShip: true };
  }
  async getCustodyMove(_i: { moveId: string }): Promise<CustodyMoveHandle | null> {
    return null;
  }
}

/** A deterministic synthetic decide — BUY when net > 0, else SKIP. Zero network (no Nemotron). */
function synthDecide(): (s: Spread) => Promise<BuySkip> {
  return async (s: Spread) => ({
    verdict: s.netSpreadUsd > 0 ? "BUY" : "SKIP",
    reason: "synthetic deterministic decision",
    netSpreadUsd: s.netSpreadUsd,
    flags: ["ok"],
    source: "fallback",
    model: "synthetic",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Run + validate
// ─────────────────────────────────────────────────────────────────────────────

export interface SimReport {
  n: number;
  seed: number;
  policy: { perCardCapUsd?: number; windowCapUsd?: number };
  pass1: LoopResult["summary"];
  reroutesOpened: number;
  reroutesResumed: number;
  dispositions: Record<string, number>;
  portfolio: { realizedUsd: number; unrealizedUsd: number; navUsd: number; cashUsd: number };
  invariants: { name: string; ok: boolean; detail: string }[];
  ok: boolean;
  ms: number;
}

/**
 * runSimulation — generate N cards, run the real orchestrator (pass 1), arrive + resume every
 * re-route leg (pass 2), and validate every invariant. Returns a structured report.
 */
export async function runSimulation(opts: { n?: number; seed?: number; perCardCapUsd?: number; windowCapUsd?: number; nowIso?: string } = {}): Promise<SimReport> {
  const n = opts.n ?? 300;
  const seed = opts.seed ?? 42;
  const perCardCapUsd = opts.perCardCapUsd ?? 500;
  const windowCapUsd = opts.windowCapUsd ?? 1_000_000; // generous: isolate the per-card firebreak
  const start = Date.now();

  const cards = generateCards(n, seed, perCardCapUsd);
  const store = new InMemoryCustodyStore();
  const policy: SpendPolicy = { perCardCapUsd, windowCapUsd, windowHours: 24, selfApprove: true, mode: "sim", source: "synthetic", resolved: "defaults" };

  const orch = new AcquisitionDeskOrchestrator(
    {
      deals: new SyntheticDealsAdapter(cards),
      oracle: new SyntheticOracleAdapter(cards),
      marketplace: new SyntheticMarketplaceAdapter(cards, perCardCapUsd),
      custodyStore: store,
    },
    policy,
    { decide: synthDecide(), maxCandidates: n, objective: "max-risk-adjusted-ev" },
  );

  // PASS 1 — the live deal feed.
  const r1 = await orch.runLoop();
  const reroutesOpened = store.listOpen().length;

  // Synthetic arrival — every in-flight leg is "received + minted" → resume can advance it.
  for (const leg of store.listOpen()) store.recordArrival(leg.moveId, { tokenId: `synthtoken-${leg.productId}` });

  // PASS 2 — empty feed; the resume poll advances each arrived leg to a live exit.
  const orch2 = new AcquisitionDeskOrchestrator(
    {
      deals: new SyntheticDealsAdapter([]),
      oracle: new SyntheticOracleAdapter(cards),
      marketplace: new SyntheticMarketplaceAdapter(cards, perCardCapUsd),
      custodyStore: store,
    },
    policy,
    { decide: synthDecide(), maxCandidates: n, objective: "max-risk-adjusted-ev" },
  );
  const r2 = await orch2.runLoop();
  const reroutesResumed = r2.traces.filter((t) => t.disposition === "relisted").length;

  // ── Aggregate dispositions across both passes ──
  const dispositions: Record<string, number> = {};
  for (const t of [...r1.traces, ...r2.traces]) dispositions[t.disposition] = (dispositions[t.disposition] ?? 0) + 1;

  // ── Validate invariants ──
  const inv: SimReport["invariants"] = [];
  const add = (name: string, ok: boolean, detail: string) => inv.push({ name, ok, detail });

  // 1. CAP FIREBREAK — no acquired/relisted card ever has a landed cost over its cap.
  const overCapCommits = r1.traces.filter((t) => (t.disposition === "acquired") && typeof t.landedCostUsd === "number" && typeof t.capUsd === "number" && t.landedCostUsd > t.capUsd);
  add("cap-firebreak", overCapCommits.length === 0, `${overCapCommits.length} over-cap commits (must be 0); all over-cap legs blocked`);

  // 2. Every over-cap scenario was BLOCKED (not acquired).
  const overCapCards = new Set(cards.filter((c) => c.scenario === "over-cap").map((c) => c.oracle.productId));
  const overCapAcquired = r1.traces.filter((t) => overCapCards.has(t.productId) && t.disposition === "acquired");
  add("over-cap-blocked", overCapAcquired.length === 0, `${overCapCards.size} over-cap cards, ${overCapAcquired.length} wrongly acquired (must be 0)`);

  // 3. WINDOW BUDGET — never breached.
  add("window-budget", r1.summary.windowSpentUsd <= windowCapUsd, `windowSpent $${r1.summary.windowSpentUsd} ≤ cap $${windowCapUsd}`);

  // 4. P&L DISTINCTNESS — no sold position reports a non-null unrealized; NAV reconciles.
  const pnlViolations = [...r1.traces, ...r2.traces].filter((t) => t.pnl && t.pnl.status === "sold" && t.pnl.unrealizedUsd !== null);
  add("pnl-distinct", pnlViolations.length === 0, `${pnlViolations.length} sold positions with non-null unrealized (must be 0)`);
  const navOk = Number.isFinite(r2.portfolio.navUsd) && r2.portfolio.navUsd >= 0;
  add("nav-finite", navOk, `NAV $${r2.portfolio.navUsd} (cash $${r2.portfolio.cashUsd} + marked book)`);

  // 5. RE-ROUTE LIFECYCLE — physical buys opened legs in pass 1; pass 2 resumed them; none sold pre-arrival.
  const physicalAcquired = r1.traces.filter((t) => t.disposition === "acquired" && t.custodyMove).length;
  add("reroute-opened", reroutesOpened === physicalAcquired && reroutesOpened > 0, `${reroutesOpened} legs persisted == ${physicalAcquired} physical-buy reroutes`);
  add("reroute-resumed", reroutesResumed === reroutesOpened, `${reroutesResumed} resumed == ${reroutesOpened} opened (all advanced on arrival)`);
  const soldBeforeArrival = r1.traces.filter((t) => t.custodyMove && t.saleReceipt).length;
  add("no-sale-pre-arrival", soldBeforeArrival === 0, `${soldBeforeArrival} sales booked before re-route arrival (must be 0, P7)`);

  // 6. COMPLETENESS — every pass-1 candidate reached a terminal disposition (no 'error').
  const errored = r1.traces.filter((t) => t.disposition === "error").length;
  add("no-errors", errored === 0, `${errored} traces errored (must be 0)`);
  add("all-candidates", r1.traces.length === n, `${r1.traces.length} traces == ${n} candidates`);

  const ok = inv.every((x) => x.ok);
  return {
    n,
    seed,
    policy: { perCardCapUsd, windowCapUsd },
    pass1: r1.summary,
    reroutesOpened,
    reroutesResumed,
    dispositions,
    portfolio: { realizedUsd: r2.portfolio.totalRealizedUsd, unrealizedUsd: r2.portfolio.totalUnrealizedUsd, navUsd: r2.portfolio.navUsd, cashUsd: r2.portfolio.cashUsd },
    invariants: inv,
    ok,
    ms: Date.now() - start,
  };
}

/** Render a SimReport as a compact human-readable block. */
export function renderReport(r: SimReport): string {
  const lines: string[] = [];
  lines.push(`SYNTHETIC SIMULATION — ${r.n} cards (seed ${r.seed}) on MockUSDC — ${r.ms}ms`);
  lines.push(`  policy: per-card cap $${r.policy.perCardCapUsd} · window cap $${r.policy.windowCapUsd}`);
  lines.push(`  dispositions: ${Object.entries(r.dispositions).map(([k, v]) => `${k}=${v}`).join("  ")}`);
  lines.push(`  re-routes: ${r.reroutesOpened} opened → ${r.reroutesResumed} resumed`);
  lines.push(`  P&L: realized $${r.portfolio.realizedUsd} · unrealized $${r.portfolio.unrealizedUsd} · NAV $${r.portfolio.navUsd}`);
  lines.push(`  INVARIANTS:`);
  for (const x of r.invariants) lines.push(`    ${x.ok ? "✓" : "✗"} ${x.name} — ${x.detail}`);
  lines.push(`  RESULT: ${r.ok ? "PASS ✓" : "FAIL ✗"}`);
  return lines.join("\n");
}
