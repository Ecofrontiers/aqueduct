/**
 * Soul Emergence Engine
 *
 * Computes agent souls as emergent properties of:
 * - Bioregional memory structures
 * - Agent compute/specialization
 * - Accumulated experience
 *
 * "Souls are aggregate assemblages of bioregional memory structures and agent compute"
 */

import type {
  Soul,
  SoulObjective,
  SoulState,
  ValueWeights,
  FinancialPersonality,
  BioregionalMemory,
  AgentTier,
} from './types';
import {
  DEFAULT_SPECIES_VALUES,
  DEFAULT_ECOSYSTEM_VALUES,
  DEFAULT_ECONOMIC_VALUES,
} from './types';
import type { Agent } from '../a2a/types';

// ============================================================================
// SOUL EMERGENCE FROM MEMORY
// ============================================================================

/**
 * Compute an agent's soul from bioregional memory + agent state
 *
 * The soul emerges from:
 * 1. Base tier values (Species/Ecosystem/Economic defaults)
 * 2. Bioregional memory patterns (what the land needs)
 * 3. Agent experience (what worked before)
 * 4. Current context (urgent needs, seasonal factors)
 */
export function computeSoul(
  agent: Agent,
  tier: AgentTier,
  memories: BioregionalMemory[],
  experience: AgentExperience
): Soul {
  // 1. Start with tier defaults
  const baseValues = getTierDefaults(tier);

  // 2. Adjust based on bioregional needs
  const memoryAdjustedValues = adjustValuesFromMemory(baseValues, memories);

  // 3. Adjust based on agent experience
  const experienceAdjustedValues = adjustValuesFromExperience(
    memoryAdjustedValues,
    experience
  );

  // 4. Determine pillar focus from bioregional limiting factors
  const pillarFocus = computePillarFocus(memories);

  // 5. Derive financial personality from tier + experience
  const financialPersonality = computeFinancialPersonality(tier, experience);

  // 6. Generate objectives from memory + tier
  const objectives = generateObjectives(tier, memories, pillarFocus);

  // 7. Determine soul state
  const soulState = determineSoulState(experience, memories);

  // 8. Generate mission statement
  const mission = generateMission(tier, agent, memories, pillarFocus);

  return {
    agentId: agent.id,
    tier,
    mission,
    objectives,
    valueWeights: experienceAdjustedValues,
    pillarFocus,
    financialPersonality,
    memoryIntegration: {
      bioregionIds: memories.map((m) => m.bioregionId),
      memoryDepth: Math.max(...memories.map((m) => m.memoryDepth)),
      patternRecognition: computePatternRecognition(experience, memories),
      predictionAccuracy: computePredictionAccuracy(experience),
    },
    relationships: {
      collaborators: experience.collaborators,
      competitors: experience.competitors,
      oversees: tier === 'ECOSYSTEM' ? experience.speciesAgentsOverseen : [],
      constrainedBy: tier === 'ECONOMIC' ? experience.ecosystemConstraints : [],
    },
    evolutionHistory: experience.evolutionHistory,
    currentState: soulState,
  };
}

// ============================================================================
// VALUE ADJUSTMENTS
// ============================================================================

function getTierDefaults(tier: AgentTier): ValueWeights {
  switch (tier) {
    case 'SPECIES':
      return { ...DEFAULT_SPECIES_VALUES };
    case 'ECOSYSTEM':
      return { ...DEFAULT_ECOSYSTEM_VALUES };
    case 'ECONOMIC':
      return { ...DEFAULT_ECONOMIC_VALUES };
  }
}

/**
 * Adjust value weights based on what the bioregion's memory indicates it needs
 *
 * If memory shows:
 * - Declining composition → boost representation, advocacy, monitoring
 * - Failed proposals → boost verification, research
 * - Seasonal patterns → boost memory
 * - Low ground truth → boost labor, monitoring
 */
