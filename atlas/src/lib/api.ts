/**
 * Ecospatial API client
 *
 * EII data source: Landbanking Group Ecosystem Integrity Index
 * In development mode, generates deterministic mock data based on bioregion codes.
 * In production, connects to the real Landbanking EII API.
 */

const EII_API_BASE = import.meta.env.VITE_EII_API_URL || '';
const USE_MOCK = !EII_API_BASE;

// Static EII scores loaded from /eii/scores.json (if it exists)
interface StaticEIIScore {
  bioregionId: string;
  epoch: number;
  eii: number;
  pillars: { function: number; structure: number; composition: number };
  limitingPillar: string;
  delta?: number;
  measuredAt: number;
}

let staticEIICache: Record<string, StaticEIIScore> | null | undefined; // undefined = not yet attempted

/**
 * Load all EII scores from /eii/scores.json (singleton fetch).
 * Returns the scores map, or null if the file doesn't exist.
 */
export async function loadEIIScores(): Promise<Record<string, StaticEIIScore> | null> {
  if (staticEIICache !== undefined) return staticEIICache;
  try {
    const res = await fetch('/eii/scores.json');
    if (!res.ok) { staticEIICache = null; return null; }
    const data = await res.json();
    // Strip _meta key (schema documentation)
    const { _meta, ...scores } = data;
    staticEIICache = scores;
    return scores;
  } catch {
    staticEIICache = null;
    return null;
  }
}

// Deterministic hash for consistent mock data per bioregion
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Generate deterministic EII score for a bioregion code
function generateMockEII(bioregionCode: string, epoch: number = 0) {
  const hash = hashCode(bioregionCode + epoch);
  const baseEII = 0.4 + (hash % 500) / 1000; // 0.4-0.9 range
  const functionScore = baseEII + ((hash >> 8) % 100 - 50) / 1000;
  const structureScore = baseEII + ((hash >> 16) % 100 - 50) / 1000;
  const compositionScore = baseEII + ((hash >> 24) % 100 - 50) / 1000;

  const pillars = {
    function: Math.min(1, Math.max(0, functionScore)),
    structure: Math.min(1, Math.max(0, structureScore)),
    composition: Math.min(1, Math.max(0, compositionScore)),
  };

  // Limiting pillar is the lowest
  const limitingPillar =
    pillars.function <= pillars.structure && pillars.function <= pillars.composition
      ? 'function'
      : pillars.structure <= pillars.composition
        ? 'structure'
        : 'composition';

  return {
    bioregionId: bioregionCode,
    epoch: epoch || Math.floor(Date.now() / (86400 * 180 * 1000)), // ~6 month epochs
    eii: Math.min(1, Math.max(0, baseEII)),
    pillars,
    limitingPillar,
    delta: ((hash % 20) - 10) / 1000, // -0.01 to +0.01
    measuredAt: Math.floor(Date.now() / 1000),
  };
}

// Generate EII history for a bioregion
function generateMockEIIHistory(bioregionCode: string, limit: number = 12) {
  return Array.from({ length: limit }, (_, i) => {
    const epoch = Math.floor(Date.now() / (86400 * 180 * 1000)) - i;
    return generateMockEII(bioregionCode, epoch);
  });
}

async function fetchEII<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${EII_API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`EII API error: ${res.status}`);
  }

  return res.json();
}

async function fetchWithMock<T>(endpoint: string, mockData: T): Promise<T> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 100));
    return mockData;
  }
  return fetchEII<T>(endpoint);
}

