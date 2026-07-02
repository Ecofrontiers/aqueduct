/**
 * Virtuals Protocol Agent Types
 * Based on ACP (Agent Commerce Protocol) SDK
 */

export interface VirtualsAgent {
  id: string;
  name: string;
  description?: string;
  walletAddress: string;
  tokenAddress?: string;
  imageUrl?: string;

  // ACP fields
  graduationStatus: 'GRADUATED' | 'NOT_GRADUATED';
  onlineStatus: 'ONLINE' | 'OFFLINE';
  successfulJobCount: number;
  successRate: number;
  uniqueBuyerCount: number;
  lastOnlineAt?: number;

  // Agent offerings
  offerings: VirtualsOffering[];

  // Token metrics (if graduated)
  tokenMetrics?: {
    marketCap: number;
    price: number;
    holders: number;
    volume24h: number;
  };

  // Metadata
  createdAt: number;
  category?: string;
  tags?: string[];
}

export interface VirtualsOffering {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  deliveryTime?: number; // in seconds
  hidden: boolean;
}

export interface VirtualsBrowseParams {
  query?: string;
  tags?: string[];
  sortBy?:
    | 'SUCCESSFUL_JOB_COUNT'
    | 'SUCCESS_RATE'
    | 'UNIQUE_BUYER_COUNT'
    | 'MINS_FROM_LAST_ONLINE'
    | 'GRADUATION_STATUS'
    | 'ONLINE_STATUS';
  graduationStatus?: 'GRADUATED' | 'NOT_GRADUATED' | 'ALL';
  onlineStatus?: 'ONLINE' | 'OFFLINE' | 'ALL';
  limit?: number;
  offset?: number;
}

export interface VirtualsBrowseResponse {
  agents: VirtualsAgent[];
  total: number;
  hasMore: boolean;
}

// Map Virtuals agents to our Agent type
export interface VirtualsAgentMapping {
  virtualsId: string;
  bioregionId: string;
  pillarFocus?: 'function' | 'structure' | 'composition';
  speciesRepresented?: string;
}

/**
 * Raw API response from api.virtuals.io/api/virtuals
 */
export interface VirtualsApiAgent {
  id: number;
  uid: string;
  createdAt: string;
  walletAddress: string | null;
  name: string;
  description: string;
  sentientWalletAddress: string | null;
  category: string;
  role: string;
  daoAddress: string;
  tokenAddress: string;
  virtualId: string;
  status: string;
  symbol: string;
  lpAddress: string | null;
  veTokenAddress: string;
  totalValueLocked: string;
  virtualTokenValue: string;
  holderCount: number;
  mcapInVirtual: number;
  tbaAddress: string;
  chain: string;
  top10HolderPercentage: number;
  level: number;
  priceChangePercent24h: number;
  volume24h: number;
  mindshare: number | null;
  lpCreatedAt: string | null;
  stakingAddress: string | null;
  agentStakingContract: string | null;
  isVerified: boolean | null;
  isDevCommitted: boolean | null;
  liquidityUsd: number;
  netVolume24h: number;
  holderCountPercent24h: number;
  devHoldingPercentage: number;
  factory: string | null;
  launchedAt: string | null;
  hasMarginTrading: boolean | null;
  fdvInVirtual: number;
  image: { url: string } | null;
  cores: { name: string; coreId: number }[];
  creator: {
    id: number;
    walletAddress: string;
    username: string | null;
  } | null;
  totalSupply: number;
  displayRevenue: boolean;
}
