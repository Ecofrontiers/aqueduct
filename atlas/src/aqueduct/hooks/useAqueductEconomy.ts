import { useEffect, useMemo, useState } from "react";
import type { Provenance } from "../components/Chips";
import { getEconomy } from "../sim/economy.mjs";
import { buildFinanceIntent, buildGlowFarmFinanceIntent } from "../sim/financeIntent.mjs";
import { buildCoopRegistry } from "../sim/tradeFinance.mjs";
import { AGROFORESTRY_VENUES, REGISTRAR_NODE, TO_BUILD_PLATFORM_NODES, VAULT_NODE } from "../sim/venues.mjs";
import { type AqueductLotSnapshot, useAqueductLots } from "./useAqueductLots";

/** A lot from either surface: real EthicHub read or the seeded SIM economy. */
export type AqueductAnyLot = AqueductLotSnapshot & {
  sim?: boolean;
  commodity?: "coffee" | "cacao" | "honey";
  weight_kg?: number;
};

/** REA/Valueflows typed extension (Architecture G, WP4) — additive fields carried by
 *  finance-* intents only (`sell-this-lot` is a spot reciprocal exchange, never a Claim).
 *  See sim/financeIntent.mjs's header comment for the Valueflows action-vocabulary
 *  reasoning behind why financing produces a Claim and a sale doesn't. */
export interface AqueductIntentInputResource {
  resourceType: string;
  quantity: number;
  unit: string;
}

/** finance-this-planting's Claim shape — a conventional EUR-denominated, APR/term credit
 *  line (EthicHub). */
export interface EthicHubClaim {
  principalEur: number;
  aprPct: number;
  termMonths: number;
  confidence: "confirmed" | "reported" | "estimate";
  source: string;
}

/** finance-this-farm's Claim shape — a USD-principal GLW token-stream delegation (Glow).
 *  Deliberately NOT unified with EthicHubClaim: the two instruments differ in currency,
 *  repayment mechanism (fixed APR vs. token emission stream), and term unit (months vs.
 *  weeks) — forcing one shape would misrepresent one of them. */
export interface GlowClaim {
  principalUsd: number;
  glwPerWeek: number;
  termWeeks: number;
  confidence: "confirmed" | "reported" | "estimate";
  source: string;
}

export type AqueductFinanceClaim = EthicHubClaim | GlowClaim;

export interface AqueductIntent {
  id: string;
  intentType: "sell-this-lot" | "finance-this-planting" | "finance-this-farm";
  status?: "open" | "filled" | "settled";
  title: string;
  detail: string;
  provenance: Provenance;
  lotId?: string;
  coordinates?: { longitude: number; latitude: number };
  inputResource?: AqueductIntentInputResource;
  claim?: AqueductFinanceClaim;
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
  url?: string;
}

/** Raw shape of /data/aqueduct/ledger.json — the ex-/ledger page's data source, now
 *  folded into this hook's own events memo (the ledger route itself is gone). */
interface LedgerJsonEntry {
  ts: string; // ISO string — Date.parse() before merging; AqueductEvent.ts is epoch-ms
  provenance: string;
  agent: string;
  platform: string;
  url: string;
  verb: string;
  detail: string;
  status: string;
}
interface LedgerJsonFile {
  generated_at: string;
  anchor_fallback_switch: { ts: string; note: string } | null;
  entries: LedgerJsonEntry[];
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

  // ledger.json fold-in (the ex-/ledger page's only real data source that isn't
  // already covered by realLots/economy). Same useState/useEffect fetch pattern as
  // useRealVsSimSummary.ts. Consumers of `events` already tolerate an empty array on
  // first render, so this arriving one render late is fine.
  const [ledgerFile, setLedgerFile] = useState<LedgerJsonFile | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/data/aqueduct/ledger.json")
      .then((r) => r.json())
      .then((data: LedgerJsonFile) => {
        if (!cancelled) setLedgerFile(data);
      })
      .catch(() => {
        if (!cancelled) setLedgerFile(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    // Kiva-template ask copy below (both finance intents) is an Aqueduct-designed
    // ask-card convention, not a real platform's published copy — EthicHub research
    // confirmed no real platform publishes a per-farmer dollar-ask card; Glow's real
    // Miner listing is a raw quote, not ask-card copy either. Numbers are real/cited
    // (finance.totalEur, finance.claim.aprPct, farmFinance.claim.glwPerWeek/termWeeks);
    // only the sentence wrapping them is Aqueduct's own template.
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
        inputResource: finance.inputResource,
        claim: finance.claim,
      });
    }
    // finance-this-farm (Glow solar) — not anchored to any coffee lot, always rendered
    // once. The farm's own audit coordinates (parsed lng/lat) let it participate in
    // map/rail rendering the same way a lot-anchored intent does.
    {
      const farmFinance = buildGlowFarmFinanceIntent();
      out.push({
        id: farmFinance.id,
        intentType: "finance-this-farm",
        status: "open",
        title: `Finance — ${farmFinance.farmName} solar reward stream`,
        detail: `$399 buys a fraction of ${farmFinance.farmName}'s solar reward stream — est. ${farmFinance.claim.glwPerWeek} GLW/week for ${farmFinance.claim.termWeeks} weeks`,
        provenance: "SIM",
        coordinates: farmFinance.coordinates
          ? { longitude: farmFinance.coordinates.lng, latitude: farmFinance.coordinates.lat }
          : undefined,
        inputResource: farmFinance.inputResource,
        claim: farmFinance.claim,
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

    // ledger.json rows: Date.parse() the ISO ts before it ever touches the epoch-ms
    // sort below — the old /ledger page's own sort mixed epoch-ms economy events with
    // un-parsed ISO strings from raw `entries` (AqueductLedger.tsx:68) and silently
    // NaN-sorted the ledger rows to one end. That bug is not reproduced here.
    //
    // Dedupe rule: ledger.json's own "pinned" rows (one per matched real lot, agent
    // @scout-ethichub) record the exact same scout action `liveReads` above already
    // synthesizes per-lot from realLots — same actor, same verb, same day. ledger.json's
    // "read" rows (platform-level: the shop poll, the lending-API poll, the Celo
    // eth_call) and "matched" rows (@diligence-identity) have no analog elsewhere in
    // this memo and should pass through. AqueductEvent carries no `platform` field, but
    // in this roster actor already disambiguates platform 1:1 (@scout-ethichub ↔
    // ethichub-shop, @scout-ethichub-lending ↔ ethichub-lending-api,
    // @oracle-celo-creditline ↔ celo-onchain) — so keying on (actor, verb, calendar day)
    // is equivalent to (platform, verb, day) here and needs no extra field.
    const dayOf = (ts: number) => new Date(ts).toISOString().slice(0, 10);
    const liveReadKeys = new Set(liveReads.map((e) => `${e.actor}|${e.verb}|${dayOf(e.ts)}`));
    const ledgerEvents: AqueductEvent[] = (ledgerFile?.entries ?? [])
      .map((e) => ({ ...e, tsMs: Date.parse(e.ts) }))
      .filter((e) => !liveReadKeys.has(`${e.agent}|${e.verb}|${dayOf(e.tsMs)}`))
      .map((e) => ({
        ts: e.tsMs,
        actor: e.agent,
        verb: e.verb,
        summary: e.detail,
        provenance: e.provenance as Provenance,
        url: e.url || undefined,
      }));

    return [...liveReads, ...ledgerEvents, ...(economy.events as AqueductEvent[])].sort((a, b) => b.ts - a.ts);
  }, [realLots, economy, ledgerFile]);

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
