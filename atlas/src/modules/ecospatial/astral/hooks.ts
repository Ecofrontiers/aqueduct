/**
 * Astral Protocol React Hooks
 * Provides location proof verification and queries
 */

import { useQuery } from '@tanstack/react-query';
import { astralClient } from './client';
import type {
  LocationAttestation,
  AttestationQuery,
  SpatialQuery,
  LocationVerificationStatus,
  CredibilityVector,
} from './types';
import type * as GeoJSON from 'geojson';

/**
 * Query key factory for Astral queries
 */
export const astralKeys = {
  all: ['astral'] as const,
  attestations: () => [...astralKeys.all, 'attestations'] as const,
  attestation: (uid: string) => [...astralKeys.attestations(), uid] as const,
  assetAttestations: (assetId: string) => [...astralKeys.attestations(), 'asset', assetId] as const,
  bioregionAttestations: (bioregionId: string) => [...astralKeys.attestations(), 'bioregion', bioregionId] as const,
  verification: (uid: string) => [...astralKeys.all, 'verification', uid] as const,
  spatial: (query: SpatialQuery) => [...astralKeys.all, 'spatial', JSON.stringify(query)] as const,
};

/**
 * Fetch attestations with filters
 */
export function useAttestations(query: AttestationQuery = {}) {
  return useQuery({
    queryKey: astralKeys.attestations(),
    queryFn: () => astralClient.getAttestations(query),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch single attestation by UID
 */
export function useAttestation(uid: string | undefined) {
  return useQuery({
    queryKey: astralKeys.attestation(uid || ''),
    queryFn: () => astralClient.getAttestation(uid!),
    enabled: !!uid,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Fetch attestations for a specific asset
 */
export function useAssetAttestations(assetId: string | undefined) {
  return useQuery({
    queryKey: astralKeys.assetAttestations(assetId || ''),
    queryFn: () => astralClient.getAttestationsForAsset(assetId!),
    enabled: !!assetId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch attestations within a bioregion
 */
export function useBioregionAttestations(
  bioregionId: string | undefined,
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon | undefined
) {
  return useQuery({
    queryKey: astralKeys.bioregionAttestations(bioregionId || ''),
    queryFn: () => astralClient.getAttestationsInBioregion(geometry!),
    enabled: !!bioregionId && !!geometry,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Verify an attestation
 */
export function useVerifyAttestation(uid: string | undefined) {
  return useQuery({
    queryKey: astralKeys.verification(uid || ''),
    queryFn: () => astralClient.verifyAttestation(uid!),
    enabled: !!uid,
    staleTime: 30 * 60 * 1000, // 30 minutes - verifications don't change often
  });
}

/**
 * Spatial query hook
 */
export function useSpatialQuery(query: SpatialQuery | undefined) {
  return useQuery({
    queryKey: query ? astralKeys.spatial(query) : ['astral', 'spatial', 'disabled'],
    queryFn: () => astralClient.querySpatial(query!),
    enabled: !!query,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get verification status for an asset
 */
export function useAssetVerificationStatus(
  assetId: string | undefined
): { status: LocationVerificationStatus; attestation?: LocationAttestation; isLoading: boolean } {
  const { data: attestations, isLoading } = useAssetAttestations(assetId);

  if (isLoading) {
    return { status: 'pending', isLoading: true };
  }

  if (!attestations || attestations.length === 0) {
    return { status: 'unverified', isLoading: false };
  }

  // Get most recent attestation
  const latest = attestations.sort((a, b) => b.timestamp - a.timestamp)[0];

  if (latest.revoked) {
    return { status: 'revoked', attestation: latest, isLoading: false };
  }

  const now = Date.now() / 1000;
  if (latest.expirationTime && latest.expirationTime < now) {
    return { status: 'expired', attestation: latest, isLoading: false };
  }

  return { status: 'verified', attestation: latest, isLoading: false };
}

/**
 * Calculate weighted credibility score from vector
 * Applications can customize weights based on their trust requirements
 */
export function calculateCredibilityScore(
  vector: CredibilityVector,
  weights: Partial<Record<keyof CredibilityVector, number>> = {}
): number {
  const defaultWeights: Record<keyof CredibilityVector, number> = {
    gps: 0.3,
    ip: 0.1,
    wifi: 0.15,
    cellular: 0.15,
    temporal: 0.1,
    consensus: 0.2,
  };

  const mergedWeights = { ...defaultWeights, ...weights };

  let score = 0;
  let totalWeight = 0;

  for (const key of Object.keys(mergedWeights) as (keyof CredibilityVector)[]) {
    const weight = mergedWeights[key];
    const value = vector[key];
    score += value * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? score / totalWeight : 0;
}

/**
 * Get human-readable status text
 */
export function getStatusText(status: LocationVerificationStatus): string {
  switch (status) {
    case 'verified':
      return 'Location Verified';
    case 'pending':
      return 'Verification Pending';
    case 'expired':
      return 'Verification Expired';
    case 'revoked':
      return 'Verification Revoked';
    case 'failed':
      return 'Verification Failed';
    case 'unverified':
    default:
      return 'Not Verified';
  }
}

/**
 * Get status color for UI
 */
export function getStatusColor(status: LocationVerificationStatus): string {
  switch (status) {
    case 'verified':
      return 'text-emerald-400';
    case 'pending':
      return 'text-yellow-400';
    case 'expired':
      return 'text-orange-400';
    case 'revoked':
    case 'failed':
      return 'text-red-400';
    case 'unverified':
    default:
      return 'text-white/40';
  }
}

/**
 * Format attestation timestamp
 */
export function formatAttestationTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Check if attestation is still valid (not expired or revoked)
 */
export function isAttestationValid(attestation: LocationAttestation): boolean {
  if (attestation.revoked) return false;

  const now = Date.now() / 1000;
  if (attestation.expirationTime && attestation.expirationTime < now) {
    return false;
  }

  return true;
}

/**
 * Get time until attestation expires
 */
export function getTimeUntilExpiry(attestation: LocationAttestation): string | null {
  if (!attestation.expirationTime) return null;

  const now = Date.now() / 1000;
  const diff = attestation.expirationTime - now;

  if (diff <= 0) return 'Expired';

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);

  if (days > 365) {
    const years = Math.floor(days / 365);
    return `${years}y remaining`;
  }

  if (days > 30) {
    const months = Math.floor(days / 30);
    return `${months}mo remaining`;
  }

  if (days > 0) {
    return `${days}d remaining`;
  }

  return `${hours}h remaining`;
}
