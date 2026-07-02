import { clsx } from 'clsx';

interface Props {
  fundingRatio: number;
  fundedAmount?: number;
  fundingTarget?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

function formatNumber(value: number): string {
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(0);
}

const sizeClasses = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
};

export function ProposalProgress({
  fundingRatio,
  fundedAmount,
  fundingTarget,
  showLabel = true,
  size = 'md',
}: Props) {
  const percentage = Math.min(100, fundingRatio * 100);
  const isFunded = fundingRatio >= 1;

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-500">
            {fundedAmount !== undefined && fundingTarget !== undefined
              ? `${formatNumber(fundedAmount)} / ${formatNumber(fundingTarget)} USDC`
              : 'Funding Progress'}
          </span>
          <span className={clsx('font-medium', isFunded ? 'text-green-600' : 'text-gray-700')}>
            {percentage.toFixed(0)}%
          </span>
        </div>
      )}
      <div className={clsx('w-full bg-gray-200 rounded-full overflow-hidden', sizeClasses[size])}>
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-300',
            isFunded ? 'bg-green-500' : 'bg-esv-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
