// Market price fetching for ecological impact gap analysis
// Sources: CoinGecko (CHAR/Biochar), GeckoTerminal (GLW DEX pool), Regen LCD (sell orders)

export interface TokenPrice {
  price: number;
  marketCap: number | null;
  source: string;
  fetchedAt: string;
}

export interface RegenSellOrder {
  id: string;
  seller: string;
  batch_denom: string;
  quantity: string;
  ask_amount: string;
  ask_denom: string;
  disable_auto_retire: boolean;
  expiration: string;
}

// 5-minute in-memory cache
const cache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expires) return entry.data as T;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL });
}

/**
 * Fetch CHAR (Biochar) price from CoinGecko.
 * CoinGecko ID for Biochar token: "biochar"
 */
export async function fetchCharPrice(): Promise<TokenPrice | null> {
  const cached = getCached<TokenPrice>("char-price");
  if (cached) return cached;

  try {
    const cgKey = import.meta.env.VITE_COINGECKO_API_KEY;
    const url = cgKey
      ? `https://pro-api.coingecko.com/api/v3/simple/price?ids=biochar&vs_currencies=usd&include_market_cap=true&x_cg_pro_api_key=${cgKey}`
      : "https://api.coingecko.com/api/v3/simple/price?ids=biochar&vs_currencies=usd&include_market_cap=true";
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const biochar = data.biochar;
    if (!biochar?.usd) return null;

    const result: TokenPrice = {
      price: biochar.usd,
      marketCap: biochar.usd_market_cap ?? null,
      source: "coingecko",
      fetchedAt: new Date().toISOString(),
    };
    setCache("char-price", result);
    return result;
  } catch {
    return null;
  }
}

/**
 * Fetch GLW price from DexScreener (USDG-GLOW / GLW-BETA pair on Ethereum).
 * Pool: 0x6fa09ffc45f1ddc95c1bc192956717042f142c5d
 * GLW-BETA trades against USDG-GLOW (Guarded USDC ≈ $1).
 * DexScreener often lacks priceUsd for this pair, so we derive it from priceNative.
 */
export async function fetchGlwPrice(): Promise<TokenPrice | null> {
  const cached = getCached<TokenPrice>("glw-price");
  if (cached) return cached;

  try {
    const res = await fetch(
      "https://api.dexscreener.com/latest/dex/pairs/ethereum/0x6fa09ffc45f1ddc95c1bc192956717042f142c5d"
    );
    if (!res.ok) return null;

    const json = await res.json();
    const pair = json.pair ?? json.pairs?.[0];
    if (!pair) return null;

    // DexScreener: priceNative = quote tokens per base token = GLW per USDG
    // Base = USDG-GLOW, Quote = GLW-BETA → priceNative ≈ 3.23
    // Since USDG ≈ $1, GLW price in USD = 1 / priceNative
    let price = parseFloat(pair.priceUsd || "0");
    if (price <= 0) {
      const priceNative = parseFloat(pair.priceNative || "0");
      if (priceNative > 0) {
        price = 1 / priceNative;
      }
    }

    if (price <= 0) return null;

    // GLW total supply: 96M (circulating ~21.5M per glowstats.xyz)
    const GLW_CIRCULATING_SUPPLY = 21_500_000;
    const marketCap = pair.marketCap
      ? parseFloat(String(pair.marketCap))
      : pair.fdv
        ? parseFloat(String(pair.fdv))
        : price * GLW_CIRCULATING_SUPPLY;

    const result: TokenPrice = {
      price,
      marketCap,
      source: "dexscreener",
      fetchedAt: new Date().toISOString(),
    };
    setCache("glw-price", result);
    return result;
  } catch {
    return null;
  }
}

/**
 * Fetch sell orders for a Regen batch from the marketplace.
 * Returns the lowest ask price in USD (assumes USDC denom for now).
 */
export async function fetchRegenSellOrders(
  batchDenom: string
): Promise<{ lowestAskUSD: number; orders: RegenSellOrder[] } | null> {
  const cacheKey = `regen-sell-${batchDenom}`;
  const cached = getCached<{ lowestAskUSD: number; orders: RegenSellOrder[] }>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://rest-regen.ecostake.com/regen/ecocredit/marketplace/v1/sell-orders-by-batch/${encodeURIComponent(batchDenom)}`
    );
    if (!res.ok) return null;

    const data = await res.json();
    const orders: RegenSellOrder[] = data.sell_orders ?? [];
    if (orders.length === 0) return null;

    // Find lowest ask (amount is in micro-units for USDC-like denoms)
    let lowestAsk = Infinity;
    for (const order of orders) {
      const askAmount = parseFloat(order.ask_amount || "0");
      if (askAmount > 0 && askAmount < lowestAsk) {
        lowestAsk = askAmount;
      }
    }

    if (lowestAsk === Infinity) return null;

    // All Cosmos SDK on-chain amounts are in micro-units (6 decimals):
    // uregen: 1 REGEN = 1,000,000 uregen
    // IBC USDC (ibc/CDC...): 1 USDC = 1,000,000 micro-USDC
    // Always divide by 1M regardless of denom prefix
    const lowestAskUSD = lowestAsk / 1_000_000;

    const result = { lowestAskUSD, orders };
    setCache(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}

export interface AllPrices {
  char: TokenPrice | null;
  glw: TokenPrice | null;
}

/**
 * Fetch all market prices in parallel (2 API calls total).
 * Regen sell orders are fetched per-batch inside the ingestion loop.
 */
export async function fetchAllPrices(): Promise<AllPrices> {
  const [char, glw] = await Promise.all([
    fetchCharPrice(),
    fetchGlwPrice(),
  ]);

  if (char) console.log(`[Prices] CHAR: $${char.price} (${char.source})`);
  else console.log("[Prices] CHAR price unavailable");

  if (glw) console.log(`[Prices] GLW: $${glw.price}, mcap: $${glw.marketCap} (${glw.source})`);
  else console.log("[Prices] GLW price unavailable");

  return { char, glw };
}
