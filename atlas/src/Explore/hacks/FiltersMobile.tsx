import { useMemo, useState } from "react";
import { FunnelSimple } from "@phosphor-icons/react";
import clsx from "clsx";
import {
  useNewFiltersDispatch,
  useNewFiltersState,
} from "../../context/filters";
import { Modal } from "../../shared/components/Modal";
import FiltersModal from "./FiltersModal";
import type { EntityTypeKey } from "../../context/filters/filtersContext";
import { ENTITY_COLORS } from "../../shared/components/CompositeClusterLayer";

const ENTITY_TOGGLES: { key: EntityTypeKey; label: string }[] = [
  { key: "asset", label: "Assets" },
  { key: "actor", label: "Actors" },
  { key: "action", label: "Actions" },
];

export default (): React.ReactElement => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { filteredAssets, filters, activeEntityTypes, allOrgs, allActions } =
    useNewFiltersState();
  const dispatch = useNewFiltersDispatch();

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const actionsWithLocation = useMemo(
    () =>
      allActions.filter(
        (a) =>
          a.location &&
          typeof a.location.longitude === "number" &&
          typeof a.location.latitude === "number"
      ),
    [allActions]
  );

  const itemCount = useMemo(() => {
    let count = 0;
    if (activeEntityTypes.has("asset")) count += filteredAssets.length;
    if (activeEntityTypes.has("actor")) count += allOrgs.length;
    if (activeEntityTypes.has("action")) count += actionsWithLocation.length;
    return count;
  }, [activeEntityTypes, filteredAssets.length, allOrgs.length, actionsWithLocation.length]);

  // count the number of filters applied if any type is selected count as 1
  const filtersCount =
    (Object.keys(filters.assetTypes).length > 0 ? 1 : 0) +
    (filters.providers.length > 0 ? 1 : 0) +
    (filters.platforms.length > 0 ? 1 : 0);

  return (
    <div className="flex flex-col gap-2 py-4">
      {/* Entity type toggles */}
      <div className="flex gap-1">
        {ENTITY_TOGGLES.map((toggle) => {
          const active = activeEntityTypes.has(toggle.key);
          const color = ENTITY_COLORS[toggle.key];
          return (
            <button
              key={toggle.key}
              onClick={() =>
                dispatch({ type: "TOGGLE_ENTITY_TYPE", payload: toggle.key })
              }
              className={clsx(
                "px-3 py-1 rounded-full text-xs font-medium transition-all",
                active
                  ? "text-white"
                  : "bg-gray-200 text-gray-600"
              )}
              style={active ? { backgroundColor: color.primary } : undefined}
            >
              {toggle.label}
            </button>
          );
        })}
      </div>

      {/* Count + filter button */}
      <div className="flex justify-between">
        <div className="rounded-full h-7 px-3 flex items-center bg-blue-950 text-white text-xs">
          {itemCount} items listed
        </div>
        <div
          onClick={handleOpenModal}
          className="rounded-full h-7 px-3 flex items-center bg-white gap-2"
        >
          <FunnelSimple size={16} />
          filters
          <div className="h-[18px] w-[18px] flex items-center justify-center rounded-full text-xs bg-blue-950 text-white">
            {filtersCount}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <Modal fullScreen onClose={() => setIsModalOpen(false)}>
          <FiltersModal onClose={() => setIsModalOpen(false)} />
        </Modal>
      )}
    </div>
  );
};
