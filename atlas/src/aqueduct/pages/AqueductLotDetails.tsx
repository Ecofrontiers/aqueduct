import React from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Marker } from "react-map-gl";
import Header from "../../Header";
import Footer from "../../Footer";
import { MapBox } from "../../shared/components/MapBox";
import { useMapState } from "../../context/map";
import { useAqueductLots } from "../hooks/useAqueductLots";
import { LotCard } from "../components/LotCard";

/**
 * Aqueduct extended lot page — /lots/:lotId. Reuses the Atlas asset-page
 * chrome (Header, Footer, MapBox) per DESIGN-BRIEF.md §6 "maximum reuse,
 * truest to the fork framing." The Atlas base components themselves are
 * untouched; only this new page + the LotCard it renders belong to the
 * swarm layer.
 */
export default function AqueductLotDetails(): React.ReactElement {
  const { lotId } = useParams<{ lotId: string }>();
  const { mapStyle } = useMapState();
  const { lots, loading } = useAqueductLots();

  const lot = lots?.find((l) => l.aqueduct_id === lotId || l.source.platform_lot_id === lotId);

  if (loading) {
    return (
      <div className="w-svw h-svh flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!lot) {
    return (
      <>
        <Header />
        <div className="main-container pt-[100px] px-6">
          <p>Lot not found. <Link to="/" className="underline">Back to the map</Link></p>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{lot.title_redacted} · Aqueduct</title>
        <meta name="description" content={`${lot.origin.region}, ${lot.origin.country} — ${lot.variety} ${lot.process}, ${lot.quality.sca_score} SCA. Read live from EthicHub.`} />
      </Helmet>
      <Header />
      <div className="main-container">
        <div className="pt-[60px] md:pt-[80px]">
          <div className="grid lg:grid-cols-[440px_1fr] md:grid-cols-2 gap-4">
            <div>
              <LotCard lot={lot} />
            </div>
            <div>
              <MapBox
                mapStyle={mapStyle}
                initialViewState={{
                  longitude: lot.map_marker.longitude,
                  latitude: lot.map_marker.latitude,
                  zoom: 8,
                }}
              >
                <Marker longitude={lot.map_marker.longitude} latitude={lot.map_marker.latitude} anchor="center">
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: "#ffb700",
                      border: `2px solid ${lot.provenance === "LIVE" ? "#ffb700" : "#787b86"}`,
                      boxShadow: "0 0 0 4px rgba(255,183,0,0.25), 0 0 0 1px rgba(0,0,0,0.35)",
                    }}
                    title={lot.title_redacted}
                  />
                </Marker>
              </MapBox>
              <div className="text-xs mt-2 px-2" style={{ color: "#787b86" }}>
                Map pin is community-approximate ({lot.map_marker.precision}) — EthicHub does not publish plot-level
                geolocation for this lot (the EUDR gap, rendered above).
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <Footer />
          </div>
        </div>
      </div>
    </>
  );
}
