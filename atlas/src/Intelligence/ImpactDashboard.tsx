import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Database,
  CircleNotch,
  CheckCircle,
  Warning,
  CloudArrowUp,
  LinkSimple,
  CaretDown,
  CaretRight,
  ChartLine,
  TreeStructure,
  Leaf,
  Scales,
  CurrencyDollar,
  Coins,
  Funnel,
  Crosshair,
} from "@phosphor-icons/react";
import Header from "../Header";
import Footer from "../Footer";
import { useProvenance } from "../modules/filecoin";
import type { IngestProgress } from "../modules/filecoin";
import type { VerifiableProvenance, SourceProtocol } from "../modules/intelligence/types";
import { useNewFiltersState } from "../context/filters";
import { useMarketData } from "./market";
import { CATEGORY_COLORS, ALL_CATEGORIES } from "./market/consts";
import { formatUSD, PROTOCOL_LABELS, PROTOCOL_COLORS } from "./formatUtils";
import { MarketCapChart } from "./MarketCapChart";
import { AssetRankingTable } from "./AssetRankingTable";
import { ProtocolGapChart, AssetActionChart, ActionProtocolsChart } from "./GapChart";
import { ProtocolPanel } from "./ProtocolPanel";

const PROTOCOL_ORDER: SourceProtocol[] = ["toucan", "regen-network", "glow", "hedera", "atlantis", "silvi"];
const ASSET_PROTOCOLS: SourceProtocol[] = ["toucan", "regen-network", "glow"];
const ACTION_PROTOCOLS: SourceProtocol[] = ["hedera", "atlantis", "silvi"];

type Section = "intelligence" | "markets" | "pipeline";

const NAV_ITEMS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "intelligence", label: "Intelligence", icon: TreeStructure },
  { id: "markets", label: "Markets", icon: ChartLine },
  { id: "pipeline", label: "Pipeline", icon: Funnel },
];

