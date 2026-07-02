import { useState, useMemo } from "react";
import { CaretDown, CaretRight } from "@phosphor-icons/react";
import type { VerifiableProvenance, GapAnalysisProtocol, ProtocolMethodologySummary } from "../modules/intelligence/types";
import { MethodologyTraceCard } from "./MethodologyTraceCard";
import {
  formatUSD,
  formatNumber,
  formatGap,
  PROTOCOL_LABELS,
  PROTOCOL_COLORS,
  PROTOCOL_ITEM_NOUNS,
  MECHANISM_LABELS,
  TIER_STYLES,
} from "./formatUtils";

interface Props {
  protocol: string;
  provenances: VerifiableProvenance[];
  gapData?: GapAnalysisProtocol;
  methodologySummary?: ProtocolMethodologySummary;
}

function ProvenanceRow({ provenance, isAggregate }: { provenance: VerifiableProvenance; isAggregate?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const trace = provenance.valuation.methodologyTrace;

  // Compact value summary for the collapsed row
  const valueLine = `${formatUSD(provenance.valuation.totalValue.low)} – ${formatUSD(provenance.valuation.totalValue.high)}`;

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Row 1: Name + expand caret */}
        <div className="flex items-start gap-2">
          <div className="mt-0.5 flex-shrink-0">
            {trace ? (
              expanded ? <CaretDown size={12} className="text-gray-400" /> : <CaretRight size={12} className="text-gray-400" />
            ) : (
              <div className="w-3" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-800 leading-snug">
              {isAggregate && <span className="text-primary-500 mr-1">&#9670;</span>}
              {provenance.asset.name}
            </div>

            {/* Row 2: Metrics + value */}
            <div className="flex items-baseline gap-2 mt-0.5 text-xs text-gray-500">
              <span>
                {provenance.impact.metrics.climate && `${formatNumber(provenance.impact.metrics.climate.tCO2e)} tCO2e`}
                {provenance.impact.metrics.biodiversity && `${formatNumber(provenance.impact.metrics.biodiversity.hectares)} ha`}
                {provenance.impact.metrics.energy && `${formatNumber(provenance.impact.metrics.energy.mwhGenerated)} MWh`}
                {provenance.impact.metrics.marine && `${formatNumber(provenance.impact.metrics.marine.hectares)} ha`}
              </span>
              <span className="text-gray-300">·</span>
              <span className="font-medium text-gray-600">{valueLine}</span>
              {provenance.valuation.gapFactor && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-amber-600 font-medium">
                    {formatGap(provenance.valuation.gapFactor.low, provenance.valuation.gapFactor.high)}
                  </span>
                </>
              )}
            </div>

            {/* Row 3: Formula (from methodology trace) — always visible */}
            {trace && (
              <div className="mt-1 font-mono text-[11px] text-gray-400 leading-tight">
                {trace.formula}
              </div>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 ml-5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-3">
            <div>
              <span className="text-gray-400">Mechanism</span>
              <div className="font-medium text-gray-700">
                {MECHANISM_LABELS[provenance.asset.mechanismType ?? ""] ?? provenance.asset.mechanismType ?? "—"}
              </div>
            </div>
            <div>
              <span className="text-gray-400">Methodology</span>
              <div className="font-medium text-gray-700">{provenance.valuation.methodology}</div>
            </div>
            <div>
              <span className="text-gray-400">MRV Status</span>
              <div className="font-medium text-gray-700 capitalize">{provenance.mrv.status}</div>
            </div>
            <div>
              <span className="text-gray-400">Origin</span>
              <div className="font-medium text-gray-700">{provenance.origin.project}</div>
            </div>
          </div>
          {trace && <MethodologyTraceCard trace={trace} />}
        </div>
      )}
    </div>
  );
}

/**
 * For Glow: split the network-level aggregate provenance from individual farm provenances.
 * The aggregate has origin "glow-solar-network" and carries the NPV-scaled gap analysis.
 * Other protocols (Toucan, Regen) don't have this dual-level structure.
 */
function splitGlowAggregate(protocol: string, provenances: VerifiableProvenance[]) {
  if (protocol !== "glow") {
    return { networkAggregate: null, items: provenances };
  }
  const networkAggregate = provenances.find(
    (p) => p.origin.project === "glow-solar-network"
  ) ?? null;
  const items = networkAggregate
    ? provenances.filter((p) => p !== networkAggregate)
    : provenances;
  return { networkAggregate, items };
}

/** Build a human-readable formula summary for the panel header */
function protocolFormulaSummary(protocol: string, networkAggregate: VerifiableProvenance | null): string | null {
  if (protocol === "glow" && networkAggregate) {
    return "MWh × grid_factor × SCC × NPV(3%, 30yr)";
  }
  if (protocol === "toucan") {
    return "tCO2e × SCC ($51–$190/tCO2e, EPA 2024)";
  }
  if (protocol === "regen-network") {
    return "quantity × methodology-specific rate (project or TEEB biome)";
  }
  return null;
}

export function ProtocolPanel({ protocol, provenances, gapData, methodologySummary }: Props) {
  const label = PROTOCOL_LABELS[protocol] ?? protocol;
  const color = PROTOCOL_COLORS[protocol] ?? "#6b7280";
  const nouns = PROTOCOL_ITEM_NOUNS[protocol] ?? { singular: "item", plural: "items" };
  const dominantTier = methodologySummary?.dominantTier ?? "category-default";
  const tierStyle = TIER_STYLES[dominantTier];

  // For Glow: separate network aggregate from individual farms
  const { networkAggregate, items } = useMemo(
    () => splitGlowAggregate(protocol, provenances),
    [protocol, provenances]
  );

  // Header metrics: use network aggregate for Glow, sum for others
  const headerServiceLow = networkAggregate
    ? networkAggregate.valuation.totalValue.low
    : provenances.reduce((s, p) => s + p.valuation.totalValue.low, 0);
  const headerServiceHigh = networkAggregate
    ? networkAggregate.valuation.totalValue.high
    : provenances.reduce((s, p) => s + p.valuation.totalValue.high, 0);

  const marketValue = gapData?.marketValueUSD ?? null;
  const gapLabel = gapData?.gapFactor
    ? formatGap(gapData.gapFactor.low, gapData.gapFactor.high)
    : null;

  // Item count: for Glow, use the real farm count from the aggregate
  const realItemCount = networkAggregate?.impact.metrics.energy?.farmCount ?? items.length;
  const displayedCount = items.length;
  const isTruncated = realItemCount > displayedCount;

  const formulaSummary = protocolFormulaSummary(protocol, networkAggregate);

  return (
    <div className="bg-white border border-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <span className="text-lg font-bold text-gray-800">{label}</span>
          <span className={`${tierStyle.bg} ${tierStyle.text} text-[10px] px-2 py-0.5 rounded-full font-medium ml-auto`}>
            {tierStyle.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <div className="text-gray-400 text-xs mb-0.5">Service Value</div>
            <div className="font-bold text-gray-800 text-base">
              {formatUSD(headerServiceLow)} – {formatUSD(headerServiceHigh)}
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-xs mb-0.5 capitalize">
              {realItemCount === 1 ? nouns.singular : nouns.plural}
            </div>
            <div className="font-bold text-gray-800 text-base">
              {realItemCount.toLocaleString()}
              {isTruncated && (
                <span className="text-xs text-gray-400 font-normal ml-1">
                  ({displayedCount} shown)
                </span>
              )}
            </div>
          </div>
          {marketValue != null && marketValue > 0 && (
            <div>
              <div className="text-gray-400 text-xs mb-0.5">Market Value</div>
              <div className="font-bold text-gray-800">{formatUSD(marketValue)}</div>
            </div>
          )}
          {gapLabel && (
            <div>
              <div className="text-gray-400 text-xs mb-0.5">Gap Factor</div>
              <div className="font-bold text-amber-600">{gapLabel}</div>
            </div>
          )}
        </div>

        {/* Valuation formula */}
        {formulaSummary && (
          <div className="mt-3 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
            <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Valuation</div>
            <div className="font-mono text-xs text-gray-600">{formulaSummary}</div>
          </div>
        )}
      </div>

      {/* Provenance list */}
      <div className="flex-1 overflow-y-auto max-h-[420px]">
        {networkAggregate && (
          <ProvenanceRow provenance={networkAggregate} isAggregate />
        )}
        {items.map((p, i) => (
          <ProvenanceRow key={p.pieceCid ?? i} provenance={p} />
        ))}
      </div>

      {/* Methodology summary footer */}
      {methodologySummary && (
        <div className="px-4 py-2.5 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
          <div className="flex gap-3 flex-wrap">
            {methodologySummary.tierCounts["project-specific"] > 0 && (
              <span className="text-green-600">
                {methodologySummary.tierCounts["project-specific"]} project-specific
              </span>
            )}
            {methodologySummary.tierCounts["biome-specific"] > 0 && (
              <span className="text-blue-600">
                {methodologySummary.tierCounts["biome-specific"]} biome-level
              </span>
            )}
            {methodologySummary.tierCounts["category-default"] > 0 && (
              <span className="text-gray-500">
                {methodologySummary.tierCounts["category-default"]} global estimate
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
