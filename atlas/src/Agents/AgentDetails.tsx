import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { MapBox } from '../shared/components/MapBox';
import { useMapState } from '../context/map';
import Footer from '../Footer';
import Header from '../Header';
import {
  useAgent,
  useAgentValueBreakdown,
  useAgentActivity,
  StatusDot,
  AgentBadge,
  AgentAvatar,
  AGENT_TYPE_LABELS,
} from '../modules/ecospatial/a2a';
import { Marker } from 'react-map-gl';
import {
  ArrowSquareOut,
  Copy,
  Check,
  Clock,
  Lightning,
  Target,
  Users,
  ArrowLeft,
  Info,
} from '@phosphor-icons/react';
import { useState } from 'react';

// Bioregion centroid lookup (simplified - in production, load from GeoJSON)
const BIOREGION_CENTROIDS: Record<string, [number, number]> = {
  PAL_1: [5.0, 45.0], // Mediterranean
  PAL_2: [10.0, 50.0], // Central Europe
  NA_1: [-100.0, 40.0], // Great Plains
  NA_7: [-76.0, 38.5], // Chesapeake
  NT_1: [-60.0, -15.0], // Amazon
  AT_1: [20.0, 0.0], // Congo Basin
  IM_1: [100.0, 20.0], // Southeast Asia
  AA_1: [145.0, -25.0], // Australia
  OC_1: [-150.0, -15.0], // Pacific
};

