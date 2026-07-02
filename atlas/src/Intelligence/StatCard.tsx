import type { ReactNode } from "react";
import { formatPercent } from "./formatUtils";

interface StatCardProps {
  label: string;
  value: string;
  change?: number | null;
  icon?: ReactNode;
  subtitle?: string;
}

export function StatCard({ label, value, change, icon, subtitle }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 shadow-sm px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-gray-400">{icon}</span>}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold text-gray-800">{value}</span>
        {change != null && (
          <span
            className={`text-xs font-medium ${
              change >= 0 ? "text-green-600" : "text-red-500"
            }`}
          >
            {formatPercent(change)}
          </span>
        )}
      </div>
      {subtitle && (
        <span className="text-[11px] text-gray-400">{subtitle}</span>
      )}
    </div>
  );
}

export function StatCardRow({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      {children}
    </div>
  );
}
