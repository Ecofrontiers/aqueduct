/**
 * spread-detector.ts — the EARN DETECTOR.
 *
 * Net-new orchestration TS over the SlabClaw cross-marketplace deal-source. It surfaces
 * every real
 *   (buyVenue ask $A, grade-matched sell value $B, net = B - A - fees > 0)
 * pair, AFTER a phantom-listing guard, so a dead/mispriced listing is never surfaced as a
 * fake spread.
 *
 * ── ADAPTER SEAM (Sprint 2 / D-B4) ──────────────────────────────────────────────────
 * The deal-source is now an INJECTED `DealsAdapter` (RING-2 contract), not an inline
 * `fetch`. The detector reads candidates through the adapter; swap in `MockDealsAdapter`
 * for a zero-network run, or `SlabClawDealsAdapter` for the live feed — no service edits.
 * The raw `fetch` to `/api/deals/listings` now lives ONLY inside `deals.ts` (the live
 * adapter). The detector is deal-source-agnostic.
 *
 * The arithmetic is deterministic (§5.2): the LLM does NOT do the math — the Nemotron
 * BRAIN (spread-decision.ts) only judges BUY/SKIP over these grounded numbers.
 *
 * ZERO contract dependency: this module reads the adapter + computes. Nothing onchain.
 */
import { computeFees, round2, type FeeModel } from "./fees.ts";
import { roundTripFeesUsd } from "./route-costs.ts";
import { SlabClawDealsAdapter } from "../lib/adapters/deals.ts";
import type { DealsAdapter, DealQuery, DealRecord } from "../lib/adapters/index.ts";

/** A surfaced arbitrage candidate (PRD §5.6 Spread interface). */
export interface Spread {
  productId: string;
  name: string;
  set: string;
  grade: string; // the grade-matched grade (listing grade == oracle/spread grade)
  buyVenue: string; // venue 1 — where the underpriced listing lives
  askUsd: number; // $A — the underpriced listing price
  sellVenue: string; // venue 2 — the oracle source that values it at $B
  gradeMatchedValueUsd: number; // $B — grade-matched value
  feesUsd: number; // acquire fee + sell fee + transfer/settlement
  grossSpreadUsd: number; // B - A
  netSpreadUsd: number; // B - A - fees  (the EARN, must be > 0)
  form: "raw" | "slabbed" | "tokenized";
  confidence: number; // listing-liveness x oracle-tier x grade-match, in [0,1]
  // provenance for the buy/skip brain + auditability:
  oracleSource: string;
  oracleConfidence: string;
  soldCount: number;
  listingUrl: string | null;
  oracleUrl: string | null;
}

/**
 * Raw deal record shape — the load-bearing RING-2 contract (`DealsAdapter.getDeals`),
 * re-exported here so existing importers of `DealRecord` from this module keep working.
 * The canonical definition lives in `lib/adapters/index.ts`.
 */
export type { DealRecord } from "../lib/adapters/index.ts";

export interface DetectOptions {
  fees?: FeeModel;
  /** Phantom-guard knobs (PRD §5.6 step 3). */
  minSoldCount?: number; // soldCount >= this  (default 3)
  requireHighConfidence?: boolean; // oracleConfidence === "high" (default true)
  maxValueRatio?: number; // reject B/A above this as out-of-band data error (default 10)
  minNetUsd?: number; // keep only net spreads above this (default 0)
  /** Inject deals directly (skip the adapter entirely) — used by tests/scale fan-out. */
  deals?: DealRecord[];
  /**
   * Inject the deal-SOURCE adapter (the RING-2 seam, D-B4). Defaults to the live
   * `SlabClawDealsAdapter` over SLABCLAW_API_URL. Swap `MockDealsAdapter` in for a
   * zero-network run with NO service edits. Ignored when `deals` is supplied.
   */
  dealsAdapter?: DealsAdapter;
  /** Restrict to a single productId (cardId). */
  productId?: string;
}

const TOKENIZED_VENUES = new Set(["beezie", "courtyard", "phygitals", "collector-crypt", "alt", "fanatics"]);

function venueForm(buyVenue: string): Spread["form"] {
  return TOKENIZED_VENUES.has(buyVenue) ? "tokenized" : "slabbed";
}

/** Oracle-tier weight for the confidence score (oracle hierarchy). */
function oracleTierWeight(source: string | undefined): number {
  if (!source) return 0.3;
  if (source === "pc_sold" || source === "scrydex_sold" || source === "ebay_sold") return 1.0;
  if (source.startsWith("pc_sold_thin")) return 0.7;
  if (source.startsWith("pc_grader_est")) return 0.55;
  if (source.startsWith("pc_last")) return 0.5;
  if (source.includes("capped")) return 0.6;
  return 0.5;
}

function confidenceWeight(conf: string | undefined): number {
  if (conf === "high") return 1.0;
  if (conf === "medium") return 0.6;
  if (conf === "low") return 0.3;
  return 0.1;
}

/**
 * The phantom-listing guard (PRD §5.6 step 3 + Phantom-listing discipline).
 * A spread is only an EARN if BOTH legs are live and grade-matched. Returns the reasons
 * a deal is rejected (empty array = passes).
 */
