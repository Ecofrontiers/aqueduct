import type { CoinGeckoMarketItem } from "./types";
import { TOKEN_REGISTRY } from "./consts";
import {
  getCached,
  setCache,
  CACHE_KEYS,
  CURRENT_TTL,
  HISTORICAL_TTL,
} from "./cache";

// In dev, route through Vite proxy to avoid CORS. In prod, call CoinGecko directly.
const CG_BASE =
  import.meta.env.DEV
    ? "/api/coingecko"
    : "https://api.coingecko.com/api/v3";

/**
 * Fetch current market data for all CoinGecko tokens in one call.
 */
export async function fetchCurrentMarket(): Promise<CoinGeckoMarketItem[]> {
  const cached = getCached<CoinGeckoMarketItem[]>(CACHE_KEYS.current, CURRENT_TTL);
  if (cached) return cached;

  try {
    const ids = TOKEN_REGISTRY.map((t) => t.coingeckoId).join(",");
    const res = await fetch(
      `${CG_BASE}/coins/markets?vs_currency=usd&ids=${ids}&sparkline=true&price_change_percentage=24h`
    );

    if (!res.ok) {
      console.warn(`[Market] CoinGecko markets returned ${res.status}`);
      return [];
    }

    const data: CoinGeckoMarketItem[] = await res.json();
    setCache(CACHE_KEYS.current, data);
    return data;
  } catch (err) {
    console.warn("[Market] Failed to fetch current market data:", err);
    return [];
  }
}

/**
 * Fetch 365-day daily market cap history for a single token.
 */
export async function fetchHistorical(
  id: string
): Promise<[number, number][]> {
  const key = CACHE_KEYS.historical(id);
  const cached = getCached<[number, number][]>(key, HISTORICAL_TTL);
  if (cached) return cached;

  try {
    const res = await fetch(
      `${CG_BASE}/coins/${id}/market_chart?vs_currency=usd&days=365&interval=daily`
    );

    if (!res.ok) {
      console.warn(`[Market] Historical data for ${id} returned ${res.status}`);
      return [];
    }

    const data = await res.json();
    const series: [number, number][] = data.market_caps ?? [];
    setCache(key, series);
    return series;
  } catch (err) {
    console.warn(`[Market] Historical fetch failed for ${id}:`, err);
    return [];
  }
}

/**
 * Fetch historical data for all tokens, batched 2 at a time with 500ms delay
 * to stay well within CoinGecko's free-tier rate limit (~10-30 req/min).
 */
export async function fetchAllHistorical(): Promise<
  Map<string, [number, number][]>
> {
  const result = new Map<string, [number, number][]>();
  const ids = TOKEN_REGISTRY.map((t) => t.coingeckoId);

  for (let i = 0; i < ids.length; i += 2) {
    const batch = ids.slice(i, i + 2);
    const results = await Promise.all(batch.map((id) => fetchHistorical(id)));
    batch.forEach((id, idx) => result.set(id, results[idx]));

    // Rate-limit pause between batches (skip after last batch)
    if (i + 2 < ids.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return result;
}

interface GlwMarketData {
  price: number;
  marketCap: number;
}

/**
 * Fetch GLW current price from DexScreener.
 */
export async function fetchGlwMarket(): Promise<GlwMarketData | null> {
  const cached = getCached<GlwMarketData>(CACHE_KEYS.glw, CURRENT_TTL);
  if (cached) return cached;

  try {
    const res = await fetch(
      "https://api.dexscreener.com/latest/dex/pairs/ethereum/0x6fa09ffc45f1ddc95c1bc192956717042f142c5d"
    );
    if (!res.ok) return null;

    const json = await res.json();
    const pair = json.pair ?? json.pairs?.[0];
    if (!pair) return null;

    let price = parseFloat(pair.priceUsd || "0");
    if (price <= 0) {
      // priceNative = base tokens per quote token = GLW per USDG
      // Since USDG ≈ $1, GLW price in USD = 1 / priceNative
      const priceNative = parseFloat(pair.priceNative || "0");
      if (priceNative > 0) price = 1 / priceNative;
    }
    if (price <= 0) return null;

    const GLW_CIRCULATING_SUPPLY = 21_500_000;
    const marketCap = pair.marketCap
      ? parseFloat(String(pair.marketCap))
      : pair.fdv
        ? parseFloat(String(pair.fdv))
        : price * GLW_CIRCULATING_SUPPLY;

    const data: GlwMarketData = { price, marketCap };
    setCache(CACHE_KEYS.glw, data);
    return data;
  } catch {
    return null;
  }
}
