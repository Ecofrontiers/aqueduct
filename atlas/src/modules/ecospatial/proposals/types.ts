export type ProposalStatus =
  | 'Pending'
  | 'Funded'
  | 'Active'
  | 'Settled'
  | 'Slashed';

export type TargetPillar = 0 | 1 | 2; // function, structure, composition

export const PILLAR_NAMES: Record<TargetPillar, string> = {
  0: 'Function',
  1: 'Structure',
  2: 'Composition',
};

export const PILLAR_COLORS: Record<TargetPillar, string> = {
  0: '#22c55e', // green
  1: '#3b82f6', // blue
  2: '#a855f7', // purple
};

export interface Proposal {
  id: string;
  onchainId: number;
  bioregionId: string;
  bioregion?: {
    id: string;
    name: string;
  };
  vault?: string;
  submitter: string;
  targetPillar: TargetPillar;
  descriptionHash: string;

  // Funding
  stakeAmount: number;
  fundedAmount: number;
  fundingTarget: number;
  fundingRatio: number;

  // Status
  status: ProposalStatus;
  epoch: number;

  // Settlement
  eiiDelta?: number;
  rewardAmount?: number;
  slashAmount?: number;
  settledAt?: number;

  createdAt: number;
}

export interface ProposalFunding {
  id: string;
  proposal: string;
  funder: string;
  amount: number;
  createdAt: number;
}

export interface ProposalFilters {
  bioregionId?: string;
  status?: ProposalStatus;
  limit?: number;
  offset?: number;
}

export interface PrepareProposalInput {
  bioregionId: string;
  targetPillar: TargetPillar;
  title: string;
  description: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  stakeAmount: string;
}

export interface PrepareProposalResult {
  descriptionHash: string;
  locationProofHash?: string;
}
