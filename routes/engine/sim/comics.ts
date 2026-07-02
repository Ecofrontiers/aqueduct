/**
 * comics.ts — SECOND-COMMODITY proof: graded comics on the SAME engine (ADR-0001, D2).
 *
 * THROUGHLINE B (generalizable): graded Pokémon cards are instance #1, not the engine. This
 * file proves it — a COMPLETELY DIFFERENT commodity (CGC/CBCS-slabbed key-issue comic books)
 * with its OWN Deals / Oracle / Marketplace adapter implementations of the EXACT same RING-2
 * interfaces (`engine/lib/adapters/index.ts`), plus a tiny `CommodityConfig`, plugged into the
 * UNCHANGED `AcquisitionDeskOrchestrator`. The orchestrator is not edited, not subclassed, not
 * parameterized — only the injected adapters differ. Same loop in, comic dispositions + P&L out.
 *
 * What is DIFFERENT from cards (the "is it really agnostic?" proof surface):
 *   - assets:        comic books (Amazing Spider-Man #300, Hulk #181, …), not Pokémon cards
 *   - authenticator: CGC / CBCS slab grade (0.5–10.0 scale), not PSA/CGC/BGS card grades
 *   - oracle:        GoCollect-style sold comps (mocked) over comic FMV, not PriceCharting
 *   - venues:        eBay (physical raw/slabbed) + a tokenized comic vault, re-routed to mint
 *
 * What is the SAME (the seam that makes it work):
 *   - the RING-2 interfaces (DealsAdapter / OracleAdapter / MarketplaceAdapter)
 *   - the orchestrator's oracle-as-suspect gate, grade-match gate, Nemotron BUY/SKIP slot,
 *     routes-plan, best-net-exit, D11 cap firebreak, re-route lifecycle, and P&L book
 *   - the three PayGuard invariants (the orchestrator's shared cap/firebreak path)
 *
 * Everything here is explicitly SYNTHETIC / MOCK (settlement labeled `mockusdc:comic:…`); it
 * never touches a network, a chain, or real funds (P7). Deterministic from a seed.
 */

