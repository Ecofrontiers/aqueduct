import { Link } from 'react-router-dom';
import { clsx } from 'clsx';

interface VaultCardProps {
  vault: {
    bioregionId: string;
    bioregionName: string;
    totalLocked: number;
    yieldGenerated: number;
    esvMinted: number;
    currentEII: number;
    eiiDelta?: number;
    committedAgents: number;
    limitingPillar: 'function' | 'structure' | 'composition';
  };
}

export function VaultCard({ vault }: VaultCardProps) {
  const pillarColors = {
    function: 'bg-blue-100 text-blue-700',
    structure: 'bg-green-100 text-green-700',
    composition: 'bg-amber-100 text-amber-700',
  };

  return (
    <Link
      to={`/vaults/${vault.bioregionId}`}
      className="card p-6 hover:border-esv-300 transition-colors block"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-lg">{vault.bioregionName}</h3>
          <p className="text-sm text-gray-500">ESV-{vault.bioregionId.toUpperCase()}</p>
        </div>
        <span
          className={clsx(
            'px-2 py-1 rounded text-xs font-medium',
            pillarColors[vault.limitingPillar]
          )}
        >
          {vault.limitingPillar}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500">Locked</p>
          <p className="font-mono text-lg">${formatNumber(vault.totalLocked)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Yield</p>
          <p className="font-mono text-lg text-green-600">
            +${formatNumber(vault.yieldGenerated)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs text-gray-500">EII</p>
            <p className="font-mono">{vault.currentEII.toFixed(3)}</p>
          </div>
          {vault.eiiDelta !== undefined && (
            <p
              className={clsx(
                'text-sm font-mono',
                vault.eiiDelta >= 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              {vault.eiiDelta >= 0 ? '+' : ''}
              {vault.eiiDelta.toFixed(4)}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Agents</p>
          <p className="font-mono">{vault.committedAgents}</p>
        </div>
      </div>
    </Link>
  );
}

function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(2);
}