export function phantomReasons(d: DealRecord, opts: Required<Pick<DetectOptions, "minSoldCount" | "requireHighConfidence" | "maxValueRatio">>): string[] {
  const reasons: string[] = [];
  const A = d.listingPrice;
  const B = d.oraclePrice;
  const sold = d.oracleSoldCount ?? d.pcSoldCount ?? 0;

  if (d.stale === true) reasons.push("stale_listing");
  if (!(typeof A === "number" && A > 0)) reasons.push("no_ask_price");
  if (!(typeof B === "number" && B > 0)) reasons.push("no_oracle_value");
  if (opts.requireHighConfidence && d.oracleConfidence !== "high") reasons.push("low_confidence");
  if (sold < opts.minSoldCount) reasons.push(`thin_oracle(<${opts.minSoldCount})`);
  // grade-match: the listing grade must equal the grade the oracle priced (PRD: grade-matched sell $B)
  if (!d.listingGrade || !d.spreadGrade || d.listingGrade !== d.spreadGrade) reasons.push("grade_mismatch");
  // sane band: reject absurd ratios — almost always a wrong-card bind / data error, not a real spread
  if (typeof A === "number" && typeof B === "number" && A > 0 && B / A > opts.maxValueRatio) reasons.push("out_of_band");
  return reasons;
}

/**
 * Read the cross-marketplace deal feed THROUGH the injected `DealsAdapter` seam (D-B4).
 * The raw `fetch` no longer lives here — it lives inside `SlabClawDealsAdapter` (deals.ts).
 * Defaults to the live adapter when none is injected (behaviour-preserving for callers that
 * still call `detectSpreads()` with no adapter — they get the same live feed as before).
 */
export async function fetchLiveDeals(productId?: string, dealsAdapter?: DealsAdapter): Promise<DealRecord[]> {
  const adapter = dealsAdapter ?? new SlabClawDealsAdapter();
  const query: DealQuery = productId ? { productId } : {};
  return adapter.getDeals(query);
}

/**
 * Detect arbitrage spreads. Deal-source precedence:
 *   1. `opts.deals` (inline fixtures) — run over those, no adapter, no network.
 *   2. `opts.dealsAdapter` (the injected RING-2 seam) — read through it (MockDealsAdapter
 *      for zero-network, SlabClawDealsAdapter for live).
 *   3. default `SlabClawDealsAdapter` over SLABCLAW_API_URL (behaviour-preserving).
 * Returns positive-net, phantom-guarded, grade-matched spreads ranked by netSpread x
 * confidence (PRD §5.6 step 4). The detector NEVER recomputes the oracle value (P3).
 */
export async function detectSpreads(productId?: string, opts: DetectOptions = {}): Promise<Spread[]> {
  const minSoldCount = opts.minSoldCount ?? 3;
  const requireHighConfidence = opts.requireHighConfidence ?? true;
  const maxValueRatio = opts.maxValueRatio ?? 10;
  const minNetUsd = opts.minNetUsd ?? 0;

  const deals = opts.deals ?? (await fetchLiveDeals(productId ?? opts.productId, opts.dealsAdapter));
  const guard = { minSoldCount, requireHighConfidence, maxValueRatio };

  const out: Spread[] = [];
  for (const d of deals) {
    if (phantomReasons(d, guard).length > 0) continue;

    const A = d.listingPrice as number;
    const B = d.oraclePrice as number;
    const buyVenue = d.listingPlatform ?? "unknown";
    // Per-venue landed cost (relist-in-place on the buy venue) unless a flat model is forced.
    const feesUsd = opts.fees
      ? computeFees(A, B, opts.fees)
      : roundTripFeesUsd({ buyVenue, askUsd: A, sellUsd: B, form: venueForm(buyVenue) }).totalUsd;
    const netSpreadUsd = round2(B - A - feesUsd);
    if (netSpreadUsd <= minNetUsd) continue;

    const sold = d.oracleSoldCount ?? d.pcSoldCount ?? 0;
    const confidence = round2(confidenceWeight(d.oracleConfidence) * oracleTierWeight(d.oracleSource));

    out.push({
      productId: d.cardId ?? d.id ?? "unknown",
      name: d.name ?? "?",
      set: d.set ?? "?",
      grade: d.listingGrade ?? "?",
      buyVenue,
      askUsd: A,
      sellVenue: d.oracleSource ?? "oracle",
      gradeMatchedValueUsd: B,
      feesUsd,
      grossSpreadUsd: round2(B - A),
      netSpreadUsd,
      form: venueForm(buyVenue),
      confidence,
      oracleSource: d.oracleSource ?? "?",
      oracleConfidence: d.oracleConfidence ?? "?",
      soldCount: sold,
      listingUrl: d.listingUrl ?? null,
      oracleUrl: d.oracleUrl ?? null,
    });
  }

  // Rank by netSpread x confidence (PRD §5.6 step 4).
  out.sort((a, b) => b.netSpreadUsd * b.confidence - a.netSpreadUsd * a.confidence);
  return out;
}
