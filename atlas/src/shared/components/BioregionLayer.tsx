import { Source, Layer, useMap } from "react-map-gl";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { MapMouseEvent, MapboxGeoJSONFeature } from "mapbox-gl";
import type { Asset } from "../../modules/assets";
import type { Org, Action } from "../types";
import {
  loadBioregionGeoJSON,
  mapAssetsToBioregions,
  type BioregionProperties,
} from "../../modules/intelligence/bioregionIntelligence";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";
import type { EntityTypeKey, ActorTypeKey } from "../../context/filters/filtersContext";

export type { BioregionProperties };

interface HoverInfo {
  name: string;
  code: string;
  realm_name: string;
  color: string;
  totalCount: number;
  assetCount: number;
  actorCount: number;
  agentCount: number;
  actionCount: number;
  x: number;
  y: number;
}

// Hash function matching api.ts for consistent mock data
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Single universal agent (owockibot) across all bioregions
function getAgentCountForBioregion(_bioregionCode: string): number {
  return 1;
}

interface BioregionLayerProps {
  visible?: boolean;
  selectedBioregion?: string | null;
  allAssets?: Asset[];
  allOrgs?: Org[];
  allActions?: Action[];
  activeEntityTypes?: Set<EntityTypeKey>;
  activeActorTypes?: Set<ActorTypeKey>;
  onBioregionSelect?: (bioregion: BioregionProperties) => void;
}

