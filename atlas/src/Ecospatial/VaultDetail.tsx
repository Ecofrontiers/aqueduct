/**
 * VaultDetail - Bioregion Vault Details Page
 * Shows vault metrics, yield sources, proposals, and agent commitments
 */

import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from '../Header';
import Footer from '../Footer';
import {
  Vault,
  ChartLine,
  Users,
  CurrencyCircleDollar,
  Clock,
  ArrowLeft,
  Leaf,
  Target,
  CaretUp,
  CaretDown,
} from '@phosphor-icons/react';
import { useEII } from '../modules/ecospatial/eii';
import { useAgentsByBioregion } from '../modules/ecospatial/a2a';
import { AgentAvatarCompact } from '../modules/ecospatial/a2a/components/AgentAvatar';
import { AGENT_TYPE_LABELS } from '../modules/ecospatial/a2a/types';
import { useMemo, useState } from 'react';
import { BioregionMinimap } from './components/BioregionMinimap';

// Mock vault data generator (same as BioregionPanel)
function generateVaultData(bioregionCode: string) {
  const hash = bioregionCode.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const hasVault = hash % 3 !== 0;

  if (!hasVault) return null;

  return {
    tvl: 50000 + (hash % 200) * 1000,
    yieldRate: 5 + (hash % 15),
    activeProposals: hash % 5,
    epoch: 12 + (hash % 8),
    nextSettlement: Date.now() + (hash % 7) * 24 * 60 * 60 * 1000,
    tokenSymbol: 'ESV',
    totalESVMinted: 10000 + (hash % 50000),
    totalYieldGenerated: 5000 + (hash % 20000),
    proposalShareBps: 6000 + (hash % 2000),
    liquidityShareBps: 4000 - (hash % 2000),
    deposits: Array.from({ length: 5 + (hash % 10) }, (_, i) => ({
      id: `dep-${i}`,
      depositor: `0x${(hash + i).toString(16).padStart(40, '0')}`,
      amount: 1000 + ((hash * i) % 10000),
      timestamp: Date.now() - (i + 1) * 86400000,
    })),
    proposals: [
      {
        id: 'prop-1',
        title: 'Wetland Restoration Initiative',
        pillar: 'function' as const,
        requestedAmount: 15000 + (hash % 10000),
        fundedAmount: 8000 + (hash % 8000),
        status: 'active' as const,
        deadline: Date.now() + 7 * 86400000,
      },
      {
        id: 'prop-2',
        title: 'Native Species Monitoring',
        pillar: 'composition' as const,
        requestedAmount: 8000 + (hash % 5000),
        fundedAmount: 8000 + (hash % 5000),
        status: 'funded' as const,
        deadline: Date.now() + 14 * 86400000,
      },
      {
        id: 'prop-3',
        title: 'Connectivity Corridor Assessment',
        pillar: 'structure' as const,
        requestedAmount: 12000 + (hash % 8000),
        fundedAmount: 3000 + (hash % 3000),
        status: 'active' as const,
        deadline: Date.now() + 5 * 86400000,
      },
    ].slice(0, 1 + (hash % 3)),
    yieldSources: [
      { name: 'Aave V3', amount: 2000 + (hash % 3000), color: '#B6509E' },
      { name: 'Compound', amount: 1500 + (hash % 2000), color: '#00D395' },
      { name: 'Yearn', amount: 1000 + (hash % 1500), color: '#006AE3' },
    ],
  };
}

// Pillar colors
const PILLAR_COLORS = {
  function: { bg: 'bg-emerald-100', text: 'text-emerald-700', bar: 'bg-emerald-500' },
  structure: { bg: 'bg-blue-100', text: 'text-blue-700', bar: 'bg-blue-500' },
  composition: { bg: 'bg-amber-100', text: 'text-amber-700', bar: 'bg-amber-500' },
};

