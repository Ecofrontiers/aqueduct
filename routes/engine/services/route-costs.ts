/**
 * route-costs.ts — the ROUTE-COST ORACLE + MARKETPLACE POLICIES (the Routes moat: real per-venue
 * route intelligence).
 *
 * WHY THIS EXISTS. Deal scoring is only honest on LANDED cost, not listing cost
 * (slabclaw-routes/CLAUDE.md rule 1 + rule 4: "route intelligence … is a competitive moat").
 * The prior model (`fees.ts` DEFAULT_FEES) taxed EVERY spread at one flat worst-case 6% sell
 * fee — wrong in BOTH directions: a Courtyard 0%-seller relist was over-penalised (real spreads
 * dropped), while an eBay 13.4% exit was under-penalised (fake spreads surfaced). This module
 * replaces that with a **Marketplace Policy** per venue: not just a fee, but the full route-relevant
 * contract of the venue — chain, settlement rail, custody model, cross-custodian movability, tax
 * treatment, and execution autonomy — plus the sourced take-rates. `quoteAcquire`/`quoteExit` and
 * the spread detector net against what a round-trip ACTUALLY costs, and the planner can reason over
 * a venue's policy (e.g. "this asset can't move cross-custodian", "this leg needs a human KYC").
 *
 * GROUNDING. Every number carries a confidence tag + source. CONFIRMED = the cited source states
 * that exact number; REPORTED = specific secondary; ESTIMATE = triangulated. Fee/grading/shipping
 * figures were re-verified live 2026-07-01 (PSA/BGS/Beckett/USPS/Alt/Fanatics official pages) and
 * grounded against hermes-hackathon/PHYSICAL-GOODS-ECONOMICS.md §2. Update policies HERE, not in
 * scattered magic constants.
 *
 * The arithmetic is DETERMINISTIC and lives here, NOT in the LLM (ROUTES-MECHANICS §5.2).
 */

export type Chain = "base" | "polygon" | "solana" | "ethereum" | "fiat";
export type SettlementRail = "onchain-native" | "onchain-seaport" | "stripe-fiat" | "auction-fiat";
export type Confidence = "confirmed" | "reported" | "estimate";
export type AssetClass = "tokenized" | "physical";
export type CustodyModel = "onchain-wallet" | "platform-vault" | "self-custody";
/** How a buy/list executes on the venue (ROUTES-MECHANICS §7 autonomy verdict). */
export type Autonomy = "autonomous" | "browser-gated" | "human-kyc";

/** The desk's own fill fee on the acquire leg (VaultFactory.createVault fillFeeBps, PRD §3.4). */
export const DESK_FILL_FEE_BPS = 200; // 2%

/**
 * A MarketplacePolicy is the full route-relevant contract of a venue — MORE than fees. It bundles:
 *  (1) economics — sell take, buyer fee, intake/redemption, storage, gas;
 *  (2) settlement — chain + rail;
 *  (3) custody & movement — asset class, where the asset lives, whether it can move cross-custodian;
 *  (4) execution — how autonomously a buy/list runs;
 *  (5) provenance — confidence + source + notes.
 * The planner and the spread detector read the WHOLE policy, not just the fee.
 */
export interface MarketplacePolicy {
  key: string;
  label: string;

  // ---- settlement ----
  chain: Chain;
  settlementRail: SettlementRail;

  // ---- custody & movement (policy, not fees) ----
  /** Is the traded asset a TOKEN (onchain NFT) or a PHYSICAL slab? */
  assetClass: AssetClass;
  /** Where the asset is held once we acquire it. */
  custodyModel: CustodyModel;
  /** Can the asset move to another custodian WITHOUT a redeem-burn? Tokenized vault NFTs are
   *  chain-bound islands → false (redeem burns the token, §5.1). Most physical custody can ship out
   *  → true. Beezie forbids shipping to third-party vaults → false even though redemption exists. */
  crossCustodianMovable: boolean;
  /** How a buy/list executes here (ROUTES-MECHANICS §7): fully autonomous onchain, browser-driven
   *  under the cap, or gated behind a human KYC/consignment step. */
  autonomy: Autonomy;

