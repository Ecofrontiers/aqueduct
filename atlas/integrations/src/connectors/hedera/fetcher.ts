/**
 * Hedera Mirror Node fetcher
 *
 * Enumerates tokens from known treasury accounts, fetches token details,
 * resolves IPFS metadata for Capturiant and Tolam NFTs.
 */

import type {
  MirrorNodeToken,
  AccountTokensResponse,
  NFTResponse,
  EnrichedToken,
  Platform,
  OrbexMemo,
} from "./types";
import {
  TREASURY_PLATFORM_MAP,
  DOVU_FILTER_NAMES,
  DOVU_FILTER_SYMBOLS,
} from "./types";

const MIRROR_NODE = "https://mainnet-public.mirrornode.hedera.com/api/v1";

/** Rate limit: wait between Mirror Node requests */
const THROTTLE_MS = 200;
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Mirror Node ${res.status}: ${url}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Fetch all token IDs held by a treasury account
 */
async function fetchAccountTokens(accountId: string): Promise<string[]> {
  const tokenIds: string[] = [];
  let url: string | null =
    `${MIRROR_NODE}/accounts/${accountId}/tokens?limit=100`;

  while (url) {
    const data: AccountTokensResponse = await fetchJSON<AccountTokensResponse>(url);
    for (const t of data.tokens) {
      tokenIds.push(t.token_id);
    }
    // links.next may already include /api/v1/ prefix
    const nextPath = data.links?.next ?? null;
    if (nextPath) {
      url = nextPath.startsWith("http")
        ? nextPath
        : nextPath.startsWith("/api/")
          ? `https://mainnet-public.mirrornode.hedera.com${nextPath}`
          : `${MIRROR_NODE}${nextPath}`;
    } else {
      url = null;
    }
    if (url) await sleep(THROTTLE_MS);
  }

  return tokenIds;
}

/**
 * Fetch token detail from Mirror Node
 */
async function fetchTokenDetail(tokenId: string): Promise<MirrorNodeToken> {
  return fetchJSON<MirrorNodeToken>(`${MIRROR_NODE}/tokens/${tokenId}`);
}

/**
 * Fetch first NFT serial metadata (for Tolam, GCR, DOVU NFTs)
 */
async function fetchFirstNFTMetadata(
  tokenId: string
): Promise<Record<string, any> | undefined> {
  try {
    const data = await fetchJSON<NFTResponse>(
      `${MIRROR_NODE}/tokens/${tokenId}/nfts?limit=1`
    );
    if (data.nfts.length === 0) return undefined;

    const raw = data.nfts[0].metadata;
    if (!raw) return undefined;

    // metadata is base64-encoded; could be a Hedera timestamp, IPFS CID, or JSON
    const decoded = Buffer.from(raw, "base64").toString("utf-8");

    // If it looks like JSON, parse it
    if (decoded.startsWith("{")) {
      return JSON.parse(decoded);
    }

    // If it looks like an IPFS CID (starts with Qm or bafy)
    if (decoded.startsWith("Qm") || decoded.startsWith("bafy") || decoded.startsWith("bafk")) {
      return resolveIPFS(decoded);
    }

    // Otherwise it's probably a Hedera timestamp — return as-is
    return { rawMetadata: decoded };
  } catch {
    return undefined;
  }
}

/**
 * Resolve IPFS CID to JSON content
 */
async function resolveIPFS(cid: string): Promise<Record<string, any> | undefined> {
  const gateways = [
    `https://${cid}.ipfs.w3s.link/`,
    `https://gateway.pinata.cloud/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`,
  ];

  for (const url of gateways) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(10_000),
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch {
          return { rawContent: text };
        }
      }
    } catch {
      continue;
    }
  }

  console.warn(`    ⚠️  IPFS resolution failed for CID: ${cid}`);
  return undefined;
}

/**
 * Should this token be filtered out?
 */
