import { SolarPanel } from "@phosphor-icons/react";
import type React from "react";
import { useMemo } from "react";
import { Marker } from "react-map-gl";
import { listGlowFarms } from "../connectors/glow.mjs";
import { matchesLot, useAqueductFilters } from "../state/aqueductFiltersStore";
import { AQUEDUCT_SECTION_COLORS } from "./AqueductExploreCards";
import { AqueductNodeGlyph } from "./AqueductNodeGlyph";
import { ProvenanceChip } from "./Chips";

/**
 * Glow solar farms as the map's SECOND commodity vertical — the strongest
 * "generalized layer" demonstration: the same aggregate → verify → price →
 * publish loop coffee runs, applied to solar (farm = lot, GCA audit = certifier,
 * GLW/GCC = oracle registers). Only 10 curated real farms, so these are DOM
 * `<Marker>`s (no clustering — the SIM coffee economy needs GL circles for its
 * ~1.2k lots; 10 farms do not).
 *
 * PRIVACY NOTE (docs/research/13-privacy-and-swarm-coordination.md §4): rendering
 * farm-level COORDINATES on a public map is normally a self-inflicted exposure
 * AqueductX declines (the map shows EUDR *status*, never plot geometry). Glow
 * farms are different IN KIND — Glow itself publishes these coordinates via its
 * public audits API as protocol design (glow.org/api/audits). We render them
 * only because the source already made them public; every farm carries the
 * SNAPSHOT provenance chip that names that fact.
 *
 * Gated with the SAME discipline as AqueductLotsLayer: `activeCategories.has("lots")`
 * + `matchesLot(farmAsLot, filters)`. So toggling the Lots category off, or the
 * commodity filter to coffee-only, removes the farms in the same click as the
 * coffee lots — rail and map always agree because both read `buildGlowFarmLots()`.
 */

const LOT_COLOR = AQUEDUCT_SECTION_COLORS.lot; // sienna — solar rides the Lots family (see AqueductNodeGlyph)

/** A tiny deterministic east-shift applied to farms that share the EXACT same
 *  published coordinate, so co-located markers stay individually hoverable/clickable.
 *  ~0.09° ≈ 9 km at this latitude — enough to separate the two overlapping glyphs
 *  without meaningfully misplacing either. Index-based, never random. */
const OVERLAP_OFFSET_DEG = 0.09;

/** The farm-as-lot shape both the map (this file) and the rail (Explore.tsx) filter
 *  and render. `commodity:"solar"` + no `eudr` object is what makes `matchesLot`
 *  treat a farm as solar and derive its EUDR bucket as "gap". */
export interface GlowFarmLot {
  aqueduct_id: string;
  commodity: "solar";
  provenance: "SNAPSHOT";
  title_redacted: string;
  source: { platform: string; platform_lot_id: string; url: string; fetched_at: string };
  map_marker: { longitude: number; latitude: number; precision: string };
  origin: { region: string; country: string };
  quality: { sca_score: null; grade_basis: string };
  /** The raw connector record, kept for the rail metric line + the marker title. */
  farm: ReturnType<typeof listGlowFarms>[number];
}

/** Human-friendly capacity label: kW below 1 MW, MW above (the connector normalizes
 *  everything to kW, so a 16 MW-DC array is `systemWattageKw: 16000`). */
export function farmWattageLabel(farm: GlowFarmLot["farm"]): string {
  const kw = farm.systemWattageKw;
  if (kw >= 1000) {
    const mw = kw / 1000;
    return `${Number.isInteger(mw) ? mw : mw.toFixed(1)} MW`;
  }
  return `${kw} kW`;
}

/**
 * Map the 10 curated Glow farms to lot-shaped rows, applying the deterministic
 * overlap offset. SINGLE SOURCE OF TRUTH for both the map layer and the rail —
 * calling it in two places with the same (deterministic) connector snapshot
 * yields byte-identical placement, so the map marker count and the rail Lots
 * count can never diverge.
 */
