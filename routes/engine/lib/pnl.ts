/**
 * pnl.ts — realized + unrealized P&L booked against the oracle (Sprint 4, finding #12).
 *
 * The Earnings tab renders profit BOTH ways:
 *   - UNREALIZED (mark-to-oracle while held/listed): the grade-matched oracle value MINUS
 *     the cost basis MINUS the projected best-exit fees. This is what the position is "worth"
 *     net of getting out — never a hyped headline (P3): a stale/thin oracle mark is
 *     DOWN-WEIGHTED toward the cost basis and flagged, so the book never reports a fresh-T1
 *     mark and a stale-T5.8 mark as equally trustworthy gains.
 *   - REALIZED (booked at confirmSale): the actual net proceeds MINUS the cost basis. This is
 *     cash in hand; it is NEVER a mark — it only exists once a real SaleReceipt lands.
 *
 * GRADE-MATCHED throughout: the oracle value used for the mark is the SAME product×grade the
 * desk acquired — never a PSA-5 ask marked against a PSA-9 value.
 * The caller (orchestrator) supplies a grade-matched OracleInputs; this module never reaches
 * across grades.
 *
 * MONEY DISCIPLINE: P&L is computed in integer USD CENTS (BigInt) at every boundary so float
 * drift never creeps into a booked number; the public surface exposes rounded USD floats for
 * display only. (Matches beezie.ts's "BigInt at the money boundary" posture.)
 *
 * HONESTY (P1/P7): realized and unrealized are DISTINCT fields, never summed into one "profit"
 * number; every unrealized mark carries the oracle tier + freshness it was struck against +
 * a `markConfidence` and a `downWeighted` flag. No fabricated proceeds — realized is null
 * until a real sale is booked.
 *
 * ZERO contract dependency; pure in-memory book over the injected records.
 */

import type { OracleTier, OracleFreshness } from "./adapters/index.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Money: integer USD cents as BigInt (no float at a booked boundary)
// ─────────────────────────────────────────────────────────────────────────────

/** USD float → integer cents (BigInt). Rounds to the nearest cent (half-up). */
export function usdToCents(usd: number): bigint {
  return BigInt(Math.round(usd * 100));
}

