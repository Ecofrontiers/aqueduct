// Aqueduct — orchestrates the EthicHub connector into canonical lots +
// a real-vs-sim ledger, per DEMO-SPEC.md §4 (connector recipe) and §5
// (canonical lot schema). Produces the anchor lot (shop id 79) plus 2
// designated fallback Chiapas lots (spec §4 pre-mortem hardening: "designate
// 2 fallback Chiapas lots from the same shop at build time").
//
// Run via `node scripts/scout-ethichub.mjs` (Node CLI) — writes
// public/data/aqueduct/lots.json + ledger.json. Isomorphic module; a
// browser build could re-run this against a dev-proxy for a true on-load
// live re-fetch (Gate 2 concern — see atlas/vite.config.ts proxy).

import {
  fetchShopIndex,
  fetchLotDetail,
  fetchLendingProjects,
  matchCommunityProjects,
  fetchCeloCreditLineSupply,
} from "./ethichub.mjs";
import { computeLotId, JOIN_CONFIDENCE } from "../schema/canonicalLot.mjs";

// Anchor + 2 fallbacks, all Chiapas, all confirmed live on the shop index
// (research/03 + this session's own read). Locked at build time per spec.
export const ANCHOR_PATH = "/en/shop/neri-ortiz-perez-chiapas-mexico-bourbon-honey-86-sca-79";
export const FALLBACK_PATHS = [
  "/en/shop/lazaro-morales-apolonia-perez-chiapas-mexico-bourbon-washed-86-sca-16",
  "/en/shop/juventino-matias-ortiz-chiapas-mexico-bourbon-washed-85-5-sca-18",
];

// Community-level approximate placements for the map marker ONLY.
// These are NOT scraped/geocoded plot coordinates — EthicHub publishes no
// plot geolocation (the honest EUDR gap, rendered PARTIAL). They are public,
// well-known regional coordinates for villages in the Sierra Madre de
// Chiapas / Soconusco coffee zone near the Guatemala border, used solely to
// place a community-level pin. `map_marker_precision` says so explicitly so
// the UI never overclaims precision it doesn't have.
const COMMUNITY_COORDS = {
  "san josé ixtepec": { latitude: 15.22, longitude: -92.18 },
  "san jose ixtepec": { latitude: 15.22, longitude: -92.18 },
  "agua caliente": { latitude: 15.27, longitude: -92.33 },
  salchiji: { latitude: 15.31, longitude: -92.41 },
  salchijí: { latitude: 15.31, longitude: -92.41 },
};
const SOCONUSCO_FALLBACK_COORD = { latitude: 15.15, longitude: -92.3 }; // Sierra Madre de Chiapas / Soconusco region centroid

