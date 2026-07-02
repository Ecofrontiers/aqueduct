import type { ValuationMethodology, VerifiableProvenance, MethodologyTrace, ConfidenceLevel } from "./types";
import type { ProjectMethodology } from "./methodologies";
import { findBiomeMethodology } from "./methodologies";

// Social Cost of Carbon — EPA 2024 central estimate + range
// Source: EPA Technical Support Document, 2024 revision
// Values in USD per tCO2e at 2% near-term discount rate
const SCC = {
  low: 51,   // 5th percentile
  central: 120, // central estimate
  high: 190, // 95th percentile
  unit: "tCO2e",
  source: "EPA-2024-TSC",
} as const;

// TEEB biome valuations — USD/ha/yr
// Source: Costanza et al. 2014, de Groot et al. 2012
// Values represent total ecosystem service value per hectare per year
const TEEB_BIOME_VALUES: Record<
  string,
  { low: number; high: number; source: string }
> = {
  "tropical-forest": {
    low: 5382,
    high: 16400,
    source: "Costanza-2014",
  },
  wetland: {
    low: 12900,
    high: 30000,
    source: "Costanza-2014",
  },
  mangrove: {
    low: 12000,
    high: 28000,
    source: "de-Groot-2012",
  },
  "coral-reef": {
    low: 18000,
    high: 30000,
    source: "Costanza-2014",
  },
  grassland: {
    low: 500,
    high: 2871,
    source: "Costanza-2014",
  },
  "temperate-forest": {
    low: 1500,
    high: 5200,
    source: "Costanza-2014",
  },
  "coastal-systems": {
    low: 2000,
    high: 15000,
    source: "Barbier-2011",
  },
  "open-ocean": {
    low: 100,
    high: 600,
    source: "Costanza-2014",
  },
  // Default for unknown biomes
  default: {
    low: 500,
    high: 5000,
    source: "TEEB-average",
  },
};

// Grid emission factors — tCO2e per MWh
// Source: EPA eGRID, used for avoided emissions calculations
const GRID_EMISSION_FACTORS: Record<string, number> = {
  "us-average": 0.386,
  "eu-average": 0.231,
  "global-average": 0.475,
  default: 0.475,
};

export function valuateCarbon(
  tCO2e: number,
  _standard?: string,
  confidence?: ConfidenceLevel
): VerifiableProvenance["valuation"] {
  // Auto-determine confidence: high if structured tCO2e > 0, low if no data
  const resolvedConfidence = confidence ?? (tCO2e > 0 ? "medium" : "low");
  const trace: MethodologyTrace = {
    tier: "category-default",
    confidence: resolvedConfidence,
    methodologyName: "EPA Social Cost of Carbon 2024",
    formula: `tCO2e × SCC range ($${SCC.low}-$${SCC.high})`,
    inputs: [
      { label: "Quantity", value: `${tCO2e.toLocaleString()} tCO2e` },
      { label: "SCC Range", value: `$${SCC.low}-$${SCC.high}/tCO2e`, source: "EPA 2024" },
      { label: "Discount Rate", value: "2% near-term", source: "EPA 2024" },
    ],
    citations: [
      { name: "EPA Technical Support Document: Social Cost of Greenhouse Gases", url: "https://www.epa.gov/system/files/documents/2023-12/epa_scghg_2023_report_final.pdf", year: 2024 },
    ],
  };

  return {
    methodology: "SCC-EPA-2024" as ValuationMethodology,
    valuePerUnit: {
      low: SCC.low,
      high: SCC.high,
      unit: "tCO2e",
      currency: "USD",
    },
    totalValue: {
      low: Math.round(tCO2e * SCC.low),
      high: Math.round(tCO2e * SCC.high),
      currency: "USD",
    },
    methodologyTrace: trace,
  };
}