  // ---- economics ----
  /** Seller-side take on the sell-high / relist leg, in basis points. eBay/Alt are tiered — see venueSellFeeUsd. */
  sellTakeBps: number;
  /** Buyer-side fee on the acquire leg, in basis points (most venues ~0). */
  buyerFeeBps: number;
  /** Flat intake / mint cost for a physical vault-in (0 for buying an already-tokenized/graded slab). */
  intakeUsd: number;
  /** Intake only charged if the asset value is BELOW this (Beezie: $5 if <$1000, free if >=$1000). */
  intakeBelowUsd?: number;
  /** Flat withdrawal / redemption / ship-out cost. */
  redemptionUsd: number;
  /** Percentage withdrawal fee (Collector Crypt: 2% of insured value). */
  redemptionBps: number;
  /** Recurring storage per year (integrated vaults bundle it at $0). */
  storageUsdPerYr: number;
  /** US sales tax applies on physical redemption/ship-out from this custodian. */
  taxOnRedemption: boolean;
  /** Typical onchain settlement gas for one leg on this chain (fiat = 0). */
  gasUsd: number;

  // ---- provenance ----
  confidence: Confidence;
  source: string;
  notes?: string;
}

/**
 * The per-venue marketplace policies. Take-rates are the SELL-side take a card pays when LISTED/SOLD
 * on that venue (the relist-in-place default exit). Buyer fees are what WE pay on the acquire leg.
 * Custody/movement/autonomy fields are grounded in ROUTES-MECHANICS §2–§7 + §5.1.
 */
