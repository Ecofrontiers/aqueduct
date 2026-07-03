import { useSyncExternalStore } from "react";
import type { Provenance } from "../components/Chips";
import { deriveEudrStatus, matchesInstitution, matchesIntent, matchesLot, wrapHub } from "./filterPredicates.mjs";

/**
 * Module-level singleton store for Aqueduct's Lots/Routes/Institutions
 * filters — NOT React context. Four independent mount points need the SAME
 * live filter state without any one of them owning the others: the filter
 * bar (writes), the two Aqueduct map layers (LotsLayer, AqueductNetworkLayer
 * — reads, each gating its own render), and the 7-section accordion rail
 * (reads, for both counts and which items to list). A tiny external store
 * (`useSyncExternalStore`, the same primitive React/zustand use internally)
 * lets all four stay simple insertions, same reasoning as `tourStore.ts`.
 *
 * Unlike `tourStore.ts`, this store has NO module-level side effects at
 * import time — no localStorage load, no interval timer. Filter state is
 * session-only and purely reactive to user input.
 *
 * Tour emphasis is EXEMPT from these filters — the tour (see `tourStore.ts`)
 * drives which lot/arc/ring is *emphasized* on screen, not which entities
 * *exist* on screen. Filtering out a lot here still removes it entirely;
 * the tour never fights that, it only highlights within whatever the
 * filters already let through.
 */

export type AqueductCategory = "lots" | "routes" | "institutions";
// "solar" is the second commodity vertical (Glow solar farms). matchesLot is
// Set-generic over the commodity string, so no predicate change is needed —
// a farm-as-lot carries `commodity:"solar"` and passes/fails the commodity
// filter exactly like coffee/cacao/honey. Farms have no EUDR evidence object,
// so deriveEudrStatus resolves them to "gap" and any EUDR-ready/partial filter
// excludes them — semantically correct (EUDR is a coffee/cocoa deforestation
// lens; it does not apply to solar).
export type LotCommodity = "coffee" | "cacao" | "honey" | "solar";
export type EudrStatus = "ready" | "partial" | "gap";
export type IntentType = "sell-this-lot" | "finance-this-planting" | "finance-this-farm";
export type IntentStatus = "open" | "filled" | "settled";
export type InstitutionKind = "solver" | "venue" | "infrastructure" | "coop" | "hub";

interface LotFilterState {
  commodities: Set<LotCommodity>;
  eudrStatus: Set<EudrStatus>;
  minScaScore: number | null;
}

interface RouteFilterState {
  intentTypes: Set<IntentType>;
  statuses: Set<IntentStatus>;
}

interface InstitutionFilterState {
  kinds: Set<InstitutionKind>;
  provenances: Set<Provenance>;
}

export interface AqueductFiltersState {
  activeCategories: Set<AqueductCategory>;
  lot: LotFilterState;
  route: RouteFilterState;
  institution: InstitutionFilterState;
  atlasInvestableOverlay: boolean;
}

function createInitialState(): AqueductFiltersState {
  return {
    activeCategories: new Set<AqueductCategory>(["lots", "routes", "institutions"]),
    lot: {
      commodities: new Set<LotCommodity>(),
      eudrStatus: new Set<EudrStatus>(),
      minScaScore: null,
    },
    route: {
      intentTypes: new Set<IntentType>(),
      statuses: new Set<IntentStatus>(),
    },
    institution: {
      kinds: new Set<InstitutionKind>(),
      provenances: new Set<Provenance>(),
    },
    // Default OFF: first impression is pure Aqueduct ontology, one click
    // lights up base-Atlas investable-asset context on top of it.
    atlasInvestableOverlay: false,
  };
}

let state: AqueductFiltersState = createInitialState();

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function setState(patch: Partial<AqueductFiltersState>) {
  state = { ...state, ...patch };
  emit();
}

export function toggleCategory(category: AqueductCategory) {
  const next = new Set(state.activeCategories);
  if (next.has(category)) next.delete(category);
  else next.add(category);
  setState({ activeCategories: next });
}

export function setLotFilter(patch: Partial<LotFilterState>) {
  setState({ lot: { ...state.lot, ...patch } });
}

export function setRouteFilter(patch: Partial<RouteFilterState>) {
  setState({ route: { ...state.route, ...patch } });
}

export function setInstitutionFilter(patch: Partial<InstitutionFilterState>) {
  setState({ institution: { ...state.institution, ...patch } });
}

export function toggleAtlasOverlay() {
  setState({ atlasInvestableOverlay: !state.atlasInvestableOverlay });
}

export function resetFilters() {
  state = createInitialState();
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): AqueductFiltersState {
  return state;
}

export function useAqueductFilters(): AqueductFiltersState {
  return useSyncExternalStore(subscribe, getSnapshot);
}

// Re-export the pure predicates so map layers, the rail, and the filter bar
// can all import filtering logic from one place (the store module) without
// needing to know it's backed by a co-located .mjs file underneath.
export { deriveEudrStatus, matchesInstitution, matchesIntent, matchesLot, wrapHub };
