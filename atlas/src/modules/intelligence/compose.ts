import type {
  VerifiableProvenance,
  ToucanTCO2Token,
  RegenProject,
  RegenBatch,
  GlowWeeklyReport,
  GlowAuditFarm,
  ImpactAggregate,
  GapAnalysis,
  GapAnalysisProtocol,
  MethodologyTier,
  ProtocolMethodologySummary,
} from "./types";
import {
  valuateCarbon,
  valuateBiodiversity,
  valuateRenewableEnergy,
  valuateMarineStewardship,
  valuateProjectSpecific,
} from "./valuation";
import { findProjectMethodology } from "./methodologies";
import { getToucanSourceMeta } from "./sources/toucan";
import { getRegenSourceMeta } from "./sources/regen";
import { getGlowSourceMeta } from "./sources/glow";

// Map Regen Network credit type abbreviations to impact categories
const REGEN_CREDIT_TYPE_MAP: Record<
  string,
  "climate" | "biodiversity" | "marine"
> = {
  C: "climate",
  BT: "biodiversity",
  MBS: "marine",
};

export function composeToucanPoolProvenance(
  pool: { name: string; address: string; totalTCO2e: number; tokenCount: number }
): VerifiableProvenance {
  const isNCT = pool.name === "NCT";
  const standard = isNCT ? "VCS (Nature-based)" : "VCS";
  const fullName = isNCT ? "Nature Carbon Tonne" : "Base Carbon Tonne";

  return {
    attestor: "Regen Atlas",
    attestedAt: new Date().toISOString(),
    schemaVersion: "1.0",
    source: getToucanSourceMeta(
      `https://app.toucan.earth/pools/${pool.name.toLowerCase()}`,
      { poolAddress: pool.address }
    ),
    asset: {
      type: "Carbon Credit",
      subtype: fullName,
      name: pool.name,
      chain: "polygon",
      contractAddress: pool.address,
    },
    impact: {
      metrics: {
        climate: {
          tCO2e: pool.totalTCO2e,
          methodology: "Verra VCS + Toucan pooling",
          vintage: "Multi-vintage pool",
          standard,
        },
      },
      creditingPathway: "outcome",
    },
    valuation: valuateCarbon(pool.totalTCO2e, standard, "high"),
    origin: {
      project: `toucan-${pool.name.toLowerCase()}-pool`,
      developer: "Toucan Protocol",
      location: {
        lat: 0,
        lng: 0,
        jurisdiction: "Global",
      },
      methodology: `${pool.tokenCount} underlying carbon projects`,
    },
    mrv: {
      status: "verified",
      provider: "Verra / Toucan Protocol",
      documentCIDs: [],
    },
  };
}

// Common Verra/Puro methodology codes → human-readable names
const METHODOLOGY_NAMES: Record<string, string> = {
  "VM0001": "Infrastructure Methane Capture",
  "VM0002": "Energy Efficiency",
  "VM0003": "Improved Forest Management (IFM)",
  "VM0004": "Mangrove Restoration",
  "VM0005": "REDD (Avoided Deforestation)",
  "VM0006": "Carbon Capture in Soils",
  "VM0007": "REDD+ Methodology Framework",
  "VM0009": "Avoided Ecosystem Conversion",
  "VM0010": "Improved Cookstoves",
  "VM0015": "Avoided Unplanned Deforestation",
  "VM0022": "Improved Agricultural Land Management",
  "VM0026": "Sustainable Grassland Management",
  "VM0029": "Grid-Connected Electricity from Renewables",
  "VM0032": "Sustainable Charcoal Production",
  "VM0033": "Tidal Wetland and Seagrass Restoration",
  "VM0036": "Reducing Methane from Enteric Fermentation",
  "VM0037": "Biochar",
  "VM0042": "Improved Agricultural Land Management v2",
  "VM0044": "Improved Forest Management (Logged to Protected)",
  "VM0045": "Improved Forest Management — Avoided Conversion",
  "VM0046": "Wetland Conservation",
  "VM0047": "ARR (Afforestation, Reforestation, Revegetation)",
  "ACM0001": "Consolidated Methodology: Grid-Connected RE",
  "ACM0002": "Grid-Connected RE Generation",
  "ACM0006": "Electricity and Heat from Biomass",
  "ACM0018": "Electricity from Biomass in Power-Only Plants",
  "AMS-I.D": "Grid-Connected RE (Small-Scale)",
  "AMS-III.D": "Methane Recovery in Animal Manure",
  "AMS-III.H": "Methane Recovery in Wastewater",
  "AR-ACM0003": "Afforestation and Reforestation of Degraded Land",
};