export const MARKETPLACE_POLICIES: Record<string, MarketplacePolicy> = {
  // ---- Tokenized / onchain venues (the instant round-trip lane; chain-bound islands) ----
  courtyard: {
    key: "courtyard", label: "Courtyard", chain: "polygon", settlementRail: "onchain-seaport",
    assetClass: "tokenized", custodyModel: "onchain-wallet", crossCustodianMovable: false, autonomy: "autonomous",
    sellTakeBps: 0, buyerFeeBps: 0, intakeUsd: 0, redemptionUsd: 18, redemptionBps: 0,
    storageUsdPerYr: 0, taxOnRedemption: false, gasUsd: 0.02,
    confidence: "confirmed", source: "courtyard.io/about (0% seller post 6/3/2025); Reddit ~$18 ship on a $7 card",
    notes: "0% seller is a loss-leader funded by a ~10% instant-buyback spread. Native buy/list is 0%; buying via OpenSea Seaport aggregator adds ~1-2.5% OpenSea fee (ROUTES-MECHANICS §3.4). Tokenize (physical→NFT) is human-KYC + ship, off the autonomous path.",
  },
  "collector-crypt": {
    key: "collector-crypt", label: "Collector Crypt", chain: "solana", settlementRail: "onchain-native",
    assetClass: "tokenized", custodyModel: "onchain-wallet", crossCustodianMovable: false, autonomy: "autonomous",
    sellTakeBps: 200, buyerFeeBps: 200, intakeUsd: 0, redemptionUsd: 0, redemptionBps: 200,
    storageUsdPerYr: 0, taxOnRedemption: false, gasUsd: 0.01,
    confidence: "confirmed", source: "CoinGecko; X @Collector_Crypt (2% = 1% platform + 1% royalty; 0% on swaps; 2% of insured on withdrawal)",
    notes: "RETIRED as a scraper; rides Phygitals (MEMORY project_cc_phygitals_merge). Kept for policy reference.",
  },
  beezie: {
    key: "beezie", label: "Beezie", chain: "base", settlementRail: "onchain-seaport",
    assetClass: "tokenized", custodyModel: "onchain-wallet", crossCustodianMovable: false, autonomy: "autonomous",
    sellTakeBps: 800, buyerFeeBps: 0, intakeUsd: 5, intakeBelowUsd: 1000, redemptionUsd: 5, redemptionBps: 0,
    storageUsdPerYr: 0, taxOnRedemption: true, gasUsd: 0.05,
    confidence: "reported",
    source: "ROUTES-MECHANICS §2.5 (~8% = ~7% Beezie royalty 0x3850… + ~1% OpenSea, the ONCHAIN-executed rate we pay on Base); cf. PHYSICAL-GOODS-ECONOMICS §2 native 6% = 5% platform + 1% creator",
    notes: "ROUTE-INTELLIGENCE DISCREPANCY: native take is 6% (econ doc), but our route buys/lists via OpenSea Seaport on Base (beezie-base, beezie-opensea.mjs) where the effective take is ~8% (7% royalty + 1% OpenSea) — we model 8% (what the executed route costs). crossCustodianMovable=false: 'Beezie cannot ship to third-party vault locations' (§2.6). Verify on the first real mainnet round-trip (ROUTES-MECHANICS §10 TODO 1).",
  },
  phygitals: {
    key: "phygitals", label: "Phygitals", chain: "solana", settlementRail: "onchain-native",
    assetClass: "tokenized", custodyModel: "onchain-wallet", crossCustodianMovable: false, autonomy: "autonomous",
    sellTakeBps: 200, buyerFeeBps: 0, intakeUsd: 0, redemptionUsd: 0, redemptionBps: 0,
    storageUsdPerYr: 0, taxOnRedemption: false, gasUsd: 0.01,
    confidence: "confirmed", source: "docs.phygitals.com/buy-and-sell (2% platform); X @phygitals (zero intake/out-take)",
    notes: "'Zero-fee' = zero Phygitals custody margin, not zero user cost; vaulting is pass-through. Now Fanatics-integrated.",
  },

  // ---- Fiat marketplaces & auction houses (the physical lane) ----
  fanatics: {
    key: "fanatics", label: "Fanatics Collect", chain: "fiat", settlementRail: "auction-fiat",
    assetClass: "physical", custodyModel: "platform-vault", crossCustodianMovable: true, autonomy: "human-kyc",
    sellTakeBps: 600, buyerFeeBps: 0, intakeUsd: 0, redemptionUsd: 0, redemptionBps: 0,
    storageUsdPerYr: 0, taxOnRedemption: false, gasUsd: 0,
    confidence: "confirmed", source: "help.fanaticscollect.com/18433146043933 (Buy Now 6% seller if ≤120% market; >120% jumps to 15%); auction 0% seller + 20% buyer premium",
    notes: "Wire payout works for intl; selling-only dodges EU re-import VAT. Overpriced (>120% market) Buy Now listings incur 15%, not 6%.",
  },
  alt: {
    key: "alt", label: "Alt", chain: "fiat", settlementRail: "stripe-fiat",
    assetClass: "physical", custodyModel: "platform-vault", crossCustodianMovable: true, autonomy: "browser-gated",
    sellTakeBps: 900, buyerFeeBps: 0, intakeUsd: 0, redemptionUsd: 0, redemptionBps: 0,
    storageUsdPerYr: 0, taxOnRedemption: false, gasUsd: 0,
    confidence: "confirmed", source: "support.alt.xyz/9682168 — Fixed Price seller fee TIERED (Base): $1-249 14%, $250-7,499 9%, $7,500-9,999 7%, $10k+ 5%; buyer 0%",
    notes: "TIERED — venueSellFeeUsd applies the price bands (9% in the $250-7,499 reseller sweet spot; as low as 4-5% at Black tier / $10k+). Auctions: 0% seller + 20% buyer premium.",
  },
  ebay: {
    key: "ebay", label: "eBay", chain: "fiat", settlementRail: "stripe-fiat",
    assetClass: "physical", custodyModel: "self-custody", crossCustodianMovable: true, autonomy: "browser-gated",
    sellTakeBps: 1325, buyerFeeBps: 0, intakeUsd: 0, redemptionUsd: 0, redemptionBps: 0,
    storageUsdPerYr: 0, taxOnRedemption: false, gasUsd: 0,
    confidence: "confirmed", source: "ebay.com/sellercenter (13.25% FVF ≤$7.5k +2.35% above +$0.40); pages.ebay.com/promo (50% singles discount >$1,000 → ~6.6% effective)",
    notes: "TIERED — sellTakeBps 1325 is the headline FVF; venueSellFeeUsd applies the >$1,000 singles half-off band → ~6.6% effective on high-value singles. Buy has NO autonomous API (Buy Order is Limited-Release) → browser checkout on a capped Stripe Issuing card (§4.2). keep-in-PSA-Vault avoids ship-out + tax (§4.4).",
  },
  tcgplayer: {
    key: "tcgplayer", label: "TCGplayer", chain: "fiat", settlementRail: "stripe-fiat",
    assetClass: "physical", custodyModel: "self-custody", crossCustodianMovable: true, autonomy: "browser-gated",
    sellTakeBps: 1350, buyerFeeBps: 0, intakeUsd: 0, redemptionUsd: 0, redemptionBps: 0,
    storageUsdPerYr: 0, taxOnRedemption: false, gasUsd: 0,
    confidence: "confirmed", source: "help.tcgplayer.com (L1-4: 10.75% cap $75 + 2.5%+$0.30 proc ≈ 13.5%; Direct ≈ 11.7%)",
    notes: "Ships phantom listings + $0 shipping — phantom-guard hard (MEMORY tcgplayer_data_quality).",
  },
  cardmarket: {
    key: "cardmarket", label: "Cardmarket", chain: "fiat", settlementRail: "stripe-fiat",
    assetClass: "physical", custodyModel: "self-custody", crossCustodianMovable: true, autonomy: "browser-gated",
    sellTakeBps: 550, buyerFeeBps: 75, intakeUsd: 0, redemptionUsd: 0, redemptionBps: 0,
    storageUsdPerYr: 0, taxOnRedemption: false, gasUsd: 0,
    confidence: "confirmed", source: "cardmarket/retailed.io (5% cap €100 seller; 0.5-1% trustee buyer)",
    notes: "Europe's largest TCG marketplace; EUR-denominated. Our CM proxy is fragile (MEMORY project_cm_proxy_tiered_cascade) — Apify Actor is the metered fallback.",
  },
  goldin: {
    key: "goldin", label: "Goldin", chain: "fiat", settlementRail: "auction-fiat",
    assetClass: "physical", custodyModel: "platform-vault", crossCustodianMovable: true, autonomy: "human-kyc",
    sellTakeBps: 1650, buyerFeeBps: 2200, intakeUsd: 0, redemptionUsd: 0, redemptionBps: 0,
    storageUsdPerYr: 0, taxOnRedemption: false, gasUsd: 0,
    confidence: "reported", source: "goldin.co/blowoutforums (6-27% seller tiered + 22% BP $19 min → ~28-49% all-in)",
    notes: "Auction house — all-in round-trip 28-49%. Almost never a viable arb exit; kept for completeness.",
  },
  heritage: {
    key: "heritage", label: "Heritage", chain: "fiat", settlementRail: "auction-fiat",
    assetClass: "physical", custodyModel: "platform-vault", crossCustodianMovable: true, autonomy: "human-kyc",
    sellTakeBps: 1000, buyerFeeBps: 2000, intakeUsd: 0, redemptionUsd: 0, redemptionBps: 0,
    storageUsdPerYr: 0, taxOnRedemption: false, gasUsd: 0,
    confidence: "reported", source: "ha.com terms (~5-15% seller waivable + 20% BP $30 min → ~30%, ~20% if waived)",
    notes: "Auction house — high all-in; not an arb exit.",
  },
};

