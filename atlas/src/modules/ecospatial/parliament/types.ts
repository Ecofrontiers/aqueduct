/**
 * Parliament types — Interspecies Parliament data model.
 * Reconstructed from consuming code (Parliament.tsx) and epoch JSON archives.
 */

// ── Core Enums ──

export type ParliamentPhase =
  | 'INTELLIGENCE'
  | 'SENSING'
  | 'DELIBERATION'
  | 'BOUNTIES'
  | 'STAKING'
  | 'SETTLEMENT'
  | 'SPECTACLE';

export type AgentClass =
  | 'species'
  | 'biome'
  | 'climate_system'
  | 'economic_model'
  | 'compliance'
  | 'future'
  | 'mrv'
  | 'restoration'
  | 'social';

// ── Feed & Messaging ──

export interface FeedMessage {
  id: string;
  from: string;
  from_id: string;
  to: string;
  to_id: string;
  type: string;
  content: string;
  structured_data?: Record<string, unknown>;
  timestamp: string;
  reply_to?: string;
  phase?: ParliamentPhase;
}

export interface Whisper {
  id: string;
  from: string;
  from_id: string;
  to: string;
  to_id: string;
  type: 'whisper' | 'gossip';
  content: string;
  about?: string;
  timestamp: string;
}

// ── Agent State ──

export interface Bond {
  trust: number;
  tension: number;
  depth: number;
}

export interface ParliamentAgentState {
  id: string;
  name: string;
  class: string;
  soul_depth: number;
  bonds: Record<string, Bond>;
  memory: unknown[];
  stake: { esv: number };
}

// ── Entity References ──

export interface EntityRef {
  type: 'asset' | 'actor' | 'action' | 'zone';
  name: string;
  id?: string;
  coordinates?: [number, number];
}

// ── Proposals & Settlement ──

export interface ProposalSupporter {
  agent_id: string;
  amount: number;
}

export interface Proposal {
  id: string;
  title: string;
  target_pillar: string;
  total_stake: number;
  supporters: ProposalSupporter[];
  source: 'standing' | 'deliberation';
  proposed_by: string | null;
  cost_usdc?: number;
  estimated_eii_delta?: number;
}

export interface FundedProposal {
  id: string;
  title: string;
  cost: number;
  stake: number;
  source: string;
}

export interface Settlement {
  funded: FundedProposal[];
  unfunded: string[];
  treasury_remaining: number;
}

// ── Bounties ──

export interface Bounty {
  id: string;
  description: string;
  category?: string;
  status: 'open' | 'claimed' | 'verified' | 'expired';
  reward_esv: number;
  posted_by?: string;
  posted_by_id?: string;
  deadline_epochs?: number;
  timestamp?: string;
}

// ── EII Scores ──

export interface EIIScores {
  function: number;
  structure: number;
  composition: number;
  overall: number;
}

// ── Provenance ──

export interface Provenance {
  data_sources: string[];
  methodology: string;
  confidence: number;
  verifiers: string[];
  cid?: string;
}

// ── LLM Stats ──

export interface LLMStats {
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

// ── Epoch Archive (full epoch data) ──

export interface EpochArchive {
  epoch_id: number;
  bioregion: string;
  timestamp: string;
  version?: number;
  phases: ParliamentPhase[];
  eii_before: EIIScores;
  eii_after: EIIScores;
  eii_delta: EIIScores;
  settlement: Settlement;
  proposals: Proposal[];
  bounties: Bounty[];
  agent_states: ParliamentAgentState[];
  feed: FeedMessage[];
  whispers: Whisper[];
  provenance: Provenance;
  llm_stats: LLMStats;
  atlas_context?: {
    assets_referenced: number;
    orgs_referenced: number;
  };
}

// ── Epoch Summary (lightweight, for lists and sparklines) ──

export interface EpochSummary {
  epoch_id: number;
  bioregion: string;
  timestamp: string;
  eii_before: EIIScores;
  eii_after: EIIScores;
  eii_delta: EIIScores;
  feedCount: number;
  agentCount: number;
}

// ── Constants ──

export const AGENT_CLASS_COLORS: Record<string, string> = {
  species: 'text-emerald-600',
  biome: 'text-green-600',
  climate_system: 'text-blue-600',
  economic_model: 'text-amber-600',
  compliance: 'text-gray-500',
  future: 'text-purple-600',
  mrv: 'text-cyan-600',
  restoration: 'text-lime-600',
  social: 'text-rose-600',
};

export const AGENT_CLASS_LABELS: Record<string, string> = {
  species: 'Species',
  biome: 'Biome',
  climate_system: 'Climate System',
  economic_model: 'Economic Model',
  compliance: 'Compliance',
  future: 'Future Generation',
  mrv: 'MRV',
  restoration: 'Restoration',
  social: 'Social',
};

export const PHASE_CONFIG: Record<ParliamentPhase, { label: string; color: string }> = {
  INTELLIGENCE: { label: 'Intelligence', color: 'bg-blue-500' },
  SENSING: { label: 'Sensing', color: 'bg-cyan-500' },
  DELIBERATION: { label: 'Deliberation', color: 'bg-purple-500' },
  BOUNTIES: { label: 'Bounties', color: 'bg-rose-500' },
  STAKING: { label: 'Staking', color: 'bg-emerald-500' },
  SETTLEMENT: { label: 'Settlement', color: 'bg-amber-500' },
  SPECTACLE: { label: 'Spectacle', color: 'bg-indigo-500' },
};

/** Known assets for entity linking in feed messages. */
export const KNOWN_ASSETS: Record<string, { type: string; protocol: string }> = {
  'SolarCamargue-7': { type: 'Solar', protocol: 'Glow' },
  'TCO2-VCS-1764': { type: 'Carbon Credit', protocol: 'Toucan' },
  'NCT Pool': { type: 'Carbon Pool', protocol: 'Toucan' },
  'Regen C04': { type: 'Credit Class', protocol: 'Regen Network' },
};

/** Known organizations for entity linking. */
export const KNOWN_ORGS: string[] = [
  'Tour du Valat',
  'Parc de Camargue',
  'Conservatoire du Littoral',
  'SNPN',
  'Office Français de la Biodiversité',
];

/** Known zones with coordinates for map markers. */
export const KNOWN_ZONES: Record<string, [number, number]> = {
  'Zone 7': [4.55, 43.45],
  'Zone 12': [4.68, 43.38],
  'Camargue': [4.63, 43.50],
  'Rhone Delta': [4.60, 43.35],
  'Gulf of Lion': [4.10, 43.10],
  'Posidonia': [4.85, 43.25],
};

/** Bounty category config for display. */
export const BOUNTY_CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  monitoring: { label: 'Monitoring', color: 'text-cyan-600', bg: 'bg-cyan-100' },
  verification: { label: 'Verification', color: 'text-blue-600', bg: 'bg-blue-100' },
  restoration: { label: 'Restoration', color: 'text-green-600', bg: 'bg-green-100' },
  research: { label: 'Research', color: 'text-purple-600', bg: 'bg-purple-100' },
  advocacy: { label: 'Advocacy', color: 'text-rose-600', bg: 'bg-rose-100' },
};