function humanizeMethodology(raw: string): string {
  if (!raw) return "Unknown";
  // Direct lookup
  if (METHODOLOGY_NAMES[raw]) return METHODOLOGY_NAMES[raw];
  // Puro codes like "C03000000" — extract prefix
  const puroMatch = raw.match(/^[A-Z]\d{2}/);
  if (puroMatch) {
    const prefix = puroMatch[0];
    const puroNames: Record<string, string> = {
      C01: "Biochar Carbon Removal",
      C02: "Carbonated Building Materials",
      C03: "Woody Biomass Carbon Sequestration",
      C04: "Geologically Stored Carbon",
      C05: "Enhanced Rock Weathering",
      C06: "Bio-based Construction Materials",
    };
    if (puroNames[prefix]) return puroNames[prefix];
  }
  // If it looks like a code (all caps/digits), return with label
  if (/^[A-Z0-9-]+$/.test(raw) && raw.length <= 20) return `Methodology ${raw}`;
  return raw;
}

function humanizeStandard(raw: string): string {
  if (!raw) return "Voluntary Carbon";
  const map: Record<string, string> = {
    VCS: "Verra VCS",
    "Verra VCS": "Verra VCS",
    GS: "Gold Standard",
    "Gold Standard": "Gold Standard",
    PURO: "Puro.earth",
    CDM: "Clean Development Mechanism",
    ACR: "American Carbon Registry",
    CAR: "Climate Action Reserve",
  };
  return map[raw] ?? raw;
}

function formatVintage(start: string, end: string): string {
  // Convert unix timestamps or ISO strings to years
  const toYear = (s: string) => {
    if (!s || s === "0") return null;
    const n = Number(s);
    if (!isNaN(n) && n > 1e9) return new Date(n * 1000).getFullYear();
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.getFullYear();
  };
  const startYear = toYear(start);
  const endYear = toYear(end);
  if (startYear && endYear && startYear !== endYear) return `${startYear}–${endYear}`;
  if (startYear) return `${startYear}`;
  return "Unknown vintage";
}

export function composeToucanProvenance(
  token: ToucanTCO2Token,
  totalSupply?: number
): VerifiableProvenance {
  const project = token.projectVintage.project;
  const tCO2e = totalSupply ?? 0;
  const methodology = humanizeMethodology(project.methodology);
  const standard = humanizeStandard(project.standard);
  const vintage = formatVintage(
    token.projectVintage.startTime,
    token.projectVintage.endTime
  );

  return {
    attestor: "Regen Atlas",
    attestedAt: new Date().toISOString(),
    schemaVersion: "1.0",
    source: getToucanSourceMeta(
      "https://api.thegraph.com/subgraphs/name/toucanprotocol/matic",
      { tokenId: token.id }
    ),
    asset: {
      type: "Carbon Credit",
      subtype: standard,
      name: token.name,
      chain: "polygon",
      contractAddress: token.address,
    },
    impact: {
      metrics: {
        climate: {
          tCO2e,
          methodology,
          vintage,
          standard,
        },
      },
      creditingPathway: "outcome",
    },
    valuation: valuateCarbon(tCO2e, project.standard, "high"),
    origin: {
      project: project.projectId,
      location: {
        lat: 0,
        lng: 0,
        jurisdiction: project.region || "Unknown",
      },
      methodology,
    },
    mrv: {
      status: "verified",
      provider: standard,
      documentCIDs: [],
    },
  };
}

