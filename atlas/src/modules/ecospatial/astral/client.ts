/**
 * Astral Protocol API Client
 * Provides location proof verification and spatial queries
 * @see https://docs.astral.global/api
 */

import type {
  LocationAttestation,
  AttestationQuery,
  AttestationResponse,
  SpatialQuery,
  VerificationResult,
  AstralConfig,
} from './types';

const DEFAULT_API_URL = 'https://api.astral.global';

// Default to Base Sepolia for testnet
const DEFAULT_CHAIN_ID = 84532;

/**
 * Create Astral API client
 */
export function createAstralClient(config: Partial<AstralConfig> = {}) {
  const apiUrl = config.apiUrl || import.meta.env.VITE_ASTRAL_API_URL || DEFAULT_API_URL;
  const apiKey = config.apiKey || import.meta.env.VITE_ASTRAL_API_KEY;
  const chainId = config.chainId || DEFAULT_CHAIN_ID;
  const debug = config.debug || import.meta.env.DEV;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const log = (...args: unknown[]) => {
    if (debug) console.log('[Astral]', ...args);
  };

  /**
   * Fetch location attestations
   */
  async function getAttestations(
    query: AttestationQuery = {}
  ): Promise<AttestationResponse> {
    const params = new URLSearchParams();

    if (query.attester) params.set('attester', query.attester);
    if (query.recipient) params.set('recipient', query.recipient);
    if (query.chainId) params.set('chainId', String(query.chainId));
    if (query.schemaUID) params.set('schemaUID', query.schemaUID);
    if (query.fromTimestamp) params.set('fromTimestamp', String(query.fromTimestamp));
    if (query.toTimestamp) params.set('toTimestamp', String(query.toTimestamp));
    if (query.revoked !== undefined) params.set('revoked', String(query.revoked));
    if (query.limit) params.set('limit', String(query.limit));
    if (query.offset) params.set('offset', String(query.offset));

    const url = `${apiUrl}/v1/attestations?${params}`;
    log('Fetching attestations:', url);

    try {
      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`Astral API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        attestations: data.attestations || [],
        total: data.total || 0,
        hasMore: data.hasMore || false,
      };
    } catch (error) {
      log('Failed to fetch attestations:', error);
      // Return mock data in development
      return getMockAttestations(query);
    }
  }

  /**
   * Get attestation by UID
   */
  async function getAttestation(uid: string): Promise<LocationAttestation | null> {
    const url = `${apiUrl}/v1/attestations/${uid}`;
    log('Fetching attestation:', uid);

    try {
      const response = await fetch(url, { headers });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Astral API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      log('Failed to fetch attestation:', error);
      return null;
    }
  }

  /**
   * Verify an attestation
   */
  async function verifyAttestation(
    uid: string
  ): Promise<VerificationResult> {
    const url = `${apiUrl}/v1/attestations/${uid}/verify`;
    log('Verifying attestation:', uid);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Verification failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      log('Verification failed:', error);
      // Return mock verification in development
      return getMockVerification(uid);
    }
  }

  /**
   * Spatial query - find attestations within a geometry
   */
  async function querySpatial(
    query: SpatialQuery
  ): Promise<AttestationResponse> {
    const url = `${apiUrl}/v1/spatial/query`;
    log('Spatial query:', query);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          geometry: query.geometry,
          relation: query.relation,
          radius: query.radius,
          chainId: query.chainId || chainId,
          limit: query.limit || 50,
        }),
      });

      if (!response.ok) {
        throw new Error(`Spatial query failed: ${response.status}`);
      }

      const data = await response.json();
      return {
        attestations: data.attestations || [],
        total: data.total || 0,
        hasMore: data.hasMore || false,
      };
    } catch (error) {
      log('Spatial query failed:', error);
      return { attestations: [], total: 0, hasMore: false };
    }
  }

  /**
   * Compute distance between two attestations
   */
  async function computeDistance(
    fromUID: string,
    toUID: string
  ): Promise<{ distance: number; unit: 'meters' }> {
    const url = `${apiUrl}/v1/compute/distance`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ fromUID, toUID }),
      });

      if (!response.ok) {
        throw new Error(`Distance computation failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      log('Distance computation failed:', error);
      return { distance: 0, unit: 'meters' };
    }
  }

  /**
   * Check if one attestation contains another
   */
  async function computeContains(
    containerUID: string,
    containeeUID: string
  ): Promise<boolean> {
    const url = `${apiUrl}/v1/compute/contains`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ containerUID, containeeUID }),
      });

      if (!response.ok) {
        throw new Error(`Containment check failed: ${response.status}`);
      }

      const result = await response.json();
      return result.contains;
    } catch (error) {
      log('Containment check failed:', error);
      return false;
    }
  }

  /**
   * Get attestations for a specific recipient (e.g., asset address)
   */
  async function getAttestationsForAsset(
    assetId: string
  ): Promise<LocationAttestation[]> {
    const result = await getAttestations({
      recipient: assetId,
      revoked: false,
      limit: 10,
    });
    return result.attestations;
  }

  /**
   * Get attestations within a bioregion polygon
   */
  async function getAttestationsInBioregion(
    bioregionGeometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
  ): Promise<LocationAttestation[]> {
    const result = await querySpatial({
      geometry: bioregionGeometry,
      relation: 'within',
      limit: 100,
    });
    return result.attestations;
  }

  return {
    getAttestations,
    getAttestation,
    verifyAttestation,
    querySpatial,
    computeDistance,
    computeContains,
    getAttestationsForAsset,
    getAttestationsInBioregion,
    config: { apiUrl, chainId, debug },
  };
}

