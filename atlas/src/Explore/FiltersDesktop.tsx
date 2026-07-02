import { useState } from "react";
import clsx from "clsx";
import FiltersDropdown from "./components/FiltersDropdown";
import { useNewFiltersDispatch, useNewFiltersState } from "../context/filters";
import { X } from "@phosphor-icons/react";

export default (): React.ReactElement => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<
    "assetType" | "issuers" | "platforms"
  >("assetType");
  const { filters } = useNewFiltersState();
  const dispatchFilters = useNewFiltersDispatch();

  const accumulateSubtypes = () => {
    const subtypes: number[] = [];
    for (const assetType of Object.values(filters.assetTypes)) {
      subtypes.push(...assetType.subtypes);
    }
    return subtypes;
  };

  return (
    <div>
      <div
        className={clsx(
          "flex gap-2 h-8 relative",
          "rounded-lg p-0.5"
        )}
      >
        <div className="relative">
          {accumulateSubtypes().length > 0 && (
            <div
              className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-gray-600 flex items-center justify-center
                cursor-pointer hover:bg-red-500 transition-all"
              onClick={(e) => {
                e.stopPropagation();
                dispatchFilters({ type: "RESET_TYPE_FILTERS" });
              }}
            >
              <X size={10} color="white" />
            </div>
          )}
          <div
            className={clsx(
              "flex items-center justify-center rounded-md px-3 text-xs cursor-pointer",
              "border border-white/20 text-gray-400 hover:border-white/40 hover:text-gray-200 transition-all h-full"
            )}
            onClick={() => {
              setSelectedFilter("assetType");
              setIsDropdownOpen(!isDropdownOpen);
            }}
          >
            {accumulateSubtypes().length === 0 ? (
              <div>Type</div>
            ) : (
              <div>Type ({accumulateSubtypes().length} selected)</div>
            )}
          </div>
        </div>

        <div className="relative">
          {filters.providers.length > 0 && (
            <div
              className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-gray-600 flex items-center justify-center
                cursor-pointer hover:bg-red-500 transition-all"
              onClick={(e) => {
                e.stopPropagation();
                dispatchFilters({ type: "RESET_PROVIDER_FILTER" });
              }}
            >
              <X size={10} color="white" />
            </div>
          )}
          <div
            className={clsx(
              "flex items-center justify-center rounded-md px-3 text-xs cursor-pointer",
              "border border-white/20 text-gray-400 hover:border-white/40 hover:text-gray-200 transition-all h-full"
            )}
            onClick={() => {
              setSelectedFilter("issuers");
              setIsDropdownOpen(!isDropdownOpen);
            }}
          >
            {filters.providers.length > 0
              ? `Issuer (${filters.providers.length})`
              : "Issuer"}
          </div>
        </div>

        <div className="relative">
          {filters.platforms.length > 0 && (
            <div
              className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-gray-600 flex items-center justify-center
                cursor-pointer hover:bg-red-500 transition-all"
              onClick={(e) => {
                e.stopPropagation();
                dispatchFilters({ type: "RESET_PLATFORM_FILTER" });
              }}
            >
              <X size={10} color="white" />
            </div>
          )}
          <div
            className={clsx(
              "flex items-center justify-center rounded-md px-3 text-xs cursor-pointer",
              "border border-white/20 text-gray-400 hover:border-white/40 hover:text-gray-200 transition-all h-full"
            )}
            onClick={() => {
              setSelectedFilter("platforms");
              setIsDropdownOpen(!isDropdownOpen);
            }}
          >
            {filters.platforms.length > 0
              ? `Chain (${filters.platforms.length})`
              : "Chain"}
          </div>
        </div>

        {isDropdownOpen && (
          <FiltersDropdown
            onClose={() => setIsDropdownOpen(false)}
            openFilter={selectedFilter}
          />
        )}
      </div>
    </div>
  );
};
