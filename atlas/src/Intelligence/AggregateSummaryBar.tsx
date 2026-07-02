import { Database } from "@phosphor-icons/react";
import type { GapAnalysis, ProtocolMethodologySummary } from "../modules/intelligence/types";
import { formatUSD } from "./formatUtils";

interface Props {
  totalValueUSD: { low: number; high: number };
  provenanceCount: number;
  gapAnalysis?: GapAnalysis;
  methodologySummary?: Record<string, ProtocolMethodologySummary>;
}

export function AggregateSummaryBar({
  totalValueUSD,
  provenanceCount,
  gapAnalysis,
  methodologySummary,
}: Props) {
  // Compute methodology coverage percentages
  let projectSpecific = 0;
  let biomeSpecific = 0;
  let categoryDefault = 0;
  if (methodologySummary) {
    for (const s of Object.values(methodologySummary)) {
      projectSpecific += s.tierCounts["project-specific"];
      biomeSpecific += s.tierCounts["biome-specific"];
      categoryDefault += s.tierCounts["category-default"];
    }
  }
  const total = projectSpecific + biomeSpecific + categoryDefault;
  const psPct = total > 0 ? Math.round((projectSpecific / total) * 100) : 0;
  const bsPct = total > 0 ? Math.round((biomeSpecific / total) * 100) : 0;
  const cdPct = total > 0 ? Math.round((categoryDefault / total) * 100) : 0;

  return (
    <div className="bg-gradient-to-r from-primary-400/10 to-green-900/10 border border-primary-400/20 shadow-sm px-5 py-3 mb-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <Database size={18} className="text-primary-400" />
          <div>
            <div className="text-xs text-gray-500">Ecosystem Service Value</div>
            <div className="font-bold text-gray-800">
              {formatUSD(totalValueUSD.low)} - {formatUSD(totalValueUSD.high)}
              <span className="text-xs text-gray-400 font-normal ml-1">USD/yr</span>
            </div>
          </div>
        </div>

        {gapAnalysis && gapAnalysis.totalMarketValueUSD > 0 && (
          <div>
            <div className="text-xs text-gray-500">Market Value</div>
            <div className="font-bold text-gray-800">
              {formatUSD(gapAnalysis.totalMarketValueUSD)}
            </div>
          </div>
        )}

        {gapAnalysis?.aggregateGap && (
          <div>
            <div className="text-xs text-gray-500">Gap Factor</div>
            <div className="font-bold text-amber-600">
              {gapAnalysis.aggregateGap.low}x - {gapAnalysis.aggregateGap.high}x
            </div>
          </div>
        )}

        {gapAnalysis && (
          <div>
            <div className="text-xs text-gray-500">Priced / Total</div>
            <div className="font-bold text-gray-800">
              {gapAnalysis.pricedCount} / {provenanceCount}
            </div>
          </div>
        )}

        {total > 0 && (
          <div className="ml-auto">
            <div className="text-xs text-gray-500 mb-0.5">Valuation Precision</div>
            <div className="flex items-center gap-2 text-xs">
              {psPct > 0 && <span className="text-green-600 font-medium">{psPct}% project-specific</span>}
              {bsPct > 0 && <span className="text-blue-600 font-medium">{bsPct}% biome-level</span>}
              {cdPct > 0 && <span className="text-gray-500 font-medium">{cdPct}% global estimates</span>}
            </div>
          </div>
        )}
      </div>
      <div className="mt-2 pt-2 border-t border-gray-200/50 text-[10px] text-gray-400 leading-relaxed">
        Market data: <a href="https://www.coingecko.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-500">CoinGecko</a>, <a href="https://dexscreener.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-500">DexScreener</a>, Regen Network marketplace. Valuations: EPA SCC 2024, TEEB/Costanza 2014. Gap factors are ratios between scientific reference values and market prices — not investment recommendations.
      </div>
    </div>
  );
}
