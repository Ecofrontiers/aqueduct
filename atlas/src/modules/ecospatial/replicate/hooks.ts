/**
 * React hooks for Replicate image generation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateAgentPFP, getCachedImage, clearCachedImage } from './client';
import type { AgentType } from '../a2a/types';

/**
 * Hook to get or generate an agent's profile picture
 * Returns cached image immediately if available, otherwise generates one
 */
export function useAgentPFP(address: string | undefined, agentType: AgentType | undefined) {
  return useQuery({
    queryKey: ['agent-pfp', address, agentType],
    queryFn: async () => {
      if (!address || !agentType) return null;

      // Check cache first
      const cached = getCachedImage(address, agentType);
      if (cached) return cached;

      // Generate new image
      return generateAgentPFP(address, agentType);
    },
    enabled: !!address && !!agentType,
    staleTime: Infinity, // Images don't go stale
    gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
    retry: 1, // Only retry once on failure
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to regenerate an agent's profile picture
 */
export function useRegenerateAgentPFP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ address, agentType }: { address: string; agentType: AgentType }) => {
      clearCachedImage(address, agentType);
      return generateAgentPFP(address, agentType, { forceRegenerate: true });
    },
    onSuccess: (data, variables) => {
      // Update the cache with the new image
      queryClient.setQueryData(['agent-pfp', variables.address, variables.agentType], data);
    },
  });
}

/**
 * Hook to prefetch PFPs for a list of agents
 */
export function usePrefetchAgentPFPs(agents: Array<{ address: string; agentType: AgentType }>) {
  const queryClient = useQueryClient();

  // Prefetch in background without blocking
  agents.forEach(({ address, agentType }) => {
    // Only prefetch if not already cached
    const cached = getCachedImage(address, agentType);
    if (!cached) {
      queryClient.prefetchQuery({
        queryKey: ['agent-pfp', address, agentType],
        queryFn: () => generateAgentPFP(address, agentType),
        staleTime: Infinity,
      });
    }
  });
}