function ProgressIndicator({ progress }: { progress: IngestProgress[] }) {
  return (
    <div className="flex flex-col gap-2">
      {progress.map((p) => (
        <div key={p.source} className="flex items-center gap-3">
          {p.status === "fetching" || p.status === "composing" ? (
            <CircleNotch size={18} className="animate-spin text-primary-300" />
          ) : p.status === "done" ? (
            <CheckCircle size={18} className="text-green-400" />
          ) : p.status === "error" ? (
            <Warning size={18} className="text-red-400" />
          ) : (
            <div className="w-[18px] h-[18px] rounded-full border border-gray-500" />
          )}
          <span className="text-sm font-medium">{p.source}</span>
          <span className="text-sm text-gray-400">
            {p.status === "fetching"
              ? "Fetching data..."
              : p.status === "composing"
                ? `Composing ${p.count} provenance objects...`
                : p.status === "done"
                  ? `${p.count} objects${p.matched > 0 ? ` (${p.matched} matched to assets)` : ""}`
                  : p.status === "error"
                    ? p.error
                    : "Waiting"}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ImpactDashboard(): React.ReactElement {
  const { allAssets: contextAssets } = useNewFiltersState();
  const market = useMarketData();
  const {
    provenances,
    aggregate,
    ingestProgress,
    matchedAssetIds,
    isIngesting,
    isUploading,
    uploadProgress,
    error,
    ingest,
    uploadToFilecoin,
    restoreCid,
    isFilecoinReady,
    synapseStatus,
    synapseError,
  } = useProvenance();

  const [activeSection, setActiveSection] = useState<Section>("intelligence");
  const [assetMatchExpanded, setAssetMatchExpanded] = useState(false);
  const [marketCapExpanded, setMarketCapExpanded] = useState(false);
  const allAssets = contextAssets ?? [];

  const hasIntelligence = provenances.length > 0;
  const hasGapData = aggregate?.gapAnalysis && aggregate.gapAnalysis.pricedCount > 0;

  // Find the Filecoin CID if provenances have been uploaded (non-local CID)
  const filecoinCid = useMemo(() => {
    for (const p of provenances) {
      if (p.pieceCid && !p.pieceCid.startsWith("local:")) return p.pieceCid;
    }
    return null;
  }, [provenances]);

  const serviceValueLow = aggregate?.totalValueUSD.low ?? 0;
  const serviceValueHigh = aggregate?.totalValueUSD.high ?? 0;
  const gapLow = aggregate?.gapAnalysis?.aggregateGap?.low;
  const gapHigh = aggregate?.gapAnalysis?.aggregateGap?.high;

  // Market cap by category — sorted descending for sidebar display
  const categorySorted = useMemo(() => {
    return ALL_CATEGORIES
      .map((cat) => ({
        name: cat,
        value: market.marketCapByCategory[cat] ?? 0,
        color: CATEGORY_COLORS[cat],
      }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [market.marketCapByCategory]);

  // Methodology precision breakdown for sidebar
  const methodologyPrecision = useMemo(() => {
    if (!aggregate?.methodologySummary) return null;
    let projectSpecific = 0;
    let biomeSpecific = 0;
    let categoryDefault = 0;
    for (const s of Object.values(aggregate.methodologySummary)) {
      projectSpecific += s.tierCounts["project-specific"];
      biomeSpecific += s.tierCounts["biome-specific"];
      categoryDefault += s.tierCounts["category-default"];
    }
    const total = projectSpecific + biomeSpecific + categoryDefault;
    if (total === 0) return null;
    return {
      projectSpecific: Math.round((projectSpecific / total) * 100),
      biomeSpecific: Math.round((biomeSpecific / total) * 100),
      categoryDefault: Math.round((categoryDefault / total) * 100),
    };
  }, [aggregate?.methodologySummary]);

  const byProtocol = useMemo(() => {
    const grouped: Record<string, VerifiableProvenance[]> = {};
    for (const proto of PROTOCOL_ORDER) grouped[proto] = [];
    for (const p of provenances) {
      const proto = p.source.protocol;
      if (!grouped[proto]) grouped[proto] = [];
      grouped[proto].push(p);
    }
    return grouped;
  }, [provenances]);

  // Expanded protocol in accordion (null = all collapsed)
  const [expandedProtocol, setExpandedProtocol] = useState<string | null>(null);

  return (
    <>
      <Header />
      <div className="main-container lg:!px-0">
        <div className="pt-[60px] lg:pt-[36px] lg:grid lg:grid-cols-[240px_1fr]">
          {/* ====== LEFT SIDEBAR ====== */}
          <div className="hidden lg:block border-r border-gray-200 min-h-[calc(100vh-72px)]">
            <div className="sticky top-[36px] px-3 pt-4 pb-6 max-h-[calc(100vh-72px)] overflow-y-auto">
              {/* Nav items */}
              <nav className="flex flex-col gap-0.5">
                {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveSection(id)}
                    className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left w-full cursor-pointer ${
                      activeSection === id
                        ? "bg-primary-400/10 text-primary-500 font-medium"
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                    {id === "intelligence" && hasIntelligence && (
                      <span className="ml-auto bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 font-bold">
                        {provenances.length}
                      </span>
                    )}
                    {id === "pipeline" && hasIntelligence && (
                      <span className="ml-auto bg-primary-400/15 text-primary-500 text-[10px] px-1.5 py-0.5 font-bold">
                        {matchedAssetIds.length}/{allAssets.length}
                      </span>
                    )}
                  </button>
                ))}
              </nav>

              {/* ── Market Cap by Category ── */}
              <div className="mt-5 px-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setMarketCapExpanded((v) => !v)}
                  className="flex items-center gap-1.5 mb-2 w-full cursor-pointer"
                >
                  <Coins size={13} className="text-gray-400" />
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Market Cap</span>
                  {!market.loading && categorySorted.length > 0 && (
                    <CaretDown
                      size={10}
                      className={`text-gray-400 ml-auto transition-transform ${marketCapExpanded ? "rotate-180" : ""}`}
                    />
                  )}
                </button>
                <div className="text-gray-800 font-bold text-base mb-2">
                  {market.loading ? "..." : formatUSD(market.totalMarketCap)}
                </div>
                {marketCapExpanded && !market.loading && categorySorted.length > 0 && (
                  <div className="space-y-1.5">
                    {categorySorted.map((cat) => (
                      <div key={cat.name} className="flex items-center gap-2">
                        <div
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-[11px] text-gray-500 flex-1 truncate">{cat.name}</span>
                        <span className="text-[11px] font-medium text-gray-700">{formatUSD(cat.value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Service Value ── */}
              <div className="mt-4 px-2 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Leaf size={13} className="text-green-500" />
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Service Value</span>
                </div>
                {hasIntelligence ? (
                  <div className="text-green-700 font-bold text-sm">
                    {formatUSD(serviceValueLow)}–{formatUSD(serviceValueHigh)}
                    <span className="text-[10px] text-gray-400 font-normal">/yr</span>
                  </div>
                ) : (
                  <div className="text-gray-300 font-bold text-sm">—</div>
                )}
              </div>

              {/* ── Market Value ── */}
              {aggregate?.gapAnalysis && aggregate.gapAnalysis.totalMarketValueUSD > 0 && (
                <div className="mt-3 px-2 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <CurrencyDollar size={13} className="text-blue-500" />
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Market Value</span>
                  </div>
                  <div className="text-blue-700 font-bold text-sm">
                    {formatUSD(aggregate.gapAnalysis.totalMarketValueUSD)}
                  </div>
                </div>
              )}

              {/* ── Gap Factor ── */}
              <div className="mt-3 px-2 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Scales size={13} className="text-amber-500" />
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Gap Factor</span>
                </div>
                {gapLow != null && gapHigh != null ? (
                  <div className="text-amber-600 font-bold text-sm">
                    {gapLow}x–{gapHigh}x
                  </div>
                ) : (
                  <div className="text-gray-300 font-bold text-sm">—</div>
                )}
              </div>

              {/* ── Priced / Total ── */}
              {aggregate?.gapAnalysis && (
                <div className="mt-3 px-2 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Crosshair size={13} className="text-gray-400" />
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Priced / Total</span>
                  </div>
                  <div className="text-gray-700 font-bold text-sm">
                    {aggregate.gapAnalysis.pricedCount} / {aggregate.provenanceCount}
                  </div>
                </div>
              )}

              {/* ── Valuation Precision ── */}
              {methodologyPrecision && (
                <div className="mt-3 px-2 pt-3 border-t border-gray-100">
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Precision</div>
                  <div className="space-y-1">
                    {methodologyPrecision.projectSpecific > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                        <span className="text-[11px] text-gray-500 flex-1">Project-specific</span>
                        <span className="text-[11px] font-medium text-green-600">{methodologyPrecision.projectSpecific}%</span>
                      </div>
                    )}
                    {methodologyPrecision.biomeSpecific > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                        <span className="text-[11px] text-gray-500 flex-1">Biome-level</span>
                        <span className="text-[11px] font-medium text-blue-600">{methodologyPrecision.biomeSpecific}%</span>
                      </div>
                    )}
                    {methodologyPrecision.categoryDefault > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                        <span className="text-[11px] text-gray-500 flex-1">Global estimate</span>
                        <span className="text-[11px] font-medium text-gray-500">{methodologyPrecision.categoryDefault}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-4 px-2 text-[10px] text-gray-400/60 leading-relaxed">
                Market data: CoinGecko, DexScreener.
                <br />
                Valuations: EPA SCC, TEEB.
              </div>
            </div>
          </div>

          {/* ====== RIGHT CONTENT ====== */}
          <div className="pb-12 lg:pb-[52px] px-1 lg:px-6 overflow-y-auto">
            {/* Mobile section selector */}
            <div className="lg:hidden mb-4 pt-4">
              <div className="flex gap-1 overflow-x-auto pb-2">
                {NAV_ITEMS.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setActiveSection(id)}
                    className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                      activeSection === id
                        ? "bg-primary-400 text-white"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Market error banner */}
            {market.error && (
              <div className="bg-amber-50 border border-amber-200 p-3 mb-5 text-amber-700 text-sm">
                <Warning size={16} className="inline mr-1.5" />
                Market data unavailable: {market.error}
              </div>
            )}

            {/* ====== INTELLIGENCE ====== */}
            {activeSection === "intelligence" && (
              <>
                <h2 className="text-lg font-bold mb-1">Intelligence</h2>
                <p className="text-sm text-gray-400 mb-5">
                  Cross-protocol ecosystem service analysis with verifiable provenance.
                </p>

                {/* Gap charts — first-class content */}
                {hasGapData && (
                  <div className="grid md:grid-cols-2 gap-3 mb-5">
                    <ProtocolGapChart gap={aggregate!.gapAnalysis!} />
                    <ActionProtocolsChart gap={aggregate!.gapAnalysis!} />
                  </div>
                )}
                {hasGapData && (
                  <div className="mb-5">
                    <AssetActionChart gap={aggregate!.gapAnalysis!} />
                  </div>
                )}

                {/* Split tables: Asset Protocols + Action Protocols */}
                {hasIntelligence ? (
                  <>
                  {/* Asset Protocols — tradable tokens with market prices */}
                  <div className="mb-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Asset Protocols</h3>
                    <div className="bg-white border border-gray-200 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50/80">
                            <th className="text-left px-4 py-2.5 font-semibold text-gray-500 uppercase tracking-wider">Protocol</th>
                            <th className="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider">Objects</th>
                            <th className="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider">Service Value</th>
                            <th className="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider">Market Value</th>
                            <th className="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider">Gap Factor</th>
                            <th className="w-8 px-2" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {ASSET_PROTOCOLS.map((proto) => {
                            const protoProvenances = byProtocol[proto] ?? [];
                            if (protoProvenances.length === 0) return null;
                            const gap = aggregate?.gapAnalysis?.byProtocol[proto];
                            const isExpanded = expandedProtocol === proto;
                            return (
                              <tr
                                key={proto}
                                onClick={() => setExpandedProtocol(isExpanded ? null : proto)}
                                className="cursor-pointer transition-colors hover:bg-gray-50"
                              >
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PROTOCOL_COLORS[proto] }} />
                                    <span className="font-medium text-gray-800 text-sm">{PROTOCOL_LABELS[proto] ?? proto}</span>
                                  </div>
                                </td>
                                <td className="text-right px-3 py-3 tabular-nums text-gray-600">{protoProvenances.length}</td>
                                <td className="text-right px-3 py-3 tabular-nums font-medium text-gray-800">
                                  {gap ? `${formatUSD(gap.serviceValueUSD.low)}–${formatUSD(gap.serviceValueUSD.high)}` : "—"}
                                </td>
                                <td className="text-right px-3 py-3 tabular-nums text-gray-600">
                                  {gap?.marketValueUSD ? formatUSD(gap.marketValueUSD) : "—"}
                                </td>
                                <td className="text-right px-3 py-3 tabular-nums">
                                  {gap?.gapFactor ? (
                                    <span className="font-medium text-amber-600">{gap.gapFactor.low}x–{gap.gapFactor.high}x</span>
                                  ) : "—"}
                                </td>
                                <td className="px-2 py-3">
                                  {isExpanded
                                    ? <CaretDown size={12} className="text-gray-400" />
                                    : <CaretRight size={12} className="text-gray-400" />
                                  }
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {expandedProtocol && ASSET_PROTOCOLS.includes(expandedProtocol as typeof ASSET_PROTOCOLS[number]) && (byProtocol[expandedProtocol] ?? []).length > 0 && (
                        <div className="border-t border-gray-200 px-4 py-4 bg-gray-50/50">
                          <ProtocolPanel
                            protocol={expandedProtocol}
                            provenances={byProtocol[expandedProtocol]}
                            gapData={aggregate?.gapAnalysis?.byProtocol[expandedProtocol]}
                            methodologySummary={aggregate?.methodologySummary?.[expandedProtocol]}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Protocols — verified environmental actions (no market price) */}
                  {ACTION_PROTOCOLS.some((p) => (byProtocol[p] ?? []).length > 0) && (
                    <div className="mb-5">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Action Protocols</h3>
                      <div className="bg-white border border-gray-200 overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-200 bg-gray-50/80">
                              <th className="text-left px-4 py-2.5 font-semibold text-gray-500 uppercase tracking-wider">Protocol</th>
                              <th className="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                              <th className="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider">tCO2e</th>
                              <th className="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider">Service Value</th>
                              <th className="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider">Bioregions</th>
                              <th className="w-8 px-2" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {ACTION_PROTOCOLS.map((proto) => {
                              const provs = byProtocol[proto] ?? [];
                              if (provs.length === 0) return null;
                              const gap = aggregate?.gapAnalysis?.byProtocol[proto];
                              const totalTCO2e = provs.reduce((sum, p) => sum + (p.impact.metrics.climate?.tCO2e ?? 0), 0);
                              const bioregions = new Set(
                                provs
                                  .map((p) => p.origin.location?.jurisdiction)
                                  .filter((j): j is string => !!j && j !== "Unknown")
                              );
                              const isExpanded = expandedProtocol === proto;
                              const isHedera = proto === "hedera";
                              return (
                                <tr
                                  key={proto}
                                  onClick={() => setExpandedProtocol(isExpanded ? null : proto)}
                                  className={`cursor-pointer transition-colors ${isHedera ? "bg-purple-50/40 hover:bg-purple-50/70" : "hover:bg-gray-50"}`}
                                >
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PROTOCOL_COLORS[proto] }} />
                                      <span className="font-medium text-gray-800 text-sm">{PROTOCOL_LABELS[proto] ?? proto}</span>
                                      {isHedera && (
                                        <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 rounded">New</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="text-right px-3 py-3 tabular-nums text-gray-600">{provs.length}</td>
                                  <td className="text-right px-3 py-3 tabular-nums font-medium text-gray-800">
                                    {totalTCO2e > 0 ? totalTCO2e.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}
                                  </td>
                                  <td className="text-right px-3 py-3 tabular-nums font-medium text-gray-800">
                                    {gap ? `${formatUSD(gap.serviceValueUSD.low)}–${formatUSD(gap.serviceValueUSD.high)}` : "—"}
                                  </td>
                                  <td className="text-right px-3 py-3 tabular-nums text-gray-600">{bioregions.size}</td>
                                  <td className="px-2 py-3">
                                    {isExpanded
                                      ? <CaretDown size={12} className="text-gray-400" />
                                      : <CaretRight size={12} className="text-gray-400" />
                                    }
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {expandedProtocol && ACTION_PROTOCOLS.includes(expandedProtocol as typeof ACTION_PROTOCOLS[number]) && (byProtocol[expandedProtocol] ?? []).length > 0 && (
                          <div className="border-t border-gray-200 px-4 py-4 bg-gray-50/50">
                            <ProtocolPanel
                              protocol={expandedProtocol}
                              provenances={byProtocol[expandedProtocol]}
                              gapData={aggregate?.gapAnalysis?.byProtocol[expandedProtocol]}
                              methodologySummary={aggregate?.methodologySummary?.[expandedProtocol]}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  </>
                ) : (
                  <div className="bg-white border border-gray-200 shadow-sm p-8 text-center">
                    <Database size={32} className="text-gray-300 mx-auto mb-3" />
                    <h3 className="text-base font-bold mb-1">
                      No provenance data yet
                    </h3>
                    <p className="text-sm text-gray-400 max-w-sm mx-auto mb-4">
                      Load impact data from source protocols to see gap analysis
                      and provenance details.
                    </p>
                    <button
                      className="button button-gradient px-6"
                      onClick={() => {
                        ingest(allAssets);
                        setActiveSection("pipeline");
                      }}
                      disabled={isIngesting}
                    >
                      <span className="flex items-center gap-2">
                        <Database size={16} />
                        Load Impact Intelligence
                      </span>
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ====== MARKETS (merged chart + table) ====== */}
            {activeSection === "markets" && (
              <>
                <h2 className="text-lg font-bold mb-4">Markets</h2>
                {!market.loading && market.tokens.length > 0 ? (
                  <>
                    <MarketCapChart
                      timeSeriesByCategory={market.timeSeriesByCategory}
                      marketCapByCategory={market.marketCapByCategory}
                      timeRange={market.timeRange}
                      onTimeRangeChange={market.setTimeRange}
                      totalMarketCap={market.totalMarketCap}
                    />
                    <div className="mt-5">
                      <AssetRankingTable
                        tokens={market.tokens}
                        gapAnalysis={aggregate?.gapAnalysis}
                      />
                    </div>
                  </>
                ) : market.loading ? (
                  <div className="bg-white border border-gray-200 shadow-sm p-8 text-center">
                    <CircleNotch size={24} className="animate-spin text-primary-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Loading market data...</p>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 shadow-sm p-8 text-center">
                    <Warning size={24} className="text-amber-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      Market data could not be loaded.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* ====== PIPELINE ====== */}
            {activeSection === "pipeline" && (
              <>
                <h2 className="text-lg font-bold mb-1">Pipeline</h2>
                <p className="text-sm text-gray-400 mb-5">
                  Ingest impact data from source protocols, match to Regen Atlas assets,
                  and archive to Filecoin.
                </p>

                {/* Controls */}
                <div className="flex gap-2 flex-wrap items-center mb-5">
                  <button
                    className="button button-gradient px-6"
                    onClick={() => ingest(allAssets)}
                    disabled={isIngesting}
                  >
                    {isIngesting ? (
                      <span className="flex items-center gap-2">
                        <CircleNotch size={16} className="animate-spin" />
                        Ingesting...
                      </span>
                    ) : hasIntelligence ? (
                      "Refresh Intelligence"
                    ) : (
                      <span className="flex items-center gap-2">
                        <Database size={16} />
                        Load Impact Intelligence
                      </span>
                    )}
                  </button>
                  {hasIntelligence && (
                    <button
                      className={`button px-6 flex items-center gap-2 ${
                        !isFilecoinReady || synapseStatus === "connecting" || synapseStatus === "approving" || synapseStatus === "depositing"
                          ? "!bg-gray-400 cursor-not-allowed opacity-60"
                          : "!bg-blue-700 hover:!bg-blue-600"
                      }`}
                      onClick={uploadToFilecoin}
                      disabled={isUploading || !isFilecoinReady || synapseStatus === "connecting" || synapseStatus === "approving" || synapseStatus === "depositing"}
                      title={
                        !isFilecoinReady
                          ? "Connect wallet to Filecoin Calibration"
                          : undefined
                      }
                    >
                      <CloudArrowUp size={18} />
                      {!isFilecoinReady
                        ? "Connect Wallet First"
                        : synapseStatus === "connecting" || synapseStatus === "approving" || synapseStatus === "depositing"
                          ? "Setting up..."
                          : isUploading
                            ? `Uploading ${uploadProgress?.uploaded}/${uploadProgress?.total}...`
                            : "Upload to Filecoin"}
                    </button>
                  )}
                  {hasIntelligence && !filecoinCid && (
                    <button
                      className="button !bg-gray-600 hover:!bg-gray-500 px-4 flex items-center gap-2 text-sm"
                      onClick={() => restoreCid("bafkzcibe7onr2eecyla3n3dxe62o3uu5osjf7kldf5xm5szruc4nrazsxw6zjlrfcy")}
                    >
                      <LinkSimple size={16} />
                      Restore Last CID
                    </button>
                  )}
                </div>

                {/* Synapse connection status */}
                {(synapseStatus === "connecting" || synapseStatus === "approving" || synapseStatus === "depositing") && (
                  <div className="bg-blue-50 border border-blue-200 p-3 mb-5 text-blue-700 text-sm flex items-center gap-2">
                    <CircleNotch size={16} className="animate-spin" />
                    {synapseStatus === "connecting" && "Connecting to Synapse SDK..."}
                    {synapseStatus === "approving" && "Approving Warm Storage service — confirm in wallet..."}
                    {synapseStatus === "depositing" && "Depositing USDFC for storage — confirm in wallet..."}
                  </div>
                )}

                {/* Synapse / ingestion errors */}
                {(error || synapseError) && (
                  <div className="bg-red-50 border border-red-200 p-3 mb-5 text-red-700 text-sm">
                    {error || synapseError}
                  </div>
                )}

                {/* Progress */}
                {isIngesting && ingestProgress.length > 0 && (
                  <div className="bg-white border border-gray-200 shadow-sm p-4 mb-5">
                    <h3 className="font-bold text-sm mb-2">Data Ingestion</h3>
                    <ProgressIndicator progress={ingestProgress} />
                  </div>
                )}

                {/* Asset matching */}
                {aggregate && matchedAssetIds.length > 0 && (
                  <div className="bg-white border border-gray-200 shadow-sm mb-5 overflow-hidden">
                    <button
                      className="w-full text-left px-4 py-3 flex items-center gap-2 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setAssetMatchExpanded(!assetMatchExpanded)}
                    >
                      <LinkSimple size={16} className="text-primary-300" />
                      <span className="font-medium text-sm text-gray-700">
                        {matchedAssetIds.length} of {allAssets.length} Regen Atlas assets enriched
                      </span>
                      {assetMatchExpanded
                        ? <CaretDown size={14} className="text-gray-400 ml-auto" />
                        : <CaretRight size={14} className="text-gray-400 ml-auto" />
                      }
                    </button>
                    {assetMatchExpanded && (
                      <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                        {matchedAssetIds.map((id) => {
                          const asset = allAssets.find((a) => a.id === id);
                          return asset ? (
                            <Link
                              key={id}
                              to={`/assets/${id}`}
                              className="bg-primary-400/20 text-primary-500 text-xs px-2.5 py-1 rounded-full hover:bg-primary-400/30 transition-colors"
                            >
                              {asset.name}
                            </Link>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Filecoin archive link */}
                {hasIntelligence && filecoinCid && (
                  <div className="bg-blue-50 border border-blue-200 shadow-sm p-4 mb-5 flex items-center gap-3">
                    <CheckCircle size={20} className="text-blue-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-blue-900">
                        Archived on Filecoin Calibration
                      </div>
                      <a
                        href={`https://0xC4d9d1a93068d311Ab18E988244123430eB4F1CD.calibration.filbeam.io/${filecoinCid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline break-all"
                      >
                        {filecoinCid}
                      </a>
                    </div>
                    <span className="text-xs text-blue-400 shrink-0">
                      {provenances.length} provenances
                    </span>
                  </div>
                )}

                {/* Pipeline status summary */}
                {hasIntelligence && (
                  <div className="bg-white border border-gray-200 shadow-sm p-5">
                    <h3 className="font-bold text-sm mb-3">Source Coverage</h3>
                    <div className="space-y-3">
                      {PROTOCOL_ORDER.map((proto) => {
                        const count = (byProtocol[proto] ?? []).length;
                        if (count === 0) return null;
                        const label = PROTOCOL_LABELS[proto] ?? proto;
                        return (
                          <div key={proto} className="flex items-center gap-3">
                            <CheckCircle size={16} className="text-green-500 shrink-0" />
                            <span className="text-sm text-gray-700 flex-1">{label}</span>
                            <span className="text-sm font-medium text-gray-500">{count} provenance objects</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {!isIngesting && !hasIntelligence && (
                  <div className="bg-white border border-gray-200 shadow-sm p-8 text-center">
                    <Database size={32} className="text-gray-300 mx-auto mb-3" />
                    <h3 className="text-base font-bold mb-1">
                      No provenance data yet
                    </h3>
                    <p className="text-sm text-gray-400 max-w-sm mx-auto">
                      Click "Load Impact Intelligence" to pull real impact data from
                      Toucan, Regen Network, Glow, and Hedera Guardian, then compose
                      verifiable provenance objects.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {/* Footer */}
      <div className="hidden lg:block w-full fixed left-0 bottom-0 z-50 h-[36px] bg-background">
        <Footer />
      </div>
    </>
  );
}
