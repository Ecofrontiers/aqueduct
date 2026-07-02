import { clsx } from 'clsx';
import type { AgentStatus } from '../types';
import { STATUS_COLORS } from '../types';

interface Props {
  status: AgentStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const sizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
};

const labelClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export function StatusDot({ status, size = 'md', showLabel = false }: Props) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5', labelClasses[size])}>
      <span
        className={clsx(
          'rounded-full',
          sizeClasses[size],
          STATUS_COLORS[status],
          status === 'ACTIVE' && 'animate-pulse'
        )}
      />
      {showLabel && (
        <span className="text-gray-600 capitalize">{status.toLowerCase()}</span>
      )}
    </span>
  );
}
