import type { MethodologyTier, ConfidenceLevel, MethodologyCitation } from "./types";

// Project-specific methodology entry
export interface ProjectMethodology {
  id: string;
  name: string;
  tier: MethodologyTier;
  confidence: ConfidenceLevel;
  creditType: string;
  valuePerUnit: { low: number; high: number; unit: string };
  formula: string;
  citations: MethodologyCitation[];
  notes?: string;
}

// Biome methodology entry (extracted from TEEB_BIOME_VALUES in valuation.ts)
export interface BiomeMethodology {
  biome: string;
  tier: MethodologyTier;
  confidence: ConfidenceLevel;
  valuePerHaYr: { low: number; high: number };
  formula: string;
  citations: MethodologyCitation[];
  notes?: string;
}

// Known project-specific methodologies for Regen Network projects
const PROJECT_METHODOLOGIES: ProjectMethodology[] = [
  {
    id: "C01",
    name: "Regen CarbonPlus Grasslands",
    tier: "project-specific",
    confidence: "high",
    creditType: "C",
    valuePerUnit: { low: 30, high: 45, unit: "tCO2e" },
    formula: "soil_organic_carbon_delta × area × monitoring_period",
    citations: [
      { name: "Regen CarbonPlus Grasslands Methodology v1.0", url: "https://library.regen.network/v/methodology-library/carbonplus-grasslands", year: 2022 },
      { name: "Regen Registry Program Guide", url: "https://library.regen.network/", year: 2023 },
    ],
    notes: "Project-level soil carbon monitoring with remote sensing verification",
  },
  {
    id: "C02",
    name: "Regen Verified Carbon Standard Bridge",
    tier: "project-specific",
    confidence: "high",
    creditType: "C",
    valuePerUnit: { low: 51, high: 190, unit: "tCO2e" },
    formula: "bridged_VCS_credits × SCC_range",
    citations: [
      { name: "Verra VCS Methodology Database", url: "https://verra.org/methodologies/", year: 2024 },
      { name: "EPA Social Cost of Carbon", url: "https://www.epa.gov/system/files/documents/2023-12/epa_scghg_2023_report_final.pdf", year: 2024 },
    ],
    notes: "VCS credits bridged to Regen Ledger retain original methodology",
  },
  {
    id: "BT01",
    name: "Regen Biodiversity Credits - Tropical",
    tier: "project-specific",
    confidence: "medium",
    creditType: "BT",
    valuePerUnit: { low: 8000, high: 20000, unit: "ha/yr" },
    formula: "biodiversity_index × area × ecosystem_service_multiplier",
    citations: [
      { name: "Regen Biodiversity Credit Class", url: "https://library.regen.network/", year: 2023 },
      { name: "Costanza et al. Global Ecosystem Services", year: 2014 },
    ],
    notes: "Combines species richness index with TEEB-derived service values for tropical biomes",
  },
  {
    id: "BT02",
    name: "Regen Biodiversity Credits - Temperate",
    tier: "project-specific",
    confidence: "medium",
    creditType: "BT",
    valuePerUnit: { low: 2000, high: 7000, unit: "ha/yr" },
    formula: "biodiversity_index × area × ecosystem_service_multiplier",
    citations: [
      { name: "Regen Biodiversity Credit Class", url: "https://library.regen.network/", year: 2023 },
      { name: "de Groot et al. TEEB Ecosystem Services", year: 2012 },
    ],
    notes: "Temperate forest and grassland biodiversity monitoring",
  },
  {
    id: "MBS01",
    name: "Regen Marine Stewardship",
    tier: "project-specific",
    confidence: "low",
    creditType: "MBS",
    valuePerUnit: { low: 3000, high: 18000, unit: "ha/yr" },
    formula: "coastal_area × ecosystem_service_value × stewardship_quality_factor",
    citations: [
      { name: "Barbier et al. Coastal Ecosystem Values", year: 2011 },
      { name: "Costanza et al. Marine Ecosystem Services", year: 2014 },
    ],
    notes: "Marine and coastal stewardship with TEEB-derived coastal values",
  },
];

