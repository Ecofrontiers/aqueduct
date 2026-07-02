/**
 * Agent message schemas for RAEIS agent network.
 * OpportunityReport (Scout output) and DueDiligenceReport (Diligence output).
 */

// ─── OpportunityReport ─────────────────────────────────────────────

export interface OpportunityScore {
  bioregionCode: string;
  bioregionName: string;
  compositeScore: number; // 0-100
  breakdown: {
    gap: number;          // 35% weight — market gap analysis
    certification: number; // 25% weight — certification quality
    volume: number;        // 25% weight — tCO2e volume
    completeness: number;  // 15% weight — data completeness
  };
  topActions: Array<{
    actionId: string;
    title: string;
    sourceToken: string;
    tCO2e: number;
    certifier: string | null;
  }>;
  rationale: string;
}

export interface OpportunityReport {
  schema: "RAEIS/OpportunityReport/v1";
  agentId: string;
  agentVersion: string;
  timestamp: string;
  scanSummary: {
    bioregionsScanned: number;
    totalActions: number;
    totalTCO2e: number;
  };
  opportunities: OpportunityScore[];
  methodologyTopicId: string;
  sourceTopicIds: string[];
}

// ─── DueDiligenceReport ─────────────────────────────────────────────

export type Verdict = "PASS" | "CAUTION" | "FAIL";

export interface TokenAssessment {
  sourceToken: string;
  bioregionCode: string;
  actionTitle: string;
  verification: {
    tokenExists: boolean;
    totalSupply: number;
    hasMemo: boolean;
    guardianTopicId: string | null;
    treasuryAccount: string | null;
  };
  trustTier: "guardian+registry" | "guardian+self" | "bare-hts" | "unknown";
  verdict: Verdict;
  rationale: string;
}

export interface DueDiligenceReport {
  schema: "RAEIS/DueDiligence/v1";
  agentId: string;
  agentVersion: string;
  timestamp: string;
  sourceReport: {
    topicId: string;
    sequenceNumber: number;
  };
  assessments: TokenAssessment[];
}
