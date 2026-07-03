import { CaretDown } from "@phosphor-icons/react";
import clsx from "clsx";
import type React from "react";
import { useMemo, useState } from "react";
import { useAqueductEconomy } from "../hooks/useAqueductEconomy";
import {
  type AqueductCategory,
  type EudrStatus,
  type InstitutionKind,
  type IntentStatus,
  type IntentType,
  type LotCommodity,
  setInstitutionFilter,
  setLotFilter,
  setRouteFilter,
  toggleAtlasOverlay,
  toggleCategory,
  useAqueductFilters,
} from "../state/aqueductFiltersStore";
import { AQUEDUCT_SECTION_COLORS } from "./AqueductExploreCards";
import type { Provenance } from "./Chips";

/**
 * The Aqueduct filter bar — the writer half of the Lots/Routes/Institutions
 * filter contract (the two map layers and the accordion rail are the readers).
 * It owns no state of its own beyond which dropdown is open: it reads and writes
 * the module-level singleton `aqueductFiltersStore` directly (no props, no
 * Provider), so every mount point always agrees.
 *
 * At rest the bar reads as one line — `Lots ▾ | Routes ▾ | Institutions ▾ …
 * Investable assets` — mirroring the rail's three section names and the map
 * legend's three accounts (one vocabulary across bar, rail, legend). Each
 * category name toggles the category on/off (colored underline = active); the
 * chevron beside it opens that category's sub-filters in a quiet white panel.
 * A small count chip on the chevron reports how many sub-filters are set, so the
 * collapsed bar still communicates. The visual idiom mirrors the base-Atlas
 * `MapFilterBar` (dark bar, white dropdown panels) without importing it — this
 * route's ontology is Aqueduct's, not base-Atlas's.
 */

const COMMODITY_OPTIONS: { value: LotCommodity; label: string }[] = [
  { value: "coffee", label: "Coffee" },
  { value: "cacao", label: "Cacao" },
  { value: "honey", label: "Honey" },
  // Second vertical: Glow solar farms. Selecting only "solar" leaves exactly the
  // 10 Glow farms on the map + rail (coffee/cacao/honey filtered out).
  { value: "solar", label: "Solar" },
];

const EUDR_OPTIONS: { value: EudrStatus; label: string }[] = [
  { value: "ready", label: "EUDR ready" },
  { value: "partial", label: "EUDR partial" },
  { value: "gap", label: "EUDR gap" },
];

// A short ladder of SCA cupping thresholds — single-select (a floor, not a set).
const SCA_THRESHOLDS = [80, 84, 86, 88];

const INTENT_TYPE_OPTIONS: { value: IntentType; label: string }[] = [
  { value: "sell-this-lot", label: "Sell this lot" },
  { value: "finance-this-planting", label: "Finance a planting" },
  { value: "finance-this-farm", label: "Finance a farm" },
];

const STATUS_OPTIONS: { value: IntentStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "filled", label: "Filled" },
  { value: "settled", label: "Settled" },
];

const KIND_OPTIONS: { value: InstitutionKind; label: string }[] = [
  { value: "coop", label: "Cooperatives" },
  { value: "venue", label: "Venues" },
  { value: "solver", label: "Solvers" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "hub", label: "Demand hubs" },
];

const PROVENANCE_OPTIONS: { value: Provenance; label: string }[] = [
  { value: "LIVE", label: "Live" },
  { value: "SNAPSHOT", label: "Snapshot" },
  { value: "SIM", label: "Sim" },
  { value: "TESTNET", label: "Testnet" },
  { value: "TO-BUILD", label: "To build" },
];

