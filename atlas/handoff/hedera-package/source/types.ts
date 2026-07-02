/**
 * Hedera Mirror Node types + internal classification types
 */

/** Mirror Node /api/v1/tokens/{id} response */
export interface MirrorNodeToken {
  token_id: string;
  name: string;
  symbol: string;
  decimals: string; // stringified number
  total_supply: string; // stringified bigint
  memo: string;
  created_timestamp: string; // e.g. "1680000000.000000000"
  admin_key: KeyInfo | null;
  supply_key: KeyInfo | null;
  freeze_key: KeyInfo | null;
  wipe_key: KeyInfo | null;
  kyc_key: KeyInfo | null;
  treasury_account_id: string;
  type: "FUNGIBLE_COMMON" | "NON_FUNGIBLE_UNIQUE";
}

export interface KeyInfo {
  _type: string;
  key: string;
}

/** Mirror Node /api/v1/accounts/{id}/tokens response */
export interface AccountTokensResponse {
  tokens: Array<{
    token_id: string;
    balance: number;
  }>;
  links?: { next?: string };
}

/** Mirror Node /api/v1/tokens/{id}/nfts response */
export interface NFTResponse {
  nfts: Array<{
    serial_number: number;
    metadata: string; // base64-encoded
    account_id: string;
  }>;
  links?: { next?: string };
}

/** Enriched token ready for parsing */
export interface EnrichedToken {
  token: MirrorNodeToken;
  platform: Platform;
  ipfsMetadata?: Record<string, any>;
  nftMetadata?: Record<string, any>;
  /** OrbexCO2: memo from linked commodity token (contains Origin-US-STATE) */
  linkedMemo?: string;
}

/** Known platforms (Orgs) */
export type Platform =
  | "DOVU"
  | "Tolam Earth"
  | "Capturiant"
  | "OrbexCO2"
  | "GCR"
  | "TYMLEZ";

/** Treasury account → platform mapping */
export const TREASURY_PLATFORM_MAP: Record<string, Platform> = {
  "0.0.610168": "DOVU",       // original
  "0.0.1357309": "DOVU",      // Guardian reissue
  "0.0.6144372": "Tolam Earth", // assets
  "0.0.6138881": "Tolam Earth", // certificates
  "0.0.4640644": "Capturiant", // Miller Mountain
  "0.0.5054978": "Capturiant", // Warrior
  "0.0.4576278": "OrbexCO2",
  "0.0.3843565": "GCR",
  "0.0.1810743": "TYMLEZ",
};

/** Known DOVU Guardian key */
export const DOVU_GUARDIAN_KEY = "902d8719";

/** Known DOVU operational key */
export const DOVU_OPERATIONAL_KEY = "f17b8c55";

/** DOVU test/utility token names to filter out */
export const DOVU_FILTER_NAMES = new Set([
  "Matt token",
  "Test",
  "ppp",
  "e2e test token",
  "Hello",
]);

/** DOVU utility token symbols to filter out */
export const DOVU_FILTER_SYMBOLS = new Set([
  "DOV[hts]",
  "DOVU",
  "PACK",
]);

/** Capturiant IPFS metadata shape */
export interface CapturiantIPFS {
  projectName: string;
  projectType: string;
  country: string;
  vintage: number | string;
  validationDate: string;
  standard: string;
  sdgs?: number[];
}

/** Tolam IPFS NFT metadata shape */
export interface TolamIPFS {
  name: string;
  description: string;
  properties: {
    registryOfOrigin: "verra" | "ecoregistry" | "global-c-sink-registry";
    registryProjectId: string;
    registryProjectName: string;
    monitoringPeriodStartDate: string;
    monitoringPeriodEndDate: string;
    trustChainHook?: string;
  };
}

/** OrbexCO2 memo JSON shape */
export interface OrbexMemo {
  OrbexMarket: string;
  uom?: string;
  tokenLink?: string;
}
