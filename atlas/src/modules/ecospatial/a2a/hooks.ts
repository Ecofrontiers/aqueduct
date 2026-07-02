import { useQuery } from '@tanstack/react-query';
import { api, agentApi, type AgentValueBreakdown } from '../../../lib/api';
import type { Agent, Bounty, FeedEntry } from './types';

/**
 * Fetch agents committed to a bioregion
 * @param bioregionCode - Bioregion code from GeoJSON (e.g., "PAL_1", "NA_7")
 */
export function useAgentsByBioregion(bioregionCode: string) {
  return useQuery({
    queryKey: ['agents', 'bioregion', bioregionCode],
    queryFn: () => api.getAgentsByBioregion(bioregionCode) as Promise<Agent[]>,
    enabled: !!bioregionCode,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Fetch active bounties for a bioregion
 * @param bioregionCode - Bioregion code from GeoJSON
 */
export function useBountiesByBioregion(bioregionCode: string) {
  return useQuery({
    queryKey: ['bounties', 'bioregion', bioregionCode],
    queryFn: () => api.getBountiesByBioregion(bioregionCode) as Promise<Bounty[]>,
    enabled: !!bioregionCode,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Fetch a single agent by address
 * @param address - Agent wallet address
 */
export function useAgent(address: string | undefined) {
  return useQuery({
    queryKey: ['agent', address],
    queryFn: () => agentApi.getAgentByAddress(address!) as Promise<Agent>,
    enabled: !!address,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch agent value breakdown (10 categories from PRD)
 * @param address - Agent wallet address
 */
export function useAgentValueBreakdown(address: string | undefined) {
  return useQuery({
    queryKey: ['agent', address, 'value'],
    queryFn: () => agentApi.getAgentValueBreakdown(address!) as Promise<AgentValueBreakdown[]>,
    enabled: !!address,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch agent activity feed
 * @param address - Agent wallet address
 */
export function useAgentActivity(address: string | undefined, limit: number = 20) {
  return useQuery({
    queryKey: ['agent', address, 'activity', limit],
    queryFn: () => agentApi.getAgentActivity(address!, limit) as Promise<FeedEntry[]>,
    enabled: !!address,
    staleTime: 30 * 1000, // 30 seconds
  });
}