/** Fallback policy for an unknown venue: conservative worst-case (6% sell take + $2 settle, physical self-custody). */
const UNKNOWN_POLICY: MarketplacePolicy = {
  key: "unknown", label: "unknown", chain: "fiat", settlementRail: "stripe-fiat",
  assetClass: "physical", custodyModel: "self-custody", crossCustodianMovable: true, autonomy: "browser-gated",
  sellTakeBps: 600, buyerFeeBps: 0, intakeUsd: 0, redemptionUsd: 0, redemptionBps: 0,
  storageUsdPerYr: 0, taxOnRedemption: false, gasUsd: 2,
  confidence: "estimate", source: "fallback — venue not in the policy set; conservative 6% sell take + $2 settle",
};

/** Normalise a raw platform string from the deal feed to a MARKETPLACE_POLICIES key. */
export function venueKey(raw: string | undefined): string {
  if (!raw) return "unknown";
  const k = raw.toLowerCase().trim().replace(/\s+/g, "-");
  if (k in MARKETPLACE_POLICIES) return k;
  // common aliases
  if (k === "cc" || k === "collectorcrypt") return "collector-crypt";
  if (k === "ebay_sold" || k === "ebaysold") return "ebay";
  if (k === "tcg" || k === "tcgplayer_direct") return "tcgplayer";
  if (k === "cm") return "cardmarket";
  return "unknown";
}

