import { clsx } from 'clsx';
import type { Bounty } from '../types';
import { BOUNTY_TYPE_CONFIG, BOUNTY_STATUS_CONFIG } from '../types';

interface Props {
  bounty: Bounty;
  onClaim?: () => void;
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatNumber(value: number): string {
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toFixed(2);
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now() / 1000;
  const diff = timestamp - now;

  if (diff < 0) return 'Expired';

  const hours = Math.floor(diff / 3600);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function BountyCard({ bounty, onClaim }: Props) {
  const isExpiringSoon = bounty.deadline - Date.now() / 1000 < 24 * 60 * 60;
  const typeConfig = BOUNTY_TYPE_CONFIG[bounty.bountyType];
  const statusConfig = BOUNTY_STATUS_CONFIG[bounty.status];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <span className={clsx('px-2 py-1 text-xs font-medium rounded', typeConfig.color)}>
          {typeConfig.label}
        </span>
        <span className="text-xl font-bold">{formatNumber(bounty.rewardAmount)} ESV</span>
      </div>

      {/* Content */}
      <h3 className="mt-3 font-medium">{bounty.title}</h3>

      <div className="mt-2 space-y-1 text-sm text-gray-600">
        {bounty.coordinates && (
          <div className="flex items-center gap-1">
            <span>\uD83D\uDCCD</span>
            <span>{bounty.bioregionId}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <span>\u23F0</span>
          <span className={isExpiringSoon ? 'text-red-600 font-medium' : ''}>
            {formatRelativeTime(bounty.deadline)} left
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          Posted by: {bounty.poster.name || truncateAddress(bounty.poster.address)}
        </span>

        {bounty.status === 'OPEN' && onClaim && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onClaim();
            }}
            className="px-4 py-2 bg-esv-500 text-white text-sm font-medium rounded hover:bg-esv-600 transition-colors"
          >
            Claim Bounty
          </button>
        )}

        {bounty.status !== 'OPEN' && (
          <span className={clsx('px-2 py-1 text-xs font-medium rounded', statusConfig.color)}>
            {statusConfig.label}
          </span>
        )}
      </div>
    </div>
  );
}
