import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { EIIScore, EIIHistory } from './types';

/**
 * Fetch latest EII score for a bioregion
 * @param bioregionCode - Bioregion code from GeoJSON (e.g., "PAL_1", "NA_7")
 */
export function useEII(bioregionCode: string) {
  return useQuery({
    queryKey: ['eii', bioregionCode],
    queryFn: () => api.getLatestEII(bioregionCode) as Promise<EIIScore>,
    enabled: !!bioregionCode,
    staleTime: 5 * 60 * 1000, // 5 minutes - EII doesn't change frequently
  });
}

/**
 * Fetch EII history for a bioregion
 * @param bioregionCode - Bioregion code from GeoJSON
 * @param limit - Number of historical readings
 */
export function useEIIHistory(bioregionCode: string, limit = 12) {
  return useQuery({
    queryKey: ['eii-history', bioregionCode, limit],
    queryFn: async (): Promise<EIIHistory> => {
      const readings = await api.getEIIHistory(bioregionCode, limit);
      return {
        bioregionId: bioregionCode,
        readings: readings as EIIScore[],
      };
    },
    enabled: !!bioregionCode,
    staleTime: 5 * 60 * 1000,
  });
}