export const api = {
  /**
   * Get latest EII score for a bioregion
   * Fallback chain: real API → static JSON → mock
   * @param bioregionCode - Bioregion code from GeoJSON (e.g., "PAL_1", "NA_7")
   */
  getLatestEII: async (bioregionCode: string) => {
    if (!USE_MOCK) return fetchEII(`/eii/${bioregionCode}/latest`);
    const scores = await loadEIIScores();
    if (scores?.[bioregionCode]) return scores[bioregionCode];
    await new Promise((r) => setTimeout(r, 100));
    return generateMockEII(bioregionCode);
  },

  /**
   * Get EII history for a bioregion
   * History stays mock (a single snapshot can't provide history)
   * @param bioregionCode - Bioregion code from GeoJSON
   * @param limit - Number of historical readings to fetch
   */
  getEIIHistory: (bioregionCode: string, limit: number = 12) =>
    fetchWithMock(`/eii/${bioregionCode}/history?limit=${limit}`, generateMockEIIHistory(bioregionCode, limit)),

  /**
   * Get EII rankings across all bioregions
   * Uses static JSON when available, falls back to mock
   */
  getEIIRankings: async (bioregionCodes: string[] = []) => {
    if (!USE_MOCK) return fetchEII('/eii/rankings');
    const scores = await loadEIIScores();
    await new Promise((r) => setTimeout(r, 100));
    return bioregionCodes
      .map((code) => {
        const entry = scores?.[code];
        const eii = entry || generateMockEII(code);
        return {
          bioregionId: code,
          name: code,
          currentEII: eii.eii,
          delta: eii.delta,
          rank: 0,
          trend: (eii.delta || 0) > 0.001 ? 'up' : (eii.delta || 0) < -0.001 ? 'down' : 'stable',
        };
      })
      .sort((a, b) => b.currentEII - a.currentEII)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  },

  /**
   * Get bioregion EII history (alias for getEIIHistory)
   */
  getBioregionEIIHistory: (bioregionCode: string, limit: number = 12) =>
    api.getEIIHistory(bioregionCode, limit),

  // ============ A2A Agent Layer ============

  /**
   * Get agents committed to a bioregion
   * @param bioregionCode - Bioregion code from GeoJSON
   */
  getAgentsByBioregion: (bioregionCode: string) => {
    // owockibot — AI agent swarm on Base, 25 live mechanisms, bioregional coordination
    // https://owockibot.xyz | @owockibot | treasury: 0x26B7805Dd8aEc26DA55fc8e0c659cf6822b740Be
    const owockiBot = {
      id: 'agent-owockibot',
      address: '0x26B7805Dd8aEc26DA55fc8e0c659cf6822b740Be',
      actorType: 'AGENT' as const,
      agentType: 'SOCIAL' as const,
      status: 'ACTIVE' as const,
      name: 'owockibot',
      tier: 'ECOSYSTEM' as const,
      reputationScore: 92,
      active: true,
      avatar: '/images/agents/owockibot.webp',
      website: 'https://owockibot.xyz',
      twitter: '@owockibot',
      esvStaked: 0,
      esvEarned: 0,
      actionsCompleted: 25,
      bioregion: { id: bioregionCode, name: bioregionCode },
      mission: 'AI agent swarm building coordination infrastructure on Base. 25 deployed mechanisms (QF, bounties, staking, bonding curves, prediction markets). Bioregional pilots for watershed-scale ecological coordination.',
      pillarFocus: 'holistic' as const,
      commitments: [{
        id: `commit-owockibot-${bioregionCode}`,
        actorId: 'agent-owockibot',
        bioregionId: bioregionCode,
        percentageBps: 10000,
        createdAt: new Date('2024-12-01').getTime() / 1000,
        updatedAt: Date.now() / 1000,
      }],
      totalCommitmentBps: 10000,
      totalESVEarned: 0,
      proposalsSubmitted: 0,
      bountiesCompleted: 6,
      createdAt: new Date('2024-12-01').getTime() / 1000,
    };

    return fetchWithMock(`/agents/bioregion/${bioregionCode}`, [owockiBot]);
  },

  /**
   * Get active bounties for a bioregion
   * @param bioregionCode - Bioregion code from GeoJSON
   */
  getBountiesByBioregion: (bioregionCode: string) => {
    const hash = hashCode(bioregionCode);
    const bountyCount = hash % 4; // 0-3 active bounties

    const bountyTypes = ['GROUND_TRUTH', 'SENSOR_INSTALL', 'SPECIES_SURVEY', 'INVASIVE_REMOVAL', 'WATER_SAMPLE'] as const;

    const bounties = Array.from({ length: bountyCount }, (_, i) => {
      const bountyHash = hashCode(bioregionCode + 'bounty' + i);
      return {
        id: `bounty-${bioregionCode}-${i}`,
        onchainId: i + 1,
        bioregionId: bioregionCode,
        bountyType: bountyTypes[bountyHash % bountyTypes.length],
        title: `${bountyTypes[bountyHash % bountyTypes.length].replace('_', ' ')} Task`,
        description: 'Field verification needed',
        rewardAmount: 50 + (bountyHash % 200),
        rewardToken: 'ESV',
        status: 'OPEN' as const,
        deadline: Date.now() / 1000 + 86400 * (7 + (bountyHash % 14)),
        createdAt: Date.now() / 1000 - (bountyHash % 86400 * 7),
      };
    });

    return fetchWithMock(`/bounties/bioregion/${bioregionCode}`, bounties);
  },
};