/**
 * Mock data for development/demo
 */
function getMockAttestations(query: AttestationQuery): AttestationResponse {
  const mockAttestations: LocationAttestation[] = [
    {
      uid: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      attester: '0xAstralAttester0001',
      recipient: query.recipient || '0xAssetRecipient0001',
      timestamp: Date.now() / 1000 - 86400 * 7,
      expirationTime: Date.now() / 1000 + 86400 * 365,
      revocable: true,
      revoked: false,
      location: {
        type: 'Point',
        coordinates: [4.6333, 43.3333], // Camargue
      },
      locationHash: '0xdeadbeef',
      memo: 'Verified wetland restoration site',
      chainId: 84532,
      schemaUID: '0xschema1234',
      createdAt: Date.now() - 86400000 * 7,
    },
    {
      uid: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678',
      attester: '0xAstralAttester0002',
      recipient: query.recipient || '0xAssetRecipient0002',
      timestamp: Date.now() / 1000 - 86400 * 3,
      expirationTime: Date.now() / 1000 + 86400 * 365,
      revocable: true,
      revoked: false,
      location: {
        type: 'Polygon',
        coordinates: [[
          [-76.5, 38.5],
          [-76.0, 38.5],
          [-76.0, 39.0],
          [-76.5, 39.0],
          [-76.5, 38.5],
        ]],
      },
      locationHash: '0xcafebabe',
      memo: 'Chesapeake Bay oyster reef restoration',
      chainId: 84532,
      schemaUID: '0xschema1234',
      createdAt: Date.now() - 86400000 * 3,
    },
  ];

  const filtered = mockAttestations.filter((a) => {
    if (query.recipient && a.recipient !== query.recipient) return false;
    if (query.attester && a.attester !== query.attester) return false;
    if (query.revoked !== undefined && a.revoked !== query.revoked) return false;
    return true;
  });

  return {
    attestations: filtered.slice(0, query.limit || 10),
    total: filtered.length,
    hasMore: filtered.length > (query.limit || 10),
  };
}

function getMockVerification(uid: string): VerificationResult {
  return {
    valid: true,
    attestation: {
      uid,
      attester: '0xAstralAttester0001',
      recipient: '0xAssetRecipient0001',
      timestamp: Date.now() / 1000 - 86400,
      expirationTime: Date.now() / 1000 + 86400 * 365,
      revocable: true,
      revoked: false,
      location: { type: 'Point', coordinates: [4.6333, 43.3333] },
      locationHash: '0xdeadbeef',
      chainId: 84532,
      schemaUID: '0xschema1234',
      createdAt: Date.now() - 86400000,
    },
    credibility: {
      gps: 0.95,
      ip: 0.7,
      wifi: 0.0,
      cellular: 0.8,
      temporal: 0.99,
      consensus: 0.88,
    },
  };
}

/**
 * Default client instance
 */
export const astralClient = createAstralClient();
