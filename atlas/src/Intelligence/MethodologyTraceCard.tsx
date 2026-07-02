import type { MethodologyTrace } from "../modules/intelligence/types";
import { TIER_STYLES } from "./formatUtils";

function ConfidenceDots({ level }: { level: "high" | "medium" | "low" }) {
  const filled = level === "high" ? 3 : level === "medium" ? 2 : 1;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${
            i <= filled ? "bg-gray-700" : "bg-gray-300"
          }`}
        />
      ))}
      <span className="text-xs text-gray-500 ml-1 capitalize">{level}</span>
    </div>
  );
}

const DEFAULT_TIER_STYLE = { bg: "bg-gray-100", text: "text-gray-600", label: "Standard", description: "" };

export function MethodologyTraceCard({ trace }: { trace: MethodologyTrace }) {
  const tierStyle = TIER_STYLES[trace.tier] ?? DEFAULT_TIER_STYLE;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mt-2">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span className={`${tierStyle.bg} ${tierStyle.text} text-xs px-2 py-0.5 rounded-full font-medium`}>
          {tierStyle.label}
        </span>
        {trace.confidence && <ConfidenceDots level={trace.confidence} />}
        <span className="text-sm font-medium text-gray-700 ml-auto">
          {trace.methodologyName}
        </span>
      </div>
      {tierStyle.description && (
        <div className="text-xs text-gray-400 mb-3">{tierStyle.description}</div>
      )}

      {/* Formula */}
      {trace.formula && (
        <div className="bg-gray-50 border border-gray-100 rounded px-3 py-2 mb-3 font-mono text-xs text-gray-600">
          {trace.formula}
        </div>
      )}

      {/* Source (fallback for Hedera provenances without full trace) */}
      {!trace.formula && (trace as any).source && (
        <div className="text-xs text-gray-500 mb-3">Source: {(trace as any).source}</div>
      )}

      {/* Inputs grid */}
      {(trace.inputs?.length ?? 0) > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3 text-sm">
          {trace.inputs!.map((input) => (
            <div key={input.label} className="flex justify-between">
              <span className="text-gray-500">{input.label}</span>
              <span className="font-medium text-gray-700">
                {input.value}
                {input.source && (
                  <span className="text-gray-400 text-xs ml-1">({input.source})</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Citations */}
      {(trace.citations?.length ?? 0) > 0 && (
        <div className="border-t border-gray-100 pt-2">
          <div className="text-xs text-gray-500 mb-1">Sources</div>
          <div className="flex flex-col gap-0.5">
            {trace.citations!.map((c) => (
              <div key={c.name} className="text-xs text-gray-600">
                {c.url ? (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-500 hover:underline"
                  >
                    {c.name}
                  </a>
                ) : (
                  c.name
                )}
                {c.year && <span className="text-gray-400 ml-1">({c.year})</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {trace.notes && (
        <div className="text-xs text-gray-400 mt-2 italic">{trace.notes}</div>
      )}
    </div>
  );
}