// Helper to generate agent names
function generateAgentName(hash: number): string {
  const prefixes = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta'];
  const suffixes = ['Monitor', 'Sentinel', 'Guardian', 'Watcher', 'Scout', 'Ranger', 'Observer', 'Keeper'];
  return `${prefixes[hash % prefixes.length]} ${suffixes[(hash >> 4) % suffixes.length]}`;
}

// Agent value categories per PRD Section 5.2
const AGENT_VALUE_CATEGORIES = [
  'yield', 'spectacle', 'monitoring', 'verification', 'coordination',
  'representation', 'research', 'memory', 'advocacy', 'labor',
] as const;

export type AgentValueCategory = typeof AGENT_VALUE_CATEGORIES[number];

export interface AgentValueBreakdown {
  category: AgentValueCategory;
  score: number; // 0-100
  description: string;
}

// Extended API methods for agent detail page
export const agentApi = {
  /**
   * Get agent by address
   * @param address - Agent wallet address
   */
  getAgentByAddress: (address: string) => {
    const agent = {
      id: 'agent-owockibot',
      address: '0x26B7805Dd8aEc26DA55fc8e0c659cf6822b740Be',
      actorType: 'AGENT' as const,
      agentType: 'SOCIAL' as const,
      status: 'ACTIVE' as const,
      name: 'owockibot',
      tier: 'ECOSYSTEM' as const,
      reputationScore: 92,
      active: true,
      avatar: '/images/agents/owockibot.webp',
      website: 'https://owockibot.xyz',
      twitter: '@owockibot',
      esvStaked: 0,
      esvEarned: 0,
      actionsCompleted: 25,
      mission: 'AI agent swarm building coordination infrastructure on Base. 25 deployed mechanisms (QF, bounties, staking, bonding curves, prediction markets). Bioregional pilots for watershed-scale ecological coordination.',
      pillarFocus: 'holistic' as const,
      commitments: [],
      totalCommitmentBps: 10000,
      totalESVEarned: 0,
      proposalsSubmitted: 0,
      bountiesCompleted: 6,
      createdAt: new Date('2024-12-01').getTime() / 1000,
      acpServices: ['bounty-board', 'quadratic-funding', 'staking', 'bonding-curves', 'prediction-markets'],
      virtualBalance: 0,
    };

    return fetchWithMock(`/agents/${address}`, agent);
  },

  /**
   * Get agent value breakdown (10 categories from PRD)
   * @param address - Agent wallet address
   */
  getAgentValueBreakdown: (address: string): Promise<AgentValueBreakdown[]> => {
    const hash = hashCode(address);
    const agentType = ['MONITORING', 'ECONOMIC', 'SOCIAL', 'SPECIALIST', 'REPRESENTATION'][hash % 5];

    // Each agent type excels in different categories
    const typeBoosts: Record<string, AgentValueCategory[]> = {
      MONITORING: ['monitoring', 'verification', 'memory'],
      ECONOMIC: ['yield', 'coordination', 'labor'],
      SOCIAL: ['spectacle', 'advocacy', 'coordination'],
      SPECIALIST: ['research', 'verification', 'memory'],
      REPRESENTATION: ['representation', 'advocacy', 'spectacle'],
    };

    const boosts = typeBoosts[agentType] || [];

    const breakdown = AGENT_VALUE_CATEGORIES.map((category) => {
      const categoryHash = hashCode(address + category);
      const baseScore = 20 + (categoryHash % 60);
      const boosted = boosts.includes(category) ? 20 : 0;

      return {
        category,
        score: Math.min(100, baseScore + boosted),
        description: getValueDescription(category),
      };
    });

    return fetchWithMock(`/agents/${address}/value`, breakdown);
  },

  /**
   * Get agent activity feed
   * @param address - Agent wallet address
   */
  getAgentActivity: (address: string, limit: number = 20) => {
    const entryTypes = [
      'COMMITMENT_CREATED', 'PROPOSAL_SUBMITTED', 'BOUNTY_POSTED',
      'EII_UPDATED', 'BOUNTY_COMPLETED', 'YIELD_CAPTURED',
    ] as const;

    const activities = Array.from({ length: limit }, (_, i) => {
      const activityHash = hashCode(address + i);
      const entryType = entryTypes[activityHash % entryTypes.length];
      return {
        id: `activity-${address.slice(-8)}-${i}`,
        bioregionId: `PAL_${1 + (activityHash % 20)}`,
        entryType,
        message: generateActivityMessage(entryType, activityHash),
        timestamp: Date.now() / 1000 - (i * 3600 * 4) - (activityHash % 3600),
        txHash: `0x${activityHash.toString(16).padStart(64, 'a')}`,
      };
    });

    return fetchWithMock(`/agents/${address}/activity`, activities);
  },
};

