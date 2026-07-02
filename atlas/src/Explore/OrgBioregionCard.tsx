import { useState } from "react";
import {
  MapPin,
  Buildings,
  Globe,
  ArrowUpRight,
  XLogo,
  TelegramLogo,
  InstagramLogo,
  YoutubeLogo,
  LinkedinLogo,
  GithubLogo,
  LinkSimple,
  Check,
  Cube,
} from "@phosphor-icons/react";
import type { Org } from "../shared/types";
import { ChainIcon } from "../modules/chains/components/ChainIcon";
import { CollapsibleSection } from "../shared/components/CollapsibleSection";

const SOCIAL_ICONS: Record<string, typeof XLogo> = {
  x: XLogo,
  twitter: XLogo,
  telegram: TelegramLogo,
  instagram: InstagramLogo,
  youtube: YoutubeLogo,
  linkedin: LinkedinLogo,
  github: GithubLogo,
};

interface OrgBioregionCardProps {
  org: Org;
  siblingOrgs?: Org[];
  onOrgSelect?: (org: Org) => void;
}

export function OrgBioregionCard({ org, siblingOrgs, onOrgSelect }: OrgBioregionCardProps) {
  const [openSections, setOpenSections] = useState<Set<DetailSection>>(
    new Set(["issuers", "chains", "links", "assets"])
  );

  const toggleSection = (id: DetailSection) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="bg-cardBackground border border-gray-200 overflow-hidden flex flex-col h-full">
      {/* ── Hero header ── */}
      <div className="relative overflow-hidden">
        {org.main_image && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${org.main_image})` }}
          />
        )}
        <div className={`absolute inset-0 ${org.main_image ? "bg-gradient-to-r from-black/70 via-black/50 to-black/30" : "bg-gray-800"}`} />
        <div className="relative z-10 px-5 py-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded text-white ${(org as any).isAgent ? "bg-purple-500/30" : "bg-blue-500/30"}`}>
              {(org as any).isAgent ? "Agent" : "Organization"}
            </span>
          </div>
          <h3 className="text-base font-bold text-white leading-tight">
            {org.name}
          </h3>
          <div className="flex items-center gap-1 mt-1.5 text-xs text-white/70">
            {org.address && (
              <span className="flex items-center gap-0.5">
                <MapPin size={11} className="flex-shrink-0" />
                {org.address}
              </span>
            )}
            {org.address && org.established && (
              <span className="text-white/40">·</span>
            )}
            {org.established && (
              <span>Est. {new Date(org.established).getFullYear()}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── Signal pills ── */}
        <div className="px-4 pt-3 pb-1 flex items-center gap-1.5 flex-wrap">
          {org.assets.length > 0 && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 flex items-center gap-0.5">
              <Check size={10} weight="bold" />
              {org.assets.length} asset{org.assets.length !== 1 ? "s" : ""}
            </span>
          )}
          {org.issuers.length > 0 && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 flex items-center gap-0.5">
              <Check size={10} weight="bold" />
              {org.issuers.length} issuer{org.issuers.length !== 1 ? "s" : ""}
            </span>
          )}
          {org.ecosystems.length > 0 && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 flex items-center gap-0.5">
              <Check size={10} weight="bold" />
              {org.ecosystems.length} ecosystem{org.ecosystems.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* ── Description ── */}
        {org.description && (
          <div className="px-4 py-3">
            <p className="text-xs text-gray-600 leading-relaxed">
              {org.description}
            </p>
          </div>
        )}

        {/* ── Detail sections ── */}
        <div>
          {/* Issuers */}
          {org.issuers.length > 0 && (
            <CollapsibleSection
              id="issuers"
              icon={<Buildings size={13} />}
              label={`Issuers (${org.issuers.length})`}
              isOpen={openSections.has("issuers")}
              onToggle={toggleSection}
            >
              <div className="flex flex-wrap gap-1.5">
                {org.issuers.map((issuer) => (
                  <span
                    key={issuer.id}
                    className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-700"
                  >
                    {issuer.name}
                  </span>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Assets */}
          {org.assets.length > 0 && (
            <CollapsibleSection
              id="assets"
              icon={<Cube size={13} />}
              label={`Assets (${org.assets.length})`}
              isOpen={openSections.has("assets")}
              onToggle={toggleSection}
            >
              <div className="space-y-1">
                {org.assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center gap-2 bg-gray-50 px-3 py-2"
                  >
                    <Cube size={12} className="text-gray-400 flex-shrink-0" />
                    <span className="text-xs font-medium text-gray-800 truncate">
                      {asset.name}
                    </span>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Chains */}
          {org.treasury.length > 0 && (
            <CollapsibleSection
              id="chains"
              icon={<Globe size={13} />}
              label={`Chains (${org.treasury.length})`}
              isOpen={openSections.has("chains")}
              onToggle={toggleSection}
            >
              <div className="flex flex-wrap gap-2">
                {org.treasury.map((t) => (
                  <a
                    key={t.link}
                    href={t.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 hover:bg-gray-100 transition-colors"
                  >
                    <ChainIcon chainId={t.platform?.id ?? ''} chainName={t.platform?.name ?? ''} size={18} />
                    <span className="text-xs font-medium text-gray-700">{t.platform?.name || 'Chain'}</span>
                  </a>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Links */}
          {(org.social?.length > 0 || org.link) && (
            <CollapsibleSection
              id="links"
              icon={<LinkSimple size={13} />}
              label="Links"
              isOpen={openSections.has("links")}
              onToggle={toggleSection}
            >
              <div className="flex items-center gap-3">
                {org.link && (
                  <a
                    href={org.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-700 transition-colors"
                    title="Website"
                  >
                    <Globe size={16} />
                  </a>
                )}
                {org.social?.map((s) => {
                  const platform = s.platform.toLowerCase();
                  const Icon = SOCIAL_ICONS[platform] || LinkSimple;
                  return (
                    <a
                      key={s.platform}
                      href={s.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-gray-700 transition-colors"
                      title={s.platform}
                    >
                      <Icon size={16} />
                    </a>
                  );
                })}
              </div>
            </CollapsibleSection>
          )}
        </div>

      </div>

      {/* ── Bottom pinned: external links ── */}
      {(org.link || org.impact_link) && (
        <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 flex gap-2 bg-cardBackground">
          {org.link && (
            <a
              href={org.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] py-2 border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Website
              <ArrowUpRight size={11} />
            </a>
          )}
          {org.impact_link && (
            <a
              href={org.impact_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] py-2 bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
            >
              Impact Report
              <ArrowUpRight size={11} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
