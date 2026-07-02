import type { TokenMarketData } from "./market";
import type { GapAnalysis } from "../modules/intelligence/types";
import { CATEGORY_COLORS } from "./market";
import { formatUSD, formatPercent } from "./formatUtils";

interface Props {
  tokens: TokenMarketData[];
  gapAnalysis?: GapAnalysis;
}

export function AssetRankingTable({ tokens, gapAnalysis }: Props) {
  const top10 = tokens.slice(0, 10);
  const hasGap = !!gapAnalysis;

  if (top10.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 shadow-sm mb-5">
      <div className="px-5 pt-4 pb-2">
        <h2 className="text-sm font-bold text-gray-800">Top Assets</h2>
        <p className="text-xs text-gray-400">
          Ranked by market capitalization
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-t border-b border-gray-200 text-xs text-gray-500">
              <th className="text-left font-medium px-5 py-2 w-8">#</th>
              <th className="text-left font-medium py-2">Asset</th>
              <th className="text-left font-medium py-2">Category</th>
              <th className="text-right font-medium py-2">Price</th>
              <th className="text-right font-medium py-2">Market Cap</th>
              <th className="text-right font-medium py-2">24h</th>
              {hasGap && (
                <th className="text-right font-medium py-2 pr-5">
                  Gap Factor
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {top10.map((token, idx) => {
              const change = token.priceChange24h;
              return (
                <tr
                  key={token.config.symbol}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-5 py-2.5 text-gray-400 text-xs">
                    {idx + 1}
                  </td>
                  <td className="py-2.5">
                    <span className="font-bold text-gray-800">
                      {token.config.symbol}
                    </span>{" "}
                    <span className="text-gray-500">{token.config.name}</span>
                  </td>
                  <td className="py-2.5">
                    <span
                      className="text-xs px-2 py-0.5 font-medium"
                      style={{
                        backgroundColor:
                          CATEGORY_COLORS[token.config.category] + "18",
                        color: CATEGORY_COLORS[token.config.category],
                      }}
                    >
                      {token.config.category}
                    </span>
                  </td>
                  <td className="text-right py-2.5 font-medium text-gray-800">
                    ${token.price < 0.01
                      ? token.price.toFixed(4)
                      : token.price < 1
                        ? token.price.toFixed(3)
                        : token.price.toFixed(2)}
                  </td>
                  <td className="text-right py-2.5 text-gray-700">
                    {token.marketCap > 0 ? formatUSD(token.marketCap) : "—"}
                  </td>
                  <td
                    className={`text-right py-2.5 font-medium ${
                      change == null
                        ? "text-gray-400"
                        : change >= 0
                          ? "text-green-600"
                          : "text-red-500"
                    }`}
                  >
                    {change != null ? formatPercent(change) : "—"}
                  </td>
                  {hasGap && (
                    <td className="text-right py-2.5 pr-5 text-amber-600 font-medium">
                      {gapAnalysis?.aggregateGap
                        ? `${gapAnalysis.aggregateGap.low}x–${gapAnalysis.aggregateGap.high}x`
                        : "—"}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