function generateAcpServices(hash: number): string[] {
  const services = ['EII_REPORT', 'EII_HISTORY', 'PROPOSAL_ANALYSIS', 'BOUNTY_MATCHING', 'VERIFICATION_CHALLENGE'];
  const count = 1 + (hash % 4);
  return services.slice(0, count);
}

function getValueDescription(category: AgentValueCategory): string {
  const descriptions: Record<AgentValueCategory, string> = {
    yield: 'Capital contribution through inference fees, staking, and trading',
    spectacle: 'Attention generation via commentary, rivalry, and milestones',
    monitoring: 'Sensing and data collection including EII ingestion',
    verification: 'Trust and integrity via challenges and evidence',
    coordination: 'Orchestration and routing of bounties and allocations',
    representation: 'Proxy for species, ecosystems, and bioregions',
    research: 'Pattern discovery, correlations, and predictions',
    memory: 'Persistent context, history, and seasonal patterns',
    advocacy: 'Argumentation, persuasion, and priority setting',
    labor: 'Operational execution including bounty management',
  };
  return descriptions[category];
}

function generateActivityMessage(entryType: string, hash: number): string {
  const messages: Record<string, string[]> = {
    COMMITMENT_CREATED: ['Committed 30% to bioregion', 'Joined bioregion governance', 'Staked ESV to region'],
    PROPOSAL_SUBMITTED: ['Submitted restoration proposal', 'Proposed monitoring upgrade', 'Filed conservation request'],
    BOUNTY_POSTED: ['Posted ground truth bounty', 'Requested species survey', 'Listed sensor installation task'],
    EII_UPDATED: ['Reported EII improvement', 'Flagged structure decline', 'Updated composition score'],
    BOUNTY_COMPLETED: ['Verified field submission', 'Approved ground truth data', 'Completed species count'],
    YIELD_CAPTURED: ['Captured 0.1% spatial fee', 'Earned settlement reward', 'Received coordination fee'],
  };
  const options = messages[entryType] || ['Activity recorded'];
  return options[hash % options.length];
}
