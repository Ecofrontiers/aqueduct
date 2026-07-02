/**
 * RAEIS — Regen Atlas Environmental Intelligence Standard
 * Schema definitions for HCS messages and HTS NFT metadata
 */

// ─── Layer 1: Methodology ───────────────────────────────────────────

export interface RAEISMethodology {
  schema: "RAEIS/Methodology/v1";
  name: string;
  version: string;
  attestor: string;
  publishedAt: string;
  methodology: {
    valuation: string;
    carbonPrice: { low: number; high: number; unit: string };
    trustHierarchy: string[];
    normalization: {
      categories: string[];
      note: string;
    };
    certifierRegistry: Record<
      string,
      { tier: string; weight: number }
    >;
  };
  agentInterface: {
    subscribeTo: string[];
    capabilities: string[];
    taskTypes: string[];
  };
  bioregionTopics: Record<string, string>; // bioregionCode → topicId (populated after creation)
}

// ─── Layer 2: Bioregional Intelligence Feed ─────────────────────────

export interface BioregionalIntelligence {
  schema: "RAEIS/BioregionalIntelligence/v1";
  bioregion: { code: string; name: string };
  timestamp: string;
  aggregate: {
    platforms: number;
    actions: number;
    tCO2e: number;
    serviceValue: { low: number; high: number; currency: string };
    certifications: string[];
    sdgs: number[];
  };
  qualityScore: {
    verificationDepth: number;
    certificationTier: string;
    dataCompleteness: number;
  };
  gapAnalysis: {
    marketValue: number;
    serviceToMarketRatio: string;
    interpretation: string;
  };
  agentDirectives: AgentDirective[];
  bioregionConfidence: "high" | "medium" | "low";
  sourceActions: SourceActionRef[];
  methodologyTopicId: string;
}

export interface SourceActionRef {
  actionId: string;
  title: string;
  sourceToken: string;          // Hedera token ID (e.g. 0.0.612877)
  guardianTopics: string[];     // Guardian MRV topic IDs
  tCO2e: number;
  certifier: string | null;
  vintage: string;
  methodology: string;
}

export interface AgentDirective {
  type: "VERIFY" | "BOUNTY" | "ALERT";
  target?: string;
  actionIds?: string[];
  confidence?: number;
  taskType?: string;
  budget?: number;
  priority?: "high" | "medium" | "low";
  channel?: string;
  signal?: string;
}

// ─── Layer 3: Verified Action NFT ───────────────────────────────────

export interface VerifiedAction {
  schema: "RAEIS/VerifiedAction/v1";
  attestationType: "independent-verification";
  actionTitle: string;
  actionId: string;
  tCO2e: number;
  serviceValue: { low: number; high: number };
  certifier: string;
  sourceToken: string;
  bioregion: string;
  bioregionConfidence: string;
  methodologyTopicId: string;
  bioregionTopicId: string;
  verifiedAt: string;
}

// ─── Transaction Log ────────────────────────────────────────────────