// Biome-specific methodologies (structured from the TEEB_BIOME_VALUES already in valuation.ts)
const BIOME_METHODOLOGIES: Record<string, BiomeMethodology> = {
  "tropical-forest": {
    biome: "Tropical Forest",
    tier: "biome-specific",
    confidence: "medium",
    valuePerHaYr: { low: 5382, high: 16400 },
    formula: "hectares × TEEB_tropical_forest_value_range",
    citations: [
      { name: "Costanza et al. Changes in Global Value of Ecosystem Services", url: "https://doi.org/10.1016/j.gloenvcha.2014.04.002", year: 2014 },
    ],
    notes: "Includes provisioning, regulating, habitat, and cultural services",
  },
  wetland: {
    biome: "Wetland",
    tier: "biome-specific",
    confidence: "medium",
    valuePerHaYr: { low: 12900, high: 30000 },
    formula: "hectares × TEEB_wetland_value_range",
    citations: [
      { name: "Costanza et al. Changes in Global Value of Ecosystem Services", url: "https://doi.org/10.1016/j.gloenvcha.2014.04.002", year: 2014 },
    ],
    notes: "Highest per-hectare terrestrial value due to water regulation services",
  },
  mangrove: {
    biome: "Mangrove",
    tier: "biome-specific",
    confidence: "medium",
    valuePerHaYr: { low: 12000, high: 28000 },
    formula: "hectares × TEEB_mangrove_value_range",
    citations: [
      { name: "de Groot et al. Global Estimates of the Value of Ecosystems", url: "https://doi.org/10.1016/j.ecoser.2012.07.005", year: 2012 },
    ],
    notes: "Carbon sequestration, coastal protection, nursery habitat",
  },
  "coral-reef": {
    biome: "Coral Reef",
    tier: "biome-specific",
    confidence: "medium",
    valuePerHaYr: { low: 18000, high: 30000 },
    formula: "hectares × TEEB_coral_reef_value_range",
    citations: [
      { name: "Costanza et al. Changes in Global Value of Ecosystem Services", url: "https://doi.org/10.1016/j.gloenvcha.2014.04.002", year: 2014 },
    ],
  },
  grassland: {
    biome: "Grassland",
    tier: "biome-specific",
    confidence: "medium",
    valuePerHaYr: { low: 500, high: 2871 },
    formula: "hectares × TEEB_grassland_value_range",
    citations: [
      { name: "Costanza et al. Changes in Global Value of Ecosystem Services", url: "https://doi.org/10.1016/j.gloenvcha.2014.04.002", year: 2014 },
    ],
  },
  "temperate-forest": {
    biome: "Temperate Forest",
    tier: "biome-specific",
    confidence: "medium",
    valuePerHaYr: { low: 1500, high: 5200 },
    formula: "hectares × TEEB_temperate_forest_value_range",
    citations: [
      { name: "Costanza et al. Changes in Global Value of Ecosystem Services", url: "https://doi.org/10.1016/j.gloenvcha.2014.04.002", year: 2014 },
    ],
  },
  "coastal-systems": {
    biome: "Coastal Systems",
    tier: "biome-specific",
    confidence: "medium",
    valuePerHaYr: { low: 2000, high: 15000 },
    formula: "hectares × TEEB_coastal_value_range",
    citations: [
      { name: "Barbier et al. The Value of Estuarine and Coastal Ecosystem Services", url: "https://doi.org/10.1016/j.ecolecon.2010.09.024", year: 2011 },
    ],
  },
  "open-ocean": {
    biome: "Open Ocean",
    tier: "biome-specific",
    confidence: "low",
    valuePerHaYr: { low: 100, high: 600 },
    formula: "hectares × TEEB_open_ocean_value_range",
    citations: [
      { name: "Costanza et al. Changes in Global Value of Ecosystem Services", url: "https://doi.org/10.1016/j.gloenvcha.2014.04.002", year: 2014 },
    ],
    notes: "Low confidence due to sparse data on deep ocean services",
  },
  default: {
    biome: "Generic Ecosystem",
    tier: "biome-specific",
    confidence: "low",
    valuePerHaYr: { low: 500, high: 5000 },
    formula: "hectares × TEEB_average_value_range",
    citations: [
      { name: "TEEB Synthesis Report", year: 2010 },
    ],
    notes: "Fallback when biome type is unknown",
  },
};

/**
 * Find a project-specific methodology for a given Regen project.
 * Returns null if no project-specific methodology is registered.
 */
export function findProjectMethodology(
  _projectId: string,
  creditType: string,
  metadata?: Record<string, unknown>
): ProjectMethodology | null {
  // Match by credit type and biome hint from metadata
  const biome = (metadata?.["regen:biomeType"] as string) ?? "";
  const normalizedBiome = biome.toLowerCase();

  // Try to match project-specific methodologies by credit type
  const candidates = PROJECT_METHODOLOGIES.filter(
    (m) => m.creditType === creditType
  );

  if (candidates.length === 0) return null;

  // If biome hint available, try to match tropical vs temperate
  if (creditType === "BT" && normalizedBiome) {
    const isTropical = normalizedBiome.includes("tropical") || normalizedBiome.includes("mangrove");
    const match = candidates.find((m) =>
      isTropical ? m.id === "BT01" : m.id === "BT02"
    );
    if (match) return match;
  }

  // Return first matching candidate
  return candidates[0];
}

/**
 * Find biome-specific TEEB methodology for a given biome type.
 * Always returns a result (falls back to default).
 */
export function findBiomeMethodology(biomeType: string): BiomeMethodology {
  const normalized = biomeType.toLowerCase().replace(/\s+/g, "-");
  return BIOME_METHODOLOGIES[normalized] ?? BIOME_METHODOLOGIES.default;
}