/** Integer cents (BigInt) → USD float, for DISPLAY only — never re-fed to a money boundary. */
export function centsToUsd(cents: bigint): number {
  // Number() on a cents BigInt is safe for any realistic card price (< 2^53 cents).
  return Number(cents) / 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mark-trust: down-weight a stale/thin oracle mark toward the cost basis (P3)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The mark-trust weight in [0,1]: how much of the oracle-vs-basis gain we are willing to
 * BOOK as an unrealized mark. A confident fresh T1 oracle gets full weight (1.0); a stale or
 * thin/weak-tier oracle is down-weighted so the book pulls the mark back toward cost basis —
 * we never headline a suspect oracle's full gain (P3). This is a TRUST weight on the mark,
 * NOT a recomputation of the oracle value itself.
 */
export function markTrustWeight(tier: OracleTier, freshness: OracleFreshness): number {
  let w = tierTrust(tier) * freshnessTrust(freshness);
  // clamp + round to 2dp for stable, inspectable weights
  w = Math.max(0, Math.min(1, w));
  return Math.round(w * 100) / 100;
}

function tierTrust(tier: OracleTier): number {
  switch (tier) {
    case "pc_sold":
      return 1.0; // T1 gold — grader-matched, 3+ sold
    case "pc_sold_thin":
      return 0.7; // T2 — thin (1-2 sold)
    case "pc_grader_est":
      return 0.6; // T3 — estimate from PSA × multiplier
    case "pc_last":
      return 0.7; // T4 — grader-matched last sale
    case "pc_last_est":
      return 0.55; // T5 — PSA last × multiplier
    case "pc_display":
      return 0.5; // T5.5
    case "pc_grade_equiv":
      return 0.5; // T5.7
    case "pc_last_stale":
      return 0.35; // T5.8 — stale last sale
    case "ebay_active":
      return 0.4; // T6 — active ask, weak
    case "manual":
      return 0.3; // T7 — user-entered
    default:
      return 0.4;
  }
}

function freshnessTrust(freshness: OracleFreshness): number {
  if (freshness === "fresh") return 1.0;
  if (freshness === "stale") return 0.6;
  return 0.35; // stale_hard — heavily down-weighted, never gospel
}

// ─────────────────────────────────────────────────────────────────────────────
// Position + P&L records
// ─────────────────────────────────────────────────────────────────────────────

/** The lifecycle state of a held position. */
export type PositionStatus = "held" | "listed" | "sold";

/** A grade-matched oracle mark the position is valued against (read, never recomputed). */
export interface OracleMark {
  valueUsd: number; // the grade-matched oracle fair value (READ from the OracleAdapter)
  tier: OracleTier; // which tier produced it (rank/down-weight on this)
  freshness: OracleFreshness; // fresh / stale / stale_hard — gate on this
  oracleUrl?: string; // provenance
}

/** What the desk paid + what it holds. Cost basis is recorded ONCE at acquire(). */
export interface PositionInit {
  productId: string;
  name?: string;
  grade: string; // the grade-matched grade the basis + mark share
  grader: string;
  /** Landed cost at acquire() — the cost basis (all-in: ask + take + gas + ship). */
  costBasisUsd: number;
  /** Acquire venue (provenance of where it sits). */
  acquiredOn?: string;
  /** Honest live-vs-stub flag for the BASIS (true once a real on-chain buy landed). */
  basisIsLive?: boolean;
}

/** A booked realized result, supplied at confirmSale(). */
export interface RealizedFill {
  /** Actual net proceeds at sale (after the venue fee) — from a real SaleReceipt. */
  netProceedsUsd: number;
  soldAtUsd?: number;
  /** Honest live-vs-stub flag for the SALE (true once a real settlement landed). */
  saleIsLive?: boolean;
}

/** The full per-position P&L view (consumed by the Earnings tab + the orchestrator trace). */
export interface PositionPnL {
  productId: string;
  name?: string;
  grade: string;
  grader: string;
  status: PositionStatus;
  costBasisUsd: number;

  // ── UNREALIZED (mark-to-oracle while held/listed) ──
  /** The grade-matched oracle value the mark was struck against (null once SOLD). */
  oracleMarkUsd: number | null;
  /** Oracle tier the mark used (provenance for trust). */
  markTier?: OracleTier;
  /** Oracle freshness the mark used (provenance for trust). */
  markFreshness?: OracleFreshness;
  /** Projected best-exit fees subtracted from the mark (what it costs to get out). */
  projectedExitFeesUsd: number;
  /** [0,1] trust weight applied to the gain (down-weights stale/thin marks — P3). */
  markConfidence: number;
  /** True when the mark was down-weighted (tier/freshness < full trust) — flagged, not hidden. */
  downWeighted: boolean;
  /**
   * Unrealized P&L (USD). RAW = oracleMark − basis − projectedExitFees. The BOOKED value
   * applies the trust weight to the raw GAIN only (a loss is never softened — we book the
   * full downside). null once the position is SOLD (it becomes realized).
   */
  unrealizedUsd: number | null;
  /** The un-down-weighted unrealized (full oracle mark) — surfaced for transparency, NOT booked. */
  unrealizedRawUsd: number | null;

  // ── REALIZED (booked at confirmSale) ──
  /** Realized P&L (USD) = netProceeds − basis. null until a real sale is booked. */
  realizedUsd: number | null;
  /** The net proceeds the realized number is based on (null until sold). */
  netProceedsUsd: number | null;

  /** Honesty: did a real on-chain buy land (basis) / a real sale settle (realized)? */
  basisIsLive: boolean;
  saleIsLive: boolean;
}

/** The portfolio roll-up across all positions. */
export interface PortfolioPnL {
  positions: PositionPnL[];
  /** Σ realized across SOLD positions (cash booked). */
  totalRealizedUsd: number;
  /** Σ booked unrealized across held/listed positions (mark-to-oracle, down-weighted). */
  totalUnrealizedUsd: number;
  /** Σ cost basis of OPEN (held/listed) positions — capital deployed. */
  openCostBasisUsd: number;
  /** Σ down-weighted mark-to-oracle of OPEN positions (basis + booked unrealized). */
  markToOracleUsd: number;
  /** Free cash not yet deployed (supplied by the caller — e.g. window budget − spent). */
  cashUsd: number;
  /** NAV = cash + Σ mark-to-oracle of open positions (+ realized is already in cash if swept). */
  navUsd: number;
  /** Count of positions flagged down-weighted (a suspect mark is in the book) — honesty. */
  downWeightedCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// The book
// ─────────────────────────────────────────────────────────────────────────────

interface BookEntry {
  init: PositionInit;
  status: PositionStatus;
  mark?: OracleMark;
  projectedExitFeesUsd: number;
  realized?: RealizedFill;
}

/**
 * PnLBook — an in-memory positions book. The orchestrator opens a position at acquire(),
 * marks it to the oracle while held/listed, and books the realized result at confirmSale().
 *
 * All math runs in integer cents (BigInt); the public surface rounds to USD floats.
 */
export class PnLBook {
  private readonly entries = new Map<string, BookEntry>();

  /** key on productId+grade+grader so the same card at two grades is two positions (grade-matched). */
  private keyOf(productId: string, grade: string, grader: string): string {
    return `${productId}::${grader}::${grade}`;
  }

  /**
   * openPosition — record the cost basis at acquire(). Idempotent on the key: a re-open with
   * the SAME key updates the basis (last acquire wins) rather than duplicating the position.
   */
  openPosition(init: PositionInit): void {
    const key = this.keyOf(init.productId, init.grade, init.grader);
    const existing = this.entries.get(key);
    this.entries.set(key, {
      init: { basisIsLive: false, ...init },
      status: existing?.status ?? "held",
      mark: existing?.mark,
      projectedExitFeesUsd: existing?.projectedExitFeesUsd ?? 0,
      realized: existing?.realized,
    });
  }

  /**
   * markToOracle — set the grade-matched oracle mark + the projected best-exit fees on a held/
   * listed position. The mark is READ from the OracleAdapter (never recomputed). The status
   * moves to 'listed' when `listed` is true. A mark on a SOLD position is ignored (it's realized).
   */
  markToOracle(i: { productId: string; grade: string; grader: string; mark: OracleMark; projectedExitFeesUsd: number; listed?: boolean }): void {
    const key = this.keyOf(i.productId, i.grade, i.grader);
    const e = this.entries.get(key);
    if (!e || e.status === "sold") return;
    e.mark = i.mark;
    e.projectedExitFeesUsd = i.projectedExitFeesUsd;
    if (i.listed) e.status = "listed";
  }

  /**
   * bookRealized — book the realized result at confirmSale(). The position moves to 'sold';
   * the oracle mark is retained for provenance but `unrealized` becomes null (it's now cash).
   * Booking with a null/absent fill is a no-op (an unsold confirmSale never fabricates a sale).
   */
  bookRealized(i: { productId: string; grade: string; grader: string; fill: RealizedFill | null | undefined }): void {
    if (!i.fill) return; // unsold — nothing to book (P7: no fabricated proceeds)
    const key = this.keyOf(i.productId, i.grade, i.grader);
    const e = this.entries.get(key);
    if (!e) return;
    e.status = "sold";
    e.realized = { saleIsLive: false, ...i.fill };
  }

  /** Compute the P&L view for one entry (cents-internal, USD-out). */
  private viewOf(e: BookEntry): PositionPnL {
    const basisCents = usdToCents(e.init.costBasisUsd);
    const basisIsLive = e.init.basisIsLive === true;

    // ── REALIZED ──
    let realizedUsd: number | null = null;
    let netProceedsUsd: number | null = null;
    let saleIsLive = false;
    if (e.status === "sold" && e.realized) {
      const proceedsCents = usdToCents(e.realized.netProceedsUsd);
      realizedUsd = centsToUsd(proceedsCents - basisCents);
      netProceedsUsd = e.realized.netProceedsUsd;
      saleIsLive = e.realized.saleIsLive === true;
    }

    // ── UNREALIZED (only while held/listed) ──
    let oracleMarkUsd: number | null = null;
    let unrealizedUsd: number | null = null;
    let unrealizedRawUsd: number | null = null;
    let markTier: OracleTier | undefined;
    let markFreshness: OracleFreshness | undefined;
    let markConfidence = 0;
    let downWeighted = false;
    const projectedExitFeesUsd = round2c(e.projectedExitFeesUsd);

    if (e.status !== "sold" && e.mark) {
      oracleMarkUsd = e.mark.valueUsd;
      markTier = e.mark.tier;
      markFreshness = e.mark.freshness;
      markConfidence = markTrustWeight(e.mark.tier, e.mark.freshness);
      downWeighted = markConfidence < 1.0;

      const markCents = usdToCents(e.mark.valueUsd);
      const feeCents = usdToCents(e.projectedExitFeesUsd);
      // RAW unrealized = mark − basis − projected exit fees (the full, un-weighted number).
      const rawCents = markCents - basisCents - feeCents;
      unrealizedRawUsd = centsToUsd(rawCents);

      // BOOKED unrealized: down-weight only a GAIN (a loss is booked in full — never softened).
      if (rawCents > 0n) {
        // weight in basis-points to keep BigInt-integer math at the boundary.
        const bps = BigInt(Math.round(markConfidence * 10_000));
        const bookedCents = (rawCents * bps) / 10_000n;
        unrealizedUsd = centsToUsd(bookedCents);
      } else {
        unrealizedUsd = centsToUsd(rawCents); // full downside
      }
    }

    return {
      productId: e.init.productId,
      name: e.init.name,
      grade: e.init.grade,
      grader: e.init.grader,
      status: e.status,
      costBasisUsd: round2c(e.init.costBasisUsd),
      oracleMarkUsd,
      markTier,
      markFreshness,
      projectedExitFeesUsd,
      markConfidence,
      downWeighted,
      unrealizedUsd: unrealizedUsd === null ? null : round2c(unrealizedUsd),
      unrealizedRawUsd: unrealizedRawUsd === null ? null : round2c(unrealizedRawUsd),
      realizedUsd: realizedUsd === null ? null : round2c(realizedUsd),
      netProceedsUsd,
      basisIsLive,
      saleIsLive,
    };
  }

  /** The per-position P&L view for one card (null if no such position). */
  position(i: { productId: string; grade: string; grader: string }): PositionPnL | null {
    const e = this.entries.get(this.keyOf(i.productId, i.grade, i.grader));
    return e ? this.viewOf(e) : null;
  }

  /** All per-position views. */
  positions(): PositionPnL[] {
    return [...this.entries.values()].map((e) => this.viewOf(e));
  }

  /**
   * portfolio — the roll-up. `cashUsd` is the free (un-deployed) cash the caller tracks
   * (e.g. window budget − windowSpent). NAV = cash + Σ down-weighted mark-to-oracle of OPEN
   * positions. Realized is summed separately (it is cash already booked at sale).
   */
  portfolio(opts: { cashUsd?: number } = {}): PortfolioPnL {
    const positions = this.positions();

    // Sum in cents to avoid float drift across many positions.
    let realizedCents = 0n;
    let unrealizedCents = 0n;
    let openBasisCents = 0n;
    let markToOracleCents = 0n;
    let downWeightedCount = 0;

    for (const p of positions) {
      if (p.status === "sold") {
        if (p.realizedUsd !== null) realizedCents += usdToCents(p.realizedUsd);
      } else {
        openBasisCents += usdToCents(p.costBasisUsd);
        if (p.unrealizedUsd !== null) {
          unrealizedCents += usdToCents(p.unrealizedUsd);
          // mark-to-oracle of an OPEN position = basis + booked unrealized (the down-weighted worth).
          markToOracleCents += usdToCents(p.costBasisUsd) + usdToCents(p.unrealizedUsd);
        } else {
          // no mark yet — carry at cost basis (conservative; never a fabricated mark).
          markToOracleCents += usdToCents(p.costBasisUsd);
        }
        if (p.downWeighted) downWeightedCount++;
      }
    }

    const cashUsd = round2c(opts.cashUsd ?? 0);
    const markToOracleUsd = centsToUsd(markToOracleCents);
    const navUsd = round2c(cashUsd + markToOracleUsd);

    return {
      positions,
      totalRealizedUsd: centsToUsd(realizedCents),
      totalUnrealizedUsd: centsToUsd(unrealizedCents),
      openCostBasisUsd: centsToUsd(openBasisCents),
      markToOracleUsd: round2c(markToOracleUsd),
      cashUsd,
      navUsd,
      downWeightedCount,
    };
  }
}

/** round to 2dp (display). */
function round2c(n: number): number {
  return Math.round(n * 100) / 100;
}
