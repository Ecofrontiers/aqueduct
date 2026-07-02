/**
 * fees.ts — the FLAT landed-cost fee model (fallback / explicit-override only).
 *
 * ⚠️ SUPERSEDED FOR PER-VENUE PRICING by `route-costs.ts` (2026-07-01, the route-cost oracle /
 * Marketplace Policies). The spread detector now prices fees PER-VENUE by default (real take-rate
 * of each venue, relist-in-place) via `roundTripFeesUsd`. This flat model remains as (a) the
 * conservative fallback for an unknown venue and (b) an explicit `DetectOptions.fees` override.
 * Kept, not deleted (CLAUDE.md §72 supersession-not-deletion) so the flat path stays inspectable.
 *
 * A captured spread is only an
 * EARN net of (acquire fee + sell fee + transfer/settlement). These are deliberately
 * conservative — a spread that survives THIS model survives a real round-trip.
 *
 *  - acquireFeeBps   = the desk's fill fee on the buy leg (PRD createVault fillFeeBps 200 = 2%).
 *  - sellFeeBps      = the venue take on the sell-high leg. We use the worst realistic
 *                      tokenized venue (Beezie ~6%) so the net is honest; incumbents that
 *                      claim "0%" hide a 10-15% buyback spread (PHYSICAL-GOODS-ECONOMICS §2.2).
 *  - transferUsd     = flat onchain transfer/settlement + listing cost per round-trip.
 *
 * The arithmetic is DETERMINISTIC and lives here, NOT in the LLM (§5.2 discipline).
 */
export interface FeeModel {
  acquireFeeBps: number; // basis points on the buy (ask) price
  sellFeeBps: number; // basis points on the sell (grade-matched value) price
  transferUsd: number; // flat per-round-trip settlement/listing cost
}

export const DEFAULT_FEES: FeeModel = {
  acquireFeeBps: 200, // 2%  — matches VaultFactory.createVault fillFeeBps 200 (PRD §3.4)
  sellFeeBps: 600, // 6%  — worst-case tokenized venue (Beezie), honest net
  transferUsd: 2, // flat onchain transfer + relist cost
};

/** Total fees for a round-trip that buys at askUsd and sells at sellValueUsd. */
export function computeFees(askUsd: number, sellValueUsd: number, fees: FeeModel = DEFAULT_FEES): number {
  const acquire = askUsd * (fees.acquireFeeBps / 10_000);
  const sell = sellValueUsd * (fees.sellFeeBps / 10_000);
  return round2(acquire + sell + fees.transferUsd);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