export function composeRegenProvenance(
  project: RegenProject,
  batches: RegenBatch[],
  classInfo?: { credit_type_abbrev: string },
  metadata?: Record<string, unknown>
): VerifiableProvenance {
  const totalAmount = batches.reduce(
    (sum, b) => sum + parseFloat(b.total_amount || "0"),
    0
  );

  // DEBUG: trace credit volumes per project (remove after diagnosis)
  console.log(`[Regen] ${project.id}: ${batches.length} batches, totalAmount=${totalAmount.toFixed(2)}, class=${project.class_id}`);

  const creditType = classInfo?.credit_type_abbrev ?? "C";
  const impactCategory = REGEN_CREDIT_TYPE_MAP[creditType] ?? "climate";

  // Extract location from metadata if available
  const geoJson = metadata?.["regen:projectLocation"] as
    | { coordinates?: [number, number] }
    | undefined;
  const lat = geoJson?.coordinates?.[1] ?? 0;
  const lng = geoJson?.coordinates?.[0] ?? 0;
  const jurisdiction =
    (metadata?.["regen:projectJurisdiction"] as string) ??
    project.jurisdiction ??
    "Unknown";

  const impact: VerifiableProvenance["impact"] = {
    metrics: {},
    creditingPathway: "outcome",
  };

  let valuation: VerifiableProvenance["valuation"];

  // Tier 1: Try project-specific methodology from registry
  const projectMethodology = findProjectMethodology(project.id, creditType, metadata);

  if (impactCategory === "climate") {
    impact.metrics.climate = {
      tCO2e: totalAmount,
      methodology:
        (metadata?.["regen:approvedMethodologies"] as string) ?? "Regen Network",
      vintage: batches[0]
        ? `${batches[0].start_date}-${batches[0].end_date}`
        : "Unknown",
      standard: `Regen-${creditType}`,
    };
    valuation = projectMethodology
      ? valuateProjectSpecific(projectMethodology, totalAmount)
      : valuateCarbon(totalAmount); // Tier 3: category default
  } else if (impactCategory === "biodiversity") {
    const realHectares = metadata?.["regen:projectSize"] as number | undefined;
    const biome =
      (metadata?.["regen:biomeType"] as string) ?? "temperate-forest";
    impact.metrics.biodiversity = {
      hectares: realHectares ?? 0,
      biome,
      creditType: `Regen-${creditType}`,
    };
    if (realHectares && projectMethodology) {
      valuation = valuateProjectSpecific(projectMethodology, realHectares);
    } else if (realHectares) {
      valuation = valuateBiodiversity(realHectares, biome); // Tier 2: biome-specific
    } else {
      // No real area data — credit quantity is NOT hectares.
      // Fall back to per-credit estimate via SCC as a floor.
      valuation = valuateCarbon(totalAmount); // Tier 3: per-credit floor
    }
  } else {
    const realHectares = metadata?.["regen:projectSize"] as number | undefined;
    impact.metrics.marine = {
      hectares: realHectares ?? 0,
      stewardshipType: `Regen-${creditType}`,
    };
    if (realHectares && projectMethodology) {
      valuation = valuateProjectSpecific(projectMethodology, realHectares);
    } else if (realHectares) {
      valuation = valuateMarineStewardship(realHectares);
    } else {
      // No real area data — fall back to per-credit estimate
      valuation = valuateCarbon(totalAmount);
    }
  }

  return {
    attestor: "Regen Atlas",
    attestedAt: new Date().toISOString(),
    schemaVersion: "1.0",
    source: getRegenSourceMeta("/regen/ecocredit/v1/projects", {
      project_id: project.id,
    }),
    asset: {
      type:
        impactCategory === "climate"
          ? "Carbon Credit"
          : impactCategory === "biodiversity"
            ? "Biodiversity Credit"
            : "Marine Stewardship",
      subtype: `Regen-${creditType}`,
      name:
        (metadata?.["schema:name"] as string) ??
        `Regen Project ${project.id}`,
      chain: "regen-1",
    },
    impact,
    valuation,
    origin: {
      project: project.id,
      developer: (metadata?.["regen:projectDeveloper"] as string) ?? undefined,
      location: { lat, lng, jurisdiction },
      methodology:
        (metadata?.["regen:approvedMethodologies"] as string) ?? undefined,
      startDate: batches[0]?.start_date,
      endDate: batches[batches.length - 1]?.end_date,
    },
    mrv: {
      status: "verified",
      provider: "Regen Network",
      documentCIDs: [],
    },
  };
}

