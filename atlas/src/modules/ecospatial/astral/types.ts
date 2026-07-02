/**
 * Astral Protocol Location Proof Types
 * Based on @decentralized-geo/astral-sdk
 * @see https://docs.astral.global/sdk/overview
 */

import type * as GeoJSON from 'geojson';

/**
 * Supported chains for Astral attestations
 */
export const ASTRAL_CHAINS = {
  BASE_SEPOLIA: 84532,
  BASE_MAINNET: 8453,
  ETHEREUM_SEPOLIA: 11155111,
  ETHEREUM_MAINNET: 1,
  CELO: 42220,
  ARBITRUM: 42161,
  OPTIMISM: 10,
} as const;

export type AstralChainId = (typeof ASTRAL_CHAINS)[keyof typeof ASTRAL_CHAINS];

/**
 * Location attestation - a signed record proving location data
 */
export interface LocationAttestation {
  uid: string;
  attester: string;
  recipient: string;
  timestamp: number;
  expirationTime: number;
  revocable: boolean;
  revoked: boolean;
  refUID?: string;

  // Location data
  location: GeoJSON.Geometry;
  locationHash: string;
  memo?: string;

  // Chain info
  chainId: AstralChainId;
  schemaUID: string;

  // Metadata
  createdAt: number;
  signature?: string;
}

/**
 * Location stamp - raw signal from a plugin (GPS, IP, WiFi, etc.)
 */
export interface LocationStamp {
  pluginId: string;
  pluginName: string;
  location: GeoJSON.Point;
  accuracy?: number;
  altitude?: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Multi-factor location proof - bundled stamps with credibility vector
 */
export interface LocationProof {
  uid: string;
  claim: LocationAttestation;
  stamps: LocationStamp[];
  credibility: CredibilityVector;
  verifiedAt: number;
  verificationMode: 'local' | 'tee';
}

/**
 * Credibility vector for multidimensional verification
 * Applications apply custom weighting based on their trust requirements
 */
export interface CredibilityVector {
  gps: number;      // 0-1: GPS signal strength/accuracy
  ip: number;       // 0-1: IP geolocation confidence
  wifi: number;     // 0-1: WiFi positioning confidence
  cellular: number; // 0-1: Cell tower triangulation
  temporal: number; // 0-1: Timestamp freshness
  consensus: number; // 0-1: Cross-signal agreement
}

/**
 * SDK configuration
 */
export interface AstralConfig {
  chainId: AstralChainId;
  apiUrl?: string;
  apiKey?: string;
  debug?: boolean;
}

/**
 * Query parameters for fetching attestations
 */
export interface AttestationQuery {
  attester?: string;
  recipient?: string;
  chainId?: AstralChainId;
  schemaUID?: string;
  fromTimestamp?: number;
  toTimestamp?: number;
  revoked?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Spatial query parameters
 */
export interface SpatialQuery {
  geometry: GeoJSON.Geometry;
  relation: 'contains' | 'within' | 'intersects';
  radius?: number; // meters, for 'within' queries
  chainId?: AstralChainId;
  limit?: number;
}

/**
 * API response types
 */
export interface AttestationResponse {
  attestations: LocationAttestation[];
  total: number;
  hasMore: boolean;
}

export interface VerificationResult {
  valid: boolean;
  attestation: LocationAttestation;
  credibility?: CredibilityVector;
  errors?: string[];
}

/**
 * Compute result types
 */
export interface ComputeResult<T> {
  result: T;
  attestationUIDs: string[];
  computedAt: number;
}

export interface DistanceResult extends ComputeResult<number> {
  unit: 'meters' | 'kilometers';
}

export interface AreaResult extends ComputeResult<number> {
  unit: 'square_meters' | 'hectares';
}

export interface ContainmentResult extends ComputeResult<boolean> {
  containerUID: string;
  containeeUID: string;
}

/**
 * Asset location verification status
 */
export type LocationVerificationStatus =
  | 'unverified'    // No location proof submitted
  | 'pending'       // Proof submitted, awaiting verification
  | 'verified'      // Proof verified successfully
  | 'expired'       // Proof expired (beyond expiration time)
  | 'revoked'       // Proof was revoked
  | 'failed';       // Verification failed

/**
 * Asset with location proof
 */
export interface VerifiedLocation {
  assetId: string;
  status: LocationVerificationStatus;
  attestation?: LocationAttestation;
  proof?: LocationProof;
  verifiedAt?: number;
  expiresAt?: number;
}
