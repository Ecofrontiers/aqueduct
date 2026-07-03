import { ArrowCounterClockwise, Path, Pause, Play, X } from "@phosphor-icons/react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import type { MapRef } from "react-map-gl";
import { useAqueductLots } from "../hooks/useAqueductLots";
import { buildCoopRegistry } from "../sim/tradeFinance.mjs";
import {
  CHAPTERS,
  type ChapterKey,
  jumpToChapter,
  pauseTour,
  playTour,
  replayTour,
  selectActiveChapter,
  selectChapterStatus,
  setAnchorLot,
  setDockOpen,
  useTourStore,
} from "../state/tourStore";
import { AskScreen } from "./AskScreen";
import { type Provenance, ProvenanceChip } from "./Chips";

/**
 * The judge tour, docked — a compact Atlas-styled chapter panel on the map
 * edge (FABLE-KICKOFF supersession §4). It drives camera and map emphasis
 * through the shared tourStore; the app is fully usable without it, and it
 * never floats over unrelated pages (it lives inside the map view's layout).
 */
export function TourDock({ mapRef }: { mapRef: React.RefObject<MapRef> }): React.ReactElement | null {
  const tour = useTourStore();
  const { lots } = useAqueductLots({ liveRefetch: false });
  // Dock visibility lives in the store — the trigger is the Header's
  // Tour/Docs/Deck pill group. When closed, this component renders nothing.
  const open = tour.dockOpen;

  // Feed the anchor lot into the store once the real reads land.
  useEffect(() => {
    if (lots && lots.length > 0) setAnchorLot(lots[0]);
  }, [lots]);

  const activeChapter = selectActiveChapter(tour);
  const chapterStatus = useMemo(() => selectChapterStatus(tour), [tour]);

  // The anchor coop's seat — resolved exactly the way the seat page does, so the
  // Ask's "meet the steward" link always lands on a real /coops/:id (no hardcode).
  const stewardHref = useMemo(() => {
    const coopId = buildCoopRegistry(lots ?? [])[0]?.id;
    return coopId ? `/coops/${coopId}` : null;
  }, [lots]);

  // Camera choreography per beat.
  useEffect(() => {
    if (!tour.started || !tour.anchor) return;
    const map = mapRef.current;
    if (!map) return;
    const a = tour.anchor.map_marker;
    const presets: Partial<Record<ChapterKey, () => void>> = {
      aggregate: () => map.flyTo({ center: [a.longitude, a.latitude], zoom: 6.2, duration: 1400 }),
      verify: () => map.flyTo({ center: [a.longitude, a.latitude], zoom: 8.5, duration: 1400 }),
      price: () => map.flyTo({ center: [a.longitude, a.latitude], zoom: 7, duration: 1200 }),
      publish: () => map.flyTo({ center: [a.longitude + 3, a.latitude + 2], zoom: 4.8, duration: 1400 }),
      fill: () => map.flyTo({ center: [a.longitude, a.latitude], zoom: 6, duration: 1200 }),
      settle: () =>
        map.fitBounds(
          [
            [Math.min(a.longitude, 9.99) - 4, Math.min(a.latitude, 53.55) - 4],
            [Math.max(a.longitude, 9.99) + 4, Math.max(a.latitude, 53.55) + 4],
          ],
          { padding: 60, duration: 1600 },
        ),
      // Generalize: leave Chiapas entirely and fly to the US Glow solar cluster —
      // the two Florida farms (Auric Peninsula ~-81.58,26.53; Golden Crossing
      // ~-80.41,27.62). Their solar glyphs are always on the map (GlowFarmsLayer),
      // so the claim "same loop, second commodity" is shown, not just told.
      generalize: () =>
        map.fitBounds(
          [
            [-81.58 - 1.2, 26.53 - 1.2],
            [-80.41 + 1.2, 27.62 + 1.2],
          ],
          { padding: 70, duration: 1600 },
        ),
    };
    presets[activeChapter]?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChapter, tour.started]);

  const events = tour.cascade?.events ?? [];
  const revealed = events.slice(0, tour.revealCount);
  const chapterEvents = revealed.filter((e: { chapter: string }) => e.chapter === activeChapter).slice(-5);
  const done = tour.revealCount >= events.length && events.length > 0;

  // Closed: render nothing — the Header's Tour button reopens the dock.
  if (!open) return null;

  return (
    <div className="absolute bottom-4 right-4 z-10 w-[340px] max-h-[70%] flex flex-col bg-cardBackground border border-gray-200 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 h-9 border-b border-gray-100 shrink-0">
        <span className="text-xs font-bold text-gray-900">One lot, end to end</span>
        <div className="flex items-center gap-1">
          {tour.started &&
            (tour.playing ? (
              <button onClick={pauseTour} className="p-1.5 text-gray-500 hover:text-gray-900" title="Pause">
                <Pause size={13} weight="fill" />
              </button>
            ) : (
              <button onClick={playTour} className="p-1.5 text-gray-500 hover:text-gray-900" title="Play">
                <Play size={13} weight="fill" />
              </button>
            ))}
          {tour.started && (
            <button onClick={replayTour} className="p-1.5 text-gray-500 hover:text-gray-900" title="Replay">
              <ArrowCounterClockwise size={13} />
            </button>
          )}
          <button onClick={() => setDockOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-700" title="Close">
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Chapter stepper */}
      {/* All 8 chapters visible at once (wrap, don't scroll) — the Generalize and
          Ask beats are the strongest content; hiding them off the right edge
          undersold the tour (certification finding, 2026-07-03). */}
      <div className="flex items-center flex-wrap gap-1 px-3 py-2 border-b border-gray-100 shrink-0">
        {CHAPTERS.map((ch, i) => {
          const status = chapterStatus[ch.key];
          return (
            <button
              key={ch.key}
              onClick={() => jumpToChapter(ch.key)}
              className={`shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full transition-colors ${
                activeChapter === ch.key && tour.started
                  ? "bg-blue-600 text-white"
                  : status === "done"
                    ? "bg-blue-50 text-blue-700"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {i + 1} {ch.label}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3.5 py-3">
        {!tour.started ? (
          <div className="space-y-3">
            <p className="text-xs text-gray-600 leading-relaxed">
              Watch agents take one real coffee lot end to end: scouts read it live from EthicHub, a diligence agent
              checks it, an oracle floors it, solvers race to fill it, and the settle leg is prepared onchain—posted by
              the farmer's steward, which negotiates but never settles. The same loop then jumps to real Glow solar
              farms: two commodities, one schema. Live reads and simulation are labeled at every step.
            </p>
            <button
              onClick={playTour}
              disabled={!tour.cascade}
              className="w-full py-2 bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {tour.cascade ? "Start the cascade" : "Loading the live reads…"}
            </button>
            {tour.cascadeError && <p className="text-[11px] text-red-600">{tour.cascadeError}</p>}
          </div>
        ) : tour.showAsk ? (
          <AskScreen
            onReplay={replayTour}
            lotsAggregated={tour.vaultCount}
            settleTxHref={null}
            stewardHref={stewardHref}
          />
        ) : (
          <div className="space-y-1.5">
            {activeChapter === "generalize" && (
              <p className="text-[11px] text-gray-600 leading-relaxed mb-1">
                Same loop, second commodity. These are real Glow solar farms — live public reads: coordinates, panels,
                output. A finance-this-farm intent carries real observed terms ($399 → ~43.6 GLW/week × 89 weeks,
                reported). Reads live; fills simulated and labeled — one settled over oceans, one over wires.
              </p>
            )}
            {chapterEvents.length === 0 && (
              <p className="text-[11px] text-gray-400">Playing — events land here beat by beat.</p>
            )}
            {chapterEvents.map(
              (e: { prov: string; agent: string; verb: string; object: string; detail?: string }, i: number) => (
                <div key={i} className="bg-gray-50 px-2.5 py-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <ProvenanceChip provenance={e.prov as Provenance} />
                    <span className="text-[11px] font-semibold text-gray-800 aq-mono">{e.agent}</span>
                    <span className="text-[11px] text-gray-500">{e.verb}</span>
                  </div>
                  <div className="text-[11px] text-gray-700 mt-0.5">{e.object}</div>
                  {e.detail && <div className="text-[10px] text-gray-400 mt-0.5">{e.detail}</div>}
                </div>
              ),
            )}
            {done && !tour.showAsk && (
              <button
                onClick={() => jumpToChapter("ask")}
                className="w-full py-1.5 mt-1 border border-gray-200 text-[11px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                The ask →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
