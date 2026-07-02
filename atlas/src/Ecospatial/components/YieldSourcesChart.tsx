import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface YieldSource {
  name: string;
  amount: number;
  percentage: number;
}

interface YieldSourcesChartProps {
  sources: YieldSource[];
  height?: number;
}

const SOURCE_COLORS: Record<string, string> = {
  'Stablecoin Reserves': '#22c55e',
  'ETH Staking': '#6366f1',
  'Agent Fees': '#f59e0b',
  'Carbon Sales': '#06b6d4',
  'DeFi Yield': '#ec4899',
};

const DEFAULT_COLOR = '#9ca3af';

export function YieldSourcesChart({ sources, height = 200 }: YieldSourcesChartProps) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={sources} layout="vertical">
          <XAxis
            type="number"
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
            tickFormatter={(v) => `$${formatNumber(v)}`}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
            width={120}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value: number) => [
              `$${formatNumber(value)}`,
              'Yield',
            ]}
          />
          <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
            {sources.map((source, index) => (
              <Cell
                key={`cell-${index}`}
                fill={SOURCE_COLORS[source.name] || DEFAULT_COLOR}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 gap-2 mt-4">
        {sources.map((source) => (
          <div key={source.name} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: SOURCE_COLORS[source.name] || DEFAULT_COLOR }}
            />
            <span className="text-xs text-gray-600">
              {source.name}: {source.percentage.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toFixed(0);
}
