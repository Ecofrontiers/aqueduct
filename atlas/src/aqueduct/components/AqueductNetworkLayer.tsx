import React, { useEffect, useMemo, useState } from "react";
import { Marker, Source, Layer } from "react-map-gl";
import { useNavigate } from "react-router-dom";
import { useAqueductLots } from "../hooks/useAqueductLots";
import { getEconomy } from "../sim/economy.mjs";
import { AGROFORESTRY_VENUES, TO_BUILD_PLATFORM_NODES } from "../sim/venues.mjs";
import { useTourStore, selectActiveChapter } from "../state/tourStore";

/**
 * The Aqueduct network layer — the map as a balance of payments, not just
 * logistics. Two circuits over the same earth, colored by ACCOUNT:
 *
 *   CURRENT ACCOUNT (goods)            sienna   — commodity legs, origin → hub
 *   CAPITAL ACCOUNT, exogenous         indigo   — investment/payment entering
 *                                                 from outside, hub → origin
 *                                                 (paired counter-arcs on trade
 *                                                 lanes, opposite curvature)
 *   CAPITAL ACCOUNT, endogenous        emerald  — credit created INSIDE the
 *                                                 system against receivables;
 *                                                 it revolves, it doesn't cross
 *                                                 oceans → rings at the coop
 *   SETTLE (onchain)                   Atlas blue — the tour's one arc
 *
 * Relationship status is line-style: SOLID = existing relation,
 * DASHED = opportunity (eligible/open, not yet filled). The anchor coop's
 * emerald ring is REAL — the Celo USDC credit lines (research/03, decoded).
 *
 * Cartography per Jenny et al. 2017 (curved node-to-node arcs, arrowheads at
 * destination, width ∝ quantity, paired opposite curvature for two-way pairs).
 */

export const ACCOUNT_COLORS = {
  goods: "#b45309",
  capitalExo: "#4f46e5",
  capitalEndo: "#059669",
  settle: "rgb(23, 127, 224)",
  venue: "#9333ea",
} as const;

type AccountKind = "goods" | "capitalExo" | "settle";

// Calm over complete on the map: top lanes only — the full set stays in the
// rail and ledger. A readable network beats an exhaustive one.
const MAX_STATIC_FLOWS = 80;
const ANIMATED_FLOWS = 10;
const CAPITAL_COUNTER_FLOWS = 8; // paired payment/investment arcs on the top lanes

function bezierArc(
  from: [number, number],
  to: [number, number],
  segments = 32,
  side: 1 | -1 = 1
): [number, number][] {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dist = Math.sqrt(dx * dx + dy * dy);
  const offset = Math.min(dist * 0.12, 7) * side;
  const mx = (from[0] + to[0]) / 2 - (dy / (dist || 1)) * offset;
  const my = (from[1] + to[1]) / 2 + (dx / (dist || 1)) * offset;
  const pts: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = 1 - t;
    pts.push([a * a * from[0] + 2 * a * t * mx + t * t * to[0], a * a * from[1] + 2 * a * t * my + t * t * to[1]]);
  }
  return pts;
}

function arrowFor(pts: [number, number][]): { at: [number, number]; bearing: number } {
  const i = Math.max(1, Math.floor(pts.length * 0.94));
  const [x1, y1] = pts[i - 1];
  const [x2, y2] = pts[i];
  return { at: pts[i], bearing: (Math.atan2(x2 - x1, y2 - y1) * 180) / Math.PI };
}

const DASH_STEPS: number[][] = [
  [0, 4, 3],
  [0.5, 4, 2.5],
  [1, 4, 2],
  [1.5, 4, 1.5],
  [2, 4, 1],
  [2.5, 4, 0.5],
  [3, 4, 0],
  [0, 0.5, 3, 3.5],
];

interface EdgeLike {
  from: [number, number];
  to: [number, number];
  totalKg: number;
  kind: AccountKind;
  side?: 1 | -1;
}

function edgesToGeojson(edges: EdgeLike[]) {
  // Width ∝ quantity: 2t → 0.6px, 120t → 3px.
  const w = (kg: number) => Math.max(0.6, Math.min(3, 0.6 + (kg / 120000) * 2.4));
  return {
    type: "FeatureCollection" as const,
    features: edges.map((e) => ({
      type: "Feature" as const,
      properties: { width: w(e.totalKg), color: ACCOUNT_COLORS[e.kind] },
      geometry: { type: "LineString" as const, coordinates: bezierArc(e.from, e.to, 32, e.side ?? 1) },
    })),
  };
}

