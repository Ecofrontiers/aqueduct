import { Link } from 'react-router-dom';
import type { Vault } from '../types';

interface Props {
  vault: Vault;
  bioregionName?: string;
}

function formatCurrency(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

function formatNumber(value: number): string {
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toFixed(0);
}

function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  if (days > 0) return `${days}d`;
  const hours = Math.floor(seconds / 3600);
  if (hours > 0) return `${hours}h`;
  return `${Math.floor(seconds / 60)}m`;
}

export function VaultCard({ vault, bioregionName }: Props) {
  const epochProgress = vault.epochStartTimestamp
    ? Math.min(
        100,
        ((Date.now() / 1000 - vault.epochStartTimestamp) / vault.epochDuration) * 100
      )
    : 0;

  return (
    <Link
      to={`/vaults/${vault.bioregionId}`}
      className="block bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg">{bioregionName || vault.bioregionId}</h3>
          <span className="text-xs text-gray-500 font-mono">
            {vault.id.slice(0, 8)}...{vault.id.slice(-6)}
          </span>
        </div>
        <div className="text-right">
          <span className="text-sm text-gray-500">Epoch</span>
          <span className="block font-semibold">{vault.currentEpoch}</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-500">Total Reserve</p>
          <p className="font-semibold">{formatCurrency(vault.totalReserve)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">ESV Minted</p>
          <p className="font-semibold">{formatNumber(vault.totalESVMinted)} ESV</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Pending Yield</p>
          <p className="font-semibold text-esv-600">{formatCurrency(vault.pendingYield)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Epoch Duration</p>
          <p className="font-semibold">{formatDuration(vault.epochDuration)}</p>
        </div>
      </div>

      {/* Epoch Progress */}
      <div>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Epoch Progress</span>
          <span>{epochProgress.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-esv-500 rounded-full transition-all duration-500"
            style={{ width: `${epochProgress}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
