import { useMemo } from "react";
import type { Provenance } from "../components/Chips";
import { getEconomy } from "../sim/economy.mjs";
import { buildFinanceIntent } from "../sim/financeIntent.mjs";
import { buildCoopRegistry } from "../sim/tradeFinance.mjs";
import { AGROFORESTRY_VENUES, REGISTRAR_NODE, TO_BUILD_PLATFORM_NODES, VAULT_NODE } from "../sim/venues.mjs";
import { type AqueductLotSnapshot, useAqueductLots } from "./useAqueductLots";

/** A lot from either surface: real EthicHub read or the seeded SIM economy. */
export type AqueductAnyLot = AqueductLotSnapshot & {
  sim?: boolean;
  commodity?: "coffee" | "cacao" | "honey";
  weight_kg?: number;
};

export interface AqueductIntent {
  id: string;
  intentType: "sell-this-lot" | "finance-this-planting";
  status?: "open" | "filled" | "settled";
  title: string;
  detail: string;
  provenance: Provenance;
  lotId?: string;
  coordinates?: { longitude: number; latitude: number };
}

export interface AqueductActor {
  id: string;
  kind: "solver" | "venue" | "infrastructure" | "coop";
  name: string;
  role: string;
  provenance: Provenance;
  detail?: string;
  winRatePct?: number;
  coordinates?: { longitude: number; latitude: number };
}

export interface AqueductEvent {
  ts: number;
  actor: string;
  verb: string;
  summary: string;
  provenance: Provenance;
  lotId?: string;
}

const SIM_LOT_DEFAULTS = {
  ico_mark: null,
  identity_stage: "green",
  altitude_masl: null,
  process: null,
  variety: null,
  drying: null,
  sensory: { aroma: null, taste: null, body: null, acidity: null },
  lot_type: null,
  coffee_type: null,
  composition: "single",
  custody_model: "coop_aggregated",
  certs: [] as unknown[],
  producer_story: null,
  lending: { matched: false, join_confidence: "unmatched", community_searched: null, projects: [] },
  onchain: null,
  join_keys: { deterministic: [], fuzzy: "" },
  join_confidence: "unmatched",
} as const;

function normalizeSimLot(s: Record<string, unknown>): AqueductAnyLot {
  return {
    ...SIM_LOT_DEFAULTS,
    ...(s as object),
    source: {
      platform: "aqueduct-sim",
      platform_lot_id: (s as { aqueduct_id: string }).aqueduct_id,
      url: "",
      fetched_at: "2026-07-02T12:00:00Z",
    },
  } as unknown as AqueductAnyLot;
}

/**
 * The single assembly point for everything Aqueduct renders: the real
 * EthicHub reads (LIVE/SNAPSHOT anchors, always first) merged with the
 * seeded synthetic economy (every entity SIM-chipped, deterministic replay).
 */
