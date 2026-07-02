import { useMemo, useState } from "react";
import { useNewFiltersDispatch, useNewFiltersState } from "../context/filters";
import FilterSummaryMobile from "./components/FilterSummaryMobile";
import { Modal } from "../shared/components/Modal";
import TypeSummary from "./components/TypeSummary";
import clsx from "clsx";
import { CheckboxBox } from "../shared/components";
import { useBaseState } from "../context/base";
import type { EntityTypeKey, ActorTypeKey } from "../context/filters/filtersContext";
import { ENTITY_COLORS } from "../shared/components/CompositeClusterLayer";
import { SDG_COLORS } from "../shared/consts/sdg";
import { ProtocolIcon } from "../modules/chains/components/ProtocolIcon";
import type { ActionFilters } from "./MapFilterBar";

const ACTOR_TOGGLES: { key: ActorTypeKey; label: string }[] = [
  { key: "orgs", label: "Orgs" },
  { key: "agents", label: "Agents" },
];

const ALL_SDGS: { code: string; title: string }[] = [
  { code: "1", title: "No Poverty" },
  { code: "2", title: "Zero Hunger" },
  { code: "3", title: "Good Health and Well-being" },
  { code: "4", title: "Quality Education" },
  { code: "5", title: "Gender Equality" },
  { code: "6", title: "Clean Water and Sanitation" },
  { code: "7", title: "Affordable and Clean Energy" },
  { code: "8", title: "Decent Work and Economic Growth" },
  { code: "9", title: "Industry, Innovation and Infrastructure" },
  { code: "10", title: "Reduced Inequalities" },
  { code: "11", title: "Sustainable Cities and Communities" },
  { code: "12", title: "Responsible Consumption and Production" },
  { code: "13", title: "Climate Action" },
  { code: "14", title: "Life Below Water" },
  { code: "15", title: "Life on Land" },
  { code: "16", title: "Peace, Justice and Strong Institutions" },
  { code: "17", title: "Partnerships for the Goals" },
];

interface Props {
  onClose: () => void;
  actionFilters?: ActionFilters;
  onActionFiltersChange?: (filters: ActionFilters) => void;
}

