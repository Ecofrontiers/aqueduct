import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { MapBox } from "../shared/components/MapBox";
import { useMapState } from "../context/map";
import Footer from "../Footer";
import Header from "../Header";
import { useSupabaseItemById } from "../shared/hooks/useSupabaseItemById";
import { Org } from "../shared/types";
import OrgCard from "./OrgCard";
import React, { useEffect, useState } from "react";
import { Marker } from "react-map-gl";
import { resolveOrgGeoSync } from "../modules/intelligence/orgGeoResolution";
import type { ResolvedOrgGeo } from "../modules/intelligence/orgGeoResolution";
import { loadBioregionGeoJSON } from "../modules/intelligence/bioregionIntelligence";

export default (): React.ReactElement => {
  const { id } = useParams<{ id: string }>();
  const { mapStyle } = useMapState();
  const [resolvedGeo, setResolvedGeo] = useState<ResolvedOrgGeo | null>(null);

  const { item: org } = useSupabaseItemById<Org>("orgs_published_view", id);

  useEffect(() => {
    if (!org) return;
    loadBioregionGeoJSON().then((geojson) => {
      setResolvedGeo(resolveOrgGeoSync(org, geojson));
    });
  }, [org]);

  if (!org) {
    return (
      <div className="w-svw h-svh flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  const positions = resolvedGeo?.positions ?? [];
  const primary = resolvedGeo?.primaryPosition;
  const hasMultiplePositions = positions.length > 1;

  // Initial view: center on primary position, zoom out if multiple positions
  const initialLng = primary?.longitude ?? org.coordinates.longitude;
  const initialLat = primary?.latitude ?? org.coordinates.latitude;
  const initialZoom = hasMultiplePositions ? 3 : 5;

  // Marker color by source
  const markerColor = (source: string): string => {
    switch (source) {
      case "country": return "#4a9ede";
      case "bioregion": return "#9b59b6";
      default: return "#177fe0";
    }
  };

  return (
    <>
      <Helmet>
        <title>{org.name}</title>
        <meta
          name="description"
          content={`${org.description.substring(0, 160)}...`}
        />
      </Helmet>
      <Header />
      <div className="main-container">
        <div className="pt-[60px] md:pt-[80px]">
          <div className="grid lg:grid-cols-[440px_1fr] md:grid-cols-2 gap-4">
            <div>
              <OrgCard org={org} selectClicked={() => {}} />
            </div>
            <div>
              <MapBox
                mapStyle={mapStyle}
                initialViewState={{
                  longitude: initialLng,
                  latitude: initialLat,
                  zoom: initialZoom,
                }}
              >
                {positions.length > 0
                  ? positions.map((pos, i) => (
                      <Marker
                        key={`${pos.orgId}-${pos.source}-${i}`}
                        latitude={pos.latitude}
                        longitude={pos.longitude}
                        color={markerColor(pos.source)}
                      />
                    ))
                  : (
                      <Marker
                        key={org.id}
                        latitude={org.coordinates.latitude}
                        longitude={org.coordinates.longitude}
                      />
                    )
                }
              </MapBox>
            </div>
          </div>
          <div className="hidden md:block">
            <Footer />
          </div>
        </div>
      </div>
    </>
  );
};
