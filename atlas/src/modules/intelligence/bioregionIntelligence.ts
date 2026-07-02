import type { Asset } from "../assets";
import type { Org, Action } from "../../shared/types";
import { COUNTRY_CENTROIDS } from "../../shared/countryCentroids";

export interface BioregionProperties {
  code: string;
  name: string;
  realm: string;
  realm_name: string;
  color: string;
  centroid: [number, number];
}

export interface BioregionStats {
  code: string;
  realm: string;
  realm_name: string;
  color: string;
  centroid: [number, number];
  assetCount: number;
  primaryAssetCount: number;
  secondOrderAssetCount: number;
  assets: Asset[];
  typeDistribution: Record<string, { count: number; name: string }>;
  issuers: { id: number; name: string; count: number }[];
  countries: { code: string; count: number }[];
}

// Ray-casting point-in-polygon for a single ring
function pointInRing(
  lng: number,
  lat: number,
  ring: number[][]
): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0],
      yi = ring[i][1];
    const xj = ring[j][0],
      yj = ring[j][1];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInPolygon(lng: number, lat: number, polygon: number[][][]): boolean {
  // First ring is exterior, rest are holes
  if (!pointInRing(lng, lat, polygon[0])) return false;
  for (let i = 1; i < polygon.length; i++) {
    if (pointInRing(lng, lat, polygon[i])) return false;
  }
  return true;
}

function pointInMultiPolygon(
  lng: number,
  lat: number,
  multiPolygon: number[][][][]
): boolean {
  for (const polygon of multiPolygon) {
    if (pointInPolygon(lng, lat, polygon)) return true;
  }
  return false;
}

function pointInGeometry(
  lng: number,
  lat: number,
  geometry: GeoJSON.Geometry
): boolean {
  if (geometry.type === "Polygon") {
    return pointInPolygon(lng, lat, geometry.coordinates as number[][][]);
  }
  if (geometry.type === "MultiPolygon") {
    return pointInMultiPolygon(lng, lat, geometry.coordinates as number[][][][]);
  }
  return false;
}

// Cache for the loaded GeoJSON
let bioregionGeoJSON: GeoJSON.FeatureCollection | null = null;

export async function loadBioregionGeoJSON(): Promise<GeoJSON.FeatureCollection> {
  if (bioregionGeoJSON) return bioregionGeoJSON;
  const res = await fetch("/geojson/bioregions.geojson");
  bioregionGeoJSON = await res.json();
  return bioregionGeoJSON!;
}

export function findBioregionForPoint(
  lng: number,
  lat: number,
  geojson: GeoJSON.FeatureCollection
): GeoJSON.Feature | null {
  for (const feature of geojson.features) {
    if (pointInGeometry(lng, lat, feature.geometry)) {
      return feature;
    }
  }
  return null;
}

export function mapAssetsToBioregions(
  assets: Asset[],
  geojson: GeoJSON.FeatureCollection
): Map<string, Asset[]> {
  const mapping = new Map<string, Asset[]>();

  for (const asset of assets) {
    const lng = asset.coordinates?.longitude;
    const lat = asset.coordinates?.latitude;
    if (typeof lng !== "number" || typeof lat !== "number") continue;

    const feature = findBioregionForPoint(lng, lat, geojson);
    if (feature) {
      const code = feature.properties?.code as string;
      if (!mapping.has(code)) mapping.set(code, []);
      mapping.get(code)!.push(asset);
    }
  }

  return mapping;
}

