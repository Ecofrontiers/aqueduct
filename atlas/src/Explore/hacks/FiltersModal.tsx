import { useState } from "react";
import { useNewFiltersDispatch, useNewFiltersState } from "../../context/filters";
import FilterSummaryMobile from "../components/FilterSummaryMobile";
import { Modal } from "../../shared/components/Modal";
import TypeSummary from "../components/TypeSummary";
import clsx from "clsx";
import { CheckboxBox } from "../../shared/components";
import { useBaseState } from "../../context/base";

export default ({ onClose }: { onClose: () => void }): JSX.Element => {
  const [openFilters, setOpenFilters] = useState({
    type: false,
    issuers: false,
    platforms: false,
  });
  const [openType, setOpenType] = useState<number>();
  const { filters } = useNewFiltersState();
  const base = useBaseState();

  if (!base.platforms.length || !base.types.length || !base.issuers.length) {
    return <div>Loading...</div>;
  }

  const dispatchFilters = useNewFiltersDispatch();

  const handleToggleTypeFilter = () => {
    setOpenFilters((prev) => ({ ...prev, type: !prev.type }));
  };

  const handleToggleIssuerFilter = () => {
    setOpenFilters((prev) => ({ ...prev, issuers: !prev.issuers }));
  };

  const handleTogglePlatformFilter = () => {
    setOpenFilters((prev) => ({ ...prev, platforms: !prev.platforms }));
  };

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

  const accumulateSubtypes = () => {
    const subtypes: number[] = [];
    for (const assetType of Object.values(filters.assetTypes)) {
      subtypes.push(...assetType.subtypes);
    }
    return subtypes;
  };

  return (
    <div className="flex flex-col h-full pb-24">
      <div className="text-2xl font-semibold mb-6">Filters</div>
      <div className="grid gap-3">
        <FilterSummaryMobile
          onClick={handleToggleTypeFilter}
          className={clsx(
            Object.keys(filters.assetTypes).length > 0 && "!border-blue-950"
          )}
          title="Type"
          value={
            accumulateSubtypes().length > 0
              ? `${accumulateSubtypes().length} selected`
              : "All"
          }
          defaultValue="All"
        />
        {openFilters.type && (
          <Modal fullScreen onClose={handleToggleTypeFilter}>
            <div className="flex flex-col h-full pb-24">
              <div className="text-2xl font-semibold mb-6">Asset Types</div>
              <div>
                {base.types.map((type) => {
                  const selected = filters.assetTypes[type.id];
                  return (
                    <div key={type.id}>
                      <TypeSummary
                        className={clsx("mb-3", selected && "!border-blue-950")}
                        onClick={() => {
                          if (!selected) {
                            dispatchFilters({
                              type: "SET_TYPE_FILTER",
                              payload: {
                                id: type.id,
                                name: type.name,
                                subtypes: type.asset_subtypes.map(
                                  (subtype) => subtype.id
                                ),
                              },
                            });
                          } else {
                            dispatchFilters({
                              type: "REMOVE_TYPE_FILTER",
                              payload: type.id,
                            });
                          }
                        }}
                        onToggleClick={(e) => {
                          e.stopPropagation();
                          setOpenType((prev) =>
                            prev === type.id ? undefined : type.id
                          );
                        }}
                        isOpen={openType === type.id}
                        title={type.name}
                        selectedCount={
                          filters.assetTypes[type.id]?.subtypes?.length
                        }
                      />
                      {openType === type.id && (
                        <div className="pl-8">
                          {type.asset_subtypes.map((subtype) => {
                            return (
                              <div
                                key={subtype.id}
                                className="flex items-center gap-2 cursor-pointer mb-4"
                                onClick={() =>
                                  handleSubtypeClick({
                                    typeId: type.id,
                                    subtypeId: subtype.id,
                                  })
                                }
                              >
                                <CheckboxBox
                                  className="flex-shrink-0"
                                  checked={filters.assetTypes[
                                    type.id
                                  ]?.subtypes.includes(subtype.id)}
                                />
                                <div>{subtype.name}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end mt-auto">
                <button
                  className="button button-gradient"
                  onClick={handleToggleTypeFilter}
                >
                  Set Asset types
                </button>
              </div>
            </div>
          </Modal>
        )}

        <FilterSummaryMobile
          onClick={handleToggleIssuerFilter}
          className={clsx(filters.providers.length > 0 && "!border-blue-950")}
          title="Issuers"
          value={
            filters.providers.length > 0
              ? `${filters.providers.length} selected`
              : "All"
          }
          defaultValue="All"
        />
        {openFilters.issuers && (
          <Modal
            fullScreen
            onClose={() =>
              setOpenFilters((prev) => ({ ...prev, issuers: false }))
            }
          >
            <div className="text-2xl font-semibold mb-6">Issuers</div>
            <div className="grid gap-4 pl-8">
              {base.issuers.map((provider) => {
                return (
                  <div
                    key={provider.id}
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => {
                      dispatchFilters({
                        type: "SET_PROVIDER_FILTER",
                        payload: provider.id,
                      });
                    }}
                  >
                    <CheckboxBox
                      checked={filters.providers.includes(provider.id)}
                      className="flex-shrink-0"
                    />
                    <div>{provider.name}</div>
                  </div>
                );
              })}
            </div>
          </Modal>
        )}
        <FilterSummaryMobile
          onClick={handleTogglePlatformFilter}
          className={clsx(filters.platforms.length > 0 && "!border-blue-950")}
          title="Chains"
          value={
            filters.platforms.length > 0
              ? `${filters.platforms.length} selected`
              : "All"
          }
          defaultValue="All"
        />
        {openFilters.platforms && (
          <Modal fullScreen onClose={handleTogglePlatformFilter}>
            <div className="text-2xl font-semibold mb-6">Chains</div>
            <div className="grid gap-4 pl-8">
              {base.platforms.map((plat) => {
                return (
                  <div
                    key={plat.id}
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => {
                      dispatchFilters({
                        type: "SET_PLATFORM_FILTER",
                        payload: plat.id,
                      });
                    }}
                  >
                    <CheckboxBox
                      checked={filters.platforms.includes(plat.id)}
                      className="flex-shrink-0"
                    />
                    <div>{plat.name}</div>
                  </div>
                );
              })}
            </div>
          </Modal>
        )}
      </div>
      <div className="flex justify-between mt-auto">
        <button
          className="button button-gray !px-8"
          onClick={() => {
            dispatchFilters({
              type: "RESET_FILTERS",
            });
          }}
        >
          Clear
        </button>

        <button className="button button-gradient !px-8" onClick={onClose}>
          Filter
        </button>
      </div>
    </div>
  );
};
