import type { MapRef } from "react-map-gl";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { useMapState } from "../context/map";
import { MapBox } from "../shared/components/MapBox";
import Header from "../Header";
import { Action } from "../shared/types";
import supabase from "../shared/helpers/supabase";
import ActionCard from "./ActionCard";
import Footer from "../Footer";
import { ClusteredActionsLayer } from "./ClusteredActionsLayer";

export default (): React.ReactElement => {
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const mapRef = useRef<MapRef>();
  const { mapStyle } = useMapState();
  const [actions, setActions] = useState<Array<Action>>([]);

  useEffect(() => {
    async function fetchActions() {
      const { error, data } = await supabase
        .from("actions_published_view")
        .select();

      if (error) {
        console.error("Error fetching actions:", error);
        return;
      }

      setActions(data as Action[]);
    }
    fetchActions();
  }, []);

  const handleMarkerClick = ({
    actionId,
    lng,
    lat,
  }: {
    actionId: string;
    lng: number;
    lat: number;
  }) => {
    setSelectedActionId(actionId);
    mapRef?.current?.flyTo({
      center: [lng, lat],
      zoom: 6,
    });
  };

  const handleActionCardClick = (action: Action) => {
    if (action.location) {
      mapRef?.current?.flyTo({
        center: [action.location.longitude, action.location.latitude],
        zoom: 6,
      });
    }
  };

  const actionsToDisplay = selectedActionId
    ? [
      actions.find((action) => action.id === selectedActionId),
      ...actions.filter((action) => action.id !== selectedActionId),
    ].filter((action) => action !== undefined)
    : actions;

  return (
    <>
      <Header />
      <div className="main-container">
        <div className={clsx("pt-[60px] md:pt-[80px]")}>
          <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-[444px_1fr] xl:grid-cols-[444px_1fr] md:gap-4">
            <div className="order-2 md:order-1 mb-20">
              {actionsToDisplay.map((action) => (
                <div key={action.id} className="mb-4">
                  <ActionCard
                    action={action}
                    selectClicked={() => handleActionCardClick(action)}
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
                  <ClusteredActionsLayer
                    actions={actions}
                    onActionClick={handleMarkerClick}
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