export interface TransactionRecord {
  layer: 1 | 2 | 3;
  type: "topic-create" | "message-submit" | "nft-collection-create" | "nft-mint";
  label: string;
  entityId: string;       // topic ID, token ID, or serial
  transactionId: string;
  hashscanUrl: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface PublishResult {
  network: string;
  operatorId: string;
  publishedAt: string;
  methodology: {
    topicId: string;
    messageSequence: number;
  };
  bioregionFeeds: Array<{
    bioregionCode: string;
    bioregionName: string;
    topicId: string;
    messageSequence: number;
    actionCount: number;
    tCO2e: number;
  }>;
  nftCollection: {
    tokenId: string;
    totalMinted: number;
  };
  transactions: TransactionRecord[];
}

// ─── Bioregion Reference ────────────────────────────────────────────

export const BIOREGION_NAMES: Record<string, string> = {
  PA12: "Western European Broadleaf Forests",
  PA1: "Celtic Broadleaf Forests",
  NA22: "Central US Mixed Grasslands",
  NA26: "Southeastern Mixed Forests",
  AT7: "East African Montane Forests",
  AA8: "Eastern Australian Temperate Forests",
  NT14: "Northern Andean Montane Forests",
  NT25: "Central American Moist Forests",
  IM13: "South Asian Tropical Moist Forests",
  OC1: "Southeast Asian Tropical Forests",
};

/** Country code → bioregion code (simplified mapping) */
export const COUNTRY_BIOREGION: Record<string, string> = {
  GB: "PA12",
  BG: "PA1",
  FR: "PA12",
  US: "NA22",
  AU: "AA8",
  RW: "AT7",
  MX: "NT25",
  CO: "NT14",
  BR: "NT14",
  IN: "IM13",
  SG: "OC1",
  AR: "NT14",
  BO: "NT14",
  KE: "AT7",
};

// ─── Certifier Registry (matches build-static.ts) ───────────────────

export const CERTIFIER_REGISTRY: Record<string, { tier: string; weight: number }> = {
  "verra-vcs": { tier: "guardian+registry", weight: 1.0 },
  "gold-standard": { tier: "guardian+registry", weight: 1.0 },
  "ecoregistry": { tier: "guardian+registry", weight: 0.9 },
  "dovu-dmrv": { tier: "guardian+self", weight: 0.7 },
  "capturiant-std": { tier: "guardian+self", weight: 0.7 },
  "bare-hts": { tier: "bare-hts", weight: 0.3 },
};

// ─── Builder Functions ──────────────────────────────────────────────

export function buildMethodology(bioregionTopics: Record<string, string> = {}): RAEISMethodology {
  return {
    schema: "RAEIS/Methodology/v1",
    name: "Regen Atlas Environmental Intelligence Standard",
    version: "1.0.0",
    attestor: "Regen Atlas",
    publishedAt: new Date().toISOString(),
    methodology: {
      valuation: "SCC-EPA-2024",
      carbonPrice: { low: 51, high: 190, unit: "USD/tCO2e" },
      trustHierarchy: ["guardian+registry", "guardian+self", "bare-hts"],
      normalization: {
        categories: ["emission-factor-conversion", "decimal-correction", "unit-harmonization"],
        note: "Per-source parameters in sourceConfig, not in methodology",
      },
      certifierRegistry: CERTIFIER_REGISTRY,
    },
    agentInterface: {
      subscribeTo: ["RAEIS/BioregionalIntelligence/v1"],
      capabilities: ["eii-interpret", "gap-analysis", "capital-routing"],
      taskTypes: ["GROUND_TRUTH", "SPECIES_SURVEY", "WATER_SAMPLE"],
    },
    bioregionTopics,
  };
}

export function buildBioregionalIntelligence(
  bioregionCode: string,
  actions: any[],
  provenances: any[],
  methodologyTopicId: string
): BioregionalIntelligence {
  const bioregionName = BIOREGION_NAMES[bioregionCode] || bioregionCode;

  // Aggregate metrics
  const platforms = new Set(actions.map((a: any) => a.actors?.[0]?.name).filter(Boolean));
  const totalTCO2e = provenances.reduce(
    (s: number, p: any) => s + (p.impact?.metrics?.climate?.tCO2e || 0),
    0
  );
  const totalValueLow = provenances.reduce(
    (s: number, p: any) => s + (p.valuation?.totalValue?.low || 0),
    0
  );
  const totalValueHigh = provenances.reduce(
    (s: number, p: any) => s + (p.valuation?.totalValue?.high || 0),
    0
  );

  // Collect unique certifications
  const certSet = new Set<string>();
  for (const a of actions) {
    for (const c of a.certifications || []) {
      certSet.add(c.certifier?.short_name || c.certifier?.name || "Unknown");
    }
  }

  // Collect unique SDGs
  const sdgSet = new Set<number>();
  for (const a of actions) {
    for (const s of a.sdg_outcomes || []) {
      sdgSet.add(Number(s.id || s.code));
    }
  }

  // Determine certification tier
  const hasTier1 = certSet.has("Verra VCS") || certSet.has("Gold Standard");
  const certTier = hasTier1 ? "guardian+registry" : certSet.size > 0 ? "guardian+self" : "bare-hts";

  // Data completeness (percentage of actions with location + certs)
  const withLocation = actions.filter((a: any) => a.location).length;
  const withCerts = actions.filter((a: any) => a.certifications?.length > 0).length;
  const completeness = actions.length > 0
    ? (withLocation + withCerts) / (actions.length * 2)
    : 0;

  // Agent directives based on gap analysis
  const directives: AgentDirective[] = [];

  // Verification directives for low-confidence actions
  const verifyActions = actions.filter(
    (a: any) => !a.certifications?.length
  );
  if (verifyActions.length > 0) {
    directives.push({
      type: "VERIFY",
      target: "tCO2e",
      actionIds: verifyActions.slice(0, 5).map((a: any) => a.id),
      confidence: 0.7,
    });
  }

  // Bounty for ground truth verification
  if (totalTCO2e > 1000) {
    directives.push({
      type: "BOUNTY",
      taskType: "GROUND_TRUTH",
      budget: Math.min(Math.round(totalValueLow * 0.01), 5000),
      priority: "high",
    });
  }

  // Economic alert for unpriced environmental value
  directives.push({
    type: "ALERT",
    channel: "economic",
    signal: "gap_factor_infinite",
  });

  return {
    schema: "RAEIS/BioregionalIntelligence/v1",
    bioregion: { code: bioregionCode, name: bioregionName },
    timestamp: new Date().toISOString(),
    aggregate: {
      platforms: platforms.size,
      actions: actions.length,
      tCO2e: Math.round(totalTCO2e * 100) / 100,
      serviceValue: {
        low: Math.round(totalValueLow),
        high: Math.round(totalValueHigh),
        currency: "USD",
      },
      certifications: Array.from(certSet),
      sdgs: Array.from(sdgSet).sort((a, b) => a - b),
    },
    qualityScore: {
      verificationDepth: hasTier1 ? 3 : certSet.size > 0 ? 2 : 1,
      certificationTier: certTier,
      dataCompleteness: Math.round(completeness * 100) / 100,
    },
    gapAnalysis: {
      marketValue: 0,
      serviceToMarketRatio: "unpriced",
      interpretation:
        "All environmental value unpriced — capital routing opportunity",
    },
    agentDirectives: directives,
    bioregionConfidence: withLocation / Math.max(actions.length, 1) > 0.8 ? "high" : "medium",
    sourceActions: actions.map((a: any, idx: number) => {
      const prov = provenances[idx];
      const sourceToken = a.proofs?.[0]?.proof_explorer_link?.split("/").pop() || a.id;
      const guardianTopics = (a.proofs || [])
        .map((p: any) => p.proof_metadata_link)
        .filter(Boolean)
        .map((link: string) => link.split("/").pop())
        .filter(Boolean);
      return {
        actionId: a.id,
        title: a.title,
        sourceToken,
        guardianTopics,
        tCO2e: prov?.impact?.metrics?.climate?.tCO2e || 0,
        certifier: a.certifications?.[0]?.certifier?.name || null,
        vintage: prov?.impact?.metrics?.climate?.vintage || "Unknown",
        methodology: prov?.impact?.metrics?.climate?.methodology || "Unknown",
      };
    }),
    methodologyTopicId,
  };
}

export function buildVerifiedAction(
  action: any,
  provenance: any,
  methodologyTopicId: string,
  bioregionTopicId: string,
  bioregionCode: string
): VerifiedAction {
  const certName = action.certifications?.[0]?.certifier?.name || "Hedera Guardian";
  const sourceToken = action.proofs?.[0]?.proof_explorer_link?.split("/").pop() || action.id;

  return {
    schema: "RAEIS/VerifiedAction/v1",
    attestationType: "independent-verification",
    actionTitle: action.title,
    actionId: action.id,
    tCO2e: provenance?.impact?.metrics?.climate?.tCO2e || 0,
    serviceValue: {
      low: provenance?.valuation?.totalValue?.low || 0,
      high: provenance?.valuation?.totalValue?.high || 0,
    },
    certifier: certName,
    sourceToken,
    bioregion: bioregionCode,
    bioregionConfidence: "high",
    methodologyTopicId,
    bioregionTopicId,
    verifiedAt: new Date().toISOString(),
  };
}

/**
 * Build compact NFT metadata (≤100 bytes for Hedera)
 * Format: RAEIS:v1:<actionId>:<bioregion>:<sourceTokenId>
 * Includes the mainnet HTS token ID for onchain traceability
 */
export function buildNFTMetadata(actionId: string, bioregionCode: string, sourceToken?: string): Uint8Array {
  const parts = [`RAEIS:v1`, actionId, bioregionCode];
  if (sourceToken) parts.push(sourceToken);
  const str = parts.join(":");
  // Hedera NFT metadata max is 100 bytes
  return new TextEncoder().encode(str.slice(0, 100));
}
