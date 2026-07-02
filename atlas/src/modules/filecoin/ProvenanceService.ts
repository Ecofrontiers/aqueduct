import type {
  VerifiableProvenance,
  ImpactAggregate,
  MechanismType,
  AssetActionClass,
} from "../intelligence/types";
import type { Asset } from "../assets";
import {
  fetchTCO2Tokens,
  fetchRetirements,
  fetchPooledTCO2Tokens,
  TOUCAN_POOL_ADDRESSES,
  fetchRegenProjects,
  fetchRegenBatches,
  fetchRegenClasses,
  fetchProjectMetadata,
  fetchGlowRecentReports,
  fetchGlowAuditFarms,
} from "../intelligence";
import {
  composeToucanProvenance,
  composeRegenProvenance,
  composeGlowProvenance,
  composeGlowFarmProvenance,
  aggregateImpact,
} from "../intelligence/compose";
import { addDirectCreditGap, addGapFactor, npvFactor } from "../intelligence/valuation";
import { fetchAllPrices, fetchRegenSellOrders } from "../intelligence/sources/prices";
import { fetchHederaProvenances } from "../intelligence/sources/hedera";
import { fetchActionsByProtocol, clearSupabaseActionsCache } from "../intelligence/sources/supabaseActions";

export type IngestProgress = {
  source: string;
  status: "pending" | "fetching" | "composing" | "done" | "error";
  count: number;
  matched: number;
  error?: string;
};

export type IngestCallback = (progress: IngestProgress[]) => void;

// Local provenance cache
const provenanceCache: Map<string, VerifiableProvenance> = new Map();

// Asset-to-provenance mapping: assetId -> pieceCid[]
const assetProvenanceMap: Map<string, string[]> = new Map();

// Version counter — bumped on ingest/stamp so React components can invalidate memos
let cacheVersion = 0;
export function getCacheVersion(): number {
  return cacheVersion;
}
function bumpCacheVersion(): void {
  cacheVersion++;
}

// ── localStorage persistence ──
const LS_KEY_PROVENANCES = "regen-atlas:provenances";
const LS_KEY_ASSET_MAP = "regen-atlas:asset-provenance-map";
// Bump this when adding new sources to invalidate stale caches
const CACHE_SCHEMA_VERSION = 3; // v3: added Atlantis & Silvi action protocols
const LS_KEY_SCHEMA_VERSION = "regen-atlas:schema-version";

function persistToStorage(): void {
  try {
    const provs = Array.from(provenanceCache.values());
    const assetMap = Object.fromEntries(assetProvenanceMap.entries());
    localStorage.setItem(LS_KEY_PROVENANCES, JSON.stringify(provs));
    localStorage.setItem(LS_KEY_ASSET_MAP, JSON.stringify(assetMap));
    localStorage.setItem(LS_KEY_SCHEMA_VERSION, String(CACHE_SCHEMA_VERSION));
    console.log(
      `[ProvenanceService] Persisted ${provs.length} provenances, ${assetProvenanceMap.size} asset mappings`
    );
  } catch (e) {
    console.warn("[ProvenanceService] localStorage persist failed:", e);
  }
}

function restoreFromStorage(): boolean {
  try {
    // Invalidate cache if schema version doesn't match (e.g. new sources added)
    const storedVersion = Number(localStorage.getItem(LS_KEY_SCHEMA_VERSION) ?? "0");
    if (storedVersion < CACHE_SCHEMA_VERSION) {
      console.log(`[ProvenanceService] Cache schema v${storedVersion} < v${CACHE_SCHEMA_VERSION}, invalidating`);
      localStorage.removeItem(LS_KEY_PROVENANCES);
      localStorage.removeItem(LS_KEY_ASSET_MAP);
      localStorage.removeItem(LS_KEY_SCHEMA_VERSION);
      return false;
    }

    const provsJson = localStorage.getItem(LS_KEY_PROVENANCES);
    const mapJson = localStorage.getItem(LS_KEY_ASSET_MAP);
    if (!provsJson || !mapJson) return false;

    const provs: VerifiableProvenance[] = JSON.parse(provsJson);
    const assetMap: Record<string, string[]> = JSON.parse(mapJson);

    if (provs.length === 0) return false;

    provenanceCache.clear();
    assetProvenanceMap.clear();

    for (const p of provs) {
      if (p.pieceCid) provenanceCache.set(p.pieceCid, p);
    }
    for (const [assetId, cids] of Object.entries(assetMap)) {
      assetProvenanceMap.set(assetId, cids);
    }

    bumpCacheVersion();
    console.log(
      `[ProvenanceService] Restored ${provs.length} provenances, ${Object.keys(assetMap).length} asset mappings from localStorage`
    );
    return true;
  } catch (e) {
    console.warn("[ProvenanceService] localStorage restore failed:", e);
    return false;
  }
}