function normKey(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function communityCoords(community) {
  const key = normKey(community);
  return COMMUNITY_COORDS[key] || SOCONUSCO_FALLBACK_COORD;
}

/**
 * Build one canonical lot from a shop path, joined against already-fetched
 * lending projects + onchain read. Returns { lot, ledgerEntries }.
 */
async function buildLot(path, { lendingProjects, celoRead }, ledger) {
  const { data: detail, ledgerEntry: detailEntry } = await fetchLotDetail(path);
  ledger.push(detailEntry);
  if (!detail) return null;

  let community = detail.origin.community;
  let matches = matchCommunityProjects(community, lendingProjects);

  // Fallback: the "Origin:" line is sometimes a broader micro-region
  // ("Soconusco") while the producer-story prose names the actual village
  // that the lending API's communityName field uses (research/03's own join
  // case: lot 79 <-> "San José Ixtepec"). Scan the full description text for
  // any fetched lending community name before giving up.
  if (matches.length === 0 && detail.description_text_raw) {
    const text = detail.description_text_raw.toLowerCase();
    const found = lendingProjects.find((p) => {
      const name = (p.communityName || "").replace(/\(m[eé]xico\)/i, "").trim();
      return name.length > 3 && text.includes(name.toLowerCase());
    });
    if (found) {
      community = found.communityName.replace(/\(m[eé]xico\)/i, "").trim();
      matches = matchCommunityProjects(community, lendingProjects);
    }
  }

  const joinConfidence = matches.length > 0 ? JOIN_CONFIDENCE.NAME_PLACE_MATCH : JOIN_CONFIDENCE.UNMATCHED;

  if (matches.length > 0) {
    ledger.push({
      ts: new Date().toISOString(),
      provenance: "LIVE",
      agent: "@diligence-identity",
      platform: "ethichub-cross-surface",
      url: `${"https://app.ethichub.com/api/v1/projects"}`,
      verb: "matched",
      detail: `joined shop lot ${detail.source.platform_lot_id} ↔ lending project(s) ${matches
        .map((m) => m.id)
        .join(", ")} by producer/community name "${community}" — join_confidence: ${joinConfidence} (cross-surface, both EthicHub)`,
      status: "PARTIAL",
    });
  }

  const coords = communityCoords(community);
  const fullName = detail._fullProducerNameTransient;

  const lotCore = {
    source: detail.source,
    identity_stage: "green",
    ico_mark: null,
    producer: detail.producer,
    origin: {
      country: detail.origin.country,
      region: detail.origin.region,
      community,
      locality_raw: detail.origin.locality_raw,
      plot_geo: null,
    },
    map_marker: { ...coords, precision: "community-approximate — not a scraped plot coordinate" },
    altitude_masl: detail.altitude_masl,
    harvest_window: detail.harvest_window,
    process: detail.process,
    variety: detail.variety,
    drying: detail.drying,
    sensory: detail.sensory,
    quality: detail.quality,
    lot_type: detail.lot_type,
    coffee_type: detail.coffee_type,
    weight_state: detail.weight_state,
    format: detail.format,
    composition: "single",
    custody_model: "identity_preserved",
    certs: [],
    eudr: {
      plot_geo_present: false,
      harvest_window_present: Boolean(detail.harvest_window?.season),
      legality_evidence: false,
      dds_ref: null,
    },
    price: detail.price,
    image: detail.image,
    producer_story: detail.producer_story,
    title_redacted: detail.title_redacted,
    lending: {
      matched: matches.length > 0,
      join_confidence: joinConfidence,
      community_searched: community,
      projects: matches.map((m) => ({ id: m.id, community_name: m.communityName, status: m.status, objective: m.objective })),
    },
    onchain: celoRead
      ? { chain: "celo", contract: celoRead.contract, total_credit_lines: celoRead.totalSupply, note: "platform-level aggregate, not per-lot financing (research/03 caveat)" }
      : null,
    join_keys: {
      deterministic: [],
      fuzzy: `producer_initials:${detail.producer.initials}|community:${community}|region:${detail.origin.region}|country:${detail.origin.country}`,
    },
    join_confidence: joinConfidence,
  };

  const { id, full } = await computeLotId(lotCore);
  const lot = { aqueduct_id: id, aqueduct_id_full: full, ...lotCore };
  return lot;
}

export async function buildAnchorAndFallbacks() {
  const ledger = [];

  const { data: shopIndex, ledgerEntry: shopEntry } = await fetchShopIndex();
  ledger.push(shopEntry);

  const { data: lendingPage0, ledgerEntry: lendingEntry } = await fetchLendingProjects(0);
  ledger.push(lendingEntry);
  const lendingProjects = lendingPage0?.projects ?? [];

  const { data: celoRead, ledgerEntry: celoEntry } = await fetchCeloCreditLineSupply();
  ledger.push(celoEntry);

  const shared = { lendingProjects, celoRead };

  const anchor = await buildLot(ANCHOR_PATH, shared, ledger);
  const fallbacks = [];
  for (const path of FALLBACK_PATHS) {
    const lot = await buildLot(path, shared, ledger);
    if (lot) fallbacks.push(lot);
  }

  // Verify the anchor was actually reachable on the live shop index this
  // session (spec §4 pre-mortem: "designate 2 fallback lots... if the
  // anchor is sold/changed, a backup renders as the anchor").
  const anchorOnIndex = shopIndex?.chiapasLots?.some((l) => ANCHOR_PATH.includes(`-${l.id}`));
  let activeAnchor = anchor;
  let anchorFallbackSwitch = null;
  if (!anchorOnIndex && fallbacks.length > 0) {
    anchorFallbackSwitch = {
      ts: new Date().toISOString(),
      note: `anchor fallback: lot ${anchor?.source?.platform_lot_id ?? "79"} unavailable on live shop index → lot ${fallbacks[0].source.platform_lot_id}`,
    };
    activeAnchor = fallbacks.shift();
    fallbacks.push(anchor);
  }

  return {
    anchor: activeAnchor,
    fallbacks,
    ledger,
    anchorFallbackSwitch,
    meta: {
      generated_at: new Date().toISOString(),
      shop_lots_total: shopIndex?.allCount ?? null,
      shop_chiapas_total: shopIndex?.chiapasLots?.length ?? null,
      lending_projects_total: lendingPage0?.totalProjects ?? null,
    },
  };
}
