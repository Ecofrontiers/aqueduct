// Aqueduct — the seeded synthetic economy (FABLE-KICKOFF.md supersession §3:
// "multi-commodity synthetic economy at scale... Real EthicHub coffee lots
// remain the LIVE anchors. Every synthetic entity carries a SIM chip").
//
// Everything here is DETERMINISTIC: one seed, no Date.now, no Math.random —
// the demo replays identically on every load. Calibration is cited inline;
// where calibration is coarse (cacao, honey) the meta says so. House rules:
// producers initialed; coops/venues carry generic descriptors, never
// fictional real-sounding platform names; nothing renders as live that isn't.
//
// Solver-market shape calibrated to docs/research/04-solver-intent-economics.md:
// 28 active solvers, only 12 handling meaningful volume; top solver wins
// ~40-50% of intents, top 2-3 ~75%; >=1 noisy solver that bids but never
// wins; archetypes: top / optimizer / multi-strategy / noisy / conservative.

export const ECONOMY_SEED = 20260702;
const BASE_TS = Date.parse("2026-07-02T12:00:00Z");

// ── Seeded PRNG (mulberry32) + helpers ─────────────────────────────────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a 32-bit ×2 → 16-hex deterministic content id for SIM lots. */
function contentHash(str) {
  let h1 = 0x811c9dc5;
  let h2 = 0xcbf29ce4;
  for (let i = 0; i < str.length; i++) {
    h1 = Math.imul(h1 ^ str.charCodeAt(i), 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ str.charCodeAt(str.length - 1 - i), 0x01000193) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];
const range = (rnd, min, max) => min + rnd() * (max - min);
const round2 = (n) => Math.round(n * 100) / 100;

const LETTERS = "ABCDEFGHIJLMNOPRSTVY";
function initials(rnd) {
  const n = rnd() < 0.3 ? 3 : 2;
  let out = [];
  for (let i = 0; i < n; i++) out.push(LETTERS[Math.floor(rnd() * LETTERS.length)]);
  return out.join(".") + ".";
}

// ── Geography: real smallholder origin regions (centroids approximate) ─────
// Price bands are FOB-origin EUR/kg for the lot's typical format. Coffee
// bands anchored by the real EthicHub bricks (€16.5-18.7/kg retail-format
// top end) and green-coffee FOB reality at the low end; cacao/honey bands
// are labeled coarse calibration in meta.
export const ORIGIN_REGIONS = [
  // coffee — deep (research-calibrated)
  { key: "chiapas", name: "Chiapas (Soconusco)", country: "México", commodity: "coffee", centroid: [-92.4, 15.4], lots: 90, band: [3.2, 9.5], premiumBand: [12, 19] },
  { key: "oaxaca", name: "Oaxaca (Pluma)", country: "México", commodity: "coffee", centroid: [-96.5, 16.2], lots: 60, band: [3.0, 8.5], premiumBand: [11, 16] },
  { key: "huila", name: "Huila", country: "Colombia", commodity: "coffee", centroid: [-75.9, 2.5], lots: 110, band: [3.4, 10], premiumBand: [12, 18] },
  { key: "narino", name: "Nariño", country: "Colombia", commodity: "coffee", centroid: [-77.3, 1.2], lots: 70, band: [3.4, 9.5], premiumBand: [12, 17] },
  { key: "cajamarca", name: "Cajamarca", country: "Perú", commodity: "coffee", centroid: [-78.8, -6.2], lots: 75, band: [3.0, 8.5], premiumBand: [10, 15] },
  { key: "sidama", name: "Sidama", country: "Ethiopia", commodity: "coffee", centroid: [38.4, 6.7], lots: 95, band: [3.2, 9.0], premiumBand: [12, 18] },
  { key: "yirgacheffe", name: "Yirgacheffe", country: "Ethiopia", commodity: "coffee", centroid: [38.2, 6.16], lots: 65, band: [3.6, 10.5], premiumBand: [13, 19] },
  { key: "elgon", name: "Mount Elgon", country: "Uganda", commodity: "coffee", centroid: [34.5, 1.1], lots: 55, band: [2.8, 7.0], premiumBand: [9, 13] },
  { key: "nyeri", name: "Nyeri", country: "Kenya", commodity: "coffee", centroid: [36.95, -0.42], lots: 50, band: [3.8, 11], premiumBand: [13, 19] },
  { key: "daklak", name: "Đắk Lắk", country: "Việt Nam", commodity: "coffee", centroid: [108.2, 12.7], lots: 80, band: [2.4, 5.5], premiumBand: [7, 11] },
  { key: "jinotega", name: "Jinotega", country: "Nicaragua", commodity: "coffee", centroid: [-85.99, 13.09], lots: 55, band: [3.0, 8.0], premiumBand: [10, 15] },
  { key: "huehuetenango", name: "Huehuetenango", country: "Guatemala", commodity: "coffee", centroid: [-91.6, 15.5], lots: 65, band: [3.2, 9.5], premiumBand: [12, 17] },
  // cacao — coarse calibration
  { key: "esmeraldas", name: "Esmeraldas", country: "Ecuador", commodity: "cacao", centroid: [-79.2, 0.6], lots: 55, band: [2.6, 7.5], premiumBand: [8, 12] },
  { key: "sanmartin", name: "San Martín", country: "Perú", commodity: "cacao", centroid: [-76.6, -6.6], lots: 50, band: [2.4, 6.5], premiumBand: [7, 11] },
  { key: "bahia", name: "Bahia", country: "Brasil", commodity: "cacao", centroid: [-39.3, -14.8], lots: 45, band: [2.2, 6.0], premiumBand: [7, 10] },
  { key: "ashanti", name: "Ashanti", country: "Ghana", commodity: "cacao", centroid: [-1.5, 6.7], lots: 60, band: [2.0, 4.5], premiumBand: [5, 8] },
  { key: "sambirano", name: "Sambirano", country: "Madagascar", commodity: "cacao", centroid: [48.45, -13.7], lots: 35, band: [3.0, 8.0], premiumBand: [9, 13] },
  // honey — coarse calibration
  { key: "yucatan", name: "Yucatán", country: "México", commodity: "honey", centroid: [-89.0, 20.5], lots: 40, band: [2.4, 5.5], premiumBand: [6, 9] },
  { key: "chiapas-honey", name: "Chiapas (highlands)", country: "México", commodity: "honey", centroid: [-92.7, 16.4], lots: 30, band: [2.4, 5.5], premiumBand: [6, 9] },
  { key: "tigray", name: "Tigray", country: "Ethiopia", commodity: "honey", centroid: [39.5, 13.9], lots: 35, band: [2.2, 5.0], premiumBand: [5.5, 8] },
  { key: "zambezia", name: "Zambézia", country: "Moçambique", commodity: "honey", centroid: [36.8, -16.8], lots: 30, band: [2.0, 4.5], premiumBand: [5, 7.5] },
];

/** Import demand hubs (real port/market cities, positions approximate). */
export const DEMAND_HUBS = [
  { id: "hub-hamburg", name: "Hamburg", coords: [9.99, 53.55], weight: { latam: 3, africa: 4, asia: 2 } },
  { id: "hub-rotterdam", name: "Rotterdam", coords: [4.48, 51.92], weight: { latam: 3, africa: 3, asia: 2 } },
  { id: "hub-antwerp", name: "Antwerp", coords: [4.4, 51.22], weight: { latam: 2, africa: 3, asia: 1 } },
  { id: "hub-trieste", name: "Trieste", coords: [13.77, 45.65], weight: { latam: 1, africa: 2, asia: 1 } },
  { id: "hub-oakland", name: "Oakland", coords: [-122.27, 37.8], weight: { latam: 3, africa: 1, asia: 2 } },
  { id: "hub-newyork", name: "New York", coords: [-74.01, 40.71], weight: { latam: 3, africa: 1, asia: 1 } },
  { id: "hub-yokohama", name: "Yokohama", coords: [139.64, 35.44], weight: { latam: 1, africa: 1, asia: 3 } },
];

function hubRegionClass(origin) {
  if (["daklak"].includes(origin.key)) return "asia";
  if (origin.centroid[0] > 20) return "africa"; // east africa / madagascar
  if (["ashanti"].includes(origin.key)) return "africa";
  return "latam";
}

// ── Solver roster at market scale ──────────────────────────────────────────
// 28 "active" + fringe → 36 total (research/04: 28 active, 12 with volume).
// The first five handles + profiles match sim/solverRoster.mjs so the tour's
// race and the market roster tell one story. Win shares concentrate: top
// ~45%, top-3 ~75% (research/04 §Sim-economy parameters).
const ARCHETYPES = [
  { kind: "top", count: 1, winShare: 45, margin: [200, 240], note: "network-wide top solver — CoW/Across concentration analog" },
  { kind: "optimizer", count: 2, winShare: 15, margin: [150, 210], note: "route optimizer, wins on tight lanes" },
  { kind: "multi-strategy", count: 9, winShare: 2.2, margin: [60, 160], note: "near-break-even multi-strategy book" },
  { kind: "noisy", count: 14, winShare: 0, margin: [280, 380], note: "sporadic bidder, thin capital — bids, never wins" },
  { kind: "conservative", count: 10, winShare: 0.5, margin: [140, 180], note: "risk desk — declines partial-EUDR / thin routes" },
];

function buildSolvers(rnd) {
  const solvers = [];
  let n = 1;
  for (const a of ARCHETYPES) {
    for (let i = 0; i < a.count; i++) {
      solvers.push({
        id: `@sim-solver-${n}`,
        kind: "solver",
        archetype: a.kind,
        winSharePct: a.kind === "top" ? 45 : a.kind === "optimizer" ? 15 : round2(a.winShare * range(rnd, 0.6, 1.4)),
        marginBps: Math.round(range(rnd, a.margin[0], a.margin[1])),
        freightPct: round2(range(rnd, 0.055, 0.095) * 100) / 100,
        financingAprPct: round2(range(rnd, 0.11, 0.2) * 100) / 100,
        tenorDays: Math.round(range(rnd, 32, 55)),
        provenance: "SIM",
        note: a.note,
      });
      n++;
    }
  }
  return solvers;
}

// ── The generator ──────────────────────────────────────────────────────────
export function generateEconomy(seed = ECONOMY_SEED) {
  const rnd = mulberry32(seed);
  const lots = [];
  const coops = [];
  const intents = [];
  const routes = [];
  const events = [];

  const solvers = buildSolvers(rnd);
  // Winner pool: weighted by win share (top solver dominates; noisy never wins).
  const winnerPool = [];
  for (const s of solvers) {
    const tickets = Math.round(s.winSharePct * 10);
    for (let i = 0; i < tickets; i++) winnerPool.push(s.id);
  }

  const flowMap = new Map(); // `${coopId}->${hubId}` -> aggregated flow

  for (const origin of ORIGIN_REGIONS) {
    // 1-3 coop/exporter nodes per origin, generic descriptors only.
    const coopCount = origin.lots > 70 ? 3 : origin.lots > 45 ? 2 : 1;
    const originCoops = [];
    for (let c = 0; c < coopCount; c++) {
      const coop = {
        id: `coop-${origin.key}-${c + 1}`,
        kind: "coop",
        name: `Cooperative node — ${origin.name}${coopCount > 1 ? ` ${c + 1}` : ""}`,
        commodity: origin.commodity,
        coords: [
          origin.centroid[0] + range(rnd, -0.5, 0.5),
          origin.centroid[1] + range(rnd, -0.35, 0.35),
        ],
        provenance: "SIM",
      };
      originCoops.push(coop);
      coops.push(coop);
    }

    const regionClass = hubRegionClass(origin);

    for (let i = 0; i < origin.lots; i++) {
      const isPremium = rnd() < 0.12;
      const band = isPremium ? origin.premiumBand : origin.band;
      const fob = round2(range(rnd, band[0], band[1]));
      const weightKg = Math.round(range(rnd, 300, 2400) / 30) * 30; // ~5-40 bags
      const coop = pick(rnd, originCoops);
      const prod = initials(rnd);
      const idStr = `${origin.key}|${i}|${prod}|${fob}|${weightKg}`;
      const hash = contentHash(idStr) + contentHash(idStr + "x");
      const sca = origin.commodity === "coffee" ? round2(range(rnd, 80, isPremium ? 89.5 : 86)) : null;
      const eudrReady = rnd() < 0.3;

      const lot = {
        aqueduct_id: `aq:sim-${hash.slice(0, 12)}`,
        aqueduct_id_full: hash,
        sim: true,
        commodity: origin.commodity,
        title_redacted: `${prod} / ${origin.name} (${origin.country}) — ${origin.commodity === "coffee" ? `${sca} SCA` : origin.commodity}`,
        producer: { initials: prod, entity_type: rnd() < 0.35 ? "group" : "person" },
        origin: { country: origin.country, region: origin.name, community: null, locality_raw: origin.name, plot_geo: null },
        map_marker: {
          longitude: origin.centroid[0] + range(rnd, -0.8, 0.8),
          latitude: origin.centroid[1] + range(rnd, -0.55, 0.55),
          precision: "region-approximate (SIM)",
        },
        quality: { sca_score: sca, grade_basis: origin.commodity === "coffee" ? "SCA (SIM)" : "grade (SIM, coarse)" },
        weight_kg: weightKg,
        weight_state: origin.commodity === "coffee" ? "green" : "raw",
        format: null,
        price: { amount: fob, currency: "EUR", unit: "kg", incoterm: "FOB (origin, SIM)" },
        // dds_ref tied to eudrReady, not independently random: a Due Diligence Statement
        // reference is only issued once the legality-evidence chain it documents exists —
        // it was hardcoded null before (docs/research/09 Phase 4 stress-test finding),
        // which made full EUDR confirmation structurally unreachable for every SIM lot.
        eudr: { plot_geo_present: eudrReady, harvest_window_present: rnd() < 0.7, legality_evidence: eudrReady, dds_ref: eudrReady ? `DDS-${hash.slice(0, 8)}` : null },
        harvest_window: { season: pick(rnd, ["2025", "2025/26", "2026"]), note: "SIM" },
        coop_id: coop.id,
        image: null,
        provenance: "SIM",
      };
      lots.push(lot);

      // Sell intent for every lot.
      const roll = rnd();
      const status = roll < 0.15 ? "settled" : roll < 0.6 ? "filled" : "open";
      const intent = {
        id: `aq:i-sim-${hash.slice(0, 10)}`,
        intentType: "sell-this-lot",
        status,
        lotId: lot.aqueduct_id,
        title: `Sell — ${lot.title_redacted}`,
        detail: `${fob} EUR/kg FOB · ${weightKg} kg`,
        provenance: "SIM",
        coordinates: { longitude: lot.map_marker.longitude, latitude: lot.map_marker.latitude },
      };
      intents.push(intent);

      // Filled/settled intents produce a route through a demand hub.
      if (status !== "open") {
        const hub = weightedHub(rnd, regionClass);
        const solverId = pick(rnd, winnerPool);
        const solver = solvers.find((s) => s.id === solverId);
        const landed = round2(
          fob * (1 + solver.freightPct + 0.025 + 0.009 + (solver.financingAprPct * solver.tenorDays) / 365) +
            (fob * solver.marginBps) / 10000
        );
        routes.push({
          id: `route-${hash.slice(0, 10)}`,
          lotId: lot.aqueduct_id,
          coopId: coop.id,
          hubId: hub.id,
          solverId,
          status,
          fobEurPerKg: fob,
          landedEurPerKg: landed,
          weightKg,
          provenance: "SIM",
        });
        const key = `${coop.id}->${hub.id}`;
        const flow = flowMap.get(key) ?? { coopId: coop.id, hubId: hub.id, from: coop.coords, to: hub.coords, totalKg: 0, totalEur: 0, laneCount: 0, commodity: origin.commodity };
        flow.totalKg += weightKg;
        flow.totalEur += Math.round(weightKg * landed);
        flow.laneCount += 1;
        flowMap.set(key, flow);
      }
    }

    // Finance intents: ~2 per coop, routed at the origin community.
    for (const coop of originCoops) {
      const financeCount = 1 + (rnd() < 0.5 ? 1 : 0);
      for (let f = 0; f < financeCount; f++) {
        const seedlings = Math.round(range(rnd, 600, 4000) / 100) * 100;
        intents.push({
          id: `aq:i-fin-${contentHash(coop.id + f).slice(0, 10)}`,
          intentType: "finance-this-planting",
          status: rnd() < 0.4 ? "filled" : "open",
          title: `Finance — ${seedlings.toLocaleString()} seedlings, ${origin.name}`,
          detail: `€${Math.round(seedlings * 0.93).toLocaleString()} agroforestry renovation`,
          provenance: "SIM",
          coordinates: { longitude: coop.coords[0], latitude: coop.coords[1] },
        });
      }
    }
  }

  // ── Events (the feed): newest first, deterministic timestamps ──
  const verbs = [
    (l) => [`@scout-${l.sim ? "sim" : "ethichub"}`, "pinned", `pinned ${l.title_redacted} · ${l.price.amount} EUR/kg`],
    (l) => ["@diligence-identity", "checked", `EUDR check on ${l.title_redacted} — ${l.eudr.plot_geo_present ? "OK" : "PARTIAL"}`],
    (l) => ["@oracle-floor", "priced", `floor ref for ${l.origin.region} — ICE C + differential`],
  ];
  const eventLots = [...lots].filter((_, i) => i % 7 === 0).slice(0, 60);
  let ts = BASE_TS;
  for (const l of eventLots) {
    const v = verbs[Math.floor(rnd() * verbs.length)](l);
    ts -= Math.round(range(rnd, 2, 14)) * 60 * 1000;
    events.push({ ts, actor: v[0], verb: v[1], summary: v[2], provenance: "SIM", lotId: l.aqueduct_id });
  }
  for (const r of routes.slice(0, 40)) {
    ts -= Math.round(range(rnd, 2, 10)) * 60 * 1000;
    events.push({
      ts,
      actor: r.solverId,
      verb: r.status === "settled" ? "settled" : "filled",
      summary: `${r.status === "settled" ? "settled" : "filled"} route → ${DEMAND_HUBS.find((h) => h.id === r.hubId)?.name} · landed ${r.landedEurPerKg} EUR/kg`,
      provenance: "SIM",
      lotId: r.lotId,
    });
  }
  events.sort((a, b) => b.ts - a.ts);

  const flows = [...flowMap.values()].sort((a, b) => b.totalKg - a.totalKg);

  return {
    lots,
    coops,
    hubs: DEMAND_HUBS,
    solvers,
    intents,
    routes,
    flows,
    events: events.slice(0, 120),
    meta: {
      seed,
      generated_basis: "deterministic seeded generator — replays identically",
      calibration: {
        coffee: "bands anchored by real EthicHub lots + research/04 sim-economy parameters",
        cacao: "coarse calibration (labeled)",
        honey: "coarse calibration (labeled)",
        solvers: "28-active/12-with-volume concentration shape per research/04",
      },
      counts: {
        lots: lots.length,
        coops: coops.length,
        intents: intents.length,
        routes: routes.length,
        flows: flows.length,
        solvers: solvers.length,
      },
    },
  };
}

function weightedHub(rnd, regionClass) {
  const pool = [];
  for (const hub of DEMAND_HUBS) {
    const w = hub.weight[regionClass] ?? 1;
    for (let i = 0; i < w; i++) pool.push(hub);
  }
  return pick(rnd, pool);
}

// Singleton — generated once per session, deterministic.
let _economy = null;
export function getEconomy() {
  if (!_economy) _economy = generateEconomy(ECONOMY_SEED);
  return _economy;
}
