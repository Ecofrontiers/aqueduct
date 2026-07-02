import { BarChart, Bar, ResponsiveContainer, Cell } from "recharts";
import { formatUSD, SERVICE_COLOR, MARKET_COLOR } from "./formatUtils";

interface Props {
  serviceValue: number;
  marketValue: number | null;
  gapLabel: string | null;
}

export function ProtocolMiniChart({ serviceValue, marketValue, gapLabel }: Props) {
  const data = [
    { name: "Service", value: serviceValue },
    { name: "Market", value: marketValue ?? 0 },
  ];
  const colors = [SERVICE_COLOR, MARKET_COLOR];

  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>
          <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: SERVICE_COLOR }} />
          Service: {formatUSD(serviceValue)}
        </span>
        {marketValue != null && marketValue > 0 && (
          <span>
            <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: MARKET_COLOR }} />
            Market: {formatUSD(marketValue)}
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={80}>
        <BarChart data={data} barGap={8}>
          <Bar dataKey="value" radius={[3, 3, 0, 0]}>
            {data.map((_, idx) => (
              <Cell key={idx} fill={colors[idx]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {gapLabel && (
        <div className="text-center text-xs font-medium text-amber-600 mt-1">
          Gap: {gapLabel}
        </div>
      )}
    </div>
  );
}
