import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  X,
  TreeStructure,
  Buildings,
  Globe,
  ArrowRight,
  Users,
  Lightning,
  MagnifyingGlass,
  Leaf,
  Robot,
  MapPin,
  LinkSimple,
  Certificate,
  ShieldCheck,
  CaretDown,
  XLogo,
  TelegramLogo,
  InstagramLogo,
  YoutubeLogo,
  LinkedinLogo,
  GithubLogo,
} from "@phosphor-icons/react";

import { SDG_COLORS } from "../shared/consts/sdg";
import type { Asset } from "../modules/assets";
import type { Org, Action } from "../shared/types";
import type { BioregionStats } from "../modules/intelligence/bioregionIntelligence";
import {
  getBioregionStats,
  getOrgsBioregion,
  getActionsBioregion,
  loadBioregionGeoJSON,
} from "../modules/intelligence/bioregionIntelligence";
import { useAgentsByBioregion } from "../modules/ecospatial/a2a";
import { AGENT_TYPE_LABELS } from "../modules/ecospatial/a2a/types";
import { AgentAvatarCompact } from "../modules/ecospatial/a2a/components/AgentAvatar";
import { ProtocolIcon } from "../modules/chains/components/ProtocolIcon";
import { EIIPillars as EIIPillarsComponent } from "../modules/ecospatial/eii/components/EIIPillars";
import { EIISparkline } from "../modules/ecospatial/eii/components/EIISparkline";
import { EIIBadge } from "../modules/ecospatial/eii/components/EIIBadge";
import type { EIIScore as EIIScoreType } from "../modules/ecospatial/eii/types";

// Asset type color mapping (matches ClusteredAssetLayer)
const TYPE_COLORS: Record<number, string> = {
  5: "#F4D35E",
  1: "#4CAF50",
  6: "#00ACC1",
  7: "#BA68C8",
  4: "#FF8A65",
  8: "#90A4AE",
};

interface BioregionPanelProps {
  bioregionCode: string;
  bioregionName: string;
  bioregionColor: string;
  bioregionRealmName: string;
  allAssets: Asset[];
  allOrgs: Org[];
  allActions: Action[];
  onClose: () => void;
  onAssetSelect: (asset: Asset) => void;
  onActionSelect?: (action: Action) => void;
  /** Opens the full action detail card (parallel to onAssetSelect) */
  onActionDetailSelect?: (action: Action) => void;
  onAgentClick?: (address: string) => void;
  onOrgSelect?: (org: Org) => void;
  defaultTab?: 'overview' | 'assets' | 'actors' | 'actions';
  /** When true, renders EII scoring, vault links, and provenance in the Overview tab */
  experimentalMode?: boolean;
  /** Static EII scores keyed by bioregion code */
  eiiScores?: Record<string, { eii: number; delta?: number }> | null;
}

