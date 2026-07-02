/**
 * route-costs.test.ts — the route-cost oracle + Marketplace Policies. Per-venue take-rates are REAL
 * and DIFFERENTIATED, the tiered fees (eBay singles discount, Alt bands) are modelled, insurance +
 * shipping + sales tax are value-aware, best-exit selection maximises net proceeds, policies carry
 * non-fee route intelligence (asset class, custody, cross-custodian movability, autonomy), and the
 * detector nets spreads per-venue (the moat: Courtyard 0% relist beats Beezie 8% on the same A/B).
 */
import {
  venueSellFeeUsd,
  venueBuyerFeeUsd,
  roundTripFeesUsd,
  gradingCost,
  getPolicy,
  venueKey,
  insuranceCostUsd,
  shipCostUsd,
  salesTaxUsd,
  bestExit,
  quoteExit,
  landedCeilingUsd,
  MARKETPLACE_POLICIES,
} from "../services/route-costs.ts";
import { detectSpreads } from "../services/spread-detector.ts";
import { ok, eq, section } from "./assert.ts";

export async function run(): Promise<void> {
  section("route-costs: per-venue sell take-rates (sourced)");
  eq(venueSellFeeUsd("courtyard", 1000), 0, "Courtyard = 0% seller take");
  ok(Math.abs(venueSellFeeUsd("collector-crypt", 1000) - 20) < 0.01, "Collector Crypt = 2% ($20 on $1000)");
  ok(Math.abs(venueSellFeeUsd("beezie", 1000) - 80) < 0.01, "Beezie = ~8% onchain-executed take ($80 on $1000)");
  ok(Math.abs(venueSellFeeUsd("phygitals", 1000) - 20) < 0.01, "Phygitals = 2% ($20 on $1000)");
  ok(Math.abs(venueSellFeeUsd("cardmarket", 1000) - 55) < 0.01, "Cardmarket = 5.5% ($55 on $1000)");
  ok(Math.abs(venueSellFeeUsd("fanatics", 1000) - 60) < 0.01, "Fanatics = 6% Buy Now ($60 on $1000)");

  section("route-costs: eBay tiered fee — 13.25% under $1k, ~6.6% effective on high-value singles");
  const ebayLow = venueSellFeeUsd("ebay", 500);
  ok(Math.abs(ebayLow - (500 * 0.1325 + 0.4)) < 0.01, `eBay $500 sale ≈ full 13.25% FVF (got $${ebayLow})`);
  const ebayHighPct = venueSellFeeUsd("ebay", 21790) / 21790;
  ok(ebayHighPct > 0.06 && ebayHighPct < 0.075, `eBay $21,790 single ≈ ~6.9% effective via singles discount (got ${(ebayHighPct * 100).toFixed(2)}%)`);

  section("route-costs: Alt tiered bands (CONFIRMED support.alt.xyz)");
  ok(Math.abs(venueSellFeeUsd("alt", 100) - 14) < 0.01, "Alt <$250 = 14% ($14 on $100)");
  ok(Math.abs(venueSellFeeUsd("alt", 1000) - 90) < 0.01, "Alt $250-7499 = 9% ($90 on $1000, reseller sweet spot)");
  ok(Math.abs(venueSellFeeUsd("alt", 12000) - 600) < 0.01, "Alt $10k+ = 5% ($600 on $12000)");

  section("route-costs: value-aware shipping + USPS insurance schedule (CONFIRMED Jan-2026)");
  eq(shipCostUsd(50), 7.9, "sub-$500 ships Ground Advantage $7.90");
  eq(shipCostUsd(1000), 11, "mid-value ships Priority $11");
  eq(shipCostUsd(9000), 17.5, ">$5k ships Registered Mail $17.50");
  eq(insuranceCostUsd(50), 2.7, "USPS insure ≤$50 = $2.70");
  eq(insuranceCostUsd(1000), 14.2, "USPS insure $1000 = $14.20 (5.80 + 7×1.20)");
  ok(Math.abs(insuranceCostUsd(5000) - 62.2) < 0.01, "USPS insure $5000 = $62.20 (~1.24%)");

  section("route-costs: sales tax only on physical redemption/ship-out");
  eq(salesTaxUsd(1000, false), 0, "no tax when not taking physical delivery (vaulted/relist-in-place)");
  ok(Math.abs(salesTaxUsd(1000, true) - 80) < 0.01, "8% blended tax on a $1000 physical redemption");

  section("route-costs: THE MOAT — round-trip cost is venue-differentiated (relist-in-place)");
  const cy = roundTripFeesUsd({ buyVenue: "courtyard", askUsd: 100, sellUsd: 118, form: "tokenized" });
  const bz = roundTripFeesUsd({ buyVenue: "beezie", askUsd: 100, sellUsd: 118, form: "tokenized" });
  console.log(`    Courtyard round-trip fees $${cy.totalUsd}: ${cy.breakdown.join(" · ")}`);
  console.log(`    Beezie    round-trip fees $${bz.totalUsd}: ${bz.breakdown.join(" · ")}`);
  ok(cy.totalUsd < bz.totalUsd, "Courtyard (0% sell) round-trip is CHEAPER than Beezie (8% sell) on the same A/B");
  ok(cy.sellFeeUsd === 0, "Courtyard relist-in-place has $0 sell fee");
  ok(cy.transferUsd < 1, "tokenized transfer is gas-only (cents), not a flat $2");

  section("route-costs: physical move-venue adds ship + insurance + redemption tax");
  const relist = roundTripFeesUsd({ buyVenue: "ebay", askUsd: 100, sellUsd: 118, form: "slabbed" });
  const moveTaxable = roundTripFeesUsd({ buyVenue: "ebay", exitVenue: "cardmarket", askUsd: 100, sellUsd: 118, form: "slabbed", taxableMove: true });
  eq(relist.transferUsd, 0, "eBay relist-in-place needs no shipping");
  eq(relist.taxUsd, 0, "relist-in-place incurs no redemption tax");
  ok(moveTaxable.transferUsd > 0, "move-venue adds a ship+insure leg");
  ok(moveTaxable.taxUsd > 0, "a taxable physical move incurs sales tax");

  section("route-costs: best-exit selection maximises net proceeds (quoteExit)");
  // Tokenized: only exit is relist-in-place (chain-bound island, §5.1).
  const bxTok = bestExit({ buyVenue: "beezie", sellUsd: 500, form: "tokenized" });
  ok(bxTok.all.length === 1 && bxTok.best.relistInPlace, "tokenized card can only relist-in-place (no cross-custodian move)");
  // Physical: compares relist-in-place vs move-venue; picks the max net.
  const bxPhys = bestExit({ buyVenue: "tcgplayer", sellUsd: 500, form: "slabbed" });
  ok(bxPhys.all.length > 1, "physical card evaluates multiple exit venues");
  ok(bxPhys.best.netProceedsUsd >= bxPhys.all[bxPhys.all.length - 1].netProceedsUsd, "best exit has the highest net proceeds");
  console.log(`    best exit for a $500 TCGplayer slab: ${bxPhys.best.label} (net $${bxPhys.best.netProceedsUsd})`);

  section("route-costs: landed-cost-adjusted ceiling (route-aware acquisition)");
  const ceiling = landedCeilingUsd({ sellUsd: 118, buyVenue: "beezie", form: "tokenized" });
  ok(ceiling > 0 && ceiling < 118, `landed ceiling for a $118-value tokenized card is below sell value (got $${ceiling})`);
  ok(ceiling < 118 - venueSellFeeUsd("beezie", 118), "ceiling accounts for the sell fee");

  section("route-costs: Marketplace Policies carry route intelligence (more than fees)");
  ok(getPolicy("beezie").crossCustodianMovable === false, "Beezie tokenized asset is a chain-bound island (can't move cross-custodian)");
  ok(getPolicy("ebay").crossCustodianMovable === true, "eBay physical slab can move cross-custodian");
  eq(getPolicy("courtyard").assetClass, "tokenized", "Courtyard is a tokenized venue");
  eq(getPolicy("ebay").assetClass, "physical", "eBay is a physical venue");
  eq(getPolicy("beezie").autonomy, "autonomous", "Beezie buy/list is fully autonomous (onchain Seaport)");
  eq(getPolicy("ebay").autonomy, "browser-gated", "eBay buy is browser-gated (no autonomous Buy API)");
  eq(getPolicy("goldin").autonomy, "human-kyc", "Goldin auction is human-KYC gated");
  eq(getPolicy("ebay").custodyModel, "self-custody", "eBay slab is self-custodied");

  section("route-costs: grading service metadata (CONFIRMED 2026)");
  ok(Math.abs(gradingCost("PSA", "regular").feeUsd - 79.99) < 0.01, "PSA Regular = $79.99 (psacard.com)");
  ok(gradingCost("PSA", "value").paused === true, "PSA Value tier is PAUSED (2026-06-02)");
  ok(gradingCost("PSA", "regular").paused === false, "PSA Regular is the open floor");
  eq(gradingCost("PSA", "express").feeUsd, 149, "PSA Express = $149");
  eq(gradingCost("CGC", "standard").feeUsd, 55, "CGC Standard = $55");
  ok(Math.abs(gradingCost("BGS", "standard").feeUsd - 34.95) < 0.01, "BGS Standard = $34.95 (beckett.com)");
  ok(Math.abs(gradingCost("NOPE", "nope").feeUsd - 79.99) < 0.01, "unknown grader/tier falls back to PSA Regular");

  section("route-costs: venue resolution + conservative fallback");
  eq(venueKey("Collector Crypt"), "collector-crypt", "label normalises to key");
  eq(venueKey("CM"), "cardmarket", "alias CM → cardmarket");
  ok(getPolicy("nonexistent-venue").sellTakeBps === 600, "unknown venue → conservative 6% fallback policy");
  eq(venueBuyerFeeUsd("courtyard", 100), 0, "Courtyard buyer fee = 0");
  ok(Object.keys(MARKETPLACE_POLICIES).length >= 11, "policy set covers 11+ venues");

  section("route-costs: detector nets spreads PER-VENUE (integration)");
  const base = {
    name: "Charizard", set: "Base Set — Unlimited", listingGrade: "PSA 9", spreadGrade: "PSA 9",
    oracleSource: "pc_sold", oracleConfidence: "high", oracleSoldCount: 6, stale: false,
    listingPrice: 100, oraclePrice: 118,
  };
  const spreads = await detectSpreads(undefined, {
    deals: [
      { ...base, cardId: "cy", listingPlatform: "courtyard" },
      { ...base, cardId: "bz", listingPlatform: "beezie" },
    ],
  });
  const byId = Object.fromEntries(spreads.map((s) => [s.productId, s]));
  ok(byId["cy"] && byId["bz"], "both tokenized venues surface a spread on the same A/B");
  ok(
    byId["cy"].netSpreadUsd > byId["bz"].netSpreadUsd,
    `Courtyard nets MORE than Beezie on identical $100→$118 (cy +$${byId["cy"]?.netSpreadUsd} vs bz +$${byId["bz"]?.netSpreadUsd}) — venue-aware, not flat`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await run();
  const { exitWithSummary } = await import("./assert.ts");
  exitWithSummary();
}
