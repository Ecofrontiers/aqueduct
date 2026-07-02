import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TimeRange, CategoryTimeSeries, AssetCategory } from "./market";
import { ALL_CATEGORIES, CATEGORY_COLORS } from "./market";
import { formatUSD, formatDate } from "./formatUtils";

const TIME_RANGES: TimeRange[] = ["1M", "3M", "6M", "YTD", "1Y"];

interface Props {
  timeSeriesByCategory: CategoryTimeSeries[];
  marketCapByCategory: Record<AssetCategory, number>;
  timeRange: TimeRange;
  onTimeRangeChange: (r: TimeRange) => void;
  totalMarketCap: number;
}

export function MarketCapChart({
  timeSeriesByCategory,
  marketCapByCategory,
  timeRange,
  onTimeRangeChange,
  totalMarketCap,
}: Props) {
  // Categories sorted by market cap descending for legend
  const sortedCategories = ALL_CATEGORIES
    .filter((c) => marketCapByCategory[c] > 0)
    .sort((a, b) => marketCapByCategory[b] - marketCapByCategory[a]);

  const hasData = timeSeriesByCategory.length > 0;

  return (
    <div className="bg-white border border-gray-200 shadow-sm mb-5">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h2 className="text-sm font-bold text-gray-800">
          Market Overview
        </h2>
        <div className="flex gap-1">
          {TIME_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => onTimeRangeChange(r)}
              className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                r === timeRange
                  ? "bg-primary-400 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex">
        {/* Chart area */}
        <div className="flex-1 pl-2 pr-0">
          {hasData ? (
            <ResponsiveContainer width="100%" height={360}>
              <AreaChart
                data={timeSeriesByCategory}
                margin={{ top: 8, right: 12, bottom: 8, left: 4 }}
              >
                <XAxis
                  dataKey="date"
                  tickFormatter={(ts) => formatDate(ts)}
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={50}
                />
                <YAxis
                  tickFormatter={(v) => formatUSD(v)}
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  width={65}
                />
                <Tooltip
                  labelFormatter={(ts) => formatDate(Number(ts))}
                  formatter={(value, name) => [
                    formatUSD(Number(value ?? 0)),
                    String(name),
                  ]}
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 0,
                    fontSize: 12,
                  }}
                />
                {/* Render in reverse so largest category is at the bottom */}
                {[...sortedCategories].reverse().map((cat) => (
                  <Area
                    key={cat}
                    type="monotone"
                    dataKey={cat}
                    stackId="1"
                    stroke={CATEGORY_COLORS[cat]}
                    fill={CATEGORY_COLORS[cat]}
                    fillOpacity={0.6}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[360px] text-gray-400 text-sm">
              Loading chart data...
            </div>
          )}
        </div>

        {/* Legend panel */}
        <div className="w-[240px] border-l border-gray-200 px-4 py-4 flex flex-col gap-3">
          {sortedCategories.map((cat) => {
            const mcap = marketCapByCategory[cat];
            const pct =
              totalMarketCap > 0
                ? ((mcap / totalMarketCap) * 100).toFixed(0)
                : "0";
            return (
              <div key={cat} className="flex items-stretch gap-2">
                <div
                  className="w-1 rounded-full flex-shrink-0"
                  style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-gray-700 truncate">
                    {cat}
                  </div>
                  <div className="text-sm font-bold text-gray-800">
                    {formatUSD(mcap)}
                  </div>
                  <div className="text-[11px] text-gray-400">{pct}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
