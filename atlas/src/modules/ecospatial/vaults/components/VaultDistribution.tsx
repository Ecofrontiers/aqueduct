interface Props {
  proposalShareBps: number;
  liquidityShareBps: number;
  totalYield?: number;
}

function formatCurrency(value: number): string {
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

export function VaultDistribution({
  proposalShareBps,
  liquidityShareBps,
  totalYield,
}: Props) {
  const proposalPercent = proposalShareBps / 100;
  const liquidityPercent = liquidityShareBps / 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">Yield Distribution</span>
        {totalYield !== undefined && (
          <span className="font-medium">{formatCurrency(totalYield)} total</span>
        )}
      </div>

      {/* Distribution bar */}
      <div className="h-4 flex rounded-full overflow-hidden">
        <div
          className="bg-esv-500 flex items-center justify-center text-xs text-white font-medium"
          style={{ width: `${proposalPercent}%` }}
        >
          {proposalPercent >= 20 && `${proposalPercent}%`}
        </div>
        <div
          className="bg-blue-500 flex items-center justify-center text-xs text-white font-medium"
          style={{ width: `${liquidityPercent}%` }}
        >
          {liquidityPercent >= 20 && `${liquidityPercent}%`}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-esv-500" />
          <span className="text-gray-600">Proposal Pool</span>
          <span className="font-medium">{proposalPercent}%</span>
          {totalYield !== undefined && (
            <span className="text-gray-400">
              ({formatCurrency((totalYield * proposalShareBps) / 10000)})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-gray-600">Liquidity Pool</span>
          <span className="font-medium">{liquidityPercent}%</span>
          {totalYield !== undefined && (
            <span className="text-gray-400">
              ({formatCurrency((totalYield * liquidityShareBps) / 10000)})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
