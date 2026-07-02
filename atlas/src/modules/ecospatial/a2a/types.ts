// Actor Types
export type ActorType = 'ORGANIZATION' | 'AGENT';

export interface Actor {
  id: string;
  address: string;
  actorType: ActorType;
  name?: string;
  erc8004Id?: string;
  commitments: Commitment[];
  totalCommitmentBps: number;
  totalESVEarned: number;
  proposalsSubmitted: number;
  bountiesCompleted: number;
  createdAt: number;
}

// Agent Types
export type AgentType =
  | 'MONITORING'
  | 'ECONOMIC'
  | 'SOCIAL'
  | 'SPECIALIST'
  | 'REPRESENTATION';

export type AgentTier = 'SPECIES' | 'ECOSYSTEM' | 'ECONOMIC';

export type AgentStatus = 'ACTIVE' | 'IDLE' | 'OFFLINE';

export interface Agent extends Actor {
  actorType: 'AGENT';
  agentType: AgentType;
  tier: AgentTier;
  status: AgentStatus;
  reputationScore: number;
  active: boolean;
  acpServices?: string[];
  virtualBalance?: number;
  bioregion?: {
    id: string;
    name: string;
  };
  yieldDelegation?: number;
  esvStaked: number;
  esvEarned: number;
  actionsCompleted: number;
  // Soul-related fields
  mission?: string;
  pillarFocus?: 'function' | 'structure' | 'composition' | 'holistic';
  speciesRepresented?: string;
  ecosystemType?: string;
}

export interface Commitment {
  id: string;
  actorId: string;
  bioregionId: string;
  percentageBps: number;
  locationProofCID?: string;
  createdAt: number;
  updatedAt: number;
}

// Bounty Types
export type BountyType =
  | 'GROUND_TRUTH'
  | 'SENSOR_INSTALL'
  | 'SPECIES_SURVEY'
  | 'INVASIVE_REMOVAL'
  | 'WATER_SAMPLE';

export type BountyStatus =
  | 'OPEN'
  | 'CLAIMED'
  | 'SUBMITTED'
  | 'VERIFIED'
  | 'PAID'
  | 'EXPIRED';

export interface Bounty {
  id: string;
  onchainId: number;
  bioregionId: string;
  poster: Actor;
  bountyType: BountyType;
  title: string;
  description: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  rewardAmount: number;
  rewardToken: string;
  status: BountyStatus;
  claimer?: Actor;
  claimProofCID?: string;
  deadline: number;
  createdAt: number;
}

export interface BountyFilters {
  bioregionId?: string;
  bountyType?: BountyType;
  status?: BountyStatus;
  nearCoordinates?: {
    lat: number;
    lng: number;
    radiusKm: number;
  };
}

// Feed Types
export type FeedEntryType =
  | 'COMMITMENT_CREATED'
  | 'COMMITMENT_UPDATED'
  | 'PROPOSAL_SUBMITTED'
  | 'PROPOSAL_FUNDED'
  | 'PROPOSAL_SETTLED'
  | 'BOUNTY_POSTED'
  | 'BOUNTY_CLAIMED'
  | 'BOUNTY_COMPLETED'
  | 'EII_UPDATED'
  | 'YIELD_CAPTURED';

export interface FeedEntry {
  id: string;
  bioregionId: string;
  actor?: Actor;
  entryType: FeedEntryType;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
  txHash?: string;
}

export interface FeedFilters {
  bioregionId?: string;
  actorId?: string;
  entryTypes?: FeedEntryType[];
  since?: number;
}

// Tournament Types
export type TournamentStatus = 'Pending' | 'Active' | 'Completed';

export interface Tournament {
  id: string;
  tournamentType: string;
  status: TournamentStatus;
  currentRound: number;
  totalRounds: number;
  prizePool: number;
  entryStake: number;
  participantCount: number;
  activeCount: number;
  bioregions: { id: string; name: string }[];
  startTime: number;
  endTime: number;
}

export interface TournamentStanding {
  rank: number;
  participant: Actor;
  score: number;
  isEliminated: boolean;
}

// Agent type display helpers
export const AGENT_TYPE_LABELS: Record<AgentType, string> = {
  MONITORING: 'Monitoring',
  ECONOMIC: 'Economic',
  SOCIAL: 'Social',
  SPECIALIST: 'Specialist',
  REPRESENTATION: 'Representation',
};

// Agent tier display helpers
export const AGENT_TIER_LABELS: Record<AgentTier, string> = {
  SPECIES: 'Species',
  ECOSYSTEM: 'Ecosystem',
  ECONOMIC: 'Economic',
};

export const AGENT_TIER_DESCRIPTIONS: Record<AgentTier, string> = {
  SPECIES: 'Optimizes for single species habitat and population',
  ECOSYSTEM: 'Coordinates holistic ecosystem health across pillars',
  ECONOMIC: 'Maximizes yield while respecting ecosystem constraints',
};

export const AGENT_TIER_COLORS: Record<AgentTier, { bg: string; text: string; border: string }> = {
  SPECIES: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  ECOSYSTEM: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  ECONOMIC: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
};

export const AGENT_TIER_ICONS: Record<AgentTier, string> = {
  SPECIES: '\uD83E\uDDA9', // Flamingo
  ECOSYSTEM: '\uD83C\uDF3F', // Herb/plant
  ECONOMIC: '\uD83D\uDCB0', // Money bag
};

export const AGENT_TYPE_EMOJIS: Record<AgentType, string> = {
  MONITORING: '\uD83D\uDC41\uFE0F',
  ECONOMIC: '\uD83D\uDCB0',
  SOCIAL: '\uD83D\uDDE3\uFE0F',
  SPECIALIST: '\uD83D\uDD2C',
  REPRESENTATION: '\uD83E\uDDA9',
};

export const STATUS_COLORS: Record<AgentStatus, string> = {
  ACTIVE: 'bg-green-500',
  IDLE: 'bg-yellow-500',
  OFFLINE: 'bg-gray-400',
};

export const BOUNTY_TYPE_CONFIG: Record<BountyType, { label: string; color: string }> = {
  GROUND_TRUTH: { label: 'Ground Truth', color: 'bg-blue-100 text-blue-700' },
  SENSOR_INSTALL: { label: 'Sensor Install', color: 'bg-purple-100 text-purple-700' },
  SPECIES_SURVEY: { label: 'Species Survey', color: 'bg-green-100 text-green-700' },
  INVASIVE_REMOVAL: { label: 'Invasive Removal', color: 'bg-orange-100 text-orange-700' },
  WATER_SAMPLE: { label: 'Water Sample', color: 'bg-cyan-100 text-cyan-700' },
};

export const BOUNTY_STATUS_CONFIG: Record<BountyStatus, { label: string; color: string }> = {
  OPEN: { label: 'Open', color: 'bg-green-100 text-green-700' },
  CLAIMED: { label: 'Claimed', color: 'bg-yellow-100 text-yellow-700' },
  SUBMITTED: { label: 'Submitted', color: 'bg-blue-100 text-blue-700' },
  VERIFIED: { label: 'Verified', color: 'bg-purple-100 text-purple-700' },
  PAID: { label: 'Paid', color: 'bg-green-100 text-green-700' },
  EXPIRED: { label: 'Expired', color: 'bg-gray-100 text-gray-700' },
};
