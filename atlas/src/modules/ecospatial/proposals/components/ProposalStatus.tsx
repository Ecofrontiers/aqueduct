import { clsx } from 'clsx';
import type { ProposalStatus as ProposalStatusType } from '../types';

interface Props {
  status: ProposalStatusType;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<ProposalStatusType, { bg: string; text: string }> = {
  Pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  Funded: { bg: 'bg-blue-100', text: 'text-blue-800' },
  Active: { bg: 'bg-green-100', text: 'text-green-800' },
  Settled: { bg: 'bg-purple-100', text: 'text-purple-800' },
  Slashed: { bg: 'bg-red-100', text: 'text-red-800' },
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export function ProposalStatus({ status, size = 'md' }: Props) {
  const config = statusConfig[status];

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-medium',
        config.bg,
        config.text,
        sizeClasses[size]
      )}
    >
      {status}
    </span>
  );
}