// Auto-restore on module load
restoreFromStorage();

async function generateLocalCID(
  data: VerifiableProvenance
): Promise<string> {
  const text = JSON.stringify(data);
  const buffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `local:sha256:${hex.slice(0, 32)}`;
}

// Protocol → exact issuer name in the Regen Atlas registry
const PROTOCOL_ISSUER_MAP: Record<string, string> = {
  toucan: "Toucan",
  "regen-network": "Regen Network",
  glow: "Glow",
  hedera: "Hedera Guardian",
  atlantis: "Atlantis",
  silvi: "Silvi",
};

// Check if a provenance asset type is compatible with a registry asset's
// type + subtype taxonomy. The registry uses its own vocabulary:
//   Types: "Ecotokens", "Clean Energy", "Commodities", "Impact RWAs", "Cryptonative", "Currency"
//   Subtypes: "Carbon Removal", "Carbon Avoidance", "Biodiversity", "Soil", "Water",
//             "Revenue-based", "Renewable Energy Certificates", etc.
function isTypeCompatible(
  provenanceType: string,
  registryTypes: string[],
  registrySubtypes: string[]
): boolean {
  const pt = provenanceType.toLowerCase();
  const rts = registryTypes.map((t) => t.toLowerCase());
  const subs = registrySubtypes.map((s) => s.toLowerCase());

  if (pt.includes("carbon")) {
    // "Carbon Credit" → "Ecotokens" with carbon-related subtypes
    return (
      rts.includes("ecotokens") &&
      subs.some((s) => s.includes("carbon") || s.includes("soil"))
    );
  }
  if (pt.includes("biodiversity")) {
    return rts.includes("ecotokens") && subs.some((s) => s.includes("biodiversity"));
  }
  if (pt.includes("renewable") || pt.includes("solar")) {
    // "Renewable Energy" → "Clean Energy"
    return rts.includes("clean energy");
  }
  if (pt.includes("marine")) {
    return (
      rts.includes("ecotokens") &&
      subs.some((s) => s.includes("water") || s.includes("biodiversity"))
    );
  }
  return false;
}

// Deterministic hash for distributing provenances across assets
function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// Haversine-ish squared distance (fast, no sqrt needed for comparison)
function geoDistSq(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = lat1 - lat2;
  const dLng = (lng1 - lng2) * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
  return dLat * dLat + dLng * dLng;
}

// Filter assets to those type-compatible with a provenance object
function filterTypeCompatible(
  provenanceType: string,
  candidates: Asset[]
): Asset[] {
  return candidates.filter((a) => {
    const rTypes = (a.asset_types ?? []).map((t) => t.name);
    const rSubs = (a.asset_subtypes ?? []).map((s) => s.name);
    return isTypeCompatible(provenanceType, rTypes, rSubs);
  });
}

// Pick from candidates using hash-based distribution (spreads provenances
// across available assets instead of piling all onto the first match)
function hashPick(candidates: Asset[], key: string): Asset {
  return candidates[simpleHash(key) % candidates.length];
}

