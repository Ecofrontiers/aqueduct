/**
 * Astral Protocol Module
 * Location proof verification using EAS attestations
 * @see https://docs.astral.global
 */

// Types
export type {
  LocationAttestation,
  LocationStamp,
  LocationProof,
  CredibilityVector,
  AstralConfig,
  AttestationQuery,
  SpatialQuery,
  AttestationResponse,
  VerificationResult,
  LocationVerificationStatus,
  VerifiedLocation,
  AstralChainId,
  DistanceResult,
  AreaResult,
  ContainmentResult,
} from './types';

export { ASTRAL_CHAINS } from './types';

// Client
export { createAstralClient, astralClient } from './client';

// Hooks
export {
  astralKeys,
  useAttestations,
  useAttestation,
  useAssetAttestations,
  useBioregionAttestations,
  useVerifyAttestation,
  useSpatialQuery,
  useAssetVerificationStatus,
  calculateCredibilityScore,
  getStatusText,
  getStatusColor,
  formatAttestationTime,
  isAttestationValid,
  getTimeUntilExpiry,
} from './hooks';

// Components
export {
  LocationProofBadge,
  LocationProofChip,
  CredibilityVectorDisplay,
} from './components/LocationProofBadge';
