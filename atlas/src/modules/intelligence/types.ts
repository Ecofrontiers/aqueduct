// Verifiable Cross-Protocol Impact Intelligence Types

export type SourceProtocol = "toucan" | "regen-network" | "glow" | "hedera" | "atlantis" | "silvi";
export type CreditingPathway = "action" | "outcome" | "impact";
export type MrvStatus = "verified" | "pending" | "expired";
export type ValuationMethodology =
  | "SCC-EPA-2024"
  | "TEEB-biome"
  | "avoided-emissions-SCC"
  | "TEEB-coastal"
  | "project-specific";

export type MethodologyTier = "project-specific" | "biome-specific" | "category-default";
export type ConfidenceLevel = "high" | "medium" | "low";

export interface MethodologyInput {
  label: string;
  value: string;
  source?: string;
}

export interface MethodologyCitation {
  name: string;
  url?: string;
  year?: number;
}

export interface MethodologyTrace {
  tier: MethodologyTier;
  confidence: ConfidenceLevel;
  methodologyName: string;
  formula: string;
  inputs: MethodologyInput[];
  citations: MethodologyCitation[];
  notes?: string;
}

// Ecological Impact Gap types
export type MechanismType = "direct-credit" | "protocol-equity" | "retired";
export type AssetActionClass = "asset" | "action";

export interface VerifiableProvenance {
  // Registry attestation
  attestor: "Regen Atlas";
  attestedAt: string;
  schemaVersion: "1.0";

  // Source chain (reproducibility)
  source: {
    protocol: SourceProtocol;
    endpoint: string;
    queryParams: Record<string, string>;
    blockHeight?: number;
    fetchedAt: string;
  };

  // Asset identity (Regen Atlas taxonomy)
  asset: {
    type: string;
    subtype: string;
    name: string;
    chain: string;
    contractAddress?: string;
    mechanismType?: MechanismType;
    assetActionClass?: AssetActionClass;
  };

  // Impact metrics
  impact: {
    metrics: {
      climate?: {
        tCO2e: number;
        methodology: string;
        vintage: string;
        standard: string;
      };
      biodiversity?: {
        hectares: number;
        biome: string;
        creditType: string;
      };
      energy?: {
        mwhGenerated: number;
        sourceType: string;
        farmCount: number;
      };
      marine?: {
        hectares: number;
        stewardshipType: string;
      };
    };
    creditingPathway: CreditingPathway;
  };

  // Scientific valuation (fiat-denominated)
  valuation: {
    methodology: ValuationMethodology;
    valuePerUnit: {
      low: number;
      high: number;
      unit: string;
      currency: "USD" | "EUR";
    };
    totalValue: { low: number; high: number; currency: "USD" | "EUR" };
    tokenMarketContext?: {
      price: number;
      marketCap: number;
      source: string;
      asOf: string;
    };
    gapFactor?: { low: number; high: number };
    methodologyTrace?: MethodologyTrace;
  };

  // Origin provenance
  origin: {
    project: string;
    developer?: string;
    location: { lat: number; lng: number; jurisdiction: string };
    methodology?: string;
    startDate?: string;
    endDate?: string;
  };

  // MRV status
  mrv: {
    status: MrvStatus;
    provider?: string;
    documentCIDs: string[];
  };

  // Self-reference (after Filecoin upload)
  pieceCid?: string;
  dataSetId?: string;
}

// Source-specific raw data types

export interface ToucanProject {
  id: string;
  projectId: string;
  region: string;
  standard: string;
  methodology: string;
  category: string;
  emissionType: string;
  uri: string;
}

export interface ToucanTCO2Token {
  id: string;
  name: string;
  symbol: string;
  address: string;
  projectVintage: {
    id: string;
    startTime: string;
    endTime: string;
    totalVintageQuantity: string;
    project: ToucanProject;
  };
  score: string;
}

export interface RegenProject {
  id: string;
  metadata: string;
  admin: string;
  class_id: string;
  jurisdiction: string;
  reference_id: string;
}

export interface RegenBatch {
  denom: string;
  issuer: string;
  project_id: string;
  total_amount: string;
  metadata: string;
  start_date: string;
  end_date: string;
  issuance_date: string;
  open: boolean;
  _supply?: { tradable: number; retired: number };
}

export interface RegenClassInfo {
  id: string;
  admin: string;
  metadata: string;
  credit_type_abbrev: string;
}

export interface GlowWeeklyReport {
  weekNumber: number;
  year: number;
  totalPowerOutputMWh: number;
  farmCount: number;
  impactRate: number;
  gcaSignature?: string;
}

export interface GlowAuditFarm {
  farmId: string;
  farmName: string;
  shortId?: number;
  coordinates?: { lat: number; lng: number };
  panelCount: number;
  systemWattage: number;
  weeklyCarbon: number;
  weeklyPower?: number;
  installationDate?: string;
}

// Gap analysis — surfaces the gap between market prices and ecosystem service values
export interface GapAnalysisProtocol {
  serviceValueUSD: { low: number; high: number };
  marketValueUSD: number | null;
  gapFactor: { low: number; high: number } | null;
  mechanismType: MechanismType;
  count: number;
}

export interface GapAnalysis {
  totalServiceValueUSD: { low: number; high: number };
  totalMarketValueUSD: number;
  aggregateGap: { low: number; high: number } | null;
  byProtocol: Record<string, GapAnalysisProtocol>;
  assetVsAction: {
    assets: { count: number; serviceValueUSD: { low: number; high: number } };
    actions: { count: number; serviceValueUSD: { low: number; high: number } };
  };
  pricedCount: number;
  unpricedCount: number;
}

export interface ProtocolMethodologySummary {
  dominantTier: MethodologyTier;
  tierCounts: Record<MethodologyTier, number>;
  methodologyNames: string[];
}

// Aggregate impact statistics
export interface ImpactAggregate {
  totalCarbon: { tCO2e: number; projectCount: number };
  totalBiodiversity: { hectares: number; projectCount: number };
  totalEnergy: { mwhGenerated: number; farmCount: number };
  totalMarine: { hectares: number; projectCount: number };
  totalValueUSD: { low: number; high: number };
  provenanceCount: number;
  sourceBreakdown: Record<SourceProtocol, number>;
  gapAnalysis?: GapAnalysis;
  methodologySummary?: Record<string, ProtocolMethodologySummary>;
}
