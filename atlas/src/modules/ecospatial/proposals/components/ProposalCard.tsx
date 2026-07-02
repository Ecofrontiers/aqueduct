import { Link } from 'react-router-dom';
import type { Proposal } from '../types';
import { PILLAR_NAMES, PILLAR_COLORS } from '../types';
import { ProposalStatus } from './ProposalStatus';
import { ProposalProgress } from './ProposalProgress';

interface Props {
  proposal: Proposal;
  showBioregion?: boolean;
}

function formatNumber(value: number): string {
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toFixed(2);
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function ProposalCard({ proposal, showBioregion = true }: Props) {
  const pillarColor = PILLAR_COLORS[proposal.targetPillar];
  const pillarName = PILLAR_NAMES[proposal.targetPillar];

  return (
    <Link
      to={`/proposals/${proposal.bioregionId}/${proposal.onchainId}`}
      className="block bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Proposal #{proposal.onchainId}</h3>
            <ProposalStatus status={proposal.status} size="sm" />
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            {showBioregion && proposal.bioregion && (
              <>
                <span>{proposal.bioregion.name}</span>
                <span>·</span>
              </>
            )}
            <span className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: pillarColor }}
              />
              {pillarName}
            </span>
          </div>
        </div>

        <div className="text-right text-sm text-gray-500">
          {formatTimeAgo(proposal.createdAt)}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500">Stake</p>
          <p className="font-mono font-medium">{formatNumber(proposal.stakeAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Funded</p>
          <p className="font-mono font-medium">{formatNumber(proposal.fundedAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Epoch</p>
          <p className="font-mono font-medium">{proposal.epoch || '-'}</p>
        </div>
      </div>

      {/* Progress */}
      <ProposalProgress
        fundingRatio={proposal.fundingRatio}
        fundedAmount={proposal.fundedAmount}
        fundingTarget={proposal.fundingTarget}
        size="sm"
      />

      {/* Settlement result */}
      {proposal.status === 'Settled' && proposal.eiiDelta !== undefined && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">EII Impact</span>
          <span
            className={`font-mono font-medium ${
              proposal.eiiDelta > 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {proposal.eiiDelta > 0 ? '+' : ''}
            {(proposal.eiiDelta * 100).toFixed(2)}%
          </span>
        </div>
      )}
    </Link>
  );
}
