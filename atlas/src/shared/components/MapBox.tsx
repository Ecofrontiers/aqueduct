import { Ref, useCallback, useEffect, useRef } from "react";
import Map from "react-map-gl";
import type { MapRef } from "react-map-gl";
import clsx from "clsx";
import { MapStyleSwitch } from "./MapStyleSwitch";
import { MAP_STYLES } from "../consts";
import { MapStyles } from "../types";
import { useMapState } from "../../context/map";

// Mapbox layer ID patterns for political/admin features
const POLITICAL_LAYER_PATTERNS = [
  /^admin-/,
  /^country-label/,
  /^state-label/,
  /^settlement-/,
  /^place-/,
  /^continent-label/,
];

function setPoliticalLayersVisibility(
  map: mapboxgl.Map,
  visible: boolean
) {
  const visibility = visible ? "visible" : "none";
  const style = map.getStyle();
  if (!style?.layers) return;
  for (const layer of style.layers) {
    if (POLITICAL_LAYER_PATTERNS.some((p) => p.test(layer.id))) {
      map.setLayoutProperty(layer.id, "visibility", visibility);
    }
  }
}

interface MapBoxProps {
  children?: React.ReactNode;
  mapStyle: MapStyles;
  showMapStyleSwitch?: boolean;
  initialViewState: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
  mapRef?: Ref<MapRef>;
  projection?: mapboxgl.Projection;
  interactiveLayerIds?: string[];
  onClick?: (e: mapboxgl.MapLayerMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => void;
  onMouseMove?: (e: mapboxgl.MapLayerMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => void;
  onMouseLeave?: () => void;
  cursor?: string;
}

export const MapBox = ({
  children,
  mapStyle,
  showMapStyleSwitch = true,
  initialViewState,
  mapRef,
  projection,
  interactiveLayerIds,
  onClick,
  onMouseMove,
  onMouseLeave,
  cursor,
}: MapBoxProps): React.ReactElement => {
  if (!mapRef) {
    mapRef = useRef<MapRef>() as Ref<MapRef>;
  }

  const { showPolitical } = useMapState();

  const handleStyleData = useCallback(() => {
    const map = (mapRef as React.RefObject<MapRef>)?.current?.getMap();
    if (!map) return;
    setPoliticalLayersVisibility(map, showPolitical);
  }, [showPolitical, mapRef]);

  // Re-apply when showPolitical changes (without style reload)
  useEffect(() => {
    const map = (mapRef as React.RefObject<MapRef>)?.current?.getMap();
    if (!map) return;
    // Only apply if the style is already loaded
    if (map.isStyleLoaded()) {
      setPoliticalLayersVisibility(map, showPolitical);
    }
  }, [showPolitical, mapRef]);

  return (
    <div
      className={clsx(
        "w-full rounded-xl overflow-hidden relative",
        "map-wrapper"
      )}
    >
      {showMapStyleSwitch && (
        <div className="absolute bottom-2 right-2 z-10">
          <MapStyleSwitch />
        </div>
      )}
      <Map
        ref={mapRef as React.RefObject<MapRef>}
        mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string}
        initialViewState={initialViewState}
        mapStyle={MAP_STYLES[mapStyle]}
        onStyleData={handleStyleData}
        attributionControl={false}
        {...(projection ? { projection } : {})}
        {...(interactiveLayerIds ? { interactiveLayerIds } : {})}
        {...(onClick ? { onClick } : {})}
        {...(onMouseMove ? { onMouseMove } : {})}
        {...(onMouseLeave ? { onMouseLeave } : {})}
        {...(cursor ? { cursor } : {})}
      >
        {children}
      </Map>
    </div>
  );
};