export function useAqueductEconomy() {
  const { lots: realLots, loading, refetchState, generatedAt } = useAqueductLots({ liveRefetch: false });
  const economy = useMemo(() => getEconomy(), []);

  const simLots = useMemo<AqueductAnyLot[]>(
    () => economy.lots.map((l: Record<string, unknown>) => normalizeSimLot(l)),
    [economy],
  );

  const lots = useMemo<AqueductAnyLot[]>(() => {
    const real: AqueductAnyLot[] = (realLots ?? []).map((l) => ({ ...l, commodity: "coffee" as const }));
    return [...real, ...simLots];
  }, [realLots, simLots]);

  const intents = useMemo<AqueductIntent[]>(() => {
    const out: AqueductIntent[] = [];
    // Real-anchor intents (still SIM constructs — only a broadcast settle is TESTNET).
    for (const lot of realLots ?? []) {
      out.push({
        id: `aq:i-sell-${lot.aqueduct_id.slice(3, 9)}`,
        intentType: "sell-this-lot",
        status: "open",
        title: `Sell — ${lot.title_redacted}`,
        detail: lot.price
          ? `${lot.price.amount} ${lot.price.currency}/${lot.price.unit} ${lot.price.incoterm}`
          : "price on match",
        provenance: "SIM",
        lotId: lot.aqueduct_id,
        coordinates: lot.map_marker
          ? { longitude: lot.map_marker.longitude, latitude: lot.map_marker.latitude }
          : undefined,
      });
    }
    if (realLots && realLots.length > 0) {
      const finance = buildFinanceIntent(realLots[0]);
      out.push({
        id: finance.id,
        intentType: "finance-this-planting",
        status: "open",
        title: `Finance — ${finance.seedlings.toLocaleString()} seedlings, ${finance.community}`,
        detail: `€${finance.totalEur.toLocaleString()} agroforestry renovation → ${finance.venue.name}`,
        provenance: "SIM",
        coordinates: realLots[0].map_marker
          ? { longitude: realLots[0].map_marker.longitude, latitude: realLots[0].map_marker.latitude }
          : undefined,
      });
    }
    return [...out, ...(economy.intents as AqueductIntent[])];
  }, [realLots, economy]);

  const actors = useMemo<AqueductActor[]>(() => {
    const solvers: AqueductActor[] = economy.solvers.map(
      (s: { id: string; archetype: string; winSharePct: number; note: string }) => ({
        id: s.id,
        kind: "solver" as const,
        name: s.id,
        role: s.archetype,
        provenance: "SIM" as Provenance,
        detail: s.note,
        winRatePct: s.winSharePct,
      }),
    );
    solvers.push({
      id: "@solver-backstop",
      kind: "solver",
      name: "@solver-backstop",
      role: "open reference (backstop)",
      provenance: "LIVE",
      detail: "code public, margin visible — a genuine landed-cost computation, fills only when nobody else bids",
    });
    // REAL communities first — identity + lending history real, production projected.
    const realCoopSeats: AqueductActor[] = buildCoopRegistry(realLots ?? [])
      .filter((s: { real: boolean }) => s.real)
      .map((s: { id: string; name: string; commodity: string; coords: [number, number] | null }) => ({
        id: s.id,
        kind: "coop" as const,
        name: s.name,
        role: `${s.commodity} aggregation — REAL community, projected production`,
        provenance: "LIVE" as Provenance,
        coordinates: s.coords ? { longitude: s.coords[0], latitude: s.coords[1] } : undefined,
      }));
    const coops: AqueductActor[] = economy.coops.map(
      (c: { id: string; name: string; commodity: string; coords: [number, number] }) => ({
        id: c.id,
        kind: "coop" as const,
        name: c.name,
        role: `${c.commodity} aggregation`,
        provenance: "SIM" as Provenance,
        coordinates: { longitude: c.coords[0], latitude: c.coords[1] },
      }),
    );
    const venues: AqueductActor[] = [
      ...AGROFORESTRY_VENUES.map(
        (v: {
          handle: string;
          name: string;
          kind: string;
          status: string;
          note: string;
          coords?: { longitude: number; latitude: number };
        }) => ({
          id: v.handle,
          kind: "venue" as const,
          name: v.name,
          role: v.kind,
          provenance: v.status as Provenance,
          detail: v.note,
          coordinates: v.coords,
        }),
      ),
      ...TO_BUILD_PLATFORM_NODES.map(
        (
          v: {
            name: string;
            kind: string;
            status: string;
            note: string;
            coords?: { longitude: number; latitude: number };
          },
          i: number,
        ) => ({
          id: `venue-tobuild-${i}`,
          kind: "venue" as const,
          name: v.name,
          role: v.kind,
          provenance: v.status as Provenance,
          detail: v.note,
          coordinates: v.coords,
        }),
      ),
      {
        id: VAULT_NODE.handle,
        kind: "infrastructure" as const,
        name: VAULT_NODE.name,
        role: "accumulation vault",
        provenance: "SIM" as Provenance,
        detail: VAULT_NODE.note,
      },
      {
        id: REGISTRAR_NODE.handle,
        kind: "infrastructure" as const,
        name: REGISTRAR_NODE.name,
        role: "reputation registry",
        provenance: "TO-BUILD" as Provenance,
        detail: REGISTRAR_NODE.note,
      },
    ];
    return [...solvers, ...realCoopSeats, ...coops, ...venues];
  }, [economy, realLots]);

  const events = useMemo<AqueductEvent[]>(() => {
    const liveReads: AqueductEvent[] = (realLots ?? []).map((l) => ({
      ts: Date.parse(l.source.fetched_at),
      actor: "@scout-ethichub",
      verb: "pinned",
      summary: `pinned ${l.title_redacted} · €${l.price?.amount ?? "—"}/kg`,
      provenance: (l.provenance ?? "SNAPSHOT") as Provenance,
      lotId: l.aqueduct_id,
    }));
    return [...liveReads, ...(economy.events as AqueductEvent[])].sort((a, b) => b.ts - a.ts);
  }, [realLots, economy]);

  return {
    lots,
    realLots: realLots ?? [],
    intents,
    actors,
    events,
    flows: economy.flows as Array<{
      coopId: string;
      hubId: string;
      from: [number, number];
      to: [number, number];
      totalKg: number;
      totalEur: number;
      laneCount: number;
      commodity: string;
    }>,
    hubs: economy.hubs as Array<{ id: string; name: string; coords: [number, number] }>,
    coops: economy.coops as Array<{ id: string; name: string; commodity: string; coords: [number, number] }>,
    routes: economy.routes,
    economyMeta: economy.meta,
    loading,
    refetchState,
    generatedAt,
  };
}