export function BioregionPanel({
  bioregionCode,
  bioregionName,
  bioregionColor,
  bioregionRealmName,
  allAssets,
  allOrgs,
  allActions,
  onClose,
  onAssetSelect,
  onActionSelect,
  onActionDetailSelect,
  onAgentClick,
  onOrgSelect,
  defaultTab = 'overview',
  experimentalMode = false,
  eiiScores = null,
}: BioregionPanelProps) {
  const [stats, setStats] = useState<BioregionStats | null>(null);
  const [bioregionOrgs, setBioregionOrgs] = useState<Org[]>([]);
  const [bioregionActions, setBioregionActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);
  const [actorSection, setActorSection] = useState<'orgs' | 'agents' | null>('orgs');
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);

  // Fetch agents committed to this bioregion
  const { data: agents } = useAgentsByBioregion(bioregionCode);

  // Tab-based navigation for cleaner UX
  type TabKey = 'overview' | 'assets' | 'actors' | 'actions';
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);

  // Sync tab when defaultTab prop changes (e.g. action click → actions tab)
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // Type filter for asset list
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);

  // Search within asset list
  const [assetSearch, setAssetSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    loadBioregionGeoJSON().then((geojson) => {
      if (cancelled) return;
      const result = getBioregionStats(bioregionCode, allAssets, geojson);
      setStats(result);
      setBioregionOrgs(getOrgsBioregion(allOrgs, bioregionCode, geojson));
      setBioregionActions(
        getActionsBioregion(allActions, bioregionCode, geojson)
      );
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [bioregionCode, allAssets, allOrgs, allActions]);

  const typeEntries = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.typeDistribution).sort(
      ([, a], [, b]) => b.count - a.count
    );
  }, [stats]);

  const totalTypeCount = useMemo(
    () => typeEntries.reduce((sum, [, v]) => sum + v.count, 0),
    [typeEntries]
  );

  // Sort: primary assets first (alphabetical), then second-order (alphabetical)
  const sortedAssets = useMemo(() => {
    if (!stats) return [];
    return [...stats.assets].sort((a, b) => {
      if (a.second_order !== b.second_order) return a.second_order ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  }, [stats]);

  // Filter assets by selected type and search query
  const displayedAssets = useMemo(() => {
    let filtered = sortedAssets;
    if (selectedTypeId) {
      filtered = filtered.filter((a) =>
        a.asset_types?.some((t) => t.id === selectedTypeId)
      );
    }
    if (assetSearch.trim()) {
      const q = assetSearch.toLowerCase();
      filtered = filtered.filter((a) => a.name.toLowerCase().includes(q));
    }
    return filtered;
  }, [sortedAssets, selectedTypeId, assetSearch]);

  if (loading) {
    return (
      <div className="flex-1 min-h-0 bg-cardBackground animate-pulse p-6">
        <div className="h-6 bg-gray-200 rounded w-2/3 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex-1 min-h-0 bg-cardBackground p-6 text-center text-gray-400">
        Bioregion not found
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-cardBackground overflow-hidden">
      {/* ── Header — photo background with integrated stats ── */}
      <div className="relative overflow-hidden shrink-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(/images/bioregions/${bioregionCode}.webp)`,
            backgroundColor: bioregionColor,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        <div className="relative z-10 px-5 pt-4 pb-3">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Globe size={14} weight="fill" className="text-white/60" />
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-white/15 text-white/80 backdrop-blur-sm">
                  {bioregionRealmName}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white leading-tight">
                {bioregionName}
              </h2>
              <span className="text-[10px] text-white/35">{bioregionCode}</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 transition-colors"
            >
              <X size={18} className="text-white/50" />
            </button>
          </div>
          {/* Inline stats — compact pills at the bottom of the hero */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-white/90">
              <TreeStructure size={12} weight="bold" className="text-white/50" />
              <span className="text-xs font-semibold">{stats.assetCount}</span>
              <span className="text-[10px] text-white/50">assets</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/90">
              <Buildings size={12} weight="bold" className="text-white/50" />
              <span className="text-xs font-semibold">{stats.issuers.length}</span>
              <span className="text-[10px] text-white/50">issuers</span>
            </div>
            {(bioregionOrgs.length > 0 || (agents && agents.length > 0)) && (
              <div className="flex items-center gap-1.5 text-white/90">
                <Users size={12} weight="bold" className="text-white/50" />
                <span className="text-xs font-semibold">{bioregionOrgs.length + (agents?.length || 0)}</span>
                <span className="text-[10px] text-white/50">actors</span>
              </div>
            )}
            {bioregionActions.length > 0 && (
              <div className="flex items-center gap-1.5 text-white/90">
                <Lightning size={12} weight="bold" className="text-white/50" />
                <span className="text-xs font-semibold">{bioregionActions.length}</span>
                <span className="text-[10px] text-white/50">actions</span>
              </div>
            )}
          </div>
          {stats.secondOrderAssetCount > 0 && (
            <div className="text-[10px] text-white/40 mt-1">
              {stats.primaryAssetCount} primary · {stats.secondOrderAssetCount} derived
            </div>
          )}
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex border-b border-gray-200 shrink-0 bg-white">
        {[
          { key: 'overview' as TabKey, label: 'Overview', icon: <Leaf size={14} /> },
          { key: 'assets' as TabKey, label: `Assets (${sortedAssets.length})`, icon: <TreeStructure size={14} /> },
          { key: 'actions' as TabKey, label: `Actions (${bioregionActions.length})`, icon: <Lightning size={14} /> },
          { key: 'actors' as TabKey, label: `Actors (${bioregionOrgs.length + (agents?.length || 0)})`, icon: <Users size={14} /> },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1 py-3 md:py-2.5 text-[11px] md:text-xs font-medium transition-colors min-h-[44px] ${
              activeTab === tab.key
                ? 'text-gray-900 border-b-2 border-gray-900 -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="p-4 space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-gray-900">{stats.assetCount}</div>
                <div className="text-[11px] text-gray-500">Assets</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-gray-900">{bioregionOrgs.length + (agents?.length || 0)}</div>
                <div className="text-[11px] text-gray-500">Actors</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-gray-900">{bioregionActions.length}</div>
                <div className="text-[11px] text-gray-500">Actions</div>
              </div>
            </div>

            {/* ── Experimental: EII + Vault ── */}
            {experimentalMode && (() => {
              // Deterministic mock from bioregion code (same pattern as VaultDetail)
              const hash = bioregionCode.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
              const eiiBase = 0.35 + (hash % 55) / 100; // 0.35–0.90
              const fnScore = Math.min(1, eiiBase + (hash % 12) / 100);
              const stScore = Math.max(0.1, eiiBase - (hash % 10) / 100);
              const coScore = Math.max(0.1, eiiBase - (hash % 15) / 100);
              const pillars = { function: fnScore, structure: stScore, composition: coScore };
              const limitingPillar = fnScore <= stScore && fnScore <= coScore ? 'function' as const
                : stScore <= coScore ? 'structure' as const : 'composition' as const;
              const delta = ((hash % 20) - 10) / 100; // -0.10 to +0.10
              const sparkData = [eiiBase - 0.04, eiiBase - 0.01, eiiBase + 0.02, eiiBase - 0.01, eiiBase + 0.01, eiiBase];

              // Vault mock
              const hasVault = hash % 3 !== 0;
              const tvl = 50000 + (hash % 200) * 1000;
              const yieldRate = 5 + (hash % 15);
              const activeProposals = hash % 5;

              return (
                <div className="space-y-4">
                  {/* EII Section */}
                  <div className="bg-emerald-50 rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
                        <Leaf size={14} />
                        Ecosystem Integrity Index
                      </h3>
                      <EIIBadge score={eiiBase} size="sm" />
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-gray-900">
                        {(eiiBase * 100).toFixed(1)}
                      </span>
                      <span className={`text-sm font-medium ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {delta >= 0 ? '+' : ''}{(delta * 100).toFixed(1)}%
                      </span>
                      <EIISparkline data={sparkData} width={80} height={28} showTrend />
                    </div>

                    <EIIPillarsComponent pillars={pillars} limitingPillar={limitingPillar} />
                  </div>

                  {/* Vault Summary */}
                  {hasVault && (
                    <div className="bg-purple-50 rounded-lg p-3 space-y-2">
                      <h3 className="text-xs font-semibold text-purple-800 uppercase tracking-wide">Bioregion Vault</h3>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <div className="text-sm font-bold text-gray-900">${(tvl / 1000).toFixed(0)}K</div>
                          <div className="text-[10px] text-gray-500">TVL</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold text-gray-900">{yieldRate}%</div>
                          <div className="text-[10px] text-gray-500">APY</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold text-gray-900">{activeProposals}</div>
                          <div className="text-[10px] text-gray-500">Proposals</div>
                        </div>
                      </div>
                      <Link
                        to={`/vaults/${bioregionCode}`}
                        className="block text-xs text-center py-1.5 bg-purple-100 hover:bg-purple-200 rounded text-purple-700 font-medium transition-colors"
                      >
                        View Full Vault →
                      </Link>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Assets Tab */}
        {activeTab === 'assets' && (
          <div>
            {/* Type distribution */}
            {typeEntries.length > 0 && (
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                  {typeEntries.map(([typeId, { count }]) => {
                    const id = Number(typeId);
                    return (
                      <button
                        key={typeId}
                        onClick={() => setSelectedTypeId(selectedTypeId === id ? null : id)}
                        style={{
                          width: `${(count / totalTypeCount) * 100}%`,
                          backgroundColor: TYPE_COLORS[id] ?? "#BDBDBD",
                          opacity: selectedTypeId && selectedTypeId !== id ? 0.3 : 1,
                        }}
                        className="rounded-full transition-opacity cursor-pointer"
                      />
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {typeEntries.map(([typeId, { count, name }]) => {
                    const id = Number(typeId);
                    return (
                      <button
                        key={typeId}
                        onClick={() => setSelectedTypeId(selectedTypeId === id ? null : id)}
                        className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                          selectedTypeId === id ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: TYPE_COLORS[id] ?? "#BDBDBD" }} />
                        {name} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Search */}
            {sortedAssets.length > 5 && (
              <div className="relative border-b border-gray-100">
                <MagnifyingGlass size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  placeholder="Search assets..."
                  className="w-full pl-9 pr-4 py-2 text-xs focus:outline-none"
                />
              </div>
            )}

            {/* Asset list — inline accordion */}
            <div>
              {displayedAssets.length === 0 ? (
                <div className="text-xs text-gray-400 py-8 text-center">
                  {assetSearch ? "No matching assets" : "No assets in this bioregion"}
                </div>
              ) : (
                displayedAssets.map((asset) => {
                  const isAssetOpen = expandedAssetId === asset.id;
                  const primaryType = asset.asset_types[0];
                  const typeColor = primaryType ? TYPE_COLORS[primaryType.id] ?? "#9CA3AF" : "#9CA3AF";

                  return (
                    <div key={asset.id} className="border-b border-gray-50">
                      <div className="flex items-center hover:bg-gray-50 transition-colors">
                        <button
                          onClick={() => setExpandedAssetId(isAssetOpen ? null : asset.id)}
                          className="flex-1 min-w-0 text-left px-4 py-2.5"
                        >
                          <div className="flex items-center gap-2.5">
                            {asset.main_image ? (
                              <div className="w-10 h-10 rounded bg-cover bg-center flex-shrink-0" style={{ backgroundImage: `url(${asset.main_image})` }} />
                            ) : (
                              <div className="w-10 h-10 rounded bg-gray-100 flex-shrink-0 flex items-center justify-center">
                                <TreeStructure size={14} className="text-gray-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">{asset.name}</div>
                              <div className="text-[10px] text-gray-400 truncate">{asset.issuer?.name}</div>
                            </div>
                          </div>
                        </button>
                        <button
                          onClick={() => onAssetSelect(asset)}
                          className="px-3 py-2.5 text-gray-300 hover:text-gray-600 transition-colors flex-shrink-0"
                          title="View full details"
                        >
                          <ArrowRight size={16} />
                        </button>
                      </div>

                      {isAssetOpen && (
                        <div className="pb-1">
                          {/* ── Photo banner with title overlay ── */}
                          <div className="relative h-28 overflow-hidden">
                            {asset.main_image && (
                              <div
                                className="absolute inset-0 bg-cover bg-center"
                                style={{ backgroundImage: `url(${asset.main_image})` }}
                              />
                            )}
                            <div className={`absolute inset-0 ${asset.main_image ? 'bg-gradient-to-t from-black/70 via-black/30 to-transparent' : 'bg-gray-800'}`} />
                            <div className="relative z-10 h-full flex flex-col justify-end px-4 pb-3">
                              <div className="flex items-center gap-1.5 mb-1">
                                {primaryType && (
                                  <span
                                    className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
                                    style={{ backgroundColor: `${typeColor}40`, color: '#fff' }}
                                  >
                                    {primaryType.name}
                                  </span>
                                )}
                                {asset.asset_subtypes.map((s) => (
                                  <span
                                    key={s.id}
                                    className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-white/20 text-white/90"
                                  >
                                    {s.name}
                                  </span>
                                ))}
                              </div>
                              <h3 className="text-sm font-bold text-white leading-tight">{asset.name}</h3>
                              <div className="flex items-center gap-1 text-[10px] text-white/70 mt-0.5">
                                {asset.region && (
                                  <>
                                    <MapPin size={9} />
                                    <span>{asset.region}</span>
                                    <span className="text-white/30 mx-0.5">·</span>
                                  </>
                                )}
                                {asset.issuer?.name && <span>{asset.issuer.name}</span>}
                              </div>
                            </div>
                          </div>

                          {/* ── Signal pills ── */}

                          {/* ── Description ── */}
                          {asset.description && (
                            <div className="px-4 pt-3 pb-3">
                              <p className="text-xs text-gray-600 leading-relaxed line-clamp-4">
                                {asset.description}
                              </p>
                            </div>
                          )}

                          {/* ── Certifications ── */}
                          {asset.certifications.length > 0 && (
                            <div className="border-t border-gray-100">
                              <div className="px-4 py-2 flex items-center gap-1.5 text-xs font-medium text-gray-700">
                                <Certificate size={13} className="text-gray-400" />
                                <span>Certifications ({asset.certifications.length})</span>
                              </div>
                              <div className="px-4 pb-2 space-y-1.5">
                                {asset.certifications.map((cert) => (
                                  <div
                                    key={cert.id}
                                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg"
                                  >
                                    <ShieldCheck size={16} className="text-amber-500 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-medium text-gray-900">
                                        {cert.certifier.short_name || cert.certifier.name}
                                      </div>
                                      {cert.description_short && (
                                        <div className="text-[10px] text-gray-400">{cert.description_short}</div>
                                      )}
                                    </div>
                                    {cert.certification_source && (
                                      <a
                                        href={cert.certification_source}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gray-300 hover:text-amber-500 flex-shrink-0"
                                      >
                                        <ArrowRight size={12} />
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* ── Issuer ── */}
                          {asset.issuer && (
                            <div className="border-t border-gray-100">
                              <div className="px-4 py-2 flex items-center gap-1.5 text-xs font-medium text-gray-700">
                                <Buildings size={13} className="text-gray-400" />
                                <span>Issuer</span>
                              </div>
                              <div className="px-4 pb-2">
                                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                    <Users size={10} className="text-blue-500" />
                                  </div>
                                  <span className="text-xs font-medium text-gray-900 flex-1">{asset.issuer.name}</span>
                                  {asset.issuer_link && (
                                    <a href={asset.issuer_link} target="_blank" rel="noopener noreferrer">
                                      <ArrowRight size={12} className="text-gray-300 hover:text-blue-500" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ── Chains ── */}
                          {asset.platforms.length > 0 && (
                            <div className="border-t border-gray-100">
                              <div className="px-4 py-2 flex items-center gap-1.5 text-xs font-medium text-gray-700">
                                <Globe size={13} className="text-gray-400" />
                                <span>Chains ({asset.platforms.length})</span>
                              </div>
                              <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                                {asset.platforms.map((p) => (
                                  <div key={p.id} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 rounded-lg">
                                    <img src={p.image.thumb} alt="" className="w-4 h-4 rounded-full" />
                                    <span className="text-xs text-gray-700">{p.name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* People Tab (Orgs first, Agents bottom) */}
        {activeTab === 'actors' && (
          <div>
            {/* Organizations section */}
            {bioregionOrgs.length > 0 && (
              <>
                <button
                  onClick={() => setActorSection(prev => prev === 'orgs' ? null : 'orgs')}
                  className="w-full flex items-center justify-between px-4 h-8 text-sm font-semibold text-white shrink-0 bg-blue-500 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Users size={14} />
                    Organizations ({bioregionOrgs.length})
                  </span>
                  <CaretDown
                    size={14}
                    className={`transition-transform ${actorSection === 'orgs' ? 'rotate-180' : ''}`}
                  />
                </button>
                {actorSection === 'orgs' && bioregionOrgs.map((org) => {
                  const isOrgOpen = expandedOrgId === org.id;
                  return (
                    <div key={org.id} className="border-b border-gray-50">
                      <div className="flex items-center hover:bg-blue-50 transition-colors">
                        <button
                          onClick={() => setExpandedOrgId(isOrgOpen ? null : org.id)}
                          className="flex-1 min-w-0 text-left px-4 py-2.5 cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            {org.main_image ? (
                              <div className="w-10 h-10 rounded bg-cover bg-center flex-shrink-0" style={{ backgroundImage: `url(${org.main_image})` }} />
                            ) : (
                              <div className="w-10 h-10 rounded bg-blue-100 flex-shrink-0 flex items-center justify-center">
                                <Users size={14} className="text-blue-500" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">{org.name}</div>
                              {org.address && <div className="text-[10px] text-gray-400 truncate">{org.address}</div>}
                            </div>
                          </div>
                        </button>
                        <button
                          onClick={() => onOrgSelect?.(org)}
                          className="px-3 py-2.5 text-gray-300 hover:text-gray-600 transition-colors flex-shrink-0 cursor-pointer"
                          title="View full details"
                        >
                          <ArrowRight size={16} />
                        </button>
                      </div>

                      {isOrgOpen && (
                        <div className="pb-1">
                          {/* Inline preview */}
                          <div className="relative h-28 overflow-hidden">
                            {org.main_image && (
                              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${org.main_image})` }} />
                            )}
                            <div className={`absolute inset-0 ${org.main_image ? 'bg-gradient-to-t from-black/70 via-black/30 to-transparent' : 'bg-gray-800'}`} />
                            <div className="relative z-10 h-full flex flex-col justify-end px-4 pb-3">
                              <h3 className="text-sm font-bold text-white leading-tight">{org.name}</h3>
                              <div className="flex items-center gap-1 text-[10px] text-white/70 mt-0.5">
                                {org.address && (
                                  <>
                                    <MapPin size={9} />
                                    <span>{org.address}</span>
                                  </>
                                )}
                                {org.established && (
                                  <>
                                    {org.address && <span className="text-white/30 mx-0.5">·</span>}
                                    <span>Est. {new Date(org.established).getFullYear()}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          {org.description && (
                            <div className="px-4 pt-3 pb-3">
                              <p className="text-xs text-gray-600 leading-relaxed line-clamp-4">{org.description}</p>
                            </div>
                          )}
                          <div className="px-4 pb-2 flex items-center gap-2 flex-wrap">
                            {org.assets.length > 0 && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                                {org.assets.length} asset{org.assets.length !== 1 ? 's' : ''}
                              </span>
                            )}
                            {org.issuers.length > 0 && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
                                {org.issuers.length} issuer{org.issuers.length !== 1 ? 's' : ''}
                              </span>
                            )}
                            {(org.link || (org.social && org.social.length > 0)) && (
                              <div className="flex items-center gap-2 ml-auto">
                                {org.link && (
                                  <a href={org.link} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 transition-colors">
                                    <Globe size={14} />
                                  </a>
                                )}
                                {org.social?.map((s: any, i: number) => {
                                  const platform = (s.platform || '').toLowerCase();
                                  const href = s.link || s.url || '#';
                                  const iconMap: Record<string, any> = { x: XLogo, twitter: XLogo, telegram: TelegramLogo, instagram: InstagramLogo, youtube: YoutubeLogo, linkedin: LinkedinLogo, github: GithubLogo };
                                  const Icon = iconMap[platform] || LinkSimple;
                                  return (
                                    <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 transition-colors">
                                      <Icon size={14} />
                                    </a>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {/* Agents section (bottom) — displayed as org-style cards */}
            {agents && agents.length > 0 && (
              <>
                <button
                  onClick={() => setActorSection(prev => prev === 'agents' ? null : 'agents')}
                  className="w-full flex items-center justify-between px-4 h-8 text-sm font-semibold text-white shrink-0 bg-purple-500 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Robot size={14} />
                    AI Agents ({agents.length})
                  </span>
                  <CaretDown
                    size={14}
                    className={`transition-transform ${actorSection === 'agents' ? 'rotate-180' : ''}`}
                  />
                </button>
                {actorSection === 'agents' && agents.map((agent) => {
                  const a = agent as any;
                  const isAgentOpen = expandedOrgId === agent.id;
                  // Build a fake Org-shaped object so onOrgSelect renders OrgBioregionCard
                  const agentAsOrg = {
                    id: agent.id,
                    name: agent.name,
                    main_image: a.avatar || null,
                    address: null,
                    description: agent.mission || null,
                    link: a.website || null,
                    established: null,
                    coordinates: null,
                    assets: [],
                    issuers: [],
                    ecosystems: [],
                    social: [
                      a.twitter ? { platform: 'x', link: `https://x.com/${a.twitter.replace('@', '')}` } : null,
                    ].filter(Boolean),
                    treasury: a.address && a.address !== '0xowockibot' ? [{
                      link: `https://basescan.org/address/${a.address}`,
                      platform: { id: 'base', name: 'Base' },
                    }] : [],
                    country_codes: [],
                    bioregion_codes: [],
                    isAgent: true,
                  };
                  return (
                    <div key={agent.id} className="border-b border-gray-50">
                      <div className="flex items-center hover:bg-purple-50 transition-colors">
                        <button
                          onClick={() => setExpandedOrgId(isAgentOpen ? null : agent.id)}
                          className="flex-1 min-w-0 text-left px-4 py-2.5 cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            {a.avatar ? (
                              <img src={a.avatar} className="w-10 h-10 rounded object-cover flex-shrink-0" alt={agent.name} />
                            ) : (
                              <div className="w-10 h-10 rounded bg-purple-100 flex-shrink-0 flex items-center justify-center">
                                <Robot size={14} className="text-purple-500" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">{agent.name}</div>
                              {agent.mission && <div className="text-[10px] text-gray-400 truncate">{agent.mission.slice(0, 60)}...</div>}
                            </div>
                          </div>
                        </button>
                        <button
                          onClick={() => onOrgSelect?.(agentAsOrg as any)}
                          className="px-3 py-2.5 text-gray-300 hover:text-gray-600 transition-colors flex-shrink-0 cursor-pointer"
                          title="View full details"
                        >
                          <ArrowRight size={16} />
                        </button>
                      </div>

                      {isAgentOpen && (
                        <div className="pb-1">
                          <div className="relative h-28 overflow-hidden">
                            {a.avatar && (
                              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${a.avatar})` }} />
                            )}
                            <div className={`absolute inset-0 ${a.avatar ? 'bg-gradient-to-t from-black/70 via-black/30 to-transparent' : 'bg-gray-800'}`} />
                            <div className="relative z-10 h-full flex flex-col justify-end px-4 pb-3">
                              <span className="self-start text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded mb-1 bg-purple-500/40 text-white">
                                Agent
                              </span>
                              <h3 className="text-sm font-bold text-white leading-tight">{agent.name}</h3>
                            </div>
                          </div>
                          {agent.mission && (
                            <div className="px-4 pt-3 pb-3">
                              <p className="text-xs text-gray-600 leading-relaxed">{agent.mission}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {(!agents || agents.length === 0) && bioregionOrgs.length === 0 && (
              <div className="text-xs text-gray-400 py-8 text-center">No actors in this bioregion yet</div>
            )}
          </div>
        )}

        {/* Actions Tab — grouped list */}
        {activeTab === 'actions' && (() => {
          // Group actions that share same location and base title (strip trailing year/vintage)
          const groupKey = (a: Action) => {
            const base = (a.title || '').replace(/\s*[-—]\s*\d{4}\s*$/, '').replace(/\s+\d{4}\s*$/, '').trim();
            const loc = a.location ? `${a.location.latitude.toFixed(2)},${a.location.longitude.toFixed(2)}` : 'noloc';
            return `${base}||${loc}`;
          };
          const groupMap = new Map<string, Action[]>();
          for (const a of bioregionActions) {
            const k = groupKey(a);
            if (!groupMap.has(k)) groupMap.set(k, []);
            groupMap.get(k)!.push(a);
          }
          const groups = Array.from(groupMap.values());

          return (
          <div>
            {groups.length === 0 ? (
              <div className="text-xs text-gray-400 py-8 text-center">No actions in this bioregion yet</div>
            ) : (
              groups.map((actionGroup) => {
                const action = actionGroup[0];
                const displayTitle = (action.title || '').replace(/\s*[-—]\s*\d{4}\s*$/, '').replace(/\s+\d{4}\s*$/, '').trim();
                const isOpen = expandedActionId === action.id;
                const allProofs = actionGroup.flatMap(a => a.proofs);
                const allSdgs = [...new Map(actionGroup.flatMap(a => a.sdg_outcomes).map(s => [s.code, s])).values()];
                const protocol = allProofs[0]?.protocol;
                const actor = action.actors[0];
                const dateRange = actionGroup
                  .map(a => a.action_start_date || a.created_at)
                  .filter(Boolean)
                  .sort();
                const dateLabelStart = dateRange.length > 0 ? new Date(dateRange[0]!).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';
                const dateLabelEnd = dateRange.length > 1 ? new Date(dateRange[dateRange.length - 1]!).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';
                const dateLabel = dateLabelStart && dateLabelEnd && dateLabelStart !== dateLabelEnd
                  ? `${dateLabelStart} – ${dateLabelEnd}`
                  : dateLabelStart;

                return (
                  <div key={action.id} className="border-b border-gray-50">
                    <div className="flex items-center hover:bg-gray-50 transition-colors">
                      <button
                        onClick={() => setExpandedActionId(isOpen ? null : action.id)}
                        className="flex-1 min-w-0 text-left px-4 py-2.5"
                      >
                        <div className="flex items-center gap-2.5">
                          {action.main_image ? (
                            <div
                              className="w-10 h-10 rounded bg-cover bg-center flex-shrink-0"
                              style={{ backgroundImage: `url(${action.main_image})` }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-emerald-100 flex-shrink-0 flex items-center justify-center">
                              <Lightning size={14} className="text-emerald-600" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{displayTitle}</div>
                            <div className="text-[10px] text-gray-400 truncate">
                              {actor?.name}
                              {actionGroup.length > 1 && (
                                <span className="ml-1">· {actionGroup.length} issuances</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => onActionDetailSelect?.(action)}
                        className="px-3 py-2.5 text-gray-300 hover:text-gray-600 transition-colors flex-shrink-0"
                        title="View full details"
                      >
                        <ArrowRight size={16} />
                      </button>
                    </div>

                    {isOpen && (
                      <div className="pb-1">
                        {/* ── Photo banner with title overlay ── */}
                        <div className="relative h-28 overflow-hidden">
                          <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{
                              backgroundImage: action.main_image ? `url(${action.main_image})` : undefined,
                              backgroundColor: protocol?.color || '#059669',
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                          <div className="relative z-10 h-full flex flex-col justify-end px-4 pb-3">
                            {protocol && (
                              <span
                                className="self-start text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded mb-1"
                                style={{ backgroundColor: protocol.color || '#059669', color: '#fff' }}
                              >
                                {protocol.name}
                              </span>
                            )}
                            <h3 className="text-sm font-bold text-white leading-tight">{displayTitle}</h3>
                            <div className="flex items-center gap-1 text-[10px] text-white/70 mt-0.5">
                              {action.country_code && (
                                <>
                                  <MapPin size={9} />
                                  <span>{action.country_code}</span>
                                  <span className="text-white/30 mx-0.5">·</span>
                                </>
                              )}
                              {actor && <span>{actor.name}</span>}
                              {dateLabel && (
                                <>
                                  <span className="text-white/30 mx-0.5">·</span>
                                  <span>{dateLabel}</span>
                                </>
                              )}
                            </div>
                            {/* SDG icons in banner */}
                            {allSdgs.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap mt-1.5">
                                {[...allSdgs]
                                  .sort((a, b) => parseInt(a.code, 10) - parseInt(b.code, 10))
                                  .map((sdg) => (
                                    <span
                                      key={sdg.code}
                                      title={sdg.title}
                                      className="inline-flex items-center justify-center w-[16px] h-[16px] rounded-full text-[8px] font-bold text-white"
                                      style={{ backgroundColor: SDG_COLORS[sdg.code] || '#6B7280' }}
                                    >
                                      {sdg.code}
                                    </span>
                                  ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* ── Description ── */}
                        {action.description && (
                          <div className="px-4 py-2">
                            <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                              {action.description}
                            </p>
                          </div>
                        )}

                        {/* ── SDG pills ── */}
                        {allSdgs.length > 0 && (
                          <div className="px-4 pb-2 flex items-center gap-1 flex-wrap">
                            {[...allSdgs]
                              .sort((a, b) => parseInt(a.code, 10) - parseInt(b.code, 10))
                              .map((sdg) => (
                                <span
                                  key={sdg.code}
                                  title={sdg.title}
                                  className="inline-flex items-center justify-center w-[16px] h-[16px] rounded-full text-[8px] font-bold text-white"
                                  style={{ backgroundColor: SDG_COLORS[sdg.code] || '#6B7280' }}
                                >
                                  {sdg.code}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          );
        })()}
      </div>
    </div>
  );
}
