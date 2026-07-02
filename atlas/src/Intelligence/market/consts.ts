import type { AssetCategory, TokenConfig, TimeRange } from "./types";

export const TOKEN_REGISTRY: TokenConfig[] = [
  { coingeckoId: "biochar", symbol: "CHAR", name: "Biochar", category: "Ecotokens" },
  { coingeckoId: "toucan-protocol-base-carbon-tonne", symbol: "BCT", name: "Base Carbon Tonne", category: "Ecotokens" },
  { coingeckoId: "toucan-protocol-nature-carbon-tonne", symbol: "NCT", name: "Nature Carbon Tonne", category: "Ecotokens" },
  { coingeckoId: "moss-carbon-credit", symbol: "MCO2", name: "Moss Carbon Credit", category: "Ecotokens" },
  { coingeckoId: "klima-dao", symbol: "KLIMA", name: "KlimaDAO", category: "Cryptonative" },
  { coingeckoId: "ethichub", symbol: "ETHIX", name: "EthicHub", category: "Impact RWAs" },
  { coingeckoId: "plastiks", symbol: "PLASTIK", name: "Plastiks", category: "Ecotokens" },
  { coingeckoId: "landx-governance-token", symbol: "LNDX", name: "LandX", category: "Commodities" },
];

export const GLW_CONFIG: TokenConfig = {
  coingeckoId: "",
  symbol: "GLW",
  name: "Glow",
  category: "Clean Energy",
  dexScreener: true,
};

export const CATEGORY_COLORS: Record<AssetCategory, string> = {
  Ecotokens: "#16a34a",
  "Clean Energy": "#eab308",
  Commodities: "#f97316",
  "Impact RWAs": "#8b5cf6",
  Cryptonative: "#06b6d4",
  Currency: "#6b7280",
};

export const ALL_CATEGORIES: AssetCategory[] = [
  "Ecotokens",
  "Clean Energy",
  "Commodities",
  "Impact RWAs",
  "Cryptonative",
  "Currency",
];

export const TIME_RANGE_DAYS: Record<TimeRange, number> = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  YTD: Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) /
      (1000 * 60 * 60 * 24)
  ),
  "1Y": 365,
};
