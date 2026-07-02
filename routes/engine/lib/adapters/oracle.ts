/**
 * oracle.ts — SlabClawOracleAdapter (the value-truth, but the SUSPECT, over the LIVE feed).
 *
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║ COMMODITY SWAP SEAM #2 of 3 — the ORACLE (what each item is worth).                 ║
 * ║   Swap this to point the SAME engine at a DIFFERENT value-truth for a different      ║
 * ║   commodity: a watch price guide, a sneaker index, a comics census, an art comp set. ║
 * ║   Implement `OracleAdapter` (getDeals + getOracleInputs) and inject it — the          ║
 * ║   orchestration ranks/down-weights on tier + freshness + sold-count and NEVER          ║
 * ║   recomputes the value (P3, oracle-as-suspect). The tier strings here (pc_sold …)     ║
 * ║   are SlabClaw's PriceCharting hierarchy; a different commodity maps its own           ║
 * ║   provenance tiers onto OracleTier — the engine only cares about the RELATIVE rank     ║
 * ║   (graderMatched > estimate > active) and the freshness gate, not the literal source. ║
 * ║   Companion seams: DealsAdapter (deals.ts = deal source) + MarketplaceAdapter         ║
 * ║   (beezie.ts/ebay.ts = buy/list/move venue).                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 *
 * Implements the RING-2 `OracleAdapter` contract. Reads the grade-matched PriceCharting
 * tier engine's fair value per product×grade from the live SlabClaw feed
 * (`GET ${SLABCLAW_API_URL}/api/deals/listings` — each record carries the oracle value-truth
 * joined to its listing). The oracle is the **SUSPECT** (P3): this adapter SURFACES the tier
 * (T1..T6) + freshness + confidence + sold-count + provenance url — and NEVER recomputes the
 * value. The orchestration ranks/down-weights on these fields; it does not re-derive the oracle source.
 *
 * ── HONESTY / live-vs-stub posture (P7) ────────────────────────────────────────────
 *   getDeals()         LIVE — real HTTP read; returns OracleRecord[] carrying
 *                      oracleSource (tier) + oracleConfidence + oracleSoldCount + freshness.
 *   getOracleInputs()  LIVE — the value-truth inputs for ONE product×grade for the BUY/SKIP
 *                      brain; returns null when the feed has no grade-matched value (honest).
 *   The mock twin is `oracle.mock.ts` (deterministic, zero-network) — labeled MOCK there.
 *
 * NO randomness, NO fabricated values, NO recomputation of the oracle source anywhere in this file.
 */

import type {
  OracleAdapter,
  OracleConfig,
  OracleRecord,
  OracleInputs,
  OracleTier,
  OracleFreshness,
  DealRecord,
} from "./index.ts";

/** The live feed's envelope (the subset we read). Same endpoint as the deal feed. */
interface DealsListingsResponse {
  ok?: boolean;
  deals?: DealRecord[];
}