function shouldFilter(token: MirrorNodeToken, platform: Platform): boolean {
  const name = token.name.trim();
  const symbol = token.symbol.trim();
  const supply = BigInt(token.total_supply);

  // Zero supply = never minted
  if (supply === 0n) return true;

  // DOVU: filter test tokens, utility tokens, templates, non-farm tokens
  if (platform === "DOVU") {
    if (DOVU_FILTER_NAMES.has(name)) return true;
    if (DOVU_FILTER_SYMBOLS.has(symbol)) return true;
    if (name.includes("elonDOV")) return true;
    if (name.includes("TEMPLATE")) return true;
    // Filter obvious test/junk tokens by pattern
    const lower = name.toLowerCase();
    if (/^test/i.test(name)) return true;
    if (/^e2e/i.test(name)) return true;
    if (name.length <= 5 && !/farm|elv|gcr/i.test(name)) return true; // "Hi", "ddd", "Matt1"
    if (lower.includes("send token")) return true;
    if (lower.includes("bequest")) return true;
    if (lower === "sft - guardian") return true;
    // Filter non-environmental tokens: Green Bonds, OTC purchases, certificates
    if (lower.includes("green bond")) return true;
    if (lower.includes("[otc]")) return true;
    if (lower.includes("elv asset certificate")) return true;
    // Filter remaining junk: short nonsense strings, test-like names
    if (lower === "hello there") return true;
    if (lower === "final test") return true;
    if (/^[a-z]{3,8}$/i.test(name) && !lower.includes("farm")) return true; // "AEEAtest", "EtteTWW"
    if (lower.startsWith("testdov")) return true;
    // Fragments of farm names without "farm" keyword — not real Actions
    if (lower === "redhill" || lower === "summerley" || lower === "briyastovo") return true;
    if (lower === "big grey farm") return true; // no geography available
  }

  // Tolam: filter smoke test tokens and generic empties
  if (platform === "Tolam Earth") {
    if (name.toUpperCase().startsWith("TOLAM SMOKE TEST")) return true;
    if (name === "EcoRegistry Asset" && supply === 0n) return true;
  }

  // OrbexCO2: filter test tokens (name starts with "test")
  if (platform === "OrbexCO2") {
    if (/^test/i.test(name)) return true;
  }

  // OrbexCO2: only ingest CO2 credit tokens (have tokenLink in memo)
  if (platform === "OrbexCO2") {
    try {
      const memo: OrbexMemo = JSON.parse(token.memo);
      // Skip commodity tokens (no tokenLink)
      if (!memo.tokenLink) return true;
    } catch {
      // If memo isn't valid JSON, skip
      return true;
    }
  }

  // TYMLEZ: only CET (the one with supply > 0)
  if (platform === "TYMLEZ") {
    if (!symbol.includes("CET")) return true;
  }

  return false;
}

/**
 * Main fetch function: enumerate all treasury accounts, fetch token details,
 * filter, and resolve IPFS metadata where needed.
 */
export async function fetchHederaTokens(
  _scope?: { chain?: string }
): Promise<EnrichedToken[]> {
  const enriched: EnrichedToken[] = [];
  const seenTokenIds = new Set<string>();

  for (const [treasuryId, platform] of Object.entries(TREASURY_PLATFORM_MAP)) {
    console.log(`  📋 Fetching tokens from ${platform} treasury ${treasuryId}...`);

    let tokenIds: string[];
    try {
      tokenIds = await fetchAccountTokens(treasuryId);
    } catch (err) {
      console.error(`    ✗ Failed to fetch tokens for ${treasuryId}:`, err);
      continue;
    }

    console.log(`    Found ${tokenIds.length} tokens`);

    for (const tokenId of tokenIds) {
      // Skip duplicates (same token in multiple treasuries)
      if (seenTokenIds.has(tokenId)) continue;
      seenTokenIds.add(tokenId);

      await sleep(THROTTLE_MS);

      let token: MirrorNodeToken;
      try {
        token = await fetchTokenDetail(tokenId);
      } catch (err) {
        console.error(`    ✗ Failed to fetch token ${tokenId}:`, err);
        continue;
      }

      if (shouldFilter(token, platform)) {
        continue;
      }

      // Resolve IPFS for Capturiant (CID in memo)
      let ipfsMetadata: Record<string, any> | undefined;
      if (
        platform === "Capturiant" &&
        token.memo &&
        (token.memo.startsWith("bafk") || token.memo.startsWith("bafy") || token.memo.startsWith("Qm"))
      ) {
        await sleep(THROTTLE_MS);
        ipfsMetadata = await resolveIPFS(token.memo);
      }

      // Resolve NFT metadata for Tolam and GCR (first serial)
      let nftMetadata: Record<string, any> | undefined;
      if (
        (platform === "Tolam Earth" || platform === "GCR") &&
        token.type === "NON_FUNGIBLE_UNIQUE"
      ) {
        await sleep(THROTTLE_MS);
        nftMetadata = await fetchFirstNFTMetadata(tokenId);
      }

      // OrbexCO2: resolve linked commodity token for geography
      let linkedMemo: string | undefined;
      if (platform === "OrbexCO2") {
        try {
          const memo: OrbexMemo = JSON.parse(token.memo);
          if (memo.tokenLink) {
            await sleep(THROTTLE_MS);
            const linkedToken = await fetchTokenDetail(memo.tokenLink);
            linkedMemo = linkedToken.memo;
          }
        } catch {
          // skip
        }
      }

      enriched.push({ token, platform, ipfsMetadata, nftMetadata, linkedMemo });
    }
  }

  console.log(`\n  📊 Total enriched tokens: ${enriched.length}`);
  return enriched;
}