function toggleInSet<T>(set: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

/** A labeled multi-select group inside a category dropdown. */
function CheckGroup<T extends string>({
  label,
  color,
  options,
  selected,
  onToggle,
  onClear,
}: {
  label: string;
  color: string;
  options: { value: T; label: string }[];
  selected: ReadonlySet<T>;
  onToggle: (value: T) => void;
  onClear: () => void;
}): React.ReactElement {
  return (
    <div className="px-3 py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</span>
        {selected.size > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
          >
            clear
          </button>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        {options.map((o) => {
          const active = selected.has(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onToggle(o.value)}
              className={clsx(
                "w-full flex items-center gap-2 px-1.5 py-1 text-xs text-left rounded transition-colors hover:bg-gray-50 cursor-pointer",
                active ? "text-gray-900 font-medium" : "text-gray-500",
              )}
            >
              <span
                className={clsx(
                  "w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0",
                  active ? "border-transparent" : "border-gray-300",
                )}
                style={active ? { background: color } : undefined}
              >
                {active && <span className="text-white text-[8px] font-bold">✓</span>}
              </span>
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** SCA minimum — single-select floor (clicking the active value clears it). */
function ScaGroup({ color, value }: { color: string; value: number | null }): React.ReactElement {
  return (
    <div className="px-3 py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Min SCA</span>
        {value != null && (
          <button
            type="button"
            onClick={() => setLotFilter({ minScaScore: null })}
            className="text-[10px] text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
          >
            clear
          </button>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        {SCA_THRESHOLDS.map((t) => {
          const active = value === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setLotFilter({ minScaScore: active ? null : t })}
              className={clsx(
                "w-full flex items-center gap-2 px-1.5 py-1 text-xs text-left rounded transition-colors hover:bg-gray-50 cursor-pointer",
                active ? "text-gray-900 font-medium" : "text-gray-500",
              )}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: active ? color : "#d1d5db" }} />
              {t}+ cupping
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * A category control: the toggle (name + colored underline when active) plus a
 * chevron that opens the sub-filter panel. The count chip on the chevron reports
 * the number of sub-filters set, so the collapsed bar communicates state.
 */
function CategoryControl({
  category,
  label,
  color,
  active,
  count,
  isOpen,
  setOpen,
  panelWidth = 220,
  children,
}: {
  category: AqueductCategory;
  label: string;
  color: string;
  active: boolean;
  count: number;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  panelWidth?: number;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="relative flex items-center h-full">
      <button
        type="button"
        onClick={() => toggleCategory(category)}
        className={clsx(
          "h-full flex items-center px-1.5 text-[11px] font-medium transition-colors cursor-pointer",
          active ? "text-white" : "text-white/35 hover:text-white/60",
        )}
        style={active ? { borderBottom: `2px solid ${color}` } : undefined}
      >
        {label}
      </button>
      <button
        type="button"
        aria-label={`${label} sub-filters`}
        onClick={() => setOpen(!isOpen)}
        className={clsx(
          "h-full flex items-center gap-1 pl-0.5 pr-1.5 transition-colors cursor-pointer",
          isOpen || count > 0 ? "text-white" : "text-white/40 hover:text-white/70",
        )}
      >
        <CaretDown size={10} className={clsx("transition-transform", isOpen && "rotate-180")} />
        {count > 0 && (
          <span
            className="text-[9px] font-semibold text-white leading-none px-1 py-0.5 rounded-full"
            style={{ background: color }}
          >
            {count}
          </span>
        )}
      </button>
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 bg-white rounded-b-md shadow-lg z-20 py-1 divide-y divide-gray-100"
          style={{ width: panelWidth }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function AqueductFilterBar(): React.ReactElement {
  const filters = useAqueductFilters();
  const economy = useAqueductEconomy();
  const [openCategory, setOpenCategory] = useState<AqueductCategory | null>(null);

  // Kiva-template ask lines ride on the OPEN finance intents' own title/detail
  // (built with real cited numbers in useAqueductEconomy — the sentence wrapping
  // them is Aqueduct's own convention, no real platform publishes a per-farmer
  // ask card). Surfaced as the Routes dropdown's header line, not a billboard.
  const openFinanceAsks = useMemo(
    () =>
      economy.intents.filter(
        (it) =>
          (it.intentType === "finance-this-planting" || it.intentType === "finance-this-farm") &&
          (it.status ?? "open") === "open",
      ),
    [economy.intents],
  );

  const lotsActive = filters.activeCategories.has("lots");
  const routesActive = filters.activeCategories.has("routes");
  const institutionsActive = filters.activeCategories.has("institutions");

  // Sub-filter counts drive the collapsed-state chevron chips.
  const lotCount =
    filters.lot.commodities.size + filters.lot.eudrStatus.size + (filters.lot.minScaScore != null ? 1 : 0);
  const routeCount = filters.route.intentTypes.size + filters.route.statuses.size;
  const institutionCount = filters.institution.kinds.size + filters.institution.provenances.size;

  return (
    <div className="hidden md:block absolute top-0 left-0 right-0 z-10">
      <div className="relative z-10 bg-gray-900/90 backdrop-blur-sm flex items-center px-2 h-8">
        {/* ── Lots ── */}
        <CategoryControl
          category="lots"
          label="Lots"
          color={AQUEDUCT_SECTION_COLORS.lot}
          active={lotsActive}
          count={lotCount}
          isOpen={openCategory === "lots"}
          setOpen={(o) => setOpenCategory(o ? "lots" : null)}
        >
          <CheckGroup
            label="Commodity"
            color={AQUEDUCT_SECTION_COLORS.lot}
            options={COMMODITY_OPTIONS}
            selected={filters.lot.commodities}
            onToggle={(v) => setLotFilter({ commodities: toggleInSet(filters.lot.commodities, v) })}
            onClear={() => setLotFilter({ commodities: new Set() })}
          />
          <CheckGroup
            label="EUDR"
            color={AQUEDUCT_SECTION_COLORS.lot}
            options={EUDR_OPTIONS}
            selected={filters.lot.eudrStatus}
            onToggle={(v) => setLotFilter({ eudrStatus: toggleInSet(filters.lot.eudrStatus, v) })}
            onClear={() => setLotFilter({ eudrStatus: new Set() })}
          />
          <ScaGroup color={AQUEDUCT_SECTION_COLORS.lot} value={filters.lot.minScaScore} />
        </CategoryControl>

        <div className="w-px h-1/2 bg-white/15 mx-1" />

        {/* ── Routes ── */}
        <CategoryControl
          category="routes"
          label="Routes"
          color={AQUEDUCT_SECTION_COLORS.intent}
          active={routesActive}
          count={routeCount}
          isOpen={openCategory === "routes"}
          setOpen={(o) => setOpenCategory(o ? "routes" : null)}
          panelWidth={300}
        >
          {openFinanceAsks.length > 0 && (
            <div className="px-3 pt-1.5 pb-2">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-900">
                <span style={{ color: AQUEDUCT_SECTION_COLORS.intent }}>◆</span>
                {openFinanceAsks.length} open ask{openFinanceAsks.length === 1 ? "" : "s"}
              </div>
              <div className="mt-1.5 max-h-[168px] overflow-y-auto space-y-1.5">
                {openFinanceAsks.map((ask) => (
                  <div key={ask.id}>
                    <div className="text-[11px] font-medium text-gray-700 leading-snug">{ask.title}</div>
                    <div className="text-[10px] text-gray-400 leading-snug">{ask.detail}</div>
                  </div>
                ))}
              </div>
              <div className="text-[9px] text-gray-400 mt-1.5">
                Ask-card copy is an Aqueduct convention (SIM) — real numbers, templated sentence.
              </div>
            </div>
          )}
          <CheckGroup
            label="Intent"
            color={AQUEDUCT_SECTION_COLORS.intent}
            options={INTENT_TYPE_OPTIONS}
            selected={filters.route.intentTypes}
            onToggle={(v) => setRouteFilter({ intentTypes: toggleInSet(filters.route.intentTypes, v) })}
            onClear={() => setRouteFilter({ intentTypes: new Set() })}
          />
          <CheckGroup
            label="Status"
            color={AQUEDUCT_SECTION_COLORS.intent}
            options={STATUS_OPTIONS}
            selected={filters.route.statuses}
            onToggle={(v) => setRouteFilter({ statuses: toggleInSet(filters.route.statuses, v) })}
            onClear={() => setRouteFilter({ statuses: new Set() })}
          />
        </CategoryControl>

        <div className="w-px h-1/2 bg-white/15 mx-1" />

        {/* ── Institutions ── */}
        <CategoryControl
          category="institutions"
          label="Institutions"
          color={AQUEDUCT_SECTION_COLORS.actor}
          active={institutionsActive}
          count={institutionCount}
          isOpen={openCategory === "institutions"}
          setOpen={(o) => setOpenCategory(o ? "institutions" : null)}
        >
          <CheckGroup
            label="Kind"
            color={AQUEDUCT_SECTION_COLORS.actor}
            options={KIND_OPTIONS}
            selected={filters.institution.kinds}
            onToggle={(v) => setInstitutionFilter({ kinds: toggleInSet(filters.institution.kinds, v) })}
            onClear={() => setInstitutionFilter({ kinds: new Set() })}
          />
          <CheckGroup
            label="Provenance"
            color={AQUEDUCT_SECTION_COLORS.actor}
            options={PROVENANCE_OPTIONS}
            selected={filters.institution.provenances}
            onToggle={(v) => setInstitutionFilter({ provenances: toggleInSet(filters.institution.provenances, v) })}
            onClear={() => setInstitutionFilter({ provenances: new Set() })}
          />
        </CategoryControl>

        <div className="flex-1" />

        {/* ── Investable-assets overlay (base-Atlas context, default off) —
            quiet text + border, no bullet dot. ── */}
        <button
          type="button"
          onClick={toggleAtlasOverlay}
          title="Overlay base-Atlas investable assets & funds on top of the Aqueduct network"
          className={clsx(
            "h-6 flex items-center px-2 rounded border text-[11px] transition-colors cursor-pointer",
            filters.atlasInvestableOverlay
              ? "bg-white/15 text-white border-white/25"
              : "text-white/40 border-white/15 hover:text-white/70 hover:bg-white/5",
          )}
        >
          Investable assets
        </button>
      </div>

      {/* Click-outside closes any open dropdown (sits below the bar's own z-10 so
          chips stay clickable, above the map so a map click dismisses). */}
      {openCategory && (
        <div
          className="fixed inset-0 z-[9]"
          onClick={() => setOpenCategory(null)}
          onKeyDown={() => setOpenCategory(null)}
          role="presentation"
        />
      )}
    </div>
  );
}