// Match a provenance object against Regen Atlas assets
function matchProvenance(
  provenance: VerifiableProvenance,
  assets: Asset[]
): Asset | null {
  // 1. Contract address (exact, case-insensitive)
  if (provenance.asset.contractAddress) {
    const addr = provenance.asset.contractAddress.toLowerCase();
    for (const asset of assets) {
      for (const token of asset.tokens ?? []) {
        for (const platform of token.platforms ?? []) {
          if (platform.contract_address?.toLowerCase() === addr) {
            return asset;
          }
        }
      }
    }
  }

  // Unique key for this provenance (used for hash distribution)
  const pKey = provenance.origin.project + "|" + provenance.asset.name;

  // 2. Protocol → issuer: narrow to same-protocol assets
  const expectedIssuer = PROTOCOL_ISSUER_MAP[provenance.source.protocol];
  if (expectedIssuer) {
    const issuerAssets = assets.filter(
      (a) => a.issuer?.name === expectedIssuer
    );

    if (issuerAssets.length > 0) {
      // 2a. Coordinate proximity (within ~3.5km — tight to avoid default coords)
      if (
        provenance.origin.location.lat !== 0 ||
        provenance.origin.location.lng !== 0
      ) {
        let closest: Asset | null = null;
        let closestDist = 0.001; // ~3.5km radius — only genuinely co-located
        for (const asset of issuerAssets) {
          if (asset.coordinates?.latitude && asset.coordinates?.longitude) {
            const dist = geoDistSq(
              provenance.origin.location.lat,
              provenance.origin.location.lng,
              asset.coordinates.latitude,
              asset.coordinates.longitude
            );
            if (dist < closestDist) {
              closest = asset;
              closestDist = dist;
            }
          }
        }
        if (closest) return closest;
      }

      // 2b. Name similarity within same issuer
      const pName = provenance.asset.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      for (const asset of issuerAssets) {
        const aName = asset.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (pName.length > 4 && aName.length > 4) {
          if (aName.includes(pName) || pName.includes(aName)) {
            return asset;
          }
        }
      }

      // 2c. Country code: filter to same-country, then hash-distribute
      const jurisdiction =
        provenance.origin.location.jurisdiction?.toLowerCase() ?? "";
      if (jurisdiction && jurisdiction !== "global" && jurisdiction !== "unknown") {
        const countryAssets = issuerAssets.filter((a) => {
          const cc = (a.country_code ?? "").toLowerCase();
          return (
            cc &&
            (jurisdiction.includes(cc) ||
              (jurisdiction === "united states" && cc === "us") ||
              (jurisdiction === "brazil" && cc === "br") ||
              (jurisdiction === "colombia" && cc === "co") ||
              cc === jurisdiction.slice(0, 2))
          );
        });
        const compatible = filterTypeCompatible(
          provenance.asset.type,
          countryAssets
        );
        if (compatible.length > 0) {
          return hashPick(compatible, pKey);
        }
        // Country match without type check — still useful
        if (countryAssets.length > 0) {
          return hashPick(countryAssets, pKey);
        }
      }

      // 2d. Type-compatible same-issuer: hash-distribute across all compatible
      const compatible = filterTypeCompatible(
        provenance.asset.type,
        issuerAssets
      );
      if (compatible.length > 0) {
        return hashPick(compatible, pKey);
      }

      // 2e. Last resort: hash-distribute across all same-issuer assets
      return hashPick(issuerAssets, pKey);
    }
  }

  // 3. Developer name → issuer name (cross-protocol)
  if (provenance.origin.developer) {
    const dev = provenance.origin.developer
      .toLowerCase()
      .replace(/\s*protocol\s*/g, "")
      .trim();
    for (const asset of assets) {
      if (asset.issuer?.name?.toLowerCase().includes(dev)) {
        return asset;
      }
    }
  }

  // 4. Cross-issuer: type + geography matching
  for (const asset of assets) {
    const rTypes = (asset.asset_types ?? []).map((t) => t.name);
    const rSubs = (asset.asset_subtypes ?? []).map((s) => s.name);
    if (isTypeCompatible(provenance.asset.type, rTypes, rSubs)) {
      if (
        provenance.origin.location.lat !== 0 &&
        asset.coordinates?.latitude
      ) {
        const dist = geoDistSq(
          provenance.origin.location.lat,
          provenance.origin.location.lng,
          asset.coordinates.latitude,
          asset.coordinates.longitude
        );
        if (dist < 25) return asset; // within ~5 degrees
      }
    }
  }

  return null;
}

function stampMechanism(
  p: VerifiableProvenance,
  mechanismType: MechanismType,
  assetActionClass: AssetActionClass
): void {
  p.asset.mechanismType = mechanismType;
  p.asset.assetActionClass = assetActionClass;
}