export function composeGlowProvenance(
  reports: GlowWeeklyReport[]
): VerifiableProvenance {
  const totalMwh = reports.reduce((sum, r) => sum + r.totalPowerOutputMWh, 0);
  const farmCount = Math.max(...reports.map((r) => r.farmCount), 0);
  const latestReport = reports[0];

  return {
    attestor: "Regen Atlas",
    attestedAt: new Date().toISOString(),
    schemaVersion: "1.0",
    source: getGlowSourceMeta(latestReport?.weekNumber ?? 1),
    asset: {
      type: "Renewable Energy",
      subtype: "Solar Energy Certificate",
      name: `Glow Solar Network (${reports.length} weeks)`,
      chain: "ethereum",
    },
    impact: {
      metrics: {
        energy: {
          mwhGenerated: totalMwh,
          sourceType: "solar",
          farmCount,
        },
      },
      creditingPathway: "action",
    },
    valuation: valuateRenewableEnergy(totalMwh),
    origin: {
      project: "glow-solar-network",
      location: { lat: 37.7749, lng: -122.4194, jurisdiction: "United States" },
    },
    mrv: {
      status: latestReport?.gcaSignature ? "verified" : "pending",
      provider: "Glow GCA",
      documentCIDs: [],
    },
  };
}

export function composeGlowFarmProvenance(
  farm: GlowAuditFarm,
  _weeksCovered: number
): VerifiableProvenance {
  // Annualize weekly output: weekly carbon × 52 weeks
  const annualCarbon = farm.weeklyCarbon * 52;
  // Estimate annual MWh from weekly power (if available) or from system wattage
  const annualMwh = farm.weeklyPower
    ? farm.weeklyPower * 52
    : farm.systemWattage * 4.5 * 365 / 1000; // avg 4.5 sun hours/day

  return {
    attestor: "Regen Atlas",
    attestedAt: new Date().toISOString(),
    schemaVersion: "1.0",
    source: getGlowSourceMeta(0),
    asset: {
      type: "Renewable Energy",
      subtype: "Solar Energy Certificate",
      name: farm.farmName,
      chain: "ethereum",
    },
    impact: {
      metrics: {
        energy: {
          mwhGenerated: annualMwh,
          sourceType: "solar",
          farmCount: 1,
        },
        climate: {
          tCO2e: annualCarbon,
          methodology: "WattTime-avoided-emissions",
          vintage: `${new Date().getFullYear()}`,
          standard: "Glow GCA Audit",
        },
      },
      creditingPathway: "action",
    },
    valuation: valuateRenewableEnergy(annualMwh),
    origin: {
      project: `glow-farm-${farm.shortId ?? farm.farmId.slice(0, 8)}`,
      developer: "Glow Protocol",
      location: farm.coordinates
        ? { ...farm.coordinates, jurisdiction: "United States" }
        : { lat: 37.7749, lng: -122.4194, jurisdiction: "United States" },
    },
    mrv: {
      status: "verified",
      provider: "Glow GCA",
      documentCIDs: [],
    },
  };
}

