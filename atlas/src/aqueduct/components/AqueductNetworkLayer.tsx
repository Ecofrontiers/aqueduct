import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { Layer, Marker, Source, useMap } from "react-map-gl";
import { useNavigate } from "react-router-dom";
import Supercluster from "supercluster";
import { useAqueductLots } from "../hooks/useAqueductLots";
import { getEconomy } from "../sim/economy.mjs";
import { AGROFORESTRY_VENUES, TO_BUILD_PLATFORM_NODES } from "../sim/venues.mjs";
import { matchesInstitution, useAqueductFilters } from "../state/aqueductFiltersStore";
import { selectActiveChapter, useTourStore } from "../state/tourStore";
import { AqueductNodeGlyph } from "./AqueductNodeGlyph";

// Institutions (hub/coop/venue) cluster client-side via supercluster: below the
// individuate zoom they collapse into quiet "N institutions" badges (the deeper
// fix the old INSTITUTION_MARKER_MIN_ZOOM gate only gestured at — dozens of bare
// markers at world zoom is the density that made the map unreadable, research/09).
// Above it, each point renders its typed glyph + NodeRing. The anchor coop is
// exempt (always visible — it's the anchor, not a background institution).
const CLUSTER_MAX_ZOOM = 5; // above this, every institution renders individually
const CLUSTER_RADIUS = 64; // px proximity for collapsing into a badge

// Feature shapes for the institution supercluster. `data` carries the original
// entity so an individuated point can render its glyph, title, and click target.
type HubData = { id: string; name: string; coords: [number, number] };
type CoopData = { id: string; name: string; coords: [number, number] };
type VenueData = {
  name: string;
  kind: string;
  status: string;
  coords: { longitude: number; latitude: number; precision: string };
};
type InstitutionProps =
  | { kind: "hub"; data: HubData }
  | { kind: "coop"; data: CoopData }
  | { kind: "venue"; data: VenueData };
type InstitutionPointFeature = {
  type: "Feature";
  properties: InstitutionProps;
  geometry: { type: "Point"; coordinates: [number, number] };
};
type ClusterFeature = {
  type: "Feature";
  properties: { cluster: true; cluster_id: number; point_count: number; point_count_abbreviated: string | number };
  geometry: { type: "Point"; coordinates: [number, number] };
};

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

export { ACCOUNT_COLORS } from "./accountColors";
import { ACCOUNT_COLORS } from "./accountColors";

type AccountKind = "goods" | "capitalExo" | "settle";

// Calm over complete on the map: top lanes only — the full set stays in the
// rail and ledger. A readable network beats an exhaustive one.
const MAX_STATIC_FLOWS = 80;
const ANIMATED_FLOWS = 10;
const CAPITAL_COUNTER_FLOWS = 8; // paired payment/investment arcs on the top lanes