export async function ingestAllSources(
  assets: Asset[],
  onProgress?: IngestCallback,
  maxPerSource = 500
): Promise<VerifiableProvenance[]> {
  const provenances: VerifiableProvenance[] = [];
  const progress: IngestProgress[] = [
    { source: "Toucan", status: "pending", count: 0, matched: 0 },
    { source: "Regen Network", status: "pending", count: 0, matched: 0 },
    { source: "Glow", status: "pending", count: 0, matched: 0 },
    { source: "Hedera Guardian", status: "pending", count: 0, matched: 0 },
    { source: "Atlantis", status: "pending", count: 0, matched: 0 },
    { source: "Silvi", status: "pending", count: 0, matched: 0 },
  ];

  const updateProgress = (
    idx: number,
    update: Partial<IngestProgress>
  ) => {
    progress[idx] = { ...progress[idx], ...update };
    onProgress?.([...progress]);
  };

  const addProvenance = async (
    p: VerifiableProvenance,
    sourceIdx: number
  ) => {
    p.pieceCid = await generateLocalCID(p);
    provenances.push(p);
    provenanceCache.set(p.pieceCid, p);

    // Try to match against existing assets
    const matchedAsset = matchProvenance(p, assets);
    if (matchedAsset) {
      const existing = assetProvenanceMap.get(matchedAsset.id) ?? [];
      existing.push(p.pieceCid);
      assetProvenanceMap.set(matchedAsset.id, existing);
      progress[sourceIdx].matched++;
    }
  };

  console.log(`[Ingest] Starting with ${assets.length} assets, maxPerSource=${maxPerSource}`);

  // Fetch market prices for gap analysis (non-blocking — 10s timeout)
  let prices: Awaited<ReturnType<typeof fetchAllPrices>> = { char: null, glw: null };
  try {
    const pricePromise = fetchAllPrices();
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Price fetch timeout")), 10_000)
    );
    prices = await Promise.race([pricePromise, timeout]);
    console.log("[Ingest] Prices loaded:", prices.char ? `CHAR=$${prices.char.price}` : "no CHAR", prices.glw ? `GLW=$${prices.glw.price}` : "no GLW");
  } catch (e) {
    console.warn("[Ingest] Price fetch failed/timed out, continuing without prices:", e);
  }

  // Toucan — each TCO2 token represents bridged carbon credits (CHAR only, no BCT/NCT pools)
  // Use totalVintageQuantity as the primary tCO2e, enriched with pool/retirement data
  try {
    updateProgress(0, { status: "fetching" });
    console.log("[Ingest] Toucan: fetching tokens...");

    // 1. Fetch all TCO2 tokens (each has totalVintageQuantity from the subgraph)
    const tokens = await fetchTCO2Tokens(maxPerSource);
    console.log(`[Ingest] Toucan: got ${tokens.length} tokens`);

    // 2. Build pool + retirement amount map for enrichment
    const poolAmountBySymbol = new Map<string, number>();

    try {
      const [bctPooled, nctPooled] = await Promise.all([
        fetchPooledTCO2Tokens(TOUCAN_POOL_ADDRESSES.BCT),
        fetchPooledTCO2Tokens(TOUCAN_POOL_ADDRESSES.NCT),
      ]);
      for (const p of [...bctPooled, ...nctPooled]) {
        const sym = p.token.symbol;
        const amount = parseFloat(p.amount) / 1e18;
        if (!isNaN(amount) && amount > 0) {
          poolAmountBySymbol.set(sym, (poolAmountBySymbol.get(sym) ?? 0) + amount);
        }
      }
    } catch {
      // Pool queries are best-effort
    }

    try {
      const retirements = await fetchRetirements(1000);
      for (const r of retirements) {
        const sym = r.token.symbol;
        const amount = parseFloat(r.amount) / 1e18;
        if (!isNaN(amount) && amount > 0) {
          poolAmountBySymbol.set(sym, (poolAmountBySymbol.get(sym) ?? 0) + amount);
        }
      }
    } catch {
      // Retirements are best-effort enrichment
    }

    updateProgress(0, { status: "composing", count: tokens.length });

    // Create provenance for every TCO2 token with nonzero carbon
    let skippedZero = 0;
    for (const token of tokens) {
      // totalVintageQuantity is in wei (×10^18) from the subgraph
      const rawQty = token.projectVintage.totalVintageQuantity || "0";
      const vintageQty = parseFloat(rawQty) / 1e18;
      const poolRetireQty = poolAmountBySymbol.get(token.symbol) ?? 0;
      const tCO2e = Math.max(vintageQty, poolRetireQty);

      // Skip tokens with no measurable impact
      if (tCO2e <= 0) {
        skippedZero++;
        continue;
      }

      const prov = composeToucanProvenance(token, tCO2e);

      // Apply CHAR market price for direct credit gap
      if (prices.char) {
        prov.valuation = addDirectCreditGap(
          prov.valuation,
          prices.char.price,
          prices.char.source
        );
      }
      stampMechanism(prov, "direct-credit", "asset");

      await addProvenance(prov, 0);
    }
    if (skippedZero > 0) {
      console.log(`[Ingest] Toucan: skipped ${skippedZero} tokens with 0 tCO2e`);
    }

    console.log(`[Ingest] Toucan: done — ${tokens.length} provenances, ${progress[0].matched} matched`);
    updateProgress(0, { status: "done", count: tokens.length });
  } catch (err) {
    console.error("[Ingest] Toucan FAILED:", err);
    updateProgress(0, {
      status: "error",
      error: err instanceof Error ? err.message : "Toucan fetch failed",
    });
  }

  // Regen Network
  try {
    updateProgress(1, { status: "fetching" });
    const [projects, classes] = await Promise.all([
      fetchRegenProjects(),
      fetchRegenClasses(),
    ]);

    const classMap = new Map(classes.map((c) => [c.id, c]));
    const projectSlice = projects.slice(0, maxPerSource);
    updateProgress(1, { status: "composing", count: projectSlice.length });

    // Fetch batches in small chunks (supply fetches are sequential per project,
    // so limit concurrent projects to avoid overwhelming the LCD endpoint)
    const batchSize = 2;
    for (let i = 0; i < projectSlice.length; i += batchSize) {
      const chunk = projectSlice.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        chunk.map(async (project) => {
          const batches = await fetchRegenBatches(project.id);
          const classInfo = classMap.get(project.class_id);

          let metadata: Record<string, unknown> | undefined;
          if (project.metadata) {
            try {
              metadata = await fetchProjectMetadata(project.metadata);
            } catch {
              // best-effort
            }
          }

          const prov = composeRegenProvenance(project, batches, classInfo, metadata);

          // Classify as asset or action based on supply data
          const hasTradable = batches.some(
            (b) => b._supply && b._supply.tradable > 0
          );

          if (hasTradable) {
            // Tradable credits exist — try to find sell orders for pricing
            stampMechanism(prov, "direct-credit", "asset");
            const tradableBatch = batches.find(
              (b) => b._supply && b._supply.tradable > 0
            );
            if (tradableBatch) {
              try {
                const sellData = await fetchRegenSellOrders(tradableBatch.denom);
                if (sellData) {
                  prov.valuation = addDirectCreditGap(
                    prov.valuation,
                    sellData.lowestAskUSD,
                    "regen-marketplace"
                  );
                }
              } catch {
                // Sell order fetch is best-effort
              }
            }
          } else {
            // All credits retired — forensic record, no live market price
            stampMechanism(prov, "retired", "action");
          }

          return prov;
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          await addProvenance(result.value, 1);
        }
      }
    }
    updateProgress(1, { status: "done", count: projectSlice.length });
  } catch (err) {
    updateProgress(1, {
      status: "error",
      error:
        err instanceof Error ? err.message : "Regen Network fetch failed",
    });
  }

  // Glow
  try {
    updateProgress(2, { status: "fetching" });

    // Fetch both aggregate weekly reports and per-farm audit data
    const [reports, auditFarms] = await Promise.all([
      fetchGlowRecentReports(8),
      fetchGlowAuditFarms(),
    ]);

    let count = 0;

    // Add aggregate network provenance with NPV-scaled gap analysis
    if (reports.length > 0) {
      updateProgress(2, { status: "composing", count: auditFarms.length + 1 });
      const glowProv = composeGlowProvenance(reports);

      // Scale annual valuation by NPV factor for lifetime value, then apply protocol equity gap
      const npv = npvFactor(); // 3%, 30yr → ~19.6
      const scaledValuation = {
        ...glowProv.valuation,
        totalValue: {
          low: Math.round(glowProv.valuation.totalValue.low * npv),
          high: Math.round(glowProv.valuation.totalValue.high * npv),
          currency: glowProv.valuation.totalValue.currency,
        },
      };

      if (prices.glw?.price && prices.glw.marketCap) {
        glowProv.valuation = addGapFactor(
          scaledValuation,
          prices.glw.marketCap,
          prices.glw.price,
          prices.glw.source
        );
      } else {
        glowProv.valuation = scaledValuation;
      }
      stampMechanism(glowProv, "protocol-equity", "asset");

      await addProvenance(glowProv, 2);
      count++;
    }

    // Add per-farm provenance objects (up to maxPerSource)
    const farmSlice = auditFarms.slice(0, maxPerSource);
    for (const farm of farmSlice) {
      if (farm.weeklyCarbon > 0 || (farm.weeklyPower ?? 0) > 0) {
        const farmProv = composeGlowFarmProvenance(farm, reports.length);
        stampMechanism(farmProv, "protocol-equity", "asset");
        await addProvenance(farmProv, 2);
        count++;
      }
    }

    updateProgress(2, { status: "done", count });
  } catch (err) {
    updateProgress(2, {
      status: "error",
      error: err instanceof Error ? err.message : "Glow fetch failed",
    });
  }

  // Hedera Guardian — load pre-built provenance from static JSON
  try {
    updateProgress(3, { status: "fetching" });
    console.log("[Ingest] Hedera Guardian: loading provenance data...");

    const hederaProvs = await fetchHederaProvenances();
    updateProgress(3, { status: "composing", count: hederaProvs.length });

    for (const p of hederaProvs) {
      await addProvenance(p, 3);
    }

    updateProgress(3, { status: "done", count: hederaProvs.length });
    console.log(`[Ingest] Hedera Guardian: ${hederaProvs.length} provenance objects loaded`);
  } catch (err) {
    updateProgress(3, {
      status: "error",
      error: err instanceof Error ? err.message : "Hedera Guardian load failed",
    });
  }

  // Atlantis — fetch from Supabase actions_published_view
  clearSupabaseActionsCache();
  try {
    updateProgress(4, { status: "fetching" });
    const atlantisProvs = await fetchActionsByProtocol("atlantis");
    updateProgress(4, { status: "composing", count: atlantisProvs.length });

    for (const p of atlantisProvs) {
      stampMechanism(p, "retired", "action");
      await addProvenance(p, 4);
    }

    updateProgress(4, { status: "done", count: atlantisProvs.length });
  } catch (err) {
    updateProgress(4, {
      status: "error",
      error: err instanceof Error ? err.message : "Atlantis fetch failed",
    });
  }

  // Silvi — fetch from Supabase actions_published_view
  try {
    updateProgress(5, { status: "fetching" });
    const silviProvs = await fetchActionsByProtocol("silvi");
    updateProgress(5, { status: "composing", count: silviProvs.length });

    for (const p of silviProvs) {
      stampMechanism(p, "retired", "action");
      await addProvenance(p, 5);
    }

    updateProgress(5, { status: "done", count: silviProvs.length });
  } catch (err) {
    updateProgress(5, {
      status: "error",
      error: err instanceof Error ? err.message : "Silvi fetch failed",
    });
  }

  bumpCacheVersion();
  persistToStorage();
  return provenances;
}

