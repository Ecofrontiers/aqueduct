import React, { useEffect, useRef, useState } from "react";
import { Marker, Source, Layer } from "react-map-gl";
import { useTourStore, selectActiveChapter } from "../state/tourStore";

// Fixed, plausible-real coordinates for swarm-layer nodes around the anchor
// lot's Chiapas origin. Buyer = a generic EU import hub (Hamburg); solvers
// cluster near the lot; the settle arc travels buyer -> cooperative/exporter
// node per DEMO-SPEC.md §5 settle realism (never terminating on the farmer).
const HAMBURG = { longitude: 9.99, latitude: 53.55 };

function glyph(hue: string, filled: boolean, dashed: boolean) {
  return (
    <div
      style={{
        width: 10,
        height: 10,
        borderRadius: filled ? "50%" : "3px",
        background: filled ? hue : "transparent",
        border: `2px ${dashed ? "dashed" : "solid"} ${hue}`,
        boxShadow: "0 0 0 1px rgba(0,0,0,0.35)",
      }}
    />
  );
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/**
 * Swarm-layer map glyphs — DESIGN-BRIEF.md §3. Additive Marker set inside
 * the untouched Atlas MapBox instance (same pattern as AqueductLotsLayer).
 * Renders: solver cluster near the lot during Fill, buyer + venue nodes,
 * the ONE settle arc (buyer -> cooperative/exporter node), and the vault
 * node state-change badge.
 */
export function SwarmMapLayer(): React.ReactElement | null {
  const s = useTourStore();
  const anchor = s.anchor;
  const chapter = selectActiveChapter(s);
  const settleActive = chapter === "settle";
  const vaultCount = s.vaultCount;
  const vaultTotalEur = s.vaultTotalEur;
  const [arcProgress, setArcProgress] = useState(0);
  const animatedRef = useRef(false);

  useEffect(() => {
    if (!settleActive) {
      animatedRef.current = false;
      setArcProgress(0);
      return;
    }
    if (animatedRef.current) return; // celebration budget = 1 per reveal (DESIGN-BRIEF §9.4)
    animatedRef.current = true;
    const start = performance.now();
    const DURATION = 1500;
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      setArcProgress(t);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [settleActive]);

  if (!anchor) return null;

  const coop = { longitude: anchor.map_marker.longitude + 0.6, latitude: anchor.map_marker.latitude - 0.3 };
  const showSolvers = chapter === "fill" || chapter === "settle";
  const showBuyer = chapter === "fill" || chapter === "settle";
  const showVault = chapter === "settle";

  // Arc geometry: a simple quadratic bulge between buyer (Hamburg) and the
  // cooperative/exporter node, drawn to `arcProgress` (DESIGN-BRIEF §3.2:
  // "exactly ONE arc per tour run").
  const midLon = (HAMBURG.longitude + coop.longitude) / 2;
  const midLat = (HAMBURG.latitude + coop.latitude) / 2 + 6; // bulge north
  const steps = 24;
  const fullCoords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lon = lerp(lerp(HAMBURG.longitude, midLon, t), lerp(midLon, coop.longitude, t), t);
    const lat = lerp(lerp(HAMBURG.latitude, midLat, t), lerp(midLat, coop.latitude, t), t);
    fullCoords.push([lon, lat]);
  }
  const visibleCount = Math.max(1, Math.round(fullCoords.length * arcProgress));
  const arcGeojson = {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "LineString" as const, coordinates: fullCoords.slice(0, visibleCount) },
  };

  return (
    <>
      {showSolvers && (
        <>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const angle = (i / 6) * Math.PI * 2;
            const lon = anchor.map_marker.longitude + Math.cos(angle) * 1.1;
            const lat = anchor.map_marker.latitude + Math.sin(angle) * 1.1;
            const isBackstop = i === 5;
            return (
              <Marker key={`solver-${i}`} longitude={lon} latitude={lat} anchor="center">
                <div title={isBackstop ? "@solver-backstop (open reference, REAL computation)" : `@sim-solver-${i + 1}`}>
                  {glyph("#f78c6c", isBackstop, !isBackstop)}
                </div>
              </Marker>
            );
          })}
        </>
      )}
      {showBuyer && (
        <Marker longitude={HAMBURG.longitude} latitude={HAMBURG.latitude} anchor="center">
          <div title="@sim-buyer-eu — standing demand (SIM)">{glyph("#c3e88d", true, true)}</div>
        </Marker>
      )}
      <Marker longitude={coop.longitude} latitude={coop.latitude} anchor="center">
        <div title="cooperative / exporter node — Soconusco (settle credits here, never the farmer directly)">{glyph("#26a69a", chapter === "settle", chapter !== "settle")}</div>
      </Marker>
      {showVault && (
        <Marker longitude={coop.longitude + 0.4} latitude={coop.latitude + 0.4} anchor="center">
          <div
            className="aq-mono"
            title="Aqueduct accumulator vault (SIM, no new contracts)"
            style={{ fontSize: 9, color: "#89ddff", background: "rgba(19,23,34,0.85)", border: "1px solid #89ddff", borderRadius: 4, padding: "2px 5px", whiteSpace: "nowrap" }}
          >
            {vaultCount} lot{vaultCount === 1 ? "" : "s"} · €{vaultTotalEur.toLocaleString()}
          </div>
        </Marker>
      )}
      {settleActive && arcProgress > 0 && (
        <Source id="aq-settle-arc" type="geojson" data={arcGeojson}>
          <Layer
            id="aq-settle-arc-line"
            type="line"
            paint={{ "line-color": "#ffb700", "line-width": 2.5, "line-opacity": 0.9 }}
            layout={{ "line-cap": "round", "line-join": "round" }}
          />
        </Source>
      )}
    </>
  );
}