function bezierArc(from: [number, number], to: [number, number], segments = 32, side: 1 | -1 = 1): [number, number][] {
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
  const filters = useAqueductFilters();
  const tour = useTourStore();
  const chapter = selectActiveChapter(tour);
  const [dashStep, setDashStep] = useState(0);
  const [settleProgress, setSettleProgress] = useState(0);
  const { current: mapRef } = useMap();
  const [zoom, setZoom] = useState(3);
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(null);

  useEffect(() => {
    const t = setInterval(() => setDashStep((s) => (s + 1) % DASH_STEPS.length), 120);
    return () => clearInterval(t);
  }, []);

  // Reactive zoom + bounds — react-map-gl's useMap() is imperative (getZoom() at
  // call time), so subscribe to the underlying mapbox-gl instance's own move event
  // to re-query the institution clusters as the visitor pans/zooms. "move" is a
  // superset of "zoom" (fires for both); setZoom bails when the value is unchanged.
  useEffect(() => {
    if (!mapRef) return;
    const map = mapRef.getMap();
    const update = () => {
      setZoom(map.getZoom());
      const b = map.getBounds();
      if (b) setBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    };
    update();
    map.on("move", update);
    return () => {
      map.off("move", update);
    };
  }, [mapRef]);

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

  // Static institution point set (hubs + coops + venues) — the anchor coop is NOT
  // here; it's rendered always-visible below. Memoized on `economy` identity so the
  // 120ms dashStep re-render never rebuilds it.
  const institutionPoints = useMemo<InstitutionPointFeature[]>(() => {
    // "institutions" category off → empty point set (markers AND the rail's
    // Solvers & Venues section vanish in the same click; the rail gates on the
    // same `activeCategories`). Individual points are gated by `matchesInstitution`
    // (kind + provenance sub-filters). Hubs/coops from the SIM economy carry no
    // kind/provenance field of their own, so we build the minimal match object
    // here — hubs/coops are SIM; a venue's `status` IS its provenance.
    // Dep array is [economy, filters] only — the 120ms dashStep never touches
    // either, so this never recomputes on an animation tick.
    if (!filters.activeCategories.has("institutions")) return [];
    const feats: InstitutionPointFeature[] = [];
    for (const hub of economy.hubs as HubData[]) {
      if (!matchesInstitution({ kind: "hub", provenance: "SIM" }, filters)) continue;
      feats.push({
        type: "Feature",
        properties: { kind: "hub", data: hub },
        geometry: { type: "Point", coordinates: hub.coords },
      });
    }
    for (const coop of economy.coops as CoopData[]) {
      if (!matchesInstitution({ kind: "coop", provenance: "SIM" }, filters)) continue;
      feats.push({
        type: "Feature",
        properties: { kind: "coop", data: coop },
        geometry: { type: "Point", coordinates: coop.coords },
      });
    }
    for (const v of [...AGROFORESTRY_VENUES, ...TO_BUILD_PLATFORM_NODES] as VenueData[]) {
      if (!v.coords) continue;
      if (!matchesInstitution({ kind: "venue", provenance: v.status }, filters)) continue;
      feats.push({
        type: "Feature",
        properties: { kind: "venue", data: v },
        geometry: { type: "Point", coordinates: [v.coords.longitude, v.coords.latitude] },
      });
    }
    return feats;
  }, [economy, filters]);

  // ONE supercluster index, memoized on the point-array identity — the perf-critical
  // line: without this the index rebuilds 8×/sec against the dashStep interval.
  const clusterIndex = useMemo(() => {
    const index = new Supercluster({ radius: CLUSTER_RADIUS, maxZoom: CLUSTER_MAX_ZOOM, minPoints: 2 });
    index.load(institutionPoints);
    return index;
  }, [institutionPoints]);

  // Cluster query, memoized on [index, zoom, bounds] — dashStep ticks leave all three
  // referentially stable, so no re-query per animation frame; only real pan/zoom
  // recomputes. Bounds clamped to the valid world box at low zoom.
  const clusters = useMemo<Array<InstitutionPointFeature | ClusterFeature>>(() => {
    if (!bounds) return [];
    const [w, s, e, n] = bounds;
    const bbox: [number, number, number, number] = [
      Math.max(-180, w),
      Math.max(-85, s),
      Math.min(180, e),
      Math.min(85, n),
    ];
    return clusterIndex.getClusters(bbox, Math.round(zoom)) as Array<InstitutionPointFeature | ClusterFeature>;
  }, [clusterIndex, zoom, bounds]);

  // Arcs are gated by the "routes" category and its intentType sub-filter. The
  // mapping is APPROXIMATE and flagged as such: the arcs are coop-level balance-
  // of-payments aggregates, NOT per-intent edges, so intent types map onto arc
  // ACCOUNTS, not onto individual intents —
  //   sell-this-lot            → goods (current-account) arcs
  //   finance-this-planting/-farm → capitalExo (capital-account) arcs
  // An empty intentType set means "no route sub-filter" → both accounts show.
  const routesActive = filters.activeCategories.has("routes");
  const intentTypes = filters.route.intentTypes;
  const showGoods = intentTypes.size === 0 || intentTypes.has("sell-this-lot");
  const showCapital =
    intentTypes.size === 0 || intentTypes.has("finance-this-planting") || intentTypes.has("finance-this-farm");

  const { staticGeo, activeGeo, arrows } = useMemo(() => {
    const empty = { type: "FeatureCollection" as const, features: [] };
    // "routes" off → no arcs at all (the settle arc is separately gated below).
    if (!routesActive) {
      return {
        staticGeo: empty,
        activeGeo: empty,
        arrows: [] as Array<{ id: string; color: string; at: [number, number]; bearing: number }>,
      };
    }

    const flows = economy.flows as Array<{ from: [number, number]; to: [number, number]; totalKg: number }>;
    const top = flows.slice(0, MAX_STATIC_FLOWS);

    // Current account: goods, origin → hub (sienna). Gated by the sell-this-lot
    // approximation.
    const goods: EdgeLike[] = showGoods ? top.map((f) => ({ ...f, kind: "goods" as const, side: 1 as const })) : [];
    const active = goods.slice(0, ANIMATED_FLOWS);
    const rest = goods.slice(ANIMATED_FLOWS);

    // Capital account, exogenous: paired counter-arcs on the busiest lanes —
    // payment/investment flowing back hub → origin, opposite curvature so the
    // pair reads as a circuit, not an overlap. Gated by the finance-* approximation.
    const capital: EdgeLike[] = showCapital
      ? top.slice(0, CAPITAL_COUNTER_FLOWS).map((f) => ({
          from: f.to,
          to: f.from,
          totalKg: f.totalKg * 0.8,
          kind: "capitalExo" as const,
          side: 1 as const, // same geometric side as its pair's reverse = visually opposite
        }))
      : [];

    // Anchor detail: real lots → coop (goods), Silvi → community (exogenous capital).
    const anchor = realLots?.[0];
    const anchorEdges: EdgeLike[] = [];
    if (anchor) {
      const coop: [number, number] = [anchor.map_marker.longitude + 0.6, anchor.map_marker.latitude - 0.3];
      if (showGoods) {
        for (const lot of realLots ?? []) {
          anchorEdges.push({
            from: [lot.map_marker.longitude, lot.map_marker.latitude],
            to: coop,
            totalKg: 5000,
            kind: "goods",
          });
        }
      }
      const silvi = AGROFORESTRY_VENUES[0] as { coords?: { longitude: number; latitude: number } };
      if (showCapital && silvi?.coords) {
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
  }, [economy, realLots, routesActive, showGoods, showCapital]);

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
            // Quiet the animated circuits pre-cascade (cold load reads as decoration
            // otherwise); they resolve to full flow the moment the tour starts.
            "line-opacity": tour.started ? 0.9 : 0.25,
            "line-dasharray": DASH_STEPS[dashStep],
          }}
          layout={{ "line-cap": "round", "line-join": "round" }}
        />
      </Source>

      {/* ── The settle arc (tour Settle beat) — a route, so it draws only when
          "routes" is on. The tour stays exempt from filters for EMPHASIS (the
          solver ring, the always-visible anchor coop), but it never resurrects a
          filtered-out category: with routes off the tour still plays, this arc
          just doesn't render (no error). ── */}
      {routesActive && settleActive && settleGeo && settleProgress > 0 && (
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
        <Marker
          key={a.id}
          longitude={a.at[0]}
          latitude={a.at[1]}
          anchor="center"
          rotation={a.bearing}
          rotationAlignment="map"
        >
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

      {/* ── Institutions (hub/coop/venue), client-side clustered ──
          Below the individuate zoom, a region collapses into a quiet "N institutions"
          badge (click zooms in); above it, each point renders its typed glyph. Identity
          is the icon+color (stable); the coop's NodeRing carries transient capital-
          account state. The anchor coop is rendered separately below (always visible). */}
      {clusters.map((c) => {
        const [lng, lat] = c.geometry.coordinates;
        if ("cluster" in c.properties && c.properties.cluster) {
          const count = c.properties.point_count;
          return (
            <Marker
              key={`aq-inst-cluster-${c.properties.cluster_id}`}
              longitude={lng}
              latitude={lat}
              anchor="center"
              onClick={(e) => {
                e.originalEvent?.stopPropagation();
                const map = mapRef?.getMap();
                if (map) map.easeTo({ center: [lng, lat], zoom: map.getZoom() + 2, duration: 500 });
              }}
            >
              {/* Numbered-circle cluster badge — the map's shared cluster idiom
                  (cf. the SIM-lot GL clusters: white fill, colored 2px stroke,
                  count centered). Venue-purple ring keys it to the institutions
                  category; the words live in the tooltip so the map stays quiet. */}
              <div
                title={`${count} institutions — click to zoom (SIM network)`}
                style={{
                  width: 28,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#111827",
                  background: "rgba(255,255,255,0.95)",
                  border: `2px solid ${ACCOUNT_COLORS.venue}`,
                  borderRadius: "50%",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                  cursor: "pointer",
                }}
              >
                {count}
              </div>
            </Marker>
          );
        }

        const props = c.properties;
        if (props.kind === "hub") {
          const hub = props.data;
          return (
            <Marker key={`aq-inst-hub-${hub.id}`} longitude={lng} latitude={lat} anchor="center">
              <AqueductNodeGlyph
                kind="hub"
                title={`${hub.name} — import demand hub (SIM): goods land here, capital enters here`}
              />
            </Marker>
          );
        }

        if (props.kind === "coop") {
          const coop = props.data;
          const capState = coopCapitalState.get(coop.id);
          return (
            <Marker
              key={`aq-inst-coop-${coop.id}`}
              longitude={lng}
              latitude={lat}
              anchor="center"
              onClick={(e) => {
                e.originalEvent?.stopPropagation();
                navigate(`/coops/${coop.id}`);
              }}
            >
              <NodeRing
                color={
                  capState === "facility"
                    ? ACCOUNT_COLORS.capitalEndo
                    : capState === "opportunity"
                      ? ACCOUNT_COLORS.capitalExo
                      : null
                }
                dashed={capState === "opportunity"}
                title={
                  capState === "facility"
                    ? `${coop.name} — endogenous credit facility active (SIM) · open the coop seat`
                    : capState === "opportunity"
                      ? `${coop.name} — open financing opportunity (SIM) · open the coop seat`
                      : `${coop.name} (SIM) — open the coop seat`
                }
              >
                <AqueductNodeGlyph kind="coop" clickable />
              </NodeRing>
            </Marker>
          );
        }

        // venue
        const v = props.data;
        const toBuild = v.status === "TO-BUILD";
        return (
          <Marker key={`aq-inst-venue-${v.name}`} longitude={lng} latitude={lat} anchor="center">
            <AqueductNodeGlyph
              kind="venue"
              dashed={toBuild}
              opacity={toBuild ? 0.5 : 1}
              title={`${v.name} — ${v.kind} (${v.status}, position ${v.coords.precision})`}
            />
          </Marker>
        );
      })}

      {/* Anchor coop: the REAL endogenous facility — Celo USDC credit lines. Same
          coop glyph as every other coop; ring + fill carry the meaning.
          Always visible regardless of zoom — this is the anchor, not a background
          institution. */}
      {anchorCoop && (
        <Marker longitude={anchorCoop[0]} latitude={anchorCoop[1]} anchor="center">
          <NodeRing
            color={ACCOUNT_COLORS.capitalEndo}
            title="Cooperative / exporter node — Soconusco. Endogenous credit facility REAL: EthicHub credit lines on Celo settle in USDC (line 2 completed a 192,600 → 212,369.79 repay cycle). Settle credits the coop, never the farmer directly."
          >
            <AqueductNodeGlyph
              kind="coop"
              size={24}
              // On settle, the chip fills sienna (goods landing) with a white icon —
              // the same "filled" cue the old primitive carried.
              iconColor={settleActive ? "#ffffff" : undefined}
              style={settleActive ? { background: ACCOUNT_COLORS.goods } : undefined}
            />
          </NodeRing>
        </Marker>
      )}

      {/* ── Tour emphasis: the race, charted as ONE ring on the anchor itself —
          not six new markers. A pulsing halo around the existing lot marker IS
          the "solvers are racing" signal; spawning satellites around it doesn't
          chart any account value, it's noise on top of the real one. ── */}
      {showSolverRing && anchor && (
        <Marker longitude={anchor.map_marker.longitude} latitude={anchor.map_marker.latitude} anchor="center">
          <div
            title="Solver race live — bids competing for this lot's route (SIM), backstop bids the real reference"
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              border: `2px dashed ${ACCOUNT_COLORS.venue}`,
              opacity: 0.7,
            }}
          />
        </Marker>
      )}

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
