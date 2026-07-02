/**
 * oracle.mock.ts — MockOracleAdapter (deterministic, ZERO-network value-truth fixture).
 *
 * The clone-able-template twin of `oracle.ts`. A stranger clones the repo and reasons over
 * BOTH a confident oracle AND a SUSPECT one (P3) with no network. Every record is hand-built
 * and stable across runs (NO randomness, NO live calls). Labeled MOCK (P7).
 *
 * Mirrors the `deals.mock.ts` product set so the Oracle + Deals seam is consistent for a
 * cloner who wires both mocks. Deliberately spans the trust spectrum:
 *   - mock-good-1  : T1 pc_sold, 5 sold, FRESH, high-conf → high oracleConfidence (gospel-ish).
 *   - mock-thin-1  : T2 pc_sold_thin, 1 sold, fresh → SUSPECT (down-weighted on sold-count).
 *   - mock-stale-1 : T5.8 pc_last_stale, STALE_HARD → SUSPECT (freshness-gated down).
 *   - mock-mismatch-1 / mock-loss-1 : present so getOracleInputs has full product coverage.
 *
 * The mock REUSES the real adapter's pure projection (`recordToOracle`) so the mock's output
 * shape + confidence math is IDENTICAL to the live adapter — the only difference is the
 * (fixture vs network) source. That is what makes the seam a true drop-in (D-B4).
 */

import type { OracleAdapter, OracleRecord, OracleInputs, DealRecord } from "./index.ts";
import { recordToOracle, DEFAULT_FRESHNESS_MS } from "./oracle.ts";
import { MOCK_DEALS } from "./deals.mock.ts";

/**
 * The canonical deterministic oracle fixture set. Built by projecting the shared MOCK_DEALS
 * through the SAME `recordToOracle` the live adapter uses (so tier/freshness/confidence math
 * is identical), then keeping only records that carry a value-truth (oraclePrice > 0).
 */
export const MOCK_ORACLE_RECORDS: OracleRecord[] = MOCK_DEALS.map((d) => recordToOracle(d, DEFAULT_FRESHNESS_MS)).filter(
  (r): r is OracleRecord => r !== null,
);

/** A deterministic, zero-network OracleAdapter for cloners + tests. Labeled MOCK (P7). */
export class MockOracleAdapter implements OracleAdapter {
  /** Honesty label (P7): this adapter is a deterministic fixture, NOT live data. */
  readonly mode = "mock" as const;
  private readonly records: OracleRecord[];

  constructor(opts: { records?: OracleRecord[] } = {}) {
    this.records = (opts.records ?? MOCK_ORACLE_RECORDS).map((r) => ({ ...r }));
  }

  async getDeals(productId?: string): Promise<OracleRecord[]> {
    const out = productId ? this.records.filter((r) => r.productId === productId) : this.records;
    return out.map((r) => ({ ...r }));
  }

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

/** Re-export the shared mock deal record type for cloner ergonomics. */
export type { DealRecord };
