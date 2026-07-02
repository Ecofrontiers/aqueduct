import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CaretDown,
  CaretRight,
  CaretUp,
  MapPin,
  TreeStructure,
  Globe,
  Certificate,
  Check,
  Buildings,
  Link as LinkIcon,
  Cube,
  Coin,
  ShieldCheck,
} from "@phosphor-icons/react";
import { Asset } from "../../modules/assets";
import { ChainTag } from "../../modules/chains/components/ChainTag";
import { COUNTRY_CODE_TO_NAME } from "../../shared/countryCodes";
import { useNewFiltersState } from "../../context/filters";
import { getProvenancesForAsset } from "../../modules/filecoin/ProvenanceService";
import { LocationProofChip } from "../../modules/ecospatial/astral";

type DetailSection = "ratings" | "issuer" | "chains" | "tokens" | "provenance";

function CollapsibleSection({
  id,
  icon,
  label,
  isOpen,
  onToggle,
  children,
}: {
  id: DetailSection;
  icon: ReactNode;
  label: string;
  isOpen: boolean;
  onToggle: (id: DetailSection) => void;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-gray-100">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center gap-1.5 px-4 py-2.5 text-xs text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        {icon}
        <span className="font-semibold">{label}</span>
        {isOpen ? (
          <CaretDown size={11} className="ml-auto text-gray-400" />
        ) : (
          <CaretRight size={11} className="ml-auto text-gray-400" />
        )}
      </button>
      {isOpen && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

const TYPE_COLORS: Record<number, string> = {
  5: "#F4D35E",
  1: "#4CAF50",
  6: "#00ACC1",
  7: "#BA68C8",
  4: "#FF8A65",
  8: "#90A4AE",
};

interface AssetBioregionCardProps {
  asset: Asset;
  bioregion?: {
    name: string;
    code: string;
    color: string;
    realm_name: string;
  } | null;
  siblingCount?: number;
  onBackToBioregion?: () => void;
  onAssetSelect?: (assetId: string) => void;
  showExternalLinks?: boolean;
}

export function AssetBioregionCard({
  asset,
  bioregion,
  siblingCount = 0,
  onBackToBioregion,
  onAssetSelect,
  showExternalLinks,
}: AssetBioregionCardProps) {
  const { allAssets } = useNewFiltersState();
  const [expanded, setExpanded] = useState(false);
  const [openSections, setOpenSections] = useState<Set<DetailSection>>(new Set());

  const toggleSection = (id: DetailSection) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const location = [asset.region, COUNTRY_CODE_TO_NAME[asset.country_code]]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="bg-cardBackground border border-gray-200 overflow-hidden">
      {/* ── Hero header ── */}
      <div className="relative overflow-hidden">
        {asset.main_image && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${asset.main_image})` }}
          />
        )}
        <div className={`absolute inset-0 ${asset.main_image ? "bg-gradient-to-r from-black/70 via-black/50 to-black/30" : "bg-gray-800"}`} />
        <div className="relative z-10 px-5 py-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            {asset.asset_types.map((t) => (
              <span
                key={t.id}
                className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: `${TYPE_COLORS[t.id] ?? "#9CA3AF"}30`,
                  color: "#fff",
                }}
              >
                {t.name}
              </span>
            ))}
          </div>
          <h3 className="text-base font-bold text-white leading-tight">
            {asset.name}
          </h3>
          <div className="flex items-center gap-1 mt-1.5 text-xs text-white/70">
            {location && (
              <span className="flex items-center gap-0.5">
                <MapPin size={11} className="flex-shrink-0" />
                {location}
              </span>
            )}
            {location && asset.issuer?.name && (
              <span className="text-white/40">·</span>
            )}
            {asset.issuer?.name && (
              <span className="font-medium text-white/90">
                {asset.issuer.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Signal pills ── */}
      <div className="px-4 pb-3 flex items-center gap-1.5 flex-wrap">
        {asset.platforms.map((p) => (
          <div
            key={p.id}
            className="w-5 h-5 flex items-center justify-center rounded-full [&>div]:!w-5 [&>div]:!h-5"
          >
            <ChainTag platform={p} />
          </div>
        ))}
        {asset.asset_subtypes.map((s) => (
          <span
            key={s.id}
            className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"
          >
            {s.name}
          </span>
        ))}
        {asset.prefinancing && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 flex items-center gap-0.5">
            <Check size={10} weight="bold" />
            Prefinancing
          </span>
        )}
        {asset.pretoken && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 flex items-center gap-0.5">
            <Check size={10} weight="bold" />
            Pretoken
          </span>
        )}
        {asset.yield_bearing && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 flex items-center gap-0.5">
            <Check size={10} weight="bold" />
            Yield
          </span>
        )}
        {asset.certifications.length > 0 && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 flex items-center gap-0.5">
            <Certificate size={10} />
            {asset.certifications.length} rating{asset.certifications.length !== 1 ? "s" : ""}
          </span>
        )}
        {getProvenancesForAsset(asset.id).some(
          (p) => p.pieceCid && !p.pieceCid.startsWith("local:")
        ) && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 flex items-center gap-0.5">
            <Check size={10} weight="bold" />
            Verified on Filecoin
          </span>
        )}
        <LocationProofChip assetId={asset.id} />
      </div>

      {/* ── Description (collapsed: 3 lines, expanded: full) ── */}
      {asset.description && (
        <div className="px-4 pb-3">
          <p
            className={`text-xs text-gray-600 leading-relaxed ${expanded ? "" : "line-clamp-3"}`}
          >
            {asset.description}
          </p>
        </div>
      )}

      {/* ── External links (always visible on detail page) ── */}
      {showExternalLinks && (asset.issuer_link || asset.exchange_link) && (
        <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
          {asset.issuer_link && (
            <a
              href={asset.issuer_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Learn More
              <ArrowUpRight size={11} />
            </a>
          )}
          {asset.exchange_link && (
            <a
              href={asset.exchange_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
            >
              Buy / Trade
              <ArrowUpRight size={11} />
            </a>
          )}
        </div>
      )}

      {/* ── Expanded detail sections (independently collapsible) ── */}
      {expanded && (
        <div>
          {/* Certifications */}
          {asset.certifications.length > 0 && (
            <CollapsibleSection
              id="ratings"
              icon={<Certificate size={13} />}
              label={`Ratings & Certifications (${asset.certifications.length})`}
              isOpen={openSections.has("ratings")}
              onToggle={toggleSection}
            >
              <div className="space-y-2">
                {asset.certifications.map((cert) => (
                  <div
                    key={cert.id}
                    className="flex items-start justify-between gap-3 bg-gray-50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-gray-800">
                        {cert.certifier.short_name || cert.certifier.name}
                      </div>
                      {cert.description_short && (
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          {cert.description_short}
                        </div>
                      )}
                      {cert.description && cert.description !== cert.description_short && (
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {cert.description}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {cert.value > 0 && (
                        <span className="text-xs font-bold text-gray-700">
                          {cert.value}
                        </span>
                      )}
                      {cert.certification_source && (
                        <a
                          href={cert.certification_source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <ArrowUpRight size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Issuer */}
          {asset.issuer && (
            <CollapsibleSection
              id="issuer"
              icon={<Buildings size={13} />}
              label="Issuer"
              isOpen={openSections.has("issuer")}
              onToggle={toggleSection}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800">
                  {asset.issuer.name}
                </span>
                {asset.issuer_link && (
                  <a
                    href={asset.issuer_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700"
                  >
                    Website
                    <ArrowUpRight size={11} />
                  </a>
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* Chains */}
          {asset.platforms.length > 0 && (
            <CollapsibleSection
              id="chains"
              icon={<LinkIcon size={13} />}
              label={`Chains (${asset.platforms.length})`}
              isOpen={openSections.has("chains")}
              onToggle={toggleSection}
            >
              <div className="flex flex-wrap gap-2">
                {asset.platforms.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5"
                  >
                    <div className="w-4 h-4 flex items-center justify-center rounded-full [&>div]:!w-4 [&>div]:!h-4">
                      <ChainTag platform={p} />
                    </div>
                    <span className="text-xs font-medium text-gray-700">
                      {p.name}
                    </span>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Tokens */}
          {asset.tokens.length > 0 && (
            <CollapsibleSection
              id="tokens"
              icon={<Coin size={13} />}
              label={`Tokens (${asset.tokens.length})`}
              isOpen={openSections.has("tokens")}
              onToggle={toggleSection}
            >
              <div className="space-y-1">
                {asset.tokens.map((token) => (
                  <div
                    key={token.id}
                    className="flex items-center justify-between text-xs bg-gray-50 px-3 py-2"
                  >
                    <span className="font-medium text-gray-800">
                      {token.name}
                    </span>
                    <span className="text-gray-500 font-mono">
                      {token.symbol}
                    </span>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Provenance */}
          {(() => {
            const provs = getProvenancesForAsset(asset.id);
            if (provs.length === 0) return null;
            const FILBEAM_CLIENT = "0xC4d9d1a93068d311Ab18E988244123430eB4F1CD";
            return (
              <CollapsibleSection
                id="provenance"
                icon={<ShieldCheck size={13} />}
                label={`Impact Provenance (${provs.length})`}
                isOpen={openSections.has("provenance")}
                onToggle={toggleSection}
              >
                <p className="text-[10px] text-gray-400 mb-2">
                  Verified ecosystem service data archived onchain via Filecoin.
                </p>
                <div className="space-y-2">
                  {provs.map((p, i) => {
                    const m = p.impact.metrics;
                    return (
                      <div
                        key={p.pieceCid ?? i}
                        className="bg-gray-50 px-3 py-2.5 text-xs space-y-1.5"
                      >
                        {/* Source + pathway */}
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold capitalize text-gray-800">
                            {p.source.protocol}
                          </span>
                          {p.impact.creditingPathway && (
                            <span className="text-[10px] bg-gray-200 text-gray-500 px-1 py-px rounded">
                              {p.impact.creditingPathway}
                            </span>
                          )}
                        </div>

                        {/* Origin context */}
                        {(p.origin.project || p.origin.methodology) && (
                          <div className="text-[11px] text-gray-500 space-y-0.5">
                            {p.origin.project && (
                              <div className="truncate">
                                <span className="text-gray-600 font-medium">Project:</span>{" "}
                                {p.origin.project}
                              </div>
                            )}
                            {p.origin.methodology && (
                              <div className="truncate">
                                <span className="text-gray-600 font-medium">Method:</span>{" "}
                                {p.origin.methodology}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Impact metrics */}
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-gray-600">
                          {m.climate && (
                            <span>
                              <span className="text-gray-400">Carbon:</span>{" "}
                              <span className="font-semibold">{m.climate.tCO2e.toLocaleString()} tCO2e</span>
                              {m.climate.standard && (
                                <span className="text-gray-400 ml-1">({m.climate.standard})</span>
                              )}
                            </span>
                          )}
                          {m.biodiversity && (
                            <span>
                              <span className="text-gray-400">Land:</span>{" "}
                              <span className="font-semibold">{m.biodiversity.hectares.toLocaleString()} ha</span>
                              {" "}{m.biodiversity.biome}
                            </span>
                          )}
                          {m.energy && (
                            <span>
                              <span className="text-gray-400">Energy:</span>{" "}
                              <span className="font-semibold">{m.energy.mwhGenerated.toLocaleString()} MWh</span>
                              {" "}{m.energy.sourceType}
                            </span>
                          )}
                          {m.marine && (
                            <span>
                              <span className="text-gray-400">Marine:</span>{" "}
                              <span className="font-semibold">{m.marine.hectares.toLocaleString()} ha</span>
                            </span>
                          )}
                        </div>

                        {/* Valuation */}
                        <div className="text-gray-500 pt-0.5 border-t border-gray-100">
                          <span className="text-gray-400">Valuation:</span>{" "}
                          <span className="font-semibold text-gray-700">
                            ${p.valuation.totalValue.low.toLocaleString()} – ${p.valuation.totalValue.high.toLocaleString()}
                          </span>
                          <span className="text-gray-400 ml-1">
                            ({p.valuation.methodology})
                          </span>
                          {p.valuation.gapFactor && (
                            <div className="text-blue-600 font-medium mt-0.5">
                              Market gap: {p.valuation.gapFactor.low.toFixed(1)}x – {p.valuation.gapFactor.high.toFixed(1)}x
                            </div>
                          )}
                        </div>

                        {/* CID link */}
                        {p.pieceCid && !p.pieceCid.startsWith("local:") && (
                          <a
                            href={`https://${FILBEAM_CLIENT}.calibration.filbeam.io/${p.pieceCid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-500 hover:underline text-[10px] break-all pt-0.5"
                          >
                            <ShieldCheck size={10} className="flex-shrink-0" />
                            Filecoin CID: {p.pieceCid.slice(0, 24)}...
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CollapsibleSection>
            );
          })()}

          {/* External links — always visible when expanded */}
          {(asset.issuer_link || asset.exchange_link) && (
            <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
              {asset.issuer_link && (
                <a
                  href={asset.issuer_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Learn More
                  <ArrowUpRight size={11} />
                </a>
              )}
              {asset.exchange_link && (
                <a
                  href={asset.exchange_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
                >
                  Buy / Trade
                  <ArrowUpRight size={11} />
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Related assets (always visible) ── */}
      {asset.parent_assets.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2 text-xs">
            <TreeStructure size={14} className="text-gray-400 shrink-0" />
            <span className="text-gray-600">
              Derived from{" "}
              <span className="font-semibold text-gray-800">
                {asset.parent_assets.length} installation{asset.parent_assets.length !== 1 ? "s" : ""}
              </span>
            </span>
            <Globe size={12} className="ml-auto text-gray-400 shrink-0" />
            <span className="text-[10px] text-gray-400">shown on map</span>
          </div>
        </div>
      )}
      {asset.child_assets.length > 0 && (
        <div className="border-t border-gray-100">
          <div className="flex items-center gap-1.5 px-4 py-2 text-xs text-gray-500">
            <TreeStructure size={12} className="scale-y-[-1]" />
            <span className="font-medium">
              {asset.child_assets.length} Second Order Asset
              {asset.child_assets.length > 1 ? "s" : ""}
            </span>
          </div>
          <div>
            {asset.child_assets.map((child) => {
              const fullChild = allAssets.find((a) => a.id === child.id);
              const childImage = fullChild?.main_image;
              const childTypes = fullChild?.asset_subtypes ?? [];
              const childIssuer = fullChild?.issuer?.name;
              return (
                <button
                  key={child.id}
                  onClick={() => onAssetSelect?.(child.id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group cursor-pointer border-t border-gray-100"
                >
                  {childImage ? (
                    <img
                      src={childImage}
                      alt={child.name}
                      className="w-9 h-9 object-cover flex-shrink-0 border border-gray-200"
                    />
                  ) : (
                    <div className="w-9 h-9 bg-gray-100 flex items-center justify-center flex-shrink-0 border border-gray-200">
                      <Cube size={16} className="text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-xs font-semibold text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                      {child.name}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {childIssuer && (
                        <span className="text-[10px] text-gray-400 truncate">{childIssuer}</span>
                      )}
                      {childTypes.length > 0 && childIssuer && (
                        <span className="text-gray-300 text-[10px]">·</span>
                      )}
                      {childTypes.slice(0, 2).map((t) => (
                        <span key={t.id} className="text-[10px] text-gray-400">
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ArrowRight
                    size={12}
                    className="flex-shrink-0 text-gray-300 group-hover:text-blue-500"
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Bioregion context row ── */}
      {bioregion && onBackToBioregion && (
        <button
          onClick={onBackToBioregion}
          className="w-full flex items-center gap-2 px-4 py-2.5 border-t border-gray-100 hover:bg-gray-50 transition-colors group"
        >
          <Globe
            size={14}
            weight="fill"
            style={{ color: bioregion.color }}
            className="flex-shrink-0"
          />
          <span className="text-xs text-gray-500 group-hover:text-gray-700 truncate">
            {bioregion.name}
          </span>
          {siblingCount > 0 && (
            <span className="text-xs text-gray-400">
              · {siblingCount} other asset{siblingCount !== 1 ? "s" : ""}
            </span>
          )}
          <ArrowRight
            size={12}
            className="ml-auto flex-shrink-0 text-gray-300 group-hover:text-gray-500"
          />
        </button>
      )}

      {/* ── Expand/Collapse toggle ── */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 border-t border-gray-100 text-xs font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors"
      >
        {expanded ? (
          <>
            Show Less <CaretUp size={12} />
          </>
        ) : (
          <>
            Full Details <CaretDown size={12} />
          </>
        )}
      </button>
    </div>
  );
}
