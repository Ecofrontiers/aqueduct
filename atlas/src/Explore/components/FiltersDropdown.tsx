import { useState, useMemo } from "react";
import clsx from "clsx";
import {
  useNewFiltersDispatch,
  useNewFiltersState,
} from "../../context/filters";
import { CheckboxBox } from "../../shared/components";
import { useBaseState } from "../../context/base";
import { Check, MagnifyingGlass, SortDescending, TextAa } from "@phosphor-icons/react";
import { ChainIcon } from "../../modules/chains/components/ChainIcon";

export default ({
  openFilter,
  onClose,
  showPrimaryAssets,
  onTogglePrimaryAssets,
}: {
  openFilter: "assetType" | "issuers" | "platforms";
  onClose: () => void;
  showPrimaryAssets?: boolean;
  onTogglePrimaryAssets?: () => void;
}): React.ReactElement => {
  const { filters, allAssets } = useNewFiltersState();
  const dispatchFilters = useNewFiltersDispatch();
  const base = useBaseState();
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<"count" | "alpha">("count");

  // Asset counts per issuer and platform
  const issuerCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const asset of allAssets) {
      if (asset.issuer) {
        counts[asset.issuer.id] = (counts[asset.issuer.id] || 0) + 1;
      }
    }
    return counts;
  }, [allAssets]);

  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const asset of allAssets) {
      for (const p of asset.platforms) {
        counts[p.id] = (counts[p.id] || 0) + 1;
      }
    }
    return counts;
  }, [allAssets]);

  if (!base.platforms.length || !base.types.length || !base.issuers.length) {
    return <div>Loading...</div>;
  }

  const handleSubtypeClick = ({
    typeId,
    subtypeId,
  }: {
    typeId: number;
    subtypeId: number;
  }) => {
    const selected = filters.assetTypes[typeId]?.subtypes.includes(subtypeId);
    if (!selected) {
      dispatchFilters({
        type: "SET_SUBTYPE_FILTER",
        payload: { typeId, subtypeId },
      });
    } else {
      dispatchFilters({
        type: "REMOVE_SUBTYPE_FILTER",
        payload: { typeId, subtypeId },
      });
    }
  };

  const q = search.toLowerCase();

  return (
    <>
      {/* Click-outside overlay */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className={clsx(
          "bg-cardBackground rounded-b-lg shadow-xl",
          "relative z-50",
          "max-h-[calc(100vh-120px)] overflow-y-auto",
          openFilter === "assetType" ? "p-3" : "p-3"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {openFilter === "assetType" && (
          <div className="flex flex-col">
            {/* Flag filters + primary assets toggle */}
            <div className="flex items-center gap-2 pb-2.5 mb-2.5 border-b border-gray-200">
              {(
                [
                  { key: "prefinancing", label: "Prefinancing" },
                  { key: "pretoken", label: "Pretoken" },
                  { key: "yield_bearing", label: "Yield-bearing" },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  className="group flex items-center gap-1.5 rounded-full py-0.5 px-1 pr-2 border border-gray-200 cursor-pointer hover:border-green-400 transition-colors text-left"
                  onClick={() => {
                    if (filters.flags[key] === true) {
                      dispatchFilters({ type: "REMOVE_FLAG_FILTER", payload: key });
                    } else {
                      dispatchFilters({
                        type: "SET_FLAG_FILTER",
                        payload: { flag: key, value: true },
                      });
                    }
                  }}
                >
                  <div
                    className={clsx(
                      "rounded-full w-4 h-4 flex items-center justify-center group-hover:bg-green-400 shrink-0",
                      filters.flags[key] === true ? "bg-green-400" : "bg-gray-300"
                    )}
                  >
                    <Check size={10} className="text-white" />
                  </div>
                  <span className="text-xs text-gray-700">{label}</span>
                </button>
              ))}
              {showPrimaryAssets !== undefined && onTogglePrimaryAssets && (
                <button
                  onClick={onTogglePrimaryAssets}
                  className={clsx(
                    "group flex items-center gap-1.5 rounded-full py-0.5 px-1 pr-2 border cursor-pointer transition-colors text-left ml-auto",
                    showPrimaryAssets ? "border-green-400 bg-green-50" : "border-gray-200 hover:border-green-400"
                  )}
                  title="Show primary assets underlying second-order assets (e.g. stablecoins)"
                >
                  <div
                    className={clsx(
                      "rounded-full w-4 h-4 flex items-center justify-center shrink-0",
                      showPrimaryAssets ? "bg-green-400" : "bg-gray-300"
                    )}
                  >
                    <Check size={10} className="text-white" />
                  </div>
                  <span className="text-xs text-gray-700">Primary Assets</span>
                </button>
              )}
            </div>

            {/* Type grid */}
            <div className="grid grid-cols-[minmax(auto,1fr)_1.2fr_1.2fr] gap-x-6 gap-y-1">
              {base.types.map((assetType) => {
                const selected = filters.assetTypes[assetType.id];
                return (
                  <div key={assetType.id}>
                    <div
                      className={clsx(
                        "flex items-center gap-1.5",
                        "mb-1.5 pb-1 border-b border-gray-100",
                        "cursor-pointer hover:text-gray-600"
                      )}
                      onClick={() => {
                        if (
                          filters.providers.length === 0 &&
                          !assetType.asset_subtypes.find(
                            (item) =>
                              item?.total_asset_count &&
                              item?.total_asset_count > 0
                          )
                        ) {
                          return;
                        }
                        if (
                          filters.providers.length > 0 &&
                          !assetType.asset_subtypes.find((subtype) =>
                            subtype.issuer_counts?.find(
                              (issuer) => filters.providers.includes(issuer.issuer_id)
                            )
                          )
                        ) {
                          return;
                        }
                        if (!selected) {
                          dispatchFilters({
                            type: "SET_TYPE_FILTER",
                            payload: {
                              id: assetType.id,
                              name: assetType.name,
                              subtypes: assetType.asset_subtypes.map(
                                (subtype) => subtype.id
                              ),
                            },
                          });
                        } else {
                          dispatchFilters({
                            type: "REMOVE_TYPE_FILTER",
                            payload: assetType.id,
                          });
                        }
                      }}
                    >
                      <CheckboxBox
                        variant="small"
                        className="!border-gray-400 flex-shrink-0"
                        checked={!!filters.assetTypes[assetType.id]}
                      />
                      <div className="font-semibold text-sm">{assetType.name}</div>
                    </div>
                    {assetType.asset_subtypes.map((subtype) => (
                      <div
                        key={subtype.id}
                        className={clsx(
                          "flex items-start gap-1.5",
                          "ml-3 mb-1",
                          "cursor-pointer hover:text-gray-600"
                        )}
                        onClick={() => {
                          if (
                            filters.providers.length === 0 &&
                            subtype.total_asset_count === 0
                          ) {
                            return;
                          }
                          if (
                            filters.providers.length > 0 &&
                            !subtype.issuer_counts?.find(
                              (issuer) => filters.providers.includes(issuer.issuer_id)
                            )
                          ) {
                            return;
                          }
                          handleSubtypeClick({
                            typeId: assetType.id,
                            subtypeId: subtype.id,
                          });
                        }}
                      >
                        <CheckboxBox
                          variant="small"
                          className="!border-gray-400 flex-shrink-0 mt-px"
                          checked={filters.assetTypes[
                            assetType.id
                          ]?.subtypes.includes(subtype.id)}
                        />
                        <span
                          className={clsx(
                            "text-xs leading-snug",
                            filters.providers.length === 0 &&
                              subtype.total_asset_count === 0 &&
                              "text-gray-400",
                            filters.providers.length > 0 &&
                              !subtype.issuer_counts?.find(
                                (issuer) =>
                                  filters.providers.includes(issuer.issuer_id)
                              ) &&
                              "text-gray-400"
                          )}
                        >
                          {subtype.name}
                          <span className="text-gray-400 ml-0.5">
                            {filters.providers.length > 0
                              ? `(${subtype.issuer_counts
                                  ?.filter((issuer) => filters.providers.includes(issuer.issuer_id))
                                  .reduce((sum, issuer) => sum + (issuer.asset_count || 0), 0) || 0})`
                              : `(${subtype.total_asset_count})`}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {openFilter === "issuers" && (() => {
          const searched = q
            ? base.issuers.filter((p) => p.name.toLowerCase().includes(q))
            : base.issuers;
          const filtered = [...searched].sort((a, b) =>
            sortMode === "count"
              ? (issuerCounts[b.id] || 0) - (issuerCounts[a.id] || 0)
              : a.name.localeCompare(b.name)
          );
          return (
            <div>
              {/* Search + sort */}
              <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-1">
                  <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search issuers..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded focus:outline-none focus:border-gray-400"
                    autoFocus
                  />
                </div>
                <div className="flex items-center border border-gray-200 rounded overflow-hidden shrink-0">
                  <button
                    onClick={() => setSortMode("count")}
                    className={clsx(
                      "p-1.5 transition-colors cursor-pointer",
                      sortMode === "count" ? "bg-gray-800 text-white" : "bg-gray-50 text-gray-400 hover:text-gray-600"
                    )}
                    title="Sort by asset count"
                  >
                    <SortDescending size={14} />
                  </button>
                  <button
                    onClick={() => setSortMode("alpha")}
                    className={clsx(
                      "p-1.5 transition-colors cursor-pointer",
                      sortMode === "alpha" ? "bg-gray-800 text-white" : "bg-gray-50 text-gray-400 hover:text-gray-600"
                    )}
                    title="Sort alphabetically"
                  >
                    <TextAa size={14} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-x-3 gap-y-0.5">
                {filtered.map((provider) => {
                  const selected = filters.providers.includes(provider.id);
                  const count = issuerCounts[provider.id] || 0;
                  return (
                    <div
                      key={provider.id}
                      className={clsx(
                        "flex items-center gap-1.5 py-1 px-1.5 rounded",
                        "cursor-pointer hover:bg-gray-50 transition-colors",
                        selected && "bg-primary-50"
                      )}
                      onClick={() => {
                        dispatchFilters({
                          type: "SET_PROVIDER_FILTER",
                          payload: provider.id,
                        });
                      }}
                    >
                      <CheckboxBox
                        variant="small"
                        className="!border-gray-400 flex-shrink-0"
                        checked={selected}
                      />
                      <span className="text-xs text-gray-800 truncate">{provider.name}</span>
                      <span className="text-[10px] text-gray-400 ml-auto shrink-0">{count}</span>
                    </div>
                  );
                })}
              </div>
              {q && filtered.length === 0 && (
                <div className="text-xs text-gray-400 text-center py-3">No issuers match "{search}"</div>
              )}
            </div>
          );
        })()}

        {openFilter === "platforms" && (() => {
          const searched = q
            ? base.platforms.filter((p) => p.name.toLowerCase().includes(q))
            : base.platforms;
          const filtered = [...searched].sort((a, b) =>
            sortMode === "count"
              ? (platformCounts[b.id] || 0) - (platformCounts[a.id] || 0)
              : a.name.localeCompare(b.name)
          );
          return (
            <div>
              {/* Search + sort */}
              <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-1">
                  <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search chains..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded focus:outline-none focus:border-gray-400"
                    autoFocus
                  />
                </div>
                <div className="flex items-center border border-gray-200 rounded overflow-hidden shrink-0">
                  <button
                    onClick={() => setSortMode("count")}
                    className={clsx(
                      "p-1.5 transition-colors cursor-pointer",
                      sortMode === "count" ? "bg-gray-800 text-white" : "bg-gray-50 text-gray-400 hover:text-gray-600"
                    )}
                    title="Sort by asset count"
                  >
                    <SortDescending size={14} />
                  </button>
                  <button
                    onClick={() => setSortMode("alpha")}
                    className={clsx(
                      "p-1.5 transition-colors cursor-pointer",
                      sortMode === "alpha" ? "bg-gray-800 text-white" : "bg-gray-50 text-gray-400 hover:text-gray-600"
                    )}
                    title="Sort alphabetically"
                  >
                    <TextAa size={14} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-x-3 gap-y-0.5">
                {filtered.map((plat) => {
                  const selected = filters.platforms.includes(plat.id);
                  const count = platformCounts[plat.id] || 0;
                  return (
                    <div
                      key={plat.id}
                      className={clsx(
                        "flex items-center gap-2 py-1.5 px-1.5 rounded",
                        "cursor-pointer hover:bg-gray-50 transition-colors",
                        selected && "bg-primary-50"
                      )}
                      onClick={() => {
                        dispatchFilters({
                          type: "SET_PLATFORM_FILTER",
                          payload: plat.id,
                        });
                      }}
                    >
                      <ChainIcon chainId={plat.id} chainName={plat.name} size={14} />
                      <span className={clsx(
                        "text-xs truncate",
                        selected ? "text-gray-900 font-medium" : "text-gray-700"
                      )}>
                        {plat.name}
                      </span>
                      <span className="text-[10px] text-gray-400 ml-auto shrink-0">{count}</span>
                    </div>
                  );
                })}
              </div>
              {q && filtered.length === 0 && (
                <div className="text-xs text-gray-400 text-center py-3">No chains match "{search}"</div>
              )}
            </div>
          );
        })()}
      </div>
    </>
  );
};
