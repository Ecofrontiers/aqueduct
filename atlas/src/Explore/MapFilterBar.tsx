import { useMemo, useState } from "react";
import clsx from "clsx";
import { X, Users, Cube, Lightning } from "@phosphor-icons/react";
import {
  useNewFiltersDispatch,
  useNewFiltersState,
} from "../context/filters";
import type { EntityTypeKey, ActorTypeKey } from "../context/filters/filtersContext";
import { ENTITY_COLORS } from "../shared/components/CompositeClusterLayer";
import { SDG_COLORS } from "../shared/consts/sdg";
import FiltersDropdown from "./components/FiltersDropdown";
import { ProtocolIcon } from "../modules/chains/components/ProtocolIcon";

const ENTITY_TOGGLES: { key: EntityTypeKey; label: string }[] = [
  { key: "asset", label: "Assets" },
  { key: "actor", label: "Actors" },
  { key: "action", label: "Actions" },
];

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

interface BioregionStats {
  id: string;
  name: string;
  eii: number;
  eiiDelta: number;
  assetCount: number;
  actorCount: number;
  actionCount: number;
}

export interface ActionFilters {
  protocols: Set<string>;
  sdgs: Set<string>;
  /** Time range as { from: "YYYY-MM", to: "YYYY-MM" }, or null for no filter */
  timeRange: { from: string; to: string } | null;
}

interface MapFilterBarProps {
  itemCount: number;
  selectedBioregion?: BioregionStats | null;
  actionFilters?: ActionFilters;
  onActionFiltersChange?: (filters: ActionFilters) => void;
  showPrimaryAssets?: boolean;
  onTogglePrimaryAssets?: () => void;
  filteredActionCount?: number;
}

