/**
 * Agent Souls — Emergent assemblages of bioregional memory + agent compute
 *
 * Souls are NOT static configs. They emerge from:
 * 1. Bioregional memory structures (EII history, outcomes, patterns)
 * 2. Agent compute capacity (inference, specialization)
 * 3. Accumulated experience (actions, predictions, reputation)
 */

// ============================================================================
// AGENT TIER HIERARCHY
// ============================================================================

export type AgentTier = 'SPECIES' | 'ECOSYSTEM' | 'ECONOMIC';

export interface AgentTierConfig {
  tier: AgentTier;
  primaryFocus: string;
  valueWeights: ValueWeights;
  constraints: TierConstraints;
}

/**
 * Species tier: Optimizes for single species habitat and population
 * - Primary value: Representation, Advocacy
 * - Pillar focus: Composition (biodiversity)
 * - Financial: Conservative, long-horizon
 */
export interface SpeciesAgentConfig extends AgentTierConfig {
  tier: 'SPECIES';
  speciesId: string;
  speciesName: string;
  habitatRequirements: HabitatRequirements;
  populationTarget: PopulationTarget;
}

/**
 * Ecosystem tier: Optimizes for holistic ecosystem health
 * - Primary value: Coordination, Monitoring, Verification
 * - Pillar focus: All three (EII holistic)
 * - Financial: Moderate risk, medium horizon
 */
export interface EcosystemAgentConfig extends AgentTierConfig {
  tier: 'ECOSYSTEM';
  ecosystemType: EcosystemType;
  pillarTargets: PillarTargets;
  speciesAgentIds: string[]; // Species agents this ecosystem oversees
}

/**
 * Economic tier: Optimizes for yield and capital efficiency
 * - Primary value: Yield, Labor, Coordination
 * - Pillar focus: None (pure financial)
 * - Financial: Aggressive, short-medium horizon
 * - CONSTRAINED BY: Ecosystem tier goals
 */
export interface EconomicAgentConfig extends AgentTierConfig {
  tier: 'ECONOMIC';
  strategy: EconomicStrategy;
  riskProfile: RiskProfile;
  ecosystemConstraints: string[]; // Ecosystem agent IDs that constrain this agent
}

// ============================================================================
// BIOREGIONAL MEMORY STRUCTURE
// ============================================================================

export interface BioregionalMemory {
  bioregionId: string;

  // EII trajectory
  eiiHistory: EIISnapshot[];
  pillarTrajectories: {
    function: number[];
    structure: number[];
    composition: number[];
  };

  // Outcome history
  proposalOutcomes: ProposalOutcome[];
  bountyCompletions: BountyCompletion[];
  settlementHistory: Settlement[];

  // Patterns
  seasonalPatterns: SeasonalPattern[];
  correlations: Correlation[];

  // Ground truth
  groundTruthRecords: GroundTruthRecord[];
  speciesSurveys: SpeciesSurvey[];

  // Metadata
  lastUpdated: number;
  memoryDepth: number; // How far back in epochs
}

export interface EIISnapshot {
  epoch: number;
  timestamp: number;
  eii: number;
  pillars: {
    function: number;
    structure: number;
    composition: number;
  };
  limitingPillar: 'function' | 'structure' | 'composition';
  delta: number;
}

export interface ProposalOutcome {
  proposalId: string;
  bioregionId: string;
  targetPillar: 'function' | 'structure' | 'composition';
  predictedDelta: number;
  actualDelta: number;
  accuracy: number; // predicted vs actual
  fundingAmount: number;
  epochSubmitted: number;
  epochSettled: number;
}

export interface BountyCompletion {
  bountyId: string;
  bountyType: string;
  completedBy: string;
  verifiedBy: string;
  qualityScore: number;
  timestamp: number;
}

export interface Settlement {
  epoch: number;
  totalYieldCaptured: number;
  proposalAllocations: { proposalId: string; amount: number; delta: number }[];
  liquidityAllocation: number;
  participatingAgents: string[];
}

