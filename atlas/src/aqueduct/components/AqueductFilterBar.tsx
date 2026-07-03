import { X } from "@phosphor-icons/react";
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
 * It owns no state of its own: it reads and writes the module-level singleton
 * `aqueductFiltersStore` directly (no props, no Provider), so every mount point
 * always agrees. Visual idiom mirrors the base-Atlas `MapFilterBar` (dark bar,
 * pill sub-filters, white dropdown panels) without importing or touching it —
 * this route's ontology is Aqueduct's, not base-Atlas's.
 *
 * Three category toggles (Lots / Routes / Institutions) colored by
 * `AQUEDUCT_SECTION_COLORS`; each opens inline chip-dropdowns of its
 * sub-filters. Toggling a category off removes its markers AND its rail
 * section (the readers gate on `activeCategories`). One quiet "Investable
 * assets" overlay chip lights up the base-Atlas investable clusters on top.
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

/** A pill that opens a small multi-select dropdown anchored under itself. */
function MultiSelectChip<T extends string>({
  id,
  label,
  color,
  options,
  selected,
  openKey,
  setOpenKey,
  onToggle,
  onClear,
}: {
  id: string;
  label: string;
  color: string;
  options: { value: T; label: string }[];
  selected: ReadonlySet<T>;
  openKey: string | null;
  setOpenKey: (k: string | null) => void;
  onToggle: (value: T) => void;
  onClear: () => void;
}): React.ReactElement {
  const isOpen = openKey === id;
  const count = selected.size;
  return (
    <div className="relative flex items-center h-full gap-0.5">
      <button
        type="button"
        onClick={() => setOpenKey(isOpen ? null : id)}
        className={clsx(
          "h-full flex items-center px-1.5 text-[11px] transition-colors cursor-pointer",
          isOpen || count > 0 ? "text-white" : "text-white/40 hover:text-white/70",
        )}
      >
        {count > 0 ? `${label} (${count})` : label}
      </button>
      {count > 0 && (
        <button
          type="button"
          aria-label={`Clear ${label} filter`}
          onClick={onClear}
          className="w-3 h-3 rounded-full bg-white/20 flex items-center justify-center hover:bg-red-500 transition-colors"
        >
          <X size={7} className="text-white" />
        </button>
      )}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 min-w-[160px] bg-white rounded-b-md shadow-lg z-20 py-1">
          {options.map((o) => {
            const active = selected.has(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => onToggle(o.value)}
                className={clsx(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors hover:bg-gray-50",
                  active ? "text-gray-900 font-medium" : "text-gray-400",
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
      )}
    </div>
  );
}

/** SCA minimum — single-select floor (clicking the active value clears it). */
function ScaChip({
  color,
  value,
  openKey,
  setOpenKey,
}: {
  color: string;
  value: number | null;
  openKey: string | null;
  setOpenKey: (k: string | null) => void;
}): React.ReactElement {
  const id = "lot:sca";
  const isOpen = openKey === id;
  return (
    <div className="relative flex items-center h-full gap-0.5">
      <button
        type="button"
        onClick={() => setOpenKey(isOpen ? null : id)}
        className={clsx(
          "h-full flex items-center px-1.5 text-[11px] transition-colors cursor-pointer",
          isOpen || value != null ? "text-white" : "text-white/40 hover:text-white/70",
        )}
      >
        {value != null ? `SCA ${value}+` : "Min SCA"}
      </button>
      {value != null && (
        <button
          type="button"
          aria-label="Clear minimum SCA filter"
          onClick={() => setLotFilter({ minScaScore: null })}
          className="w-3 h-3 rounded-full bg-white/20 flex items-center justify-center hover:bg-red-500 transition-colors"
        >
          <X size={7} className="text-white" />
        </button>
      )}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 min-w-[110px] bg-white rounded-b-md shadow-lg z-20 py-1">
          {SCA_THRESHOLDS.map((t) => {
            const active = value === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setLotFilter({ minScaScore: active ? null : t })}
                className={clsx(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors hover:bg-gray-50",
                  active ? "text-gray-900 font-medium" : "text-gray-500",
                )}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: active ? color : "#d1d5db" }}
                />
                {t}+ cupping
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Category toggle + its inline sub-filter pills (shown only while active). */
function CategoryToggle({
  category,
  label,
  color,
  active,
  children,
}: {
  category: AqueductCategory;
  label: string;
  color: string;
  active: boolean;
  children?: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex items-center h-full">
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
      {active && children && (
        <>
          <div className="w-px h-1/3 bg-white/20 mx-0.5" />
          {children}
        </>
      )}
    </div>
  );
}

export function AqueductFilterBar(): React.ReactElement {
  const filters = useAqueductFilters();
  const economy = useAqueductEconomy();
  const [openKey, setOpenKey] = useState<string | null>(null);

  // Kiva-template ask lines ride on the OPEN finance intents' own title/detail
  // (built with real cited numbers in useAqueductEconomy — the sentence wrapping
  // them is Aqueduct's own convention, no real platform publishes a per-farmer
  // ask card). Surfaced as a quiet expandable pill, not a billboard.
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
  const asksOpen = openKey === "route:asks";

  return (
    <div className="hidden md:block absolute top-0 left-0 right-0 z-10">
      <div className="relative z-10 bg-gray-900/90 backdrop-blur-sm flex items-center px-2 h-8">
        {/* ── Lots ── */}
        <CategoryToggle category="lots" label="Lots" color={AQUEDUCT_SECTION_COLORS.lot} active={lotsActive}>
          <MultiSelectChip
            id="lot:commodity"
            label="Commodity"
            color={AQUEDUCT_SECTION_COLORS.lot}
            options={COMMODITY_OPTIONS}
            selected={filters.lot.commodities}
            openKey={openKey}
            setOpenKey={setOpenKey}
            onToggle={(v) => setLotFilter({ commodities: toggleInSet(filters.lot.commodities, v) })}
            onClear={() => setLotFilter({ commodities: new Set() })}
          />
          <div className="w-px h-1/3 bg-white/20" />
          <MultiSelectChip
            id="lot:eudr"
            label="EUDR"
            color={AQUEDUCT_SECTION_COLORS.lot}
            options={EUDR_OPTIONS}
            selected={filters.lot.eudrStatus}
            openKey={openKey}
            setOpenKey={setOpenKey}
            onToggle={(v) => setLotFilter({ eudrStatus: toggleInSet(filters.lot.eudrStatus, v) })}
            onClear={() => setLotFilter({ eudrStatus: new Set() })}
          />
          <div className="w-px h-1/3 bg-white/20" />
          <ScaChip
            color={AQUEDUCT_SECTION_COLORS.lot}
            value={filters.lot.minScaScore}
            openKey={openKey}
            setOpenKey={setOpenKey}
          />
        </CategoryToggle>

        <div className="w-px h-1/2 bg-white/15 mx-1" />

        {/* ── Routes ── */}
        <CategoryToggle category="routes" label="Routes" color={AQUEDUCT_SECTION_COLORS.intent} active={routesActive}>
          <MultiSelectChip
            id="route:intentType"
            label="Intent"
            color={AQUEDUCT_SECTION_COLORS.intent}
            options={INTENT_TYPE_OPTIONS}
            selected={filters.route.intentTypes}
            openKey={openKey}
            setOpenKey={setOpenKey}
            onToggle={(v) => setRouteFilter({ intentTypes: toggleInSet(filters.route.intentTypes, v) })}
            onClear={() => setRouteFilter({ intentTypes: new Set() })}
          />
          <div className="w-px h-1/3 bg-white/20" />
          <MultiSelectChip
            id="route:status"
            label="Status"
            color={AQUEDUCT_SECTION_COLORS.intent}
            options={STATUS_OPTIONS}
            selected={filters.route.statuses}
            openKey={openKey}
            setOpenKey={setOpenKey}
            onToggle={(v) => setRouteFilter({ statuses: toggleInSet(filters.route.statuses, v) })}
            onClear={() => setRouteFilter({ statuses: new Set() })}
          />
          {openFinanceAsks.length > 0 && (
            <>
              <div className="w-px h-1/3 bg-white/20" />
              <div className="relative flex items-center h-full">
                <button
                  type="button"
                  title={openFinanceAsks.map((a) => `${a.title} — ${a.detail}`).join("\n")}
                  onClick={() => setOpenKey(asksOpen ? null : "route:asks")}
                  className={clsx(
                    "h-full flex items-center gap-1 px-1.5 text-[11px] transition-colors cursor-pointer",
                    asksOpen ? "text-white" : "text-white/40 hover:text-white/70",
                  )}
                >
                  <span style={{ color: asksOpen ? undefined : AQUEDUCT_SECTION_COLORS.intent }}>◆</span>
                  <span>
                    {openFinanceAsks.length} open ask{openFinanceAsks.length === 1 ? "" : "s"}
                  </span>
                </button>
                {asksOpen && (
                  <div className="absolute top-full left-0 mt-1 w-[300px] bg-white rounded-b-md shadow-lg z-20 py-1.5">
                    {openFinanceAsks.map((ask) => (
                      <div key={ask.id} className="px-3 py-1.5 border-b border-gray-100 last:border-b-0">
                        <div className="text-xs font-semibold text-gray-900">{ask.title}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">{ask.detail}</div>
                      </div>
                    ))}
                    <div className="px-3 pt-1.5 text-[10px] text-gray-400">
                      Ask-card copy is an Aqueduct convention (SIM) — real numbers, templated sentence.
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </CategoryToggle>

        <div className="w-px h-1/2 bg-white/15 mx-1" />

        {/* ── Institutions ── */}
        <CategoryToggle
          category="institutions"
          label="Institutions"
          color={AQUEDUCT_SECTION_COLORS.actor}
          active={institutionsActive}
        >
          <MultiSelectChip
            id="inst:kind"
            label="Kind"
            color={AQUEDUCT_SECTION_COLORS.actor}
            options={KIND_OPTIONS}
            selected={filters.institution.kinds}
            openKey={openKey}
            setOpenKey={setOpenKey}
            onToggle={(v) => setInstitutionFilter({ kinds: toggleInSet(filters.institution.kinds, v) })}
            onClear={() => setInstitutionFilter({ kinds: new Set() })}
          />
          <div className="w-px h-1/3 bg-white/20" />
          <MultiSelectChip
            id="inst:provenance"
            label="Provenance"
            color={AQUEDUCT_SECTION_COLORS.actor}
            options={PROVENANCE_OPTIONS}
            selected={filters.institution.provenances}
            openKey={openKey}
            setOpenKey={setOpenKey}
            onToggle={(v) => setInstitutionFilter({ provenances: toggleInSet(filters.institution.provenances, v) })}
            onClear={() => setInstitutionFilter({ provenances: new Set() })}
          />
        </CategoryToggle>

        <div className="flex-1" />

        {/* ── Investable-assets overlay (base-Atlas context, default off) ── */}
        <button
          type="button"
          onClick={toggleAtlasOverlay}
          title="Overlay base-Atlas investable assets & funds on top of the Aqueduct network"
          className={clsx(
            "h-6 flex items-center gap-1.5 px-2 rounded text-[11px] transition-colors cursor-pointer",
            filters.atlasInvestableOverlay
              ? "bg-white/15 text-white"
              : "text-white/40 hover:text-white/70 hover:bg-white/5",
          )}
        >
          <span
            className={clsx("w-2 h-2 rounded-full", filters.atlasInvestableOverlay ? "bg-cyan-400" : "bg-white/25")}
          />
          Investable assets
        </button>
      </div>

      {/* Click-outside closes any open dropdown (sits below the bar's own z-10 so
          chips stay clickable, above the map so a map click dismisses). */}
      {openKey && (
        <div
          className="fixed inset-0 z-[9]"
          onClick={() => setOpenKey(null)}
          onKeyDown={() => setOpenKey(null)}
          role="presentation"
        />
      )}
    </div>
  );
}