export interface SlabClawOracleAdapterOptions extends Partial<OracleConfig> {
  apiUrl?: string;
  apiKey?: string;
  /** The fresh/stale boundary (ms). Default 30d (SOLD_FRESHNESS_MS). */
  freshnessMs?: number;
  /** Network timeout (ms). Default 20s. */
  timeoutMs?: number;
  /** In-memory feed cache TTL (ms). The feed is identical for every product in a loop, so
   *  getOracleInputs (called once per card) must NOT re-fetch 1MB per card. Default 60s; 0 disables. */
  feedTtlMs?: number;
  /** Injected fetch (tests). Defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

/** 30 days — the fresh/stale boundary (SOLD_FRESHNESS_MS, pricecharting.mjs). */
export const DEFAULT_FRESHNESS_MS = 30 * 24 * 60 * 60 * 1000;
/** 365 days — the hard-stale boundary (>1y last-sale, T5.8). */
export const HARD_STALE_MS = 365 * 24 * 60 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 20_000;

/** Known live oracle-source strings → the typed OracleTier (the hierarchy the engine ranks on). */
const KNOWN_TIERS = new Set<OracleTier>([
  "pc_sold",
  "pc_sold_thin",
  "pc_grader_est",
  "pc_last",
  "pc_last_est",
  "pc_display",
  "pc_grade_equiv",
  "pc_last_stale",
  "ebay_active",
  "manual",
  "vault_auction",
  "vault_fill",
]);

/**
 * Map a live `oracleSource` string to a typed `OracleTier`. The live feed uses the same
 * canonical tier strings; unknown/empty sources fall to
 * the WEAKEST tier ('ebay_active') so a cloner NEVER over-trusts an unrecognised source.
 */
export function normalizeTier(source: string | undefined): OracleTier {
  if (!source) return "ebay_active";
  const s = source.toLowerCase();
  // exact known tier
  if (KNOWN_TIERS.has(s as OracleTier)) return s as OracleTier;
  // tolerate suffixed variants (e.g. 'pc_sold_thin_capped' → pc_sold_thin)
  if (s.startsWith("pc_sold_thin")) return "pc_sold_thin";
  if (s.startsWith("pc_sold")) return "pc_sold";
  if (s.startsWith("pc_grader_est")) return "pc_grader_est";
  if (s.startsWith("pc_last_est")) return "pc_last_est";
  if (s.startsWith("pc_last_stale")) return "pc_last_stale";
  if (s.startsWith("pc_last")) return "pc_last";
  if (s.startsWith("pc_grade_equiv")) return "pc_grade_equiv";
  if (s.startsWith("pc_display")) return "pc_display";
  // Vault self-produced sources — map EXPLICITLY (before the ebay fallthrough) so a suffixed
  // variant (e.g. 'vault_auction_capped') can never silently mis-rank as ebay_active (T6, weight
  // 0.3) and thereby OVER-trust a self-referential price. These are the weakest tier, gap-fill only.
  if (s.startsWith("vault_auction")) return "vault_auction";
  if (s.startsWith("vault_fill")) return "vault_fill";
  if (s.includes("ebay")) return "ebay_active";
  if (s === "manual") return "manual";
  // unknown source: fail to the weakest tier (never over-trust)
  return "ebay_active";
}

/** A tier is "real grader-matched data" (always beats estimates) when it is NOT an estimate/active tier. */
export function isGraderMatchedTier(tier: OracleTier): boolean {
  return tier === "pc_sold" || tier === "pc_sold_thin" || tier === "pc_last" || tier === "pc_last_stale";
}

/**
 * Derive the freshness state from the record's `stale` flag + `dataAgeHours`. The engine
 * MUST gate on this (P3): a stale value is down-weighted, never gospel. The `stale` boolean
 * is authoritative for the fresh/stale split; `dataAgeHours` lifts >365d to 'stale_hard'.
 */
export function deriveFreshness(stale: boolean | undefined, dataAgeHours: number | undefined, freshnessMs: number): OracleFreshness {
  const ageMs = typeof dataAgeHours === "number" ? dataAgeHours * 60 * 60 * 1000 : undefined;
  if (ageMs !== undefined && ageMs > HARD_STALE_MS) return "stale_hard";
  if (stale === true) return ageMs !== undefined && ageMs > HARD_STALE_MS ? "stale_hard" : "stale";
  if (ageMs !== undefined && ageMs > freshnessMs) return "stale";
  return "fresh";
}

/**
 * Tier weight for the confidence score (the oracle hierarchy — highest first). Verbatim
 * intent of the Oracle Hierarchy v3.4: T1 sold-3+ is gold; T6 eBay-active is the weakest.
 */
function tierWeight(tier: OracleTier): number {
  switch (tier) {
    case "pc_sold":
      return 1.0;
    case "pc_sold_thin":
      return 0.7;
    case "pc_grader_est":
      return 0.55;
    case "pc_last":
      return 0.5;
    case "pc_last_est":
      return 0.45;
    case "pc_display":
      return 0.4;
    case "pc_grade_equiv":
      return 0.4;
    case "pc_last_stale":
      return 0.25;
    case "ebay_active":
      return 0.3;
    case "manual":
      return 0.2;
    case "vault_auction":
      return 0.12; // below manual — a self-referential clearing price is the weakest signal we hold
    case "vault_fill":
      return 0.1; // weaker still — an acquisition floor, not a clearing comp
    default:
      return 0.3;
  }
}

/** Confidence label weight (the feed's coarse high/medium/low). */
function confidenceLabelWeight(conf: string | undefined): number {
  if (conf === "high") return 1.0;
  if (conf === "medium") return 0.6;
  if (conf === "low") return 0.3;
  return 0.4;
}

/** Freshness penalty multiplier on the confidence score (gate on freshness, P3). */
function freshnessWeight(freshness: OracleFreshness): number {
  if (freshness === "fresh") return 1.0;
  if (freshness === "stale") return 0.6;
  return 0.3; // stale_hard
}

/** Sold-count factor — thin (1–2 comps) caps confidence; 3+ is full. */
function soldCountFactor(soldCount: number | undefined): number {
  const n = soldCount ?? 0;
  if (n >= 3) return 1.0;
  if (n === 2) return 0.75;
  if (n === 1) return 0.55;
  return 0.4; // no comps behind the value
}

/**
 * Compute a [0,1] oracle confidence from tier × confidence-label × freshness × sold-count.
 * This is a confidence about *how much to trust the value*, NOT a recomputation of the
 * value itself (P3 — we never touch oraclePrice).
 */
export function computeOracleConfidence(tier: OracleTier, confLabel: string | undefined, freshness: OracleFreshness, soldCount: number | undefined): number {
  const raw = tierWeight(tier) * confidenceLabelWeight(confLabel) * freshnessWeight(freshness) * soldCountFactor(soldCount);
  return Math.round(raw * 100) / 100;
}

/** Project one live deal record onto an OracleRecord (value-truth + provenance, never recomputed). */
export function recordToOracle(d: DealRecord, freshnessMs: number): OracleRecord | null {
  const price = d.oraclePrice;
  if (!(typeof price === "number" && price > 0)) return null; // no value-truth → honest skip
  const tier = normalizeTier(d.oracleSource);
  const soldCount = d.oracleSoldCount ?? d.pcSoldCount ?? undefined;
  const freshness = deriveFreshness(d.stale, d.dataAgeHours, freshnessMs);
  const graderMatched = isGraderMatchedTier(tier);
  const grade = d.spreadGrade ?? d.listingGrade ?? "?";
  return {
    productId: d.cardId ?? d.id ?? "unknown",
    grade,
    grader: d.grader ?? "?",
    oraclePrice: price, // READ — never recomputed (P3)
    oracleSource: tier,
    oracleConfidence: computeOracleConfidence(tier, d.oracleConfidence, freshness, soldCount),
    oracleSoldCount: soldCount,
    graderMatched,
    freshness,
    updatedAt: new Date(Date.now() - (typeof d.dataAgeHours === "number" ? d.dataAgeHours * 3600_000 : 0)).toISOString(),
    stale: freshness !== "fresh",
    oracleUrl: d.oracleUrl ?? undefined, // OracleRecord.oracleUrl is string|undefined (null → undefined)
  };
}

/**
 * Read the value-truth behind the `OracleAdapter` seam. LIVE.
 * The oracle is the SUSPECT (P3): tier/freshness are surfaced honestly, value is read-only.
 */
export class SlabClawOracleAdapter implements OracleAdapter {
  /** Honesty label (P7): this adapter reads the real live value-truth. */
  readonly mode = "live" as const;
  private readonly apiUrl: string;
  private readonly apiKey?: string;
  private readonly freshnessMs: number;
  private readonly timeoutMs: number;
  private readonly feedTtlMs: number;
  private readonly fetchImpl: typeof fetch;
  /** Cached feed + an in-flight de-dup so 100s of per-card oracle reads cost ONE network fetch. */
  private _feed: { at: number; deals: DealRecord[] } | null = null;
  private _inflight: Promise<DealRecord[]> | null = null;

