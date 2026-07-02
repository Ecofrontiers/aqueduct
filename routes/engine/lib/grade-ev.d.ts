/**
 * Type declarations for the public grade-EV reference module (grade-ev.mjs).
 * See grade-ev.mjs for the reference-implementation note: production grade-EV is
 * served by the SlabClaw oracle over SLABCLAW_API_URL.
 */

export function normalizeCondition(rawCondition: string | null | undefined): string | null;

export function getGradeDistribution(condition: string): Record<string, number> | null;

export function expectedGrade(condition: string): number | null;

export interface GradingEVBreakdownRow {
  grade: number;
  probability: number;
  fmv: number;
  contribution: number;
}

export interface GradingEVResult {
  ev: number | null;
  cost: number;
  netEv: number | null;
  recommendation: string;
  breakdown: GradingEVBreakdownRow[];
}

export function computeGradingEV(opts: {
  condition: string;
  predictedGrade?: number | null;
  pricesByGrade: Record<number, number> | null;
  grader?: string;
  tier?: string;
}): GradingEVResult;

export function buildPricesByGrade(psa10: number, psa9: number): Record<number, number> | null;

export const CONDITION_RANK: Record<string, number>;
