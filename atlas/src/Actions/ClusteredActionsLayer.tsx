import { Source, Layer, useMap } from "react-map-gl";
import { useEffect, useRef, useMemo, useState } from "react";
import type { MapRef } from "react-map-gl";
import type { MapboxGeoJSONFeature, MapMouseEvent } from "mapbox-gl";
import type { Point } from "geojson";
import { Action } from "../shared/types";

interface Coordinates {
  longitude: number;
  latitude: number;
}

interface ClusteredActionsLayerProps {
  actions: Action[];
  onActionClick: ({
    actionId,
    lng,
    lat,
  }: {
    actionId: string;
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

interface ActionWithCoords extends Action {
  _displayCoords: Coordinates;
}

function spiderfyFeatures(
  actions: Action[],
  map: MapRef,
  pixelRadius = 5
): ActionWithCoords[] {
  const features: ActionWithCoords[] = [];
  const pixelThreshold = pixelRadius * 1.2;

  const pixelActions = actions
    .map((action) => {
      const lng = action?.location?.longitude;
      const lat = action?.location?.latitude;

      if (
        typeof lng !== "number" ||
        typeof lat !== "number" ||
        isNaN(lng) ||
        isNaN(lat)
      ) {
        return null;
      }

      const pixel = lngLatToPixel({ longitude: lng, latitude: lat }, map);
      return { action, pixel };
    })
    .filter(Boolean) as { action: Action; pixel: { x: number; y: number } }[];

  const visited = new Set<number>();

  for (let i = 0; i < pixelActions.length; i++) {
    if (visited.has(i)) continue;

    const group = [pixelActions[i]];
    visited.add(i);

    for (let j = i + 1; j < pixelActions.length; j++) {
      if (visited.has(j)) continue;

      const dx = pixelActions[i].pixel.x - pixelActions[j].pixel.x;
      const dy = pixelActions[i].pixel.y - pixelActions[j].pixel.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < pixelThreshold) {
        group.push(pixelActions[j]);
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
          ...entry.action,
          _displayCoords: {
            longitude: offset.longitude,
            latitude: offset.latitude,
          },
        });
      });
    } else {
      features.push({
        ...group[0].action,
        _displayCoords: {
          longitude: group[0].action.location!.longitude,
          latitude: group[0].action.location!.latitude,
        },
      });
    }
  }

  return features;
}

