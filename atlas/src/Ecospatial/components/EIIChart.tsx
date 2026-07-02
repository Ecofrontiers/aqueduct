import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface EIIChartProps {
  bioregions: any[];
  height?: number;
}

const COLORS = [
  '#22c55e', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
];

export function EIIChart({ bioregions, height = 300 }: EIIChartProps) {
  // Mock data for visualization - in production this would come from API
  const data = generateMockData(bioregions.slice(0, 5));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="epoch"
          tick={{ fontSize: 12 }}
          stroke="#9ca3af"
        />
        <YAxis
          domain={[0, 1]}
          tick={{ fontSize: 12 }}
          stroke="#9ca3af"
          tickFormatter={(v) => v.toFixed(2)}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
          formatter={(value: number) => [value.toFixed(4), 'EII']}
        />
        <Legend />
        {bioregions.slice(0, 5).map((bioregion, index) => (
          <Line
            key={bioregion.id}
            type="monotone"
            dataKey={bioregion.name}
            stroke={COLORS[index % COLORS.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function generateMockData(bioregions: any[]) {
  const epochs = 20;
  const data = [];

  for (let i = 0; i < epochs; i++) {
    const point: Record<string, number | string> = { epoch: i };

    bioregions.forEach((bioregion) => {
      const baseEII = Number(bioregion.currentEII) || 0.5;
      const variation = (Math.random() - 0.5) * 0.1;
      const trend = (i / epochs) * 0.05; // Slight upward trend
      point[bioregion.name] = Math.max(0, Math.min(1, baseEII - trend + variation));
    });

    data.push(point);
  }

  return data.reverse();
}
