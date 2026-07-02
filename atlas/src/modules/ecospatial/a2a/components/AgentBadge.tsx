import { clsx } from 'clsx';
import type { AgentType } from '../types';
import { AGENT_TYPE_LABELS, AGENT_TYPE_EMOJIS } from '../types';

interface Props {
  type: AgentType;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const typeColors: Record<AgentType, string> = {
  MONITORING: 'bg-blue-100 text-blue-700',
  ECONOMIC: 'bg-green-100 text-green-700',
  SOCIAL: 'bg-purple-100 text-purple-700',
  SPECIALIST: 'bg-orange-100 text-orange-700',
  REPRESENTATION: 'bg-pink-100 text-pink-700',
};

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export function AgentBadge({ type, size = 'md', showLabel = true }: Props) {
  const emoji = AGENT_TYPE_EMOJIS[type];
  const label = AGENT_TYPE_LABELS[type];

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full font-medium',
        typeColors[type],
        sizeClasses[size]
      )}
    >
      <span>{emoji}</span>
      {showLabel && <span>{label}</span>}
    </span>
  );
}