export function VaultDetail() {
  const { bioregionId } = useParams<{ bioregionId: string }>();
  const { data: eiiData } = useEII(bioregionId || '');
  const { data: agents } = useAgentsByBioregion(bioregionId || '');
  const [expandedSection, setExpandedSection] = useState<string | null>('proposals');

  const vaultData = useMemo(
    () => (bioregionId ? generateVaultData(bioregionId) : null),
    [bioregionId]
  );

  if (!bioregionId) {
    return (
      <>
        <Header />
        <div className="main-container pt-24 text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Bioregion</h1>
          <Link to="/" className="btn btn-primary">Back to Explore</Link>
        </div>
      </>
    );
  }

  if (!vaultData) {
    return (
      <>
        <Header />
        <div className="main-container pt-24 text-center">
          <h1 className="text-2xl font-bold mb-4">No Vault Found</h1>
          <p className="text-gray-600 mb-6">
            No vault has been created for bioregion {bioregionId} yet.
          </p>
          <Link to="/" className="btn btn-primary">Back to Explore</Link>
        </div>
      </>
    );
  }

  const formatCurrency = (n: number) => {
    if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
  };

  const formatTimeRemaining = (timestamp: number) => {
    const diff = timestamp - Date.now();
    if (diff <= 0) return 'Ended';
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  return (
    <>
      <Helmet>
        <title>Vault: {bioregionId} | Regen Atlas</title>
      </Helmet>
      <Header />

      <div className="main-container">
        <div className="pt-[60px] md:pt-[80px]">
          {/* Back link */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft size={16} />
            Back to Explore
          </Link>

          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white mb-6">
            <div className="flex gap-5">
              {/* Minimap */}
              <BioregionMinimap
                bioregionCode={bioregionId}
                className="w-32 h-32 flex-shrink-0 border-2 border-white/20"
              />

              <div className="flex-1">
                {/* Title */}
                <div className="flex items-center gap-3 mb-4">
                  <Vault size={28} weight="fill" />
                  <div>
                    <h1 className="text-2xl font-bold">{bioregionId} Bioregion Vault</h1>
                    <p className="text-white/70 text-sm">Epoch {vaultData.epoch}</p>
                  </div>
                </div>

                {/* Key metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="text-white/60 text-[10px] uppercase tracking-wide mb-1">TVL</div>
                    <div className="text-xl font-bold">{formatCurrency(vaultData.tvl)}</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="text-white/60 text-[10px] uppercase tracking-wide mb-1">APY</div>
                    <div className="text-xl font-bold">{vaultData.yieldRate}%</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="text-white/60 text-[10px] uppercase tracking-wide mb-1">ESV Minted</div>
                    <div className="text-xl font-bold">{vaultData.totalESVMinted.toLocaleString()}</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="text-white/60 text-[10px] uppercase tracking-wide mb-1">Settlement</div>
                    <div className="text-xl font-bold">{formatTimeRemaining(vaultData.nextSettlement)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left column - Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* EII Section */}
              {eiiData && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Leaf size={20} className="text-emerald-500" />
                      <h2 className="text-lg font-semibold">Ecosystem Integrity</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-emerald-600">
                        {(eiiData.eii * 100).toFixed(0)}%
                      </span>
                      {(eiiData.delta ?? 0) > 0 ? (
                        <CaretUp size={16} className="text-emerald-500" />
                      ) : (
                        <CaretDown size={16} className="text-red-500" />
                      )}
                    </div>
                  </div>

                  {/* Pillar bars */}
                  <div className="space-y-3">
                    {Object.entries(eiiData.pillars).map(([key, value]) => (
                      <div key={key}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize text-gray-600">{key}</span>
                          <span className="font-medium">{(value * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${PILLAR_COLORS[key as keyof typeof PILLAR_COLORS]?.bar || 'bg-gray-400'}`}
                            style={{ width: `${value * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Proposals */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setExpandedSection(expandedSection === 'proposals' ? null : 'proposals')}
                  className="w-full flex items-center justify-between p-5 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <Target size={20} className="text-purple-500" />
                    <h2 className="text-lg font-semibold">Active Proposals</h2>
                    <span className="text-sm text-gray-400">({vaultData.proposals.length})</span>
                  </div>
                  {expandedSection === 'proposals' ? <CaretUp size={20} /> : <CaretDown size={20} />}
                </button>

                {expandedSection === 'proposals' && (
                  <div className="border-t border-gray-100">
                    {vaultData.proposals.map((proposal) => (
                      <div key={proposal.id} className="p-5 border-b border-gray-100 last:border-0">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-medium">{proposal.title}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${PILLAR_COLORS[proposal.pillar].bg} ${PILLAR_COLORS[proposal.pillar].text}`}>
                              {proposal.pillar}
                            </span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${
                            proposal.status === 'funded' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {proposal.status}
                          </span>
                        </div>

                        {/* Funding progress */}
                        <div className="mb-2">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-500">Funding Progress</span>
                            <span className="font-medium">
                              {formatCurrency(proposal.fundedAmount)} / {formatCurrency(proposal.requestedAmount)}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${PILLAR_COLORS[proposal.pillar].bar}`}
                              style={{ width: `${(proposal.fundedAmount / proposal.requestedAmount) * 100}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock size={12} />
                          <span>{formatTimeRemaining(proposal.deadline)} remaining</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Yield Sources */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setExpandedSection(expandedSection === 'yield' ? null : 'yield')}
                  className="w-full flex items-center justify-between p-5 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <ChartLine size={20} className="text-blue-500" />
                    <h2 className="text-lg font-semibold">Yield Sources</h2>
                  </div>
                  {expandedSection === 'yield' ? <CaretUp size={20} /> : <CaretDown size={20} />}
                </button>

                {expandedSection === 'yield' && (
                  <div className="p-5 border-t border-gray-100">
                    <div className="space-y-3">
                      {vaultData.yieldSources.map((source) => (
                        <div key={source.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: source.color }}
                            />
                            <span className="font-medium">{source.name}</span>
                          </div>
                          <span className="text-gray-600">{formatCurrency(source.amount)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Proposal Pool ({vaultData.proposalShareBps / 100}%)</span>
                        <span className="font-medium">{formatCurrency(vaultData.tvl * vaultData.proposalShareBps / 10000)}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-500">Liquidity Pool ({vaultData.liquidityShareBps / 100}%)</span>
                        <span className="font-medium">{formatCurrency(vaultData.tvl * vaultData.liquidityShareBps / 10000)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right column - Sidebar */}
            <div className="space-y-6">
              {/* Committed Agents */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Users size={20} className="text-purple-500" />
                  <h2 className="text-lg font-semibold">Committed Agents</h2>
                  <span className="text-sm text-gray-400">({agents?.length || 0})</span>
                </div>

                {agents && agents.length > 0 ? (
                  <div className="space-y-3">
                    {agents.slice(0, 5).map((agent) => (
                      <Link
                        key={agent.id}
                        to={`/agents/${agent.address}`}
                        className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <AgentAvatarCompact
                          address={agent.address}
                          agentType={agent.agentType}
                          status={agent.status}
                          size={32}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{agent.name}</div>
                          <div className="text-xs text-gray-400">
                            {AGENT_TYPE_LABELS[agent.agentType]}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {agent.esvStaked.toLocaleString()} ESV
                        </div>
                      </Link>
                    ))}
                    {agents.length > 5 && (
                      <div className="text-sm text-center text-gray-400">
                        +{agents.length - 5} more agents
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No agents committed yet.</p>
                )}
              </div>

              {/* Recent Deposits */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CurrencyCircleDollar size={20} className="text-green-500" />
                  <h2 className="text-lg font-semibold">Recent Deposits</h2>
                </div>

                <div className="space-y-2">
                  {vaultData.deposits.slice(0, 5).map((deposit) => (
                    <div key={deposit.id} className="flex items-center justify-between text-sm">
                      <span className="font-mono text-gray-500">
                        {deposit.depositor.slice(0, 6)}...{deposit.depositor.slice(-4)}
                      </span>
                      <span className="font-medium">{formatCurrency(deposit.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-lg font-semibold mb-4">Actions</h2>
                <div className="space-y-2">
                  <button className="w-full py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors">
                    Deposit to Vault
                  </button>
                  <button className="w-full py-2.5 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                    Submit Proposal
                  </button>
                  <button className="w-full py-2.5 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                    Commit as Agent
                  </button>
                </div>
              </div>
            </div>
          </div>

          <Footer />
        </div>
      </div>
    </>
  );
}

export default VaultDetail;
