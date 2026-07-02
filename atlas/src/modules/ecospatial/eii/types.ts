export interface EIIPillars {
  function: number;
  structure: number;
  composition: number;
}

export interface EIIScore {
  bioregionId: string;
  epoch: number;
  eii: number;
  pillars: EIIPillars;
  limitingPillar: 'function' | 'structure' | 'composition';
  delta?: number;
  measuredAt: number;
}

export interface EIIHistory {
  bioregionId: string;
  readings: EIIScore[];
}

export interface EIIRanking {
  bioregionId: string;
  name: string;
  currentEII: number;
  delta: number;
  rank: number;
  trend: 'up' | 'down' | 'stable';
}

export type PillarType = 'function' | 'structure' | 'composition';

export const PILLAR_COLORS: Record<PillarType, string> = {
  function: '#22c55e',    // green-500
  structure: '#3b82f6',   // blue-500
  composition: '#a855f7', // purple-500
};

export const PILLAR_LABELS: Record<PillarType, string> = {
  function: 'Function',
  structure: 'Structure',
  composition: 'Composition',
};

export const LIMITING_COLOR = '#ef4444'; // red-500