export function valuateBiodiversity(
  hectares: number,
  biome: string
): VerifiableProvenance["valuation"] {
  const normalizedBiome = biome.toLowerCase().replace(/\s+/g, "-");
  const biomeValues =
    TEEB_BIOME_VALUES[normalizedBiome] ?? TEEB_BIOME_VALUES.default;
  const biomeMeta = findBiomeMethodology(biome);

  const trace: MethodologyTrace = {
    tier: "biome-specific",
    confidence: biomeMeta.confidence,
    methodologyName: `TEEB ${biomeMeta.biome} Valuation`,
    formula: biomeMeta.formula,
    inputs: [
      { label: "Area", value: `${hectares.toLocaleString()} ha` },
      { label: "Biome Type", value: biomeMeta.biome },
      { label: "Value Range", value: `$${biomeValues.low.toLocaleString()}-$${biomeValues.high.toLocaleString()}/ha/yr`, source: biomeMeta.citations[0]?.name },
    ],
    citations: biomeMeta.citations,
    notes: biomeMeta.notes,
  };

  return {
    methodology: "TEEB-biome" as ValuationMethodology,
    valuePerUnit: {
      low: biomeValues.low,
      high: biomeValues.high,
      unit: "ha/yr",
      currency: "USD",
    },
    totalValue: {
      low: Math.round(hectares * biomeValues.low),
      high: Math.round(hectares * biomeValues.high),
      currency: "USD",
    },
    methodologyTrace: trace,
  };
}

export function valuateRenewableEnergy(
  mwhGenerated: number,
  region = "global-average"
): VerifiableProvenance["valuation"] {
  const emissionFactor =
    GRID_EMISSION_FACTORS[region] ?? GRID_EMISSION_FACTORS.default;
  const avoidedCO2e = mwhGenerated * emissionFactor;

  const trace: MethodologyTrace = {
    tier: "category-default",
    confidence: "medium",
    methodologyName: "Avoided Emissions via SCC",
    formula: `MWh × grid_emission_factor × SCC range`,
    inputs: [
      { label: "Generation", value: `${mwhGenerated.toLocaleString()} MWh` },
      { label: "Grid Factor", value: `${emissionFactor} tCO2e/MWh`, source: "EPA eGRID" },
      { label: "Avoided CO2e", value: `${avoidedCO2e.toLocaleString()} tCO2e` },
      { label: "SCC Range", value: `$${SCC.low}-$${SCC.high}/tCO2e`, source: "EPA 2024" },
    ],
    citations: [
      { name: "EPA eGRID Emission Factors", url: "https://www.epa.gov/egrid", year: 2024 },
      { name: "EPA Technical Support Document: Social Cost of Greenhouse Gases", url: "https://www.epa.gov/system/files/documents/2023-12/epa_scghg_2023_report_final.pdf", year: 2024 },
    ],
  };

  return {
    methodology: "avoided-emissions-SCC" as ValuationMethodology,
    valuePerUnit: {
      low: Math.round(emissionFactor * SCC.low * 100) / 100,
      high: Math.round(emissionFactor * SCC.high * 100) / 100,
      unit: "MWh",
      currency: "USD",
    },
    totalValue: {
      low: Math.round(avoidedCO2e * SCC.low),
      high: Math.round(avoidedCO2e * SCC.high),
      currency: "USD",
    },
    methodologyTrace: trace,
  };
}

export function valuateMarineStewardship(
  hectares: number
): VerifiableProvenance["valuation"] {
  const values = TEEB_BIOME_VALUES["coastal-systems"];

  const trace: MethodologyTrace = {
    tier: "category-default",
    confidence: "low",
    methodologyName: "TEEB Coastal/Marine Valuation",
    formula: `hectares × TEEB_coastal_value_range`,
    inputs: [
      { label: "Area", value: `${hectares.toLocaleString()} ha` },
      { label: "Value Range", value: `$${values.low.toLocaleString()}-$${values.high.toLocaleString()}/ha/yr`, source: "Barbier 2011" },
    ],
    citations: [
      { name: "Barbier et al. The Value of Estuarine and Coastal Ecosystem Services", url: "https://doi.org/10.1016/j.ecolecon.2010.09.024", year: 2011 },
    ],
    notes: "Low confidence: marine ecosystem services are less well-quantified than terrestrial",
  };

  return {
    methodology: "TEEB-coastal" as ValuationMethodology,
    valuePerUnit: {
      low: values.low,
      high: values.high,
      unit: "ha/yr",
      currency: "USD",
    },
    totalValue: {
      low: Math.round(hectares * values.low),
      high: Math.round(hectares * values.high),
      currency: "USD",
    },
    methodologyTrace: trace,
  };
}

