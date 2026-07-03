// Aqueduct — Glow solar connector. Same discipline as connectors/certifiers.mjs: a curated,
// dated SNAPSHOT of real, individually-verified records, never a live poll inside the sim
// tick. Glow (glow.org) is a fully-onchain distributed-solar protocol; it is Aqueduct's own
// aggregate → verify → price → publish → fill → settle loop applied to solar instead of
// coffee, which is why it slots into the same primitives (farm = lot, GCA audit = certifier,
// GCC/GLW = oracle registers, Miner = the structured receivable the tokenizer race sims).
//
// PROVENANCE, honestly (probed live 2026-07-03, not training-data recall):
//   - Farm records: glow.org/api/audits (124 farms) joined to the public R2 weekly archive
//     week-135 (150 farms) for per-farm output/payment. Coordinates, panels, wattage, carbon
//     and install date are REAL reads. The API schema drifted 2026-07 (fields moved under
//     `summary.*`) — see modules/intelligence/sources/glow.ts, which reads the same surface.
//   - GLW price: LIVE onchain read of the GLW/USDG Uniswap-V2 pool (reserves) — a healthy,
//     ~$280k-depth register.
//   - GCC price: BOTH onchain registers are degenerate today (auction drained, pool dust).
//     We report that verdict rather than invent a price — the honesty IS the feature, the
//     same discipline as certifiers.mjs never populating lot.certs to make a rule pass.
//   - Miner terms: a REPORTED (not independently fetchable) app.glow.org listing, corroborated
//     by a live mainnet OFFCHAIN_FRACTIONS contract. Confidence is "reported", never "confirmed".
//
// FILLS stay SIM until Glow publishes V2 addresses; every value here carries its own provenance.

const FETCHED_AT = "2026-07-03";
const AUDITS_URL = "https://glow.org/api/audits";
// The per-farm week-135 output/payment on each record is joined from this public R2 archive.
export const GLOW_R2_WEEK_135_URL = "https://pub-7e0365747f054c9e85051df5f20fa815.r2.dev/week-135/filtered-data.json";

// Confirmed mainnet addresses — copied verbatim from @glowlabs-org/utils v0.2.182
// (utils/package/src/constants/addresses.ts) and the live probe scripts, never truncated.
export const GLOW_ADDRESSES = {
  GLW: "0xf4fbC617A5733EAAF9af08E1Ab816B103388d8B6",
  USDG: "0xe010ec500720bE9EF3F82129E7eD2Ee1FB7955F2",
  GCC: "0x21C46173591f39AfC1d2B634b74c98F0576A272B",
  // Resolved onchain via GCC.CARBON_CREDIT_AUCTION() — doc-11's address was a corrupted
  // transcription; this is the real declining-price auction contract.
  CARBON_CREDIT_AUCTION: "0x85fbB04DEBBDEa052a6422E74bFeA57B17e50A80",
  GLW_USDG_POOL: "0x6fa09ffc45f1ddc95c1bc192956717042f142c5d",
  USDG_GCC_POOL: "0xeed0974404f635aa5e5f6e4793d1a417798f164e",
  OFFCHAIN_FRACTIONS: "0x80EA852448c2807BeAe321deC7c603990209F7db",
};

/**
 * @typedef {Object} GlowFarm
 * @property {string} id - hexlified public key (content-addressed farm id)
 * @property {number} shortId - the monitoring-box Short ID (human-meaningful)
 * @property {string} name - human-readable farm name
 * @property {number} lng - signed longitude (W = negative)
 * @property {number} lat - signed latitude (S = negative)
 * @property {string} location - as reported by the audit
 * @property {number} panelCount
 * @property {number} systemWattageKw - normalized to kW (MW ratings ×1000)
 * @property {number} weeklyCarbonCredit - adjustedWeeklyCarbonCredit, tCO2/week
 * @property {string} installDate
 * @property {string} auditor - GCA member who signed the audit
 * @property {string} auditDate
 * @property {number|null} weekOutputKwh - week-135 powerOutput (null if not joinable)
 * @property {number|null} weekPaymentUsd - week-135 weeklyPayment
 * @property {"SNAPSHOT"} provenance
 * @property {string} fetched_at
 * @property {string} source
 */

/**
 * Curated snapshot of 10 representative real Glow farms — diverse geography (Florida,
 * California, Utah, Oklahoma, Missouri, Rajasthan/India) and size (a 13-panel 5.72 kW-DC
 * residential rooftop up to a 29,358-panel 16 MW-DC utility array), all with clean `summary`
 * data and (where joinable) week-135 output/payment. US farms sit at negative longitudes
 * (Western hemisphere); the three Rajasthan farms at positive longitudes.
 * @type {GlowFarm[]}
 */
