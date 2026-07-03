import {
  ArrowRight,
  ArrowsLeftRight,
  Bank,
  Coffee,
  Cpu,
  Flower,
  Plant,
  Storefront,
  Users,
} from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import type { AqueductActor, AqueductAnyLot, AqueductIntent } from "../hooks/useAqueductEconomy";
import { ProvenanceChip } from "./Chips";

const COMMODITY_ICONS = { coffee: Coffee, cacao: Plant, honey: Flower } as const;

/** Section colors — siblings of ENTITY_COLORS, one hue per Aqueduct section. */
export const AQUEDUCT_SECTION_COLORS = {
  lot: "#b45309",
  intent: "#4f46e5",
  actor: "#9333ea",
} as const;

// ── Lot card — the AssetExploreCard idiom: color spine, avatar, chip row ──

export function LotExploreCard({
  lot,
  onLocate,
}: {
  lot: AqueductAnyLot;
  onLocate: () => void;
}) {
  const color = AQUEDUCT_SECTION_COLORS.lot;
  const origin = [lot.origin.region, lot.origin.country].filter(Boolean).join(", ");
  const CommodityIcon = COMMODITY_ICONS[lot.commodity ?? "coffee"];
  return (
    <div
      className="group bg-cardBackground border border-gray-100 hover:border-gray-300 transition-all cursor-pointer overflow-hidden"
      onClick={onLocate}
    >
      <div className="flex">
        <div className="w-1 flex-shrink-0" style={{ backgroundColor: color }} />
        <div className="flex items-center pl-2.5 py-2.5">
          {lot.image ? (
            <div
              className="w-10 h-10 bg-cover bg-center flex-shrink-0"
              style={{ backgroundImage: `url(${lot.image})` }}
            />
          ) : (
            <div
              className="w-10 h-10 flex-shrink-0 flex items-center justify-center"
              style={{ backgroundColor: `${color}18` }}
            >
              <CommodityIcon size={16} style={{ color }} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 px-2.5 py-2.5">
          <div className="flex items-center justify-between gap-1.5 mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <ProvenanceChip
                provenance={lot.provenance ?? "SNAPSHOT"}
                dated={lot.provenance === "SNAPSHOT" ? lot.source?.fetched_at : undefined}
              />
              {lot.quality.sca_score != null && (
                <span className="text-[11px] text-gray-500 whitespace-nowrap">{lot.quality.sca_score} SCA</span>
              )}
            </div>
            {lot.price && (
              <span className="text-[11px] font-semibold text-gray-700 aq-mono whitespace-nowrap">
                {lot.price.amount} {lot.price.currency}/{lot.price.unit}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-gray-900 truncate">{lot.title_redacted}</h4>
            <Link
              to={`/lots/${lot.aqueduct_id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex-shrink-0 text-gray-300 hover:text-gray-600 transition-colors"
            >
              <ArrowRight size={14} />
            </Link>
          </div>
          <p className="text-[11px] text-gray-500 truncate">{origin || "—"}</p>
        </div>
      </div>
    </div>
  );
}

// ── Intent card ──

export function IntentExploreCard({
  intent,
  onLocate,
}: {
  intent: AqueductIntent;
  onLocate: () => void;
}) {
  const color = AQUEDUCT_SECTION_COLORS.intent;
  return (
    <div
      className="group bg-cardBackground border border-gray-100 hover:border-gray-300 transition-all cursor-pointer overflow-hidden"
      onClick={onLocate}
    >
      <div className="flex">
        <div className="w-1 flex-shrink-0" style={{ backgroundColor: color }} />
        <div className="flex items-center pl-2.5 py-2.5">
          <div
            className="w-10 h-10 flex-shrink-0 flex items-center justify-center"
            style={{ backgroundColor: `${color}18` }}
          >
            <ArrowsLeftRight size={16} style={{ color }} />
          </div>
        </div>
        <div className="flex-1 min-w-0 px-2.5 py-2.5">
          <div className="flex items-center gap-1.5 mb-0.5">
            <ProvenanceChip provenance={intent.provenance} />
            <span className="text-[11px] text-gray-500 whitespace-nowrap">
              {intent.intentType === "sell-this-lot" ? "sell" : "finance"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-gray-900 truncate">{intent.title}</h4>
            {intent.lotId && (
              <Link
                to={`/lots/${intent.lotId}`}
                onClick={(e) => e.stopPropagation()}
                className="flex-shrink-0 text-gray-300 hover:text-gray-600 transition-colors"
              >
                <ArrowRight size={14} />
              </Link>
            )}
          </div>
          <p className="text-[11px] text-gray-500 truncate">{intent.detail}</p>
        </div>
      </div>
    </div>
  );
}

// ── Solver / venue / infrastructure card ──

const ACTOR_ICONS = {
  solver: Cpu,
  venue: Storefront,
  infrastructure: Bank,
  coop: Users,
} as const;

export function ActorExploreCard({
  actor,
  onLocate,
  href,
}: {
  actor: AqueductActor;
  onLocate?: () => void;
  href?: string;
}) {
  const color = AQUEDUCT_SECTION_COLORS.actor;
  const Icon = ACTOR_ICONS[actor.kind];
  return (
    <div
      className={`bg-cardBackground border border-gray-100 hover:border-gray-300 transition-all overflow-hidden ${onLocate || href ? "cursor-pointer" : ""}`}
      onClick={onLocate}
    >
      <div className="flex">
        <div className="w-1 flex-shrink-0" style={{ backgroundColor: color }} />
        <div className="flex items-center pl-2.5 py-2.5">
          <div
            className="w-10 h-10 flex-shrink-0 flex items-center justify-center"
            style={{ backgroundColor: `${color}18` }}
          >
            <Icon size={16} style={{ color }} />
          </div>
        </div>
        <div className="flex-1 min-w-0 px-2.5 py-2.5">
          <div className="flex items-center gap-1.5 mb-0.5">
            <ProvenanceChip provenance={actor.provenance} />
            <span className="text-[11px] text-gray-500 whitespace-nowrap capitalize">{actor.kind}</span>
            {actor.winRatePct != null && (
              <span className="text-[11px] text-gray-500 whitespace-nowrap">~{actor.winRatePct}% win rate</span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-gray-900 truncate">{actor.name}</h4>
            {href && (
              <Link
                to={href}
                onClick={(e) => e.stopPropagation()}
                className="flex-shrink-0 text-gray-300 hover:text-gray-600 transition-colors"
              >
                <ArrowRight size={14} />
              </Link>
            )}
          </div>
          <p className="text-[11px] text-gray-500 truncate">{actor.role}</p>
        </div>
      </div>
    </div>
  );
}