export function valuateProjectSpecific(
  methodology: ProjectMethodology,
  quantity: number
): VerifiableProvenance["valuation"] {
  const trace: MethodologyTrace = {
    tier: "project-specific",
    confidence: methodology.confidence,
    methodologyName: methodology.name,
    formula: methodology.formula,
    inputs: [
      { label: "Quantity", value: `${quantity.toLocaleString()} ${methodology.valuePerUnit.unit}` },
      { label: "Value Range", value: `$${methodology.valuePerUnit.low}-$${methodology.valuePerUnit.high}/${methodology.valuePerUnit.unit}` },
    ],
    citations: methodology.citations,
    notes: methodology.notes,
  };

  return {
    methodology: "project-specific" as ValuationMethodology,
    valuePerUnit: {
      low: methodology.valuePerUnit.low,
      high: methodology.valuePerUnit.high,
      unit: methodology.valuePerUnit.unit,
      currency: "USD",
    },
    totalValue: {
      low: Math.round(quantity * methodology.valuePerUnit.low),
      high: Math.round(quantity * methodology.valuePerUnit.high),
      currency: "USD",
    },
    methodologyTrace: trace,
  };
}

export function addGapFactor(
  valuation: VerifiableProvenance["valuation"],
  tokenMarketCap: number,
  tokenPrice: number,
  source: string
): VerifiableProvenance["valuation"] {
  const asOf = new Date().toISOString();
  return {
    ...valuation,
    tokenMarketContext: {
      price: tokenPrice,
      marketCap: tokenMarketCap,
      source,
      asOf,
    },
    gapFactor:
      tokenMarketCap > 0
        ? {
            low: Math.round((valuation.totalValue.low / tokenMarketCap) * 100) / 100,
            high: Math.round((valuation.totalValue.high / tokenMarketCap) * 100) / 100,
          }
        : undefined,
  };
}

/**
 * Direct credit gap: computes gap factor as serviceValue / marketPrice per unit.
 * Different from addGapFactor() which uses totalValue / marketCap (protocol equity).
 */
export function addDirectCreditGap(
  valuation: VerifiableProvenance["valuation"],
  pricePerUnit: number,
  source: string
): VerifiableProvenance["valuation"] {
  if (pricePerUnit <= 0) return valuation;

  const asOf = new Date().toISOString();
  return {
    ...valuation,
    tokenMarketContext: {
      price: pricePerUnit,
      marketCap: 0, // not applicable for direct credits
      source,
      asOf,
    },
    gapFactor: {
      low: Math.round((valuation.valuePerUnit.low / pricePerUnit) * 100) / 100,
      high: Math.round((valuation.valuePerUnit.high / pricePerUnit) * 100) / 100,
    },
  };
}

/**
 * Net Present Value annuity factor: PV of $1/yr for `years` at discount `rate`.
 * Used for protocol equity valuation (e.g. Glow's annual ecological output over lifetime).
 * At 3%/30yr returns ~19.6.
 */
export function npvFactor(rate = 0.03, years = 30): number {
  if (rate <= 0) return years;
  return (1 - Math.pow(1 + rate, -years)) / rate;
}

// Reference data export for the UI
export const VALUATION_REFERENCE = {
  scc: SCC,
  biomeValues: TEEB_BIOME_VALUES,
  gridEmissionFactors: GRID_EMISSION_FACTORS,
};