import { AcquisitionDeskOrchestrator, type LoopResult, type CardTrace } from "../services/orchestrator.ts";
import type {
  DealsAdapter,
  DealRecord,
  DealQuery,
  OracleAdapter,
  OracleInputs,
  OracleRecord,
  OracleTier,
  OracleFreshness,
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

// ─────────────────────────────────────────────────────────────────────────────
// CommodityConfig — the small, swappable description of THIS commodity (ADR-0001).
//   A cloner retargets the desk by supplying one of these + the three adapters.
//   Cards would supply a card-flavored config; comics supply this one. The engine
//   never reads commodity-specific strings — only the adapters + this config do.
// ─────────────────────────────────────────────────────────────────────────────

export interface CommodityConfig {
  /** Human label for the commodity (surfaced in the report header). */
  label: string;
  /** The asset noun (singular) — "comic", "card", "sneaker". UI/report copy only. */
  assetNoun: string;
  /** The authenticator/attestation set — the generic of "grader". For comics: CGC/CBCS. */
  authenticators: string[];
  /** Example asset names for the synthetic generator (the generic of NAMES). */
  assetNames: string[];
  /** Physical buy venues (raw/slabbed in hand → must re-route to tokenize). */
  physicalVenues: Marketplace[];
  /** The tokenized vault venue the re-route mints into (the exit custody). */
  tokenizedVenue: Marketplace;
  /** The custody label for the tokenized vault (drives the re-route detection). */
  tokenizedCustody: CustodyDestination;
  /** The physical custody label for an in-hand slabbed asset awaiting tokenization. */
  physicalCustody: CustodyDestination;
}

/** The graded-comics commodity config (the SECOND commodity — ADR-0001, D2). */
export const COMICS_CONFIG: CommodityConfig = {
  label: "Graded comics (CGC/CBCS key issues)",
  assetNoun: "comic",
  authenticators: ["CGC", "CBCS"],
  assetNames: [
    "Amazing Spider-Man #300",
    "Incredible Hulk #181",
    "Giant-Size X-Men #1",
    "New Mutants #98",
    "Batman #423",
    "X-Men #1 (1991)",
    "Teenage Mutant Ninja Turtles #1",
    "Spawn #1",
    "Saga #1",
    "Walking Dead #1",
    "House of Secrets #92",
    "Marvel Spotlight #5",
  ],
  // Comics are bought PHYSICAL (eBay raw/slabbed), then re-routed to a tokenized comic vault.
  physicalVenues: ["ebay", "cardmarket"],
  tokenizedVenue: "beezie", // the tokenized vault venue (re-uses the Base-tokenized seam)
  tokenizedCustody: "onchain-base",
  physicalCustody: "self-custody",
};

// ─────────────────────────────────────────────────────────────────────────────
// Synthetic comic generation — the SAME scenario surface as cards, but comic-shaped.
// ─────────────────────────────────────────────────────────────────────────────

type Scenario = "buy-physical-reroute" | "buy-tokenized" | "over-cap" | "skip-negative" | "skip-thin" | "skip-stale";

const SCENARIO_WEIGHTS: Array<[Scenario, number]> = [
  ["buy-physical-reroute", 0.42], // comics are bought physical → re-route to the comic vault
  ["buy-tokenized", 0.18],
  ["over-cap", 0.12],
  ["skip-negative", 0.1],
  ["skip-thin", 0.09],
  ["skip-stale", 0.09],
];

/** One generated comic = a deal + its oracle truth + the scenario it should exercise. */
export interface SynthComic {
  scenario: Scenario;
  deal: DealRecord;
  oracle: OracleInputs;
  willSell: boolean;
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
 * Generate `n` synthetic comics deterministically from `seed`. Comic grades run the CGC 0.5–10
 * scale (we sample the desirable 6.0–9.8 band). The per-card cap is needed so the over-cap
 * scenario can place an ask above it.
 */
export function generateComics(n: number, seed: number, perCardCapUsd: number, cfg: CommodityConfig = COMICS_CONFIG): SynthComic[] {
  const rng = mulberry32(seed);
  const comics: SynthComic[] = [];
  for (let i = 0; i < n; i++) {
    const scenario = weightedScenario(rng);
    const name = pick(rng, cfg.assetNames);
    const grader = pick(rng, cfg.authenticators);
    // CGC comic grade scale: half-point steps, 6.0–9.8 (the desirable band). e.g. "CGC 9.4".
    const gradeNum = round2(6.0 + Math.floor(rng() * 8) * 0.5);
    const grade = `${grader} ${gradeNum}`;
    const productId = `comic-${i}`;
    const baseAsk = round2(40 + rng() * 1200); // $40–$1240 normal band (key issues run high)

    let ask = baseAsk;
    let oracleValueUsd = round2(ask * (1.3 + rng() * 0.5)); // +30–80% edge
    let platform: Marketplace = pick(rng, cfg.physicalVenues);
    let oracleSource: OracleTier = "pc_sold"; // (tier vocabulary reused; comic oracle = GoCollect-style sold comps)
    let oracleSoldCount = 3 + Math.floor(rng() * 8);
    let freshness: OracleFreshness = "fresh";
    let oracleConfidence = round2(0.75 + rng() * 0.2);

    switch (scenario) {
      case "buy-tokenized":
        platform = cfg.tokenizedVenue; // already tokenized → relist-in-place, no re-route
        break;
      case "over-cap":
        ask = round2(perCardCapUsd + 80 + rng() * 4000);
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
      case "buy-physical-reroute":
      default:
        platform = pick(rng, cfg.physicalVenues); // physical buy → re-route to the comic vault
        break;
    }

    const deal: DealRecord = {
      cardId: productId, // RING-2 join key (interface names it cardId; here it is the comic id)
      name,
      set: "Key Issue",
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
      oracleUrl: `synthetic://gocollect/${productId}`,
    };
    comics.push({ scenario, deal, oracle, willSell: rng() < 0.45 });
  }
  return comics;
}

// ─────────────────────────────────────────────────────────────────────────────
// Comic adapters — distinct implementations of the SAME RING-2 interfaces.
// ─────────────────────────────────────────────────────────────────────────────

export class ComicsDealsAdapter implements DealsAdapter {
  readonly mode = "mock" as const;
  private readonly comics: SynthComic[];
  constructor(comics: SynthComic[]) {
    this.comics = comics;
  }
  async getDeals(_q?: DealQuery): Promise<DealRecord[]> {
    return this.comics.map((c) => ({ ...c.deal }));
  }
}

export class ComicsOracleAdapter implements OracleAdapter {
  readonly mode = "mock" as const;
  private readonly byId = new Map<string, OracleInputs>();
  constructor(comics: SynthComic[]) {
    for (const c of comics) this.byId.set(c.oracle.productId, c.oracle);
  }
  async getDeals(_productId?: string): Promise<OracleRecord[]> {
    return [];
  }
  async getOracleInputs(i: { productId: string; grade: string; grader: string }): Promise<OracleInputs | null> {
    return this.byId.get(i.productId) ? { ...this.byId.get(i.productId)! } : null;
  }
}

const COMIC_VAULT_TAKE = 0.085; // tokenized comic-vault take (~8.5%)

/**
 * ComicsMarketplaceAdapter — a deterministic MockUSDC tokenized comic vault (marketplace
 * "beezie" / onchain-base, re-using the Base-tokenized seam). Honors the D11 cap (blocks
 * over-cap before any synthetic commit), settles in MockUSDC with a clearly-SYNTHETIC tx tag,
 * lists at the oracle, and sells a deterministic fraction (the rest stay HELD → unrealized).
 * Physical eBay/cardmarket buys re-route here (ship → mint into the comic vault).
 */
export class ComicsMarketplaceAdapter implements MarketplaceAdapter {
  readonly marketplace: Marketplace;
  private readonly willSell: Map<string, boolean>;
  private readonly listAtById: Map<string, number>;
  private readonly configCapUsd?: number;
  private readonly custody: CustodyDestination;
  constructor(comics: SynthComic[], spendCapUsd?: number, cfg: CommodityConfig = COMICS_CONFIG) {
    this.marketplace = cfg.tokenizedVenue;
    this.custody = cfg.tokenizedCustody;
    this.willSell = new Map(comics.map((c) => [c.oracle.productId, c.willSell]));
    this.listAtById = new Map(comics.map((c) => [c.oracle.productId, c.oracle.oracleValueUsd]));
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
      takeFeeUsd: round2(askUsd * COMIC_VAULT_TAKE),
      gasUsd: 0.05,
      bridgeUsd: 0,
      shipToCustodyUsd: 0,
      landedCostUsd: round2(askUsd + 0.05),
      custodyDestination: this.custody,
      crossChain: false,
      settlementRail: "onchain-native",
      execution: { primary: "onchain", fallbacks: ["human-gate"], requiresHumanGate: false },
    };
  }
  async quoteExit(i: { productId: string; listAtUsd: number; currentCustody: CustodyDestination }): Promise<ExitQuote[]> {
    const sellFeeUsd = round2(i.listAtUsd * COMIC_VAULT_TAKE);
    return [{
      productId: i.productId,
      listAtUsd: i.listAtUsd,
      strategy: "relist-in-place",
      marketplace: this.marketplace,
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
    // INVARIANT 2 (PayGuard) — fail closed with no resolvable cap; never an uncapped spend.
    if (cap === undefined) return { status: "failed", listingId: id, marketplace: this.marketplace, custody: this.custody, approvalRef: "BLOCKED:no-cap-set" };
    if (landed > cap) return { status: "failed", listingId: id, marketplace: this.marketplace, custody: this.custody, approvalRef: `BLOCKED:over-cap $${landed}>${cap}` };
    return { status: "confirmed", listingId: id, marketplace: this.marketplace, paidUsd: landed, settleTxHash: `mockusdc:comic:0x${id}`, custody: this.custody, committedAt: new Date().toISOString() };
  }
  async list(i: { exit: ExitQuote; approvalRef?: string }): Promise<ListReceipt> {
    return { status: "confirmed", listingId: `comiclist:${i.exit.productId}`, marketplace: this.marketplace, listAtUsd: i.exit.listAtUsd, listedAt: new Date().toISOString() };
  }
  async confirmSale(i: { listingId: string; marketplace: Marketplace }): Promise<SaleReceipt | null> {
    const productId = i.listingId.replace(/^comiclist:/, "");
    if (!this.willSell.get(productId)) return null; // HELD → unrealized only (deterministic fraction)
    const listAt = this.listAtById.get(productId) ?? 0;
    const feeUsd = round2(listAt * COMIC_VAULT_TAKE);
    return { status: "confirmed", soldAtUsd: round2(listAt), feeUsd, netProceedsUsd: round2(listAt - feeUsd), txHashOrPayout: `mockusdc:comic:sale:0x${productId}`, soldAt: new Date().toISOString() };
  }
  async initiateCustodyMove(req: CustodyMoveRequest): Promise<CustodyMoveHandle> {
    // Physical comic ship-in → mint into the comic vault. Human drop-off (inherently human, off-cap).
    return { moveId: `comicmove-${req.productId}`, status: "awaiting-shipment", from: req.from, to: req.to, requiresHumanShip: true };
  }
  async getCustodyMove(_i: { moveId: string }): Promise<CustodyMoveHandle | null> {
    return null;
  }
}

/**
 * A deterministic comic decide — the Nemotron BUY/SKIP slot, filled by a zero-network
 * deterministic function (BUY when net > 0, else SKIP). The orchestrator's real path calls
 * the actual Nemotron brain; here we inject a labeled fallback so the run is offline + stable.
 */
export function comicDecide(): (s: Spread) => Promise<BuySkip> {
  return async (s: Spread) => ({
    verdict: s.netSpreadUsd > 0 ? "BUY" : "SKIP",
    reason: "synthetic deterministic decision (comics commodity)",
    netSpreadUsd: s.netSpreadUsd,
    flags: ["ok"],
    source: "fallback",
    model: "synthetic-comics",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Run + report
// ─────────────────────────────────────────────────────────────────────────────

export interface ComicsRunReport {
  commodity: string;
  n: number;
  seed: number;
  policy: { perCardCapUsd?: number; windowCapUsd?: number };
  pass1: LoopResult["summary"];
  reroutesOpened: number;
  reroutesResumed: number;
  dispositions: Record<string, number>;
  portfolio: { realizedUsd: number; unrealizedUsd: number; navUsd: number; cashUsd: number };
  sampleTraces: Array<{ name: string; grade: string; disposition: string; landedCostUsd?: number; pnlStatus?: string }>;
  invariants: { name: string; ok: boolean; detail: string }[];
  ok: boolean;
  ms: number;
}

/**
 * runComicsLoop — generate N comics, run the REAL (unmodified) orchestrator over them (pass 1),
 * arrive + resume every re-route leg (pass 2), validate the shared invariants, and return a
 * structured report. The orchestrator is identical to the cards path; only the adapters differ.
 */
export async function runComicsLoop(opts: { n?: number; seed?: number; perCardCapUsd?: number; windowCapUsd?: number; cfg?: CommodityConfig } = {}): Promise<ComicsRunReport> {
  const cfg = opts.cfg ?? COMICS_CONFIG;
  const n = opts.n ?? 200;
  const seed = opts.seed ?? 24;
  const perCardCapUsd = opts.perCardCapUsd ?? 1500; // comics run higher than cards
  const windowCapUsd = opts.windowCapUsd ?? 1_000_000;
  const start = Date.now();

  const comics = generateComics(n, seed, perCardCapUsd, cfg);
  const store = new InMemoryCustodyStore();
  const policy: SpendPolicy = { perCardCapUsd, windowCapUsd, windowHours: 24, selfApprove: true, mode: "sim", source: "comics-sim", resolved: "defaults" };

  // SAME orchestrator class — comic adapters injected. Physical eBay buys re-route to the comic vault.
  const orch = new AcquisitionDeskOrchestrator(
    {
      deals: new ComicsDealsAdapter(comics),
      oracle: new ComicsOracleAdapter(comics),
      marketplace: new ComicsMarketplaceAdapter(comics, perCardCapUsd, cfg),
      custodyStore: store,
    },
    policy,
    // The comic vault is the single trading adapter; its relist-in-place exit (onchain-base) is on a
    // DIFFERENT custody than a physical eBay buy (psa-vault) — so a physical buy re-routes (ship-in →
    // mint) before it can list, while an already-tokenized buy relists in place. (Same mechanism the
    // cards sim uses: one vault adapter, no excludeRelistInPlaceFor.)
    { decide: comicDecide(), maxCandidates: n, objective: "max-risk-adjusted-ev" },
  );

  // PASS 1 — the live deal feed.
  const r1 = await orch.runLoop();
  const reroutesOpened = store.listOpen().length;

  // Synthetic arrival — every in-flight physical leg arrives + mints → resume can advance it.
  for (const leg of store.listOpen()) store.recordArrival(leg.moveId, { tokenId: `comictoken-${leg.productId}` });

  // PASS 2 — empty feed; the resume poll advances each arrived leg to a live comic-vault exit.
  const orch2 = new AcquisitionDeskOrchestrator(
    {
      deals: new ComicsDealsAdapter([]),
      oracle: new ComicsOracleAdapter(comics),
      marketplace: new ComicsMarketplaceAdapter(comics, perCardCapUsd, cfg),
      custodyStore: store,
    },
    policy,
    { decide: comicDecide(), maxCandidates: n, objective: "max-risk-adjusted-ev" },
  );
  const r2 = await orch2.runLoop();
  const reroutesResumed = r2.traces.filter((t) => t.disposition === "relisted").length;

  const dispositions: Record<string, number> = {};
  for (const t of [...r1.traces, ...r2.traces]) dispositions[t.disposition] = (dispositions[t.disposition] ?? 0) + 1;

  // ── Validate the shared invariants on the COMICS run (same firebreaks, different commodity) ──
  const inv: ComicsRunReport["invariants"] = [];
  const add = (name: string, ok: boolean, detail: string) => inv.push({ name, ok, detail });

  // INVARIANT 2 — the D11 cap firebreak: no acquired comic ever has a landed cost over its cap.
  const overCapCommits = r1.traces.filter((t) => t.disposition === "acquired" && typeof t.landedCostUsd === "number" && typeof t.capUsd === "number" && (t.landedCostUsd as number) > (t.capUsd as number));
  add("cap-firebreak", overCapCommits.length === 0, `${overCapCommits.length} over-cap commits (must be 0)`);
  const overCapCards = new Set(comics.filter((c) => c.scenario === "over-cap").map((c) => c.oracle.productId));
  const overCapAcquired = r1.traces.filter((t) => overCapCards.has(t.productId) && t.disposition === "acquired");
  add("over-cap-blocked", overCapAcquired.length === 0, `${overCapCards.size} over-cap comics, ${overCapAcquired.length} wrongly acquired (must be 0)`);

  add("window-budget", r1.summary.windowSpentUsd <= windowCapUsd, `windowSpent $${r1.summary.windowSpentUsd} ≤ cap $${windowCapUsd}`);

  const pnlViolations = [...r1.traces, ...r2.traces].filter((t) => t.pnl && t.pnl.status === "sold" && t.pnl.unrealizedUsd !== null);
  add("pnl-distinct", pnlViolations.length === 0, `${pnlViolations.length} sold positions with non-null unrealized (must be 0)`);
  add("nav-finite", Number.isFinite(r2.portfolio.navUsd) && r2.portfolio.navUsd >= 0, `NAV $${r2.portfolio.navUsd}`);

  // RE-ROUTE — physical comic buys opened legs in pass 1; pass 2 resumed them; none sold pre-arrival.
  const physicalAcquired = r1.traces.filter((t) => t.disposition === "acquired" && t.custodyMove).length;
  add("reroute-opened", reroutesOpened === physicalAcquired && reroutesOpened > 0, `${reroutesOpened} legs persisted == ${physicalAcquired} physical-buy reroutes`);
  add("reroute-resumed", reroutesResumed === reroutesOpened, `${reroutesResumed} resumed == ${reroutesOpened} opened`);

  const errored = r1.traces.filter((t) => t.disposition === "error").length;
  add("no-errors", errored === 0, `${errored} traces errored (must be 0)`);
  add("all-candidates", r1.traces.length === n, `${r1.traces.length} traces == ${n} candidates`);

  // PROOF of a non-empty result — the loop produced acquisitions for this commodity.
  const acquiredOrRelisted = (dispositions["acquired"] ?? 0) + (dispositions["relisted"] ?? 0);
  add("produced-acquisitions", acquiredOrRelisted > 0, `${acquiredOrRelisted} comics acquired/relisted (must be > 0 — proves the loop ran on this commodity)`);

  // A small honest sample of traces for the report (the proof you can read).
  const sampleTraces = pickSample([...r1.traces, ...r2.traces]).map((t) => ({
    name: t.name,
    grade: `${t.grader} ${t.grade.replace(/^[A-Za-z]+\s*/, "")}`.trim(),
    disposition: t.disposition,
    landedCostUsd: t.landedCostUsd,
    pnlStatus: t.pnl?.status,
  }));

  const ok = inv.every((x) => x.ok);
  return {
    commodity: cfg.label,
    n,
    seed,
    policy: { perCardCapUsd, windowCapUsd },
    pass1: r1.summary,
    reroutesOpened,
    reroutesResumed,
    dispositions,
    portfolio: { realizedUsd: r2.portfolio.totalRealizedUsd, unrealizedUsd: r2.portfolio.totalUnrealizedUsd, navUsd: r2.portfolio.navUsd, cashUsd: r2.portfolio.cashUsd },
    sampleTraces,
    invariants: inv,
    ok,
    ms: Date.now() - start,
  };
}

/** Pick a readable spread of traces: one of each disposition (up to a cap), for the report. */
function pickSample(traces: CardTrace[]): CardTrace[] {
  const seen = new Set<string>();
  const out: CardTrace[] = [];
  for (const t of traces) {
    if (!seen.has(t.disposition)) {
      seen.add(t.disposition);
      out.push(t);
    }
    if (out.length >= 8) break;
  }
  return out;
}

/** Render a ComicsRunReport as a compact human-readable block. */
export function renderComicsReport(r: ComicsRunReport): string {
  const lines: string[] = [];
  lines.push(`SECOND-COMMODITY LOOP — ${r.commodity}`);
  lines.push(`  ${r.n} comics (seed ${r.seed}) on MockUSDC — SAME engine, comic adapters injected — ${r.ms}ms`);
  lines.push(`  policy: per-asset cap $${r.policy.perCardCapUsd} · window cap $${r.policy.windowCapUsd}`);
  lines.push(`  dispositions: ${Object.entries(r.dispositions).map(([k, v]) => `${k}=${v}`).join("  ")}`);
  lines.push(`  re-routes: ${r.reroutesOpened} opened → ${r.reroutesResumed} resumed (ship-in → comic-vault mint)`);
  lines.push(`  P&L: realized $${r.portfolio.realizedUsd} · unrealized $${r.portfolio.unrealizedUsd} · NAV $${r.portfolio.navUsd}`);
  lines.push(`  SAMPLE TRACES:`);
  for (const s of r.sampleTraces) {
    const landed = typeof s.landedCostUsd === "number" ? ` · landed $${s.landedCostUsd}` : "";
    const pnl = s.pnlStatus ? ` · pnl:${s.pnlStatus}` : "";
    lines.push(`    · ${s.name} [${s.grade}] → ${s.disposition}${landed}${pnl}`);
  }
  lines.push(`  INVARIANTS (shared PayGuard firebreaks, on the comics commodity):`);
  for (const x of r.invariants) lines.push(`    ${x.ok ? "✓" : "✗"} ${x.name} — ${x.detail}`);
  lines.push(`  RESULT: ${r.ok ? "PASS ✓" : "FAIL ✗"}`);
  return lines.join("\n");
}