export function BioregionLayer({
  visible = true,
  selectedBioregion = null,
  allAssets = [],
  allOrgs = [],
  allActions = [],
  activeEntityTypes = new Set(["asset", "actor", "action"]),
  activeActorTypes = new Set(["orgs", "agents"]),
  onBioregionSelect,
}: BioregionLayerProps) {
  const { current: map } = useMap();
  const hoveredIdRef = useRef<string | number | null>(null);
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(
    null
  );
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

  useEffect(() => {
    loadBioregionGeoJSON()
      .then((data) => setGeojson(data))
      .catch((err) => console.error("Failed to load bioregions:", err));
  }, []);

  // Asset counts per bioregion
  const assetCountMap = useMemo(() => {
    if (!geojson || !allAssets.length) return new Map<string, number>();
    const mapping = mapAssetsToBioregions(allAssets, geojson);
    const counts = new Map<string, number>();
    for (const [code, assets] of mapping) {
      counts.set(code, assets.length);
    }
    return counts;
  }, [geojson, allAssets]);

  // Actor (org) counts per bioregion - using point-in-polygon
  const actorCountMap = useMemo(() => {
    if (!geojson || !allOrgs.length) return new Map<string, number>();
    const counts = new Map<string, number>();
    for (const org of allOrgs) {
      if (!org.coordinates?.longitude || !org.coordinates?.latitude) continue;
      const pt = point([org.coordinates.longitude, org.coordinates.latitude]);
      for (const feature of geojson.features) {
        const code = feature.properties?.code;
        if (!code) continue;
        try {
          if (booleanPointInPolygon(pt, feature as any)) {
            counts.set(code, (counts.get(code) ?? 0) + 1);
            break;
          }
        } catch {
          // skip invalid geometries
        }
      }
    }
    return counts;
  }, [geojson, allOrgs]);

  // Action counts per bioregion - using point-in-polygon
  const actionCountMap = useMemo(() => {
    if (!geojson || !allActions.length) return new Map<string, number>();
    const counts = new Map<string, number>();
    for (const action of allActions) {
      if (!action.location?.longitude || !action.location?.latitude) continue;
      const pt = point([action.location.longitude, action.location.latitude]);
      for (const feature of geojson.features) {
        const code = feature.properties?.code;
        if (!code) continue;
        try {
          if (booleanPointInPolygon(pt, feature as any)) {
            counts.set(code, (counts.get(code) ?? 0) + 1);
            break;
          }
        } catch {
          // skip invalid geometries
        }
      }
    }
    return counts;
  }, [geojson, allActions]);

  // Combined counts for badges (filtered by active entity/actor types)
  const combinedCountMap = useMemo(() => {
    if (!geojson) return new Map<string, { total: number; assets: number; actors: number; agents: number; actions: number }>();
    const counts = new Map<string, { total: number; assets: number; actors: number; agents: number; actions: number }>();

    // Check what's currently active
    const showAssets = activeEntityTypes.has("asset");
    const showActors = activeEntityTypes.has("actor");
    const showActions = activeEntityTypes.has("action");
    const showOrgs = showActors && activeActorTypes.has("orgs");
    const showAgents = showActors && activeActorTypes.has("agents");

    // Get all bioregion codes from the geojson
    const allCodes = new Set<string>();
    for (const feature of geojson.features) {
      const code = feature.properties?.code;
      if (code) allCodes.add(code);
    }
    // Also include codes that have assets, actors, or actions
    for (const code of assetCountMap.keys()) allCodes.add(code);
    for (const code of actorCountMap.keys()) allCodes.add(code);
    for (const code of actionCountMap.keys()) allCodes.add(code);

    for (const code of allCodes) {
      const rawAssets = assetCountMap.get(code) ?? 0;
      const rawActors = actorCountMap.get(code) ?? 0;
      const rawAgents = (rawAssets > 0 || rawActors > 0) ? getAgentCountForBioregion(code) : 0;
      const rawActions = actionCountMap.get(code) ?? 0;

      // Apply filters
      const assets = showAssets ? rawAssets : 0;
      const actors = showOrgs ? rawActors : 0;
      const agents = showAgents ? rawAgents : 0;
      const actions = showActions ? rawActions : 0;

      counts.set(code, {
        total: assets + actors + agents + actions,
        assets,
        actors,
        agents,
        actions,
      });
    }
    return counts;
  }, [geojson, assetCountMap, actorCountMap, actionCountMap, activeEntityTypes, activeActorTypes]);

  // Centroid points for ALL bioregion labels (one per bioregion)
  const labelCentroidGeojson = useMemo(() => {
    if (!geojson) return { type: "FeatureCollection" as const, features: [] };
    const features = geojson.features
      .filter((f) => f.properties?.centroid)
      .map((f, i) => {
        const props = f.properties!;
        const centroid = props.centroid;
        return {
          type: "Feature" as const,
          id: i,
          properties: {
            code: props.code,
            name: props.name,
            color: props.color,
          },
          geometry: {
            type: "Point" as const,
            coordinates:
              typeof centroid === "string" ? JSON.parse(centroid) : centroid,
          },
        };
      });
    return { type: "FeatureCollection" as const, features };
  }, [geojson]);

  // Centroid points for bioregion count badges (total = assets + actors + agents)
  const centroidGeojson = useMemo(() => {
    if (!geojson) return { type: "FeatureCollection" as const, features: [] };
    const features = geojson.features
      .filter((f) => {
        const code = f.properties?.code;
        const counts = combinedCountMap.get(code);
        return code && counts && counts.total > 0;
      })
      .map((f, i) => {
        const props = f.properties!;
        const centroid = props.centroid ?? [0, 0];
        const counts = combinedCountMap.get(props.code) ?? { total: 0, assets: 0, actors: 0, agents: 0, actions: 0 };
        return {
          type: "Feature" as const,
          id: i,
          properties: {
            code: props.code,
            count: counts.total,
            countLabel: String(counts.total),
            color: props.color,
          },
          geometry: {
            type: "Point" as const,
            coordinates:
              typeof centroid === "string"
                ? JSON.parse(centroid)
                : centroid,
          },
        };
      });
    return { type: "FeatureCollection" as const, features };
  }, [geojson, combinedCountMap]);

  // Selected bioregion highlight source (polygons for fill/outline)
  const selectedGeojson = useMemo(() => {
    if (!geojson || !selectedBioregion) {
      return { type: "FeatureCollection" as const, features: [] };
    }
    const feature = geojson.features.find(
      (f) => f.properties?.code === selectedBioregion
    );
    return {
      type: "FeatureCollection" as const,
      features: feature ? [feature] : [],
    };
  }, [geojson, selectedBioregion]);

  // Selected bioregion label centroid (single point, avoids MultiPolygon duplication)
  const selectedLabelGeojson = useMemo(() => {
    if (!geojson || !selectedBioregion) {
      return { type: "FeatureCollection" as const, features: [] };
    }
    const feature = geojson.features.find(
      (f) => f.properties?.code === selectedBioregion
    );
    if (!feature?.properties?.centroid) {
      return { type: "FeatureCollection" as const, features: [] };
    }
    const props = feature.properties!;
    const centroid = props.centroid;
    return {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: { name: props.name, color: props.color },
          geometry: {
            type: "Point" as const,
            coordinates:
              typeof centroid === "string" ? JSON.parse(centroid) : centroid,
          },
        },
      ],
    };
  }, [geojson, selectedBioregion]);

  const combinedCountMapRef = useRef(combinedCountMap);
  combinedCountMapRef.current = combinedCountMap;

  const handleClick = useCallback(
    (e: MapMouseEvent) => {
      if (!map) return;

      // Yield to entity layer clicks — if a cluster or marker is at
      // this point, let the entity layer handle the click instead.
      const entityLayers = [
        "unclustered-point", "clusters",                    // Assets
        "org-unclustered-point", "org-clusters",             // Orgs
        "unclustered-action-point", "action-clusters",       // Actions
      ].filter((id) => {
        try { return !!map.getLayer(id); } catch { return false; }
      });

      if (entityLayers.length) {
        try {
          const entityHits = map.queryRenderedFeatures(e.point, {
            layers: entityLayers,
          });
          if (entityHits.length) return;
        } catch {
          // proceed with bioregion click
        }
      }

      const features = map.queryRenderedFeatures(e.point, {
        layers: ["bioregion-fill"],
      }) as MapboxGeoJSONFeature[];

      if (!features.length || !onBioregionSelect) return;
      const props = features[0].properties as Record<string, any>;
      const centroid = props.centroid
        ? JSON.parse(props.centroid)
        : [0, 0];
      onBioregionSelect({
        code: props.code,
        name: props.name ?? props.code,
        realm: props.realm,
        realm_name: props.realm_name,
        color: props.color,
        centroid,
      });

      map.flyTo({
        center: centroid as [number, number],
        zoom: 4.5,
        duration: 1200,
      });
    },
    [map, onBioregionSelect]
  );

  const handleMouseMove = useCallback(
    (e: MapMouseEvent) => {
      if (!map) return;
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["bioregion-fill"],
      }) as MapboxGeoJSONFeature[];

      if (hoveredIdRef.current !== null) {
        map.setFeatureState(
          { source: "bioregions", id: hoveredIdRef.current },
          { hover: false }
        );
        hoveredIdRef.current = null;
      }

      if (!features.length) {
        map.getCanvas().style.cursor = "";
        setHoverInfo(null);
        return;
      }

      const feature = features[0];
      if (feature.id != null) {
        hoveredIdRef.current = feature.id;
        map.setFeatureState(
          { source: "bioregions", id: feature.id },
          { hover: true }
        );
      }
      map.getCanvas().style.cursor = "pointer";

      const props = feature.properties as Record<string, any>;
      const counts = combinedCountMapRef.current.get(props.code) ?? { total: 0, assets: 0, actors: 0, agents: 0, actions: 0 };
      setHoverInfo({
        name: props.name ?? props.code,
        code: props.code,
        realm_name: props.realm_name,
        color: props.color,
        totalCount: counts.total,
        assetCount: counts.assets,
        actorCount: counts.actors,
        agentCount: counts.agents,
        actionCount: counts.actions,
        x: e.point.x,
        y: e.point.y,
      });
    },
    [map]
  );

  const handleMouseLeave = useCallback(() => {
    if (!map) return;
    if (hoveredIdRef.current !== null) {
      map.setFeatureState(
        { source: "bioregions", id: hoveredIdRef.current },
        { hover: false }
      );
      hoveredIdRef.current = null;
    }
    map.getCanvas().style.cursor = "";
    setHoverInfo(null);
  }, [map]);

  useEffect(() => {
    if (!map || !geojson) return;

    map.on("click", "bioregion-fill", handleClick);
    map.on("mousemove", "bioregion-fill", handleMouseMove);
    map.on("mouseleave", "bioregion-fill", handleMouseLeave);

    return () => {
      map.off("click", "bioregion-fill", handleClick);
      map.off("mousemove", "bioregion-fill", handleMouseMove);
      map.off("mouseleave", "bioregion-fill", handleMouseLeave);
    };
  }, [map, geojson, handleClick, handleMouseMove, handleMouseLeave]);

  if (!geojson) return null;

  const visibility = visible ? "visible" : "none";
  const labelVisibility = visible && !selectedBioregion ? "visible" : "none";

  return (
    <>
      {/* ── Bioregion polygons ── */}
      <Source
        id="bioregions"
        type="geojson"
        data={geojson}
        generateId={true}
      >
        <Layer
          id="bioregion-fill"
          type="fill"
          source="bioregions"
          layout={{ visibility }}
          paint={{
            "fill-color": ["get", "color"],
            "fill-opacity": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              0.18,
              0.05,
            ],
          }}
        />
        <Layer
          id="bioregion-outline"
          type="line"
          source="bioregions"
          layout={{ visibility }}
          paint={{
            "line-color": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              ["get", "color"],
              "#D1D5DB",
            ],
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              1,
              ["case", ["boolean", ["feature-state", "hover"], false], 1.2, 0.4],
              4,
              ["case", ["boolean", ["feature-state", "hover"], false], 1.5, 0.3],
              7,
              ["case", ["boolean", ["feature-state", "hover"], false], 1.0, 0.2],
            ],
            "line-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              1,
              ["case", ["boolean", ["feature-state", "hover"], false], 0.7, 0.25],
              5,
              ["case", ["boolean", ["feature-state", "hover"], false], 0.6, 0.15],
              8,
              0.08,
            ],
          }}
        />
      </Source>

      {/* ── Bioregion name labels (centroid points — one per bioregion) ── */}
      <Source
        id="bioregion-labels"
        type="geojson"
        data={labelCentroidGeojson as any}
      >
        <Layer
          id="bioregion-label"
          type="symbol"
          source="bioregion-labels"
          minzoom={4}
          layout={{
            visibility: labelVisibility,
            "text-field": [
              "step",
              ["zoom"],
              "",
              4,
              ["get", "code"],
              5.5,
              ["get", "name"],
            ],
            "text-size": [
              "interpolate",
              ["linear"],
              ["zoom"],
              4, 8,
              6, 10,
              8, 12,
            ],
            "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
            "text-allow-overlap": false,
            "text-padding": 12,
            "text-max-width": 10,
          }}
          paint={{
            "text-color": "#9CA3AF",
            "text-halo-color": "rgba(255, 255, 255, 0.9)",
            "text-halo-width": 1.2,
            "text-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              4, 0.4,
              6, 0.65,
            ],
          }}
        />
      </Source>

      {/* ── Bioregion count badges — hollow ring style (show when zoomed out) ── */}
      <Source
        id="bioregion-counts"
        type="geojson"
        data={centroidGeojson as any}
      >
        {/* Outer ring — realm colored, hollow */}
        <Layer
          id="bioregion-badge-ring"
          type="circle"
          source="bioregion-counts"
          layout={{ visibility }}
          maxzoom={4}
          paint={{
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["get", "count"],
              1, 12,
              10, 16,
              50, 22,
            ],
            "circle-color": "rgba(255, 255, 255, 0.6)",
            "circle-stroke-color": ["get", "color"],
            "circle-stroke-width": 2,
            "circle-opacity": 0.5,
          }}
        />
        {/* Count text */}
        <Layer
          id="bioregion-badge-count"
          type="symbol"
          source="bioregion-counts"
          layout={{
            visibility,
            "text-field": ["get", "countLabel"],
            "text-size": [
              "interpolate",
              ["linear"],
              ["get", "count"],
              1, 10,
              10, 12,
              50, 14,
            ],
            "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
            "text-allow-overlap": true,
          }}
          maxzoom={4}
          paint={{
            "text-color": ["get", "color"],
            "text-opacity": 0.85,
          }}
        />
      </Source>

      {/* ── Selected bioregion highlight ── */}
      <Source
        id="bioregion-selected"
        type="geojson"
        data={selectedGeojson as any}
      >
        <Layer
          id="bioregion-selected-fill"
          type="fill"
          source="bioregion-selected"
          paint={{
            "fill-color": ["get", "color"],
            "fill-opacity": 0.15,
          }}
        />
        <Layer
          id="bioregion-selected-outline"
          type="line"
          source="bioregion-selected"
          paint={{
            "line-color": ["get", "color"],
            "line-width": 2.5,
            "line-opacity": 0.85,
          }}
        />
      </Source>

      {/* Selected bioregion label (single centroid point) */}
      <Source
        id="bioregion-selected-label-src"
        type="geojson"
        data={selectedLabelGeojson as any}
      >
        <Layer
          id="bioregion-selected-label"
          type="symbol"
          source="bioregion-selected-label-src"
          layout={{
            "text-field": ["get", "name"],
            "text-size": 13,
            "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
            "text-allow-overlap": true,
            "text-max-width": 12,
          }}
          paint={{
            "text-color": ["get", "color"],
            "text-halo-color": "rgba(255, 255, 255, 0.95)",
            "text-halo-width": 2,
          }}
        />
      </Source>

      {/* Hover tooltip */}
      {hoverInfo && !selectedBioregion && (
        <div
          className="absolute pointer-events-none z-20"
          style={{
            left: hoverInfo.x + 14,
            top: hoverInfo.y - 8,
          }}
        >
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 max-w-[260px] overflow-hidden">
            <div className="flex gap-2.5 p-2.5">
              <img
                src={`/images/bioregions/${hoverInfo.code}.webp`}
                alt=""
                className="w-12 h-12 rounded object-cover flex-shrink-0"
                style={{ backgroundColor: hoverInfo.color }}
              />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 leading-tight">
                  {hoverInfo.name}
                </div>
                <div className="mt-1">
                  <span
                    className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: `${hoverInfo.color}20`,
                      color: hoverInfo.color,
                    }}
                  >
                    {hoverInfo.realm_name}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-2.5 py-2 border-t border-gray-100">
              <div className="flex items-center gap-1 text-[11px] text-gray-500" title="Assets">
                <svg width="11" height="11" viewBox="0 0 256 256" className="fill-current"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216ZM173.66,90.34a8,8,0,0,1,0,11.32l-40,40a8,8,0,0,1-11.32-11.32l40-40A8,8,0,0,1,173.66,90.34ZM96,16V8a8,8,0,0,1,16,0v8a8,8,0,0,1-16,0Z"/></svg>
                <span>{hoverInfo.assetCount}</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-gray-500" title="Actors">
                <svg width="11" height="11" viewBox="0 0 256 256" className="fill-current"><path d="M117.25,157.92a60,60,0,1,0-66.5,0A95.83,95.83,0,0,0,3.53,195.63a8,8,0,1,0,13.4,8.74,80,80,0,0,1,134.14,0,8,8,0,0,0,13.4-8.74A95.83,95.83,0,0,0,117.25,157.92ZM40,108a44,44,0,1,1,44,44A44.05,44.05,0,0,1,40,108Zm210.14,98.7a8,8,0,0,1-11.07-2.33A79.83,79.83,0,0,0,172,168a8,8,0,0,1,0-16,44,44,0,1,0-16.34-84.87,8,8,0,1,1-5.94-14.85,60,60,0,0,1,55.53,105.64,95.83,95.83,0,0,1,47.22,37.71A8,8,0,0,1,250.14,206.7Z"/></svg>
                <span>{hoverInfo.actorCount + hoverInfo.agentCount}</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-gray-500" title="Actions">
                <svg width="11" height="11" viewBox="0 0 256 256" className="fill-current"><path d="M215.79,118.17a8,8,0,0,0-5-5.66L153.18,90.9l14.66-73.33a8,8,0,0,0-13.69-7l-112,120a8,8,0,0,0,3,13l57.63,21.61L88.16,238.43a8,8,0,0,0,13.69,7l112-120A8,8,0,0,0,215.79,118.17Z"/></svg>
                <span>{hoverInfo.actionCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