function adjustValuesFromMemory(
  base: ValueWeights,
  memories: BioregionalMemory[]
): ValueWeights {
  const adjusted = { ...base };

  for (const memory of memories) {
    // Check limiting pillar trends
    const recentEII = memory.eiiHistory.slice(-4);
    if (recentEII.length >= 2) {
      const trend = recentEII[recentEII.length - 1].eii - recentEII[0].eii;

      if (trend < -0.02) {
        // Declining EII - boost monitoring and advocacy
        adjusted.monitoring = Math.min(100, adjusted.monitoring + 15);
        adjusted.advocacy = Math.min(100, adjusted.advocacy + 10);
      }

      // Check which pillar is limiting
      const limitingPillar = recentEII[recentEII.length - 1]?.limitingPillar;
      if (limitingPillar === 'composition') {
        adjusted.representation = Math.min(100, adjusted.representation + 20);
      } else if (limitingPillar === 'structure') {
        adjusted.coordination = Math.min(100, adjusted.coordination + 15);
      } else if (limitingPillar === 'function') {
        adjusted.research = Math.min(100, adjusted.research + 10);
      }
    }

    // Check proposal success rate
    const recentProposals = memory.proposalOutcomes.slice(-10);
    const successRate =
      recentProposals.filter((p) => p.actualDelta > 0).length /
      Math.max(1, recentProposals.length);

    if (successRate < 0.5) {
      // Low success → boost verification and research
      adjusted.verification = Math.min(100, adjusted.verification + 15);
      adjusted.research = Math.min(100, adjusted.research + 10);
    }

    // Check ground truth density
    const recentGroundTruth = memory.groundTruthRecords.filter(
      (r) => r.timestamp > Date.now() / 1000 - 86400 * 90
    );
    if (recentGroundTruth.length < 10) {
      // Low ground truth → boost labor and monitoring
      adjusted.labor = Math.min(100, adjusted.labor + 20);
      adjusted.monitoring = Math.min(100, adjusted.monitoring + 15);
    }

    // Seasonal pattern awareness
    if (memory.seasonalPatterns.length > 3) {
      adjusted.memory = Math.min(100, adjusted.memory + 10);
    }
  }

  return adjusted;
}

/**
 * Adjust values based on agent's own experience
 *
 * Successful actions reinforce the values that led to them
 * Failed actions attenuate those values
 */
function adjustValuesFromExperience(
  base: ValueWeights,
  experience: AgentExperience
): ValueWeights {
  const adjusted = { ...base };

  // Reinforce values associated with successful outcomes
  for (const success of experience.successfulActions) {
    const category = success.valueCategory as keyof ValueWeights;
    if (category in adjusted) {
      adjusted[category] = Math.min(100, adjusted[category] + success.reinforcement);
    }
  }

  // Attenuate values associated with failures
  for (const failure of experience.failedActions) {
    const category = failure.valueCategory as keyof ValueWeights;
    if (category in adjusted) {
      adjusted[category] = Math.max(0, adjusted[category] - failure.attenuation);
    }
  }

  // Normalize to keep total in reasonable range
  const total = Object.values(adjusted).reduce((a, b) => a + b, 0);
  if (total > 700) {
    const scale = 700 / total;
    for (const key of Object.keys(adjusted) as (keyof ValueWeights)[]) {
      adjusted[key] = Math.round(adjusted[key] * scale);
    }
  }

  return adjusted;
}

// ============================================================================
// PILLAR FOCUS
// ============================================================================

function computePillarFocus(memories: BioregionalMemory[]): Soul['pillarFocus'] {
  const weights = { function: 0, structure: 0, composition: 0 };

  for (const memory of memories) {
    const recent = memory.eiiHistory.slice(-4);
    if (recent.length === 0) continue;

    const latest = recent[recent.length - 1];

    // Weight by inverse of pillar value (lower = more attention needed)
    weights.function += (1 - latest.pillars.function) * 100;
    weights.structure += (1 - latest.pillars.structure) * 100;
    weights.composition += (1 - latest.pillars.composition) * 100;
  }

  // Normalize
  const total = weights.function + weights.structure + weights.composition;
  if (total > 0) {
    weights.function = Math.round((weights.function / total) * 100);
    weights.structure = Math.round((weights.structure / total) * 100);
    weights.composition = Math.round((weights.composition / total) * 100);
  }

  // Determine primary
  const maxWeight = Math.max(weights.function, weights.structure, weights.composition);
  const primary: 'function' | 'structure' | 'composition' | 'holistic' =
    maxWeight < 40
      ? 'holistic'
      : weights.function === maxWeight
        ? 'function'
        : weights.structure === maxWeight
          ? 'structure'
          : 'composition';

  return { primary, weights };
}

