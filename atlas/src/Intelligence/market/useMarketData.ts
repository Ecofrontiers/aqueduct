import { useState, useEffect, useMemo, useCallback } from "react";
import type {
  TokenMarketData,
  TimeRange,
  CategoryTimeSeries,
  AssetCategory,
} from "./types";
import { TOKEN_REGISTRY, GLW_CONFIG, TIME_RANGE_DAYS, ALL_CATEGORIES } from "./consts";
import { fetchCurrentMarket, fetchAllHistorical, fetchGlwMarket } from "./api";

export interface MarketData {
  tokens: TokenMarketData[];
  totalMarketCap: number;
  totalMarketCapChange24h: number | null;
  timeSeriesByCategory: CategoryTimeSeries[];
  marketCapByCategory: Record<AssetCategory, number>;
  timeRange: TimeRange;
  setTimeRange: (r: TimeRange) => void;
  loading: boolean;
  error: string | null;
}

export function useMarketData(): MarketData {
  const [tokens, setTokens] = useState<TokenMarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("1Y");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [current, historical, glw] = await Promise.all([
          fetchCurrentMarket(),
          fetchAllHistorical(),
          fetchGlwMarket(),
        ]);

        if (cancelled) return;

        const merged: TokenMarketData[] = [];

        // Map CoinGecko results to our token configs
        for (const config of TOKEN_REGISTRY) {
          const item = current.find((c) => c.id === config.coingeckoId);
          if (!item) continue;

          const price = item.current_price ?? 0;
          const marketCap = item.market_cap ?? 0;
          if (price <= 0 && marketCap <= 0) continue;

          merged.push({
            config,
            price,
            marketCap,
            priceChange24h: item.price_change_percentage_24h ?? null,
            historicalMarketCaps: historical.get(config.coingeckoId) ?? [],
          });
        }

        // Add GLW from DexScreener (current only, no historical)
        if (glw) {
          merged.push({
            config: GLW_CONFIG,
            price: glw.price,
            marketCap: glw.marketCap,
            priceChange24h: null,
            historicalMarketCaps: [],
          });
        }

        // Sort by market cap descending
        merged.sort((a, b) => b.marketCap - a.marketCap);
        setTokens(merged);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load market data"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const totalMarketCap = useMemo(
    () => tokens.reduce((sum, t) => sum + t.marketCap, 0),
    [tokens]
  );

  const totalMarketCapChange24h = useMemo(() => {
    const withChange = tokens.filter((t) => t.priceChange24h !== null && t.marketCap > 0);
    if (withChange.length === 0) return null;
    const totalWeight = withChange.reduce((s, t) => s + t.marketCap, 0);
    if (totalWeight === 0) return null;
    return withChange.reduce(
      (s, t) => s + (t.priceChange24h! * t.marketCap) / totalWeight,
      0
    );
  }, [tokens]);

  const marketCapByCategory = useMemo(() => {
    const result = {} as Record<AssetCategory, number>;
    for (const cat of ALL_CATEGORIES) result[cat] = 0;
    for (const t of tokens) {
      result[t.config.category] = (result[t.config.category] ?? 0) + t.marketCap;
    }
    return result;
  }, [tokens]);

  const buildTimeSeries = useCallback(
    (range: TimeRange): CategoryTimeSeries[] => {
      const tokensWithHistory = tokens.filter(
        (t) => t.historicalMarketCaps.length > 0
      );
      if (tokensWithHistory.length === 0) return [];

      // Collect all unique timestamps
      const tsSet = new Set<number>();
      for (const t of tokensWithHistory) {
        for (const [ts] of t.historicalMarketCaps) tsSet.add(ts);
      }

      const cutoff = Date.now() - TIME_RANGE_DAYS[range] * 24 * 60 * 60 * 1000;
      const allTimestamps = Array.from(tsSet)
        .filter((ts) => ts >= cutoff)
        .sort((a, b) => a - b);

      if (allTimestamps.length === 0) return [];

      // Build per-token lookup for last-known-value interpolation
      const tokenSeries = tokensWithHistory.map((t) => {
        const sorted = [...t.historicalMarketCaps].sort((a, b) => a[0] - b[0]);
        return { category: t.config.category, points: sorted };
      });

      return allTimestamps.map((ts) => {
        const row: CategoryTimeSeries = { date: ts };
        for (const cat of ALL_CATEGORIES) row[cat] = 0;

        for (const { category, points } of tokenSeries) {
          // Find the last point at or before this timestamp
          let val = 0;
          for (let i = points.length - 1; i >= 0; i--) {
            if (points[i][0] <= ts) {
              val = points[i][1];
              break;
            }
          }
          row[category] = (row[category] as number) + val;
        }
        return row;
      });
    },
    [tokens]
  );

  const timeSeriesByCategory = useMemo(
    () => buildTimeSeries(timeRange),
    [buildTimeSeries, timeRange]
  );

  return {
    tokens,
    totalMarketCap,
    totalMarketCapChange24h,
    timeSeriesByCategory,
    marketCapByCategory,
    timeRange,
    setTimeRange,
    loading,
    error,
  };
}
