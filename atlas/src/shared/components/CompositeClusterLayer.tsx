import { Source, Layer, Popup, useMap } from "react-map-gl";
import { useCallback, useEffect, useRef, useMemo, useState } from "react";
import type { MapRef } from "react-map-gl";
import type { MapboxGeoJSONFeature, MapMouseEvent } from "mapbox-gl";
import type { Point, Feature, FeatureCollection } from "geojson";
import type { Asset } from "../../modules/assets";
import type { Org, Action } from "../types";
import type { EntityTypeKey } from "../../context/filters/filtersContext";

export const ENTITY_COLORS = {
  asset: { primary: "#0E7490", light: "#22D3EE", dark: "#164E63" },
  actor: { primary: "#177fe0", light: "#818CF8", dark: "#1e40af" },
  action: { primary: "#059669", light: "#10b981", dark: "#047857" },
} as const;

// ── Canvas icon generation for cluster sub-circles ──────────────────────

const CLUSTER_ICON_PREFIX = "cluster-";

function generateClusterIcon(
  assetCount: number,
  actorCount: number,
  actionCount: number
): HTMLCanvasElement {
  const dpr = window.devicePixelRatio || 1;

  const segments: { count: number; color: string }[] = [];
  if (assetCount > 0) segments.push({ count: assetCount, color: ENTITY_COLORS.asset.light });
  if (actorCount > 0) segments.push({ count: actorCount, color: ENTITY_COLORS.actor.light });
  if (actionCount > 0) segments.push({ count: actionCount, color: ENTITY_COLORS.action.light });

  if (segments.length === 0) segments.push({ count: 0, color: "#94a3b8" });

  const n = segments.length;
  const r = n === 1 ? 7 : 6;
  const gap = 2;
  const pad = 1;

  const totalWidth = n * (r * 2) + (n - 1) * gap + pad * 2;
  const totalHeight = r * 2 + pad * 2;

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(totalWidth * dpr);
  canvas.height = Math.ceil(totalHeight * dpr);

  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  segments.forEach((seg, i) => {
    const cx = pad + r + i * (r * 2 + gap);
    const cy = pad + r;

    // Colored circle
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = seg.color;
    ctx.fill();

    // Count text — white on colored background
    const fontSize = n === 1 ? 9 : 8;
    ctx.fillStyle = "#0f172a";
    ctx.font = `600 ${fontSize}px -apple-system, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const text = seg.count >= 1000
      ? `${Math.floor(seg.count / 1000)}k`
      : String(seg.count);
    ctx.fillText(text, cx, cy + 0.5);
  });

  return canvas;
}

// ── Helpers ──────────────────────────────────────────────────────────────

interface Coordinates {
  longitude: number;
  latitude: number;
}

interface CompositeClusterLayerProps {
  assets: Asset[];
  orgs: Org[];
  actions: Action[];
  activeTypes: Set<EntityTypeKey>;
  onAssetClick?: (id: string) => void;
  onOrgClick: (p: { orgId: number; lng: number; lat: number }) => void;
  onActionClick: (p: { actionId: string; lng: number; lat: number }) => void;
}

function lngLatToPixel({ longitude, latitude }: Coordinates, map: MapRef) {
  return map.project([longitude, latitude]);
}

function pixelToLngLat(
  pixel: { x: number; y: number },
  map: MapRef
): Coordinates {
  const { lng, lat } = map.unproject([pixel.x, pixel.y]);
  return { longitude: lng, latitude: lat };
}

interface SpiderfyItem {
  props: Record<string, any>;
  coords: Coordinates;
}

function spiderfyFeatures(
  items: SpiderfyItem[],
  map: MapRef,
  pixelRadius = 20
): SpiderfyItem[] {
  const result: SpiderfyItem[] = [];
  const pixelThreshold = pixelRadius * 1.2;

  const pixelItems = items
    .map((item) => {
      const { longitude: lng, latitude: lat } = item.coords;
      if (typeof lng !== "number" || typeof lat !== "number" || isNaN(lng) || isNaN(lat))
        return null;
      const pixel = lngLatToPixel({ longitude: lng, latitude: lat }, map);
      return { item, pixel };
    })
    .filter(Boolean) as { item: SpiderfyItem; pixel: { x: number; y: number } }[];

  const visited = new Set<number>();

  for (let i = 0; i < pixelItems.length; i++) {
    if (visited.has(i)) continue;
    const group = [pixelItems[i]];
    visited.add(i);

    for (let j = i + 1; j < pixelItems.length; j++) {
      if (visited.has(j)) continue;
      const dx = pixelItems[i].pixel.x - pixelItems[j].pixel.x;
      const dy = pixelItems[i].pixel.y - pixelItems[j].pixel.y;
      if (Math.sqrt(dx * dx + dy * dy) < pixelThreshold) {
        group.push(pixelItems[j]);
        visited.add(j);
      }
    }

    if (group.length > 1) {
      const center = group[0].pixel;
      group.forEach((entry, idx) => {
        const angle = (idx / group.length) * Math.PI * 2;
        const x = center.x + pixelRadius * Math.cos(angle);
        const y = center.y + pixelRadius * Math.sin(angle);
        const offset = pixelToLngLat({ x, y }, map);
        result.push({ props: entry.item.props, coords: offset });
      });
    } else {
      result.push(group[0].item);
    }
  }
  return result;
}

// ── Layer IDs ────────────────────────────────────────────────────────────

const SOURCE_ID = "composite-entities";
const CLUSTER_LAYER = "composite-clusters";
const CLUSTER_LABEL = "composite-cluster-label";
const UNCLUSTERED_GLOW = "composite-unclustered-glow";
const UNCLUSTERED_POINT = "composite-unclustered-point";
const UNCLUSTERED_LABEL = "composite-unclustered-label";

// ── Component ────────────────────────────────────────────────────────────

export function CompositeClusterLayer({
  assets,
  orgs,
  actions,
  activeTypes,
  onAssetClick,
  onOrgClick,
  onActionClick,
}: CompositeClusterLayerProps) {
  const { current: map } = useMap();
  const hoveredIdRef = useRef<string | number | null>(null);
  const [zoom, setZoom] = useState(0);
  const clusterMaxZoom = 15;

  const isMobile = useMemo(() => window.innerWidth < 768, []);

  // ── Hover tooltip state ───────────────────────────────────────────
  const [hoveredAsset, setHoveredAsset] = useState<{
    lng: number;
    lat: number;
    name: string;
    issuerName: string;
    assetTypeName: string | null;
    imageUrl: string | null;
  } | null>(null);

  const [hoveredAction, setHoveredAction] = useState<{
    lng: number;
    lat: number;
    name: string;
    actorName: string | null;
    protocolName: string | null;
    imageUrl: string | null;
  } | null>(null);

  const assetById = useMemo(
    () => new Map(assets.map((a) => [a.id, a])),
    [assets]
  );
  const actionById = useMemo(
    () => new Map(actions.map((a) => [a.id, a])),
    [actions]
  );

  const clearHovered = useCallback(() => { setHoveredAsset(null); setHoveredAction(null); }, []);

  useEffect(() => {
    if (!map) return;
    setZoom(map.getZoom());
    const updateZoom = () => setZoom(map.getZoom());
    map.on("zoom", updateZoom);
    return () => { map.off("zoom", updateZoom); };
  }, [map]);

  // ── Build merged GeoJSON ────────────────────────────────────────────

  const geojson: FeatureCollection = useMemo(() => {
    if (!map) return { type: "FeatureCollection", features: [] };

    const features: Feature[] = [];
    let featureId = 0;

    if (activeTypes.has("asset")) {
      const assetItems: SpiderfyItem[] = assets.map((a) => ({
        props: {
          entity_type: "asset",
          id: a.id,
          type_id: a.asset_types?.[0]?.id ?? "NO_TYPE",
          label: a.issuer?.name ?? "Unknown",
        },
        coords: { longitude: a.coordinates?.longitude ?? 0, latitude: a.coordinates?.latitude ?? 0 },
      }));
      const processed = zoom > clusterMaxZoom ? spiderfyFeatures(assetItems, map) : assetItems;
      for (const item of processed) {
        features.push({
          type: "Feature",
          id: featureId++,
          properties: { ...item.props },
          geometry: { type: "Point", coordinates: [item.coords.longitude, item.coords.latitude] },
        });
      }
    }

    if (activeTypes.has("actor")) {
      const orgItems: SpiderfyItem[] = orgs.map((o) => ({
        props: {
          entity_type: "actor",
          id: o.id,
          label: o.name,
          lng: o.coordinates?.longitude ?? 0,
          lat: o.coordinates?.latitude ?? 0,
        },
        coords: { longitude: o.coordinates?.longitude ?? 0, latitude: o.coordinates?.latitude ?? 0 },
      }));
      const processed = zoom > clusterMaxZoom ? spiderfyFeatures(orgItems, map) : orgItems;
      for (const item of processed) {
        features.push({
          type: "Feature",
          id: featureId++,
          properties: { ...item.props },
          geometry: { type: "Point", coordinates: [item.coords.longitude, item.coords.latitude] },
        });
      }
    }

    if (activeTypes.has("action")) {
      // ALL actions go in for correct cluster counts when zoomed out
      const allActionItems: SpiderfyItem[] = actions
        .filter(
          (a) =>
            a.location &&
            typeof a.location.longitude === "number" &&
            typeof a.location.latitude === "number"
        )
        .map((a) => ({
          props: {
            entity_type: "action",
            id: a.id,
            label: a.title,
            lng: a.location!.longitude,
            lat: a.location!.latitude,
          },
          coords: { longitude: a.location!.longitude, latitude: a.location!.latitude },
        }));

      if (zoom > clusterMaxZoom) {
        // Zoomed in: deduplicate by location so bundled actions show one marker
        const seenLocs = new Set<string>();
        const deduped = allActionItems.filter((item) => {
          const key = `${item.coords.latitude.toFixed(4)},${item.coords.longitude.toFixed(4)}`;
          if (seenLocs.has(key)) return false;
          seenLocs.add(key);
          return true;
        });
        const processed = spiderfyFeatures(deduped, map);
        for (const item of processed) {
          features.push({
            type: "Feature",
            id: featureId++,
            properties: { ...item.props },
            geometry: { type: "Point", coordinates: [item.coords.longitude, item.coords.latitude] },
          });
        }
      } else {
        // Zoomed out: all actions for accurate cluster counts
        for (const item of allActionItems) {
          features.push({
            type: "Feature",
            id: featureId++,
            properties: { ...item.props },
            geometry: { type: "Point", coordinates: [item.coords.longitude, item.coords.latitude] },
          });
        }
      }
    }

    return { type: "FeatureCollection", features };
  }, [assets, orgs, actions, activeTypes, map, zoom]);

  // ── Cluster icon generation (on-demand via styleimagemissing) ───────

  useEffect(() => {
    if (!map) return;

    const handleMissingImage = (e: { id: string }) => {
      if (!e.id.startsWith(CLUSTER_ICON_PREFIX)) return;

      const parts = e.id.slice(CLUSTER_ICON_PREFIX.length).split("-").map(Number);
      if (parts.length !== 3 || parts.some(isNaN)) return;

      const [assetCount, actorCount, actionCount] = parts;
      const canvas = generateClusterIcon(assetCount, actorCount, actionCount);
      const ctx = canvas.getContext("2d")!;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      map.addImage(e.id, {
        width: canvas.width,
        height: canvas.height,
        data: new Uint8Array(imageData.data.buffer),
      }, { pixelRatio: window.devicePixelRatio || 1 });
    };

    map.on("styleimagemissing", handleMissingImage);
    return () => { map.off("styleimagemissing", handleMissingImage); };
  }, [map]);

  // ── Click / hover handling ──────────────────────────────────────────

  useEffect(() => {
    if (!map) return;

    const layerIds = [UNCLUSTERED_POINT, CLUSTER_LAYER];

    const handleClick = (e: MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: layerIds,
      }) as MapboxGeoJSONFeature[];

      if (!features.length) return;
      const feature = features[0];

      if (feature.layer?.id === UNCLUSTERED_POINT) {
        const entityType = feature.properties?.entity_type;
        if (entityType === "asset") {
          const assetId = feature.properties?.id;
          if (onAssetClick && typeof assetId === "string") {
            onAssetClick(assetId);
          }
        } else if (entityType === "actor") {
          onOrgClick({
            orgId: feature.properties?.id ?? 0,
            lng: feature.properties?.lng ?? 0,
            lat: feature.properties?.lat ?? 0,
          });
        } else if (entityType === "action") {
          onActionClick({
            actionId: feature.properties?.id ?? "",
            lng: feature.properties?.lng ?? 0,
            lat: feature.properties?.lat ?? 0,
          });
        }
      }

      if (
        feature.layer?.id === CLUSTER_LAYER &&
        feature.geometry?.type === "Point"
      ) {
        const coords = (feature.geometry as Point).coordinates;
        if (Array.isArray(coords) && coords.length === 2) {
          const clusterId = feature.properties?.cluster_id;
          const source = map.getSource(SOURCE_ID) as any;
          if (source && "getClusterExpansionZoom" in source) {
            source.getClusterExpansionZoom(
              clusterId,
              (err: any, newZoom: number) => {
                if (err || newZoom == null) return;
                map.easeTo({
                  center: coords as [number, number],
                  zoom: newZoom,
                  duration: 500,
                });
              }
            );
          }
        }
      }
    };

    const handleMouseMove = (e: MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: layerIds,
      }) as MapboxGeoJSONFeature[];

      if (hoveredIdRef.current !== null) {
        map.setFeatureState(
          { source: SOURCE_ID, id: hoveredIdRef.current },
          { hover: false }
        );
        hoveredIdRef.current = null;
      }

      if (!features.length) {
        map.getCanvas().style.cursor = "";
        clearHovered();
        return;
      }

      map.getCanvas().style.cursor = "pointer";
      const feature = features[0];
      if (feature.id != null) {
        hoveredIdRef.current = feature.id;
        map.setFeatureState(
          { source: SOURCE_ID, id: feature.id },
          { hover: true }
        );
      }

      // Show tooltip for unclustered points (desktop only)
      if (!isMobile && feature.layer?.id === UNCLUSTERED_POINT) {
        const entityType = feature.properties?.entity_type;
        if (entityType === "asset") {
          const asset = assetById.get(feature.properties.id);
          if (asset && feature.geometry?.type === "Point") {
            const [lng, lat] = (feature.geometry as Point).coordinates;
            setHoveredAsset({
              lng, lat,
              name: asset.name,
              issuerName: asset.issuer?.name ?? "Unknown",
              assetTypeName: asset.asset_types?.[0]?.name ?? null,
              imageUrl: asset.main_image || null,
            });
            setHoveredAction(null);
          } else { clearHovered(); }
        } else if (entityType === "action") {
          const action = actionById.get(feature.properties.id);
          if (action && feature.geometry?.type === "Point") {
            const [lng, lat] = (feature.geometry as Point).coordinates;
            setHoveredAction({
              lng, lat,
              name: action.title || "Action",
              actorName: action.actors?.[0]?.name || null,
              protocolName: action.proofs?.[0]?.protocol?.name || null,
              imageUrl: action.main_image || null,
            });
            setHoveredAsset(null);
          } else { clearHovered(); }
        } else {
          clearHovered();
        }
      } else {
        clearHovered();
      }
    };

    const handleMouseLeave = () => {
      if (hoveredIdRef.current !== null) {
        map.setFeatureState(
          { source: SOURCE_ID, id: hoveredIdRef.current },
          { hover: false }
        );
        hoveredIdRef.current = null;
      }
      map.getCanvas().style.cursor = "";
      clearHovered();
    };

    map.on("click", UNCLUSTERED_POINT, handleClick);
    map.on("click", CLUSTER_LAYER, handleClick);
    map.on("mousemove", UNCLUSTERED_POINT, handleMouseMove);
    map.on("mousemove", CLUSTER_LAYER, handleMouseMove);
    map.on("mouseleave", UNCLUSTERED_POINT, handleMouseLeave);
    map.on("mouseleave", CLUSTER_LAYER, handleMouseLeave);

    return () => {
      map.off("click", UNCLUSTERED_POINT, handleClick);
      map.off("click", CLUSTER_LAYER, handleClick);
      map.off("mousemove", UNCLUSTERED_POINT, handleMouseMove);
      map.off("mousemove", CLUSTER_LAYER, handleMouseMove);
      map.off("mouseleave", UNCLUSTERED_POINT, handleMouseLeave);
      map.off("mouseleave", CLUSTER_LAYER, handleMouseLeave);
    };
  }, [map, onAssetClick, onOrgClick, onActionClick, isMobile, assetById, clearHovered]);

  // ── Style expressions for unclustered points ────────────────────────

  const pointFillColor: mapboxgl.Expression = [
    "match",
    ["get", "entity_type"],
    "asset", "#ffffff",
    "actor", ENTITY_COLORS.actor.primary,
    "action", ENTITY_COLORS.action.primary,
    "#ffffff",
  ];

  const pointStrokeColor: mapboxgl.Expression = [
    "match",
    ["get", "entity_type"],
    "asset",
    [
      "match",
      ["get", "type_id"],
      5, "#F4D35E",
      1, "#4CAF50",
      6, "#00ACC1",
      7, "#BA68C8",
      4, "#FF8A65",
      8, "#90A4AE",
      "#BDBDBD",
    ] as any,
    "actor", "#ffffff",
    "action", "#ffffff",
    "#ffffff",
  ];

  const glowColor: mapboxgl.Expression = [
    "match",
    ["get", "entity_type"],
    "asset",
    [
      "match",
      ["get", "type_id"],
      5, "#F4D35E",
      1, "#4CAF50",
      6, "#00ACC1",
      7, "#BA68C8",
      4, "#FF8A65",
      8, "#90A4AE",
      "#BDBDBD",
    ] as any,
    "actor", ENTITY_COLORS.actor.light,
    "action", ENTITY_COLORS.action.light,
    "#BDBDBD",
  ];

  // ── icon-image expression: builds name like "cluster-25-2-5" ────────

  const clusterIconExpr: mapboxgl.Expression = [
    "concat",
    CLUSTER_ICON_PREFIX,
    ["to-string", ["get", "asset_count"]],
    "-",
    ["to-string", ["get", "actor_count"]],
    "-",
    ["to-string", ["get", "action_count"]],
  ];

  return (
    <Source
      id={SOURCE_ID}
      type="geojson"
      data={geojson as any}
      cluster={true}
      clusterMaxZoom={clusterMaxZoom}
      clusterRadius={30}
      clusterProperties={{
        asset_count: ["+", ["case", ["==", ["get", "entity_type"], "asset"], 1, 0]],
        actor_count: ["+", ["case", ["==", ["get", "entity_type"], "actor"], 1, 0]],
        action_count: ["+", ["case", ["==", ["get", "entity_type"], "action"], 1, 0]],
      }}
      generateId={true}
    >
      {/* Cluster circle — compact, semi-transparent */}
      <Layer
        id={CLUSTER_LAYER}
        type="circle"
        source={SOURCE_ID}
        minzoom={4}
        filter={["has", "point_count"]}
        paint={{
          "circle-color": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            "rgba(30,41,59,0.92)",
            "rgba(30,41,59,0.75)",
          ],
          "circle-radius": [
            "step", ["get", "point_count"],
            14, 10, 17, 50, 20, 100, 24,
          ],
          "circle-stroke-color": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            "rgba(34,211,238,0.6)",
            "rgba(255,255,255,0.12)",
          ],
          "circle-stroke-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            1.5, 0.5,
          ],
        }}
      />

      {/* Cluster label — canvas-generated sub-circle icons */}
      <Layer
        id={CLUSTER_LABEL}
        type="symbol"
        source={SOURCE_ID}
        minzoom={4}
        filter={["has", "point_count"]}
        layout={{
          "icon-image": clusterIconExpr as any,
          "icon-allow-overlap": true,
          "icon-size": 1,
        }}
      />

      {/* Unclustered glow */}
      <Layer
        id={UNCLUSTERED_GLOW}
        type="circle"
        source={SOURCE_ID}
        minzoom={4}
        filter={["!", ["has", "point_count"]]}
        paint={{
          "circle-radius": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            18,
            isMobile ? 20 : 14,
          ],
          "circle-color": glowColor as any,
          "circle-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            0.25, 0.12,
          ],
          "circle-blur": 0.6,
        }}
      />

      {/* Unclustered point */}
      <Layer
        id={UNCLUSTERED_POINT}
        type="circle"
        source={SOURCE_ID}
        minzoom={4}
        filter={["!", ["has", "point_count"]]}
        paint={{
          "circle-color": pointFillColor as any,
          "circle-radius": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            8,
            isMobile ? 8 : 6,
          ],
          "circle-stroke-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            3, 2.5,
          ],
          "circle-stroke-color": pointStrokeColor as any,
        }}
      />

      {/* Unclustered label */}
      <Layer
        id={UNCLUSTERED_LABEL}
        type="symbol"
        source={SOURCE_ID}
        filter={["!", ["has", "point_count"]]}
        minzoom={6}
        layout={{
          "text-field": ["get", "label"],
          "text-size": 10,
          "text-anchor": "top",
          "text-offset": [0, 1.4],
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
          "text-allow-overlap": false,
          "text-padding": 4,
        }}
        paint={{
          "text-color": "#4B5563",
          "text-halo-color": "rgba(255,255,255,0.9)",
          "text-halo-width": 1,
        }}
      />
      {/* Hover tooltip for unclustered asset markers */}
      {hoveredAsset && (
        <Popup
          longitude={hoveredAsset.lng}
          latitude={hoveredAsset.lat}
          anchor="bottom"
          offset={14}
          closeButton={false}
          closeOnClick={false}
          className="asset-hover-popup"
        >
          <div className="flex items-center gap-2 max-w-[200px]">
            {hoveredAsset.imageUrl && (
              <img
                src={hoveredAsset.imageUrl}
                alt=""
                className="w-10 h-10 rounded object-cover flex-shrink-0"
              />
            )}
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">
                {hoveredAsset.name}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {hoveredAsset.issuerName}
              </div>
              {hoveredAsset.assetTypeName && (
                <div className="text-[11px] text-gray-400 truncate">
                  {hoveredAsset.assetTypeName}
                </div>
              )}
            </div>
          </div>
        </Popup>
      )}

      {/* Hover tooltip for unclustered action markers */}
      {hoveredAction && (
        <Popup
          longitude={hoveredAction.lng}
          latitude={hoveredAction.lat}
          anchor="bottom"
          offset={14}
          closeButton={false}
          closeOnClick={false}
          className="asset-hover-popup"
        >
          <div className="flex items-center gap-2 max-w-[200px]">
            {hoveredAction.imageUrl && (
              <img
                src={hoveredAction.imageUrl}
                alt=""
                className="w-10 h-10 rounded object-cover flex-shrink-0"
              />
            )}
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">
                {hoveredAction.name}
              </div>
              {hoveredAction.actorName && !hoveredAction.actorName.startsWith("0x") && (
                <div className="text-xs text-gray-500 truncate">
                  {hoveredAction.actorName}
                </div>
              )}
              {hoveredAction.protocolName && (
                <div className="text-[11px] text-gray-400 truncate">
                  {hoveredAction.protocolName}
                </div>
              )}
            </div>
          </div>
        </Popup>
      )}
    </Source>
  );
}
