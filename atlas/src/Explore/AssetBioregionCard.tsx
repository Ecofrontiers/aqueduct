import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  MapPin,
  TreeStructure,
  Certificate,
  Check,
  Buildings,
  Link as LinkIcon,
  Cube,
  Coin,
  ShieldCheck,
} from "@phosphor-icons/react";
import { Asset } from "../modules/assets";
import { ChainTag } from "../modules/chains/components/ChainTag";
import { COUNTRY_CODE_TO_NAME } from "../shared/countryCodes";
import { useNewFiltersState } from "../context/filters";
import { getProvenancesForAsset } from "../modules/filecoin/ProvenanceService";
import { LocationProofChip } from "../modules/ecospatial/astral";
import { CollapsibleSection } from "../shared/components/CollapsibleSection";
import { FILBEAM_CLIENT } from "../shared/consts";

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
  const [openSections, setOpenSections] = useState<Set<DetailSection>>(new Set(["issuer", "ratings", "chains", "children"]));

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
    <div className="bg-cardBackground border border-gray-200 overflow-hidden flex flex-col h-full">
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
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
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
            {asset.asset_subtypes.map((s) => (
              <span
                key={s.id}
                className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-white/20 text-white/90"
              >
                {s.name}
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

      <div className="flex-1 overflow-y-auto">
      {/* ── Signal pills ── */}
      <div className="px-4 pt-3 pb-3 flex items-center gap-1.5 flex-wrap">
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
      </div>

      {/* ── Description (collapsed: 3 lines, expanded: full) ── */}
      {asset.description && (
        <div className="px-4 pb-3">
          <p
            className="text-xs text-gray-600 leading-relaxed"
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
              className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] py-2 border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
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
              className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] py-2 bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
            >
              Buy / Trade
              <ArrowUpRight size={11} />
            </a>
          )}
        </div>
      )}

      {/* ── Detail sections ── */}
      <div>
          {/* Issuer / Chains */}
          {(asset.issuer || asset.platforms.length > 0) && (
            <CollapsibleSection
              id="issuer"
              icon={<Buildings size={13} />}
              label={`Issuer${asset.platforms.length > 0 ? ` / Chains (${asset.platforms.length})` : ''}`}
              isOpen={openSections.has("issuer")}
              onToggle={toggleSection}
            >
              <div className="space-y-3">
                {asset.issuer && (
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
                )}
                {asset.platforms.length > 0 && (
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
                )}
              </div>
            </CollapsibleSection>
          )}

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

          {/* Second Order Assets */}
          {asset.child_assets.length > 0 && (
            <CollapsibleSection
              id="children"
              icon={<TreeStructure size={13} className="scale-y-[-1]" />}
              label={`Second Order Assets (${asset.child_assets.length})`}
              isOpen={openSections.has("children")}
              onToggle={toggleSection}
            >
              <div className="-mx-4">
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
            </CollapsibleSection>
          )}

          {/* Primary assets (for second-order assets) */}
          {asset.parent_assets.length > 0 && (
            <CollapsibleSection
              id="parents"
              icon={<TreeStructure size={13} />}
              label={`Primary Assets (${asset.parent_assets.length})`}
              isOpen={openSections.has("parents")}
              onToggle={toggleSection}
            >
              <div className="-mx-4">
                {asset.parent_assets.map((parent) => {
                  const fullParent = allAssets.find((a) => a.id === parent.id);
                  const parentImage = fullParent?.main_image;
                  const parentTypes = fullParent?.asset_subtypes ?? [];
                  const parentIssuer = fullParent?.issuer?.name;
                  return (
                    <button
                      key={parent.id}
                      onClick={() => onAssetSelect?.(parent.id)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group cursor-pointer border-t border-gray-100"
                    >
                      {parentImage ? (
                        <img
                          src={parentImage}
                          alt={parent.name}
                          className="w-9 h-9 object-cover flex-shrink-0 border border-gray-200"
                        />
                      ) : (
                        <div className="w-9 h-9 bg-gray-100 flex items-center justify-center flex-shrink-0 border border-gray-200">
                          <Cube size={16} className="text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="text-xs font-semibold text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                          {parent.name}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {parentIssuer && (
                            <span className="text-[10px] text-gray-400 truncate">{parentIssuer}</span>
                          )}
                          {parentTypes.length > 0 && parentIssuer && (
                            <span className="text-gray-300 text-[10px]">·</span>
                          )}
                          {parentTypes.slice(0, 2).map((t) => (
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
            </CollapsibleSection>
          )}
        </div>

      </div>
        {/* External links — pinned to bottom */}
        {(asset.issuer_link || asset.exchange_link) && (
          <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 flex gap-2 bg-cardBackground">
            {asset.issuer_link && (
              <a
                href={asset.issuer_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] py-2 border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
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
                className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] py-2 bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
              >
                Buy / Trade
                <ArrowUpRight size={11} />
              </a>
            )}
          </div>
        )}
    </div>
  );
}
