export type AssetCategory =
  | "Ecotokens"
  | "Clean Energy"
  | "Commodities"
  | "Impact RWAs"
  | "Cryptonative"
  | "Currency";

export interface TokenConfig {
  coingeckoId: string;
  symbol: string;
  name: string;
  category: AssetCategory;
  dexScreener?: boolean;
}

export interface CoinGeckoMarketItem {
  id: string;
  symbol: string;
  name: string;
  current_price: number | null;
  market_cap: number | null;
  price_change_percentage_24h: number | null;
  sparkline_in_7d?: { price: number[] };
}

export interface TokenMarketData {
  config: TokenConfig;
  price: number;
  marketCap: number;
  priceChange24h: number | null;
  historicalMarketCaps: [number, number][]; // [timestamp, marketCap]
}

export type TimeRange = "1M" | "3M" | "6M" | "YTD" | "1Y";

export interface CategoryTimeSeries {
  date: number;
  [category: string]: number;
}
