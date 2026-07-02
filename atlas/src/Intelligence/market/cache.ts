export const CACHE_KEYS = {
  current: "ra-market-current",
  historical: (id: string) => `ra-market-hist-${id}`,
  glw: "ra-market-glw",
} as const;

export const CURRENT_TTL = 5 * 60 * 1000; // 5 minutes
export const HISTORICAL_TTL = 6 * 60 * 60 * 1000; // 6 hours

interface CacheEntry<T> {
  data: T;
  storedAt: number;
}

export function getCached<T>(key: string, ttl: number): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.storedAt > ttl) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function setCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, storedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}
