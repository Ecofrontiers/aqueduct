/**
 * Virtuals Protocol Client
 *
 * Uses the public Virtuals API at api.virtuals.io
 * No authentication required for reading agent data.
 *
 * @see https://app.virtuals.io
 */

import type {
  VirtualsAgent,
  VirtualsBrowseParams,
  VirtualsBrowseResponse,
  VirtualsApiAgent,
} from './types';

const VIRTUALS_API_BASE = 'https://api.virtuals.io/api';

/**
 * Browse Virtuals agents from the public API
 */
export async function browseVirtualsAgents(
  params: VirtualsBrowseParams = {}
): Promise<VirtualsBrowseResponse> {
  try {
    const searchParams = new URLSearchParams();

    // Pagination
    searchParams.set('page', String(params.offset ? Math.floor(params.offset / (params.limit || 20)) + 1 : 1));
    searchParams.set('limit', String(params.limit || 20));

    // Search query
    if (params.query) {
      searchParams.set('search', params.query);
    }

    // Sort mapping
    if (params.sortBy) {
      const sortMap: Record<string, string> = {
        SUCCESSFUL_JOB_COUNT: 'holderCount',
        SUCCESS_RATE: 'volume24h',
        UNIQUE_BUYER_COUNT: 'holderCount',
        GRADUATION_STATUS: 'mcapInVirtual',
        ONLINE_STATUS: 'priceChangePercent24h',
      };
      searchParams.set('sort', sortMap[params.sortBy] || 'holderCount');
      searchParams.set('order', 'desc');
    }

    // Category/tags filter
    if (params.tags && params.tags.length > 0) {
      searchParams.set('category', params.tags[0]);
    }

    const response = await fetch(`${VIRTUALS_API_BASE}/virtuals?${searchParams}`);

    if (!response.ok) {
      console.warn('[Virtuals] API error, falling back to mock data');
      return getMockAgents(params);
    }

    const data = await response.json();
    const apiAgents: VirtualsApiAgent[] = data.data || [];
    const pagination = data.meta?.pagination || { total: 0, pageCount: 1 };

    const agents = apiAgents.map(mapApiAgentToVirtualsAgent);

    return {
      agents,
      total: pagination.total,
      hasMore: pagination.page < pagination.pageCount,
    };
  } catch (error) {
    console.error('[Virtuals] Failed to fetch agents:', error);
    return getMockAgents(params);
  }
}

/**
 * Get a single Virtuals agent by ID or UID
 */
export async function getVirtualsAgent(id: string): Promise<VirtualsAgent | null> {
  try {
    // Try fetching by ID first
    const response = await fetch(`${VIRTUALS_API_BASE}/virtuals/${id}`);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return mapApiAgentToVirtualsAgent(data.data);
  } catch (error) {
    console.error('[Virtuals] Failed to fetch agent:', error);
    return null;
  }
}

/**
 * Search for eco/regen-focused agents
 */
export async function searchEcoAgents(): Promise<VirtualsBrowseResponse> {
  const ecoKeywords = ['eco', 'environment', 'climate', 'nature', 'green', 'regen', 'conservation'];

  // Search for each keyword and combine results
  const results = await Promise.all(
    ecoKeywords.slice(0, 3).map(keyword =>
      browseVirtualsAgents({ query: keyword, limit: 10 })
    )
  );

  // Dedupe by ID
  const seen = new Set<string>();
  const agents: VirtualsAgent[] = [];

  for (const result of results) {
    for (const agent of result.agents) {
      if (!seen.has(agent.id)) {
        seen.add(agent.id);
        agents.push(agent);
      }
    }
  }

  return {
    agents,
    total: agents.length,
    hasMore: false,
  };
}

// =============================================================================
// API MAPPING
// =============================================================================

function mapApiAgentToVirtualsAgent(api: VirtualsApiAgent): VirtualsAgent {
  const isGraduated = api.mcapInVirtual > 0 && api.lpAddress !== null;

  return {
    id: api.uid || String(api.id),
    name: api.name,
    description: api.description,
    walletAddress: api.walletAddress || api.tbaAddress || api.daoAddress,
    tokenAddress: api.tokenAddress,
    imageUrl: api.image?.url,

    // ACP-style fields mapped from token metrics
    graduationStatus: isGraduated ? 'GRADUATED' : 'NOT_GRADUATED',
    onlineStatus: api.priceChangePercent24h !== 0 ? 'ONLINE' : 'OFFLINE',
    successfulJobCount: api.holderCount || 0,
    successRate: Math.min(100, Math.max(0, 50 + (api.priceChangePercent24h || 0))),
    uniqueBuyerCount: api.holderCount || 0,
    lastOnlineAt: api.lpCreatedAt ? new Date(api.lpCreatedAt).getTime() / 1000 : undefined,

    // Offerings (agents don't have explicit offerings in this API)
    offerings: [],

    // Token metrics
    tokenMetrics: isGraduated ? {
      marketCap: api.mcapInVirtual || 0,
      price: parseFloat(api.virtualTokenValue || '0'),
      holders: api.holderCount || 0,
      volume24h: api.volume24h || 0,
    } : undefined,

    // Metadata
    createdAt: api.createdAt ? new Date(api.createdAt).getTime() / 1000 : Date.now() / 1000,
    category: api.category,
    tags: api.cores?.map(c => c.name.toLowerCase()) || [],
  };
}

