import { useState } from "react";
import clsx from "clsx";
import { X, Leaf, Users, Cube } from "@phosphor-icons/react";
import {
  useNewFiltersDispatch,
  useNewFiltersState,
} from "../../context/filters";
import type { EntityTypeKey, ActorTypeKey } from "../../context/filters/filtersContext";
import { ENTITY_COLORS } from "../../shared/components/CompositeClusterLayer";
import FiltersDropdown from "../components/FiltersDropdown";

const ENTITY_TOGGLES: { key: EntityTypeKey; label: string }[] = [
  { key: "asset", label: "Assets" },
  { key: "actor", label: "Actors" },
  { key: "action", label: "Actions" },
];

const ACTOR_TOGGLES: { key: ActorTypeKey; label: string }[] = [
  { key: "orgs", label: "Orgs" },
  { key: "agents", label: "Agents" },
];

// Bioregion stats (mock data - will be replaced with real API)
interface BioregionStats {
  id: string;
  name: string;
  eii: number;
  eiiDelta: number;
  assetCount: number;
  actorCount: number; // Includes orgs + agents
}

interface MapFilterBarProps {
  itemCount: number;
  selectedBioregion?: BioregionStats | null;
}

export function MapFilterBar({
  itemCount,
  selectedBioregion,
}: MapFilterBarProps) {
  const { activeEntityTypes, activeActorTypes, filters } = useNewFiltersState();
  const dispatch = useNewFiltersDispatch();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<
    "assetType" | "issuers" | "platforms"
  >("assetType");

  const showAssetFilters = activeEntityTypes.has("asset");
  const showActorSubfilter = activeEntityTypes.has("actor");

  const accumulateSubtypes = () => {
    const subtypes: number[] = [];
    for (const assetType of Object.values(filters.assetTypes)) {
      subtypes.push(...assetType.subtypes);
    }
    return subtypes;
  };

  const hasTypeFilter = accumulateSubtypes().length > 0;
  const hasIssuerFilter = filters.providers.length > 0;
  const hasChainFilter = filters.platforms.length > 0;

  return (
    <div className="hidden lg:block absolute top-0 left-0 right-0 z-10">
      <div className="bg-gray-900/90 backdrop-blur-sm flex items-center px-3 h-8">
        {/* Entity toggles */}
        <div className="flex items-center h-full">
          {ENTITY_TOGGLES.map((toggle, i) => {
            const active = activeEntityTypes.has(toggle.key);
            const color = ENTITY_COLORS[toggle.key];
            return (
              <div key={toggle.key} className="flex items-center h-full">
                {i > 0 && (
                  <div className="w-px h-1/3 bg-white/20 mx-0.5" />
                )}
                <button
                  onClick={() =>
                    dispatch({ type: "TOGGLE_ENTITY_TYPE", payload: toggle.key })
                  }
                  className={clsx(
                    "h-full flex items-center px-2 text-[11px] font-medium transition-colors cursor-pointer",
                    active
                      ? "text-white"
                      : "text-white/35 hover:text-white/60"
                  )}
                  style={active ? { borderBottom: `2px solid ${color.primary}` } : undefined}
                >
                  {toggle.label}
                </button>
              </div>
            );
          })}
        </div>

        {/* Actor type toggles: Orgs | Agents (additive) */}
        {showActorSubfilter && (
          <>
            <div className="w-px h-1/2 bg-white/15 mx-2" />
            <div className="flex items-center h-full bg-white/5 rounded px-1">
              {ACTOR_TOGGLES.map((toggle) => {
                const active = activeActorTypes.has(toggle.key);
                return (
                  <button
                    key={toggle.key}
                    onClick={() =>
                      dispatch({ type: "TOGGLE_ACTOR_TYPE", payload: toggle.key })
                    }
                    className={clsx(
                      "h-5 flex items-center px-2 text-[10px] font-medium rounded transition-colors cursor-pointer",
                      active
                        ? "bg-white/20 text-white"
                        : "text-white/40 hover:text-white/70"
                    )}
                  >
                    {toggle.label}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Divider between entity toggles and filter pills */}
        {showAssetFilters && (
          <>
            <div className="w-px h-1/2 bg-white/15 mx-2" />

            {/* Filter pills: Type | Issuer | Chain */}
            <div className="flex items-center h-full">
              {/* Type */}
              <button
                onClick={() => {
                  setSelectedFilter("assetType");
                  setIsDropdownOpen(selectedFilter === "assetType" ? !isDropdownOpen : true);
                }}
                className={clsx(
                  "h-full flex items-center gap-1 px-2 text-[11px] transition-colors cursor-pointer",
                  isDropdownOpen && selectedFilter === "assetType"
                    ? "text-white"
                    : "text-white/40 hover:text-white/70"
                )}
              >
                <span>{hasTypeFilter ? `Type (${accumulateSubtypes().length})` : "Type"}</span>
                {hasTypeFilter && (
                  <span
                    className="w-3 h-3 rounded-full bg-white/20 flex items-center justify-center hover:bg-red-500 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({ type: "RESET_TYPE_FILTERS" });
                    }}
                  >
                    <X size={7} className="text-white" />
                  </span>
                )}
              </button>

              <div className="w-px h-1/3 bg-white/20" />

              {/* Issuer */}
              <button
                onClick={() => {
                  setSelectedFilter("issuers");
                  setIsDropdownOpen(selectedFilter === "issuers" ? !isDropdownOpen : true);
                }}
                className={clsx(
                  "h-full flex items-center gap-1 px-2 text-[11px] transition-colors cursor-pointer",
                  isDropdownOpen && selectedFilter === "issuers"
                    ? "text-white"
                    : "text-white/40 hover:text-white/70"
                )}
              >
                <span>{hasIssuerFilter ? `Issuer (${filters.providers.length})` : "Issuer"}</span>
                {hasIssuerFilter && (
                  <span
                    className="w-3 h-3 rounded-full bg-white/20 flex items-center justify-center hover:bg-red-500 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({ type: "RESET_PROVIDER_FILTER" });
                    }}
                  >
                    <X size={7} className="text-white" />
                  </span>
                )}
              </button>

              <div className="w-px h-1/3 bg-white/20" />

              {/* Chain */}
              <button
                onClick={() => {
                  setSelectedFilter("platforms");
                  setIsDropdownOpen(selectedFilter === "platforms" ? !isDropdownOpen : true);
                }}
                className={clsx(
                  "h-full flex items-center gap-1 px-2 text-[11px] transition-colors cursor-pointer",
                  isDropdownOpen && selectedFilter === "platforms"
                    ? "text-white"
                    : "text-white/40 hover:text-white/70"
                )}
              >
                <span>{hasChainFilter ? `Chain (${filters.platforms.length})` : "Chain"}</span>
                {hasChainFilter && (
                  <span
                    className="w-3 h-3 rounded-full bg-white/20 flex items-center justify-center hover:bg-red-500 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({ type: "RESET_PLATFORM_FILTER" });
                    }}
                  >
                    <X size={7} className="text-white" />
                  </span>
                )}
              </button>
            </div>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bioregion stats (when selected) */}
        {selectedBioregion && (
          <div className="flex items-center gap-2 mr-4 px-3 py-1 bg-white/5 rounded">
            {/* EII */}
            <div className="flex items-center gap-1" title="Ecosystem Integrity Index">
              <Leaf size={12} className="text-emerald-400" />
              <span className={clsx(
                "text-[11px] font-medium",
                selectedBioregion.eii >= 0.7 ? "text-emerald-400" :
                selectedBioregion.eii >= 0.5 ? "text-yellow-400" : "text-red-400"
              )}>
                {(selectedBioregion.eii * 100).toFixed(0)}%
              </span>
              {selectedBioregion.eiiDelta !== 0 && (
                <span className={clsx(
                  "text-[9px]",
                  selectedBioregion.eiiDelta > 0 ? "text-emerald-400" : "text-red-400"
                )}>
                  {selectedBioregion.eiiDelta > 0 ? "+" : ""}{(selectedBioregion.eiiDelta * 100).toFixed(1)}%
                </span>
              )}
            </div>
            <div className="w-px h-3 bg-white/20" />
            {/* Asset count */}
            <div className="flex items-center gap-1" title="Assets">
              <Cube size={12} className="text-blue-400" />
              <span className="text-[11px] text-white/70">{selectedBioregion.assetCount}</span>
            </div>
            <div className="w-px h-3 bg-white/20" />
            {/* Actor count (orgs + agents) */}
            <div className="flex items-center gap-1" title="Actors (Orgs + Agents)">
              <Users size={12} className="text-purple-400" />
              <span className="text-[11px] text-white/70">{selectedBioregion.actorCount}</span>
            </div>
          </div>
        )}

        {/* Item count */}
        <span className="text-white/50 text-[11px] whitespace-nowrap">
          {itemCount} items
        </span>
      </div>

      {/* Dropdown renders below the bar */}
      {isDropdownOpen && (
        <FiltersDropdown
          onClose={() => setIsDropdownOpen(false)}
          openFilter={selectedFilter}
        />
      )}
    </div>
  );
}
