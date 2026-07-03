import { useSyncExternalStore } from "react";
import type { AqueductLotSnapshot } from "../hooks/useAqueductLots";
import { buildCascade } from "../sim/cascade.mjs";

export const CHAPTERS = [
  { key: "aggregate", label: "Aggregate" },
  { key: "verify", label: "Verify" },
  { key: "price", label: "Price" },
  { key: "publish", label: "Publish" },
  { key: "fill", label: "Fill" },
  { key: "settle", label: "Settle" },
  { key: "ask", label: "Ask" },
] as const;

export type ChapterKey = (typeof CHAPTERS)[number]["key"];

interface TourState {
  anchor: AqueductLotSnapshot | null;
  cascade: Awaited<ReturnType<typeof buildCascade>> | null;
  cascadeError: string | null;
  revealCount: number;
  playing: boolean;
  started: boolean;
  welcomeDismissed: boolean;
  showAsk: boolean;
  vaultCount: number;
  vaultTotalEur: number;
  runToken: number;
}

/** Vault accumulation persists across replays (DESIGN-BRIEF.md §3.2:
 *  "the count persists across replays, so repeated runs visibly
 *  accumulate" — GitLab update-don't-replace, applied to a map node). */
function loadVaultState(): { count: number; totalEur: number; countedRun: number } {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem("aq-vault-state") : null;
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { count: 0, totalEur: 0, countedRun: -1 };
}
function saveVaultState(v: { count: number; totalEur: number; countedRun: number }) {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem("aq-vault-state", JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

/**
 * Module-level singleton store for the tour — NOT React context. Two
 * independent mount points need the SAME live cascade/playback state without
 * either owning the other: the TourDock (docked panel, sibling after the
 * Atlas MapBox) and the AqueductNetworkLayer (map emphasis: solver ring,
 * settle arc, vault badge — a MapBox child deep in Explore.tsx's JSX). A
 * tiny external store (`useSyncExternalStore`, the same primitive
 * React/zustand use internally) lets both stay simple insertions.
 */
const _initialVault = loadVaultState();
let state: TourState = {
  anchor: null,
  cascade: null,
  cascadeError: null,
  revealCount: 0,
  playing: false,
  started: false,
  welcomeDismissed: false,
  showAsk: false,
  vaultCount: _initialVault.count,
  vaultTotalEur: _initialVault.totalEur,
  runToken: 0,
};
let _countedRun = _initialVault.countedRun;

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function emit() {
  for (const l of listeners) l();
}

function setState(patch: Partial<TourState>) {
  state = { ...state, ...patch };
  emit();
}

function stopTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function startTimer() {
  stopTimer();
  const cadence = state.cascade?.meta?.cadenceMs ?? 2500;
  timer = setInterval(() => {
    const events = state.cascade?.events ?? [];
    if (state.revealCount >= events.length) {
      setState({ playing: false });
      stopTimer();
      return;
    }
    const newCount = state.revealCount + 1;
    const justRevealed = events[newCount - 1];
    let vaultPatch: Partial<TourState> = {};
    if (justRevealed?.verb === "accumulated" && _countedRun !== state.runToken) {
      _countedRun = state.runToken;
      const lotValueEur = state.anchor?.price ? Math.round(state.anchor.price.amount * 70) : 0;
      const nextCount = state.vaultCount + 1;
      const nextTotal = state.vaultTotalEur + lotValueEur;
      saveVaultState({ count: nextCount, totalEur: nextTotal, countedRun: state.runToken });
      vaultPatch = { vaultCount: nextCount, vaultTotalEur: nextTotal };
    }
    setState({ revealCount: newCount, ...vaultPatch });
  }, cadence);
}

export function setAnchorLot(anchor: AqueductLotSnapshot) {
  if (state.anchor && state.anchor.aqueduct_id === anchor.aqueduct_id) return;
  setState({ anchor });
  buildCascade(anchor)
    .then((cascade) => setState({ cascade, cascadeError: null }))
    .catch((err) => setState({ cascadeError: String(err?.message ?? err) }));
}

export function dismissWelcome() {
  setState({ welcomeDismissed: true });
}

export function playTour() {
  if (!state.cascade || state.cascade.events.length === 0) return;
  setState({ started: true, playing: true, showAsk: false, runToken: state.runToken + 1 });
  startTimer();
}

export function pauseTour() {
  setState({ playing: false });
  stopTimer();
}

export function replayTour() {
  setState({ revealCount: 0, started: true, playing: true, showAsk: false, runToken: state.runToken + 1 });
  startTimer();
}

export function jumpToChapter(key: ChapterKey) {
  if (key === "ask") {
    setState({ showAsk: true, playing: false });
    stopTimer();
    return;
  }
  const events = state.cascade?.events ?? [];
  const idx = events.findIndex((e) => e.chapter === key);
  if (idx === -1) return;
  setState({
    started: true,
    revealCount: Math.max(idx + 1, state.revealCount),
    playing: true,
    showAsk: false,
  });
  startTimer();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): TourState {
  return state;
}

export function useTourStore(): TourState {
  return useSyncExternalStore(subscribe, getSnapshot);
}

/** Derived selectors, computed fresh from the current snapshot (cheap — small arrays). */
export function selectChapterStatus(s: TourState): Record<string, "done" | "active" | "upcoming"> {
  const events = s.cascade?.events ?? [];
  const ranges: Record<string, { start: number; end: number }> = {};
  events.forEach((e, i) => {
    if (!ranges[e.chapter]) ranges[e.chapter] = { start: i, end: i };
    ranges[e.chapter].end = i;
  });
  const status: Record<string, "done" | "active" | "upcoming"> = {};
  for (const ch of CHAPTERS) {
    if (ch.key === "ask") {
      status[ch.key] = s.showAsk
        ? "active"
        : s.revealCount >= events.length && events.length > 0
          ? "upcoming"
          : "upcoming";
      continue;
    }
    const range = ranges[ch.key];
    if (!range) {
      status[ch.key] = "upcoming";
      continue;
    }
    if (s.revealCount > range.end) status[ch.key] = "done";
    else if (s.revealCount > range.start) status[ch.key] = "active";
    else status[ch.key] = "upcoming";
  }
  return status;
}

export function selectActiveChapter(s: TourState): ChapterKey {
  if (s.showAsk) return "ask";
  const events = s.cascade?.events ?? [];
  const revealed = events.slice(0, s.revealCount);
  const last = revealed[revealed.length - 1];
  return (last?.chapter as ChapterKey) ?? "aggregate";
}