// =============================================================================
// MOCK DATA FALLBACK
// =============================================================================

const MOCK_VIRTUALS_AGENTS: VirtualsAgent[] = [
  {
    id: 'luna-agent',
    name: 'Luna',
    description: 'AI influencer agent specialized in crypto markets and community engagement',
    walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
    tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
    imageUrl: 'https://app.virtuals.io/agents/luna/avatar.png',
    graduationStatus: 'GRADUATED',
    onlineStatus: 'ONLINE',
    successfulJobCount: 457909,
    successRate: 94.2,
    uniqueBuyerCount: 457909,
    lastOnlineAt: Date.now() / 1000 - 120,
    offerings: [],
    tokenMetrics: {
      marketCap: 45_000_000,
      price: 0.0023,
      holders: 457909,
      volume24h: 890_000,
    },
    createdAt: Date.now() / 1000 - 86400 * 180,
    category: 'Entertainment',
    tags: ['crypto', 'twitter', 'engagement'],
  },
  {
    id: 'eco-sentinel',
    name: 'EcoSentinel',
    description: 'Environmental monitoring agent for bioregion health tracking',
    walletAddress: '0x3456789012abcdef3456789012abcdef34567890',
    graduationStatus: 'NOT_GRADUATED',
    onlineStatus: 'ONLINE',
    successfulJobCount: 89,
    successRate: 97.1,
    uniqueBuyerCount: 23,
    lastOnlineAt: Date.now() / 1000 - 300,
    offerings: [],
    createdAt: Date.now() / 1000 - 86400 * 45,
    category: 'Environmental',
    tags: ['ecology', 'monitoring', 'regen'],
  },
  {
    id: 'camargue-flamingo',
    name: 'Camargue Flamingo Agent',
    description: 'Species representation agent advocating for Greater Flamingo habitat in the Camargue',
    walletAddress: '0x4567890123abcdef4567890123abcdef45678901',
    graduationStatus: 'NOT_GRADUATED',
    onlineStatus: 'ONLINE',
    successfulJobCount: 42,
    successRate: 100,
    uniqueBuyerCount: 15,
    lastOnlineAt: Date.now() / 1000 - 600,
    offerings: [],
    createdAt: Date.now() / 1000 - 86400 * 30,
    category: 'Conservation',
    tags: ['species', 'advocacy', 'camargue', 'flamingo'],
  },
  {
    id: 'chesapeake-crab',
    name: 'Blue Crab Guardian',
    description: 'Ecosystem agent monitoring Chesapeake Bay blue crab populations',
    walletAddress: '0x5678901234abcdef5678901234abcdef56789012',
    graduationStatus: 'NOT_GRADUATED',
    onlineStatus: 'OFFLINE',
    successfulJobCount: 28,
    successRate: 92.5,
    uniqueBuyerCount: 11,
    lastOnlineAt: Date.now() / 1000 - 7200,
    offerings: [],
    createdAt: Date.now() / 1000 - 86400 * 60,
    category: 'Conservation',
    tags: ['species', 'chesapeake', 'blue-crab', 'monitoring'],
  },
];

function getMockAgents(params: VirtualsBrowseParams): VirtualsBrowseResponse {
  let agents = [...MOCK_VIRTUALS_AGENTS];

  if (params.query) {
    const q = params.query.toLowerCase();
    agents = agents.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.description?.toLowerCase().includes(q) ||
      a.tags?.some(t => t.toLowerCase().includes(q))
    );
  }

  if (params.graduationStatus && params.graduationStatus !== 'ALL') {
    agents = agents.filter(a => a.graduationStatus === params.graduationStatus);
  }

  if (params.onlineStatus && params.onlineStatus !== 'ALL') {
    agents = agents.filter(a => a.onlineStatus === params.onlineStatus);
  }

  const total = agents.length;
  const offset = params.offset || 0;
  const limit = params.limit || 20;
  agents = agents.slice(offset, offset + limit);

  return {
    agents,
    total,
    hasMore: offset + agents.length < total,
  };
}