export function MapFilterBar({
  itemCount,
  selectedBioregion,
  actionFilters,
  onActionFiltersChange,
  showPrimaryAssets,
  onTogglePrimaryAssets,
  filteredActionCount,
}: MapFilterBarProps) {
  const { activeEntityTypes, activeActorTypes, filters, allActions, filteredAssets, allOrgs } = useNewFiltersState();
  const filteredAssetCount = filteredAssets.length;
  const agentCount = 1; // owockibot
  const actorDisplayCount = useMemo(() => {
    if (!activeEntityTypes.has("actor")) return 0;
    let count = 0;
    if (activeActorTypes.has("orgs")) count += allOrgs.length;
    if (activeActorTypes.has("agents")) count += agentCount;
    return count;
  }, [activeEntityTypes, activeActorTypes, allOrgs.length]);

  const displayActionCount = useMemo(() => {
    let list = allActions;
    if (actionFilters?.protocols.size) {
      list = list.filter((a) => !a.proofs.every((p) => actionFilters.protocols.has(p.protocol.id)));
    }
    if (actionFilters?.sdgs.size) {
      list = list.filter((a) => !a.sdg_outcomes.every((s) => actionFilters.sdgs.has(s.code)));
    }
    if (actionFilters?.timeRange) {
      const { from, to } = actionFilters.timeRange;
      list = list.filter((a) => {
        const d = a.action_start_date || a.created_at;
        if (!d) return false;
        const date = new Date(d);
        const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        return ym >= from && ym <= to;
      });
    }
    return list.length;
  }, [allActions, actionFilters]);
  const dispatch = useNewFiltersDispatch();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<
    "assetType" | "issuers" | "platforms"
  >("assetType");

  // Action-specific dropdown
  const [actionDropdown, setActionDropdown] = useState<"protocol" | "sdg" | "time" | null>(null);

  const showAssetFilters = activeEntityTypes.has("asset");
  const showActorSubfilter = activeEntityTypes.has("actor");
  const showActionFilters = activeEntityTypes.has("action");

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

  // Derive available protocols and SDGs from actions
  const availableProtocols = useMemo(() => {
    const map = new Map<string, { name: string; color: string | null; logo: string | null }>();
    for (const action of allActions) {
      for (const proof of action.proofs) {
        if (!map.has(proof.protocol.id)) {
          map.set(proof.protocol.id, {
            name: proof.protocol.name,
            color: proof.protocol.color,
            logo: proof.protocol.logo,
          });
        }
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].name.localeCompare(b[1].name));
  }, [allActions]);

  const availableSdgs = useMemo(() => {
    const map = new Map<string, string>();
    for (const action of allActions) {
      for (const sdg of action.sdg_outcomes) {
        if (!map.has(sdg.code)) {
          map.set(sdg.code, sdg.title);
        }
      }
    }
    return Array.from(map.entries()).sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10));
  }, [allActions]);

  // Compute available months from action dates
  const timeRange = useMemo(() => {
    const months = new Set<string>();
    for (const action of allActions) {
      const d = action.action_start_date || action.created_at;
      if (!d) continue;
      const date = new Date(d);
      months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
    }
    const sorted = Array.from(months).sort();
    return sorted;
  }, [allActions]);

  const formatMonth = (ym: string) => {
    const [y, m] = ym.split("-");
    const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${names[parseInt(m, 10) - 1]} ${y}`;
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

  return (
    <div className="hidden md:block absolute top-0 left-0 right-0 z-10">
      <div className="bg-gray-900/90 backdrop-blur-sm flex items-center px-2 h-8">
        {/* ── Assets + subfilters ── */}
        <div className="flex items-center h-full">
          <button
            onClick={() => dispatch({ type: "TOGGLE_ENTITY_TYPE", payload: "asset" })}
            className={clsx(
              "h-full flex items-center px-1.5 text-[11px] font-medium transition-colors cursor-pointer",
              activeEntityTypes.has("asset") ? "text-white" : "text-white/35 hover:text-white/60"
            )}
            style={activeEntityTypes.has("asset") ? { borderBottom: `2px solid ${ENTITY_COLORS.asset.primary}` } : undefined}
          >
            Assets
          </button>
          {showAssetFilters && (
            <>
              <div className="w-px h-1/3 bg-white/20 mx-0.5" />
              {([
                { key: "assetType" as const, label: "Type", hasFilter: hasTypeFilter, count: accumulateSubtypes().length, reset: "RESET_TYPE_FILTERS" },
                { key: "issuers" as const, label: "Issuer", hasFilter: hasIssuerFilter, count: filters.providers.length, reset: "RESET_PROVIDER_FILTER" },
                { key: "platforms" as const, label: "Chain", hasFilter: hasChainFilter, count: filters.platforms.length, reset: "RESET_PLATFORM_FILTER" },
              ] as const).map((f, i) => (
                <div key={f.key} className="flex items-center h-full">
                  {i > 0 && <div className="w-px h-1/3 bg-white/20" />}
                  <button
                    onClick={() => { setActionDropdown(null); setSelectedFilter(f.key); setIsDropdownOpen(selectedFilter === f.key ? !isDropdownOpen : true); }}
                    className={clsx("h-full flex items-center gap-1 px-1.5 text-[11px] transition-colors cursor-pointer", isDropdownOpen && selectedFilter === f.key ? "text-white" : "text-white/40 hover:text-white/70")}
                  >
                    <span>{f.hasFilter ? `${f.label} (${f.count})` : f.label}</span>
                    {f.hasFilter && <span className="w-3 h-3 rounded-full bg-white/20 flex items-center justify-center hover:bg-red-500 transition-colors" onClick={(e) => { e.stopPropagation(); dispatch({ type: f.reset }); }}><X size={7} className="text-white" /></span>}
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="w-px h-1/2 bg-white/15 mx-1" />

        {/* ── Actions + subfilters ── */}
        <div className="flex items-center h-full">
          <button
            onClick={() => dispatch({ type: "TOGGLE_ENTITY_TYPE", payload: "action" })}
            className={clsx(
              "h-full flex items-center px-1.5 text-[11px] font-medium transition-colors cursor-pointer",
              activeEntityTypes.has("action") ? "text-white" : "text-white/35 hover:text-white/60"
            )}
            style={activeEntityTypes.has("action") ? { borderBottom: `2px solid ${ENTITY_COLORS.action.primary}` } : undefined}
          >
            Actions
          </button>
          {showActionFilters && actionFilters && (
            <>
              <div className="w-px h-1/3 bg-white/20 mx-0.5" />
              {/* Protocol */}
              <button onClick={() => { setIsDropdownOpen(false); setActionDropdown(actionDropdown === "protocol" ? null : "protocol"); }} className={clsx("h-full flex items-center gap-1 px-1.5 text-[11px] transition-colors cursor-pointer", actionDropdown === "protocol" ? "text-white" : "text-white/40 hover:text-white/70")}>
                <span>{actionFilters.protocols.size > 0 ? `Protocol (${availableProtocols.length - actionFilters.protocols.size})` : "Protocol"}</span>
                {actionFilters.protocols.size > 0 && <span className="w-3 h-3 rounded-full bg-white/20 flex items-center justify-center hover:bg-red-500 transition-colors" onClick={(e) => { e.stopPropagation(); onActionFiltersChange?.({ ...actionFilters, protocols: new Set() }); }}><X size={7} className="text-white" /></span>}
              </button>
              <div className="w-px h-1/3 bg-white/20" />
              {/* SDG */}
              <button onClick={() => { setIsDropdownOpen(false); setActionDropdown(actionDropdown === "sdg" ? null : "sdg"); }} className={clsx("h-full flex items-center gap-1 px-1.5 text-[11px] transition-colors cursor-pointer", actionDropdown === "sdg" ? "text-white" : "text-white/40 hover:text-white/70")}>
                <span>{actionFilters.sdgs.size > 0 ? `SDG (${actionFilters.sdgs.size})` : "SDG"}</span>
                {actionFilters.sdgs.size > 0 && <span className="w-3 h-3 rounded-full bg-white/20 flex items-center justify-center hover:bg-red-500 transition-colors" onClick={(e) => { e.stopPropagation(); onActionFiltersChange?.({ ...actionFilters, sdgs: new Set() }); }}><X size={7} className="text-white" /></span>}
              </button>
              <div className="w-px h-1/3 bg-white/20" />
              {/* Time */}
              <button onClick={() => { setIsDropdownOpen(false); setActionDropdown(actionDropdown === "time" ? null : "time"); }} className={clsx("h-full flex items-center gap-1 px-1.5 text-[11px] transition-colors cursor-pointer", actionDropdown === "time" ? "text-white" : "text-white/40 hover:text-white/70")}>
                <span>{actionFilters.timeRange ? `${formatMonth(actionFilters.timeRange.from)} – ${formatMonth(actionFilters.timeRange.to)}` : "Time"}</span>
                {actionFilters.timeRange && <span className="w-3 h-3 rounded-full bg-white/20 flex items-center justify-center hover:bg-red-500 transition-colors" onClick={(e) => { e.stopPropagation(); onActionFiltersChange?.({ ...actionFilters, timeRange: null }); }}><X size={7} className="text-white" /></span>}
              </button>
            </>
          )}
        </div>

        <div className="w-px h-1/2 bg-white/15 mx-1" />

        {/* ── Actors + subfilters ── */}
        <div className="flex items-center h-full">
          <button
            onClick={() => dispatch({ type: "TOGGLE_ENTITY_TYPE", payload: "actor" })}
            className={clsx(
              "h-full flex items-center px-1.5 text-[11px] font-medium transition-colors cursor-pointer",
              activeEntityTypes.has("actor") ? "text-white" : "text-white/35 hover:text-white/60"
            )}
            style={activeEntityTypes.has("actor") ? { borderBottom: `2px solid ${ENTITY_COLORS.actor.primary}` } : undefined}
          >
            Actors
          </button>
          {showActorSubfilter && (
            <>
              <div className="w-px h-1/3 bg-white/20 mx-0.5" />
              <div className="flex items-center h-full">
                {ACTOR_TOGGLES.map((toggle, i) => {
                  const active = activeActorTypes.has(toggle.key);
                  return (
                    <div key={toggle.key} className="flex items-center h-full">
                      {i > 0 && <div className="w-px h-1/3 bg-white/20" />}
                      <button
                        onClick={() => dispatch({ type: "TOGGLE_ACTOR_TYPE", payload: toggle.key })}
                        className={clsx("h-full flex items-center px-1.5 text-[10px] font-medium transition-colors cursor-pointer", active ? "text-white" : "text-white/40 hover:text-white/70")}
                      >
                        {toggle.label}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Entity counts — only show active types, always global counts */}
        <div className="flex items-center gap-2 px-2 py-1">
          {activeEntityTypes.has("asset") && (
            <div className="flex items-center gap-1" title="Assets">
              <Cube size={11} className="text-yellow-400" />
              <span className="text-[10px] text-white/60">{filteredAssetCount}</span>
            </div>
          )}
          {activeEntityTypes.has("asset") && activeEntityTypes.has("action") && <div className="w-px h-3 bg-white/15" />}
          {activeEntityTypes.has("action") && (
            <div className="flex items-center gap-1" title="Actions">
              <Lightning size={11} className="text-emerald-400" />
              <span className="text-[10px] text-white/60">{displayActionCount}</span>
            </div>
          )}
          {(activeEntityTypes.has("asset") || activeEntityTypes.has("action")) && activeEntityTypes.has("actor") && <div className="w-px h-3 bg-white/15" />}
          {activeEntityTypes.has("actor") && (
            <div className="flex items-center gap-1" title="Actors">
              <Users size={11} className="text-blue-400" />
              <span className="text-[10px] text-white/60">{actorDisplayCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* Click-outside overlay to close any open dropdown (not for time — it needs click interaction) */}
      {(isDropdownOpen || (actionDropdown && actionDropdown !== "time")) && (
        <div className="fixed inset-0 z-[9]" onClick={() => { setIsDropdownOpen(false); setActionDropdown(null); }} />
      )}

      {/* Asset filters dropdown */}
      {isDropdownOpen && (
        <FiltersDropdown
          onClose={() => setIsDropdownOpen(false)}
          openFilter={selectedFilter}
          showPrimaryAssets={showPrimaryAssets}
          onTogglePrimaryAssets={onTogglePrimaryAssets}
        />
      )}

      {/* Action Protocol panel — full width */}
      {actionDropdown === "protocol" && (
        <div className="absolute top-8 left-0 right-0 bg-white rounded-b-lg shadow-lg z-20 p-2">
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            {availableProtocols.map(([id, proto]) => {
              const excluded = actionFilters?.protocols.has(id);
              const active = !excluded;
              return (
                <div
                  key={id}
                  onClick={() => toggleProtocol(id)}
                  className={clsx(
                    "flex items-center gap-2 py-1.5 px-1.5 rounded",
                    "cursor-pointer hover:bg-gray-50 transition-colors",
                    active && "bg-emerald-50"
                  )}
                >
                  <ProtocolIcon protocolId={id} protocolName={proto.name} size={14} />
                  <span className={clsx(
                    "text-xs truncate",
                    active ? "text-emerald-700 font-medium" : "text-gray-400 line-through"
                  )}>
                    {proto.name}
                  </span>
                  {active && <span className="text-emerald-500 text-[10px] ml-auto shrink-0">✓</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action SDG panel — full width */}
      {actionDropdown === "sdg" && (
        <div className="absolute top-8 left-0 right-0 bg-white rounded-b-lg shadow-lg z-20 p-2">
          <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-1">
          {ALL_SDGS.map(({ code, title }) => {
            const excluded = actionFilters?.sdgs.has(code);
            const active = !excluded;
            const hasActions = availableSdgs.some(([c]) => c === code);
            return (
              <button
                key={code}
                onClick={() => toggleSdg(code)}
                className={clsx(
                  "group w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors",
                  active ? "bg-emerald-50" : "hover:bg-gray-50",
                  !hasActions && "opacity-40"
                )}
              >
                <span
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: SDG_COLORS[code] || "#6B7280" }}
                >
                  {code}
                </span>
                <span className={clsx("flex-1 text-xs truncate group-hover:whitespace-normal group-hover:overflow-visible", active ? "font-semibold text-emerald-700" : "text-gray-400")} title={title}>
                  {title}
                </span>
                <div className={clsx(
                  "w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0",
                  active ? "bg-emerald-500 border-emerald-500" : "border-gray-300"
                )}>
                  {active && <span className="text-white text-[8px] font-bold">✓</span>}
                </div>
              </button>
            );
          })}
          </div>
        </div>
      )}

      {/* Action Time range — single bar with two draggable edges */}
      {actionDropdown === "time" && timeRange.length > 0 && (() => {
        const fromIdx = actionFilters?.timeRange ? Math.max(0, timeRange.indexOf(actionFilters.timeRange.from)) : 0;
        const toIdx = actionFilters?.timeRange ? Math.max(0, timeRange.indexOf(actionFilters.timeRange.to)) : timeRange.length - 1;
        const pctLeft = (fromIdx / (timeRange.length - 1)) * 100;
        const pctRight = (toIdx / (timeRange.length - 1)) * 100;

        return (
          <div className="absolute top-8 left-0 right-0 bg-gray-900/95 backdrop-blur-sm shadow-lg z-20 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-white/50">{formatMonth(timeRange[0])}</span>
              <span className="text-[11px] font-medium text-white">
                {formatMonth(timeRange[fromIdx])} – {formatMonth(timeRange[toIdx])}
              </span>
              <span className="text-[10px] text-white/50">{formatMonth(timeRange[timeRange.length - 1])}</span>
            </div>
            {/* Draggable track */}
            <div
              className="relative h-6 cursor-pointer flex items-center select-none"
              onMouseDown={(e) => {
                const track = e.currentTarget;
                const rect = track.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                const clickIdx = Math.round(pct * (timeRange.length - 1));
                const distFrom = Math.abs(clickIdx - fromIdx);
                const distTo = Math.abs(clickIdx - toIdx);
                const dragging = distFrom <= distTo ? 'from' : 'to';

                const onMove = (ev: MouseEvent) => {
                  const p = (ev.clientX - rect.left) / rect.width;
                  const idx = Math.max(0, Math.min(timeRange.length - 1, Math.round(p * (timeRange.length - 1))));
                  if (dragging === 'from') {
                    const clamped = Math.min(idx, toIdx - 1);
                    if (clamped >= 0) onActionFiltersChange?.({ ...actionFilters!, timeRange: { from: timeRange[clamped], to: timeRange[toIdx] } });
                  } else {
                    const clamped = Math.max(idx, fromIdx + 1);
                    if (clamped <= timeRange.length - 1) onActionFiltersChange?.({ ...actionFilters!, timeRange: { from: timeRange[fromIdx], to: timeRange[clamped] } });
                  }
                };
                const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
                onMove(e.nativeEvent);
              }}
            >
              <div className="w-full h-2 bg-white/10 rounded-full relative">
                <div
                  className="absolute h-full bg-emerald-500 rounded-full"
                  style={{ left: `${pctLeft}%`, width: `${pctRight - pctLeft}%` }}
                />
              </div>
              {/* Left handle */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full border-2 border-emerald-500 shadow"
                style={{ left: `${pctLeft}%`, marginLeft: '-7px' }}
              />
              {/* Right handle */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full border-2 border-emerald-500 shadow"
                style={{ left: `${pctRight}%`, marginLeft: '-7px' }}
              />
            </div>
          </div>
        );
      })()}
    </div>
  );
}