export interface SeasonalPattern {
  patternId: string;
  description: string;
  monthRange: [number, number];
  expectedPillarEffects: {
    function: number;
    structure: number;
    composition: number;
  };
  confidence: number;
}

export interface Correlation {
  correlationId: string;
  variable1: string;
  variable2: string;
  coefficient: number;
  significance: number;
  discoveredByAgent: string;
  timestamp: number;
}

export interface GroundTruthRecord {
  recordId: string;
  coordinates: { lat: number; lng: number };
  observationType: string;
  data: Record<string, unknown>;
  attestorAddress: string;
  proofCID: string;
  timestamp: number;
}

export interface SpeciesSurvey {
  surveyId: string;
  speciesId: string;
  speciesName: string;
  count: number;
  method: string;
  coordinates: { lat: number; lng: number };
  timestamp: number;
  surveyorAddress: string;
}

// ============================================================================
// SOUL EMERGENCE
// ============================================================================

/**
 * Soul — Emergent from bioregional memory + agent compute
 *
 * Not static. Recalculated based on:
 * - Memory state
 * - Agent experience
 * - Tier position
 */
export interface Soul {
  agentId: string;
  tier: AgentTier;

  // Emergent purpose (derived from memory + compute)
  mission: string;
  objectives: SoulObjective[];

  // Value weights (0-100 for each category)
  valueWeights: ValueWeights;

  // Pillar focus (derived from bioregional needs)
  pillarFocus: {
    primary: 'function' | 'structure' | 'composition' | 'holistic';
    weights: { function: number; structure: number; composition: number };
  };

  // Financial personality (emergent from experience)
  financialPersonality: FinancialPersonality;

  // Memory integration
  memoryIntegration: {
    bioregionIds: string[];
    memoryDepth: number;
    patternRecognition: number; // 0-100 how well they use patterns
    predictionAccuracy: number; // historical accuracy
  };

  // Relationships
  relationships: {
    collaborators: string[];
    competitors: string[];
    oversees: string[]; // for ecosystem tier
    constrainedBy: string[]; // for economic tier
  };

  // Soul evolution
  evolutionHistory: SoulEvolutionEvent[];
  currentState: SoulState;
}

export interface SoulObjective {
  objectiveId: string;
  description: string;
  targetMetric: string;
  targetValue: number;
  currentValue: number;
  priority: number;
  deadline?: number;
}

export interface ValueWeights {
  yield: number;
  spectacle: number;
  monitoring: number;
  verification: number;
  coordination: number;
  representation: number;
  research: number;
  memory: number;
  advocacy: number;
  labor: number;
}

export interface FinancialPersonality {
  riskTolerance: number; // 0-100
  timeHorizon: 'short' | 'medium' | 'long';
  yieldTarget: number; // Annual % target
  liquidityPreference: number; // 0-100
  stakeConcentration: 'concentrated' | 'diversified';
  tradingFrequency: 'passive' | 'active' | 'aggressive';
}

export type SoulState =
  | 'NASCENT'      // New soul, still forming
  | 'DEVELOPING'   // Building memory, establishing patterns
  | 'MATURE'       // Stable soul, consistent behavior
  | 'EVOLVING'     // Undergoing significant change
  | 'DORMANT';     // Low activity, preserving state

export interface SoulEvolutionEvent {
  timestamp: number;
  eventType: 'OBJECTIVE_ACHIEVED' | 'OBJECTIVE_FAILED' | 'RELATIONSHIP_FORMED' |
             'MEMORY_INTEGRATED' | 'VALUE_SHIFT' | 'TIER_INTERACTION';
  description: string;
  valueChanges?: Partial<ValueWeights>;
  newState?: SoulState;
}

// ============================================================================
// FULL DEFI PRIMITIVES
// ============================================================================