const GLOW_FARMS = [
  {
    id: "0xfb9d6f96055942092a25c39f2a22badf6ef89adc3c9d2c30c1dbd2029cbf7dd1",
    shortId: 1200,
    name: "Auric Peninsula",
    location: "FL 33974, USA",
    lng: -81.57948,
    lat: 26.53305,
    panelCount: 13,
    systemWattageKw: 5.72,
    weeklyCarbonCredit: 0.0728,
    installDate: "June 25th, 2026",
    auditor: "Fatima Khaz",
    auditDate: "June 30th, 2026",
    weekOutputKwh: 0,
    weekPaymentUsd: 87.81,
  },
  {
    id: "0x83a22706770edb0e6765c8d99cb2a488d778eedcb3c73f1d9e331c88b32fa428",
    shortId: 460,
    name: "Frost Orchard",
    location: "CA 95129, USA",
    lng: -122.00313,
    lat: 37.30415,
    panelCount: 14,
    systemWattageKw: 5.74,
    weeklyCarbonCredit: 0.05,
    installDate: "August 19th, 2024",
    auditor: "Fatima Khaz",
    auditDate: "November 27th, 2024",
    weekOutputKwh: 236.3,
    weekPaymentUsd: 156.46,
  },
  {
    id: "0x0560069c2c406f771d07d3315ae5840328804fd82851562089899d9e74cc169c",
    shortId: 235,
    name: "Sapphire Overlook",
    location: "Sandy, UT 84070, USA",
    lng: -111.88319,
    lat: 40.60669,
    panelCount: 19,
    systemWattageKw: 7.51,
    weeklyCarbonCredit: 0.1114,
    installDate: "June 6th, 2024",
    auditor: "Fatima Khaz",
    auditDate: "July 17th, 2024",
    weekOutputKwh: 287.51,
    weekPaymentUsd: 61.97,
  },
  {
    id: "0x32cdf770afe488c18dc1255af69622433d1226c2d90b73e76812e165c6105a29",
    shortId: 720,
    name: "Zenith Glen",
    location: "OK 74059, USA",
    lng: -97.01873,
    lat: 35.98022,
    panelCount: 25,
    systemWattageKw: 10.63,
    weeklyCarbonCredit: 0.0897,
    installDate: "September 8th, 2024",
    auditor: "Fatima Khaz",
    auditDate: "February 10th, 2026",
    weekOutputKwh: 306.39,
    weekPaymentUsd: 226.81,
  },
  {
    id: "0x46027fb50964069e837b42604935f11061d2ada9c5d1e5bc435b4827e6de17d8",
    shortId: 90,
    name: "Golden Crossing",
    location: "FL 32960, USA",
    lng: -80.40863,
    lat: 27.62446,
    panelCount: 36,
    systemWattageKw: 13.32,
    weeklyCarbonCredit: 0.1172,
    installDate: "March 14th, 2024",
    auditor: "Fatima Khaz",
    auditDate: "May 6th, 2024",
    weekOutputKwh: 283.03,
    weekPaymentUsd: 128.6,
  },
  {
    id: "0xeac913110b4531806b3c576427cf5876dadb9326d5b3c6bcdb8395d29a76c56a",
    shortId: 790,
    name: "Exo Flats",
    location: "MO 64057, USA",
    lng: -94.35609,
    lat: 39.07066,
    panelCount: 48,
    systemWattageKw: 18.96,
    weeklyCarbonCredit: 0.1364,
    installDate: "January 2nd, 2025",
    auditor: "Fatima Khaz",
    auditDate: "November 18th, 2025",
    weekOutputKwh: 476.53,
    weekPaymentUsd: 234.83,
  },
  {
    id: "0xf0f82c95fbb23b70092bdc02b3890365112d85cf6e0eb18f4dbb01db8f22630c",
    shortId: 310,
    name: "Vivid Chasm",
    location: "Utah 84104, USA",
    lng: -111.9614,
    lat: 40.75933,
    panelCount: 200,
    systemWattageKw: 80,
    weeklyCarbonCredit: 1.1799,
    installDate: "June 27th, 2024",
    auditor: "Fatima Khaz",
    auditDate: "August 6th, 2024",
    weekOutputKwh: 970.35,
    weekPaymentUsd: 674.82,
  },
  {
    id: "0xe83d2384fd0555bdae482606403a29293529946e3ccf329d38d2317f163a14ce",
    shortId: 1005,
    name: "Radiant Plane",
    location: "Rajasthan F7JC+75X, India",
    lng: 73.26036,
    lat: 27.48284,
    panelCount: 1008,
    systemWattageKw: 589.7,
    weeklyCarbonCredit: 8.0878,
    installDate: "March 30th, 2025",
    auditor: "Fatima Khaz",
    auditDate: "April 14th, 2026",
    weekOutputKwh: 18890.64,
    weekPaymentUsd: 4966.43,
  },
  {
    id: "0x60efe783cd972dd9bb6ceae089012d0d18f91df6603201b73e54ed542de0b000",
    shortId: 445,
    name: "Ivy Sanctuary",
    location: "Rajasthan 334001, India",
    lng: 73.07398,
    lat: 28.0193,
    panelCount: 2361,
    systemWattageKw: 1300,
    weeklyCarbonCredit: 19.9845,
    installDate: "September 25th, 2024",
    auditor: "Fatima Khaz",
    auditDate: "October 2nd, 2024",
    weekOutputKwh: 11382.93,
    weekPaymentUsd: 4104.37,
  },
  {
    id: "0x1bb6446a486906d758b2cfe2918effecf63ae1c49e7c75414946f5d6fdd72a85",
    shortId: 525,
    name: "Berry Flats",
    location: "Rajasthan, India",
    lng: 73.07398,
    lat: 28.0193,
    panelCount: 29358,
    systemWattageKw: 16000,
    weeklyCarbonCredit: 246.2376,
    installDate: "November 18th, 2024",
    auditor: "Fatima Khaz",
    auditDate: "November 27th, 2024",
    weekOutputKwh: 4457.4,
    weekPaymentUsd: 3549.09,
  },
].map((f) => ({ ...f, provenance: "SNAPSHOT", fetched_at: FETCHED_AT, source: AUDITS_URL }));

