/**
 * deals.ts — SlabClawDealsAdapter (the under-oracle deal-source over the LIVE feed).
 *
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║ COMMODITY SWAP SEAM #1 of 3 — the DEAL SOURCE (what items flow through the desk).   ║
 * ║   This is the FIRST of the three swap seams that make the desk generalizable beyond ║
 * ║   graded Pokémon cards (the instance-#1 commodity). To run the SAME engine over a   ║
 * ║   different commodity (sealed wax, watches, sneakers, comics, art), implement        ║
 * ║   `DealsAdapter` against YOUR listing source and inject it at buildOrchestrator()    ║
 * ║   — the orchestrator never hand-rolls a fetch and never assumes "card". The record   ║
 * ║   shape (DealRecord, lib/adapters/index.ts) is the commodity contract: identity      ║
 * ║   (cardId/id), an ASK side (venue/price/grade), and the oracle value-truth carried   ║
 * ║   verbatim. `grade`/`grader` are the quality axis — for a commodity with no grading   ║
 * ║   they collapse to a single condition string; the engine reads them, never hardcodes ║
 * ║   them. Companion seams: OracleAdapter (oracle.ts = value-truth) + MarketplaceAdapter ║
 * ║   (beezie.ts/ebay.ts = buy/list/move venue).                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 *
 * Implements the RING-2 `DealsAdapter` contract. It owns the single `fetch` to the
 * SlabClaw cross-marketplace deal feed (`GET ${SLABCLAW_API_URL}/api/deals/listings` —
 * the 10+ marketplace aggregation, NOT /api/oracle). This is the EXACT fetch that used
 * to live inline in `spread-detector.ts:125-133` (`fetchLiveDeals`); it now lives behind
 * the adapter seam so the service consumes an INJECTED source and a cloner can swap it.
 *
 * ── HONESTY / live-vs-stub posture (P7) ────────────────────────────────────────────
 *   getDeals()  LIVE — real HTTP read of the live feed; every record carries the venue
 *               ask + the oracle value-truth + provenance VERBATIM (oracleSource tier,
 *               confidence, freshness/stale, url). NOTHING is recomputed (P3).
 *   The mock twin is `deals.mock.ts` (deterministic, zero-network) — labeled MOCK there.
 *
 * NO randomness, NO fabricated listings, NO invented venues anywhere in this file.
 */

import type { DealsAdapter, DealsConfig, DealQuery, DealRecord } from "./index.ts";

/** The live feed's envelope (the subset we read). */
interface DealsListingsResponse {
  ok?: boolean;
  dealCount?: number;
  deals?: DealRecord[];
}

export interface SlabClawDealsAdapterOptions extends Partial<DealsConfig> {
  /** The deal-feed base url. Defaults to SLABCLAW_API_URL / https://api.slabclaw.com. */
  apiUrl?: string;
  /** Optional auth for a private feed. */
  apiKey?: string;
  /** Network timeout (ms). Default 20s. */
  timeoutMs?: number;
  /** Injected fetch (tests). Defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

const DEFAULT_TIMEOUT_MS = 20_000;

/**
 * Deal-quality floor (P7 honesty): the SlabClaw deal feed occasionally surfaces a listing priced
 * MORE than this far below its oracle. At that depth a "discount" is almost never a real bargain —
 * it's a data problem (a mislabeled grader, a wrong variant/edition, or a stale oracle), e.g. an
 * Arena Club 9.5 slab whose listing title says "PSA 9" and gets priced against PSA-9 comps. Until
 * the deal feed itself is debugged, the desk SKIPS these implausibly-deep discounts rather than act
 * on bad data — we'd rather miss a genuine steal than buy on a mislabel. `discount` is a positive
 * percent (e.g. 55 = 55% under oracle). Documented honestly in the VITRINE Docs tab.
 */
const MAX_PLAUSIBLE_DISCOUNT_PCT = 30;

/** Whether a deal's discount is shallow enough to be plausibly real (not a bad-data false bargain). */
function isPlausibleDiscount(d: DealRecord): boolean {
  // Prefer the explicit `discount` (% under oracle); fall back to `-spread` when discount is absent.
  const pct = typeof d.discount === "number" ? d.discount : typeof d.spread === "number" ? -d.spread : null;
  if (pct == null || !Number.isFinite(pct)) return true; // no signal ⇒ don't drop it
  return pct <= MAX_PLAUSIBLE_DISCOUNT_PCT;
}

/**
 * Read the live cross-marketplace deal feed behind the `DealsAdapter` seam.
 * LIVE — this is the only place the deal-endpoint `fetch` lives in the loop path.
 */
export class SlabClawDealsAdapter implements DealsAdapter {
  /** Honesty label (P7): this adapter reads the real live feed. */
  readonly mode = "live" as const;
  private readonly apiUrl: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: SlabClawDealsAdapterOptions = {}) {
    // Honest default: the public moat endpoint (matches the old inline fetch).
    this.apiUrl = (opts.apiUrl ?? "https://api.slabclaw.com").replace(/\/+$/, "");
    this.apiKey = opts.apiKey;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  /**
   * getDeals — read live under-oracle candidates from the deal feed.
   * Returns the raw records (ask + oracle value-truth + provenance carried verbatim).
   * Client-side scoping (productId/grader/grade/maxAsk/limit) is applied AFTER the read
   * so the contract works against the existing endpoint without a query-param dependency.
   */
  async getDeals(query: DealQuery = {}): Promise<DealRecord[]> {
    const url = `${this.apiUrl}/api/deals/listings`;
    const headers: Record<string, string> = { accept: "application/json" };
    if (this.apiKey) headers.authorization = `Bearer ${this.apiKey}`;

    const res = await this.fetchImpl(url, { headers, signal: AbortSignal.timeout(this.timeoutMs) });
    if (!res.ok) throw new Error(`deals ${url} -> HTTP ${res.status}`);
    const body = (await res.json()) as DealsListingsResponse;
    const raw = Array.isArray(body.deals) ? body.deals : [];
    // Deal-quality floor: drop implausibly-deep discounts (likely bad data) BEFORE the engine
    // ever sees them, so a mislabel can't become a lead, a buy, or a poisoned P&L. (P7 / §honesty.)
    const deals = raw.filter(isPlausibleDiscount);
    return applyDealQuery(deals, query);
  }
}

/**
 * Apply a `DealQuery` scope to a raw deal list (shared by the live + mock adapters so the
 * scoping semantics are IDENTICAL across the seam). All filters are optional.
 */
export function applyDealQuery(deals: DealRecord[], query: DealQuery = {}): DealRecord[] {
  let out = deals;
  if (query.productId) {
    out = out.filter((d) => d.cardId === query.productId || d.id === query.productId);
  }
  if (query.grader) {
    const g = query.grader.toLowerCase();
    out = out.filter((d) => (d.grader ?? "").toLowerCase() === g);
  }
  if (query.grade) {
    // Match against the listing grade or the oracle-priced grade (either is a valid join).
    const want = String(query.grade).toLowerCase();
    out = out.filter((d) => String(d.listingGrade ?? "").toLowerCase().includes(want) || String(d.spreadGrade ?? "").toLowerCase().includes(want));
  }
  if (typeof query.maxAskUsd === "number") {
    out = out.filter((d) => typeof d.listingPrice === "number" && d.listingPrice <= query.maxAskUsd!);
  }
  if (typeof query.limit === "number" && query.limit >= 0) {
    out = out.slice(0, query.limit);
  }
  return out;
}