  constructor(opts: SlabClawOracleAdapterOptions = {}) {
    this.apiUrl = (opts.apiUrl ?? "https://api.slabclaw.com").replace(/\/+$/, "");
    this.apiKey = opts.apiKey;
    this.freshnessMs = opts.freshnessMs ?? DEFAULT_FRESHNESS_MS;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.feedTtlMs = opts.feedTtlMs ?? 60_000;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private async readFeed(): Promise<DealRecord[]> {
    const now = Date.now();
    if (this._feed && now - this._feed.at < this.feedTtlMs) return this._feed.deals;
    if (this._inflight) return this._inflight; // coalesce concurrent reads onto one fetch
    const url = `${this.apiUrl}/api/deals/listings`;
    const headers: Record<string, string> = { accept: "application/json" };
    if (this.apiKey) headers.authorization = `Bearer ${this.apiKey}`;
    this._inflight = (async () => {
      try {
        const res = await this.fetchImpl(url, { headers, signal: AbortSignal.timeout(this.timeoutMs) });
        if (!res.ok) throw new Error(`oracle ${url} -> HTTP ${res.status}`);
        const body = (await res.json()) as DealsListingsResponse;
        const deals = Array.isArray(body.deals) ? body.deals : [];
        this._feed = { at: Date.now(), deals };
        return deals;
      } finally {
        this._inflight = null;
      }
    })();
    return this._inflight;
  }

  /**
   * getDeals — read the oracle source's fair-value records (optionally scoped to one product).
   * Each record carries tier + freshness + confidence + sold-count + provenance.
   * Returns [] when the oracle has no value for the scope (honest, never fabricated).
   */
  async getDeals(productId?: string): Promise<OracleRecord[]> {
    const deals = await this.readFeed();
    const scoped = productId ? deals.filter((d) => d.cardId === productId || d.id === productId) : deals;
    const out: OracleRecord[] = [];
    for (const d of scoped) {
      const rec = recordToOracle(d, this.freshnessMs);
      if (rec) out.push(rec);
    }
    return out;
  }

  /**
   * getOracleInputs — the value-truth inputs for ONE product×grade for the BUY/SKIP brain.
   * Picks the record matching productId + (grade, grader) when present; returns null when the
   * feed has no grade-matched value (honest — never fabricates a value or a tier).
   */
  async getOracleInputs(i: { productId: string; grade: string; grader: string }): Promise<OracleInputs | null> {
    const recs = await this.getDeals(i.productId);
    if (recs.length === 0) return null;
    const wantGrade = String(i.grade).toLowerCase();
    const wantGrader = String(i.grader).toLowerCase();
    const match =
      recs.find((r) => String(r.grade).toLowerCase().includes(wantGrade) && String(r.grader).toLowerCase() === wantGrader) ??
      recs.find((r) => String(r.grade).toLowerCase().includes(wantGrade)) ??
      recs[0];
    if (!match) return null;
    return {
      productId: match.productId,
      grade: match.grade,
      grader: match.grader,
      oracleValueUsd: match.oraclePrice, // READ — never recomputed (P3)
      oracleSource: match.oracleSource,
      oracleConfidence: match.oracleConfidence,
      oracleSoldCount: match.oracleSoldCount,
      graderMatched: match.graderMatched,
      freshness: match.freshness,
      oracleUrl: match.oracleUrl,
    };
  }
}
