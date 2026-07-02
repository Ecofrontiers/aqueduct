export interface Vault {
  id: string;
  bioregionId: string;
  esvToken: string;
  stablecoin: string;

  // Balances
  totalReserve: number;
  pendingYield: number;
  totalESVMinted: number;

  // Parameters
  proposalShareBps: number;
  liquidityShareBps: number;
  epochDuration: number;
  minStake: number;
  maxStake: number;
  maxProposalsPerEpoch: number;
  challengePeriod: number;

  // Epoch
  currentEpoch: number;
  epochStartTimestamp: number;

  createdAt: number;
}

export interface VaultStats {
  totalLocked: number;
  totalYieldGenerated: number;
  totalESVMinted: number;
  totalCommittedAgents: number;
  vaultCount: number;
}

export interface YieldSource {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface YieldDistribution {
  proposalPool: number;
  liquidityPool: number;
  totalYield: number;
}

export interface Deposit {
  id: string;
  vault: string;
  depositor: string;
  amount: number;
  shares: number;
  txHash: string;
  createdAt: number;
}

export interface Withdrawal {
  id: string;
  vault: string;
  withdrawer: string;
  amount: number;
  shares: number;
  txHash: string;
  createdAt: number;
}

export interface AgentCommitment {
  id: string;
  agentAddress: string;
  agentName?: string;
  bioregionId: string;
  percentageBps: number;
  totalESVEarned: number;
  createdAt: number;
}