export function aggregateImpact(
  provenances: VerifiableProvenance[]
): ImpactAggregate {
  const aggregate: ImpactAggregate = {
    totalCarbon: { tCO2e: 0, projectCount: 0 },
    totalBiodiversity: { hectares: 0, projectCount: 0 },
    totalEnergy: { mwhGenerated: 0, farmCount: 0 },
    totalMarine: { hectares: 0, projectCount: 0 },
    totalValueUSD: { low: 0, high: 0 },
    provenanceCount: provenances.length,
    sourceBreakdown: { toucan: 0, "regen-network": 0, glow: 0, hedera: 0, atlantis: 0, silvi: 0 },
  };

  // Identify the Glow network aggregate — it already includes all farm values
  // (NPV-scaled), so individual farm provenances must be excluded from
  // aggregate totals to avoid double-counting.
  const glowNetworkAggregate = provenances.find(
    (p) => p.source.protocol === "glow" && p.origin.project === "glow-solar-network"
  );

  for (const p of provenances) {
    // Skip individual Glow farms from aggregate sums — the network aggregate covers them
    const isGlowFarm = p.source.protocol === "glow" && p !== glowNetworkAggregate;

    aggregate.sourceBreakdown[p.source.protocol]++;

    if (!isGlowFarm) {
      aggregate.totalValueUSD.low += p.valuation.totalValue.low;
      aggregate.totalValueUSD.high += p.valuation.totalValue.high;
    }

    if (p.impact.metrics.climate && !isGlowFarm) {
      aggregate.totalCarbon.tCO2e += p.impact.metrics.climate.tCO2e;
      aggregate.totalCarbon.projectCount++;
    }
    if (p.impact.metrics.biodiversity) {
      aggregate.totalBiodiversity.hectares +=
        p.impact.metrics.biodiversity.hectares;
      aggregate.totalBiodiversity.projectCount++;
    }
    if (p.impact.metrics.energy && !isGlowFarm) {
      aggregate.totalEnergy.mwhGenerated +=
        p.impact.metrics.energy.mwhGenerated;
      aggregate.totalEnergy.farmCount = Math.max(
        aggregate.totalEnergy.farmCount,
        p.impact.metrics.energy.farmCount
      );
    }
    if (p.impact.metrics.marine) {
      aggregate.totalMarine.hectares += p.impact.metrics.marine.hectares;
      aggregate.totalMarine.projectCount++;
    }
  }

  // Compute gap analysis
  aggregate.gapAnalysis = computeGapAnalysis(provenances);

  // Compute per-protocol methodology summaries
  const methodSummary: Record<string, ProtocolMethodologySummary> = {};
  for (const p of provenances) {
    const proto = p.source.protocol;
    if (!methodSummary[proto]) {
      methodSummary[proto] = {
        dominantTier: "category-default",
        tierCounts: { "project-specific": 0, "biome-specific": 0, "category-default": 0 },
        methodologyNames: [],
      };
    }
    const summary = methodSummary[proto];
    const tier: MethodologyTier = p.valuation.methodologyTrace?.tier ?? "category-default";
    summary.tierCounts[tier]++;
    const name = p.valuation.methodologyTrace?.methodologyName;
    if (name && !summary.methodologyNames.includes(name)) {
      summary.methodologyNames.push(name);
    }
  }
  // Determine dominant tier per protocol
  for (const summary of Object.values(methodSummary)) {
    if (summary.tierCounts["project-specific"] > 0) {
      summary.dominantTier = "project-specific";
    } else if (summary.tierCounts["biome-specific"] > 0) {
      summary.dominantTier = "biome-specific";
    } else {
      summary.dominantTier = "category-default";
    }
  }
  aggregate.methodologySummary = methodSummary;

  // DEBUG: per-protocol value breakdown (remove after diagnosis)
  const protoValues: Record<string, { low: number; high: number; count: number }> = {};
  for (const p of provenances) {
    const proto = p.source.protocol;
    if (!protoValues[proto]) protoValues[proto] = { low: 0, high: 0, count: 0 };
    protoValues[proto].low += p.valuation.totalValue.low;
    protoValues[proto].high += p.valuation.totalValue.high;
    protoValues[proto].count++;
  }
  for (const [proto, v] of Object.entries(protoValues)) {
    console.log(`[Aggregate] ${proto}: ${v.count} items, $${(v.low/1e6).toFixed(1)}M - $${(v.high/1e6).toFixed(1)}M`);
  }
  console.log(`[Aggregate] TOTAL: $${(aggregate.totalValueUSD.low/1e6).toFixed(1)}M - $${(aggregate.totalValueUSD.high/1e6).toFixed(1)}M`);

  return aggregate;
}