/** The 10-farm curated snapshot (real reads, dated). Returns a fresh array each call so a
 *  caller can't mutate the module state. */
export function listGlowFarms() {
  return GLOW_FARMS.map((f) => ({ ...f }));
}

/** Resolve one farm by hexlified id OR shortId. Returns undefined if not in the snapshot. */
export function getGlowFarmById(id) {
  const f = GLOW_FARMS.find((g) => g.id === id || String(g.shortId) === String(id));
  return f ? { ...f } : undefined;
}

/** Resolve a farm id (hexlified id OR shortId) to its GCA audit record — the standards-
 *  resolver surface used by sim/standardsRegistry.mjs's GLOW-GCA source. Throws on an unknown
 *  id, same discipline as resolveCertifier / resolveIrisMetric. The GCA (Glow Certification
 *  Agent) is Glow's on-protocol certifier — the solar analog to a TIC firm in certifiers.mjs.
 *  @param {string} code - farm id */
export function resolveGlowAudit(code) {
  const f = getGlowFarmById(code);
  if (!f) {
    throw new Error(
      `connectors/glow.mjs: unknown Glow farm id "${code}" — resolve against the audits snapshot, do not invent one.`,
    );
  }
  return {
    // `code` mirrors the resolved id — interface parity with resolveCertifier's { code, name }
    // shape, since generic consumers read `.code` regardless of the standards source.
    code: f.id,
    name: `Glow GCA audit — ${f.name}`,
    auditor: f.auditor,
    auditDate: f.auditDate,
    panelCount: f.panelCount,
    systemWattageKw: f.systemWattageKw,
    weeklyCarbonCredit: f.weeklyCarbonCredit,
    provenance: f.provenance,
    source: f.source,
  };
}

/** LIVE-read snapshot of the GLW/USDG Uniswap-V2 pool. usdPerGlw = reservesUsdg / reservesGlw
 *  (USDG is a 1:1 USDC wrapper, so the USDG leg is the dollar leg). liquidityUsd is the
 *  one-sided USDG depth (~$280k) — the honest "how deep is this register" figure. */
export function getGlwPriceSnapshot() {
  const reservesUsdg = 279851;
  const reservesGlw = 990429;
  return {
    usdPerGlw: 0.2825,
    poolAddress: GLOW_ADDRESSES.GLW_USDG_POOL,
    reservesUsdg,
    reservesGlw,
    liquidityUsd: Math.round(reservesUsdg), // one-sided USDG depth ≈ $280k
    method: "UniV2 reserves read",
    provenance: "SNAPSHOT",
    fetched_at: FETCHED_AT,
  };
}

/** The HONEST degenerate GCC oracle state. Both onchain registers are unusable today:
 *  the declining-price auction has drained to a 0 price, and the USDG/GCC pool holds only
 *  ~$222 of dust liquidity. We report the verdict rather than fabricate a price. */
export function getGccOracleState() {
  return {
    auction: {
      address: GLOW_ADDRESSES.CARBON_CREDIT_AUCTION,
      pricePerUnit: 0,
      note: "drained — ~0.0034 GCC unsold of 3.39B units; getPricePerUnit() reads 0",
    },
    pool: {
      address: GLOW_ADDRESSES.USDG_GCC_POOL,
      liquidityUsd: 222,
      impliedUsdPerGcc: 0.0417,
      note: "dust liquidity — not a usable register; the implied price is meaningless at this depth",
    },
    verdict: "no usable GCC price register today",
    provenance: "SNAPSHOT",
    fetched_at: FETCHED_AT,
  };
}

/** The real quoted Miner terms — a fractional claim on a farm's GLW reward stream.
 *  REPORTED grade: the app.glow.org listing is auth-gated and was not independently
 *  fetchable, but the OFFCHAIN_FRACTIONS contract that represents Miner positions is live on
 *  mainnet. Never tag this "confirmed". */
export function getMinerTerms() {
  return {
    principalUsd: 399,
    glwPerWeek: 43.6,
    termWeeks: 89,
    confidence: "reported",
    observedAt: "2026-07",
    source: "app.glow.org listing (auth-gated)",
    corroboration: `OFFCHAIN_FRACTIONS ${GLOW_ADDRESSES.OFFCHAIN_FRACTIONS} live onchain`,
    provenance: "SNAPSHOT",
    fetched_at: FETCHED_AT,
  };
}
