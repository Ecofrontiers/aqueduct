import type { Org } from "../../shared/types";
import { COUNTRY_CENTROIDS } from "../../shared/countryCentroids";
import { findBioregionForPoint } from "./bioregionIntelligence";

// --- Types ---

export interface OrgMapPosition {
  orgId: number;
  longitude: number;
  latitude: number;
  source: "coordinates" | "country" | "bioregion";
  countryCode?: string;
  bioregionCode?: string;
}

export interface ResolvedOrgGeo {
  org: Org;
  positions: OrgMapPosition[];
  bioregionCodes: string[];
  primaryPosition: OrgMapPosition | null;
}

// --- Helpers ---

/** Returns true if two positions are within ~0.5° (≈55 km at equator) */
function positionsNear(a: OrgMapPosition, b: OrgMapPosition): boolean {
  const dlat = Math.abs(a.latitude - b.latitude);
  const dlng = Math.abs(a.longitude - b.longitude);
  return dlat < 0.5 && dlng < 0.5;
}

/** Deduplicate positions: if a new position is within ~0.5° of an existing one, skip it */
function deduplicatePositions(positions: OrgMapPosition[]): OrgMapPosition[] {
  const result: OrgMapPosition[] = [];
  for (const pos of positions) {
    if (!result.some((existing) => positionsNear(existing, pos))) {
      result.push(pos);
    }
  }
  return result;
}

function isValidCoordinate(lat: number, lng: number): boolean {
  return !(lat === 0 && lng === 0) && !isNaN(lat) && !isNaN(lng);
}

/** Get centroid of a bioregion feature from its properties */
function getBioregionCentroid(
  code: string,
  geojson: GeoJSON.FeatureCollection
): { latitude: number; longitude: number } | null {
  const feature = geojson.features.find((f) => f.properties?.code === code);
  if (!feature?.properties) return null;

  const centroid = feature.properties.centroid;
  if (Array.isArray(centroid) && centroid.length === 2) {
    return { latitude: centroid[1], longitude: centroid[0] };
  }
  // Try parsing stringified centroid
  if (typeof centroid === "string") {
    try {
      const parsed = JSON.parse(centroid);
      if (Array.isArray(parsed) && parsed.length === 2) {
        return { latitude: parsed[1], longitude: parsed[0] };
      }
    } catch {
      // ignore
    }
  }
  return null;
}

// --- Core Resolution ---

/**
 * Resolves all effective map positions and bioregion memberships for a single org.
 *
 * Sources (in priority order):
 * 1. coordinates (if valid, i.e. not 0,0 sentinel) → one position, bioregion inferred
 * 2. country_codes → one position per country centroid, bioregion inferred
 * 3. bioregion_codes → one position per bioregion centroid
 *
 * Deduplication: positions within ~0.5° are merged.
 */
export function resolveOrgGeoSync(
  org: Org,
  geojson: GeoJSON.FeatureCollection
): ResolvedOrgGeo {
  const rawPositions: OrgMapPosition[] = [];
  const bioregionSet = new Set<string>();

  // 1. Coordinates
  const lat = org.coordinates?.latitude;
  const lng = org.coordinates?.longitude;
  if (typeof lat === "number" && typeof lng === "number" && isValidCoordinate(lat, lng)) {
    const bioFeature = findBioregionForPoint(lng, lat, geojson);
    const bioCode = bioFeature?.properties?.code as string | undefined;
    if (bioCode) bioregionSet.add(bioCode);

    rawPositions.push({
      orgId: org.id,
      longitude: lng,
      latitude: lat,
      source: "coordinates",
      bioregionCode: bioCode,
    });
  }

  // 2. Country codes
  if (org.country_codes) {
    for (const cc of org.country_codes) {
      const centroid = COUNTRY_CENTROIDS[cc];
      if (!centroid) continue;

      const bioFeature = findBioregionForPoint(centroid.longitude, centroid.latitude, geojson);
      const bioCode = bioFeature?.properties?.code as string | undefined;
      if (bioCode) bioregionSet.add(bioCode);

      rawPositions.push({
        orgId: org.id,
        longitude: centroid.longitude,
        latitude: centroid.latitude,
        source: "country",
        countryCode: cc,
        bioregionCode: bioCode,
      });
    }
  }

  // 3. Bioregion codes
  if (org.bioregion_codes) {
    for (const bc of org.bioregion_codes) {
      bioregionSet.add(bc);

      const centroid = getBioregionCentroid(bc, geojson);
      if (!centroid) continue;

      rawPositions.push({
        orgId: org.id,
        longitude: centroid.longitude,
        latitude: centroid.latitude,
        source: "bioregion",
        bioregionCode: bc,
      });
    }
  }

  const positions = deduplicatePositions(rawPositions);

  // Primary position: prefer coordinates > country > bioregion
  const primaryPosition =
    positions.find((p) => p.source === "coordinates") ??
    positions.find((p) => p.source === "country") ??
    positions.find((p) => p.source === "bioregion") ??
    null;

  return {
    org,
    positions,
    bioregionCodes: Array.from(bioregionSet),
    primaryPosition,
  };
}

/**
 * Batch resolve all orgs. Returns a Map keyed by org.id.
 */
export function resolveAllOrgsGeo(
  orgs: Org[],
  geojson: GeoJSON.FeatureCollection
): Map<number, ResolvedOrgGeo> {
  const map = new Map<number, ResolvedOrgGeo>();
  for (const org of orgs) {
    map.set(org.id, resolveOrgGeoSync(org, geojson));
  }
  return map;
}