function computeGapAnalysis(provenances: VerifiableProvenance[]): GapAnalysis {
  const byProtocol: Record<string, GapAnalysisProtocol> = {};
  let totalServiceLow = 0;
  let totalServiceHigh = 0;
  let totalMarketValue = 0;
  let pricedCount = 0;
  let unpricedCount = 0;
  const assets = { count: 0, serviceValueLow: 0, serviceValueHigh: 0 };
  const actions = { count: 0, serviceValueLow: 0, serviceValueHigh: 0 };

  // Identify Glow network aggregate to avoid double-counting farm provenances
  const glowNetworkAggregate = provenances.find(
    (p) => p.source.protocol === "glow" && p.origin.project === "glow-solar-network"
  );

  for (const p of provenances) {
    const protocol = p.source.protocol;
    const isGlowFarm = protocol === "glow" && p !== glowNetworkAggregate;
    const serviceLow = p.valuation.totalValue.low;
    const serviceHigh = p.valuation.totalValue.high;
    const hasPricing = !!p.valuation.tokenMarketContext;
    const mechanismType = p.asset.mechanismType ?? "direct-credit";
    const assetAction = p.asset.assetActionClass ?? "asset";

    // Skip Glow farm provenances from value totals — network aggregate covers them
    if (!isGlowFarm) {
      totalServiceLow += serviceLow;
      totalServiceHigh += serviceHigh;
    }

    if (hasPricing) {
      pricedCount++;
    } else {
      unpricedCount++;
    }

    // Asset vs action split (skip Glow farms)
    if (!isGlowFarm) {
      if (assetAction === "asset") {
        assets.count++;
        assets.serviceValueLow += serviceLow;
        assets.serviceValueHigh += serviceHigh;
      } else {
        actions.count++;
        actions.serviceValueLow += serviceLow;
        actions.serviceValueHigh += serviceHigh;
      }
    }

    // Per-protocol aggregation — for Glow, only count the network aggregate
    if (!byProtocol[protocol]) {
      byProtocol[protocol] = {
        serviceValueUSD: { low: 0, high: 0 },
        marketValueUSD: null,
        gapFactor: null,
        mechanismType,
        count: 0,
      };
    }

    const proto = byProtocol[protocol];
    if (!isGlowFarm) {
      proto.serviceValueUSD.low += serviceLow;
      proto.serviceValueUSD.high += serviceHigh;
    }
    proto.count++;

    // Accumulate market value for priced items
    if (p.valuation.tokenMarketContext) {
      const ctx = p.valuation.tokenMarketContext;
      if (mechanismType === "protocol-equity" && ctx.marketCap > 0) {
        // For protocol equity, market value is the market cap (set once, not summed per farm)
        const prevMarketValue = proto.marketValueUSD ?? 0;
        proto.marketValueUSD = ctx.marketCap;
        totalMarketValue = totalMarketValue - prevMarketValue + ctx.marketCap;
      } else if (mechanismType === "direct-credit" && ctx.price > 0) {
        // For direct credits, estimate market value from price × quantity
        const qty = p.impact.metrics.climate?.tCO2e
          ?? p.impact.metrics.biodiversity?.hectares
          ?? p.impact.metrics.marine?.hectares
          ?? 0;
        const mv = ctx.price * qty;
        proto.marketValueUSD = (proto.marketValueUSD ?? 0) + mv;
        totalMarketValue += mv;
      }
    }
  }

  // Compute per-protocol gap factors (1 decimal precision)
  for (const proto of Object.values(byProtocol)) {
    if (proto.marketValueUSD && proto.marketValueUSD > 0) {
      proto.gapFactor = {
        low: Math.round((proto.serviceValueUSD.low / proto.marketValueUSD) * 10) / 10,
        high: Math.round((proto.serviceValueUSD.high / proto.marketValueUSD) * 10) / 10,
      };
    }
  }

  return {
    totalServiceValueUSD: { low: totalServiceLow, high: totalServiceHigh },
    totalMarketValueUSD: totalMarketValue,
    aggregateGap: totalMarketValue > 0
      ? {
          low: Math.round((totalServiceLow / totalMarketValue) * 10) / 10,
          high: Math.round((totalServiceHigh / totalMarketValue) * 10) / 10,
        }
      : null,
    byProtocol,
    assetVsAction: {
      assets: {
        count: assets.count,
        serviceValueUSD: { low: assets.serviceValueLow, high: assets.serviceValueHigh },
      },
      actions: {
        count: actions.count,
        serviceValueUSD: { low: actions.serviceValueLow, high: actions.serviceValueHigh },
      },
    },
    pricedCount,
    unpricedCount,
  };
}
