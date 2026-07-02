import { Source, Layer, useMap } from "react-map-gl";
import { useEffect, useRef, useMemo, useState } from "react";
import type { MapRef } from "react-map-gl";
import type { MapboxGeoJSONFeature, MapMouseEvent } from "mapbox-gl";
import type { Point } from "geojson";
import { Org } from "../types";
import { resolveOrgGeoSync } from "../../modules/intelligence/orgGeoResolution";
import type { OrgMapPosition } from "../../modules/intelligence/orgGeoResolution";
import { loadBioregionGeoJSON } from "../../modules/intelligence/bioregionIntelligence";

interface Coordinates {
  longitude: number;
  latitude: number;
}

interface ClusteredOrgsLayerProps {
  orgs: Org[];
  onOrgClick: ({
    orgId,
    lng,
    lat,
  }: {
    orgId: number;
    lng: number;
    lat: number;
  }) => void;
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

interface PositionEntry {
  position: OrgMapPosition;
  featureId: number;
}

function spiderfyPositions(
  entries: PositionEntry[],
  map: MapRef,
  pixelRadius = 5
): PositionEntry[] {
  const result: PositionEntry[] = [];
  const pixelThreshold = pixelRadius * 1.2;

  const pixelEntries = entries
    .map((entry) => {
      const lng = entry.position.longitude;
      const lat = entry.position.latitude;

      if (
        typeof lng !== "number" ||
        typeof lat !== "number" ||
        isNaN(lng) ||
        isNaN(lat)
      ) {
        return null;
      }

      const pixel = lngLatToPixel({ longitude: lng, latitude: lat }, map);
      return { entry, pixel };
    })
    .filter(Boolean) as { entry: PositionEntry; pixel: { x: number; y: number } }[];

  const visited = new Set<number>();

  for (let i = 0; i < pixelEntries.length; i++) {
    if (visited.has(i)) continue;

    const group = [pixelEntries[i]];
    visited.add(i);

    for (let j = i + 1; j < pixelEntries.length; j++) {
      if (visited.has(j)) continue;

      const dx = pixelEntries[i].pixel.x - pixelEntries[j].pixel.x;
      const dy = pixelEntries[i].pixel.y - pixelEntries[j].pixel.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < pixelThreshold) {
        group.push(pixelEntries[j]);
        visited.add(j);
      }
    }

    if (group.length > 1) {
      const center = group[0].pixel;
      group.forEach((g, idx) => {
        const angle = (idx / group.length) * Math.PI * 2;
        const x = center.x + pixelRadius * Math.cos(angle);
        const y = center.y + pixelRadius * Math.sin(angle);
        const offset = pixelToLngLat({ x, y }, map);

        result.push({
          ...g.entry,
          position: {
            ...g.entry.position,
            longitude: offset.longitude,
            latitude: offset.latitude,
          },
        });
      });
    } else {
      result.push(group[0].entry);
    }
  }

  return result;
}