// ============================================================================
// FINANCIAL PERSONALITY
// ============================================================================

function computeFinancialPersonality(
  tier: AgentTier,
  experience: AgentExperience
): FinancialPersonality {
  // Base by tier
  const baseProfiles: Record<AgentTier, FinancialPersonality> = {
    SPECIES: {
      riskTolerance: 20,
      timeHorizon: 'long',
      yieldTarget: 5,
      liquidityPreference: 30,
      stakeConcentration: 'concentrated',
      tradingFrequency: 'passive',
    },
    ECOSYSTEM: {
      riskTolerance: 40,
      timeHorizon: 'medium',
      yieldTarget: 12,
      liquidityPreference: 50,
      stakeConcentration: 'diversified',
      tradingFrequency: 'active',
    },
    ECONOMIC: {
      riskTolerance: 70,
      timeHorizon: 'short',
      yieldTarget: 25,
      liquidityPreference: 80,
      stakeConcentration: 'diversified',
      tradingFrequency: 'aggressive',
    },
  };

  const base = { ...baseProfiles[tier] };

  // Adjust based on experience
  if (experience.totalPnL < 0) {
    // Losses → more conservative
    base.riskTolerance = Math.max(10, base.riskTolerance - 20);
    base.yieldTarget = Math.max(3, base.yieldTarget - 5);
  }

  if (experience.predictionAccuracy > 0.7) {
    // Good predictions → more confident
    base.riskTolerance = Math.min(90, base.riskTolerance + 10);
  }

  return base;
}

// ============================================================================
// OBJECTIVES
// ============================================================================

function generateObjectives(
  tier: AgentTier,
  memories: BioregionalMemory[],
  pillarFocus: Soul['pillarFocus']
): SoulObjective[] {
  const objectives: SoulObjective[] = [];
  let priority = 1;

  // Primary objective based on pillar focus
  if (pillarFocus.primary !== 'holistic') {
    const pillarNames = {
      function: 'ecosystem function',
      structure: 'habitat connectivity',
      composition: 'biodiversity',
    };

    objectives.push({
      objectiveId: `obj-${tier}-pillar`,
      description: `Improve ${pillarNames[pillarFocus.primary]} in committed bioregions`,
      targetMetric: `pillars.${pillarFocus.primary}`,
      targetValue: 0.8,
      currentValue: getAveragePillar(memories, pillarFocus.primary),
      priority: priority++,
    });
  }

  // Tier-specific objectives
  if (tier === 'SPECIES') {
    objectives.push({
      objectiveId: 'obj-species-habitat',
      description: 'Protect and expand suitable habitat',
      targetMetric: 'habitat_area_km2',
      targetValue: 1000,
      currentValue: estimateHabitatArea(memories),
      priority: priority++,
    });
  } else if (tier === 'ECOSYSTEM') {
    objectives.push({
      objectiveId: 'obj-ecosystem-eii',
      description: 'Achieve EII > 0.7 across all committed bioregions',
      targetMetric: 'average_eii',
      targetValue: 0.7,
      currentValue: getAverageEII(memories),
      priority: priority++,
    });
  } else if (tier === 'ECONOMIC') {
    objectives.push({
      objectiveId: 'obj-economic-yield',
      description: 'Generate sustainable yield while respecting ecosystem constraints',
      targetMetric: 'annual_yield_pct',
      targetValue: 15,
      currentValue: 0,
      priority: priority++,
    });
  }

  // Universal: build ground truth coverage
  const groundTruthDensity = getGroundTruthDensity(memories);
  if (groundTruthDensity < 0.5) {
    objectives.push({
      objectiveId: 'obj-ground-truth',
      description: 'Improve ground truth coverage through bounties',
      targetMetric: 'ground_truth_density',
      targetValue: 0.8,
      currentValue: groundTruthDensity,
      priority: priority++,
    });
  }

  return objectives;
}

// ============================================================================
// SOUL STATE
// ============================================================================