export default ({ onClose, actionFilters, onActionFiltersChange }: Props): JSX.Element => {
  const { filters, activeEntityTypes, activeActorTypes, allActions } = useNewFiltersState();
  const base = useBaseState();
  const dispatchFilters = useNewFiltersDispatch();

  const activeEntities: EntityTypeKey[] = [];
  if (activeEntityTypes.has("asset")) activeEntities.push("asset");
  if (activeEntityTypes.has("action")) activeEntities.push("action");
  if (activeEntityTypes.has("actor")) activeEntities.push("actor");

  const [activeFilterTab, setActiveFilterTab] = useState<EntityTypeKey>(activeEntities[0] || "asset");

  const [openFilters, setOpenFilters] = useState({
    type: false,
    issuers: false,
    platforms: false,
  });
  const [openType, setOpenType] = useState<number>();

  // Build available protocols from actions
  const availableProtocols = useMemo(() => {
    const map = new Map<string, { name: string; color: string | null }>();
    for (const action of allActions) {
      for (const proof of action.proofs) {
        if (!map.has(proof.protocol.id)) {
          map.set(proof.protocol.id, { name: proof.protocol.name, color: proof.protocol.color });
        }
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].name.localeCompare(b[1].name));
  }, [allActions]);

  // Build available SDGs from actions
  const availableSdgs = useMemo(() => {
    const codes = new Set<string>();
    for (const action of allActions) {
      for (const sdg of action.sdg_outcomes) codes.add(sdg.code);
    }
    return ALL_SDGS.filter((s) => codes.has(s.code));
  }, [allActions]);

  if (!base.platforms.length || !base.types.length || !base.issuers.length) {
    return <div>Loading...</div>;
  }

  const handleSubtypeClick = ({ typeId, subtypeId }: { typeId: number; subtypeId: number }) => {
    const selected = filters.assetTypes[typeId]?.subtypes.includes(subtypeId);
    if (!selected) {
      dispatchFilters({ type: "SET_SUBTYPE_FILTER", payload: { typeId, subtypeId } });
    } else {
      dispatchFilters({ type: "REMOVE_SUBTYPE_FILTER", payload: { typeId, subtypeId } });
    }
  };

  const accumulateSubtypes = () => {
    const subtypes: number[] = [];
    for (const assetType of Object.values(filters.assetTypes)) subtypes.push(...assetType.subtypes);
    return subtypes;
  };

  const toggleProtocol = (id: string) => {
    if (!actionFilters || !onActionFiltersChange) return;
    const next = new Set(actionFilters.protocols);
    if (next.has(id)) next.delete(id); else next.add(id);
    onActionFiltersChange({ ...actionFilters, protocols: next });
  };

  const toggleSdg = (code: string) => {
    if (!actionFilters || !onActionFiltersChange) return;
    const next = new Set(actionFilters.sdgs);
    if (next.has(code)) next.delete(code); else next.add(code);
    onActionFiltersChange({ ...actionFilters, sdgs: next });
  };

  const LABELS: Record<EntityTypeKey, string> = { asset: "Assets", action: "Actions", actor: "Actors" };

  return (
    <div className="flex flex-col h-full pb-24">
      <div className="text-2xl font-semibold mb-4">Filters</div>

      {/* Entity nav pills */}
      {activeEntities.length > 1 && (
        <div className="flex gap-2 mb-5">
          {activeEntities.map((key) => {
            const color = ENTITY_COLORS[key];
            const selected = activeFilterTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveFilterTab(key)}
                className={clsx(
                  "flex-1 py-2.5 min-h-[44px] rounded-full text-sm font-medium transition-all text-center",
                  selected ? "text-white" : "bg-gray-100 text-gray-500"
                )}
                style={selected ? { backgroundColor: color.primary } : undefined}
              >
                {LABELS[key]}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid gap-3 overflow-y-auto flex-1">
        {/* ── Asset filters ── */}
        {activeFilterTab === "asset" && (
          <>
            <FilterSummaryMobile
              onClick={() => setOpenFilters((p) => ({ ...p, type: !p.type }))}
              className={clsx(Object.keys(filters.assetTypes).length > 0 && "!border-blue-950")}
              title="Type"
              value={accumulateSubtypes().length > 0 ? `${accumulateSubtypes().length} selected` : "All"}
              defaultValue="All"
            />
            {openFilters.type && (
              <Modal fullScreen onClose={() => setOpenFilters((p) => ({ ...p, type: false }))}>
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
                                dispatchFilters({ type: "SET_TYPE_FILTER", payload: { id: type.id, name: type.name, subtypes: type.asset_subtypes.map((s) => s.id) } });
                              } else {
                                dispatchFilters({ type: "REMOVE_TYPE_FILTER", payload: type.id });
                              }
                            }}
                            onToggleClick={(e) => { e.stopPropagation(); setOpenType((prev) => prev === type.id ? undefined : type.id); }}
                            isOpen={openType === type.id}
                            title={type.name}
                            selectedCount={filters.assetTypes[type.id]?.subtypes?.length}
                          />
                          {openType === type.id && (
                            <div className="pl-8">
                              {type.asset_subtypes.map((subtype) => (
                                <div key={subtype.id} className="flex items-center gap-2 cursor-pointer mb-4" onClick={() => handleSubtypeClick({ typeId: type.id, subtypeId: subtype.id })}>
                                  <CheckboxBox className="flex-shrink-0" checked={filters.assetTypes[type.id]?.subtypes.includes(subtype.id)} />
                                  <div>{subtype.name}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-end mt-auto">
                    <button className="button button-gradient" onClick={() => setOpenFilters((p) => ({ ...p, type: false }))}>Done</button>
                  </div>
                </div>
              </Modal>
            )}

            <FilterSummaryMobile
              onClick={() => setOpenFilters((p) => ({ ...p, issuers: !p.issuers }))}
              className={clsx(filters.providers.length > 0 && "!border-blue-950")}
              title="Issuers"
              value={filters.providers.length > 0 ? `${filters.providers.length} selected` : "All"}
              defaultValue="All"
            />
            {openFilters.issuers && (
              <Modal fullScreen onClose={() => setOpenFilters((p) => ({ ...p, issuers: false }))}>
                <div className="text-2xl font-semibold mb-6">Issuers</div>
                <div className="grid gap-4 pl-8">
                  {base.issuers.map((provider) => (
                    <div key={provider.id} className="flex items-center gap-2 cursor-pointer" onClick={() => dispatchFilters({ type: "SET_PROVIDER_FILTER", payload: provider.id })}>
                      <CheckboxBox checked={filters.providers.includes(provider.id)} className="flex-shrink-0" />
                      <div>{provider.name}</div>
                    </div>
                  ))}
                </div>
              </Modal>
            )}

            <FilterSummaryMobile
              onClick={() => setOpenFilters((p) => ({ ...p, platforms: !p.platforms }))}
              className={clsx(filters.platforms.length > 0 && "!border-blue-950")}
              title="Chains"
              value={filters.platforms.length > 0 ? `${filters.platforms.length} selected` : "All"}
              defaultValue="All"
            />
            {openFilters.platforms && (
              <Modal fullScreen onClose={() => setOpenFilters((p) => ({ ...p, platforms: false }))}>
                <div className="text-2xl font-semibold mb-6">Chains</div>
                <div className="grid gap-4 pl-8">
                  {base.platforms.map((plat) => (
                    <div key={plat.id} className="flex items-center gap-2 cursor-pointer" onClick={() => dispatchFilters({ type: "SET_PLATFORM_FILTER", payload: plat.id })}>
                      <CheckboxBox checked={filters.platforms.includes(plat.id)} className="flex-shrink-0" />
                      <div>{plat.name}</div>
                    </div>
                  ))}
                </div>
              </Modal>
            )}
          </>
        )}

        {/* ── Action filters (Protocol / SDG) ── */}
        {activeFilterTab === "action" && actionFilters && (
          <>
            {/* Protocols — exclusion filter (checked = visible, unchecked = hidden) */}
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Protocol</div>
            <div className="grid gap-1">
              {availableProtocols.map(([id, proto]) => {
                const excluded = actionFilters.protocols.has(id);
                const active = !excluded;
                return (
                  <div
                    key={id}
                    onClick={() => toggleProtocol(id)}
                    className={clsx(
                      "flex items-center gap-3 py-3 px-3 rounded cursor-pointer transition-colors min-h-[44px]",
                      active ? "bg-emerald-50" : "bg-gray-50"
                    )}
                  >
                    <ProtocolIcon protocolId={id} protocolName={proto.name} size={18} />
                    <span className={clsx("text-sm", active ? "text-emerald-700 font-medium" : "text-gray-400 line-through")}>
                      {proto.name}
                    </span>
                    {active && <span className="text-emerald-500 text-sm ml-auto">✓</span>}
                  </div>
                );
              })}
            </div>

            {/* SDGs — exclusion filter */}
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-3">SDG</div>
            <div className="grid grid-cols-3 gap-2">
              {availableSdgs.map((sdg) => {
                const excluded = actionFilters.sdgs.has(sdg.code);
                const active = !excluded;
                return (
                  <div
                    key={sdg.code}
                    onClick={() => toggleSdg(sdg.code)}
                    className={clsx(
                      "flex items-center gap-2 py-2 px-2 rounded cursor-pointer transition-colors min-h-[44px]",
                      active ? "bg-white border border-gray-200" : "bg-gray-100 opacity-40"
                    )}
                  >
                    <span
                      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold text-white shrink-0"
                      style={{ backgroundColor: SDG_COLORS[sdg.code] || "#6B7280" }}
                    >
                      {sdg.code}
                    </span>
                    <span className="text-[10px] leading-tight text-gray-700">{sdg.title}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── Actor filters ── */}
        {activeFilterTab === "actor" && (
          <div className="flex gap-2">
            {ACTOR_TOGGLES.map((toggle) => {
              const active = activeActorTypes.has(toggle.key);
              return (
                <button
                  key={toggle.key}
                  onClick={() => dispatchFilters({ type: "TOGGLE_ACTOR_TYPE", payload: toggle.key })}
                  className={clsx(
                    "flex-1 py-2.5 min-h-[44px] rounded-full text-sm font-medium transition-all text-center",
                    active ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                  )}
                >
                  {toggle.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex justify-between mt-auto pt-4">
        <button className="button button-gray !px-8" onClick={() => {
          dispatchFilters({ type: "RESET_FILTERS" });
          if (onActionFiltersChange) onActionFiltersChange({ protocols: new Set(), sdgs: new Set(), timeRange: null });
        }}>
          Clear
        </button>
        <button className="button button-gradient !px-8" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
};