export function ClusteredOrgsLayer({
  orgs,
  onOrgClick,
}: ClusteredOrgsLayerProps) {
  const { current: map } = useMap();
  const hoveredStateIdRef = useRef<string | number | null>(null);
  const hoveredClusterIdRef = useRef<string | number | null>(null);
  const [zoom, setZoom] = useState(0);
  const [bioregionGeojson, setBioregionGeojson] =
    useState<GeoJSON.FeatureCollection | null>(null);
  const clusterMaxZoom = 15;

  // Detect mobile device
  const isMobile = useMemo(() => {
    return window.innerWidth < 768;
  }, []);

  // Load bioregion GeoJSON (cached by the module)
  useEffect(() => {
    loadBioregionGeoJSON().then(setBioregionGeojson);
  }, []);

  useEffect(() => {
    if (!map) return () => {};
    setZoom(map.getZoom());

    const updateZoom = () => setZoom(map.getZoom());
    map.on("zoom", updateZoom);
    return () => map.off("zoom", updateZoom);
  }, [map]);

  // Resolve all org positions → flat list of PositionEntry
  const allEntries = useMemo((): PositionEntry[] => {
    if (!bioregionGeojson) {
      // Fallback: use org.coordinates only (same as old behavior)
      return orgs.map((org, index) => ({
        position: {
          orgId: org.id,
          longitude: org.coordinates?.longitude ?? 0,
          latitude: org.coordinates?.latitude ?? 0,
          source: "coordinates" as const,
        },
        featureId: org.id ?? index,
      }));
    }

    const entries: PositionEntry[] = [];
    for (const org of orgs) {
      const resolved = resolveOrgGeoSync(org, bioregionGeojson);
      resolved.positions.forEach((pos, posIndex) => {
        entries.push({
          position: pos,
          // Compound ID: org.id * 100 + positionIndex (unique, stable)
          featureId: org.id * 100 + posIndex,
        });
      });
    }
    return entries;
  }, [orgs, bioregionGeojson]);

  const geojson = useMemo(() => {
    if (!map) return { type: "FeatureCollection", features: [] };
    const entries =
      zoom > clusterMaxZoom ? spiderfyPositions(allEntries, map, 20) : allEntries;

    return {
      type: "FeatureCollection" as const,
      features: entries.map((entry) => {
        const org = orgs.find((o) => o.id === entry.position.orgId);
        const ecosystemType = org?.ecosystems?.join(", ") ?? "";
        const issuer_name = org?.name ?? "";
        const lng = entry.position.longitude;
        const lat = entry.position.latitude;

        return {
          type: "Feature" as const,
          id: entry.featureId,
          properties: {
            id: entry.position.orgId,
            type_id: ecosystemType,
            issuer_name,
            lng,
            lat,
            source: entry.position.source,
          },
          geometry: {
            type: "Point" as const,
            coordinates: [lng, lat] as [number, number],
          },
        };
      }),
    };
  }, [allEntries, orgs, map, zoom]);

  useEffect(() => {
    if (!map) return;

    const handleClick = (e: MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["org-unclustered-point", "org-clusters"],
      }) as MapboxGeoJSONFeature[];

      if (!features.length) return;
      const feature = features[0];

      if (feature.layer?.id === "org-unclustered-point") {
        const orgId = feature.properties?.id ?? null;
        onOrgClick({
          orgId,
          lng: feature.properties?.lng ?? 0,
          lat: feature.properties?.lat ?? 0,
        });
      }

      if (
        feature.layer?.id === "org-clusters" &&
        feature.geometry?.type === "Point"
      ) {
        const coords = (feature.geometry as Point).coordinates;
        if (Array.isArray(coords) && coords.length === 2) {
          const clusterId = feature.properties?.cluster_id;
          const source = map.getSource("orgs") as any;

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
        layers: ["org-unclustered-point", "org-clusters"],
      }) as MapboxGeoJSONFeature[];

      if (hoveredStateIdRef.current !== null) {
        map.setFeatureState(
          { source: "orgs", id: hoveredStateIdRef.current },
          { hover: false }
        );
        hoveredStateIdRef.current = null;
      }
      if (hoveredClusterIdRef.current !== null) {
        map.setFeatureState(
          { source: "orgs", id: hoveredClusterIdRef.current },
          { hover: false }
        );
        hoveredClusterIdRef.current = null;
      }

      if (!features.length) return;
      const feature = features[0];

      if (feature.layer?.id === "org-unclustered-point" && feature.id != null) {
        hoveredStateIdRef.current = feature.id;
        map.setFeatureState(
          { source: "orgs", id: feature.id },
          { hover: true }
        );
      } else if (feature.layer?.id === "org-clusters" && feature.id != null) {
        hoveredClusterIdRef.current = feature.id;
        map.setFeatureState(
          { source: "orgs", id: feature.id },
          { hover: true }
        );
      }
    };

    const handleMouseLeave = () => {
      if (hoveredStateIdRef.current !== null) {
        map.setFeatureState(
          { source: "orgs", id: hoveredStateIdRef.current },
          { hover: false }
        );
        hoveredStateIdRef.current = null;
      }
      if (hoveredClusterIdRef.current !== null) {
        map.setFeatureState(
          { source: "orgs", id: hoveredClusterIdRef.current },
          { hover: false }
        );
        hoveredClusterIdRef.current = null;
      }
      map.getCanvas().style.cursor = "";
    };

    const disableCursor = () => {
      map.getCanvas().style.cursor = "default";
    };

    map.on("click", "org-unclustered-point", handleClick);
    map.on("click", "org-clusters", handleClick);
    map.on("mousemove", "org-unclustered-point", handleMouseMove);
    map.on("mousemove", "org-clusters", handleMouseMove);
    map.on("mouseleave", "org-unclustered-point", handleMouseLeave);
    map.on("mouseleave", "org-clusters", handleMouseLeave);
    map.on("mouseenter", "org-unclustered-point", disableCursor);
    map.on("mouseenter", "org-clusters", disableCursor);

    return () => {
      map.off("click", "org-unclustered-point", handleClick);
      map.off("click", "org-clusters", handleClick);
      map.off("mousemove", "org-unclustered-point", handleMouseMove);
      map.off("mousemove", "org-clusters", handleMouseMove);
      map.off("mouseleave", "org-unclustered-point", handleMouseLeave);
      map.off("mouseleave", "org-clusters", handleMouseLeave);
      map.off("mouseenter", "org-unclustered-point", disableCursor);
      map.off("mouseenter", "org-clusters", disableCursor);
    };
  }, [map]);

  return (
    <Source
      id="orgs"
      type="geojson"
      data={geojson as any}
      cluster={true}
      clusterMaxZoom={clusterMaxZoom}
      clusterRadius={50}
      generateId={true}
    >
      <Layer
        id="org-clusters"
        type="circle"
        source="orgs"
        filter={["has", "point_count"]}
        paint={{
          "circle-color": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            "#ffffff",
            "#5eadf7",
          ],
          "circle-radius": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            24,
            20,
          ],
          "circle-stroke-color": "#5eadf7",
          "circle-stroke-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            2,
            0,
          ],
        }}
      />
      <Layer
        id="org-cluster-count"
        type="symbol"
        source="orgs"
        filter={["has", "point_count"]}
        layout={{
          "text-field": "{point_count_abbreviated}",
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 12,
        }}
      />
      <Layer
        id="org-unclustered-point"
        type="circle"
        source="orgs"
        filter={["!", ["has", "point_count"]]}
        paint={{
          "circle-color": [
            "match",
            ["get", "source"],
            "country", "#4a9ede",
            "bioregion", "#9b59b6",
            "#177fe0", // default (coordinates)
          ],
          "circle-radius": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            10,
            isMobile ? 12 : 8,
          ],
          "circle-stroke-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            2,
            1,
          ],
          "circle-stroke-color": [
            "match",
            ["get", "source"],
            "country", "#a8d4f7",
            "bioregion", "#d4a8f7",
            ["case",
              ["boolean", ["feature-state", "hover"], false],
              "#5eadf7",
              "#fff",
            ],
          ],
        }}
      />
      <Layer
        id="org-unclustered-label"
        type="symbol"
        source="orgs"
        filter={["!", ["has", "point_count"]]}
        layout={{
          "text-field": ["get", "issuer_name"],
          "text-size": 10,
          "text-anchor": "top",
          "text-offset": [0, 1.2],
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
        }}
        paint={{
          "text-color": "#000000",
        }}
      />
    </Source>
  );
}
