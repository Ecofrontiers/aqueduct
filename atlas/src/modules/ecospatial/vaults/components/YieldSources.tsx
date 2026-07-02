import type { YieldSource } from '../types';

interface Props {
  sources: YieldSource[];
}

function formatCurrency(value: number): string {
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

const DEFAULT_COLORS = [
  '#22c55e', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#06b6d4', // cyan
];

export function YieldSources({ sources }: Props) {
  if (sources.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No yield sources active for this vault
      </div>
    );
  }

  const totalAmount = sources.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">Yield Sources</span>
        <span className="font-medium">{formatCurrency(totalAmount)} total</span>
      </div>

      {/* Sources list */}
      <div className="space-y-3">
        {sources.map((source, index) => {
          const color = source.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
          return (
            <div key={source.name} className="flex items-center gap-3">
              {/* Color indicator */}
              <div
                className="w-2 h-8 rounded-full"
                style={{ backgroundColor: color }}
              />

              {/* Source info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{source.name}</span>
                  <span className="font-mono text-sm">{formatCurrency(source.amount)}</span>
                </div>

                {/* Progress bar */}
                <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${source.percentage}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </div>

              {/* Percentage */}
              <span className="text-sm text-gray-500 w-12 text-right">
                {source.percentage.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
