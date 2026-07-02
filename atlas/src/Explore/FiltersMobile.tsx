import { useMemo, useState } from "react";
import { FunnelSimple } from "@phosphor-icons/react";
import clsx from "clsx";
import {
  useNewFiltersDispatch,
  useNewFiltersState,
} from "../context/filters";
import { Modal } from "../shared/components/Modal";
import FiltersModal from "./FiltersModal";
import type { EntityTypeKey } from "../context/filters/filtersContext";
import { ENTITY_COLORS } from "../shared/components/CompositeClusterLayer";
import type { ActionFilters } from "./MapFilterBar";

const ENTITY_TOGGLES: { key: EntityTypeKey; label: string }[] = [
  { key: "asset", label: "Assets" },
  { key: "actor", label: "Actors" },
  { key: "action", label: "Actions" },
];

interface Props {
  actionFilters?: ActionFilters;
  onActionFiltersChange?: (filters: ActionFilters) => void;
}

export default ({ actionFilters, onActionFiltersChange }: Props): React.ReactElement => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { filteredAssets, filters, activeEntityTypes, allOrgs, allActions } =
    useNewFiltersState();
  const dispatch = useNewFiltersDispatch();

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

  const filtersCount =
    (Object.keys(filters.assetTypes).length > 0 ? 1 : 0) +
    (filters.providers.length > 0 ? 1 : 0) +
    (filters.platforms.length > 0 ? 1 : 0) +
    (actionFilters?.protocols.size ? 1 : 0) +
    (actionFilters?.sdgs.size ? 1 : 0);

  return (
    <div className="flex flex-col gap-2 py-2">
      <div className="flex items-center gap-1.5 flex-wrap">
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
                "px-3 py-1.5 min-h-[36px] rounded-full text-xs font-medium transition-all",
                active ? "text-white" : "bg-gray-200 text-gray-600"
              )}
              style={active ? { backgroundColor: color.primary } : undefined}
            >
              {toggle.label}
            </button>
          );
        })}
        <div className="flex-1" />
        <div className="rounded-full h-[36px] px-3 flex items-center bg-blue-950 text-white text-xs shrink-0">
          {itemCount}
        </div>
        <div
          onClick={() => setIsModalOpen(true)}
          className="rounded-full h-[36px] px-3 flex items-center bg-white gap-2 shrink-0 cursor-pointer"
        >
          <FunnelSimple size={16} />
          filters
          {filtersCount > 0 && (
            <div className="h-[18px] w-[18px] flex items-center justify-center rounded-full text-xs bg-blue-950 text-white">
              {filtersCount}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <Modal fullScreen onClose={() => setIsModalOpen(false)}>
          <FiltersModal
            onClose={() => setIsModalOpen(false)}
            actionFilters={actionFilters}
            onActionFiltersChange={onActionFiltersChange}
          />
        </Modal>
      )}
    </div>
  );
};
