import type { MapRef } from "react-map-gl";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { useMapState } from "../context/map";
import { MapBox } from "../shared/components/MapBox";
import Header from "../Header";
import { Org } from "../shared/types";
import supabase from "../shared/helpers/supabase";
import OrgCard from "./OrgCard";
import Footer from "../Footer";
import { ClusteredOrgsLayer } from "../shared/components/ClusteredOrgsLayer";

export default (): React.ReactElement => {
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const mapRef = useRef<MapRef>();
  const { mapStyle } = useMapState();
  const [orgs, setOrgs] = useState<Array<Org>>([]);

  useEffect(() => {
    async function fetchOrgs() {
      const { error, data } = await supabase
        .from("orgs_published_view")
        .select();

      if (error) {
        console.error("Error fetching orgs:", error);
        return;
      }

      setOrgs(data as Org[]);
    }
    fetchOrgs();
  }, []);

  const handleMarkerClick = ({
    orgId,
    lng,
    lat,
  }: {
    orgId: number;
    lng: number;
    lat: number;
  }) => {
    setSelectedOrgId(orgId);
    mapRef?.current?.flyTo({
      center: [lng, lat],
      zoom: 6,
    });
  };

  const handleOrgCardClick = (org: Org) => {
    mapRef?.current?.flyTo({
      center: [org?.coordinates?.longitude, org?.coordinates?.latitude],
      zoom: 6,
    });
  };

  const orgsToDisplay = selectedOrgId
    ? [
        orgs.find((org) => org.id === selectedOrgId),
        ...orgs.filter((org) => org.id !== selectedOrgId),
      ].filter((org) => org !== undefined)
    : orgs;

  return (
    <>
      <Header />
      <div className="main-container">
        <div className={clsx("pt-[60px] lg:pt-[80px] md:pt-[80px]")}>
          <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-[444px_1fr] xl:grid-cols-[444px_1fr] md:gap-4">
            <div className="order-2 md:order-1 mb-20">
              {orgsToDisplay.map((org) => (
                <div key={org.id} className="mb-4">
                  <OrgCard
                    org={org}
                    selectClicked={() => handleOrgCardClick(org)}
                  />
                </div>
              ))}
            </div>
            <div className="relative order-1 md:order-2 mb-4 md:mb-0">
              <div
                className={clsx(
                  "w-full rounded-xl overflow-hidden",
                  "map-wrapper-orgs",
                  "md:fixed md:w-[calc(50vw-32px)]",
                  "md:h-[calc(100vh-80px)] md:top-[80px] lg:w-[calc(100vw-507px)]"
                )}
              >
                <MapBox
                  mapStyle={mapStyle}
                  initialViewState={{
                    longitude: 15,
                    latitude: 30,
                    zoom: 1.6,
                  }}
                  showMapStyleSwitch={true}
                  mapRef={mapRef as React.RefObject<MapRef>}
                >
                  <ClusteredOrgsLayer
                    orgs={orgs}
                    onOrgClick={handleMarkerClick}
                  />
                </MapBox>
                <div
                  className={`hidden lg:block w-[100vw] fixed left-0 bottom-0 z-50 bg-background pr-4 h-[44px]`}
                >
                  <Footer />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
