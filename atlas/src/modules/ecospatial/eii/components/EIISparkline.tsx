interface Props {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showTrend?: boolean;
}

export function EIISparkline({
  data,
  width = 80,
  height = 32,
  color = '#22c55e',
  showTrend = false,
}: Props) {
  if (data.length < 2) {
    return null;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Normalize data to fit within height
  const normalizedData = data.map((value) => ((value - min) / range) * (height - 4));

  // Create SVG path
  const points = normalizedData.map((y, i) => {
    const x = (i / (data.length - 1)) * (width - 4) + 2;
    const yPos = height - y - 2;
    return `${x},${yPos}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  // Calculate trend
  const firstHalf = data.slice(0, Math.floor(data.length / 2));
  const secondHalf = data.slice(Math.floor(data.length / 2));
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  const trend = secondAvg > firstAvg ? 'up' : secondAvg < firstAvg ? 'down' : 'stable';
  const trendColor = trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : '#6b7280';

  return (
    <div className="flex items-center gap-1">
      <svg width={width} height={height} className="overflow-visible">
        {/* Gradient background */}
        <defs>
          <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path
          d={`${pathD} L ${width - 2},${height - 2} L 2,${height - 2} Z`}
          fill="url(#sparklineGradient)"
        />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* End dot */}
        <circle
          cx={width - 2}
          cy={height - normalizedData[normalizedData.length - 1] - 2}
          r="2"
          fill={color}
        />
      </svg>

      {showTrend && (
        <span className="text-xs" style={{ color: trendColor }}>
          {trend === 'up' && '\u2191'}
          {trend === 'down' && '\u2193'}
          {trend === 'stable' && '\u2192'}
        </span>
      )}
    </div>
  );
}
