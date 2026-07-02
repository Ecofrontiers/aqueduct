import { clsx } from 'clsx';
import type { TargetPillar } from '../types';
import { PILLAR_NAMES, PILLAR_COLORS } from '../types';

interface Props {
  pillar: TargetPillar;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const sizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

const textClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export function PillarBadge({ pillar, size = 'md', showLabel = true }: Props) {
  const color = PILLAR_COLORS[pillar];
  const name = PILLAR_NAMES[pillar];

  return (
    <span className={clsx('inline-flex items-center gap-1.5', textClasses[size])}>
      <span
        className={clsx('rounded-full', sizeClasses[size])}
        style={{ backgroundColor: color }}
      />
      {showLabel && <span className="font-medium">{name}</span>}
    </span>
  );
}