export function ClusteredActionsLayer({
  actions,
  onActionClick,
}: ClusteredActionsLayerProps) {
  const { current: map } = useMap();
  const hoveredStateIdRef = useRef<string | number | null>(null);
  const hoveredClusterIdRef = useRef<string | number | null>(null);
  const [zoom, setZoom] = useState(0);
  const clusterMaxZoom = 15;

  // Detect mobile device
  const isMobile = useMemo(() => {
    return window.innerWidth < 768;
  }, []);

  useEffect(() => {
    if (!map) return () => { };
    setZoom(map.getZoom());

    const updateZoom = () => setZoom(map.getZoom());
    map.on("zoom", updateZoom);
    return () => map.off("zoom", updateZoom);
  }, [map]);

  const geojson = useMemo(() => {
    if (!map) return { type: "FeatureCollection", features: [] };

    // Filter actions that have valid locations
    const actionsWithLocation = actions.filter(
      (action) =>
        action.location &&
        typeof action.location.longitude === "number" &&
        typeof action.location.latitude === "number"
    );

    const processedActions =
      zoom > clusterMaxZoom
        ? spiderfyFeatures(actionsWithLocation, map, 20)
        : actionsWithLocation.map((action) => ({
          ...action,
          _displayCoords: {
            longitude: action.location!.longitude,
            latitude: action.location!.latitude,
          },
        }));

    return {
      type: "FeatureCollection" as const,
      features: processedActions.map((action, index) => {
        const lng = action._displayCoords.longitude;
        const lat = action._displayCoords.latitude;

        return {
          type: "Feature" as const,
          id: index,
          properties: {
            id: action.id,
            title: action.title,
            lng,
            lat,
          },
          geometry: {
            type: "Point" as const,
            coordinates: [lng, lat] as [number, number],
          },
        };
      }),
    };
  }, [actions, map, zoom]);

  useEffect(() => {
    if (!map) return;

    const handleClick = (e: MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["unclustered-action-point", "action-clusters"],
      }) as MapboxGeoJSONFeature[];

      if (!features.length) return;
      const feature = features[0];

      if (feature.layer?.id === "unclustered-action-point") {
        const actionId = feature.properties?.id ?? null;
        onActionClick({
          actionId,
          lng: feature.properties?.lng ?? 0,
          lat: feature.properties?.lat ?? 0,
        });
      }

      if (
        feature.layer?.id === "action-clusters" &&
        feature.geometry?.type === "Point"
      ) {
        const coords = (feature.geometry as Point).coordinates;
        if (Array.isArray(coords) && coords.length === 2) {
          const clusterId = feature.properties?.cluster_id;
          const source = map.getSource("actions") as any;

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
        layers: ["unclustered-action-point", "action-clusters"],
      }) as MapboxGeoJSONFeature[];

      if (hoveredStateIdRef.current !== null) {
        map.setFeatureState(
          { source: "actions", id: hoveredStateIdRef.current },
          { hover: false }
        );
        hoveredStateIdRef.current = null;
      }
      if (hoveredClusterIdRef.current !== null) {
        map.setFeatureState(
          { source: "actions", id: hoveredClusterIdRef.current },
          { hover: false }
        );
        hoveredClusterIdRef.current = null;
      }

      if (!features.length) return;
      const feature = features[0];

      if (
        feature.layer?.id === "unclustered-action-point" &&
        feature.id != null
      ) {
        hoveredStateIdRef.current = feature.id;
        map.setFeatureState(
          { source: "actions", id: feature.id },
          { hover: true }
        );
      } else if (feature.layer?.id === "action-clusters" && feature.id != null) {
        hoveredClusterIdRef.current = feature.id;
        map.setFeatureState(
          { source: "actions", id: feature.id },
          { hover: true }
        );
      }
    };

    const handleMouseLeave = () => {
      if (hoveredStateIdRef.current !== null) {
        map.setFeatureState(
          { source: "actions", id: hoveredStateIdRef.current },
          { hover: false }
        );
        hoveredStateIdRef.current = null;
      }
      if (hoveredClusterIdRef.current !== null) {
        map.setFeatureState(
          { source: "actions", id: hoveredClusterIdRef.current },
          { hover: false }
        );
        hoveredClusterIdRef.current = null;
      }
      map.getCanvas().style.cursor = "";
    };

    const disableCursor = () => {
      map.getCanvas().style.cursor = "default";
    };

    map.on("click", "unclustered-action-point", handleClick);
    map.on("click", "action-clusters", handleClick);
    map.on("mousemove", "unclustered-action-point", handleMouseMove);
    map.on("mousemove", "action-clusters", handleMouseMove);
    map.on("mouseleave", "unclustered-action-point", handleMouseLeave);
    map.on("mouseleave", "action-clusters", handleMouseLeave);
    map.on("mouseenter", "unclustered-action-point", disableCursor);
    map.on("mouseenter", "action-clusters", disableCursor);

    return () => {
      map.off("click", "unclustered-action-point", handleClick);
      map.off("click", "action-clusters", handleClick);
      map.off("mousemove", "unclustered-action-point", handleMouseMove);
      map.off("mousemove", "action-clusters", handleMouseMove);
      map.off("mouseleave", "unclustered-action-point", handleMouseLeave);
      map.off("mouseleave", "action-clusters", handleMouseLeave);
      map.off("mouseenter", "unclustered-action-point", disableCursor);
      map.off("mouseenter", "action-clusters", disableCursor);
    };
  }, [map, onActionClick]);

  return (
    <Source
      id="actions"
      type="geojson"
      data={geojson as any}
      cluster={true}
      clusterMaxZoom={clusterMaxZoom}
      clusterRadius={50}
      generateId={true}
    >
      <Layer
        id="action-clusters"
        type="circle"
        source="actions"
        filter={["has", "point_count"]}
        paint={{
          "circle-color": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            "#ffffff",
            "#10b981", // Green color for actions
          ],
          "circle-radius": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            24,
            20,
          ],
          "circle-stroke-color": "#10b981",
          "circle-stroke-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            2,
            0,
          ],
        }}
      />
      <Layer
        id="action-cluster-count"
        type="symbol"
        source="actions"
        filter={["has", "point_count"]}
        layout={{
          "text-field": "{point_count_abbreviated}",
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 12,
        }}
      />
      <Layer
        id="unclustered-action-point"
        type="circle"
        source="actions"
        filter={["!", ["has", "point_count"]]}
        paint={{
          "circle-color": "#059669", // Darker green for individual points
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
            "case",
            ["boolean", ["feature-state", "hover"], false],
            "#10b981",
            "#fff",
          ],
        }}
      />
      <Layer
        id="unclustered-action-label"
        type="symbol"
        source="actions"
        filter={["!", ["has", "point_count"]]}
        layout={{
          "text-field": ["get", "title"],
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
