import { Source, Layer, useMap } from "react-map-gl";
import { useEffect, useRef, useMemo, useState } from "react";
import { useNewFiltersDispatch } from "../../context/filters/useFiltersDispatch";
import type { MapRef } from "react-map-gl";
import type { MapboxGeoJSONFeature, MapMouseEvent } from "mapbox-gl";
import type { Point } from "geojson";

interface Coordinates {
  longitude: number;
  latitude: number;
}

interface Asset {
  id: string;
  coordinates: Coordinates;
  issuer?: { name?: string };
  asset_types?: { id?: number; name?: string }[];
  [key: string]: any;
}

interface ClusteredAssetLayerProps {
  assets: Asset[];
  onAssetClick?: (id: string) => void; // ✅ new optional prop
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

function spiderfyFeatures(
  assets: Asset[],
  map: MapRef,
  pixelRadius = 5
): Asset[] {
  const features: Asset[] = [];
  const pixelThreshold = pixelRadius * 1.2;

  const pixelAssets = assets
    .map((asset) => {
      const lng = asset?.coordinates?.longitude;
      const lat = asset?.coordinates?.latitude;

      if (
        typeof lng !== "number" ||
        typeof lat !== "number" ||
        isNaN(lng) ||
        isNaN(lat)
      ) {
        return null;
      }

      const pixel = lngLatToPixel({ longitude: lng, latitude: lat }, map);
      return { asset, pixel };
    })
    .filter(Boolean) as { asset: Asset; pixel: { x: number; y: number } }[];

  const visited = new Set<number>();

  for (let i = 0; i < pixelAssets.length; i++) {
    if (visited.has(i)) continue;

    const group = [pixelAssets[i]];
    visited.add(i);

    for (let j = i + 1; j < pixelAssets.length; j++) {
      if (visited.has(j)) continue;

      const dx = pixelAssets[i].pixel.x - pixelAssets[j].pixel.x;
      const dy = pixelAssets[i].pixel.y - pixelAssets[j].pixel.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < pixelThreshold) {
        group.push(pixelAssets[j]);
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

        features.push({
          ...entry.asset,
          coordinates: {
            longitude: offset.longitude,
            latitude: offset.latitude,
          },
        });
      });
    } else {
      features.push(group[0].asset);
    }
  }

  return features;
}