/** Ring wrapper — the endogenous-credit / opportunity halo around a node. */
function NodeRing({
  color,
  dashed,
  title,
  children,
}: {
  color: string | null;
  dashed?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  if (!color) return <>{children}</>;
  return (
    <div
      title={title}
      style={{
        padding: 3,
        borderRadius: "50%",
        border: `2px ${dashed ? "dashed" : "solid"} ${color}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </div>
  );
}

export function AqueductNetworkLayer(): React.ReactElement | null {
  const { lots: realLots } = useAqueductLots({ liveRefetch: false });
  const navigate = useNavigate();
  const tour = useTourStore();
  const chapter = selectActiveChapter(tour);
  const [dashStep, setDashStep] = useState(0);
  const [settleProgress, setSettleProgress] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setDashStep((s) => (s + 1) % DASH_STEPS.length), 120);
    return () => clearInterval(t);
  }, []);

  const settleActive = tour.started && chapter === "settle";
  useEffect(() => {
    if (!settleActive) {
      setSettleProgress(0);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1500);
      setSettleProgress(t);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [settleActive]);

  const economy = useMemo(() => getEconomy(), []);

  // Per-coop capital-account state from the finance intents:
  // filled → endogenous facility active (solid emerald ring);
  // open only → opportunity (dashed indigo ring).
  const coopCapitalState = useMemo(() => {
    const state = new Map<string, "facility" | "opportunity">();
    for (const intent of economy.intents as Array<{ intentType: string; status?: string; coopId?: string }>) {
      if (intent.intentType !== "finance-this-planting" || !intent.coopId) continue;
      const prev = state.get(intent.coopId);
      if (intent.status === "filled") state.set(intent.coopId, "facility");
      else if (!prev) state.set(intent.coopId, "opportunity");
    }
    return state;
  }, [economy]);

  const { staticGeo, activeGeo, arrows } = useMemo(() => {
    const flows = economy.flows as Array<{ from: [number, number]; to: [number, number]; totalKg: number }>;
    const top = flows.slice(0, MAX_STATIC_FLOWS);

    // Current account: goods, origin → hub (sienna).
    const goods: EdgeLike[] = top.map((f) => ({ ...f, kind: "goods" as const, side: 1 as const }));
    const active = goods.slice(0, ANIMATED_FLOWS);
    const rest = goods.slice(ANIMATED_FLOWS);

    // Capital account, exogenous: paired counter-arcs on the busiest lanes —
    // payment/investment flowing back hub → origin, opposite curvature so the
    // pair reads as a circuit, not an overlap.
    const capital: EdgeLike[] = top.slice(0, CAPITAL_COUNTER_FLOWS).map((f) => ({
      from: f.to,
      to: f.from,
      totalKg: f.totalKg * 0.8,
      kind: "capitalExo" as const,
      side: 1 as const, // same geometric side as its pair's reverse = visually opposite
    }));

    // Anchor detail: real lots → coop (goods), Silvi → community (exogenous capital).
    const anchor = realLots?.[0];
    const anchorEdges: EdgeLike[] = [];
    if (anchor) {
      const coop: [number, number] = [anchor.map_marker.longitude + 0.6, anchor.map_marker.latitude - 0.3];
      for (const lot of realLots ?? []) {
        anchorEdges.push({
          from: [lot.map_marker.longitude, lot.map_marker.latitude],
          to: coop,
          totalKg: 5000,
          kind: "goods",
        });
      }
      const silvi = AGROFORESTRY_VENUES[0] as { coords?: { longitude: number; latitude: number } };
      if (silvi?.coords) {
        anchorEdges.push({
          from: [silvi.coords.longitude, silvi.coords.latitude],
          to: [anchor.map_marker.longitude, anchor.map_marker.latitude],
          totalKg: 40000,
          kind: "capitalExo",
        });
      }
    }

    const animated = [...active, ...capital, ...anchorEdges];
    const arrowList = animated.map((e, i) => ({
      id: `arrow-${i}`,
      color: ACCOUNT_COLORS[e.kind],
      ...arrowFor(bezierArc(e.from, e.to, 32, e.side ?? 1)),
    }));

    return {
      staticGeo: edgesToGeojson(rest),
      activeGeo: edgesToGeojson(animated),
      arrows: arrowList,
    };
  }, [economy, realLots]);

  const settleGeo = useMemo(() => {
    const anchor = realLots?.[0];
    if (!anchor) return null;
    const coop: [number, number] = [anchor.map_marker.longitude + 0.6, anchor.map_marker.latitude - 0.3];
    const pts = bezierArc([9.99, 53.55], coop, 40);
    return (progress: number) => ({
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: pts.slice(0, Math.max(2, Math.round(pts.length * progress))),
      },
    });
  }, [realLots]);

  const anchor = realLots?.[0];
  const anchorCoop: [number, number] | null = anchor
    ? [anchor.map_marker.longitude + 0.6, anchor.map_marker.latitude - 0.3]
    : null;
  const showSolverRing = tour.started && (chapter === "fill" || chapter === "settle") && anchor;

  return (
    <>
      {/* ── Background lanes (current account) ── */}
      <Source id="aq-net-static" type="geojson" data={staticGeo}>
        <Layer
          id="aq-net-static-lines"
          type="line"
          paint={{ "line-color": ["get", "color"], "line-width": ["get", "width"], "line-opacity": 0.18 }}
          layout={{ "line-cap": "round", "line-join": "round" }}
        />
      </Source>

      {/* ── Active circuits: goods out, capital back ── */}
      <Source id="aq-net-active" type="geojson" data={activeGeo}>
        <Layer
          id="aq-net-active-base"
          type="line"
          paint={{ "line-color": ["get", "color"], "line-width": ["get", "width"], "line-opacity": 0.22 }}
          layout={{ "line-cap": "round", "line-join": "round" }}
        />
        <Layer
          id="aq-net-active-dash"
          type="line"
          paint={{
            "line-color": ["get", "color"],
            "line-width": ["get", "width"],
            "line-opacity": 0.9,
            "line-dasharray": DASH_STEPS[dashStep],
          }}
          layout={{ "line-cap": "round", "line-join": "round" }}
        />
      </Source>

      {/* ── The settle arc (tour Settle beat) ── */}
      {settleActive && settleGeo && settleProgress > 0 && (
        <Source id="aq-settle-arc" type="geojson" data={settleGeo(settleProgress)}>
          <Layer
            id="aq-settle-arc-line"
            type="line"
            paint={{ "line-color": ACCOUNT_COLORS.settle, "line-width": 2.5, "line-opacity": 0.95 }}
            layout={{ "line-cap": "round", "line-join": "round" }}
          />
        </Source>
      )}

      {/* ── Arrowheads at destinations ── */}
      {arrows.map((a) => (
        <Marker key={a.id} longitude={a.at[0]} latitude={a.at[1]} anchor="center" rotation={a.bearing} rotationAlignment="map">
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "4px solid transparent",
              borderRight: "4px solid transparent",
              borderBottom: `8px solid ${a.color}`,
              opacity: 0.9,
            }}
          />
        </Marker>
      ))}

      {/* ── Demand hubs: where exogenous capital enters ── */}
      {(economy.hubs as Array<{ id: string; name: string; coords: [number, number] }>).map((hub) => (
        <Marker key={hub.id} longitude={hub.coords[0]} latitude={hub.coords[1]} anchor="center">
          <div
            title={`${hub.name} — import demand hub (SIM): goods land here, capital enters here`}
            style={{
              width: 13,
              height: 13,
              borderRadius: "50%",
              background: ACCOUNT_COLORS.capitalExo,
              border: "2px solid #ffffff",
              boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
            }}
          />
        </Marker>
      ))}

      {/* ── Coops: outline = capital-account state ── */}
      {(economy.coops as Array<{ id: string; name: string; coords: [number, number] }>).map((coop) => {
        const capState = coopCapitalState.get(coop.id);
        return (
          <Marker
            key={coop.id}
            longitude={coop.coords[0]}
            latitude={coop.coords[1]}
            anchor="center"
            onClick={(e) => {
              e.originalEvent?.stopPropagation();
              navigate(`/coops/${coop.id}`);
            }}
          >
            <NodeRing
              color={capState === "facility" ? ACCOUNT_COLORS.capitalEndo : capState === "opportunity" ? ACCOUNT_COLORS.capitalExo : null}
              dashed={capState === "opportunity"}
              title={
                capState === "facility"
                  ? `${coop.name} — endogenous credit facility active (SIM) · open the coop seat`
                  : capState === "opportunity"
                  ? `${coop.name} — open financing opportunity (SIM) · open the coop seat`
                  : `${coop.name} (SIM) — open the coop seat`
              }
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: "#ffffff",
                  border: `2px solid ${ACCOUNT_COLORS.goods}`,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                  cursor: "pointer",
                }}
              />
            </NodeRing>
          </Marker>
        );
      })}

      {/* Anchor coop: the REAL endogenous facility — Celo USDC credit lines */}
      {anchorCoop && (
        <Marker longitude={anchorCoop[0]} latitude={anchorCoop[1]} anchor="center">
          <NodeRing
            color={ACCOUNT_COLORS.capitalEndo}
            title="Cooperative / exporter node — Soconusco. Endogenous credit facility REAL: EthicHub credit lines on Celo settle in USDC (line 2 completed a 192,600 → 212,369.79 repay cycle). Settle credits the coop, never the farmer directly."
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: settleActive ? ACCOUNT_COLORS.goods : "#ffffff",
                border: `2.5px solid ${ACCOUNT_COLORS.goods}`,
                boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
              }}
            />
          </NodeRing>
        </Marker>
      )}

      {/* ── Venues: purple squares; TO-BUILD dashed + faded ── */}
      {[...AGROFORESTRY_VENUES, ...TO_BUILD_PLATFORM_NODES]
        .filter((v: { coords?: { longitude: number; latitude: number } }) => v.coords)
        .map((v: { name: string; kind: string; status: string; coords: { longitude: number; latitude: number; precision: string } }) => (
          <Marker key={`venue-${v.name}`} longitude={v.coords.longitude} latitude={v.coords.latitude} anchor="center">
            <div
              title={`${v.name} — ${v.kind} (${v.status}, position ${v.coords.precision})`}
              style={{
                width: 11,
                height: 11,
                borderRadius: 2,
                background: v.status === "TO-BUILD" ? "transparent" : ACCOUNT_COLORS.venue,
                border: `2px ${v.status === "TO-BUILD" ? "dashed" : "solid"} ${ACCOUNT_COLORS.venue}`,
                opacity: v.status === "TO-BUILD" ? 0.5 : 1,
                boxShadow: v.status === "TO-BUILD" ? "none" : "0 1px 2px rgba(0,0,0,0.25)",
              }}
            />
          </Marker>
        ))}

      {/* ── Tour emphasis: solver ring around the anchor during Fill/Settle ── */}
      {showSolverRing &&
        [0, 1, 2, 3, 4, 5].map((i) => {
          const angle = (i / 6) * Math.PI * 2;
          const lon = anchor!.map_marker.longitude + Math.cos(angle) * 1.1;
          const lat = anchor!.map_marker.latitude + Math.sin(angle) * 1.1;
          const isBackstop = i === 5;
          return (
            <Marker key={`race-solver-${i}`} longitude={lon} latitude={lat} anchor="center">
              <div
                title={isBackstop ? "@solver-backstop — open reference, REAL computation" : `@sim-solver-${i + 1} (SIM)`}
                style={{
                  width: 11,
                  height: 11,
                  background: isBackstop ? ACCOUNT_COLORS.venue : "#ffffff",
                  border: `2px ${isBackstop ? "solid" : "dashed"} ${ACCOUNT_COLORS.venue}`,
                  transform: "rotate(45deg)",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                }}
              />
            </Marker>
          );
        })}

      {/* ── Vault badge during Settle ── */}
      {settleActive && anchorCoop && tour.vaultCount > 0 && (
        <Marker longitude={anchorCoop[0] + 0.4} latitude={anchorCoop[1] + 0.4} anchor="center">
          <div
            className="aq-mono"
            title="Aqueduct accumulator vault (SIM, no new contracts)"
            style={{
              fontSize: 10,
              color: "#374151",
              background: "rgba(255,255,255,0.95)",
              border: "1px solid #d1d5db",
              borderRadius: 4,
              padding: "2px 6px",
              whiteSpace: "nowrap",
              boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
            }}
          >
            {tour.vaultCount} lot{tour.vaultCount === 1 ? "" : "s"} · €{tour.vaultTotalEur.toLocaleString()}
          </div>
        </Marker>
      )}
    </>
  );
}
