import React, { useEffect, useMemo } from "react";
import { Marker, Source, Layer, useMap } from "react-map-gl";
import { useNavigate } from "react-router-dom";
import { useAqueductLots } from "../hooks/useAqueductLots";
import { getEconomy } from "../sim/economy.mjs";

const LOT_COLOR = "#b45309";

/**
 * Aqueduct lot map presence, two tiers:
 *  - the real EthicHub reads: DOM markers, LIVE second-ring convention;
 *  - the seeded SIM economy (~1.2k lots): a clustered GeoJSON circle layer
 *    (DOM markers do not scale to thousands). Circle radius ∝ lot weight —
 *    quantity encodes size, per the network brief.
 * Click an unclustered SIM lot to open its detail page; clusters zoom in.
 */
export function AqueductLotsLayer(): React.ReactElement | null {
  const { lots } = useAqueductLots({ liveRefetch: false });
  const navigate = useNavigate();
  const { current: map } = useMap();

  const simGeojson = useMemo(() => {
    const economy = getEconomy();
    return {
      type: "FeatureCollection" as const,
      features: economy.lots.map(
        (l: { aqueduct_id: string; weight_kg: number; commodity: string; title_redacted: string; map_marker: { longitude: number; latitude: number } }) => ({
          type: "Feature" as const,
          properties: { lotId: l.aqueduct_id, weight: l.weight_kg, commodity: l.commodity, title: l.title_redacted },
          geometry: { type: "Point" as const, coordinates: [l.map_marker.longitude, l.map_marker.latitude] },
        })
      ),
    };
  }, []);

  // Click + cursor wiring for the SIM circle layers.
  useEffect(() => {
    if (!map) return;
    const mapbox = map.getMap();
    // mapbox-gl's layer event types don't flow through react-map-gl's useMap
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const onLotClick = (e: any) => {
      const lotId = e.features?.[0]?.properties?.lotId;
      if (lotId) navigate(`/lots/${lotId}`);
    };
    const onClusterClick = (e: any) => {
      const coords = e.features?.[0]?.geometry?.coordinates;
      if (coords) mapbox.easeTo({ center: coords, zoom: mapbox.getZoom() + 2, duration: 500 });
    };
    /* eslint-enable @typescript-eslint/no-explicit-any */
    const enter = () => (mapbox.getCanvas().style.cursor = "pointer");
    const leave = () => (mapbox.getCanvas().style.cursor = "");
    mapbox.on("click", "aq-sim-lots-circle", onLotClick);
    mapbox.on("click", "aq-sim-lots-clusters", onClusterClick);
    for (const layer of ["aq-sim-lots-circle", "aq-sim-lots-clusters"]) {
      mapbox.on("mouseenter", layer, enter);
      mapbox.on("mouseleave", layer, leave);
    }
    return () => {
      mapbox.off("click", "aq-sim-lots-circle", onLotClick);
      mapbox.off("click", "aq-sim-lots-clusters", onClusterClick);
      for (const layer of ["aq-sim-lots-circle", "aq-sim-lots-clusters"]) {
        mapbox.off("mouseenter", layer, enter);
        mapbox.off("mouseleave", layer, leave);
      }
    };
  }, [map, navigate]);

  return (
    <>
      {/* ── SIM economy lots: clustered circles ── */}
      <Source
        id="aq-sim-lots"
        type="geojson"
        data={simGeojson}
        cluster={true}
        clusterRadius={42}
        clusterMaxZoom={7}
      >
        <Layer
          id="aq-sim-lots-clusters"
          type="circle"
          filter={["has", "point_count"]}
          paint={{
            "circle-color": "#ffffff",
            "circle-radius": ["interpolate", ["linear"], ["get", "point_count"], 2, 10, 40, 16, 120, 22],
            "circle-stroke-width": 2.5,
            "circle-stroke-color": LOT_COLOR,
            "circle-opacity": 0.92,
          }}
        />
        <Layer
          id="aq-sim-lots-cluster-count"
          type="symbol"
          filter={["has", "point_count"]}
          layout={{
            "text-field": ["get", "point_count_abbreviated"],
            "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
            "text-size": 11,
          }}
          paint={{ "text-color": LOT_COLOR }}
        />
        <Layer
          id="aq-sim-lots-circle"
          type="circle"
          filter={["!", ["has", "point_count"]]}
          paint={{
            "circle-color": LOT_COLOR,
            "circle-radius": ["interpolate", ["linear"], ["get", "weight"], 300, 3, 2400, 6.5],
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#ffffff",
            "circle-opacity": 0.85,
          }}
        />
      </Source>

      {/* ── Real EthicHub reads: DOM markers with the LIVE ring ── */}
      {(lots ?? []).map((lot) => (
        <Marker
          key={lot.aqueduct_id}
          longitude={lot.map_marker.longitude}
          latitude={lot.map_marker.latitude}
          anchor="center"
          onClick={(e) => {
            e.originalEvent?.stopPropagation();
            navigate(`/lots/${lot.aqueduct_id}`);
          }}
        >
          <div
            title={`${lot.producer.initials} / ${lot.origin.region} — ${lot.variety} ${lot.process} — ${lot.quality.sca_score} SCA (${lot.provenance ?? "SNAPSHOT"})`}
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: LOT_COLOR,
              border: "2px solid #ffffff",
              boxShadow: lot.provenance === "LIVE" ? `0 0 0 2px ${LOT_COLOR}` : "0 1px 2px rgba(0,0,0,0.25)",
              cursor: "pointer",
            }}
          />
        </Marker>
      ))}
    </>
  );
}