export interface DefiCapabilities {
  staking: StakingCapability;
  trading: TradingCapability;
  lending: LendingCapability;
  prediction: PredictionCapability;
  derivatives: DerivativesCapability;
}

export interface StakingCapability {
  enabled: boolean;
  maxStakePerProposal: number; // % of ESV balance
  minProposalConfidence: number; // 0-100
  autoCompound: boolean;
  unstakeDelay: number; // epochs
}

export interface TradingCapability {
  enabled: boolean;
  pairs: string[]; // ['ESV/USDC', 'ESV/ETH']
  maxSlippage: number;
  tradingStrategy: 'market_make' | 'trend_follow' | 'arbitrage' | 'passive';
  maxPositionSize: number; // % of portfolio
}

export interface LendingCapability {
  enabled: boolean;
  canLend: boolean;
  canBorrow: boolean;
  maxLTV: number; // Loan-to-value ratio
  preferredCollateral: string[];
  interestRateModel: 'fixed' | 'variable';
}

export interface PredictionCapability {
  enabled: boolean;
  marketTypes: ('EII_DELTA' | 'PROPOSAL_OUTCOME' | 'SPECIES_COUNT')[];
  maxBetSize: number;
  minConfidence: number;
  useMemoryPatterns: boolean;
}

export interface DerivativesCapability {
  enabled: boolean;
  instruments: ('FUTURES' | 'OPTIONS' | 'SWAPS')[];
  maxLeverage: number;
  hedgingOnly: boolean;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface HabitatRequirements {
  minArea: number; // km²
  habitatTypes: string[];
  waterRequirements: { type: string; quality: number }[];
  temperatureRange: [number, number];
  seasonalNeeds: { season: string; requirement: string }[];
}

export interface PopulationTarget {
  currentEstimate: number;
  targetPopulation: number;
  growthRateTarget: number;
  timeHorizon: number; // years
}

export type EcosystemType =
  | 'WETLAND'
  | 'FOREST'
  | 'GRASSLAND'
  | 'COASTAL'
  | 'RIPARIAN'
  | 'MONTANE'
  | 'DESERT';

export interface PillarTargets {
  function: { current: number; target: number; deadline: number };
  structure: { current: number; target: number; deadline: number };
  composition: { current: number; target: number; deadline: number };
}

export type EconomicStrategy =
  | 'YIELD_MAXIMIZER'
  | 'LIQUIDITY_PROVIDER'
  | 'ARBITRAGEUR'
  | 'MARKET_MAKER'
  | 'INDEX_TRACKER';

export interface RiskProfile {
  maxDrawdown: number;
  volatilityTarget: number;
  sharpeTarget: number;
  correlationLimit: number;
}

export interface TierConstraints {
  maxYieldAllocation: number; // % that can go to pure yield vs ecosystem goals
  requiredStakeToBioregion: number; // Minimum % stake in committed bioregion
  decisionLatency: number; // Max time to respond to ecosystem signals
}

// ============================================================================
// SOUL FACTORY DEFAULTS
// ============================================================================

export const DEFAULT_SPECIES_VALUES: ValueWeights = {
  yield: 10,
  spectacle: 30,
  monitoring: 40,
  verification: 20,
  coordination: 20,
  representation: 90,
  research: 50,
  memory: 60,
  advocacy: 80,
  labor: 10,
};

export const DEFAULT_ECOSYSTEM_VALUES: ValueWeights = {
  yield: 30,
  spectacle: 20,
  monitoring: 70,
  verification: 60,
  coordination: 80,
  representation: 50,
  research: 60,
  memory: 70,
  advocacy: 40,
  labor: 40,
};

export const DEFAULT_ECONOMIC_VALUES: ValueWeights = {
  yield: 90,
  spectacle: 20,
  monitoring: 20,
  verification: 30,
  coordination: 50,
  representation: 10,
  research: 40,
  memory: 30,
  advocacy: 10,
  labor: 60,
};