/** Resolve a venue string to its MarketplacePolicy (conservative fallback for unknown venues). */
export function getPolicy(raw: string | undefined): MarketplacePolicy {
  return MARKETPLACE_POLICIES[venueKey(raw)] ?? UNKNOWN_POLICY;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Seller-side fee in USD for selling `saleUsd` on `venue`. Handles the TIERED policies: eBay's
 * >$1,000 singles half-off (making a $21,790 Charizard net ~6.6% effective) and Alt's price bands.
 */
export function venueSellFeeUsd(rawVenue: string | undefined, saleUsd: number): number {
  const p = getPolicy(rawVenue);
  if (!(saleUsd > 0)) return 0;
  if (p.key === "ebay") {
    // Singles promo: first $1,000 at full 13.25% FVF, everything above $1,000 at HALF (6.625%)
    // (~$1,438 realized fee on the $21,790 Charizard, PHYSICAL-GOODS-ECONOMICS §1.1.2). +$0.40 flat.
    const band1 = Math.min(saleUsd, 1000);
    const above = Math.max(0, saleUsd - 1000);
    return round2(band1 * 0.1325 + above * 0.06625 + 0.4);
  }
  if (p.key === "alt") {
    // Alt Fixed-Price Base-tier bands (CONFIRMED support.alt.xyz/9682168), by sale price.
    const bps = saleUsd < 250 ? 1400 : saleUsd < 7500 ? 900 : saleUsd < 10000 ? 700 : 500;
    return round2(saleUsd * (bps / 10_000));
  }
  return round2(saleUsd * (p.sellTakeBps / 10_000));
}

/** Buyer-side fee in USD for acquiring at `askUsd` on `venue` (most venues ~0). */
export function venueBuyerFeeUsd(rawVenue: string | undefined, askUsd: number): number {
  return round2(Math.max(0, askUsd) * (getPolicy(rawVenue).buyerFeeBps / 10_000));
}

/** Typical onchain settlement gas for one leg on the venue's chain. */
export function venueGasUsd(rawVenue: string | undefined): number {
  return getPolicy(rawVenue).gasUsd;
}

// ---- Insurance (value-scaled) + sales tax ----

/**
 * USPS shipping insurance for a declared value (per leg), from the CONFIRMED Jan-2026 USPS fee
 * schedule (research 2026-07-01, loop.com industry table): ≤$50 $2.70, ≤$100 $3.45, ≤$200 $4.60,
 * ≤$300 $5.80, then +$1.20 per additional $100 up to the $5,000 standard cap ($62.20 at $5k ≈
 * 1.24%). Above $5,000 requires Registered Mail (covers to $50,000); marginal ~0.4% (ShipSaver/U-PIC).
 */
export function insuranceCostUsd(declaredValueUsd: number): number {
  const v = declaredValueUsd;
  if (!(v > 0)) return 0;
  if (v <= 50) return 2.7;
  if (v <= 100) return 3.45;
  if (v <= 200) return 4.6;
  if (v <= 300) return 5.8;
  if (v <= 5000) return round2(5.8 + Math.ceil((v - 300) / 100) * 1.2); // +$1.20 / $100
  return round2(62.2 + (v - 5000) * 0.004); // Registered Mail territory
}

/**
 * USPS shipping method + cost for a single slab by declared value (CONFIRMED Jan-2026 rates):
 * Ground Advantage $7.90 (sub-$500 default), Priority ~$11 (mid), Registered Mail $17.50 + postage
 * (the only product covering >$5,000, up to $50,000). One leg.
 */
export function shipCostUsd(declaredValueUsd: number): number {
  if (declaredValueUsd > 5000) return 17.5; // Registered Mail
  if (declaredValueUsd > 500) return 11.0; // Priority
  return 7.9; // Ground Advantage
}

/** Blended US state+local sales-tax rate applied when a physical good is DELIVERED/redeemed. */
export const DEFAULT_SALES_TAX_RATE = 0.08; // ~8% blended (marketplace-facilitator collected)

/**
 * Sales tax on a physical redemption / ship-to-buyer leg. Taxable ONLY when we take physical
 * delivery or ship out of custody — keeping the slab vaulted (keep-in-PSA-Vault, tokenized
 * relist-in-place) avoids it entirely (ROUTES-MECHANICS §4.4 / §5.1). Not charged on a normal
 * marketplace sale where the BUYER pays the facilitator-collected tax.
 */
export function salesTaxUsd(valueUsd: number, taxable: boolean, rate: number = DEFAULT_SALES_TAX_RATE): number {
  return taxable && valueUsd > 0 ? round2(valueUsd * rate) : 0;
}

export interface RoundTripFees {
  totalUsd: number;
  deskFillUsd: number; // our fill fee on the buy
  buyerFeeUsd: number; // venue buyer fee on the buy
  sellFeeUsd: number; // exit-venue take on the sell
  transferUsd: number; // gas (onchain) or ship+insure (physical move) to relist/exit
  taxUsd: number; // sales tax on a physical ship-out/redemption (0 for relist-in-place/vaulted)
  buyVenue: string;
  exitVenue: string;
  relistInPlace: boolean;
  breakdown: string[];
}

/**
 * The honest round-trip cost of buying at `askUsd` on `buyVenue` and exiting at `sellUsd`.
 * `exitVenue` defaults to `buyVenue` (relist-in-place, the cheapest honest exit — ROUTES-MECHANICS
 * §2.5). Pass a different `exitVenue` to price a move-venue exit. Transfer cost by form:
 *   - tokenized → onchain gas on both venues' chains (relist-in-place is gas-only).
 *     NOTE: a tokenized CROSS-venue asset move is structurally blocked (redeem burns the token,
 *     vault NFTs are chain-bound islands — §5.1; policy.crossCustodianMovable=false); callers
 *     should not price a tokenized move-venue.
 *   - physical (raw/slabbed) → relist-in-place needs no ship; a cross-venue MOVE ships the slab
 *     (value-aware method + insured) AND, if it leaves custody to a taxable destination, incurs tax.
 */
export function roundTripFeesUsd(args: {
  buyVenue: string | undefined;
  sellUsd: number;
  askUsd: number;
  exitVenue?: string;
  form?: "raw" | "slabbed" | "tokenized";
  /** Declared value for insurance on a physical move (defaults to max(ask, sell)). */
  declaredValueUsd?: number;
  /** Force the sales-tax treatment of a physical move-venue exit (defaults to the exit policy's rule). */
  taxableMove?: boolean;
}): RoundTripFees {
  const buy = getPolicy(args.buyVenue);
  const exit = getPolicy(args.exitVenue ?? args.buyVenue);
  const form = args.form ?? (buy.assetClass === "tokenized" ? "tokenized" : "slabbed");
  const sameVenue = buy.key === exit.key;
  const declaredValueUsd = args.declaredValueUsd ?? Math.max(args.askUsd, args.sellUsd);

  const deskFillUsd = round2(Math.max(0, args.askUsd) * (DESK_FILL_FEE_BPS / 10_000));
  const buyerFeeUsd = venueBuyerFeeUsd(args.buyVenue, args.askUsd);
  const sellFeeUsd = venueSellFeeUsd(args.exitVenue ?? args.buyVenue, args.sellUsd);

  let transferUsd: number;
  let taxUsd = 0;
  if (form === "tokenized") {
    transferUsd = round2(buy.gasUsd + exit.gasUsd);
  } else if (sameVenue) {
    transferUsd = 0; // relist-in-place: already held here, no ship, no redemption tax
  } else {
    // cross-venue physical MOVE: ship the slab (value-aware method + insured) + redemption tax
    transferUsd = round2(shipCostUsd(declaredValueUsd) + insuranceCostUsd(declaredValueUsd));
    const taxable = args.taxableMove ?? exit.taxOnRedemption ?? false;
    taxUsd = salesTaxUsd(args.sellUsd, taxable);
  }

  const totalUsd = round2(deskFillUsd + buyerFeeUsd + sellFeeUsd + transferUsd + taxUsd);
  return {
    totalUsd,
    deskFillUsd, buyerFeeUsd, sellFeeUsd, transferUsd, taxUsd,
    buyVenue: buy.key, exitVenue: exit.key, relistInPlace: sameVenue,
    breakdown: [
      `desk fill ${DESK_FILL_FEE_BPS / 100}% = $${deskFillUsd}`,
      `buyer fee (${buy.label}) = $${buyerFeeUsd}`,
      `sell take (${exit.label}) = $${sellFeeUsd}`,
      `transfer (${form}${sameVenue ? ", relist-in-place" : ", move-venue"}) = $${transferUsd}`,
      ...(taxUsd > 0 ? [`sales tax (redemption) = $${taxUsd}`] : []),
    ],
  };
}

// ---- Best-exit selection + landed-cost-adjusted ceiling (the quoteExit answer) ----

export interface ExitQuote {
  exitVenue: string;
  label: string;
  sellFeeUsd: number;
  transferUsd: number;
  taxUsd: number;
  netProceedsUsd: number; // sellUsd − sellFee − transfer − tax
  relistInPlace: boolean;
}

/** Price a single exit route (relist-in-place if exitVenue === buyVenue). */
export function quoteExit(args: {
  buyVenue: string | undefined;
  exitVenue: string;
  sellUsd: number;
  form?: "raw" | "slabbed" | "tokenized";
  declaredValueUsd?: number;
}): ExitQuote {
  const rt = roundTripFeesUsd({
    buyVenue: args.buyVenue, exitVenue: args.exitVenue, sellUsd: args.sellUsd,
    askUsd: 0, form: args.form, declaredValueUsd: args.declaredValueUsd,
  });
  return {
    exitVenue: rt.exitVenue,
    label: getPolicy(args.exitVenue).label,
    sellFeeUsd: rt.sellFeeUsd,
    transferUsd: rt.transferUsd,
    taxUsd: rt.taxUsd,
    netProceedsUsd: round2(args.sellUsd - rt.sellFeeUsd - rt.transferUsd - rt.taxUsd),
    relistInPlace: rt.relistInPlace,
  };
}

/**
 * The `quoteExit` moat answer: pick the exit that MAXIMISES net proceeds (ROUTES-MECHANICS §9).
 * For TOKENIZED cards the asset cannot move cross-custodian (policy.crossCustodianMovable=false,
 * §5.1), so the only exit is relist-in-place. For physical/slabbed cards we compare relist-in-place
 * against moving the slab to each candidate venue (ship + insure + redemption tax) and keep the best.
 */
export function bestExit(args: {
  buyVenue: string | undefined;
  sellUsd: number;
  form?: "raw" | "slabbed" | "tokenized";
  /** Candidate move-venues to consider (physical only); defaults to the liquid fiat marketplaces. */
  candidateExits?: string[];
  declaredValueUsd?: number;
}): { best: ExitQuote; all: ExitQuote[] } {
  const buyKey = venueKey(args.buyVenue);
  const form = args.form ?? (getPolicy(args.buyVenue).assetClass === "tokenized" ? "tokenized" : "slabbed");

  // Always consider relist-in-place.
  const candidates = new Set<string>([buyKey]);
  if (form !== "tokenized") {
    // physical assets can move cross-venue; tokenized cannot (chain-bound island, §5.1)
    const defaults = args.candidateExits ?? ["ebay", "cardmarket", "fanatics"];
    for (const c of defaults) candidates.add(venueKey(c));
  }

  const all = [...candidates].map((exitVenue) =>
    quoteExit({ buyVenue: args.buyVenue, exitVenue, sellUsd: args.sellUsd, form, declaredValueUsd: args.declaredValueUsd }),
  );
  all.sort((a, b) => b.netProceedsUsd - a.netProceedsUsd);
  return { best: all[0], all };
}

/**
 * Landed-cost-adjusted acquisition CEILING (route-aware deal scoring, CLAUDE.md rule 1): the most
 * we can pay on the buy leg and still break even, given the best exit for `sellUsd`. Feed this back
 * into the acquire intent's maxPrice so deals are scored on LANDED cost, not listing cost.
 */
export function landedCeilingUsd(args: {
  sellUsd: number;
  buyVenue: string | undefined;
  form?: "raw" | "slabbed" | "tokenized";
  declaredValueUsd?: number;
}): number {
  const { best } = bestExit(args);
  // ceiling = best net proceeds − our fill fee on the buy (approximated at the ceiling itself).
  // Solve ceiling = net − ceiling*fillRate  →  ceiling = net / (1 + fillRate).
  const fillRate = DESK_FILL_FEE_BPS / 10_000;
  return round2(best.netProceedsUsd / (1 + fillRate));
}

// ---- Grading (the raw→graded route's Grade + ship edges) ----

export interface GradingService {
  feeUsd: number; // grading fee per card (submission)
  roundTripShipUsd: number; // ship-to-grader + return, insured
  turnaroundDaysLo: number;
  turnaroundDaysHi: number;
  paused: boolean;
  source: string;
}

/**
 * Grading cost + TURNAROUND by grader × tier. Turnaround is load-bearing: the capital-lock duration
 * the vault (ERC-7540 async-redeem) prices as carry. PSA Value tiers PAUSED since 2026-06-02 amid a
 * ~10M-card backlog — a real, live constraint the planner must respect. raw-ev.mjs (computeGradingEV)
 * is the source of truth for the fee inside the EV math; this table adds turnaround/paused metadata
 * and a cross-check value. All PSA/BGS figures CONFIRMED live 2026-07-01.
 */
export const GRADERS: Record<string, Record<string, GradingService>> = {
  // CONFIRMED psacard.com/services/tradingcardgrading (2026). Value tiers PAUSED 2026-06-02
  // (~10M→14M backlog; reopening tied to a 5M target ~4mo out). Open floor is Regular.
  PSA: {
    value: { feeUsd: 30, roundTripShipUsd: 25, turnaroundDaysLo: 100, turnaroundDaysHi: 120, paused: true,
      source: "psacard.com Backlog Tracker — Value/Value Bulk/Plus/Max PAUSED 2026-06-02 (~$30, 100-120d)" },
    economy: { feeUsd: 30, roundTripShipUsd: 25, turnaroundDaysLo: 100, turnaroundDaysHi: 120, paused: true,
      source: "≈ PSA Value (no official 'economy' tier) — PAUSED; the open floor is Regular" },
    regular: { feeUsd: 79.99, roundTripShipUsd: 25, turnaroundDaysLo: 40, turnaroundDaysHi: 50, paused: false,
      source: "CONFIRMED psacard.com/services/tradingcardgrading — Regular $79.99, 40-50 biz days, $1,500 cap" },
    express: { feeUsd: 149, roundTripShipUsd: 25, turnaroundDaysLo: 20, turnaroundDaysHi: 30, paused: false,
      source: "CONFIRMED psacard.com — Express $149, 20-30 biz days, $2,500 cap" },
    "super-express": { feeUsd: 349, roundTripShipUsd: 30, turnaroundDaysLo: 7, turnaroundDaysHi: 10, paused: false,
      source: "CONFIRMED psacard.com — Super Express $349, 7-10 biz days, $5,000 cap" },
    "walk-through": { feeUsd: 599, roundTripShipUsd: 30, turnaroundDaysLo: 5, turnaroundDaysHi: 7, paused: false,
      source: "CONFIRMED psacard.com — Walk-Through $599, 5-7 biz days, $10,000 cap" },
  },
  CGC: {
    standard: { feeUsd: 55, roundTripShipUsd: 25, turnaroundDaysLo: 20, turnaroundDaysHi: 45, paused: false,
      source: "PHYSICAL-GOODS-ECONOMICS §1.1.3 — CGC Standard $55 (open tier)" },
  },
  // CONFIRMED beckett.com/grading (2026).
  BGS: {
    base: { feeUsd: 14.95, roundTripShipUsd: 25, turnaroundDaysLo: 75, turnaroundDaysHi: 90, paused: false,
      source: "CONFIRMED beckett.com/grading — Base $14.95 (no subgrades)/$17.95 (subgrades), 75+ biz days" },
    standard: { feeUsd: 34.95, roundTripShipUsd: 25, turnaroundDaysLo: 45, turnaroundDaysHi: 45, paused: false,
      source: "CONFIRMED beckett.com/grading — Standard $34.95, 45 biz days (subgrades incl.)" },
    express: { feeUsd: 79.95, roundTripShipUsd: 25, turnaroundDaysLo: 15, turnaroundDaysHi: 15, paused: false,
      source: "CONFIRMED beckett.com/grading — Express $79.95, 15 biz days" },
    priority: { feeUsd: 124.95, roundTripShipUsd: 30, turnaroundDaysLo: 5, turnaroundDaysHi: 5, paused: false,
      source: "CONFIRMED beckett.com/grading — Priority $124.95, 5 biz days" },
  },
};

/** Look up a grading service, tolerant of unknown grader/tier (falls back to PSA Regular). */
export function gradingCost(grader: string = "PSA", tier: string = "regular"): GradingService {
  return GRADERS[grader]?.[tier] ?? GRADERS.PSA.regular;
}

// ---- Shipping edges (CostVector-shaped, consumed by routes-plan.ts) ----

export interface ShipEdge {
  shippingUsd: number;
  taxUsd: number;
  serviceFeeUsd: number;
  insuranceUsd: number;
  timeDays: number;
}

/**
 * Ship a raw card to the grader (ONE leg), value-aware (CONFIRMED Jan-2026 USPS rates). For a
 * typical sub-$500 raw this is Ground Advantage $7.90 + insurance; the return leg (graded, higher
 * value) is priced separately by shipToGraderRoundTrip. ~4 business days transit.
 */
export function shipToGrader(declaredValueUsd: number): ShipEdge {
  return {
    shippingUsd: shipCostUsd(declaredValueUsd),
    taxUsd: 0,
    serviceFeeUsd: 0,
    insuranceUsd: insuranceCostUsd(declaredValueUsd),
    timeDays: 4,
  };
}

/**
 * Round-trip ship a card to the grader and back — the honest raw→graded ship cost. Out-leg is
 * insured at the RAW value, return-leg at the (higher) expected GRADED value. Replaces the ~$60
 * flat batch estimate (PHYSICAL-GOODS-ECONOMICS §1.1.1) with two value-aware insured legs.
 */
export function shipToGraderRoundTrip(rawValueUsd: number, gradedValueUsd?: number): ShipEdge {
  const out = shipToGrader(rawValueUsd);
  const back = shipToGrader(gradedValueUsd ?? rawValueUsd);
  return {
    shippingUsd: round2(out.shippingUsd + back.shippingUsd),
    taxUsd: 0,
    serviceFeeUsd: 0,
    insuranceUsd: round2(out.insuranceUsd + back.insuranceUsd),
    timeDays: out.timeDays + back.timeDays,
  };
}

/** Low-value single-leg ship constant (Ground Advantage + $100-tier insurance), for callers wanting a fixed edge. */
export const SHIP_TO_GRADER: ShipEdge = { shippingUsd: 7.9, taxUsd: 0, serviceFeeUsd: 0, insuranceUsd: 3.45, timeDays: 4 };

/** Ship a slab between custodians / venues (cross-venue physical move), value-aware. */
export function shipToCustody(declaredValueUsd: number): ShipEdge {
  return shipToGrader(declaredValueUsd);
}

/** Integrated-vault custody (PSA/Fanatics bundle storage + insurance at $0/yr). */
export const CUSTODY_INTEGRATED: ShipEdge = { shippingUsd: 0, taxUsd: 0, serviceFeeUsd: 0, insuranceUsd: 0, timeDays: 0 };