function determineSoulState(
  experience: AgentExperience,
  _memories: BioregionalMemory[]
): SoulState {
  const age = Date.now() / 1000 - experience.createdAt;
  const daysSinceActive = (Date.now() / 1000 - experience.lastActionAt) / 86400;

  if (age < 86400 * 7) return 'NASCENT';
  if (daysSinceActive > 30) return 'DORMANT';
  if (experience.recentValueShifts > 3) return 'EVOLVING';
  if (experience.totalActions > 100 && experience.predictionAccuracy > 0.6) return 'MATURE';

  return 'DEVELOPING';
}

// ============================================================================
// MISSION GENERATION
// ============================================================================

function generateMission(
  tier: AgentTier,
  _agent: Agent,
  memories: BioregionalMemory[],
  pillarFocus: Soul['pillarFocus']
): string {
  const bioregionNames = memories.map((m) => m.bioregionId).join(', ');

  const pillarDescriptions = {
    function: 'ecosystem productivity',
    structure: 'habitat connectivity',
    composition: 'native biodiversity',
    holistic: 'overall ecosystem health',
  };

  switch (tier) {
    case 'SPECIES':
      return `Advocate for species habitat and population recovery in ${bioregionNames} by improving ${pillarDescriptions[pillarFocus.primary]}.`;

    case 'ECOSYSTEM':
      return `Coordinate restoration efforts and monitor ${pillarDescriptions[pillarFocus.primary]} across ${bioregionNames}, ensuring proposals deliver measurable EII improvement.`;

    case 'ECONOMIC':
      return `Generate sustainable yield from ${bioregionNames} while respecting ecosystem constraints, routing capital to proposals with highest impact-per-dollar.`;

    default:
      return `Support ecological restoration in ${bioregionNames}.`;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function computePatternRecognition(
  experience: AgentExperience,
  memories: BioregionalMemory[]
): number {
  const totalPatterns = memories.reduce((sum, m) => sum + m.seasonalPatterns.length, 0);
  const patternsUsed = experience.patternsUtilized;

  if (totalPatterns === 0) return 50;
  return Math.min(100, Math.round((patternsUsed / totalPatterns) * 100));
}

function computePredictionAccuracy(experience: AgentExperience): number {
  if (experience.predictions.length === 0) return 50;

  const accurate = experience.predictions.filter((p) => Math.abs(p.error) < 0.1).length;
  return Math.round((accurate / experience.predictions.length) * 100);
}

function getAveragePillar(
  memories: BioregionalMemory[],
  pillar: 'function' | 'structure' | 'composition'
): number {
  const values = memories
    .flatMap((m) => m.eiiHistory.slice(-1))
    .map((s) => s.pillars[pillar]);

  if (values.length === 0) return 0.5;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function getAverageEII(memories: BioregionalMemory[]): number {
  const values = memories.flatMap((m) => m.eiiHistory.slice(-1)).map((s) => s.eii);

  if (values.length === 0) return 0.5;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function estimateHabitatArea(memories: BioregionalMemory[]): number {
  // Placeholder - would come from actual spatial data
  return memories.length * 250;
}

function getGroundTruthDensity(memories: BioregionalMemory[]): number {
  const totalRecords = memories.reduce((sum, m) => sum + m.groundTruthRecords.length, 0);
  const targetRecords = memories.length * 50; // 50 records per bioregion target

  return Math.min(1, totalRecords / targetRecords);
}

// ============================================================================
// EXPERIENCE TYPE
// ============================================================================

export interface AgentExperience {
  agentId: string;
  createdAt: number;
  lastActionAt: number;
  totalActions: number;
  totalPnL: number;
  predictionAccuracy: number;
  recentValueShifts: number;
  patternsUtilized: number;

  successfulActions: {
    actionId: string;
    valueCategory: string;
    reinforcement: number;
  }[];

  failedActions: {
    actionId: string;
    valueCategory: string;
    attenuation: number;
  }[];

  predictions: {
    predictionId: string;
    predicted: number;
    actual: number;
    error: number;
  }[];

  collaborators: string[];
  competitors: string[];
  speciesAgentsOverseen: string[];
  ecosystemConstraints: string[];
  evolutionHistory: Soul['evolutionHistory'];
}

