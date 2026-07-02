/**
 * deals.mock.ts — MockDealsAdapter (deterministic, ZERO-network fixture deal source).
 *
 * The clone-able-template twin of `deals.ts`. A stranger clones the repo and runs the
 * whole loop against THIS — no keys, no chain, no network. Every record is hand-built and
 * stable across runs (NO randomness, NO live calls). Labeled MOCK (P7).
 *
 * The fixtures deliberately span the phantom-guard surface so the detector seam is fully
 * exercised zero-network:
 *   - mock-good-1   : a real, live, grade-matched, high-conf, well-sold POSITIVE-net spread.
 *   - mock-thin-1   : a SUSPECT oracle (thin, 1 sold) — the brain must down-weight it (P3).
 *   - mock-stale-1  : a SUSPECT oracle (stale) — freshness-gated out.
 *   - mock-loss-1   : ask above oracle — negative net, dropped by the detector.
 *   - mock-mismatch : listing grade != oracle grade — grade-mismatch, dropped.
 */

import type { DealsAdapter, DealQuery, DealRecord } from "./index.ts";
import { applyDealQuery } from "./deals.ts";

/** The canonical deterministic fixture set (exported so tests + cloners can introspect it). */
export const MOCK_DEALS: DealRecord[] = [
  {
    // A real positive-net EARN: buy $31.50 on cardmarket, oracle (grade-matched, 5 sold) $102.
    cardId: "mock-good-1",
    name: "Kingdra",
    set: "Neo Genesis — Unlimited",
    listingPlatform: "cardmarket",
    listingPrice: 31.5,
    listingGrade: "PSA 9",
    listingUrl: "https://www.cardmarket.com/en/Pokemon/mock/kingdra-neo-genesis",
    oraclePrice: 102,
    oracleSource: "pc_sold", // T1 — gold
    oracleConfidence: "high",
    oracleUrl: "https://www.pricecharting.com/game/pokemon-neo-genesis/kingdra",
    oracleSoldCount: 5,
    spreadGrade: "PSA 9",
    stale: false,
    grader: "PSA",
    dataAgeHours: 3,
  },
  {
    // SUSPECT oracle — thin (1 sold). Positive headline net, but the brain must down-weight.
    cardId: "mock-thin-1",
    name: "Feraligatr",
    set: "Neo Genesis — Unlimited",
    listingPlatform: "ebay",
    listingPrice: 40,
    listingGrade: "PSA 8",
    listingUrl: "https://www.ebay.com/itm/mock-feraligatr",
    oraclePrice: 120,
    oracleSource: "pc_sold_thin", // T2 — thin
    oracleConfidence: "medium",
    oracleUrl: "https://www.pricecharting.com/game/pokemon-neo-genesis/feraligatr",
    oracleSoldCount: 1, // thin → phantom-guard drops it at minSoldCount=3
    spreadGrade: "PSA 8",
    stale: false,
    grader: "PSA",
    dataAgeHours: 10,
  },
  {
    // SUSPECT oracle — STALE (last-sale beyond the window). Freshness-gated out.
    cardId: "mock-stale-1",
    name: "Lugia",
    set: "Neo Genesis — Unlimited",
    listingPlatform: "ebay",
    listingPrice: 300,
    listingGrade: "PSA 9",
    listingUrl: "https://www.ebay.com/itm/mock-lugia",
    oraclePrice: 1400,
    oracleSource: "pc_last_stale", // T5.8 — stale last sale
    oracleConfidence: "low",
    oracleUrl: "https://www.pricecharting.com/game/pokemon-neo-genesis/lugia",
    oracleSoldCount: 4,
    spreadGrade: "PSA 9",
    stale: true,
    grader: "PSA",
    dataAgeHours: 24 * 400, // > 365d → stale_hard
  },
  {
    // Loss-making: ask above oracle → negative net, dropped by the detector.
    cardId: "mock-loss-1",
    name: "Typhlosion",
    set: "Neo Genesis — Unlimited",
    listingPlatform: "cardmarket",
    listingPrice: 200,
    listingGrade: "PSA 9",
    listingUrl: "https://www.cardmarket.com/en/Pokemon/mock/typhlosion",
    oraclePrice: 100,
    oracleSource: "pc_sold",
    oracleConfidence: "high",
    oracleUrl: "https://www.pricecharting.com/game/pokemon-neo-genesis/typhlosion",
    oracleSoldCount: 6,
    spreadGrade: "PSA 9",
    stale: false,
    grader: "PSA",
    dataAgeHours: 5,
  },
  {
    // Grade mismatch: listing PSA 9 but the oracle priced PSA 10 → grade-mismatch, dropped.
    cardId: "mock-mismatch-1",
    name: "Meganium",
    set: "Neo Genesis — Unlimited",
    listingPlatform: "ebay",
    listingPrice: 50,
    listingGrade: "PSA 9",
    listingUrl: "https://www.ebay.com/itm/mock-meganium",
    oraclePrice: 220,
    oracleSource: "pc_sold",
    oracleConfidence: "high",
    oracleUrl: "https://www.pricecharting.com/game/pokemon-neo-genesis/meganium",
    oracleSoldCount: 5,
    spreadGrade: "PSA 10", // != listingGrade PSA 9 → grade-mismatch
    stale: false,
    grader: "PSA",
    dataAgeHours: 6,
  },
];

/** A deterministic, zero-network DealsAdapter for cloners + tests. Labeled MOCK (P7). */
export class MockDealsAdapter implements DealsAdapter {
  /** Honesty label (P7): this adapter is a deterministic fixture, NOT live data. */
  readonly mode = "mock" as const;
  private readonly fixtures: DealRecord[];

  constructor(opts: { deals?: DealRecord[] } = {}) {
    // Deep-clone so callers can't mutate the shared fixture set between runs (determinism).
    this.fixtures = (opts.deals ?? MOCK_DEALS).map((d) => ({ ...d }));
  }

  async getDeals(query: DealQuery = {}): Promise<DealRecord[]> {
    // Same scoping semantics as the live adapter (shared applyDealQuery) — zero network.
    return applyDealQuery(this.fixtures.map((d) => ({ ...d })), query);
  }
}
