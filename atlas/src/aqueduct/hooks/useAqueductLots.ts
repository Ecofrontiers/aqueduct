import { useEffect, useState } from "react";
import { ANCHOR_PATH } from "../connectors/buildAnchorLots.mjs";
import { fetchLotDetail } from "../connectors/ethichub.mjs";

export interface AqueductLotSnapshot {
  aqueduct_id: string;
  aqueduct_id_full: string;
  source: { platform: string; platform_lot_id: string; url: string; fetched_at: string };
  identity_stage: string;
  ico_mark: null;
  producer: { initials: string; entity_type: string };
  origin: {
    country: string | null;
    region: string | null;
    community: string | null;
    locality_raw: string | null;
    plot_geo: null;
  };
  map_marker: { latitude: number; longitude: number; precision: string };
  altitude_masl: string | null;
  harvest_window: { season: string | null; note: string };
  process: string | null;
  variety: string | null;
  drying: string | null;
  sensory: { aroma: string | null; taste: string | null; body: string | null; acidity: string | null };
  quality: { sca_score: number | null; grade_basis: string };
  lot_type: string | null;
  coffee_type: string | null;
  weight_state: string;
  format: string | null;
  composition: string;
  custody_model: string;
  certs: unknown[];
  eudr: {
    plot_geo_present: boolean;
    harvest_window_present: boolean;
    legality_evidence: boolean;
    dds_ref: string | null;
  };
  price: { amount: number; currency: string; unit: string; incoterm: string } | null;
  image: string | null;
  producer_story: string | null;
  title_redacted: string;
  lending: {
    matched: boolean;
    join_confidence: string;
    community_searched: string | null;
    projects: Array<{ id: number; community_name: string; status: number; objective: string }>;
  };
  onchain: { chain: string; contract: string; total_credit_lines: number | null; note: string } | null;
  join_keys: { deterministic: string[]; fuzzy: string };
  join_confidence: string;
  // set client-side, not part of the persisted snapshot file. "SIM" only on
  // generator lots merged in by useAqueductEconomy.
  provenance?: "LIVE" | "SNAPSHOT" | "SIM";
}

interface LotsFile {
  generated_at: string;
  anchor_id: string | null;
  lots: AqueductLotSnapshot[];
  meta: Record<string, unknown>;
}

export type RefetchState = "pending" | "live" | "snapshot";

interface UseAqueductLotsOptions {
  /**
   * Attempt the on-load live re-fetch of the anchor (spec §4). Defaults to
   * true. The lot detail page uses this; the Explore map layer opts OUT
   * (`liveRefetch: false`) — a second setState firing after the proxy
   * round-trip was found to race the Atlas base's BioregionLayer terrain
   * <Source> teardown on that page (a pre-existing mapbox-gl/react-map-gl
   * sensitivity, not something to fix by editing Atlas base code). Snapshot
   * data is still fully real (fetched this session) and spec-honest either
   * way — SNAPSHOT is a valid provenance state, not a failure (DESIGN-BRIEF §4.8).
   */
  liveRefetch?: boolean;
}

export function useAqueductLots(options: UseAqueductLotsOptions = {}) {
  const { liveRefetch = true } = options;
  const [lots, setLots] = useState<AqueductLotSnapshot[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refetchState, setRefetchState] = useState<RefetchState>("pending");
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      // 1. Always load the timestamped snapshot first — the judge never waits
      //    on a network fetch to see the lot (DESIGN-BRIEF §4.7 cold-load rule).
      const res = await fetch("/data/aqueduct/lots.json");
      if (!res.ok) {
        if (!cancelled) setLoading(false);
        return;
      }
      const file: LotsFile = await res.json();
      const withProvenance = file.lots.map((l) => ({ ...l, provenance: "SNAPSHOT" as const }));
      if (cancelled) return;
      setLots(withProvenance);
      setGeneratedAt(file.generated_at);
      setLoading(false);

      if (!liveRefetch) {
        setRefetchState("snapshot");
        return;
      }

      // 2. Best-effort live re-fetch of the anchor through the dev proxy
      //    (spec §4: "render live-if-reachable, labeled-snapshot-if-not").
      //    In a production build with no proxy this fetch fails fast and we
      //    stay on SNAPSHOT — that is the honest, spec-correct default, not
      //    an error state.
      try {
        const { data } = await fetchLotDetail(ANCHOR_PATH, "/api/ethichub-shop");
        if (!cancelled && data && data.price) {
          setLots((prev) =>
            (prev ?? []).map((l) =>
              l.source.platform_lot_id === data.source.platform_lot_id
                ? {
                    ...l,
                    provenance: "LIVE" as const,
                    source: data.source,
                    price: data.price,
                  }
                : l,
            ),
          );
          setRefetchState("live");
        } else {
          setRefetchState("snapshot");
        }
      } catch {
        if (!cancelled) setRefetchState("snapshot");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const anchor = lots?.[0] ?? null;
  return { lots, anchor, loading, refetchState, generatedAt };
}
