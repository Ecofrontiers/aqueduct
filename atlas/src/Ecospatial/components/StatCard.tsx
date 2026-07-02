import { clsx } from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  suffix?: string;
  change?: number;
  icon?: React.ReactNode;
}

export function StatCard({ title, value, suffix, change, icon }: StatCardProps) {
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <div className="mt-1 flex items-baseline">
            <p className="text-2xl font-semibold">{value}</p>
            {suffix && <span className="ml-1 text-sm text-gray-500">{suffix}</span>}
          </div>
          {change !== undefined && (
            <p
              className={clsx(
                'mt-1 text-sm',
                change >= 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              {change >= 0 ? '+' : ''}
              {change.toFixed(2)}%
            </p>
          )}
        </div>
        {icon && (
          <div className="p-2 bg-esv-100 rounded-lg text-esv-600">{icon}</div>
        )}
      </div>
    </div>
  );
}