export function getBioregionStats(
  bioregionCode: string,
  assets: Asset[],
  geojson: GeoJSON.FeatureCollection
): BioregionStats | null {
  const feature = geojson.features.find(
    (f) => f.properties?.code === bioregionCode
  );
  if (!feature) return null;

  const props = feature.properties as Record<string, any>;
  const centroid = props.centroid ?? [0, 0];

  // Find assets in this bioregion
  const bioregionAssets = assets.filter((asset) => {
    const lng = asset.coordinates?.longitude;
    const lat = asset.coordinates?.latitude;
    if (typeof lng !== "number" || typeof lat !== "number") return false;
    return pointInGeometry(lng, lat, feature.geometry);
  });

  // Type distribution
  const typeDistribution: Record<string, { count: number; name: string }> = {};
  for (const asset of bioregionAssets) {
    for (const type of asset.asset_types ?? []) {
      const key = String(type.id);
      if (!typeDistribution[key]) {
        typeDistribution[key] = { count: 0, name: type.name };
      }
      typeDistribution[key].count++;
    }
  }

  // Issuers
  const issuerMap = new Map<number, { name: string; count: number }>();
  for (const asset of bioregionAssets) {
    if (asset.issuer) {
      const existing = issuerMap.get(asset.issuer.id);
      if (existing) {
        existing.count++;
      } else {
        issuerMap.set(asset.issuer.id, { name: asset.issuer.name, count: 1 });
      }
    }
  }
  const issuers = Array.from(issuerMap.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.count - a.count);

  // Countries
  const countryMap = new Map<string, number>();
  for (const asset of bioregionAssets) {
    if (asset.country_code) {
      countryMap.set(asset.country_code, (countryMap.get(asset.country_code) ?? 0) + 1);
    }
  }
  const countries = Array.from(countryMap.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);

  return {
    code: props.code,
    realm: props.realm,
    realm_name: props.realm_name,
    color: props.color,
    centroid,
    assetCount: bioregionAssets.length,
    primaryAssetCount: bioregionAssets.filter(a => !a.second_order).length,
    secondOrderAssetCount: bioregionAssets.filter(a => a.second_order).length,
    assets: bioregionAssets,
    typeDistribution,
    issuers,
    countries,
  };
}

export async function getBioregionForAsset(
  asset: Asset
): Promise<BioregionProperties | null> {
  const geojson = await loadBioregionGeoJSON();
  const feature = findBioregionForPoint(
    asset.coordinates.longitude,
    asset.coordinates.latitude,
    geojson
  );
  if (!feature?.properties) return null;
  const p = feature.properties as Record<string, any>;
  return {
    code: p.code,
    name: p.name ?? p.code,
    realm: p.realm,
    realm_name: p.realm_name,
    color: p.color,
    centroid: typeof p.centroid === "string" ? JSON.parse(p.centroid) : p.centroid,
  };
}

export function getOrgsBioregion(
  orgs: Org[],
  bioregionCode: string,
  geojson: GeoJSON.FeatureCollection
): Org[] {
  const feature = geojson.features.find(
    (f) => f.properties?.code === bioregionCode
  );
  if (!feature) return [];

  return orgs.filter((org) => {
    // Path 1: Explicit bioregion_codes contains the target code
    if (org.bioregion_codes?.includes(bioregionCode)) return true;

    // Path 2: Any country_codes whose centroid falls within the target bioregion
    if (org.country_codes) {
      for (const cc of org.country_codes) {
        const centroid = COUNTRY_CENTROIDS[cc];
        if (centroid && pointInGeometry(centroid.longitude, centroid.latitude, feature.geometry)) {
          return true;
        }
      }
    }

    // Path 3: Existing coordinates point-in-polygon
    const lng = org.coordinates?.longitude;
    const lat = org.coordinates?.latitude;
    if (typeof lng !== "number" || typeof lat !== "number") return false;
    return pointInGeometry(lng, lat, feature.geometry);
  });
}

export function getActionsBioregion(
  actions: Action[],
  bioregionCode: string,
  geojson: GeoJSON.FeatureCollection
): Action[] {
  const feature = geojson.features.find(
    (f) => f.properties?.code === bioregionCode
  );
  if (!feature) return [];

  return actions.filter((action) => {
    const lng = action.location?.longitude;
    const lat = action.location?.latitude;
    if (typeof lng !== "number" || typeof lat !== "number") return false;
    return pointInGeometry(lng, lat, feature.geometry);
  });
}

export function getAllBioregionSummaries(
  assets: Asset[],
  geojson: GeoJSON.FeatureCollection
): Map<string, { code: string; assetCount: number; realm_name: string }> {
  const assetMap = mapAssetsToBioregions(assets, geojson);
  const summaries = new Map<
    string,
    { code: string; assetCount: number; realm_name: string }
  >();

  for (const feature of geojson.features) {
    const code = feature.properties?.code as string;
    const assets = assetMap.get(code) ?? [];
    summaries.set(code, {
      code,
      assetCount: assets.length,
      realm_name: feature.properties?.realm_name ?? "",
    });
  }

  return summaries;
}