export function getProvenanceByCid(
  cid: string
): VerifiableProvenance | undefined {
  return provenanceCache.get(cid);
}

export function getAllCachedProvenances(): VerifiableProvenance[] {
  return Array.from(provenanceCache.values());
}

export function getProvenancesForAsset(
  assetId: string
): VerifiableProvenance[] {
  const cids = assetProvenanceMap.get(assetId) ?? [];
  return cids
    .map((cid) => provenanceCache.get(cid))
    .filter((p): p is VerifiableProvenance => !!p);
}

export function getMatchedAssetIds(): string[] {
  return Array.from(assetProvenanceMap.keys());
}

export function stampCidOnAll(cid: string): number {
  let count = 0;
  for (const p of provenanceCache.values()) {
    p.pieceCid = cid;
    count++;
  }
  bumpCacheVersion();
  persistToStorage();
  console.log(`[ProvenanceService] Stamped CID ${cid} on ${count} provenances`);
  return count;
}

export function getAggregateImpact(
  provenances?: VerifiableProvenance[]
): ImpactAggregate {
  const data = provenances ?? getAllCachedProvenances();
  return aggregateImpact(data);
}

export async function batchUploadToFilecoin(
  provenances: VerifiableProvenance[],
  uploadFn: (
    p: VerifiableProvenance
  ) => Promise<{ pieceCid: string; size: number } | null>,
  onProgress?: (uploaded: number, total: number) => void
): Promise<{ uploaded: number; failed: number; cids: string[] }> {
  const cids: string[] = [];
  let failed = 0;

  for (let i = 0; i < provenances.length; i++) {
    try {
      const result = await uploadFn(provenances[i]);
      if (result) {
        provenances[i].pieceCid = result.pieceCid;
        provenanceCache.set(result.pieceCid, provenances[i]);
        cids.push(result.pieceCid);
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
    onProgress?.(i + 1, provenances.length);
  }

  return { uploaded: cids.length, failed, cids };
}
