/**
 * React hooks for Virtuals Protocol integration
 */

import { useQuery } from '@tanstack/react-query';
import { browseVirtualsAgents, getVirtualsAgent } from './client';
import type { VirtualsBrowseParams, VirtualsAgent } from './types';
import type { Agent, AgentTier, AgentType, AgentStatus } from '../a2a/types';

/**
 * Browse Virtuals agents with React Query
 */
export function useVirtualsAgents(params: VirtualsBrowseParams = {}) {
  return useQuery({
    queryKey: ['virtuals-agents', params],
    queryFn: () => browseVirtualsAgents(params),
    staleTime: 60_000, // 1 minute
    refetchInterval: 300_000, // 5 minutes
  });
}

/**
 * Get a single Virtuals agent
 */
export function useVirtualsAgent(id: string | undefined) {
  return useQuery({
    queryKey: ['virtuals-agent', id],
    queryFn: () => (id ? getVirtualsAgent(id) : null),
    enabled: !!id,
    staleTime: 60_000,
  });
}

/**
 * Map Virtuals agents to our Agent type for display
 */
export function mapVirtualsToAgent(
  virtual: VirtualsAgent,
  bioregionId: string = 'PAL_1'
): Agent {
  // Determine agent type based on category/tags
  const agentType = inferAgentType(virtual);
  const tier = inferTier(virtual);
  const status = mapOnlineStatus(virtual.onlineStatus);

  return {
    id: `virtuals-${virtual.id}`,
    address: virtual.walletAddress,
    actorType: 'AGENT',
    name: virtual.name,
    agentType,
    tier,
    status,
    active: virtual.onlineStatus === 'ONLINE',
    reputationScore: Math.round(virtual.successRate),
    esvStaked: virtual.successfulJobCount * 10, // Simulated
    esvEarned: virtual.successfulJobCount * 5, // Simulated
    actionsCompleted: virtual.successfulJobCount,
    commitments: [
      {
        id: `commitment-${virtual.id}`,
        actorId: `virtuals-${virtual.id}`,
        bioregionId,
        percentageBps: 10000, // 100%
        createdAt: virtual.createdAt,
        updatedAt: virtual.createdAt,
      },
    ],
    totalCommitmentBps: 10000,
    totalESVEarned: virtual.successfulJobCount * 5,
    proposalsSubmitted: Math.floor(virtual.successfulJobCount / 10),
    bountiesCompleted: Math.floor(virtual.successfulJobCount / 5),
    createdAt: virtual.createdAt,
    acpServices: virtual.offerings.map(o => o.title),
    // Soul-related fields
    mission: virtual.description,
    pillarFocus: inferPillarFocus(virtual),
    speciesRepresented: inferSpecies(virtual),
    ecosystemType: inferEcosystem(virtual),
  };
}

function inferAgentType(virtual: VirtualsAgent): AgentType {
  const tags = virtual.tags || [];
  const category = virtual.category?.toLowerCase() || '';

  if (tags.includes('monitoring') || category === 'environmental') {
    return 'MONITORING';
  }
  if (tags.includes('trading') || category === 'trading') {
    return 'ECONOMIC';
  }
  if (tags.includes('social') || category === 'social') {
    return 'SOCIAL';
  }
  if (tags.includes('species') || tags.includes('advocacy')) {
    return 'REPRESENTATION';
  }
  if (tags.includes('analysis') || tags.includes('research')) {
    return 'SPECIALIST';
  }

  return 'SPECIALIST';
}

function inferTier(virtual: VirtualsAgent): AgentTier {
  const tags = virtual.tags || [];

  if (tags.includes('species') || tags.includes('flamingo') || tags.includes('blue-crab')) {
    return 'SPECIES';
  }
  if (tags.includes('trading') || tags.includes('defi') || virtual.tokenMetrics) {
    return 'ECONOMIC';
  }
  return 'ECOSYSTEM';
}

function mapOnlineStatus(status: 'ONLINE' | 'OFFLINE'): AgentStatus {
  return status === 'ONLINE' ? 'ACTIVE' : 'OFFLINE';
}

function inferPillarFocus(
  virtual: VirtualsAgent
): 'function' | 'structure' | 'composition' | undefined {
  const tags = virtual.tags || [];

  if (tags.includes('species') || tags.includes('biodiversity')) {
    return 'composition';
  }
  if (tags.includes('monitoring') || tags.includes('ecosystem')) {
    return 'function';
  }
  if (tags.includes('connectivity') || tags.includes('habitat')) {
    return 'structure';
  }
  return undefined;
}

function inferSpecies(virtual: VirtualsAgent): string | undefined {
  const name = virtual.name.toLowerCase();
  const desc = virtual.description?.toLowerCase() || '';

  if (name.includes('flamingo') || desc.includes('flamingo')) {
    return 'Greater Flamingo';
  }
  if (name.includes('crab') || desc.includes('blue crab')) {
    return 'Blue Crab';
  }
  return undefined;
}

function inferEcosystem(virtual: VirtualsAgent): string | undefined {
  const tags = virtual.tags || [];

  if (tags.includes('camargue')) {
    return 'Wetland';
  }
  if (tags.includes('chesapeake')) {
    return 'Estuary';
  }
  return undefined;
}
