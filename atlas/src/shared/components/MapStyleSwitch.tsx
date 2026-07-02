import clsx from "clsx";
import { useMapDispatch, useMapState } from "../../context/map";
import { MapStyles } from "../types";
import { MapTrifold, Mountains, GlobeHemisphereWest, Signpost } from "@phosphor-icons/react";

const STYLE_ICONS: { key: MapStyles; icon: typeof MapTrifold; label: string }[] = [
  { key: "map", icon: MapTrifold, label: "Map" },
  { key: "terrain", icon: Mountains, label: "Terrain" },
  { key: "satellite", icon: GlobeHemisphereWest, label: "Satellite" },
];

export const MapStyleSwitch = (): React.ReactElement => {
  const dispatch = useMapDispatch();
  const { mapStyle, showPolitical } = useMapState();

  return (
    <div className="flex items-center gap-0.5 bg-white/80 backdrop-blur-sm rounded-md p-0.5 shadow-sm">
      {STYLE_ICONS.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          title={label}
          onClick={() =>
            dispatch({ type: "SET_MAP_STYLE", payload: key })
          }
          className={clsx(
            "w-7 h-7 flex items-center justify-center rounded cursor-pointer transition-all",
            mapStyle === key
              ? "bg-primary-100 text-gray-800"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          )}
        >
          <Icon size={16} weight={mapStyle === key ? "fill" : "regular"} />
        </button>
      ))}
      <div className="w-px h-4 bg-gray-300 mx-0.5" />
      <button
        title="Borders & labels"
        onClick={() =>
          dispatch({ type: "SET_SHOW_POLITICAL", payload: !showPolitical })
        }
        className={clsx(
          "w-7 h-7 flex items-center justify-center rounded cursor-pointer transition-all",
          showPolitical
            ? "bg-primary-100 text-gray-800"
            : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        )}
      >
        <Signpost size={16} weight={showPolitical ? "fill" : "regular"} />
      </button>
    </div>
  );
};