function getCentroid(bioregionId: string): [number, number] {
  // Try exact match first
  if (BIOREGION_CENTROIDS[bioregionId]) {
    return BIOREGION_CENTROIDS[bioregionId];
  }
  // Try prefix match
  const prefix = bioregionId.split('_')[0];
  const prefixMatch = Object.entries(BIOREGION_CENTROIDS).find(([k]) =>
    k.startsWith(prefix)
  );
  if (prefixMatch) {
    // Offset slightly for different regions with same prefix
    const num = parseInt(bioregionId.split('_')[1] || '1', 10);
    return [prefixMatch[1][0] + num * 2, prefixMatch[1][1] + num];
  }
  return [0, 30]; // Default
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatNumber(value: number): string {
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(0);
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function AgentDetails() {
  const { address } = useParams<{ address: string }>();
  const { mapStyle } = useMapState();
  const [copied, setCopied] = useState(false);

  const { data: agent, isLoading: agentLoading } = useAgent(address);
  const { data: valueBreakdown } = useAgentValueBreakdown(address);
  const { data: activity } = useAgentActivity(address);

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (agentLoading) {
    return (
      <>
        <Header />
        <div className="main-container" role="main" aria-busy="true" aria-label="Loading agent details">
          <div className="pt-[60px] md:pt-[80px] flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 animate-pulse" />
              <p className="text-sm text-gray-500">Loading agent profile...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!agent) {
    return (
      <>
        <Header />
        <div className="main-container" role="main">
          <div className="pt-[60px] md:pt-[80px]">
            <Link to="/?entity=actor" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
              <ArrowLeft size={16} />
              Back to Actors
            </Link>
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gray-200 flex items-center justify-center">
                <Info size={24} className="text-gray-400" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">Agent Not Found</h1>
              <p className="text-gray-600 mb-6">
                No agent found with address<br />
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">{address}</code>
              </p>
              <Link to="/?entity=actor" className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                View All Agents
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Calculate map bounds from commitments
  const commitmentPositions = agent.commitments.map((c) => getCentroid(c.bioregionId));
  const avgLng =
    commitmentPositions.reduce((sum, p) => sum + p[0], 0) / commitmentPositions.length;
  const avgLat =
    commitmentPositions.reduce((sum, p) => sum + p[1], 0) / commitmentPositions.length;

  return (
    <>
      <Helmet>
        <title>{agent.name || 'Agent'} | Regen Atlas</title>
        <meta
          name="description"
          content={`${agent.name || 'Agent'} - ${AGENT_TYPE_LABELS[agent.agentType]} agent committed to ${agent.commitments.length} bioregion(s)`}
        />
      </Helmet>
      <Header />
      <div className="main-container" role="main">
        <div className="pt-[60px] md:pt-[80px]">
          {/* Back navigation */}
          <Link
            to="/?entity=actor"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
            aria-label="Return to actors list"
          >
            <ArrowLeft size={16} />
            <span>Back to Actors</span>
          </Link>

          <div className="grid lg:grid-cols-[480px_1fr] md:grid-cols-2 gap-6">
            {/* Left Column - Agent Card */}
            <div className="space-y-4">
              {/* Main Card */}
              <article className="bg-white rounded-xl border border-gray-200 overflow-hidden" aria-label={`Profile of ${agent.name || 'Agent'}`}>
                {/* Header */}
                <header className="p-5 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <AgentAvatar
                        address={agent.address}
                        agentType={agent.agentType}
                        status={agent.status}
                        size={56}
                      />

                      <div>
                        <div className="flex items-center gap-2">
                          <h1 className="text-xl font-semibold">
                            {agent.name || 'Unnamed Agent'}
                          </h1>
                          <StatusDot status={agent.status} />
                        </div>
                        <button
                          onClick={handleCopyAddress}
                          className="flex items-center gap-1 font-mono text-sm text-gray-500 hover:text-gray-700 transition-colors"
                          aria-label={copied ? 'Address copied to clipboard' : 'Copy wallet address to clipboard'}
                          title="Copy address"
                        >
                          {truncateAddress(agent.address)}
                          {copied ? (
                            <Check size={14} className="text-green-500" aria-hidden="true" />
                          ) : (
                            <Copy size={14} aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </div>

                    <AgentBadge type={agent.agentType} size="md" />
                  </div>

                  {/* ERC-8004 ID */}
                  {agent.erc8004Id && (
                    <a
                      href={`https://8004scan.xyz/agent/${agent.erc8004Id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                      aria-label={`View agent ${agent.erc8004Id} on ERC-8004 scanner (opens in new tab)`}
                    >
                      ERC-8004: {agent.erc8004Id}
                      <ArrowSquareOut size={12} aria-hidden="true" />
                    </a>
                  )}
                </header>

                {/* Stats Grid */}
                <div className="p-5 grid grid-cols-4 gap-4 border-b border-gray-100" role="group" aria-label="Agent statistics">
                  <div className="text-center" title="Total ESV tokens earned by this agent">
                    <span className="text-xl font-semibold text-gray-900">
                      {formatNumber(agent.totalESVEarned)}
                    </span>
                    <span className="block text-xs text-gray-500">ESV Earned</span>
                  </div>
                  <div className="text-center" title="ESV tokens currently staked for bioregion commitments">
                    <span className="text-xl font-semibold text-gray-900">
                      {formatNumber(agent.esvStaked)}
                    </span>
                    <span className="block text-xs text-gray-500">ESV Staked</span>
                  </div>
                  <div className="text-center" title="Reputation score based on completed actions and verification history">
                    <span className="text-xl font-semibold text-gray-900">
                      {agent.reputationScore}%
                    </span>
                    <span className="block text-xs text-gray-500">Reputation</span>
                  </div>
                  <div className="text-center" title="Number of successful actions completed">
                    <span className="text-xl font-semibold text-gray-900">
                      {agent.actionsCompleted}
                    </span>
                    <span className="block text-xs text-gray-500">Actions</span>
                  </div>
                </div>

                {/* Commitments */}
                <div className="p-5">
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Target size={14} />
                    Bioregion Commitments
                  </h3>
                  <div className="space-y-2">
                    {agent.commitments.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <span className="font-medium text-gray-900">
                            {c.bioregionId}
                          </span>
                          {c.locationProofCID && (
                            <a
                              href={`https://ipfs.io/ipfs/${c.locationProofCID}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                            >
                              proof
                            </a>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-esv-600">
                          {(c.percentageBps / 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ACP Services */}
                {agent.acpServices && agent.acpServices.length > 0 && (
                  <div className="p-5 border-t border-gray-100">
                    <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <Lightning size={14} />
                      ACP Services
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {agent.acpServices.map((service) => (
                        <span
                          key={service}
                          className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </article>

              {/* Value Breakdown Card */}
              {valueBreakdown && valueBreakdown.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                    <Users size={14} />
                    Agent Value Breakdown
                  </h3>
                  <div className="space-y-3">
                    {valueBreakdown
                      .sort((a, b) => b.score - a.score)
                      .map((v) => (
                        <div key={v.category}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize text-gray-700">{v.category}</span>
                            <span className="font-medium">{v.score}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-esv-500 rounded-full transition-all"
                              style={{ width: `${v.score}%` }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Map & Activity */}
            <div className="space-y-4">
              {/* Map */}
              <div className="h-[300px] rounded-xl overflow-hidden">
                <MapBox
                  mapStyle={mapStyle}
                  initialViewState={{
                    longitude: avgLng,
                    latitude: avgLat,
                    zoom: agent.commitments.length > 1 ? 2 : 4,
                  }}
                >
                  {commitmentPositions.map((pos, i) => (
                    <Marker
                      key={agent.commitments[i].id}
                      latitude={pos[1]}
                      longitude={pos[0]}
                      color="#10b981"
                    />
                  ))}
                </MapBox>
              </div>

              {/* Activity Feed */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-medium text-gray-900 flex items-center gap-2">
                    <Clock size={16} />
                    Recent Activity
                  </h3>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {activity && activity.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {activity.map((entry) => (
                        <div key={entry.id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-sm text-gray-900">
                                {entry.message}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500">
                                  {entry.bioregionId}
                                </span>
                                {entry.txHash && (
                                  <a
                                    href={`https://basescan.org/tx/${entry.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:text-blue-800"
                                  >
                                    tx
                                  </a>
                                )}
                              </div>
                            </div>
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                              {formatTimeAgo(entry.timestamp)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      No activity yet
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                  <span className="text-2xl font-bold text-gray-900">
                    {agent.proposalsSubmitted}
                  </span>
                  <span className="block text-xs text-gray-500 mt-1">
                    Proposals
                  </span>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                  <span className="text-2xl font-bold text-gray-900">
                    {agent.bountiesCompleted}
                  </span>
                  <span className="block text-xs text-gray-500 mt-1">
                    Bounties
                  </span>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                  <span className="text-2xl font-bold text-gray-900">
                    {agent.yieldDelegation || 0}%
                  </span>
                  <span className="block text-xs text-gray-500 mt-1">
                    Yield Delegation
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden md:block mt-8">
            <Footer />
          </div>
        </div>
      </div>
    </>
  );
}
