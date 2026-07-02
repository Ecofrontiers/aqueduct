import type { Vault } from '../types';

interface Props {
  vault: Vault;
}

function formatCurrency(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

function formatNumber(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toFixed(2);
}

export function VaultMetrics({ vault }: Props) {
  const metrics = [
    {
      label: 'Total Reserve',
      value: formatCurrency(vault.totalReserve),
      description: 'Total USDC locked in vault',
    },
    {
      label: 'Pending Yield',
      value: formatCurrency(vault.pendingYield),
      description: 'Yield awaiting distribution',
    },
    {
      label: 'ESV Minted',
      value: `${formatNumber(vault.totalESVMinted)} ESV`,
      description: 'Total ESV tokens issued',
    },
    {
      label: 'Current Epoch',
      value: vault.currentEpoch.toString(),
      description: 'Distribution cycle number',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">{metric.label}</p>
          <p className="text-xl font-semibold mt-1">{metric.value}</p>
          <p className="text-xs text-gray-400 mt-1">{metric.description}</p>
        </div>
      ))}
    </div>
  );
}
