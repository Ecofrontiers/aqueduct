/**
 * Parliament data hooks — fetch epoch index, archives, and summaries.
 * Reconstructed from consuming code (Parliament.tsx).
 */

import { useQuery } from '@tanstack/react-query';
import type {
  EpochArchive,
  EpochSummary,
  FeedMessage,
  ParliamentPhase,
} from './types';

/** Fetch the list of available epoch IDs. */
export function useEpochIndex() {
  return useQuery<number[]>({
    queryKey: ['parliament', 'epochs'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/parliament/epochs');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) return data;
        }
      } catch { /* API not available, fall through to static scan */ }

      // Fallback: scan public/simulation for epoch files
      const ids: number[] = [];
      for (let i = 1; i <= 20; i++) {
        try {
          const r = await fetch(`/simulation/epoch_${i}.json`, { method: 'HEAD' });
          if (r.ok) ids.push(i);
        } catch { /* skip */ }
      }
      return ids;
    },
    staleTime: 30_000,
  });
}

/** Fetch a full epoch archive by ID. */
export function useEpochArchive(epochId: number | null) {
  return useQuery<EpochArchive>({
    queryKey: ['parliament', 'epoch', epochId],
    queryFn: async () => {
      // Try API first, fall back to static JSON
      try {
        const apiRes = await fetch(`/api/parliament/epoch/${epochId}`);
        if (apiRes.ok) {
          const data = await apiRes.json();
          if (data?.epoch_id != null) return data;
        }
      } catch { /* API not available */ }

      const staticRes = await fetch(`/simulation/epoch_${epochId}.json`);
      if (!staticRes.ok) throw new Error(`Epoch ${epochId} not found`);
      return staticRes.json();
    },
    enabled: epochId != null,
    staleTime: 60_000,
  });
}

/** Fetch lightweight summaries for all epochs (for sparklines, selectors). */
export function useAllEpochSummaries(epochIds: number[]) {
  return useQuery<EpochSummary[]>({
    queryKey: ['parliament', 'summaries', epochIds],
    queryFn: async () => {
      const summaries: EpochSummary[] = [];
      for (const id of epochIds) {
        try {
          let data: EpochArchive | null = null;
          try {
            const apiRes = await fetch(`/api/parliament/epoch/${id}`);
            if (apiRes.ok) {
              const parsed = await apiRes.json();
              if (parsed?.epoch_id != null) data = parsed;
            }
          } catch { /* API not available */ }
          if (!data) {
            const staticRes = await fetch(`/simulation/epoch_${id}.json`);
            if (staticRes.ok) data = await staticRes.json();
          }
          if (data) {
            summaries.push({
              epoch_id: data.epoch_id,
              bioregion: data.bioregion,
              timestamp: data.timestamp,
              eii_before: data.eii_before,
              eii_after: data.eii_after,
              eii_delta: data.eii_delta,
              feedCount: data.feed.length,
              agentCount: data.agent_states.length,
            });
          }
        } catch { /* skip unavailable epochs */ }
      }
      return summaries.sort((a, b) => a.epoch_id - b.epoch_id);
    },
    enabled: epochIds.length > 0,
    staleTime: 60_000,
  });
}

/** Group feed messages by their phase. */
export function groupFeedByPhase(
  feed: FeedMessage[],
): Record<ParliamentPhase, FeedMessage[]> {
  const phases: ParliamentPhase[] = [
    'INTELLIGENCE', 'SENSING', 'DELIBERATION', 'BOUNTIES',
    'STAKING', 'SETTLEMENT', 'SPECTACLE',
  ];

  const grouped = Object.fromEntries(
    phases.map(p => [p, [] as FeedMessage[]])
  ) as Record<ParliamentPhase, FeedMessage[]>;

  // Phase assignment heuristic based on message type
  const TYPE_TO_PHASE: Record<string, ParliamentPhase> = {
    intelligence_report: 'INTELLIGENCE',
    eii_report: 'SENSING',
    anomaly_alert: 'SENSING',
    deliberation: 'DELIBERATION',
    reaction: 'DELIBERATION',
    bounty_post: 'BOUNTIES',
    staking: 'STAKING',
    settlement_reaction: 'SETTLEMENT',
    epoch_reflection: 'SPECTACLE',
    asset_spotlight: 'INTELLIGENCE',
    org_report: 'INTELLIGENCE',
    treaty_proposal: 'DELIBERATION',
    social: 'SPECTACLE',
  };

  for (const msg of feed) {
    const phase = msg.phase || TYPE_TO_PHASE[msg.type] || 'DELIBERATION';
    if (phase in grouped) {
      grouped[phase].push(msg);
    } else {
      grouped.DELIBERATION.push(msg);
    }
  }

  return grouped;
}

/** Derive the current phase from an epoch archive timestamp. */
export function derivePhase(epoch: EpochArchive): ParliamentPhase {
  const phases = epoch.phases;
  if (!phases || phases.length === 0) return 'INTELLIGENCE';
  // Latest phase is the current one
  return phases[phases.length - 1];
}

/** Hook to get the latest epoch data (convenience wrapper). */
export function useLatestEpoch() {
  const { data: epochs } = useEpochIndex();
  const latestId = epochs && epochs.length > 0 ? Math.max(...epochs) : null;
  const { data: epoch, isLoading } = useEpochArchive(latestId);
  return { epoch, isLoading, latestId };
}
