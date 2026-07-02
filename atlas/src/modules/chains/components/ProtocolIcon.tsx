/**
 * Unified protocol icon using CSS mask-image.
 * Matches ChainIcon style: monochrome SVGs in /protocols/.
 * Color is inherited from the parent via currentColor / bg-current.
 */

const KNOWN_PROTOCOLS = new Set([
  "hedera-guardian",
  "silvi",
  "atlantis",
  "toucan",
  "regen-network",
  "ecocerts",
]);

/** Map protocol IDs/names to known slugs (all lowercase) */
const PROTOCOL_ALIASES: Record<string, string> = {
  "hedera guardian": "hedera-guardian",
  "hedera-guardian": "hedera-guardian",
  "guardian": "hedera-guardian",
  "silvi": "silvi",
  "silvi protocol": "silvi",
  "atlantis": "atlantis",
  "atlantis protocol": "atlantis",
  "toucan": "toucan",
  "toucan protocol": "toucan",
  "regen network": "regen-network",
  "regen": "regen-network",
  "ecocerts": "ecocerts",
  "ecocertain": "ecocerts",
  "gainforest": "ecocerts",
};

function resolveProtocolSlug(id: string, name?: string): string {
  if (KNOWN_PROTOCOLS.has(id)) return id;
  const lower = id.toLowerCase().trim();
  if (PROTOCOL_ALIASES[lower]) return PROTOCOL_ALIASES[lower];
  if (name) {
    const slug = PROTOCOL_ALIASES[name.toLowerCase().trim()];
    if (slug) return slug;
  }
  return id;
}

interface ProtocolIconProps {
  protocolId: string;
  protocolName?: string;
  size?: number;
  className?: string;
}

export function ProtocolIcon({
  protocolId,
  protocolName,
  size = 16,
  className,
}: ProtocolIconProps) {
  const slug = resolveProtocolSlug(protocolId, protocolName);
  if (KNOWN_PROTOCOLS.has(slug)) {
    const url = `/protocols/${slug}.svg`;
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

  // Fallback: first letter in a neutral circle
  const initial = (protocolName ?? protocolId).charAt(0).toUpperCase();
  return (
    <div
      className="rounded-full bg-gray-200 flex items-center justify-center shrink-0 text-gray-600 font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.55 }}
    >
      {initial}
    </div>
  );
}