export function ClusteredAssetLayer({
  assets,
  onAssetClick,
}: ClusteredAssetLayerProps) {
  const { current: map } = useMap(); // ✅ moved to top
  const dispatch = useNewFiltersDispatch();
  const hoveredStateIdRef = useRef<string | number | null>(null);
  const hoveredClusterIdRef = useRef<string | number | null>(null);
  const [zoom, setZoom] = useState(0);
  const clusterMaxZoom = 15;

  // Detect mobile device
  const isMobile = useMemo(() => {
    return window.innerWidth < 768;
  }, []);

  useEffect(() => {
    if (!map) return () => {};
    setZoom(map.getZoom());

    const updateZoom = () => setZoom(map.getZoom());
    map.on("zoom", updateZoom);
    return () => map.off("zoom", updateZoom);
  }, [map]);

  const geojson = useMemo(() => {
    if (!map) return { type: "FeatureCollection", features: [] };
    const filteredAssets =
      zoom > clusterMaxZoom ? spiderfyFeatures(assets, map, 20) : assets;

    return {
      type: "FeatureCollection" as const,
      features: filteredAssets.map((asset, index) => {
        const assetType = asset.asset_types?.[0];
        const type_id = assetType?.id ?? "NO_TYPE";
        const issuer_name = asset.issuer?.name ?? "Unknown";
        const lng = asset.coordinates?.longitude ?? 0;
        const lat = asset.coordinates?.latitude ?? 0;

        return {
          type: "Feature" as const,
          id: asset.id ?? index,
          properties: {
            id: asset.id,
            type_id,
            issuer_name,
          },
          geometry: {
            type: "Point" as const,
            coordinates: [lng, lat] as [number, number],
          },
        };
      }),
    };
  }, [assets, map, zoom]);

  useEffect(() => {
    if (!map) return;

    const handleClick = (e: MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["unclustered-point", "clusters"],
      }) as MapboxGeoJSONFeature[];

      if (!features.length) return;
      const feature = features[0];

      if (feature.layer?.id === "unclustered-point") {
        const assetId = feature.properties?.id ?? null;
        if (onAssetClick && typeof assetId === "string") {
          onAssetClick(assetId); // ✅ use external navigation
        } else {
          dispatch({ type: "SET_SELECTED_ASSET", payload: assetId });
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }

      if (
        feature.layer?.id === "clusters" &&
        feature.geometry?.type === "Point"
      ) {
        const coords = (feature.geometry as Point).coordinates;
        if (Array.isArray(coords) && coords.length === 2) {
          const clusterId = feature.properties?.cluster_id;
          const source = map.getSource("assets") as any;

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
        layers: ["unclustered-point", "clusters"],
      }) as MapboxGeoJSONFeature[];

      if (hoveredStateIdRef.current !== null) {
        map.setFeatureState(
          { source: "assets", id: hoveredStateIdRef.current },
          { hover: false }
        );
        hoveredStateIdRef.current = null;
      }
      if (hoveredClusterIdRef.current !== null) {
        map.setFeatureState(
          { source: "assets", id: hoveredClusterIdRef.current },
          { hover: false }
        );
        hoveredClusterIdRef.current = null;
      }

      if (!features.length) return;
      const feature = features[0];

      if (feature.layer?.id === "unclustered-point" && feature.id != null) {
        hoveredStateIdRef.current = feature.id;
        map.setFeatureState(
          { source: "assets", id: feature.id },
          { hover: true }
        );
      } else if (feature.layer?.id === "clusters" && feature.id != null) {
        hoveredClusterIdRef.current = feature.id;
        map.setFeatureState(
          { source: "assets", id: feature.id },
          { hover: true }
        );
      }
    };

    const handleMouseLeave = () => {
      if (hoveredStateIdRef.current !== null) {
        map.setFeatureState(
          { source: "assets", id: hoveredStateIdRef.current },
          { hover: false }
        );
        hoveredStateIdRef.current = null;
      }
      if (hoveredClusterIdRef.current !== null) {
        map.setFeatureState(
          { source: "assets", id: hoveredClusterIdRef.current },
          { hover: false }
        );
        hoveredClusterIdRef.current = null;
      }
      map.getCanvas().style.cursor = "";
    };

    const showPointer = () => {
      map.getCanvas().style.cursor = "pointer";
    };

    map.on("click", "unclustered-point", handleClick);
    map.on("click", "clusters", handleClick);
    map.on("mousemove", "unclustered-point", handleMouseMove);
    map.on("mousemove", "clusters", handleMouseMove);
    map.on("mouseleave", "unclustered-point", handleMouseLeave);
    map.on("mouseleave", "clusters", handleMouseLeave);
    map.on("mouseenter", "unclustered-point", showPointer);
    map.on("mouseenter", "clusters", showPointer);

    return () => {
      map.off("click", "unclustered-point", handleClick);
      map.off("click", "clusters", handleClick);
      map.off("mousemove", "unclustered-point", handleMouseMove);
      map.off("mousemove", "clusters", handleMouseMove);
      map.off("mouseleave", "unclustered-point", handleMouseLeave);
      map.off("mouseleave", "clusters", handleMouseLeave);
      map.off("mouseenter", "unclustered-point", showPointer);
      map.off("mouseenter", "clusters", showPointer);
    };
  }, [map, dispatch]);

  // Shared type color expression
  const typeColor: mapboxgl.Expression = [
    "match",
    ["get", "type_id"],
    5, "#F4D35E",
    1, "#4CAF50",
    6, "#00ACC1",
    7, "#BA68C8",
    4, "#FF8A65",
    8, "#90A4AE",
    "#BDBDBD",
  ];

  return (
    <Source
      id="assets"
      type="geojson"
      data={geojson as any}
      cluster={true}
      clusterMaxZoom={clusterMaxZoom}
      clusterRadius={50}
      generateId={true}
    >
      {/* ── CLUSTERS ── */}

      {/* Cluster outer glow ring */}
      <Layer
        id="cluster-glow"
        type="circle"
        source="assets"
        minzoom={3}
        filter={["has", "point_count"]}
        paint={{
          "circle-radius": [
            "step",
            ["get", "point_count"],
            26, 10, 30, 50, 36, 100, 42,
          ],
          "circle-color": "#0E7490",
          "circle-opacity": 0.08,
        }}
      />
      {/* Cluster main circle — dark slate, solid */}
      <Layer
        id="clusters"
        type="circle"
        source="assets"
        minzoom={3}
        filter={["has", "point_count"]}
        paint={{
          "circle-color": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            "#0E7490",
            "#164E63",
          ],
          "circle-radius": [
            "step",
            ["get", "point_count"],
            16, 10, 20, 50, 24, 100, 30,
          ],
          "circle-stroke-color": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            "#22D3EE",
            "rgba(255, 255, 255, 0.3)",
          ],
          "circle-stroke-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            2,
            1,
          ],
        }}
      />
      {/* Cluster count text */}
      <Layer
        id="cluster-count"
        type="symbol"
        source="assets"
        minzoom={3}
        filter={["has", "point_count"]}
        layout={{
          "text-field": "{point_count_abbreviated}",
          "text-font": ["DIN Offc Pro Bold", "Arial Unicode MS Bold"],
          "text-size": [
            "step",
            ["get", "point_count"],
            12, 10, 13, 100, 15,
          ],
        }}
        paint={{
          "text-color": "#ffffff",
        }}
      />

      {/* ── INDIVIDUAL ASSETS ── */}

      {/* Glow halo — type-colored, soft */}
      <Layer
        id="unclustered-glow"
        type="circle"
        source="assets"
        filter={["!", ["has", "point_count"]]}
        paint={{
          "circle-radius": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            18,
            isMobile ? 20 : 14,
          ],
          "circle-color": typeColor as any,
          "circle-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            0.25,
            0.12,
          ],
          "circle-blur": 0.6,
        }}
      />
      {/* Inner circle — white center with type-colored ring */}
      <Layer
        id="unclustered-point"
        type="circle"
        source="assets"
        filter={["!", ["has", "point_count"]]}
        paint={{
          "circle-color": "#ffffff",
          "circle-radius": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            8,
            isMobile ? 8 : 6,
          ],
          "circle-stroke-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            3,
            2.5,
          ],
          "circle-stroke-color": typeColor as any,
        }}
      />
      {/* Issuer label — only at higher zoom */}
      <Layer
        id="unclustered-label"
        type="symbol"
        source="assets"
        filter={["!", ["has", "point_count"]]}
        minzoom={6}
        layout={{
          "text-field": ["get", "issuer_name"],
          "text-size": 10,
          "text-anchor": "top",
          "text-offset": [0, 1.4],
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
          "text-allow-overlap": false,
          "text-padding": 4,
        }}
        paint={{
          "text-color": "#4B5563",
          "text-halo-color": "rgba(255, 255, 255, 0.9)",
          "text-halo-width": 1,
        }}
      />
    </Source>
  );
}
