import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { GapAnalysis } from "../modules/intelligence/types";
import {
  formatUSD,
  PROTOCOL_LABELS,
  MECHANISM_LABELS,
  SERVICE_COLOR,
  MARKET_COLOR,
} from "./formatUtils";

/**
 * Grouped bar chart: per-protocol service value vs market value.
 */
export function ProtocolGapChart({ gap }: { gap: GapAnalysis }) {
  const data = Object.entries(gap.byProtocol)
    .filter(([key, v]) => v.count > 0 && !["hedera", "atlantis", "silvi"].includes(key))
    .map(([protocol, v]) => ({
      name: PROTOCOL_LABELS[protocol] ?? protocol,
      serviceValue: Math.round((v.serviceValueUSD.low + v.serviceValueUSD.high) / 2),
      marketValue: v.marketValueUSD ?? 0,
      gapLabel: v.gapFactor
        ? `${v.gapFactor.low}x - ${v.gapFactor.high}x`
        : "No price data",
      mechanism: MECHANISM_LABELS[v.mechanismType] ?? v.mechanismType,
    }));

  if (data.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 p-5">
      <h3 className="font-bold text-sm mb-0.5 text-gray-800">
        Service Value vs Market Value
      </h3>
      <p className="text-xs text-gray-500 mb-3">
        Per-protocol comparison (midpoint of SCC/TEEB range)
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} barGap={4}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: "#6b7280" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatUSD(v)}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            width={70}
          />
          <Tooltip
            formatter={(value, name) => [
              formatUSD(Number(value ?? 0)),
              name === "serviceValue" ? "Service Value" : "Market Value",
            ]}
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 0,
              fontSize: 13,
            }}
          />
          <Legend
            formatter={(value) =>
              value === "serviceValue" ? "Ecosystem Service Value" : "Market Value"
            }
            wrapperStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="serviceValue" fill={SERVICE_COLOR} radius={0} />
          <Bar dataKey="marketValue" fill={MARKET_COLOR} radius={0} />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-3 mt-3">
        {data.map((d) => (
          <div
            key={d.name}
            className="text-xs bg-gray-100 rounded-lg px-3 py-1.5 text-gray-600"
          >
            <span className="font-medium text-gray-800">{d.name}</span>{" "}
            <span className="text-gray-400">|</span> Gap: {d.gapLabel}{" "}
            <span className="text-gray-400">|</span> {d.mechanism}
          </div>
        ))}
      </div>
    </div>
  );
}

const ACTION_PROTOCOL_KEYS = ["hedera", "atlantis", "silvi"] as const;
const ACTION_PROTOCOL_COLORS: Record<string, string> = {
  hedera: "#8259EF",
  atlantis: "#0ea5e9",
  silvi: "#22c55e",
};

/**
 * Stacked bar chart showing all action protocols' ecosystem service value.
 * Each bar = Low / Mid / High SCC estimate, stacked by protocol.
 */
export function ActionProtocolsChart({ gap }: { gap: GapAnalysis }) {
  // Only include protocols with data
  const activeProtocols = ACTION_PROTOCOL_KEYS.filter(
    (k) => gap.byProtocol[k] && gap.byProtocol[k].count > 0
  );
  if (activeProtocols.length === 0) return null;

  const totalActions = activeProtocols.reduce(
    (sum, k) => sum + gap.byProtocol[k].count,
    0
  );

  // Build data for stacked bar: one bar per SCC estimate level
  const buildRow = (label: string, pick: (sv: { low: number; high: number }) => number) => {
    const row: Record<string, string | number> = { name: label };
    for (const proto of activeProtocols) {
      row[proto] = Math.round(pick(gap.byProtocol[proto].serviceValueUSD));
    }
    return row;
  };

  const data = [
    buildRow("Low (SCC)", (sv) => sv.low),
    buildRow("Midpoint", (sv) => Math.round((sv.low + sv.high) / 2)),
    buildRow("High (SCC)", (sv) => sv.high),
  ];

  return (
    <div className="bg-white border border-gray-200 p-5">
      <h3 className="font-bold text-sm mb-0.5 text-gray-800">
        Action Protocols — Ecosystem Service Value
      </h3>
      <p className="text-xs text-gray-500 mb-3">
        {totalActions} verified actions · SCC range (no market price)
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} barGap={4}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: "#6b7280" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatUSD(v)}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            width={70}
          />
          <Tooltip
            formatter={(value, name) => [
              formatUSD(Number(value ?? 0)),
              PROTOCOL_LABELS[String(name)] ?? name,
            ]}
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 0,
              fontSize: 13,
            }}
          />
          <Legend
            formatter={(value) => PROTOCOL_LABELS[String(value)] ?? value}
            wrapperStyle={{ fontSize: 12 }}
          />
          {activeProtocols.map((proto) => (
            <Bar
              key={proto}
              dataKey={proto}
              stackId="actions"
              fill={ACTION_PROTOCOL_COLORS[proto]}
              radius={0}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const ASSET_COLOR = "#2563eb"; // blue-600
const ACTION_COLOR = "#8b5cf6"; // violet-500

/**
 * Donut chart: assets (tradable, investable gap) vs actions (retired, impact delivered).
 */
export function AssetActionChart({ gap }: { gap: GapAnalysis }) {
  const assetMid =
    (gap.assetVsAction.assets.serviceValueUSD.low +
      gap.assetVsAction.assets.serviceValueUSD.high) /
    2;
  const actionMid =
    (gap.assetVsAction.actions.serviceValueUSD.low +
      gap.assetVsAction.actions.serviceValueUSD.high) /
    2;

  const data = [
    { name: "Assets: Tradable Tokens", value: assetMid, count: gap.assetVsAction.assets.count },
    { name: "Actions: Onchain Proofs", value: actionMid, count: gap.assetVsAction.actions.count },
  ].filter((d) => d.value > 0);

  if (data.length === 0) return null;

  const COLORS = [ASSET_COLOR, ACTION_COLOR];
  const total = assetMid + actionMid;

  return (
    <div className="bg-white border border-gray-200 p-5">
      <h3 className="font-bold text-sm mb-0.5 text-gray-800">Assets vs Actions</h3>
      <p className="text-xs text-gray-500 mb-3">
        Tradable tokens (investable gap) vs onchain proofs (verified impact)
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            dataKey="value"
            stroke="none"
            label={({ name, percent }: { name?: string; percent?: number }) =>
              `${(name ?? "").split(" ")[0]} ${((percent ?? 0) * 100).toFixed(0)}%`
            }
            labelLine={false}
          >
            {data.map((_, idx) => (
              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatUSD(Number(value ?? 0))}
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 0,
              fontSize: 13,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex gap-4 justify-center mt-2 text-xs">
        {data.map((d, idx) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: COLORS[idx] }}
            />
            <span className="text-gray-600">
              {d.name}: {d.count} ({total > 0 ? ((d.value / total) * 100).toFixed(0) : 0}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