export function buildGlowFarmLots(): GlowFarmLot[] {
  const stackAtCoord = new Map<string, number>();
  return listGlowFarms().map((farm) => {
    const key = `${farm.lng},${farm.lat}`;
    const stackIndex = stackAtCoord.get(key) ?? 0;
    stackAtCoord.set(key, stackIndex + 1);
    // First farm at a coordinate stays put; each additional farm sharing that
    // exact coordinate (the two Rajasthan farms — Ivy Sanctuary + Berry Flats,
    // both at 73.07398,28.0193) shifts a fixed step east. Deterministic.
    const longitude = farm.lng + stackIndex * OVERLAP_OFFSET_DEG;
    return {
      aqueduct_id: `glow:${farm.id}`,
      commodity: "solar" as const,
      provenance: "SNAPSHOT" as const,
      title_redacted: farm.name,
      source: {
        platform: "glow",
        platform_lot_id: String(farm.shortId),
        url: farm.source,
        fetched_at: farm.fetched_at,
      },
      map_marker: { longitude, latitude: farm.lat, precision: "farm" },
      origin: { region: farm.location, country: "" },
      quality: { sca_score: null, grade_basis: "" },
      farm,
    };
  });
}

export function GlowFarmsLayer(): React.ReactElement | null {
  const filters = useAqueductFilters();
  const lotsActive = filters.activeCategories.has("lots");
  const farmLots = useMemo(() => buildGlowFarmLots(), []);

  const visible = lotsActive ? farmLots.filter((l) => matchesLot(l, filters)) : [];

  return (
    <>
      {visible.map((l) => (
        <Marker key={l.aqueduct_id} longitude={l.map_marker.longitude} latitude={l.map_marker.latitude} anchor="center">
          {/* Quiet, title-only (no detail page — Glow farms are a live-read vertical,
              not a walkable lot). The title carries name + capacity + provenance,
              matching the map's existing hover-to-read behavior. */}
          <AqueductNodeGlyph
            kind="solar"
            size={18}
            title={`${l.farm.name} — ${farmWattageLabel(l.farm)} · ${l.farm.panelCount.toLocaleString()} panels (Glow, SNAPSHOT ${l.farm.fetched_at})`}
          />
        </Marker>
      ))}
    </>
  );
}

/**
 * Rail row for a Glow farm — a minimal sibling of `LotExploreCard` (which is
 * coffee-specific: SCA score, EUR/kg price, COMMODITY_ICONS have no solar entry).
 * Same visual idiom (color spine + avatar chip + provenance/metric header + title +
 * location), with capacity/panels as the metric line where coffee shows EUR/kg + SCA.
 */
export function SolarFarmRow({
  farmLot,
  onLocate,
}: {
  farmLot: GlowFarmLot;
  onLocate: () => void;
}): React.ReactElement {
  const farm = farmLot.farm;
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: mirrors the sibling LotExploreCard click-to-locate card idiom (a locate affordance, not a primary control).
    <div
      className="group bg-cardBackground border border-gray-100 hover:border-gray-300 transition-all cursor-pointer overflow-hidden"
      onClick={onLocate}
    >
      <div className="flex">
        <div className="w-1 flex-shrink-0" style={{ backgroundColor: LOT_COLOR }} />
        <div className="flex items-center pl-2.5 py-2.5">
          <div
            className="w-10 h-10 flex-shrink-0 flex items-center justify-center"
            style={{ backgroundColor: `${LOT_COLOR}18` }}
          >
            <SolarPanel size={16} style={{ color: LOT_COLOR }} />
          </div>
        </div>
        <div className="flex-1 min-w-0 px-2.5 py-2.5">
          <div className="flex items-center justify-between gap-1.5 mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <ProvenanceChip provenance="SNAPSHOT" dated={farm.fetched_at} />
              <span className="text-[11px] text-gray-500 whitespace-nowrap">
                {farm.panelCount.toLocaleString()} panels
              </span>
            </div>
            <span className="text-[11px] font-semibold text-gray-700 aq-mono whitespace-nowrap">
              {farmWattageLabel(farm)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-gray-900 truncate">{farm.name}</h4>
          </div>
          <p className="text-[11px] text-gray-500 truncate">{farm.location || "—"}</p>
        </div>
      </div>
    </div>
  );
}
