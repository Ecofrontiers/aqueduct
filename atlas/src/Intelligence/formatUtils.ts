export function formatUSD(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

export function formatGap(low: number, high: number): string {
  return `${low}x - ${high}x`;
}

export const PROTOCOL_LABELS: Record<string, string> = {
  toucan: "Toucan",
  "regen-network": "Regen Network",
  glow: "Glow",
  hedera: "Hedera Guardian",
  atlantis: "Atlantis",
  silvi: "Silvi",
};

export const PROTOCOL_ITEM_NOUNS: Record<string, { singular: string; plural: string }> = {
  toucan: { singular: "credit", plural: "credits" },
  "regen-network": { singular: "project", plural: "projects" },
  glow: { singular: "farm", plural: "farms" },
  hedera: { singular: "action", plural: "actions" },
  atlantis: { singular: "action", plural: "actions" },
  silvi: { singular: "action", plural: "actions" },
};

export const PROTOCOL_COLORS: Record<string, string> = {
  toucan: "#16a34a",
  "regen-network": "#7c3aed",
  glow: "#eab308",
  hedera: "#8259EF",
  atlantis: "#0ea5e9",
  silvi: "#22c55e",
};

export const MECHANISM_LABELS: Record<string, string> = {
  "direct-credit": "Direct Credit",
  "protocol-equity": "Protocol Equity",
  retired: "Retired",
};

export const SERVICE_COLOR = "#16a34a";
export const MARKET_COLOR = "#2563eb";

export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export const CATEGORY_LABELS: Record<string, string> = {
  Ecotokens: "Ecotokens",
  "Clean Energy": "Clean Energy",
  Commodities: "Commodities",
  "Impact RWAs": "Impact RWAs",
  Cryptonative: "Cryptonative",
  Currency: "Currency",
};

export const TIER_STYLES: Record<string, { bg: string; text: string; label: string; description: string }> = {
  "project-specific": {
    bg: "bg-green-100", text: "text-green-700",
    label: "Project-Specific",
    description: "Valuation uses this project's own methodology and monitoring data",
  },
  "biome-specific": {
    bg: "bg-blue-100", text: "text-blue-700",
    label: "Biome-Level",
    description: "Valuation uses ecosystem service estimates for this biome type (TEEB)",
  },
  "category-default": {
    bg: "bg-gray-100", text: "text-gray-600",
    label: "Global Estimate",
    description: "Valuation uses a global average (e.g. EPA Social Cost of Carbon)",
  },
};
