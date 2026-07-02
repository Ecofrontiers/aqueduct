import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CaretDown,
  CaretRight,
  MapPin,
  Globe,
  Certificate,
  Buildings,
  Users,
  LinkSimple,
  ShieldCheck,
  Target,
} from "@phosphor-icons/react";
import type { Action } from "../shared/types";
import { ProtocolIcon } from "../modules/chains/components/ProtocolIcon";
import { COUNTRY_CODE_TO_NAME } from "../shared/countryCodes";

// Official UN SDG colors
const SDG_COLORS: Record<string, string> = {
  "1": "#E5243B", "2": "#DDA63A", "3": "#4C9F38", "4": "#C5192D",
  "5": "#FF3A21", "6": "#26BDE2", "7": "#FCC30B", "8": "#A21942",
  "9": "#FD6925", "10": "#DD1367", "11": "#FD9D24", "12": "#BF8B2E",
  "13": "#3F7E44", "14": "#0A97D9", "15": "#56C02B", "16": "#00689D",
  "17": "#19486A",
};

type DetailSection = "org" | "sdgs" | "certs" | "proofs" | "chain";

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

interface ActionBioregionCardProps {
  action: Action;
  /** All actions in the same group (same location + base title) */
  actionGroup?: Action[];
}

export function ActionBioregionCard({
  action,
  actionGroup,
}: ActionBioregionCardProps) {
  const [openSections, setOpenSections] = useState<Set<DetailSection>>(
    new Set(["org", "sdgs", "proofs"])
  );

  const toggleSection = (id: DetailSection) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const group = actionGroup ?? [action];
  const allProofs = group.flatMap((a) => a.proofs);
  const allSdgs = [
    ...new Map(
      group.flatMap((a) => a.sdg_outcomes).map((s) => [s.code, s])
    ).values(),
  ];
  const allCerts = group.flatMap((a) => a.certifications ?? []);

  // Date range across group
  const dateRange = group
    .map((a) => a.action_start_date || a.created_at)
    .filter(Boolean)
    .sort();
  const dateLabelStart =
    dateRange.length > 0
      ? new Date(dateRange[0]!).toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        })
      : "";
  const dateLabelEnd =
    dateRange.length > 1
      ? new Date(dateRange[dateRange.length - 1]!).toLocaleDateString(
          "en-US",
          { month: "short", year: "numeric" }
        )
      : "";
  const dateLabel =
    dateLabelStart && dateLabelEnd && dateLabelStart !== dateLabelEnd
      ? `${dateLabelStart} – ${dateLabelEnd}`
      : dateLabelStart;

  const displayTitle = (action.title || "")
    .replace(/\s*[-—]\s*\d{4}\s*$/, "")
    .replace(/\s+\d{4}\s*$/, "")
    .trim();

  const protocol = allProofs[0]?.protocol;
  const platform = allProofs[0]?.platform;
  const actor = action.actors[0];

  const location = [
    action.region,
    action.country_code ? COUNTRY_CODE_TO_NAME[action.country_code] : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="bg-cardBackground border border-gray-200 overflow-hidden flex flex-col h-full">
      {/* ── Hero header ── */}
      <div className="relative overflow-hidden">
        {action.main_image ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${action.main_image})` }}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ backgroundColor: protocol?.color || "#059669" }}
          />
        )}
        <div
          className={`absolute inset-0 ${
            action.main_image
              ? "bg-gradient-to-r from-black/70 via-black/50 to-black/30"
              : "bg-black/20"
          }`}
        />
        <div className="relative z-10 px-5 py-4">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            {protocol && (
              <span
                className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: protocol.color || "#059669",
                  color: "#fff",
                }}
              >
                {protocol.name}
              </span>
            )}
            {group.length > 1 && (
              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-white/20 text-white/90">
                {group.length} issuances
              </span>
            )}
            {allSdgs.length > 0 &&
              [...allSdgs]
                .sort((a, b) => parseInt(a.code, 10) - parseInt(b.code, 10))
                .map((sdg) => (
                  <span
                    key={sdg.code}
                    title={sdg.title}
                    className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full text-[9px] font-bold text-white"
                    style={{
                      backgroundColor: SDG_COLORS[sdg.code] || "#6B7280",
                    }}
                  >
                    {sdg.code}
                  </span>
                ))}
          </div>
          <h3 className="text-base font-bold text-white leading-tight">
            {displayTitle}
          </h3>
          <div className="flex items-center gap-1 mt-1.5 text-xs text-white/70">
            {location && (
              <span className="flex items-center gap-0.5">
                <MapPin size={11} className="flex-shrink-0" />
                {location}
              </span>
            )}
            {location && actor && <span className="text-white/40">·</span>}
            {actor && (
              <span className="font-medium text-white/90">{actor.name}</span>
            )}
            {dateLabel && (
              <>
                <span className="text-white/40">·</span>
                <span>{dateLabel}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── Description ── */}
        {action.description && (
          <div className="px-4 py-3">
            <p className="text-xs text-gray-600 leading-relaxed">
              {action.description}
            </p>
          </div>
        )}

        {/* ── Detail sections ── */}
        <div>
          {/* Organization */}
          {action.actors.length > 0 && (
            <CollapsibleSection
              id="org"
              icon={<Buildings size={13} />}
              label={
                action.actors.length === 1
                  ? "Organization"
                  : `Organizations (${action.actors.length})`
              }
              isOpen={openSections.has("org")}
              onToggle={toggleSection}
            >
              <div className="space-y-2">
                {action.actors.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Users size={10} className="text-blue-500" />
                      </div>
                      <span className="text-sm font-medium text-gray-800">
                        {act.name}
                      </span>
                    </div>
                    {act.website && (
                      <a
                        href={act.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700"
                      >
                        Website
                        <ArrowUpRight size={11} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* SDG Outcomes */}
          {allSdgs.length > 0 && (
            <CollapsibleSection
              id="sdgs"
              icon={<Target size={13} />}
              label={`SDG Outcomes (${allSdgs.length})`}
              isOpen={openSections.has("sdgs")}
              onToggle={toggleSection}
            >
              <div className="space-y-1">
                {[...allSdgs]
                  .sort(
                    (a, b) => parseInt(a.code, 10) - parseInt(b.code, 10)
                  )
                  .map((sdg) => (
                    <div
                      key={sdg.code}
                      className="flex items-center gap-2 bg-gray-50 px-3 py-2"
                    >
                      <span
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white flex-shrink-0"
                        style={{
                          backgroundColor:
                            SDG_COLORS[sdg.code] || "#6B7280",
                        }}
                      >
                        {sdg.code}
                      </span>
                      <span className="text-xs text-gray-700">
                        {sdg.title}
                      </span>
                    </div>
                  ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Certifications */}
          {allCerts.length > 0 && (
            <CollapsibleSection
              id="certs"
              icon={<Certificate size={13} />}
              label={`Certifications (${allCerts.length})`}
              isOpen={openSections.has("certs")}
              onToggle={toggleSection}
            >
              <div className="space-y-2">
                {allCerts.map((cert) => (
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

          {/* Verification & Proofs */}
          {allProofs.length > 0 && (
            <CollapsibleSection
              id="proofs"
              icon={<ShieldCheck size={13} />}
              label={`Verification (${allProofs.length})`}
              isOpen={openSections.has("proofs")}
              onToggle={toggleSection}
            >
              <div className="space-y-1.5">
                {allProofs.map((proof) => {
                  const period = group
                    .flatMap((a) => a.periods ?? [])
                    .find((p) => p.proof_id === proof.id);
                  const periodDate = period
                    ? new Date(period.date).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })
                    : proof.minted_at
                    ? new Date(proof.minted_at).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })
                    : null;

                  return (
                    <a
                      key={proof.id}
                      href={proof.proof_explorer_link || proof.proof_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-emerald-50 transition-colors group"
                    >
                      <ProtocolIcon
                        protocolId={proof.protocol.id}
                        protocolName={proof.protocol.name}
                        size={18}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-900">
                          {proof.protocol.name}
                        </div>
                        {periodDate && (
                          <div className="text-[10px] text-gray-400">
                            {periodDate}
                          </div>
                        )}
                      </div>
                      <ArrowRight
                        size={12}
                        className="text-gray-300 group-hover:text-emerald-500 flex-shrink-0"
                      />
                    </a>
                  );
                })}
              </div>
            </CollapsibleSection>
          )}

          {/* Chain / Platform */}
          {platform && (
            <CollapsibleSection
              id="chain"
              icon={<Globe size={13} />}
              label="Chain"
              isOpen={openSections.has("chain")}
              onToggle={toggleSection}
            >
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50">
                <img
                  src={platform.image.thumb}
                  alt=""
                  className="w-4 h-4 rounded-full"
                />
                <span className="text-xs font-medium text-gray-700">
                  {platform.name}
                </span>
              </div>
            </CollapsibleSection>
          )}
        </div>

      </div>

      {/* ── Bottom pinned: external links ── */}
      {action.actors[0]?.website && (
        <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 flex gap-2 bg-cardBackground">
          <a
            href={action.actors[0].website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] py-2 border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Learn More
            <ArrowUpRight size={11} />
          </a>
          {allProofs[0]?.proof_explorer_link && (
            <a
              href={allProofs[0].proof_explorer_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] py-2 bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors"
            >
              View Proof
              <ArrowUpRight size={11} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
