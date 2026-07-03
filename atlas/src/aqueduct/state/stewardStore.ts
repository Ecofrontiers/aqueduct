import { useSyncExternalStore } from "react";
import type { AqueductIntent } from "../hooks/useAqueductEconomy";

/**
 * The seat's steward — session-only singleton (doc 14 §6, WP16). Same
 * module-level `useSyncExternalStore` primitive as tourStore.ts, but deliberately
 * WITHOUT localStorage and WITHOUT any timer: a steward's draft intents and floor
 * are live working state for one session, not persisted economy facts. Nothing here
 * runs at import — the store is inert until the seat page calls a setter.
 *
 * The steward holds the producer's private inputs (quantity, floor, disclosure tiers)
 * and speaks the resulting commitment outward as an ask card. It negotiates; it never
 * settles — that boundary lives in the surface (StewardPanel), enforced by there being
 * no key and no broadcast setter here.
 */

/** Disclosure tiers (doc 13 policy): status/attestations flow outward; plot geometry
 *  and full names never leave the seat. The last two are LOCKED false by design — the
 *  surface renders them disabled, and there is no setter that can flip them. */
export interface SeatDisclosure {
  shareEudrStatus: boolean;
  sharePlotGeometry: false;
  shareFullNames: false;
}

export interface SeatPrefs {
  /** Reserve price (verb #2 "set the floor"). Private to the steward; the ask-card line
   *  and the solver race both respect it. Null = "price on match". */
  floorEurPerKg: number | null;
  disclosure: SeatDisclosure;
}

interface StewardState {
  /** User-authored SIM intents (verb #1 "post an intent"), flat across the session;
   *  scope a seat's own drafts with `selectSeatDrafts`. */
  draftIntents: AqueductIntent[];
  prefsBySeat: Record<string, SeatPrefs>;
}

/** doc 13 §3: the two competitively-sensitive tiers are structurally locked, never a toggle. */
export const LOCKED_DISCLOSURE_NOTE = "plot geometry never leaves the seat — see /ontology and docs/research/13";

function defaultPrefs(): SeatPrefs {
  return {
    floorEurPerKg: null,
    disclosure: { shareEudrStatus: true, sharePlotGeometry: false, shareFullNames: false },
  };
}

let state: StewardState = { draftIntents: [], prefsBySeat: {} };
let _draftCounter = 0;

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function setState(patch: Partial<StewardState>) {
  state = { ...state, ...patch };
  emit();
}

/**
 * Post an intent (verb #1). The caller hands a fully-formed intent minus its id; the
 * store owns the deterministic `aq:u-<n>` counter so ids are the single source of truth
 * and never collide with the seeded economy's `aq:i-*` ids.
 */
export function addDraftIntent(intent: Omit<AqueductIntent, "id">): AqueductIntent {
  _draftCounter += 1;
  const withId: AqueductIntent = { ...intent, id: `aq:u-${_draftCounter}` };
  setState({ draftIntents: [...state.draftIntents, withId] });
  return withId;
}

/** Set the floor (verb #2) — the seat's reserve, respected by every draft's ask card. */
export function setSeatFloor(seatId: string, floorEurPerKg: number | null) {
  const prev = state.prefsBySeat[seatId] ?? defaultPrefs();
  setState({ prefsBySeat: { ...state.prefsBySeat, [seatId]: { ...prev, floorEurPerKg } } });
}

/** Accept a fill (verb #3) — flips the draft to `filled` (SIM). The swarm's match is
 *  accepted; settlement is still a separate human hold-point (verb #4). */
export function acceptFill(intentId: string) {
  setState({
    draftIntents: state.draftIntents.map((d) => (d.id === intentId ? { ...d, status: "filled" } : d)),
  });
}

/** Set disclosure (verb #5) — only the EUDR-status tier is legitimately toggleable; the
 *  two competitively-sensitive tiers are locked at the type level and have no setter. */
export function setShareEudrStatus(seatId: string, value: boolean) {
  const prev = state.prefsBySeat[seatId] ?? defaultPrefs();
  setState({
    prefsBySeat: {
      ...state.prefsBySeat,
      [seatId]: { ...prev, disclosure: { ...prev.disclosure, shareEudrStatus: value } },
    },
  });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): StewardState {
  return state;
}

export function useSteward(): StewardState {
  return useSyncExternalStore(subscribe, getSnapshot);
}

/** The seat's own prefs, defaulted — never returns undefined so the form/verb strip
 *  can bind directly. */
export function selectSeatPrefs(s: StewardState, seatId: string): SeatPrefs {
  return s.prefsBySeat[seatId] ?? defaultPrefs();
}

/** Only this seat's drafts (scoped via `authored.seatId`), newest first. */
export function selectSeatDrafts(s: StewardState, seatId: string): AqueductIntent[] {
  return s.draftIntents
    .filter((d) => d.authored?.seatId === seatId)
    .slice()
    .reverse();
}
