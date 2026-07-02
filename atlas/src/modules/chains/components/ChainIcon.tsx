/**
 * Unified chain icon using CSS mask-image.
 * All 17 chains render from monochrome SVGs in /chains/unified/.
 * Color is inherited from the parent via currentColor / bg-current.
 */

const KNOWN_CHAINS = new Set([
  "ethereum",
  "polygon-pos",
  "binance-smart-chain",
  "near-protocol",
  "arbitrum-one",
  "celo",
  "base",
  "solana",
  "algorand",
  "regen-1",
  "lukso",
  "osmosis",
  "vechain",
  "cardano",
  "avalanche",
  "axelar",
  "iotex",
  "hedera",
]);

/** Map legacy/database IDs (EVM chain IDs, non-standard slugs) to KNOWN_CHAINS slugs */
const ID_ALIASES: Record<string, string> = {
  // EVM chain IDs
  "1": "ethereum",
  "137": "polygon-pos",
  "56": "binance-smart-chain",
  "397": "near-protocol",
  "42161": "arbitrum-one",
  "42220": "celo",
  "8453": "base",
  "42": "lukso",
  // Non-standard slugs
  "algorand-mainnet": "algorand",
  "solana-mainnet": "solana",
  "hedera-hashgraph": "hedera",
  "hedera-mainnet": "hedera",
};

/** Map chain display names to KNOWN_CHAINS slugs (case-insensitive fallback) */
const NAME_TO_SLUG: Record<string, string> = {
  "ethereum": "ethereum",
  "polygon": "polygon-pos",
  "polygon pos": "polygon-pos",
  "bnb chain": "binance-smart-chain",
  "bnb smart chain": "binance-smart-chain",
  "binance smart chain": "binance-smart-chain",
  "near": "near-protocol",
  "near protocol": "near-protocol",
  "arbitrum": "arbitrum-one",
  "arbitrum one": "arbitrum-one",
  "celo": "celo",
  "base": "base",
  "solana": "solana",
  "algorand": "algorand",
  "regen network": "regen-1",
  "regen": "regen-1",
  "lukso": "lukso",
  "osmosis": "osmosis",
  "vechain": "vechain",
  "cardano": "cardano",
  "avalanche": "avalanche",
  "axelar": "axelar",
  "iotex": "iotex",
};

function resolveChainSlug(raw: string | number, name?: string): string {
  const key = String(raw);
  // Direct match
  if (KNOWN_CHAINS.has(key)) return key;
  // Legacy ID alias
  if (ID_ALIASES[key]) return ID_ALIASES[key];
  // Name-based fallback
  if (name) {
    const slug = NAME_TO_SLUG[name.toLowerCase().trim()];
    if (slug) return slug;
  }
  return key;
}

interface ChainIconProps {
  chainId: string | number;
  chainName?: string;
  size?: number;
  className?: string;
}

export function ChainIcon({
  chainId,
  chainName,
  size = 16,
  className,
}: ChainIconProps) {
  const slug = resolveChainSlug(chainId, chainName);
  if (KNOWN_CHAINS.has(slug)) {
    const url = `/chains/unified/${slug}.svg`;
    return (
      <div
        className={className ?? "bg-current"}
        style={{
          width: size,
          height: size,
          maskImage: `url(${url})`,
          maskSize: "contain",
          maskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskImage: `url(${url})`,
          WebkitMaskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
        }}
      />
    );
  }

  // Debug: log unresolved chain IDs so we can add them to the alias maps
  console.warn(`[ChainIcon] unresolved chainId="${chainId}" name="${chainName}" → slug="${slug}"`);

  // Fallback: first letter in a neutral circle
  const initial = (chainName ?? String(chainId)).charAt(0).toUpperCase();
  return (
    <div
      className="rounded-full bg-gray-200 flex items-center justify-center shrink-0 text-gray-600 font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.55 }}
    >
      {initial}
    </div>
  );
}
